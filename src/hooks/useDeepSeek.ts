import { ref } from 'vue'
import OpenAI from 'openai'
// 消息角色
type MessageRole = 'user' | 'assistant'
export interface ChatMessage {
  role: MessageRole
  content: string
}
interface ChatOptions {
  apiKey?: string
  baseURL?: string
  systemPrompt?: string
}

export const useDeepSeek = () => {
  // 使用环境变量避免将API Key硬编码到代码中
  const deepSeekKey = import.meta.env.VITE_DEEP_SEEK_KEY
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  const cloudFunctionUrl = import.meta.env.VITE_CLOUD_FUNCTION_URL
  const useCloudFunction = import.meta.env.PROD && !!cloudFunctionUrl

  // 存储当前请求的 AbortController
  const abortControllerRef = ref<AbortController | null>(null)
  // 初始化客户端
  const initClient = (apiKey?: string, baseURL?: string) => {
    return new OpenAI({
      baseURL: baseURL || 'https://api.deepseek.com',
      apiKey: apiKey || deepSeekKey,
      // 直接在浏览器调用
      dangerouslyAllowBrowser: true,
    })
  }

  // 云函数请求方法
  const createCloudRequest = async function* (messages: ChatMessage[], options?: ChatOptions) {
    const controller = new AbortController()
    abortControllerRef.value = controller
    console.log('Cloud Function URL:', cloudFunctionUrl)

    // 最大重试次数
    const maxRetries = 3
    let retryCount = 0
    let lastError: Error | null = null

    while (retryCount < maxRetries) {
      try {
        console.log(`尝试请求云函数 (${retryCount + 1}/${maxRetries})...`)

        const requestBody = {
          messages,
          model: 'deepseek-chat',
          stream: true,
        }

        console.log('请求体:', JSON.stringify(requestBody))

        const response = await fetch(cloudFunctionUrl!, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        })

        console.log('响应状态:', response.status, response.statusText)

        if (!response.ok) {
          // 尝试读取错误响应
          let errorText = ''
          try {
            errorText = await response.text()
          } catch (e) {
            errorText = '无法读取错误响应'
          }

          throw new Error(`云函数请求失败: ${response.status} ${response.statusText}\n${errorText}`)
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error('无法读取响应流')

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { value, done } = await reader.read()
          if (done || controller.signal.aborted) break

          buffer += decoder.decode(value, { stream: true })

          const events = buffer.split('\n\n')
          buffer = events.pop() || ''

          for (const event of events) {
            if (!event.startsWith('data: ')) continue

            const data = event.replace('data: ', '')
            if (data === '[DONE]') break

            try {
              const json = JSON.parse(data)
              const content = json.choices[0]?.delta?.content || ''
              if (content) yield content
            } catch (e) {
              console.error('解析错误:', e)
            }
          }
        }

        // 成功处理完请求，跳出重试循环
        break
      } catch (err) {
        lastError = err as Error

        if ((err as Error).name === 'AbortError') {
          console.log('请求被中止')
          break
        }

        retryCount++
        console.error(`请求失败 (${retryCount}/${maxRetries}):`, err)

        if (retryCount < maxRetries) {
          // 等待一段时间后重试
          const retryDelay = 1000 * retryCount // 递增重试延迟
          console.log(`将在 ${retryDelay}ms 后重试...`)
          await new Promise((resolve) => setTimeout(resolve, retryDelay))
        } else {
          console.error('达到最大重试次数，放弃请求')
          throw lastError
        }
      }
    }

    // 如果所有重试都失败，但没有抛出错误（不应该发生）
    if (retryCount >= maxRetries && lastError) {
      throw lastError
    }
  }
  // catch (err) {
  //   if ((err as Error).name !== 'AbortError') {
  //     console.error('云函数请求最终失败:', err)
  //     throw err
  //   }
  // } finally {
  //   abortControllerRef.value = null
  // }

  // 取消当前请求的方法
  const cancelRequest = () => {
    if (abortControllerRef.value) {
      abortControllerRef.value.abort()
      abortControllerRef.value = null
      isLoading.value = false
    }
  }

  // 流式对话
  const chatStream = async function* (messages: ChatMessage[], options?: ChatOptions) {
    isLoading.value = true
    error.value = null

    // 创建新的 AbortController
    const controller = new AbortController()
    abortControllerRef.value = controller

    try {
      const finalOptions = {
        model: 'deepseek-chat',
        apiKey: deepSeekKey,
        ...options,
      }
      // finalOptions.apiKey, finalOptions?.baseURL
      // const currentClient = initClient()
      // console.log()
      if (useCloudFunction) {
        yield* createCloudRequest(messages, finalOptions)
      } else {
        const currentClient = initClient()
        // 发起流式请求
        const stream = await currentClient.chat.completions.create({
          messages,
          model: finalOptions.model,
          stream: true, // 启用流式传输
        })

        let fullContent = ''
        for await (const chunk of stream) {
          const delta = chunk.choices?.[0]?.delta?.content || ''
          if (!isLoading.value) {
            break // 如果请求被取消，退出循环
          }
          if (delta) {
            fullContent += delta
            yield delta
          }
        }
      }
    } catch (err) {
      error.value = err as Error
      throw err
    } finally {
      abortControllerRef.value = null
      isLoading.value = false
    }
  }

  // 非流式兼容方法
  const chatCommon = async (messages: ChatMessage[], options?: ChatOptions) => {
    const content = ''
    isLoading.value = true
    const currentClient = initClient()
    // 发起流式请求
    try {
      const content = await currentClient.chat.completions.create({
        messages,
        model: 'deepseek-chat',
      })
      return content.choices[0]?.message?.content || ''
    } catch (err) {
      error.value = err as Error
      throw err
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    error,
    chatStream,
    chatCommon,
    cancelRequest,
  }
}
