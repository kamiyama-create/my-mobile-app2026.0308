export const CATEGORIES = ['飲食', '交通', '備品', 'その他'] as const;
export const DEFAULT_CATEGORY = 'その他';

export const GAS_URL = (process.env.VITE_GAS_URL || (import.meta as any).env?.VITE_GAS_URL || 'https://script.google.com/macros/s/AKfycbyMw46jaXii5QCGsAlK9_O4kbFXyVeUvJ_mjWmf3Fl_0BDEgFE0OW1JMEDnsgNo2XSa/exec').trim();
export const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY || '').trim();

export const RECEIPT_TYPES = {
  advance: '立替金',
  deposit: '預かり金'
} as const;

export const COLORS = {
  PRIMARY: '#003366', // サブスクカート風ネイビー
  SECONDARY: '#FF9900', // サブスクカート風オレンジ
  ACCENT: '#00A0E9', // 爽やかなスカイブルー
  BG: '#F8F9FA', // 清潔感のある背景
  WHITE: '#FFFFFF',
};

export const IMAGE_CONFIG = {
  MAX_SIDE: 2400, // 長いレシートでも文字が潰れないよう、さらに高解像度化
  QUALITY: 0.85,
};

export const AI_CONFIG = {
  MODEL_NAME: 'gemini-3-flash-preview', // 最新の推奨モデルに変更
  SYSTEM_INSTRUCTION: `Analyze the receipt image and extract the following information in JSON format:
- date: The date of the receipt (YYYY-MM-DD). If not found, use "2026-03-09".
- store_name: The name of the store or issuer. If not found, use "不明".
- amount: The total amount as a number. If not found, use 0.
- type: Either "advance" (reimbursement) or "deposit" (refund/income). Default to "advance".
- category: One of "飲食", "交通", "備品", "その他". Default to "その他".
- note: A brief note about the items purchased.

Return ONLY the JSON object.`,
};
