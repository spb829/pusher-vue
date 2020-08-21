/// <reference path="./vue.d.ts" />
import { PluginFunction } from "vue";
// augment typings of Vue.js
// import "./vue"

export interface PusherVueOptions {
  appKey: string,
  cluster: string,
  debug?: boolean;
  debugLevel?: string;
  store?: object;
}

declare class VuePusherExt {
  static install: PluginFunction<PusherVueOptions>;
  static defaults: PusherVueOptions;
}

export default VuePusherExt
