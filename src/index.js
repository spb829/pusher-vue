import Socket from './socket'

const PusherVue = {
	/**
	 * PusherVue entry point
	 * @param Vue
	 * @param {Object} options - PusherVue options
   * @param {string} options.appKey - Pusher app_key
	 * @param {Object} options.pusher - Pusher.js options. See https://github.com/pusher/pusher-js#configuration
	 * @param {boolean} options.debug - Enable logging for debug
	 * @param {string} options.debugLevel - Debug level required for logging. Either `info`, `error`, or `all`
	 * @param {object} options.store - Vuex store
	 */
	install(Vue, options) {
    new Socket(Vue, options);
	}
};

export default PusherVue;