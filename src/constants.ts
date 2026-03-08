export const CATEGORIES = ['飲食', '交通', '備品', 'その他'] as const;
export const DEFAULT_CATEGORY = 'その他';

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
  MAX_SIDE: 1200, // 解析エラーを防ぐため、少しサイズを落として安定性を向上
  QUALITY: 0.8,
};

export const AI_CONFIG = {
  MODEL_NAME: 'gemini-3.1-pro-preview',
  SYSTEM_INSTRUCTION: `レシートまたは領収書の画像を解析して、以下の情報を抽出してください。
- 日付 (YYYY-MM-DD形式)
- 店舗名 (または発行元)
- 合計金額 (数値のみ)
- type (「advance」(立替金) または 「deposit」(預かり金) から選択。通常の買い物はadvance、返金や入金はdeposit)
- カテゴリー (「飲食」「交通」「備品」「その他」から選択)
- 備考 (購入した主要な商品名など)

【重要】
- 文字が不鮮明な場合は、周囲の文脈から推測してください。
- 金額がどうしても不明な場合は 0 を返してください。
- 日付が不明な場合は、今日の日付（2026-03-08）を返してください。
- 店舗名が不明な場合は「不明」と返してください。
- 決してエラーで中断せず、必ず指定されたJSON形式で結果を返してください。`,
};
