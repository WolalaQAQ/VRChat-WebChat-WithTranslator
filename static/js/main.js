// main.js - 主要JavaScript功能

// DOM 元素引用
const chatBody = document.getElementById('chatBody');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const translateButton = document.getElementById('translateButton');
const translationContainer = document.getElementById('translationContainer');
const translationResult = document.getElementById('translationResult');
const combineButton = document.getElementById('combineButton');

// 翻译相关变量和函数
let translations = {}; // 用于存储加载的翻译
let currentLanguage = 'zh-CN'; // 默认语言

// 加载特定语言的翻译
async function loadTranslation(lang) {
    try {
        const response = await fetch(`/static/lang/${lang}.json`);
        if (!response.ok) {
            throw new Error(`无法加载语言 ${lang}: ${response.status}`);
        }
        const data = await response.json();
        translations[lang] = data;
        return data;
    } catch (error) {
        console.error(`加载语言资源出错 ${lang}:`, error);
        return null;
    }
}

// 切换语言函数
async function changeLanguage(lang) {
    // 检查是否已加载此语言
    if (!translations[lang]) {
        // 尝试加载语言文件
        const loaded = await loadTranslation(lang);
        if (!loaded) {
            alert(`无法加载语言: ${lang}`);
            return;
        }
    }
    
    currentLanguage = lang;
    updateAllTexts();
    // 记住用户选择的语言
    localStorage.setItem('preferredLanguage', lang);
}

// 获取翻译文本的辅助函数
function t(key) {
    if (!translations[currentLanguage]) return key;
    
    // 处理嵌套对象的情况，如 "languages.English"
    if (key.includes('.')) {
        const parts = key.split('.');
        let result = translations[currentLanguage];
        
        for (const part of parts) {
            if (result && result[part]) {
                result = result[part];
            } else {
                return key;
            }
        }
        
        return result;
    }
    
    // 普通键的情况
    return translations[currentLanguage][key] || key;
}

// 更新页面上所有文本
function updateAllTexts() {
    // 更新标题
    document.getElementById('appTitle').textContent = t('appTitle');
    document.title = t('appTitle');
    
    // 更新输入框占位符
    messageInput.placeholder = t('inputPlaceholder');
    
    // 更新按钮文本
    sendButton.textContent = t('sendButton');
    translateButton.textContent = t('translateButton');
    combineButton.textContent = t('combineButton');
    
    // 更新标签
    document.getElementById('targetLanguageLabel').textContent = t('targetLanguageLabel');
    
    // 更新目标语言选项
    const targetLanguageSelect = document.getElementById('targetLanguage');
    const options = targetLanguageSelect.querySelectorAll('option');
    
    options.forEach(option => {
        const langKey = option.getAttribute('data-lang-key');
        if (langKey && translations[currentLanguage] && 
            translations[currentLanguage].languages && 
            translations[currentLanguage].languages[langKey]) {
            option.textContent = translations[currentLanguage].languages[langKey];
        }
    });
    
    // 更新翻译结果占位符
    if (translationResult.value === '') {
        translationResult.placeholder = t('translationPlaceholder');
    }
    
    // 更新字符计数
    updateCharCount();
}

// 事件监听器
sendButton.addEventListener('click', sendMessage);
translateButton.addEventListener('click', translateMessage);
combineButton.addEventListener('click', combineAndSend);
messageInput.addEventListener('keydown', handleKeyPress);

// 处理回车键按下事件
function handleKeyPress(event) {
    if (event.keyCode === 13) { // 检测到回车键按下
        sendMessage(); // 调用发送消息的逻辑函数
    }
}

// 发送消息函数
function sendMessage() {
    const message = messageInput.value;
    if (!message.trim()) return;  // 不发送空消息
    
    addMessage(message, 'user');
    
    // 发送消息给后端
    const params = new URLSearchParams();
    params.append('message', message);
    params.append('typing', "0");
    fetch('/', {
        method: 'POST',
        body: params
    });
    
    var charCountElement = document.getElementById("charCount");
    charCountElement.textContent = "0" + t('charCount');
    
    // 暂时禁用输入
    setTimeout(function(){
        sendButton.disabled = true; // 禁用发送按钮
        messageInput.disabled = true; // 禁用文本框
    }, 10); //延迟0.1秒

    // 1秒后重新启用输入
    setTimeout(function() {
        messageInput.value = ""; //清空文本框内容
        sendButton.disabled = false; // 启用发送按钮
        messageInput.disabled = false; // 启用文本框
    }, 1000);
}

// 打字状态变量和函数
let canSendRequest = true; // 声明一个标志变量，初始状态可以发送请求

