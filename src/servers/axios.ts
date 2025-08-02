import axios from 'axios'
import type { AxiosInstance } from 'axios'

interface CustomAxiosInstance extends AxiosInstance {
  cancelAllRequests?: (reason?: string) => void
}

const api = axios.create({
  baseURL: 'https://api.deepseek.com',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${import.meta.env.VITE_API_KEY}`,
  },
}) as CustomAxiosInstance

// 存储所有活动的 AbortController
const abortControllers = new Map()

// 请求拦截器
api.interceptors.request.use((config) => {
  // 为每个请求创建独立的 AbortController
  const controller = new AbortController()
  // 将控制器添加到 Map 中，使用请求唯一标识
  const requestId = `${config.method}-${config.url}`
  abortControllers.set(requestId, controller)

  // 将信号添加到请求配置
  config.signal = controller.signal
  return config
})

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    // 请求成功完成后移除对应的控制器
    const requestId = `${response.config.method}-${response.config.url}`
    abortControllers.delete(requestId)
    return response
  },
  (error) => {
    // 请求失败后移除对应的控制器
    if (error.config) {
      const requestId = `${error.config.method}-${error.config.url}`
      abortControllers.delete(requestId)
    }
    return Promise.reject(error)
  },
)
// 添加全局取消所有请求的方法
api.cancelAllRequests = (reason = '所有请求已被取消') => {
  abortControllers.forEach((controller) => controller.abort(reason))
  abortControllers.clear()
}
// // 添加全局取消所有请求的方法
// export const cancelAllRequests = (reason = '所有请求已被取消') => {
//   // 取消所有进行中的请求
//   abortControllers.forEach((controller) => {
//     controller.abort(reason)
//   })

//   // 清空控制器集合
//   abortControllers.clear()
// }

export default api
