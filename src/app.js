import { callModelAPI, models, fetchAvailableModels, updateAPIConfig, testAPIConfig } from './services/api.js';

// 聊天历史记录
let chatHistory = {
    model1: [],
    model2: [],
    model3: []
};

// 历史对话列表
let conversationHistory = [];

// 当前对话ID
let currentConversationId = generateId();

// 系统消息（现在可以通过UI修改）
let systemMessage = {
    role: "system",
    content: "你是一个有用的AI助手。"
};

// 参数设置（现在可以通过UI修改）
let temperature = 0.7;
let maxTokens = 2048;

// 当前选择的模型
let selectedModels = {
    model1: "qwen-turbo",
    model2: "llama2-7b",
    model3: "chatglm-turbo"
};

// DOM元素
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const model1Messages = document.getElementById('model1-messages');
const model2Messages = document.getElementById('model2-messages');
const model3Messages = document.getElementById('model3-messages');
const model1Select = document.getElementById('model1-select');
const model2Select = document.getElementById('model2-select');
const model3Select = document.getElementById('model3-select');
const temperatureSlider = document.getElementById('temperature-slider');
const temperatureValue = document.getElementById('temperature-value');
const maxTokensInput = document.getElementById('max-tokens-input');
const maxTokensValue = document.getElementById('max-tokens-value');
const systemMessageInput = document.getElementById('system-message');
const newConversationBtn = document.getElementById('new-conversation-btn');
const historyBtn = document.getElementById('history-btn');
const historyList = document.getElementById('history-list');
const apiConfigBtn = document.getElementById('api-config-btn');
const apiConfigModal = document.getElementById('api-config-modal');
const closeModalBtn = document.querySelector('.close');
const saveApiConfigBtn = document.getElementById('save-api-config');
const apiBaseUrlInput = document.getElementById('api-base-url');
const apiKeyInput = document.getElementById('api-key');

// 初始化模型选择下拉框
async function initModelSelects() {
    try {
        // 显示加载状态
        [model1Select, model2Select, model3Select].forEach(select => {
            select.disabled = true;
            select.innerHTML = '';
            const option = document.createElement('option');
            option.textContent = "加载中...";
            select.appendChild(option);
        });
        
        // 从API获取可用模型列表
        await fetchAvailableModels();
        
        // 确保模型列表不为空
        if (!models || models.length === 0) {
            models = [
                { id: "qwen-turbo", name: "通义千问-Turbo", type: "model" },
                { id: "llama2-7b", name: "Llama2-7B", type: "model" },
                { id: "chatglm-turbo", name: "ChatGLM-Turbo", type: "model" }
            ];
        }
        
        // 过滤出类型为"model"的模型
        const modelOptions = models.filter(model => model.type === "model");
        
        // 清空下拉框
        [model1Select, model2Select, model3Select].forEach(select => {
            select.innerHTML = '';
            select.disabled = false;
        });
        
        // 为每个下拉框添加选项
        [model1Select, model2Select, model3Select].forEach((select, index) => {
            const modelId = `model${index + 1}`;
            
            if (modelOptions.length === 0) {
                // 如果没有可用模型，添加一个提示选项
                const option = document.createElement('option');
                option.value = "";
                option.textContent = "无可用模型";
                select.appendChild(option);
                return;
            }
            
            modelOptions.forEach(model => {
                const option = document.createElement('option');
                option.value = model.id;
                option.textContent = model.name;
                select.appendChild(option);
            });
            
            // 根据模型数量设置默认选择的模型
            // 如果模型数量大于等于3个，每个对话框分别使用第1、2、3个模型
            // 如果模型数量少于3个，后面的重复使用前面的模型
            let defaultModelIndex = 0;
            if (modelOptions.length >= 3) {
                defaultModelIndex = index % modelOptions.length; // 0, 1, 2
            } else {
                defaultModelIndex = index % modelOptions.length; // 循环使用可用模型
            }
            
            // 如果当前选择的模型不在列表中，则使用默认模型
            if (!modelOptions.some(model => model.id === selectedModels[modelId])) {
                selectedModels[modelId] = modelOptions[defaultModelIndex].id;
            }
            
            // 设置默认选中的模型
            select.value = selectedModels[modelId];
            
            // 更新对话框标题为所选模型名称
            const selectedOption = select.options[select.selectedIndex];
            const modelName = selectedOption.textContent;
            const chatHeader = document.querySelector(`#${modelId}-window .chat-header`);
            if (chatHeader) {
                chatHeader.textContent = modelName;
            }
            
            // 添加变更事件监听器
            select.addEventListener('change', () => {
                selectedModels[modelId] = select.value;
                
                // 更新对话框标题为所选模型名称
                const selectedOption = select.options[select.selectedIndex];
                const modelName = selectedOption.textContent;
                const chatHeader = document.querySelector(`#${modelId}-window .chat-header`);
                if (chatHeader) {
                    chatHeader.textContent = modelName;
                }
            });
        });
    } catch (error) {
        console.error("初始化模型选择失败:", error);
        
        // 显示错误状态并使用默认模型
        const defaultModels = [
            { id: "qwen-turbo", name: "通义千问-Turbo", type: "model" },
            { id: "llama2-7b", name: "Llama2-7B", type: "model" },
            { id: "chatglm-turbo", name: "ChatGLM-Turbo", type: "model" }
        ];
        
        [model1Select, model2Select, model3Select].forEach((select, index) => {
            const modelId = `model${index + 1}`;
            
            select.innerHTML = '';
            select.disabled = false;
            
            defaultModels.forEach(model => {
                const option = document.createElement('option');
                option.value = model.id;
                option.textContent = `${model.name} (默认)`;
                select.appendChild(option);
            });
            
            // 设置默认选中的模型
            selectedModels[modelId] = defaultModels[index % defaultModels.length].id;
            select.value = selectedModels[modelId];
            
            // 添加变更事件监听器
            select.addEventListener('change', () => {
                selectedModels[modelId] = select.value;
            });
        });
    }
}

