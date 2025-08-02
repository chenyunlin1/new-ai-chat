<template>
    <div class="page-content">
        <div class="content">
            <div class="menu">
                <div class="logo">
                    <img src="@/assets/images/logo.png" />
                    <span>智能对话空间</span>
                </div>
                <!-- Menu content can go here -->
                <a-button type="link" :style="styles.addBtn" @click="onAddConversation">
                    <PlusOutlined />
                    开启新对话
                </a-button>
                <div class="menu-area">
                    <Conversations v-if="conversationList.length" :active-key="currentConversation?.key"
                        :default-active-key="currentConversation?.key" :menu="menuConfig" :items="conversationList"
                        :style="styles.menuArea" :on-active-change="handleConversationChange" />
                </div>
            </div>
            <!-- 聊天区域 -->
            <div class="chat-area">
                <div class="chat-area-content">

                    <div class="chat-content" ref="chatContainer">
                        <template v-for="(item, index) in currentConversation?.messageList" :key="item.id">
                            <Bubble :styles="{ content: { backgroundColor: 'transparent  !important', width: '100%' } }"
                                v-if="item.type === 'assistant'" style="margin-bottom: 10px;"
                                :loading="index === currentConversation?.messageList?.length - 1 || 0 ? chatLoading : false"
                                placement="start" :content="h(MarkdownRenderer, {
                                    content: item.content
                                })" header="智能对话空间" />
                            <Bubble v-else style="margin-bottom: 10px;" placement="end" :content="item.content" />
                        </template>
                    </div>
                    <div class="chat-footer">
                        <Sender :loading="isLoading" :read-only="isLoading" v-model:value="inputValue" :on-change="(v) => {
                            inputValue = v;
                        }" placeholder="给智能对话空间发送消息" :on-submit="handleSendMessage" :on-cancel="handleCancelSend"
                            :actions="false">
                            <template #footer="{ info: { components: { SendButton, LoadingButton } } }">
                                <Flex justify="space-between" align="center">
                                    <Flex gap="small" align="center">
                                        <a-dropdown placement="topLeft" arrow trigger="click" disabled>
                                            <a-button color="blue">
                                                DeepSeek
                                                <DownOutlined style="font-size: 12px;color: #169afd;" />
                                            </a-button>

                                            <template #overlay>
                                                <a-menu>
                                                    <a-menu-item>
                                                        <PlusOutlined /> 添加模型
                                                    </a-menu-item>
                                                </a-menu>
                                            </template>
                                        </a-dropdown>
                                        <span>流式</span><a-switch v-model:checked="isStream" checked-children="开"
                                            un-checked-children="关" />
                                    </Flex>
                                    <a-space align="center">
                                        <a-button :style="iconStyle" type="text" :icon="h(LinkOutlined)" />
                                        <a-divider type="vertical" />
                                        <component :is="LoadingButton" v-if="isLoading" type="default" />
                                        <component :is="SendButton" v-else type="primary" :disabled="false" />
                                    </a-space>
                                </Flex>
                            </template>
                        </Sender>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<script lang="ts" setup>
import MarkdownRenderer from './markdownRenderer.vue';
import { DeleteOutlined, DownOutlined, EditOutlined, LinkOutlined, PlusOutlined } from '@ant-design/icons-vue';
import { Conversations, Welcome, Sender, type ConversationsProps, Bubble, type BubbleListProps } from 'ant-design-x-vue';
// import type { ConversationsItem } from './types'
import { h, nextTick, ref, watch } from 'vue';
import { message, Flex } from 'ant-design-vue';
// import { chatWithAIStream } from '@/servers';
import { useConversationStore, type conversationListType } from '@/stores/conversationStore';
import { storeToRefs } from 'pinia';
import { chatWithAIStream, chatWithAI } from '@/servers/deepSeekApi.ts';
import { useDeepSeek } from '@/hooks/useDeepSeek'
import { limitMessagesByToken } from '@/utils';
const conversationStore = useConversationStore();
const { conversationList, currentConversation } = storeToRefs(conversationStore);
const { isLoading, chatStream, chatCommon, cancelRequest } = useDeepSeek();
import { v4 as createUuid } from 'uuid';
// 是否开启流式传输
const isStream = ref(true)


const [messageApi] = message.useMessage();
const styles = {
    'addBtn': {
        background: '#1677ff0f',
        border: '1px solid #1677ff34',
        width: 'calc(100% - 24px)',
        margin: '0 12px 24px 12px',
    },
    'menuArea': {
        width: '100%',
    }
}

const iconStyle = {
    fontSize: 18,
    //   color: token.value.colorText,
}

