export type ChannelOptions<V> = {
  [key: string]: {
    subscribed?: () => void,
    unsubscribed?: () => void,
    bind?: {
      [key: string]: (data: {}) => void;
    }
  }
};