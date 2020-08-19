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
	 * @param {Object} options - PusherVue options
   * @param {string} options.appKey - Pusher app_key
	 * @param {Object} options.pusher - Pusher.js options. See https://github.com/pusher/pusher-js#configuration
	 * @param {boolean} options.debug - Enable logging for debug
	 * @param {string} options.debugLevel - Debug level required for logging. Either `info`, `error`, or `all`
	 * @param {object} options.store - Vuex store
	 */
	constructor(Vue, options) {
		Vue.prototype.$pusher = this;
		Vue.mixin(Mixin);

		let { appKey, pusher, debug, debugLevel } = options || {
      appKey: null,
      pusher: {},
			debug: false,
			debugLevel: 'error'
    };
    this._appKey = appKey;
		this._pusherOptions = pusher;
		if (store) store.$pusher = this;
		this._logger = new Logger(debug, debugLevel);
		
		this.initializePusher();
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
		const channel = this._channels.subscriptions[channelName];

		// Subscribed
		channel.bind('pusher:subscription_succeeded', () => {
			this._fireChannelEvent(channelName, this._channelSubscribed);
		});
		// Subscribe Error
		channel.bind('pusher:subscription_error', () => {
			this._fireChannelEvent(channelName, this._subscriptionRejected);
		});

		const binds = getChannel(channelName)?.bind // => Object { key: function() }
		if (!binds) return;

		for(const eventName of Object.keys(binds)) {
			channel.bind(eventName, (data) => {
				this._fireChannelEvent(channelName, this._channelReceived, eventName, data);
			});
		}
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
		if (typeof this._appKey == 'string')
			throw new Error('Pusher appKey is not valid. You can get your APP_KEY from the Pusher Channels dashboard.');
		
		this._pusher = new Pusher(this._appKey, this._pusherOptions);
		// this._pusher.connection.bind('connected', this._fireChannelEvent)
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

    if (!this._channels[name].find(c => c._uid == context._uid) && this._contexts[context._uid])
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
	_removeChannel(name) {
		if (this._channels[name]) {
      this._channels[name].splice(this._channels[name].findIndex(c => c._uid == uid), 1);
      delete this._contexts[uid];

      if (this._channels[name].length == 0 && this._channels.subscriptions[name]) {
        this._channels.subscriptions[name].unsubscribe();
        delete this._channels.subscriptions[name];
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
		const channel = getChannel(channelName);

		if (chennel) callback.call(this, channel, eventName, data);
	}

	/**
	 * Get Channel Object by name
	 */
	getChannel(channelName) {
		if (!this._channels.hasOwnProperty(channelName)) return undefined;

		return this._channels[channelName];
	}
}