<!-- MarkdownRenderer.vue -->
<template>
    <div class="markdown-body" v-html="renderedContent" @click="handleCodeBlockClick"></div>
</template>

<script lang="ts" setup tsx>
import { computed } from 'vue';
import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import { writeText } from 'clipboard-polyfill';
import { saveAs } from 'file-saver';

const props = defineProps({
    content: {
        type: String,
        required: true,
        default: ''
    }
});

const md = new MarkdownIt({
    html: true,   // 允许 HTML 标签
    linkify: true,  // 自动将类似 URL 的文本转换为链接
    breaks: false,
    typographer: false,  // 禁用美观排版（如引号转换）
    highlight: function (str, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                // return hljs.highlight(str, { language: lang }).value;
                // 去除首尾空行，并合并多余的连续空行
                // 1. 移除所有空行（包括仅含空格的行）
                const cleanStr = str.replace(/\n{2,}/g, '\n').trim();
                return `
                    <div class="code-block-wrapper">
                        <div class="code-header">
                        <span class="lang-label">${lang}</span>
                        <div class="code-actions">
                            <button class="copy-btn" data-code="${encodeURIComponent(cleanStr)}">复制</button>
                            <button class="download-btn" data-code="${encodeURIComponent(cleanStr)}" data-lang="${lang}">下载</button>
                        </div>
                        </div>
                        <pre><code class="hljs ${lang}">${hljs.highlight(cleanStr, { language: lang }).value}</code></pre>
                    </div>
                `;
            } catch (error) {
                console.error(`Error highlighting code: ${error}`);
            }
        }
        return ''; // 使用额外的默认转义
    }
});
// 处理 Markdown 内容
// 1. 替换连续的空行（3个或更多）为2
const renderedContent = computed(() => {
    const content = props.content
        .replace(/\n{3,}/g, '\n\n')
        // 移除代码块外的多余空行（保留代码块内部格式）
        .replace(/(```[\s\S]*?```)|\n+/g, (match, codeBlock) =>
            codeBlock ? codeBlock : '\n'
        );
    return md.render(content); // 渲染清理后的 Markdown
    // md.render(props.content)
});

// 代码块点击事件处理
// 1. 复制代码到剪贴板
// 2. 下载代码为文件
const handleCodeBlockClick = (e: any) => {
    const target = e.target;
    // 复制功能
    if (target.classList.contains('copy-btn')) {
        const code = decodeURIComponent(target.dataset.code);
        writeText(code).then(() => {
            const originalText = target.textContent;
            target.textContent = '已复制!';
            setTimeout(() => { target.textContent = originalText; }, 2000);
        });
    }
    // 下载功能
    if (target.classList.contains('download-btn')) {
        const code = decodeURIComponent(target.dataset.code);
        const lang = target.dataset.lang || 'txt';
        const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
        saveAs(blob, `code.${lang}`);
    }
};

</script>

<style>
/* 基础样式 */
.markdown-body {
    line-height: 1.6;
    width: 100%;
}

.markdown-body h1,
.markdown-body h2,
.markdown-body h3 {
    /* margin-top: 1.5em; */
    /* margin-bottom: 0.5em; */
}

.markdown-body p {
    /* margin-bottom: 1em; */
}

/* 代码块样式 */
.code-block-wrapper {
    position: relative;
    /* margin: 1.5em 0; */
    border-radius: 10px;
    overflow: hidden;
    background: linear-gradient(135deg, #f6f8fa 0%, #e9efff 100%);
    border: none;
    box-shadow: 0 2px 12px rgba(22, 119, 255, 0.08);
    transition: box-shadow 0.2s;
    padding: 0;
}

.code-block-wrapper:hover {
    box-shadow: 0 4px 24px rgba(22, 119, 255, 0.16);
}

.code-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5em 1em;
    background: linear-gradient(90deg, #e9efff 0%, #f6f8fa 100%);
    color: #1677ff;
    font-size: 0.95em;
    font-weight: 500;
    border-bottom: 1px solid #e4e7ed;
    border-top: none;
}

.lang-label {
    font-size: 0.85em;
    font-weight: 600;
    color: #1677ff;
    background: #e9efff;
    border-radius: 4px;
    padding: 2px 8px;
    margin-right: 8px;
}

.code-actions {
    display: flex;
    gap: 0.5em;
}

.code-actions button {
    padding: 0.25em 0.8em;
    background: #1677ff;
    color: #fff;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85em;
    font-weight: 500;
    box-shadow: 0 1px 4px rgba(22, 119, 255, 0.08);
    transition: background 0.2s, box-shadow 0.2s;
}

.code-actions button:hover {
    background: #409eff;
    box-shadow: 0 2px 8px rgba(22, 119, 255, 0.16);
}

pre code.hljs {
    /* padding: 1.2em !important; */
    display: block;
    overflow-x: auto;
    line-height: 1.4;
    font-size: 1em;
    background: transparent;
    border-radius: 0 0 10px 10px;
    font-family: 'Fira Mono', 'Consolas', 'Menlo', 'Monaco', monospace;
    /* 隐藏滚动条 */
    scrollbar-width: none;
    /* Firefox */
}

pre code.hljs::-webkit-scrollbar {
    display: none;
    /* Chrome, Safari */
}
</style>