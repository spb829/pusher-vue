<p align="center">
  <a href="https://travis-ci.org/spb829/pusher-vue"><img src="https://travis-ci.org/spb829/pusher-vue.svg?branch=master" /></a>
  <a href="https://www.npmjs.com/package/pusher-vue"><img src="https://img.shields.io/npm/v/pusher-vue.svg"/>
  <a href="https://vuejs.org/"><img src="https://img.shields.io/badge/vue-2.x-brightgreen.svg"/></a>
  <a href="https://github.com/spb829/pusher-vue/"><img src="https://img.shields.io/npm/l/pusher-vue.svg"/></a>
</p>

# PusherVue

[Pusher](https://pusher.com/) for Vue.js, highly inspired by [ActionCableVue](https://github.com/mclintprojects/actioncable-vue)

일단 개인적으로 사용하려고 만듬.

## Getting Started

```bash
npm install pusher-vue --save
```

```javascript
import Vue from 'vue';
import PusherVue from 'pusher-vue';
import App from './App.vue';

Vue.use(PusherVue, {
  appKey: 'your-app-key',
  cluster: 'pusher-app-cluster',
  debug: true,
  debugLevel: 'all'
});

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app');
```

## Component Level Usage

```javascript
new Vue({
  data() {
    return {
      message: 'Hello world'
    };
  },
  channels: {
    ChatChannel: {
      subscribeOnMount: true,
      subscribed() {
        console.log('subscribed ChatChannel');
      },
      unsubscribed() {
        console.log('unsubscribed ChatChannel');
      },
      bind: {
        message(rawData) {
          const data = JSON.parse(rawData);
          const message = data.message;

          this.message = data.message;
          console.log(`received message '${message}' from ChatChannel on event 'message'`);
        }
      }
    }
  }
});
```

## TODO

- TypeScript 테스트