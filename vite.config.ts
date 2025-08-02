import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import components from 'unplugin-vue-components/vite'
import { AntDesignXVueResolver } from 'ant-design-x-vue/resolver'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
    components({
      resolvers: [AntDesignXVueResolver()],
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://api.deepseek.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/v1'),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // 从环境变量安全注入密钥
            proxyReq.setHeader('Authorization', `Bearer ${process.env.VITE_DEEPSEEK_KEY}`)
          })
        },
      },
    },
  },
})