function updateCharCount() {
    var messageInput = document.getElementById("messageInput");           
    var charCountElement = document.getElementById("charCount");
    
    charCountElement.textContent = messageInput.value.length + t('charCount');

    if (canSendRequest) {
        // 发送请求
        const params = new URLSearchParams();
        params.append('typing', "1");
        fetch('/', {
            method: 'POST',
            body: params
        });
        canSendRequest = false; // 设置标志变量为 false，表示正在等待 1 秒的间隔
        setTimeout(() => {
            canSendRequest = true; // 1 秒后将标志变量置为 true，表示可以再次发送请求
        }, 1000); // 设置延迟为 1 秒（1000 毫秒）
    }
}

// 翻译消息函数
function translateMessage() {
    const message = messageInput.value.trim();
    if (!message) {
        alert(t('emptyMessage'));
        return;
    }
    
    translationResult.value = t('translating');
    
    // 获取选择的目标语言
    const targetLanguage = document.getElementById('targetLanguage').value;
    
    // 发送翻译请求到后端，包含目标语言
    const params = new URLSearchParams();
    params.append('translate', message);
    params.append('target_language', targetLanguage);
    
    fetch('/', {
        method: 'POST',
        body: params
    })
    .then(response => response.text())
    .then(result => {
        translationResult.value = result;
    })
    .catch(error => {
        translationResult.value = t('translationFailed');
        console.error('翻译出错:', error);
    });
}

// 组合并发送函数
function combineAndSend() {
    const originalMessage = messageInput.value.trim();
    const translatedMessage = translationResult.value.trim();
    
    if (!originalMessage || !translatedMessage) {
        alert(t('emptyTranslation'));
        return;
    }
    
    // 组合消息格式为: 原消息（翻译后消息）
    const combinedMessage = `${originalMessage} (${translatedMessage})`;
    
    // 将组合后的消息放入输入框
    messageInput.value = combinedMessage;
    
    // 发送组合后的消息
    sendMessage();
    
    // 只清空翻译结果
    translationResult.value = '';
}

// 改进滚动到底部的函数
function scrollToBottom() {
    const chatBody = document.getElementById('chatBody');
    chatBody.scrollTop = chatBody.scrollHeight;
}

// 在添加消息的函数中使用
function addMessage(message, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.classList.add(sender + '-message');
    const messageText = document.createElement('span');
    messageText.classList.add('message-text');
    messageText.innerHTML = message;
    messageDiv.appendChild(messageText);
    chatBody.appendChild(messageDiv);
    
    // 确保滚动到底部
    setTimeout(scrollToBottom, 50); // 短暂延迟确保DOM更新
}

// 页面初始化时加载语言
async function initializeLanguage() {
    // 尝试从localStorage加载保存的语言偏好
    const savedLanguage = localStorage.getItem('preferredLanguage') || 'zh-CN';
    
    // 先加载默认语言
    await loadTranslation(savedLanguage);
    
    // 设置当前语言
    currentLanguage = savedLanguage;
    if (document.getElementById('interfaceLanguage')) {
        document.getElementById('interfaceLanguage').value = savedLanguage;
    }
    
    // 应用当前语言
    updateAllTexts();
}

// DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', function() {
    // DOM元素可能还未加载，在DOMContentLoaded事件中重新获取引用
    const elementsToLoad = [
        'chatBody', 'messageInput', 'sendButton', 'translateButton',
        'translationContainer', 'translationResult', 'combineButton'
    ];
    
    elementsToLoad.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            window[id] = element;
        } else {
            console.error(`Element with ID "${id}" not found`);
        }
    });
    
    // 初始化语言
    initializeLanguage();
});

// 添加窗口大小变化监听，确保滚动条正确显示
window.addEventListener('resize', function() {
    scrollToBottom();
});

// 添加到main.js中
function adjustChatBodyHeight() {
    const chatBody = document.getElementById('chatBody');
    const chatHeader = document.querySelector('.chat-header');
    const chatFooter = document.querySelector('.chat-footer');
    
    // 计算聊天区域应该的高度
    const headerHeight = chatHeader.offsetHeight;
    const footerHeight = chatFooter.offsetHeight;
    const windowHeight = window.innerHeight;
    
    // 设置聊天区域高度
    chatBody.style.top = headerHeight + 'px';
    chatBody.style.bottom = footerHeight + 'px';
    
    // 确保滚动到底部
    scrollToBottom();
}

// 在页面加载和窗口大小变化时调整高度
document.addEventListener('DOMContentLoaded', adjustChatBodyHeight);
window.addEventListener('resize', adjustChatBodyHeight);

// 每当翻译区域显示/隐藏时也调整高度
// 可以添加这个逻辑到相关函数中
