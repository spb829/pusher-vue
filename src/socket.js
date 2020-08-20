import Pusher from 'pusher-js';
import Logger from './logger';
import Mixin from './mixin';

export default class Socket {
	_logger = null;
  _pusher = null;
  _appKey = null;
	_channels = { subscriptions: {} };
	_contexts = {};
  _pusherOptions = {};

	/**
	 * PusherVue $pusher entry point
	 * @param {Object} Vue
	 * @param {Object} options - PusherVue options + Pusher.js options. See https://github.com/pusher/pusher-js#configuration
   * @param {string} options.appKey - Pusher app_key
	 * @param {boolean} options.debug - Enable logging for debug
	 * @param {string} options.debugLevel - Debug level required for logging. Either `info`, `error`, or `all`
	 * @param {object} options.store - Vuex store
	 */
	constructor(Vue, options) {
		Vue.prototype.$pusher = this;
		Vue.mixin(Mixin);

		let { appKey, debug, debugLevel, store } = options || {
      appKey: null,
			debug: false,
			debugLevel: 'error',
			store: null
		};
		// set default cluster
		if (options.cluster) options.cluster = 'ap3';

    this._appKey = appKey;
		this._pusherOptions = options;
		if (store) store.$pusher = this;
		this._logger = new Logger(debug, debugLevel);

		// this._connect();
		Pusher.logToConsole = debug;
	}

	/**
	 * Subscribes to a channel
	 * @param {string} channelName - The name of the channel
	 */
	subscribe(channelName) {
    if (!this._pusher) {
			this._connect();
			return this.subscribe(channelName);
		}

		this._channels.subscriptions[channelName] = this._pusher.subscribe(channelName);
		const subscription = this._channels.subscriptions[channelName];

		// Subscribed
		subscription.bind('pusher:subscription_succeeded', () => {
			this._fireChannelEvent(channelName, this._channelSubscribed);
		});
		// Subscribe Error
		subscription.bind('pusher:subscription_error', () => {
			this._fireChannelEvent(channelName, this._subscriptionRejected);
		});

		if (!this._channels.hasOwnProperty(channelName)) return;
		const channel = this._channels[channelName];

		const binds = channel.bind // => Object { key: function() }
		if (!binds) return;

		for (const eventName of Object.keys(binds)) {
			subscription.bind(eventName, (data) => {
				this._fireChannelEvent(channelName, this._channelReceived, eventName, data);
			});
		}
  }

	/**
   * Perform an event in an Pusher server channel
   * @param {Object} whatToDo
   * @param {string} whatToDo.channel - The name of the Pusher server channel / The custom name chosen for the component channel
   * @param {string} whatToDo.event - The name of event to call in the Pusher server channel
   * @param {Object} whatToDo.data - The data to pass along with the call to the event
   */
  perform(whatToDo) {
    const { channel, event, data } = whatToDo;
		this._logger.log(`Performing event '${event}' on channel '${channel}'.`, "info");
		
    const subscription = this._channels.subscriptions[channel];
		if (!subscription)
			throw new Error(`You need to be subscribed to perform event '${event}' on channel '${channel}'.`);
		
		const triggered = subscription.trigger(event, data);
		this._logger.log(`Performed '${event}' on channel '${channel}'.`, "info");

		return triggered;
  }

	/**
	 * Unsubscribes from an Pusher server channel
	 * @param {string} channelName - The name of the channel
	 */
	unsubscribe(channelName) {
    const channel = this._channels.subscriptions[channelName];
    
		if (channel) {
      this._pusher.unsubscribe(channel.name);
      this._fireChannelEvent(channel.name, this._channelUnsubscribed);

			this._logger.log(`Unsubscribed from channel '${channel.name}'.`, 'info');
		}
	}

	/**
	 * Called when a subscription to an Pusher server channel successfully completes. Calls `subscribed` on the component channel
	 * @param {Object} channel - The component channel
	 */
	_channelSubscribed(channel) {
    const channelName = channel._name;

		channel.subscribed?.call(this._contexts[channel._uid].context);

    this._channels.subscriptions[channelName] = true;
		this._logger.log(`Successfully subscribed a channel '${channelName}'.`, 'info');
	}