// 事件监听器
sendButton.addEventListener('click', handleSendMessage);
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
    }
});

// Temperature滑块事件监听器
temperatureSlider.addEventListener('input', () => {
    temperature = parseFloat(temperatureSlider.value);
    temperatureValue.textContent = temperature.toFixed(1);
});

// Max Tokens输入框事件监听器
maxTokensInput.addEventListener('change', () => {
    maxTokens = parseInt(maxTokensInput.value);
    maxTokensValue.textContent = maxTokens;
});

// 添加增减按钮事件监听器
document.getElementById('max-tokens-increase').addEventListener('click', () => {
    maxTokens = maxTokens * 2;
    if (maxTokens > 32000) maxTokens = 32000; // 设置上限
    maxTokensInput.value = maxTokens;
    maxTokensValue.textContent = maxTokens;
});

document.getElementById('max-tokens-decrease').addEventListener('click', () => {
    maxTokens = Math.floor(maxTokens / 2);
    if (maxTokens < 100) maxTokens = 100; // 设置下限
    maxTokensInput.value = maxTokens;
    maxTokensValue.textContent = maxTokens;
});

// System Message输入框事件监听器
systemMessageInput.addEventListener('input', () => {
    systemMessage.content = systemMessageInput.value.trim() || "你是一个有用的AI助手。";
});

