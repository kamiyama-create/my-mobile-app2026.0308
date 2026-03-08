import { GoogleGenAI, Type } from "@google/genai";
import { AI_CONFIG, GEMINI_API_KEY } from "../constants";
import { ReceiptData } from "../types";

export const analyzeReceiptImage = async (base64Data: string, mimeType: string): Promise<Partial<ReceiptData>> => {
  if (!GEMINI_API_KEY) {
    console.error('【設定エラー】GEMINI_API_KEY が定義されていません。src/constants.ts を確認してください。');
    throw new Error('GEMINI_API_KEY が設定されていません。');
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: AI_CONFIG.MODEL_NAME,
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType } },
        { text: AI_CONFIG.SYSTEM_INSTRUCTION }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          date: { type: Type.STRING, description: "YYYY-MM-DD" },
          store_name: { type: Type.STRING },
          amount: { type: Type.NUMBER },
          category: { type: Type.STRING, enum: ["立替", "預かり金"] },
          note: { type: Type.STRING },
        }
      }
    }
  });

  if (!response.text) {
    throw new Error('AIからの応答が空でした');
  }

  return JSON.parse(response.text);
};
