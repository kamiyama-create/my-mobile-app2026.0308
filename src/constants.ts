export const CATEGORIES = ['立替', '預かり金'] as const;

export const DEFAULT_CATEGORY = '立替';

export const IMAGE_CONFIG = {
  MAX_SIDE: 1600,
  QUALITY: 0.9,
};

export const AI_CONFIG = {
  MODEL_NAME: 'gemini-3.1-pro-preview',
  SYSTEM_INSTRUCTION: `レシートまたは領収書の画像を解析して、以下の情報を抽出してください。
- 日付 (YYYY-MM-DD形式)
- 店舗名 (または発行元)
- 合計金額 (数値のみ)
- カテゴリー (「立替」または「預かり金」から選択)
- 備考 (購入した主要な商品名など)

※文字が読み取りにくい場合でも、推測できる範囲で入力してください。どうしても不明な場合は、日付は今日の日付、店舗名は「不明」、金額は0、カテゴリーは「立替」をデフォルトとしてください。`,
};
