import Vue from "vue";
import { ChannelOptions } from "./options";

declare module 'vue/types/vue' {
  interface Vue {
    $pusher: {
      subscribe: (channelName: string) => void;
      perform: ({channel: string, event: string, data: {}})
      unsubscribe: (channelName: string) => void;
    };
  }
}

declare module 'vue/types/options' {
  interface ComponentOptions<V extends Vue> {
    channels?: ChannelOptions<V>
  }
}