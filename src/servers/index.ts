import OpenAI from 'openai'
// 使用环境变量避免将API Key硬编码到代码中
const deepSeekKey = import.meta.env.VITE_DEEP_SEEK_KEY

// 定义支持的模型类型
type DeepSeekModel = 'deepseek-chat' | 'deepseek-coder' | string // 可以扩展其他模型

// 初始化客户端（单例模式）
let _client: OpenAI | null = null

function getClient(apiKey: string, baseURL?: string) {
  if (!_client) {
    _client = new OpenAI({
      // baseURL: baseURL || 'https://api.deepseek.com',
      baseURL: '/api',
      // apiKey,
      // 直接在浏览器调用
      dangerouslyAllowBrowser: true,
    })
  }
  return _client
}

// 流式对话
export async function* chatWithAIStream(
  message: string,
  options?: {
    model?: DeepSeekModel
    apiKey?: string
    baseURL?: string
    systemPrompt?: string
  },
) {
  const finalOptions = {
    model: 'deepseek-chat' as DeepSeekModel, // 默认模型
    apiKey: deepSeekKey, // 你的默认API Key
    ...options,
  }

  // 初始化客户端
  const client = getClient(finalOptions.apiKey, finalOptions.baseURL)

  // 构建消息
  const messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
  }> = []

  if (finalOptions.systemPrompt) {
    messages.push({ role: 'system', content: finalOptions.systemPrompt })
  }
  messages.push({ role: 'user', content: message })

  // 流式调用
  const stream = await client.chat.completions.create({
    messages,
    model: finalOptions.model,
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

// 非流式兼容函数（保留原有用法）
export async function chatWithAI(
  message: string,
  options?: {
    model?: DeepSeekModel
    apiKey?: string
    baseURL?: string
    systemPrompt?: string
  },
) {
  let content = ''
  for await (const delta of chatWithAIStream(message, options)) {
    content += delta
  }
  return content
}

/**
 * 专用函数：代码模型调用
 */
export async function askCoder(
  codeQuestion: string,
  options?: { apiKey?: string; baseURL?: string },
) {
  return chatWithAI(codeQuestion, {
    ...options,
    model: 'deepseek-coder',
    systemPrompt: '你是一个专业的编程助手，请只回答技术相关问题。',
  })
}
