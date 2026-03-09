import { GoogleGenAI, Type } from "@google/genai";
import { AI_CONFIG, GEMINI_API_KEY } from "../constants";
import { ReceiptData } from "../types";

export const analyzeReceiptImage = async (base64Data: string, mimeType: string, apiKey: string): Promise<Partial<ReceiptData>> => {
  console.log('--- Gemini Analysis Start ---');
  console.log('MimeType:', mimeType);
  console.log('Base64 length:', base64Data.length);

  if (!apiKey) {
    console.error('【設定エラー】APIキーが渡されていません。');
    throw new Error('APIキーが設定されていません。');
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
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
            date: { type: Type.STRING },
            store_name: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            type: { type: Type.STRING },
            category: { type: Type.STRING },
            note: { type: Type.STRING },
          }
        }
      }
    });

    console.log('Gemini raw response:', response);

    if (!response.text) {
      console.error('Gemini response text is empty');
      throw new Error('AIからの応答が空でした');
    }

    const parsed = JSON.parse(response.text);
    console.log('Gemini parsed result:', parsed);
    console.log('--- Gemini Analysis End ---');
    return parsed;
  } catch (error) {
    console.error('--- Gemini Analysis Error ---');
    console.error('Error details:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack:', error.stack);
    }
    throw error;
  }
};
