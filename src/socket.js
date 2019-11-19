import Pusher from 'pusher-js';
import Logger from './logger';
import Mixin from './mixin';

export default class Socket {
	_logger = null;
  _socket = null;
  _appKey = null;
	_channels = { subscriptions: {} };
	_contexts = {};
  _pusherOptions = {};

	/**
	 * PusherVue $pusher entry point
	 * @param {Object} Vue
	 * @param {Object} options - PusherVue options
   * @param {string} options.key - Pusher key
	 * @param {Object} options.pusher - Pusher.js options. See https://github.com/pusher/pusher-js#configuration
	 * @param {boolean} options.debug - Enable logging for debug
	 * @param {string} options.debugLevel - Debug level required for logging. Either `info`, `error`, or `all`
	 */
	constructor(Vue, options) {
		Vue.prototype.$pusher = this;
		Vue.mixin(Mixin);

		let { key, pusher, debug, debugLevel } = options || {
      key: null,
      pusher: {},
			debug: false,
			debugLevel: 'error'
    };
    this._appKey = key;
    this._pusherOptions = pusher;
    this._logger = new Logger(debug, debugLevel);
    Pusher.logToConsole = debug;
	}

	/**
	 * Subscribes to a channel
	 * @param {string} channelName - The name of the channel
	 */
	subscribe(channelName) {
		if (this._socket) {
			const that = this;

      this._channels.subscriptions[channelName] = this._socket.subscribe(channelName);
      this._fireChannelEvent(channelName, this._channelSubscribed);

      const channel = this._channels.subscriptions[channelName];
      channel.bind_global((event, data) => {
        that._fireChannelEvent(channelName, that._channelBind, event, data);
      });
		} else {
			this._connect();
			this.subscribe(channelName);
		}
	}

	/**
	 * Unsubscribes from an Pusher server channel
	 * @param {string} channelName - The name of the channel
	 */
	unsubscribe(channelName) {
    const channel = this._channels.subscriptions[channelName];
    
		if (channel) {
      channel.unbind_global();
      this._socket.unsubscribe(channel.name);
      this._fireChannelEvent(channel.name, this._channelUnsubscribed);

			this._logger.log(
        `Unsubscribed from channel '${channel.name}'.`, 
        'info'
      );
		}
	}

	/**
	 * Called when a subscription to an Pusher server channel successfully completes. Calls `subscribed` on the component channel
	 * @param {Object} channel - The component channel
	 */
	_channelSubscribed(channel) {
    const channelName = channel._name;

		if (channel.subscribed)
			channel.subscribed.call(this._contexts[channel._uid].context);

    this._channels.subscriptions[channelName] = true;
		this._logger.log(
			`Successfully subscribed a channel '${channelName}'.`,
			'info'
		);
	}

	/**
	 * Called when a subscription to an Pusher server channel disconnects. Calls `unsubscribed` on the component channel
	 * @param {Object} channel - The component channel
	 */
	_channelUnsubscribed(channel) {
    const channelName = channel._name;

		if (channel.unsubscribed)
			channel.unsubscribed.call(this._contexts[channel._uid].context);

    delete this._channels.subscriptions[channelName];
		this._logger.log(
			`Successfully unsubscribed a channel '${channelName}'.`,
			'info'
		);
	}

  /**
	 * Called when a message from an Pusher server channel is received. Calls received on the component channel
	 * @param {Object} channel - The component channel
	 */
	_channelBind(channel, event, data) {
		if (channel.bind)
			channel.bind.call(this._contexts[channel._uid].context, event, data);

		this._logger.log(
      `The event ${event} was triggered with data ${data}`, 
      'info'
    );
	}

	/**
	 * Connects to an Pusher server
	 */
	_connect() {
		if (typeof this._appKey == 'string') {
      this._socket = new Pusher(this._appKey, this._pusherOptions);
      this._socket.connection.bind('connected', this._fireChannelEvent)
    } else {
			throw new Error(
				'Pusher key is not valid. You can get your APP_KEY from the Pusher Channels dashboard.'
			);
		}
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

		this._channels[name] = value;
		this._addContext(context);
	}

	/**
	 * Adds a component to a cache. Component is then used to bind `this` in the component channel to the Vue component's execution context
	 * @param {Object} context - The Vue component execution context being added
	 */
	_addContext(context) {
		if (!this._contexts[context._uid]) {
			this._contexts[context._uid] = { context, users: 1 };
		} else {
			++this._contexts[context._uid].users;
		}
	}

	/**
	 * Component is destroyed. Removes component's channels, subscription and cached execution context.
	 */
	_removeChannel(name) {
		if (this._channels.subscriptions[name]) {
			const uid = this._channels[name]._uid;

			this._unsubscribe(name)
			delete this._channels[name];

			--this._contexts[uid].users;
			if (this._contexts[uid].users <= 0) delete this._contexts[uid];

			this._logger.log(
        `Channel '${name}' has been removed.`, 
        'info'
      );
		}
	}

	/**
	 * Fires the event triggered by the Pusher subscription on the component channel
	 * @param {string} channelName - The name of the Pusher server channel / The custom name chosen for the component channel
	 * @param {Function} callback - The component channel event to call
   * @param {string} event - The event passed from the Pusher server channel
	 * @param {Object} data - The data passed from the Pusher server channel
	 */
	_fireChannelEvent(channelName, callback, event, data) {
		if (this._channels.hasOwnProperty(channelName)) {
			const channel = this._channels[channelName];
			callback.call(this, channel, event, data);
		}
	}
}