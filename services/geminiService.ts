import { GeneratedRecipeResponse } from "../types";

export const generateRecipeFromIdea = async (idea: string): Promise<GeneratedRecipeResponse | null> => {
  // 注意：在 Vercel 生产环境下，环境变量名为 DEEPSEEK_API_KEY
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.API_KEY;

  if (!apiKey) {
    console.error("API Key is missing.");
    return null;
  }

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat", 
        messages: [
          {
            role: "system",
            content: `You are a professional chef. Always respond in JSON format.
            Requirements:
            1. Language: Chinese (Simplified).
            2. Category must be one of: "早餐", "正餐", "小食/甜点", "饮品", "其他".
            3. Generate 2-4 short tags.`
          },
          {
            role: "user",
            content: `Create a structured recipe for: "${idea}". 
            Return the result in this JSON structure:
            {
              "title": "string",
              "description": "string",
              "category": "string",
              "tags": ["string"],
              "ingredients": [{"name": "string", "amount": "string"}],
              "steps": ["string"]
            }`
          }
        ],
        // 强制要求输出 JSON 格式（DeepSeek 支持此参数）
        response_format: {
          type: 'json_object'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    if (content) {
      // DeepSeek 开启 json_object 模式后通常返回的是纯 JSON 字符串
      return JSON.parse(content) as GeneratedRecipeResponse;
    }
    return null;
  } catch (error) {
    console.error("DeepSeek generation error:", error);
    throw error;
  }
};