// 处理发送消息
async function handleSendMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    
    // 清空输入框
    userInput.value = '';
    
    // 添加用户消息到所有聊天窗口
    const userMessageObj = { role: "user", content: message };
    addMessageToUI('model1', userMessageObj);
    addMessageToUI('model2', userMessageObj);
    addMessageToUI('model3', userMessageObj);
    
    // 更新聊天历史
    chatHistory.model1.push(userMessageObj);
    chatHistory.model2.push(userMessageObj);
    chatHistory.model3.push(userMessageObj);
    
    // 显示加载状态
    showLoading('model1');
    showLoading('model2');
    showLoading('model3');
    
    // 调用API并处理响应
    try {
        // 并行调用所有API
        const [model1Response, model2Response, model3Response] = await Promise.all([
            callModelAPI(selectedModels.model1, [systemMessage, ...chatHistory.model1], temperature, maxTokens),
            callModelAPI(selectedModels.model2, [systemMessage, ...chatHistory.model2], temperature, maxTokens),
            callModelAPI(selectedModels.model3, [systemMessage, ...chatHistory.model3], temperature, maxTokens)
        ]);
        
        // 移除加载状态
        removeLoading('model1');
        removeLoading('model2');
        removeLoading('model3');
        
        // 添加响应到UI和历史记录
        addMessageToUI('model1', model1Response);
        addMessageToUI('model2', model2Response);
        addMessageToUI('model3', model3Response);
        
        chatHistory.model1.push(model1Response);
        chatHistory.model2.push(model2Response);
        chatHistory.model3.push(model3Response);
        
        // 保存当前对话到历史记录
        saveCurrentConversation();
        
    } catch (error) {
        console.error('API调用出错:', error);
        
        // 移除加载状态
        removeLoading('model1');
        removeLoading('model2');
        removeLoading('model3');
        
        // 显示错误消息
        const errorMessage = { role: "system", content: "抱歉，发生了错误，请重试。" };
        addMessageToUI('model1', errorMessage);
        addMessageToUI('model2', errorMessage);
        addMessageToUI('model3', errorMessage);
    }
}

// 添加消息到UI
function addMessageToUI(modelId, message) {
    const messagesContainer = document.getElementById(`${modelId}-messages`);
    const messageElement = document.createElement('div');
    
    // 根据消息类型设置样式
    if (message.role === 'user') {
        messageElement.className = 'message user-message';
    } else if (message.role === 'assistant') {
        messageElement.className = 'message bot-message';
    } else if (message.role === 'system') {
        messageElement.className = 'message system-message';
    }
    
    messageElement.textContent = message.content;
    messagesContainer.appendChild(messageElement);
    
    // 滚动到底部
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 显示加载状态
function showLoading(modelId) {
    const messagesContainer = document.getElementById(`${modelId}-messages`);
    const loadingElement = document.createElement('div');
    loadingElement.className = 'loading';
    loadingElement.id = `${modelId}-loading`;
    
    const loadingDots = document.createElement('div');
    loadingDots.className = 'loading-dots';
    
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('span');
        loadingDots.appendChild(dot);
    }
    
    loadingElement.appendChild(loadingDots);
    messagesContainer.appendChild(loadingElement);
    
    // 滚动到底部
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 移除加载状态
function removeLoading(modelId) {
    const loadingElement = document.getElementById(`${modelId}-loading`);
    if (loadingElement) {
        loadingElement.remove();
    }
}

// 初始化欢迎消息
function initWelcomeMessages() {
    const welcomeMessage = { 
        role: "system", 
        content: "欢迎使用大模型对话对比工具。请在下方输入您的问题，三个模型将同时回答。" 
    };
    
    addMessageToUI('model1', welcomeMessage);
    addMessageToUI('model2', welcomeMessage);
    addMessageToUI('model3', welcomeMessage);
}

// 生成唯一ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 保存当前对话到历史记录
function saveCurrentConversation() {
    if (chatHistory.model1.length === 0) return; // 不保存空对话
    
    // 获取第一条用户消息作为标题
    const firstUserMessage = chatHistory.model1.find(msg => msg.role === 'user');
    const title = firstUserMessage ? 
        (firstUserMessage.content.length > 30 ? 
            firstUserMessage.content.substring(0, 30) + '...' : 
            firstUserMessage.content) : 
        '新对话';
    
    // 创建对话记录对象
    const conversation = {
        id: currentConversationId,
        title: title,
        date: new Date().toLocaleString(),
        chatHistory: JSON.parse(JSON.stringify(chatHistory)),
        systemMessage: JSON.parse(JSON.stringify(systemMessage)),
        temperature: temperature,
        maxTokens: maxTokens,
        selectedModels: JSON.parse(JSON.stringify(selectedModels))
    };
    
    // 检查是否已存在相同ID的对话，如果存在则更新
    const existingIndex = conversationHistory.findIndex(conv => conv.id === currentConversationId);
    if (existingIndex !== -1) {
        conversationHistory[existingIndex] = conversation;
    } else {
        // 添加到历史记录列表
        conversationHistory.unshift(conversation);
    }
    
    // 限制历史记录数量
    if (conversationHistory.length > 20) {
        conversationHistory.pop();
    }
    
    // 保存到本地存储
    localStorage.setItem('conversationHistory', JSON.stringify(conversationHistory));
    
    // 更新历史记录UI
    updateHistoryList();
}

// 更新历史记录列表UI
function updateHistoryList() {
    historyList.innerHTML = '';
    
    if (conversationHistory.length === 0) {
        const emptyItem = document.createElement('div');
        emptyItem.className = 'history-item';
        emptyItem.textContent = '暂无历史记录';
        historyList.appendChild(emptyItem);
        return;
    }
    
    conversationHistory.forEach(conversation => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.dataset.id = conversation.id;
        
        const titleElement = document.createElement('div');
        titleElement.className = 'history-item-title';
        titleElement.textContent = conversation.title;
        
        const dateElement = document.createElement('div');
        dateElement.className = 'history-item-date';
        dateElement.textContent = conversation.date;
        
        historyItem.appendChild(titleElement);
        historyItem.appendChild(dateElement);
        
        historyItem.addEventListener('click', () => {
            loadConversation(conversation);
            historyList.classList.remove('show');
        });
        
        historyList.appendChild(historyItem);
    });
}

