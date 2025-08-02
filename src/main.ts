import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Antd from 'ant-design-vue'
import App from './App.vue'
// import router from './router'
import 'ant-design-vue/dist/reset.css'
import 'highlight.js/styles/github.css'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate' // 引入持久化插件

const app = createApp(App)

// 创建 Pinia 实例
const pinia = createPinia()
// 使用持久化插件
pinia.use(piniaPluginPersistedstate)

app.use(pinia)
// app.use(router)

app.use(Antd).mount('#app')