	/**
	 * Called when a subscription to an Pusher server channel disconnects. Calls `unsubscribed` on the component channel
	 * @param {Object} channel - The component channel
	 */
	_channelUnsubscribed(channel) {
    const channelName = channel._name;

		channel.unsubscribed?.call(this._contexts[channel._uid].context);

    delete this._channels.subscriptions[channelName];
		this._logger.log(`Successfully unsubscribed a channel '${channelName}'.`, 'info');
	}

	/**
   * Called when a subscription to an Action Cable server channel is rejected by the server. Calls rejected on the component channel
   * @param {Object} channel - The component channel
   */
  _subscriptionRejected(channel) {
    channel.rejected?.call(this._contexts[channel._uid].context);

    this._logger.log(`Subscription rejected for channel '${channel._name}'.`);
	}
	
	/**
   * Called when a message from an Action Cable server channel is received. Calls received on the component channel
   * @param {Object} channel - The component channel
   */
  _channelReceived(channel, eventName, data) {
		if (channel.bind && channel.bind[eventName])
				channel.bind[eventName].call(this._contexts[channel._uid].context, data);

    this._logger.log(`Message received on channel '${channel._name}'.`, "info");
  }

	/**
	 * Connects to a Pusher server
	 */
	_connect() {
		if (typeof this._appKey !== 'string')
			throw new Error('Pusher appKey is not valid. You can get your APP_KEY from the Pusher Channels dashboard.');
		
		this._pusher = new Pusher(this._appKey, this._pusherOptions);

		// this._pusher.connection.bind('connected', this._fireChannelEvent)
		if (!this.debug) return;
		this._pusher.connection.bind('error', err => {
      var seen = [];
      const errorMessage = JSON.stringify(err, function(key, val) {
					if (val !== null && typeof val === "object") {
						if (seen.indexOf(val) >= 0) return;
						seen.push(val);
					}
					return val;
				});
			
			this._logger.log(`connection error (probably WebSocket error)! ${errorMessage}`);
			this._logger.log(err);
    });
	}

	/**
	 * Component mounted. Retrieves component channels for later use
	 * @param {string} name - Component channel name
	 * @param {Object} value - The component channel object itself
	 * @param {Object} context - The execution context of the component the channel was created in
	 */
	_addChannel(name, value, context) {
		value._uid = context._uid;
    value._name = name;

    if (!this._channels[name]) this._channels[name] = [];
		this._addContext(context);

    if (!this._channels[name].find(c => c._uid === context._uid) && this._contexts[context._uid])
      this._channels[name].push(value);
	}

	/**
	 * Adds a component to a cache. Component is then used to bind `this` in the component channel to the Vue component's execution context
	 * @param {Object} context - The Vue component execution context being added
	 */
	_addContext(context) {
		this._contexts[context._uid] = { context };
	}

	/**
	 * Component is destroyed. Removes component's channels, subscription and cached execution context.
	 */
	_removeChannel(name, uid) {
		if (this._channels[name]) {
			const channelIndex = this._channels[name].findIndex(c => c._uid === uid);
      this._channels[name].splice(channelIndex, 1);
      delete this._contexts[uid];

      if (this._channels[name].length === 0 && this._channels.subscriptions[name]) {
        this._channels.subscriptions[name].unsubscribe();
				delete this._channels.subscriptions[name];
				delete this._channels[name];
      }

      this._logger.log(`Unsubscribed from channel '${name}'.`, "info");
    }
	}

	/**
	 * Fires the event triggered by the Pusher subscription on the component channel
	 * @param {string} channelName - The name of the Pusher server channel / The custom name chosen for the component channel
	 * @param {Function} callback - The component channel event to call
   * @param {string} eventName - The name of event passed from the Pusher server channel
	 * @param {Object} data - The data passed from the Pusher server channel
	 */
	_fireChannelEvent(channelName, callback, eventName, data) {
		if (!this._channels.hasOwnProperty(channelName)) return;

		const channels = this._channels[channelName];
		for (const channel of channels)
			callback.call(this, channel, eventName, data);
	}
}