// 会话功能
const menuConfig: ConversationsProps['menu'] = (conversation) => ({
    items: [
        // {
        //     label: '重用名',
        //     key: 'operation1',
        //     icon: h(EditOutlined),
        // },
        {
            label: '删除',
            key: 'delete',
            icon: h(DeleteOutlined),
            danger: true,
        },
    ],
    onClick: (menuInfo) => {
        if (menuInfo.key === 'delete') {
            // // 如果删除的是当前会话，则切换到第一个会话
            if (currentConversation.value.key === conversation.key) {
                if (isLoading.value) {
                    cancelRequest();
                }
                conversationStore.deleteConversation(conversation.key);
                // 设置会话为列表的第一个,如果没有则为空
                conversationStore.setCurrentConversation(conversationList.value[0] || {
                } as typeof currentConversation.value);
            } else {
                conversationStore.deleteConversation(conversation.key);
            }
        }
    },
});
// 会话切换
const handleConversationChange = (key: string) => {
    conversationStore.setCurrentConversation(conversationList.value.find(item => item.key === key) || {} as typeof currentConversation.value);
    inputValue.value = '';
}
// 添加新对话
const onAddConversation = () => {
    const conversationInfo = {
        key: `item${conversationList.value.length + 1}`,
        label: `新对话 ${conversationList.value.length + 1}`,
        messageList: []
    }
    conversationStore.addConversation(conversationInfo);
}

const chatContainer = ref<Element | null>(null);

// 滚动到最底部
const scrollToBottom = () => {
    nextTick(() => {
        if (chatContainer.value) {
            chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
        }
    });
};

// 监听消息列表变化，自动滚动
watch(() => currentConversation.value?.messageList, () => {
    scrollToBottom();
}, { deep: true });


const inputValue = ref('');
const chatLoading = ref(false);
// 发送信息（流式处理）
const handleSendMessage = async () => {
    if (!currentConversation.value?.key) {
        // 如果没有当前会话，则新增一条对话
        onAddConversation()
    }
    // 把当前表单内容存储当前聊天
    currentConversation.value.messageList.push({
        id: createUuid(),
        type: 'user',
        content: inputValue.value
    });
    // 如果当前会话只有一条消息，则设置会话标题为当前输入内容
    if (currentConversation.value.messageList.length === 1) {
        currentConversation.value.label = inputValue.value;
    }
    // 发送上下文，且限制最大字节为16k
    const messages = limitMessagesByToken(currentConversation.value.messageList.map(item => ({ role: item.type, content: item.content })));
    const id = createUuid();
    currentConversation?.value.messageList?.push({
        id,
        type: 'assistant',
        content: '',
    })
    // 查询当前最后一条的内容
    const index = currentConversation?.value.messageList?.findIndex(item => item.id === id) || 0
    chatLoading.value = true;
    // 判断是否是流式
    if (isStream.value) {
        try {
            inputValue.value = ''
            for await (const delta of chatStream(messages)) {
                if (chatLoading.value) {
                    chatLoading.value = false;
                }
                currentConversation.value.messageList[index].content += delta;
            }
        } catch (err) {
            console.error('API调用失败:', err)
        }
    } else {
        try {
            inputValue.value = ''
            const response = await chatCommon(messages)
            currentConversation.value.messageList[index].content = response
        } catch (err) {
            console.error('API调用失败:', err)
        } finally {
            chatLoading.value = false;
        }
    }
}

// 取消发送
const handleCancelSend = () => {
    chatLoading.value = false;
    cancelRequest();
}

</script>
<style scoped>
.page-content {
    width: 100vw;
    height: 100vh;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f5f7fa;
    padding: 0;
}

.content {
    width: 90vw;
    height: 90vh;
    border-radius: 16px;
    /* border: 1px solid #e4e7ed; */
    background: #fff;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
    padding: 32px;
    display: flex;
    /* flex-direction: column; */
    transition: box-shadow 0.2s;

}

.content:hover {
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

.menu {
    width: 280px;
    height: 100%;
    background-color: #fafafa;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 32px;
    margin-right: 20px;
}

.logo {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-bottom: 32px;
    width: 100%;
}

.logo img {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    object-fit: cover;
    box-shadow: 0 2px 8px rgba(22, 119, 255, 0.08);
    background: #fff;
}

.logo span {
    font-size: 20px;
    font-weight: 600;
    color: #1677ff;
    letter-spacing: 1px;
}

.add-btn {
    background: #1677ff0f;
    border: 1px solid #1677ff34;
    width: calc(100% - 24px);
    margin: 0 12px 24px 12px;
}

.menu-area {
    width: 100%;
    flex: 1;
    overflow-y: auto;
}

.chat-area {
    display: flex;
    flex: 1;
    justify-content: center;
    height: 100%;
    /* flex-direction: column;
    align-items: center; */
}

.chat-area-content {
    width: 80%;
    max-width: 768px;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.chat-content {
    flex: 1;
    width: 100%;
    margin: 30px 0;
    overflow: hidden;
    overflow-y: auto;
    scrollbar-width: none;
    /* Firefox */
}

.chat-content::-webkit-scrollbar {
    display: none;
    /* Chrome, Safari */
}

.chat-footer {
    width: 100%;
}
</style>