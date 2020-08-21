export default {
  /**
   * Retrieve channels in component once created.
   */
  created() {
    if (this.$options.channels || this.channels) {
      const channels = this.channels || this.$options.channels;

      for (const entry of Object.entries(channels)) {
				switch (entry[0]) {
					case "computed":
						const computedChannels = entry[1];
						computedChannels.forEach((channel) => {
							const channelName = channel.channelName.call(this);
							const channelObject = {
								subscribed: channel["subscribed"],
								unsubscribed: channel["unsubscribed"],
								bind: channel["bind"]
							};

							this.$pusher._addChannel(channelName, channelObject, this);
						});
						break;
					default:
						const channelName = entry[0];
						const channelObject = { ...entry[1] };
						this.$pusher._addChannel(channelName, channelObject, this);
				}
      }
    }
  },
  /**
   * Unsubscribe from channels when component is destroyed.
   */
  beforeDestroy() {
    if (this.$options.channels || this.channels) {
      const channels = this.channels || this.$options.channels;

      for (const entry of Object.entries(channels)) {
        switch (entry[0]) {
					case "computed":
						const computedChannels = entry[1];
						computedChannels.forEach((channel) => {
							const channelName = channel.channelName.call(this);
							this.$pusher._removeChannel(channelName, this._uid);
						});
						break;
					default:
						const channelName = entry[0];
						this.$pusher._removeChannel(channelName, this._uid)
				}
      }
    }
	},
	/**
	 * Immediately subscribe channels once mounted if subscribeOnMount is set true
	 */
	mounted() {
		if (this.$options.channels || this.channels) {
      const channels = this.channels || this.$options.channels;

      for (const entry of Object.entries(channels)) {
				switch (entry[0]) {
					case "computed":
						const computedChannels = entry[1];
						computedChannels.forEach((channel) => {
              const channelName = channel.channelName.call(this);
              const subscribeOnMount = channel.subscribeOnMount?.call(this);

							if (subscribeOnMount) this.$pusher.subscribe(channelName);
						});
						break;
					default:
						const channelName = entry[0];
						const subscribeOnMount = entry[1].subscribeOnMount;
						if (subscribeOnMount) this.$pusher.subscribe(channelName);
				}
      }
    }
	}
};
