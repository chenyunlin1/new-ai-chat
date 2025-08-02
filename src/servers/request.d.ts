/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AxiosRequestConfig, AxiosResponse, CancelTokenSource } from 'axios'

// 基础响应类型
export interface BaseResponse<T = any> {
  code: number
  message: string
  data: T
}

// 扩展的请求配置
export interface RequestConfig extends AxiosRequestConfig {
  // 是否显示加载提示
  showLoading?: boolean
  // 是否处理错误（默认true）
  handleError?: boolean
  // 是否流式请求
  isStream?: boolean
}

// 流式请求回调
export interface StreamCallbacks<T = any> {
  onData: (data: T) => void
  onDone?: () => void
  onError?: (error: Error) => void
}

// 请求实例类型
export interface RequestInstance {
  <T = any>(config: RequestConfig): Promise<BaseResponse<T>>
  get: <T = any>(url: string, params?: any, config?: RequestConfig) => Promise<BaseResponse<T>>
  post: <T = any>(url: string, data?: any, config?: RequestConfig) => Promise<BaseResponse<T>>
  put: <T = any>(url: string, data?: any, config?: RequestConfig) => Promise<BaseResponse<T>>
  delete: <T = any>(url: string, config?: RequestConfig) => Promise<BaseResponse<T>>
  cancelAll: (message?: string) => void
  streamRequest: <T = any>(config: RequestConfig, callbacks: StreamCallbacks<T>) => () => void
}
