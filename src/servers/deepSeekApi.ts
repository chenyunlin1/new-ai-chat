import OpenAI from 'openai'
// 使用环境变量避免将API Key硬编码到代码中
const deepSeekKey = import.meta.env.VITE_DEEP_SEEK_KEY

// 定义支持的模型类型
type DeepSeekModel = 'deepseek-chat' | 'deepseek-coder' | string

// 初始化客户端（单例模式），防止重复初始化，减少资源消耗
let client: OpenAI | null = null

// 获取客户端
function getClient(baseURL?: string) {
  if (!client) {
    client = new OpenAI({
      baseURL: baseURL || 'https://api.deepseek.com',
      apiKey: deepSeekKey,
      // 直接在浏览器调用
      dangerouslyAllowBrowser: true,
    })
  }
  return client
}

interface OptionsType {
  model?: DeepSeekModel
  systemPrompt?: string
}
interface MessageType {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// 流式请求
export const chatWithAIStream = async function* (message: string, options?: OptionsType) {
  const messages: Array<MessageType> = []
  messages.push({ role: 'user', content: message })

  // 初始化客户端
  const client = getClient()

  const stream = await client.chat.completions.create({
    model: options?.model || 'deepseek-chat',
    messages,
    stream: true,
  })

  let fullContent = ''
  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content || ''
    if (delta) {
      fullContent += delta
      yield delta
    }
  }
}

// 非流式请求
export const chatWithAI = async (message: string, options?: OptionsType) => {
  const messages: Array<MessageType> = []
  messages.push({ role: 'user', content: message })

  // 初始化客户端
  const client = getClient()

  const response = await client.chat.completions.create({
    model: options?.model || 'deepseek-chat',
    messages,
  })

  return response.choices[0].message.content
}
