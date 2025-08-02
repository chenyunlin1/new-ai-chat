export interface ConversationsItem {
  key: string
  label: string
  messageList?: messageItem[] // Assuming messageList is an array of messages
}

interface messageItem {
  id: string
  type: 'user' | 'assistant'
  content: string
  loading?: boolean
}