// 加载历史对话
function loadConversation(conversation) {
    // 更新当前对话ID
    currentConversationId = conversation.id;
    
    // 恢复聊天历史
    chatHistory = JSON.parse(JSON.stringify(conversation.chatHistory));
    
    // 恢复系统消息
    systemMessage = JSON.parse(JSON.stringify(conversation.systemMessage));
    systemMessageInput.value = systemMessage.content;
    
    // 恢复温度设置
    temperature = conversation.temperature;
    temperatureSlider.value = temperature;
    temperatureValue.textContent = temperature.toFixed(1);
    
    // 恢复max_tokens设置
    maxTokens = conversation.maxTokens || 4096; // 兼容旧版本保存的对话
    maxTokensInput.value = maxTokens;
    maxTokensValue.textContent = maxTokens;
    
    // 恢复选择的模型
    selectedModels = JSON.parse(JSON.stringify(conversation.selectedModels));
    model1Select.value = selectedModels.model1;
    model2Select.value = selectedModels.model2;
    model3Select.value = selectedModels.model3;
    
    // 更新对话框标题为所选模型名称
    ['model1', 'model2', 'model3'].forEach((modelId, index) => {
        const select = document.getElementById(`${modelId}-select`);
        const selectedOption = select.options[select.selectedIndex];
        const modelName = selectedOption.textContent;
        const chatHeader = document.querySelector(`#${modelId}-window .chat-header`);
        if (chatHeader) {
            chatHeader.textContent = modelName;
        }
    });
    
    // 清空并重新显示消息
    model1Messages.innerHTML = '';
    model2Messages.innerHTML = '';
    model3Messages.innerHTML = '';
    
    // 显示所有消息
    chatHistory.model1.forEach(message => addMessageToUI('model1', message));
    chatHistory.model2.forEach(message => addMessageToUI('model2', message));
    chatHistory.model3.forEach(message => addMessageToUI('model3', message));
}

// 创建新对话
function createNewConversation() {
    // 保存当前对话
    saveCurrentConversation();
    
    // 生成新的对话ID
    currentConversationId = generateId();
    
    // 清空聊天历史
    chatHistory = {
        model1: [],
        model2: [],
        model3: []
    };
    
    // 清空消息显示
    model1Messages.innerHTML = '';
    model2Messages.innerHTML = '';
    model3Messages.innerHTML = '';
    
    // 显示欢迎消息
    initWelcomeMessages();
}

