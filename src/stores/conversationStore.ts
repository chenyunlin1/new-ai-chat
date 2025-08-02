import { defineStore } from 'pinia'
import { debounce } from 'lodash-es'

export interface conversationListType {
  key: string
  label: string
  messageList: messageItem[] // Assuming messageList is an array of messages
}

interface messageItem {
  id: string
  type: 'user' | 'assistant'
  content: string
}

interface ConversationStoreStateType {
  conversationList: conversationListType[]
  currentConversation: conversationListType
}


export const useConversationStore = defineStore('conversation', {
  state: (): ConversationStoreStateType => ({
    conversationList: [],
    currentConversation: {} as conversationListType,
  }),
  actions: {
    // 添加对话
    addConversation(conversation: conversationListType) {
      // 添加对话时判断是否超过100调记录,超过的话把最早的对话删除
      if (this.conversationList.length >= 100) {
        this.conversationList.shift() // 删除最早的对话
      }
      this.conversationList.push(conversation)
      // this.currentConversation = conversation
      // 设置当前对话为新添加的对话
      this.currentConversation = conversation
    },
    // 设置当前对话
    setCurrentConversation(conversation: conversationListType) {
      this.currentConversation = conversation
    },
    // 删除对话
    deleteConversation(key: string) {
      this.conversationList = this.conversationList.filter(
        (conversation) => conversation.key !== key,
      )
      if (this.currentConversation.key === key) {
        this.currentConversation = {} as conversationListType // 清空当前对话
      }
    },
  },
  persist: {
    key: 'conversation',
    storage: {
      getItem: (key) => localStorage.getItem(key),
      // 添加防抖,防止频繁写入本地缓存
      setItem: debounce((key, value) => {
        localStorage.setItem(key, value)
      }, 1000),
    },
  }, // 启用持久化
})
