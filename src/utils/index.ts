import type { ChatMessage } from '@/hooks/useDeepSeek'

/** 最多发送16k字节的消息 */
export function limitMessagesByToken(
  messages: { role: string; content: string }[],
  maxLength = 16000,
) {
  let totalLength = 0
  const result: typeof messages = []
  // 从后往前遍历，只保留最新的消息直到不超过 maxLength
  for (let i = messages.length - 1; i >= 0; i--) {
    const msgLength = messages[i].content.length
    if (totalLength + msgLength > maxLength) break
    totalLength += msgLength
    result.unshift(messages[i])
  }
  return result as ChatMessage[]
}