// API配置弹窗相关事件处理
// 打开API配置弹窗
apiConfigBtn.addEventListener('click', () => {
    // 从本地存储加载当前配置
    apiBaseUrlInput.value = localStorage.getItem('api_base_url') || "https://dashscope.aliyuncs.com/compatible-mode/v1";
    apiKeyInput.value = localStorage.getItem('api_key') || "";
    apiConfigModal.style.display = 'block';
});

// 关闭API配置弹窗
closeModalBtn.addEventListener('click', () => {
    apiConfigModal.style.display = 'none';
});

// 点击弹窗外部关闭弹窗
window.addEventListener('click', (event) => {
    if (event.target === apiConfigModal) {
        apiConfigModal.style.display = 'none';
    }
});

// 保存API配置
saveApiConfigBtn.addEventListener('click', async () => {
    const baseUrl = apiBaseUrlInput.value.trim();
    const apiKey = apiKeyInput.value.trim();
    
    if (!baseUrl || !apiKey) {
        alert('请输入有效的API Base URL和API Key');
        return;
    }
    
    try {
        // 显示加载状态
        saveApiConfigBtn.textContent = '验证中...';
        saveApiConfigBtn.disabled = true;
        
        // 先尝试使用新配置获取模型列表，但不保存配置
        const testResult = await testAPIConfig(baseUrl, apiKey);
        
        if (!testResult.success) {
            alert(`API配置验证失败: ${testResult.message}`);
            return;
        }
        
        if (!testResult.models || testResult.models.length === 0) {
            alert('无法获取模型列表，请检查API配置是否正确');
            return;
        }
        
        // 验证成功后，更新API配置
        await updateAPIConfig(baseUrl, apiKey);
        
        // 重新初始化模型选择下拉框
        await initModelSelects();
        
        // 关闭弹窗
        apiConfigModal.style.display = 'none';
    } catch (error) {
        console.error('保存API配置失败:', error);
        alert(`保存API配置失败: ${error.message}`);
    } finally {
        saveApiConfigBtn.textContent = '保存配置';
        saveApiConfigBtn.disabled = false;
    }
});

// 检查API配置是否已设置
function checkApiConfig() {
    const baseUrl = localStorage.getItem('api_base_url');
    const apiKey = localStorage.getItem('api_key');
    
    if (!baseUrl || !apiKey) {
        // 如果API配置未设置，显示提示消息并打开配置弹窗
        const configMessage = { 
            role: "system", 
            content: "请先配置API，点击右上角的\"配置API\"按钮进行设置。"
        };
        
        addMessageToUI('model1', configMessage);
        addMessageToUI('model2', configMessage);
        addMessageToUI('model3', configMessage);
        
        // 自动打开API配置弹窗
        setTimeout(() => {
            apiConfigBtn.click();
        }, 500);
        
        return false;
    }
    
    return true;
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', async () => {
    // 初始化欢迎消息
    initWelcomeMessages();
    
    // 检查API配置
    const apiConfigured = checkApiConfig();
    
    // 初始化模型选择下拉框
    if (apiConfigured) {
        await initModelSelects();
    }
    
    // 初始化温度滑块
    temperatureSlider.value = temperature;
    temperatureValue.textContent = temperature.toFixed(1);
    
    // 初始化max_tokens输入框
    maxTokensInput.value = maxTokens;
    maxTokensValue.textContent = maxTokens;
    
    // 初始化系统消息输入框
    systemMessageInput.value = systemMessage.content;
    
    // 从本地存储加载历史记录
    const savedHistory = localStorage.getItem('conversationHistory');
    if (savedHistory) {
        try {
            conversationHistory = JSON.parse(savedHistory);
            updateHistoryList();
        } catch (error) {
            console.error('加载历史记录失败:', error);
            conversationHistory = [];
        }
    }
    
    // 添加历史按钮点击事件
    historyBtn.addEventListener('click', () => {
        historyList.classList.toggle('show');
    });
    
    // 添加新建对话按钮点击事件
    newConversationBtn.addEventListener('click', createNewConversation);
    
    // 点击页面其他地方关闭历史记录列表
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.history-dropdown') && 
            !event.target.closest('#history-btn')) {
            historyList.classList.remove('show');
        }
    });
});