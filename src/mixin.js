export default {
  /**
   * Retrieve channels in component once mounted.
   */
  created() {
    if (this.$options.channels || this.channels) {
      const channels = this.channels || this.$options.channels;
      const entries = Object.entries(channels);

      for (let index = 0; index < entries.length; index++) {
        const entry = entries[index];

        if (entry[0] != "computed")
          this.$pusher._addChannel(entry[0], { ...entry[1] }, this);
        else {
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
      const entries = Object.entries(channels);

      for (let index = 0; index < entries.length; index++) {
        const entry = entries[index];

        if (entry[0] != "computed")
          this.$pusher._removeChannel(entry[0], this._uid)
        else {
          const computedChannels = entry[1];
          computedChannels.forEach((channel) => {
            const channelName = channel.channelName.call(this);
            this.$pusher._removeChannel(channelName, this._uid);
          });
        }
      }
    }
  },
};