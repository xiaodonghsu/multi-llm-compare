// 大模型API调用服务

// API配置
let API_BASE_URL = localStorage.getItem('api_base_url') || "";
let API_KEY = localStorage.getItem('api_key') || "";

// 默认模型列表（在API获取失败时使用）
const defaultModels = [
    { id: "qwen-turbo", name: "通义千问-Turbo", type: "model" },
    { id: "llama2-7b", name: "Llama2-7B", type: "model" },
    { id: "chatglm-turbo", name: "ChatGLM-Turbo", type: "model" }
];

// 存储获取到的模型列表
export let models = [...defaultModels];

// 测试API配置是否有效
export async function testAPIConfig(baseUrl, apiKey) {
    try {
        const response = await fetch(`${baseUrl}/models`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${apiKey}`
            }
        });

        if (!response.ok) {
            return {
                success: false,
                message: `获取模型列表失败: ${response.statusText}`
            };
        }

        const data = await response.json();
        
        // 处理API返回的模型数据
        if (data && data.data) {
            // 提取模型信息并格式化
            const apiModels = data.data.map(model => ({
                id: model.id,
                name: model.id.split('/').pop() || model.id, // 从ID中提取名称，或使用完整ID
                type: "model"
            }));
            
            return {
                success: true,
                models: apiModels
            };
        } else {
            return {
                success: false,
                message: "API返回的数据格式不正确"
            };
        }
    } catch (error) {
        console.error("测试API配置失败:", error);
        return {
            success: false,
            message: error.message || "网络请求失败"
        };
    }
}

// 更新API配置
export function updateAPIConfig(baseUrl, apiKey) {
    API_BASE_URL = baseUrl;
    API_KEY = apiKey;
    
    // 保存到本地存储
    localStorage.setItem('api_base_url', baseUrl);
    localStorage.setItem('api_key', apiKey);
    
    // 重新获取模型列表
    return fetchAvailableModels();
}

// 从API获取可用模型列表
export async function fetchAvailableModels() {
    try {
        const response = await fetch(`${API_BASE_URL}/models`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${API_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error(`获取模型列表失败: ${response.statusText}`);
        }

        const data = await response.json();
        
        // 处理API返回的模型数据
        if (data && data.data) {
            // 提取模型信息并格式化
            const apiModels = data.data.map(model => ({
                id: model.id,
                name: model.id.split('/').pop() || model.id, // 从ID中提取名称，或使用完整ID
                type: "model"
            }));
            
            // 更新模型列表
            if (apiModels.length > 0) {
                models = apiModels;
            } else {
                models = [...defaultModels];
            }
        } else {
            models = [...defaultModels];
        }
    } catch (error) {
        console.error("获取模型列表失败:", error);
        console.log("使用默认模型列表");
        models = [...defaultModels];
    }
    
    return models;
}

// 调用大模型API
export async function callModelAPI(modelId, messages, temperature = 0.7, max_tokens = 4096) {
    try {
        const response = await fetch(`${API_BASE_URL}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: modelId,
                messages: messages,
                temperature: temperature,
                max_tokens: max_tokens,
                enable_thinking: false
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage;
            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.error?.message || response.statusText;
            } catch (e) {
                errorMessage = errorText || response.statusText;
            }
            throw new Error(`API错误: ${errorMessage}`);
        }

        const data = await response.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error("API返回的数据格式不正确");
        }
        
        return data.choices[0].message;
    } catch (error) {
        console.error("API调用失败:", error);
        return {
            role: "assistant",
            content: `调用模型 ${modelId} 时出错: ${error.message}`
        };
    }
}