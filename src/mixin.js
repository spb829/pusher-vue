export default {
  /**
   * Retrieve channels in component once mounted.
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
						this.$pusher._addChannel(entry[0], { ...entry[1] }, this);
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
						this.$pusher._removeChannel(entry[0], this._uid)
				}
      }
    }
  },
};