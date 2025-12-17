import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedRecipeResponse } from "../types";

// Note: In a real production environment, this should be handled by a backend proxy 
// to protect the API key. For this demo/PWA, we use the env variable.
const apiKey = process.env.API_KEY || '';

export const generateRecipeFromIdea = async (idea: string): Promise<GeneratedRecipeResponse | null> => {
  if (!apiKey) {
    console.error("API Key is missing. Please ensure process.env.API_KEY is set.");
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a professional chef. Create a structured recipe based on this request: "${idea}". 
      
      Requirements:
      1. Return raw JSON only. Do not wrap in markdown code blocks.
      2. Language: Chinese (Simplified).
      3. Category must be one of: "早餐", "正餐", "小食/甜点", "饮品", "其他".
      4. '正餐' stands for Main Meal (Lunch/Dinner).
      5. Generate 2-4 short tags (e.g., '快手', '减脂', '下饭', '家常').
      
      JSON Structure:
      {
        "title": "Recipe Name",
        "description": "Short appetizing description",
        "category": "Category Name",
        "tags": ["tag1", "tag2"],
        "ingredients": [{"name": "item", "amount": "qty"}],
        "steps": ["step 1", "step 2"]
      }`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            category: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            ingredients: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  amount: { type: Type.STRING },
                }
              }
            },
            steps: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });

    let jsonStr = response.text || '';
    
    // Robust Cleaning logic: Remove Markdown code blocks (```json ... ```)
    jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
    
    if (jsonStr) {
      return JSON.parse(jsonStr) as GeneratedRecipeResponse;
    }
    return null;
  } catch (error) {
    console.error("Gemini generation error:", error);
    throw error;
  }
};