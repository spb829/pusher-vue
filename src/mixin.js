export default {
	/**
	 * Retrieve channels in component once mounted.
	 */
	mounted() {
		if (this.$options.channels) {
			for(const entry of Object.entries(this.$options.channels)){
        this.$socket._addChannel(entry[0], entry[1], this);
			}
		}
	},
	/**
	 * Unsubscribe from channels when component is destroyed.
	 */
	destroyed() {
		if (this.$options.channels) {
			for (const key of Object.keys(this.$options.channels)) {
				this.$socket._removeChannel(key)
			}
		}
	}
};