export default {
	/**
	 * Retrieve channels in component once mounted.
	 */
	mounted() {
		if (this.$options.channels) {
			Object.entries(this.$options.channels).forEach(entry => {
        this.$socket._addChannel(entry[0], entry[1], this);
			});
		}
	},
	/**
	 * Unsubscribe from channels when component is destroyed.
	 */
	destroyed() {
		if (this.$options.channels) {
			Object.keys(this.$options.channels).forEach(key =>
				this.$socket._removeChannel(key)
			);
		}
	}
};