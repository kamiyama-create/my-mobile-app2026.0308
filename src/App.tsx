import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { 
  Camera, 
  Upload, 
  Send, 
  History, 
  Settings, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Trash2,
  Plus,
  Receipt,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types
interface ReceiptData {
  id: string;
  date: string;
  store_name: string;
  amount: number;
  category: '預かり金' | '立替';
  note: string;
  status: 'pending' | 'sent' | 'error';
  timestamp: number;
}

const STORAGE_KEY_HISTORY = 'receipt_history';
const STORAGE_KEY_GAS_URL = 'gas_endpoint_url';

// 画像をリサイズしてBase64を直接返す（高速化のため）
const getResizedBase64 = (file: File, maxSide: number, quality: number): Promise<{ base64: string; type: string }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxSide) {
          height *= maxSide / width;
          width = maxSide;
        }
      } else {
        if (height > maxSide) {
          width *= maxSide / height;
          height = maxSide;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      // 高品質なスケーリングを有効化
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
      }
      
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve({
        base64: dataUrl.split(',')[1],
        type: 'image/jpeg'
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('画像の読み込みに失敗しました'));
    };
    img.src = url;
  });
};

export default function App() {
  const [processingItems, setProcessingItems] = useState<string[]>([]); // IDs of items being analyzed
  const [isSending, setIsSending] = useState(false);
  const [history, setHistory] = useState<ReceiptData[]>([]);
  const [currentReceipt, setCurrentReceipt] = useState<Partial<ReceiptData> | null>(null);
  const [gasUrl, setGasUrl] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [capturedCount, setCapturedCount] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // Load history and settings
  useEffect(() => {
    const savedHistory = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (savedHistory) {
      const parsedHistory: ReceiptData[] = JSON.parse(savedHistory);
      // 3ヶ月（約90日）経過した履歴を削除
      const threeMonthsAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
      const filteredHistory = parsedHistory.filter(item => item.timestamp > threeMonthsAgo);
      setHistory(filteredHistory);
    }
    
    const savedUrl = localStorage.getItem(STORAGE_KEY_GAS_URL);
    if (savedUrl) setGasUrl(savedUrl);
  }, []);

  // Save history
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
  }, [history]);

  const saveGasUrl = (url: string) => {
    setGasUrl(url);
    localStorage.setItem(STORAGE_KEY_GAS_URL, url);
    setShowSettings(false);
    showToast('設定を保存しました', 'success');
  };

  const showToast = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    for (let i = 0; i < files.length; i++) {
      analyzeImage(files[i]);
    }
  };

  const analyzeImage = async (file: File) => {
    const processingId = crypto.randomUUID();
    setProcessingItems(prev => [...prev, processingId]);
    
    try {
      // 1. 画像処理の最適化: 1024pxに拡大して認識精度を向上
      const { base64: base64Data, type: mimeType } = await getResizedBase64(file, 1024, 0.7);

      // 2. モデルの変更: 安定性と速度のバランスが良い 'gemini-3-flash-preview' を使用
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType } },
            { text: `レシートまたは領収書を解析して、日付、店舗名、合計金額、カテゴリー、備考を抽出してください。
不明な項目がある場合は、空文字または0（金額の場合）を返してください。
カテゴリーは「立替」または「預かり金」のいずれかを選択してください。デフォルトは「立替」です。` }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING, description: "YYYY-MM-DD形式の日付" },
              store_name: { type: Type.STRING, description: "店舗名または発行元" },
              amount: { type: Type.NUMBER, description: "合計金額（数値のみ）" },
              category: { type: Type.STRING, enum: ["立替", "預かり金"], description: "費用の種類" },
              note: { type: Type.STRING, description: "補足情報（商品名など）" },
            },
            required: ["date", "store_name", "amount", "category", "note"]
          }
        }
      });

      if (!response.text) {
        throw new Error('Empty response from AI');
      }

      const result = JSON.parse(response.text);
      const newEntry: ReceiptData = {
        id: crypto.randomUUID(),
        date: result.date || new Date().toISOString().split('T')[0],
        store_name: result.store_name || '不明な店舗',
        amount: Number(result.amount) || 0,
        category: result.category || '立替',
        note: result.note || '',
        status: 'pending',
        timestamp: Date.now()
      };
      
      // 履歴に追加
      setHistory(prev => [newEntry, ...prev]);
      
      // 自動送信はせず、確認画面を表示する
      setCurrentReceipt(newEntry);
      
      showToast(`${newEntry.store_name}を解析しました。内容を確認して送信してください。`, 'success');
    } catch (error) {
      console.error('Analysis error:', error);
      // エラーメッセージをより詳細に
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      if (errorMessage.includes('API_KEY')) {
        showToast('APIキーの設定を確認してください。', 'error');
      } else {
        showToast('解析に失敗しました。画像が不鮮明な可能性があります。', 'error');
      }
    } finally {
      setProcessingItems(prev => prev.filter(id => id !== processingId));
    }
  };

  const sendToGas = async (data: ReceiptData, currentHistory?: ReceiptData[]) => {
    if (!gasUrl) {
      setShowSettings(true);
      showToast('GASのURLを設定してください', 'error');
      return;
    }

    const historyToSearch = currentHistory || history;

    // 重複チェック: 同じ日付、店舗名、金額で送信済みのものがあるか
    const isDuplicate = historyToSearch.some(item => 
      item.id !== data.id && // 自分自身は除外
      item.status === 'sent' && 
      item.date === data.date && 
      item.store_name === data.store_name && 
      item.amount === data.amount
    );

    if (isDuplicate) {
      showToast('同じレシートはスプレットシートに送らず既に登録しています', 'error');
      // 重複の場合はステータスを更新して、ユーザーに知らせる
      setHistory(prev => prev.map(item => 
        item.id === data.id ? { ...item, status: 'pending' as const, note: (item.note ? item.note + ' ' : '') + '(重複のため未送信)' } : item
      ));
      return;
    }

    setIsSending(true);
    try {
      await fetch(gasUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      setHistory(prev => prev.map(item => 
        item.id === data.id ? { ...item, status: 'sent' as const, timestamp: Date.now() } : item
      ));
      
      if (currentReceipt?.id === data.id) {
        setCurrentReceipt(null);
      }
      
      showToast('スプレッドシートに送信しました', 'success');
    } catch (error) {
      console.error('Send error:', error);
      showToast('送信に失敗しました', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const addToHistory = (data: Partial<ReceiptData>) => {
    const entryId = data.id || crypto.randomUUID();
    const isExisting = history.some(item => item.id === entryId);

    if (isExisting) {
      setHistory(prev => prev.map(item => 
        item.id === entryId ? { ...item, ...data as ReceiptData } : item
      ));
    } else {
      const newEntry: ReceiptData = {
        id: entryId,
        date: data.date || new Date().toISOString().split('T')[0],
        store_name: data.store_name || '不明な店舗',
        amount: data.amount || 0,
        category: data.category || '立替',
        note: data.note || '',
        status: 'pending',
        timestamp: Date.now()
      };
      setHistory([newEntry, ...history]);
    }
    setCurrentReceipt(null);
    showToast('保存しました', 'success');
  };

  const handleConfirmAndSend = async (data: ReceiptData) => {
    // まず履歴を最新の状態に更新
    setHistory(prev => prev.map(item => 
      item.id === data.id ? { ...data, status: item.status } : item
    ));
    // その後送信
    await sendToGas(data);
  };

  const deleteHistoryItem = (id: string) => {
    setHistory(history.filter(item => item.id !== id));
  };

  const startCamera = async () => {
    setIsCameraOpen(true);
    setCapturedCount(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 }
        } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      setIsCameraOpen(false);
      showToast('カメラの起動に失敗しました', 'error');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      // バイブレーション（Android/Chrome用）
      // パターンを付けてより認識しやすくする
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }

      // 視覚的フィードバック（iOS等バイブ非対応端末用）
      const flash = document.createElement('div');
      flash.className = 'fixed inset-0 bg-white z-[100] pointer-events-none';
      document.body.appendChild(flash);
      setTimeout(() => {
        flash.style.transition = 'opacity 0.2s ease-out';
        flash.style.opacity = '0';
        setTimeout(() => document.body.removeChild(flash), 200);
      }, 30);

      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(videoRef.current, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `capture_${Date.now()}.jpg`, { type: "image/jpeg" });
          analyzeImage(file);
          setCapturedCount(prev => prev + 1);
          // Don't stop camera, allow multiple captures
        }
      }, 'image/jpeg');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-subsc-bg">
      <div className="max-w-2xl mx-auto w-full px-4 py-8 flex-1 flex flex-col">
        {/* Header */}
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-2xl font-bold text-subsc-navy tracking-tight flex items-center gap-2">
              <div className="w-8 h-8 bg-subsc-blue rounded-lg flex items-center justify-center shadow-sm">
                <Receipt className="w-5 h-5 text-white" />
              </div>
              経費申請アシスタント
            </h1>
            <p className="text-xs text-stone-500 font-medium mt-1">Expense Application Assistant</p>
          </div>
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2.5 rounded-xl bg-white shadow-sm border border-stone-200 hover:bg-stone-50 transition-all active:scale-95"
          >
            <Settings className="w-6 h-6 text-subsc-navy" />
          </button>
        </header>

        {/* Main Action Area */}
        <main className="flex-1 space-y-8">
          {!currentReceipt && (
            <div className="grid grid-cols-2 gap-5">
              <motion.button
                whileHover={{ scale: 1.02, translateY: -2 }}
                whileTap={{ scale: 0.98, translateY: 2 }}
                onClick={startCamera}
                className="flex flex-col items-center justify-center p-8 btn-glossy-blue rounded-2xl h-48"
              >
                <div className="w-16 h-16 mb-4 rounded-full bg-white/20 flex items-center justify-center shadow-inner">
                  <Camera className="w-8 h-8 text-white" />
                </div>
                <span className="text-lg font-bold text-white">カメラで撮影</span>
                <span className="text-xs text-blue-100 mt-1 opacity-80">レシートを撮る</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02, translateY: -2 }}
                whileTap={{ scale: 0.98, translateY: 2 }}
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-8 btn-glossy-blue rounded-2xl h-48"
              >
                <div className="w-16 h-16 mb-4 rounded-full bg-white/20 flex items-center justify-center shadow-inner">
                  <Upload className="w-8 h-8 text-white" />
                </div>
                <span className="text-lg font-bold text-white">画像を選択</span>
                <span className="text-xs text-blue-100 mt-1 opacity-80">アルバムから選ぶ</span>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept="image/*" 
                  multiple
                  className="hidden" 
                />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setCurrentReceipt({
                  id: crypto.randomUUID(),
                  date: new Date().toISOString().split('T')[0],
                  store_name: '',
                  amount: 0,
                  category: '立替',
                  note: '',
                  status: 'pending'
                })}
                className="col-span-2 flex items-center justify-center p-5 bg-stone-200 border-2 border-dashed border-stone-400 rounded-2xl shadow-sm hover:border-subsc-blue transition-all text-stone-700 font-bold gap-2"
              >
                <Plus className="w-5 h-5" />
                手動で入力する
              </motion.button>
            </div>
          )}

        {/* Processing Queue */}
        <AnimatePresence>
          {processingItems.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <div className="flex items-center text-subsc-orange text-sm font-bold">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span>{processingItems.length}件のレシートを解析中...</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {processingItems.map(id => (
                  <div key={id} className="w-12 h-12 bg-stone-200 rounded-lg animate-pulse shrink-0" />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Current Receipt Form */}
        <AnimatePresence>
          {currentReceipt && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white p-6 rounded-2xl shadow-lg border border-stone-200"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-stone-800">内容の確認</h2>
                <button onClick={() => setCurrentReceipt(null)} className="text-stone-400 hover:text-stone-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">日付</label>
                  <input 
                    type="date" 
                    value={currentReceipt.date} 
                    onChange={e => setCurrentReceipt({...currentReceipt, date: e.target.value})}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-subsc-navy focus:border-subsc-navy outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">店舗名</label>
                  <input 
                    type="text" 
                    value={currentReceipt.store_name} 
                    onChange={e => setCurrentReceipt({...currentReceipt, store_name: e.target.value})}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-subsc-navy focus:border-subsc-navy outline-none"
                    placeholder="店舗名を入力"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">金額</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">¥</span>
                      <input 
                        type="number" 
                        value={currentReceipt.amount} 
                        onChange={e => setCurrentReceipt({...currentReceipt, amount: Number(e.target.value)})}
                        className="w-full p-3 pl-8 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-subsc-navy focus:border-subsc-navy outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">カテゴリー</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setCurrentReceipt({...currentReceipt, category: '立替'})}
                        className={`p-3 rounded-xl text-xs font-bold transition-all ${
                          currentReceipt.category === '立替' 
                            ? 'bg-subsc-blue text-white shadow-md' 
                            : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                        }`}
                      >
                        立替
                      </button>
                      <button
                        onClick={() => setCurrentReceipt({...currentReceipt, category: '預かり金'})}
                        className={`p-3 rounded-xl text-xs font-bold transition-all ${
                          currentReceipt.category === '預かり金' 
                            ? 'bg-emerald-500 text-white shadow-md' 
                            : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                        }`}
                      >
                        預かり金
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">備考</label>
                  <textarea 
                    value={currentReceipt.note} 
                    onChange={e => setCurrentReceipt({...currentReceipt, note: e.target.value})}
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-subsc-navy focus:border-subsc-navy outline-none min-h-[80px]"
                    placeholder="備考を入力（任意）"
                  />
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button 
                  onClick={() => addToHistory(currentReceipt)}
                  className="flex-1 p-4 bg-stone-100 text-stone-600 font-bold rounded-xl hover:bg-stone-200 transition-colors"
                >
                  一時保存
                </button>
                <button 
                  onClick={() => handleConfirmAndSend(currentReceipt as ReceiptData)}
                  disabled={isSending}
                  className="flex-[2] p-4 bg-subsc-navy text-white font-bold rounded-xl shadow-lg shadow-subsc-navy/20 hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  スプレッドシートに送信
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* History List */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center text-stone-500">
              <History className="w-5 h-5 mr-2" />
              <h3 className="font-bold">最近の履歴</h3>
              <span className="text-[10px] text-stone-400 ml-2 font-medium">（過去3ヶ月分）</span>
            </div>
            {history.length > 0 && (
              <button 
                onClick={() => { if(confirm('履歴をすべて削除しますか？')) setHistory([]) }}
                className="text-xs text-stone-400 hover:text-red-500"
              >
                すべて削除
              </button>
            )}
          </div>

          <div className="space-y-3">
            {history.length === 0 && processingItems.length === 0 ? (
              <div className="text-center py-12 bg-stone-100/50 rounded-2xl border border-dashed border-stone-200">
                <p className="text-stone-400">履歴はありません</p>
              </div>
            ) : (
              history.map((item) => (
                <motion.div
                  layout
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => setCurrentReceipt(item)}
                  className="bg-white p-4 rounded-xl shadow-sm border border-stone-200 flex items-center justify-between group cursor-pointer hover:border-subsc-navy transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-stone-400">{item.date}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        item.category === '立替' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {item.category}
                      </span>
                      {item.status === 'sent' && (
                        <span className="flex items-center text-[10px] text-emerald-500 font-bold">
                          <CheckCircle2 className="w-3 h-3 mr-0.5" /> 送信済
                        </span>
                      )}
                      {item.status === 'pending' && history.some(h => h.status === 'sent' && h.date === item.date && h.store_name === item.store_name && h.amount === item.amount) && (
                        <span className="flex items-center text-[10px] text-amber-500 font-bold">
                          <AlertCircle className="w-3 h-3 mr-0.5" /> 既に登録しています
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-stone-800 truncate">{item.store_name}</div>
                    <div className="text-xs text-stone-500 truncate">{item.note || '備考なし'}</div>
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    <div className="text-right">
                      <div className="font-bold text-stone-900">¥{item.amount.toLocaleString()}</div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.status !== 'sent' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); sendToGas(item); }}
                          className="p-2 text-subsc-navy hover:bg-blue-50 rounded-lg"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteHistoryItem(item.id); }}
                        className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* Camera Overlay */}
      <AnimatePresence>
        {isCameraOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex flex-col"
          >
            <div className="absolute top-0 left-0 right-0 z-10 flex justify-between items-center p-6 bg-gradient-to-b from-black/60 to-transparent">
              <button onClick={stopCamera} className="text-white p-2 bg-black/20 rounded-full backdrop-blur-md">
                <X className="w-8 h-8" />
              </button>
              {capturedCount > 0 && (
                <div className="bg-subsc-orange text-white px-4 py-1 rounded-full font-bold text-sm shadow-lg">
                  {capturedCount}枚 撮影済み
                </div>
              )}
              <button 
                onClick={stopCamera}
                className="text-white px-6 py-2 bg-subsc-navy rounded-full font-bold shadow-lg border border-white/20"
              >
                完了
              </button>
            </div>
            
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                className="w-full h-full object-cover object-center"
              />
              {/* Camera Guide */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[85%] aspect-[3/4] border-2 border-white/40 border-dashed rounded-2xl shadow-[0_0_0_1000px_rgba(0,0,0,0.4)]" />
              </div>
            </div>

            <div className="p-10 flex flex-col items-center bg-black">
              <p className="text-white/60 text-xs mb-6 font-medium">レシートを枠内に合わせて撮影してください</p>
              <button 
                onClick={capturePhoto}
                className="w-20 h-20 bg-white rounded-full border-[6px] border-stone-300 active:scale-90 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.3)] relative"
              >
                <div className="absolute inset-1 border-2 border-black/5 rounded-full" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-md p-6 rounded-2xl shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-stone-800">設定</h2>
                <button onClick={() => setShowSettings(false)} className="text-stone-400 hover:text-stone-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-stone-600 mb-2">Google Apps Script (GAS) URL</label>
                  <input 
                    type="url" 
                    value={gasUrl} 
                    onChange={e => setGasUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <p className="text-[10px] text-stone-400 mt-2 leading-relaxed">
                    スプレッドシートにデータを送信するためのGASウェブアプリのURLを入力してください。
                    POSTリクエストでJSONデータが送信されます。
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <button 
                  onClick={() => saveGasUrl(gasUrl)}
                  className="w-full p-4 btn-glossy-navy rounded-xl"
                >
                  設定を保存
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Messages */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-lg flex items-center z-[100] ${
              message.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 mr-2" /> : <AlertCircle className="w-5 h-5 mr-2" />}
            <span className="font-bold text-sm">{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
