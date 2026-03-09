import React, { useState, useEffect } from 'react';
import { Camera, Plus, History, Settings, LogOut, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types & Constants
import { ReceiptData } from './types';
import { IMAGE_CONFIG, COLORS, GAS_URL, GEMINI_API_KEY } from './constants';

// Utils & Services
import { getResizedBase64 } from './utils/imageUtils';
import { analyzeReceiptImage } from './services/geminiService';

// Hooks
import { useReceipts } from './hooks/useReceipts';
import { useToast } from './hooks/useToast';

// Components
import { Scanner } from './components/Scanner';
import { HistoryList } from './components/HistoryList';
import { ReceiptEditor } from './components/ReceiptEditor';
import { Toast } from './components/Toast';
import { DashboardChart } from './components/DashboardChart';

// Trigger build to apply environment variables (VITE_GAS_URL, VITE_GEMINI_API_KEY)
// Version: 2026-03-09 15:22
const App: React.FC = () => {
  const [showScanner, setShowScanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [manualApiKey, setManualApiKey] = useState(localStorage.getItem('manual_api_key') || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const { 
    history, 
    currentReceipt, 
    setCurrentReceipt, 
    processingItems, 
    addReceipt, 
    updateReceipt, 
    deleteReceipt,
    startProcessing,
    endProcessing,
    setHistory
  } = useReceipts();
  const { toast, showToast } = useToast();

  // スプレッドシート同期 (GAS)
  const syncWithSpreadsheet = async () => {
    console.log('--- Sync Start ---');
    console.log('Target GAS_URL:', GAS_URL);

    if (!GAS_URL) {
      console.error('【設定エラー】GAS_URL が定義されていません。src/constants.ts を確認してください。');
      showToast('GASのWebアプリURLが設定されていません。', 'error');
      return;
    }

    setIsSyncing(true);
    try {
      const fetchUrl = `${GAS_URL}?action=read`;
      console.log('Fetching data from:', fetchUrl);
      
      const res = await fetch(fetchUrl, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        redirect: 'follow'
      });
      console.log('Fetch response status:', res.status, res.statusText);

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP Error: ${res.status} ${res.statusText} - ${errorText}`);
      }

      const data = await res.json();
      console.log('Data received from GAS:', data);
      
      if (data && Array.isArray(data)) {
        const syncedData: ReceiptData[] = data.map((row: any) => ({
          id: row.id,
          date: row.date,
          store_name: row.store_name,
          amount: Number(row.amount) || 0,
          type: row.type as any,
          category: row.category,
          note: row.note,
          status: 'sent',
          timestamp: Number(row.timestamp)
        }));

        setHistory(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newData = syncedData.filter(m => !existingIds.has(m.id));
          return [...newData, ...prev];
        });
        showToast('スプレッドシートからデータを取得しました。', 'success');
      } else {
        console.warn('Received data is not an array:', data);
      }
    } catch (err) {
      console.error('--- Sync Error Details ---');
      console.error('Error object:', err);
      if (err instanceof Error) {
        console.error('Error message:', err.message);
        console.error('Stack trace:', err.stack);
      }
      showToast('同期に失敗しました。コンソールを確認してください。', 'error');
    } finally {
      setIsSyncing(false);
      console.log('--- Sync End ---');
    }
  };

  const sendToSpreadsheet = async (receipt: ReceiptData) => {
    console.log('--- Send Start ---');
    console.log('Target GAS_URL:', GAS_URL);
    console.log('Receipt data to send:', receipt);

    if (!GAS_URL) {
      console.error('【設定エラー】GAS_URL が定義されていません。src/constants.ts を確認してください。');
      showToast('GASのWebアプリURLが設定されていません。', 'error');
      return false;
    }

    try {
      const payload = {
        action: 'append',
        data: {
          id: receipt.id,
          date: receipt.date,
          store_name: receipt.store_name,
          amount: receipt.amount,
          type: receipt.type,
          category: receipt.category,
          note: receipt.note,
          timestamp: receipt.timestamp
        }
      };
      console.log('Sending payload:', payload);

      const res = await fetch(GAS_URL, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      
      console.log('Fetch completed. Response status:', res.status);
      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.status}`);
      }
      return true;
    } catch (e) {
      console.error('--- Send Error Details ---');
      console.error('Error object:', e);
      return false;
    } finally {
      console.log('--- Send End ---');
    }
  };

  const handleCapture = async (file: File) => {
    console.log('--- Capture Start ---');
    
    const processingId = crypto.randomUUID();
    startProcessing(processingId);
    
    try {
      const { base64, type } = await getResizedBase64(file, IMAGE_CONFIG.MAX_SIDE, IMAGE_CONFIG.QUALITY);
      
      // GEMINI_API_KEY または manualApiKey を使用
      const activeKey = manualApiKey || GEMINI_API_KEY;
      
      if (!activeKey) {
        throw new Error('MISSING_API_KEY');
      }

      const result = await analyzeReceiptImage(base64, type, activeKey);
      
      const newEntry: ReceiptData = {
        id: crypto.randomUUID(),
        date: result.date || new Date().toISOString().split('T')[0],
        store_name: result.store_name || '不明な店舗',
        amount: Number(result.amount) || 0,
        type: (result.type === 'deposit' ? 'deposit' : 'advance'),
        category: (['飲食', '交通', '備品', 'その他'].includes(result.category || '') ? result.category! : 'その他'),
        note: result.note || '',
        status: 'pending',
        timestamp: Date.now()
      };
      
      addReceipt(newEntry);
      setCurrentReceipt(newEntry);
      showToast(`${newEntry.store_name}を解析しました。`, 'success');
    } catch (error: any) {
      console.error('Analysis error:', error);
      let message = '解析に失敗しました。もう一度撮影し直すか、手動で入力してください。';
      if (error?.message === 'MISSING_API_KEY' || error?.message?.includes('API_KEY')) {
        message = 'APIキーが設定されていません。設定メニューから手動で入力するか、PCのSecrets設定を確認してください。';
        setShowSettings(true); // キーがない場合は設定を開く
      }
      showToast(message, 'error');
    } finally {
      endProcessing(processingId);
    }
  };

  const totals = history.reduce((acc, item) => {
    const amount = Number(item.amount) || 0;
    if (item.type === 'advance') {
      acc.advance += amount;
    } else {
      acc.deposit += amount;
    }
    return acc;
  }, { advance: 0, deposit: 0 });

  const grandTotal = totals.advance - totals.deposit;

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 pb-32">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-stone-100">
        <div className="max-w-2xl mx-auto px-6 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[#003366]">ReceiptScan</h1>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">SUB-CART EDITION</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => syncWithSpreadsheet()}
              disabled={isSyncing}
              title="スプレッドシート同期" 
              className={`p-3 bg-stone-50 text-stone-400 rounded-2xl hover:bg-stone-100 transition-all ${isSyncing ? 'animate-spin text-[#FF9900]' : 'active:scale-90'}`}
            >
              <RefreshCw size={20} />
            </button>
            <button 
              onClick={() => setShowSettings(true)}
              title="設定" 
              className="p-3 bg-stone-50 text-stone-400 rounded-2xl hover:bg-stone-100 transition-colors"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-8">
        {/* Dashboard Card */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-[#003366] rounded-[40px] p-8 text-white shadow-2xl shadow-blue-900/20 mb-10 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #003366 0%, #001a33 100%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 20px 40px rgba(0,26,51,0.3)'
          }}
        >
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold uppercase tracking-[0.2em] opacity-70">今月の精算状況</span>
              <div className="bg-[#FF9900] px-3 py-1 rounded-full text-[10px] font-bold shadow-lg shadow-orange-500/30">
                ACTIVE
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">立替金合計</span>
                <p className="text-2xl font-black">¥{totals.advance.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">預かり金合計</span>
                <p className="text-2xl font-black">¥{totals.deposit.toLocaleString()}</p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">精算トータル</span>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black">¥{grandTotal.toLocaleString()}</span>
                <span className="text-blue-200 font-bold">残高</span>
              </div>
            </div>
          </div>
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-10 w-60 h-60 bg-blue-400/10 rounded-full blur-3xl" />
        </motion.div>

        {/* Chart Section */}
        <div className="mb-10">
          <DashboardChart data={history} />
        </div>

        {/* History Section */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2 text-[#003366]">
            <History size={20} className="text-[#FF9900]" />
            最近の履歴
          </h2>
          <button className="text-sm font-bold text-[#FF9900] hover:text-orange-600">すべて見る</button>
        </div>

        <HistoryList 
          items={history} 
          processingIds={processingItems} 
          onSelect={setCurrentReceipt} 
        />
      </main>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-10 left-0 right-0 flex justify-center items-center gap-6 z-40 px-6">
        <button 
          onClick={() => setShowScanner(true)}
          className="w-20 h-20 text-white rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all group overflow-hidden relative"
          style={{
            background: 'linear-gradient(to bottom, #FFB84D 0%, #FF9900 100%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 15px 30px rgba(255,153,0,0.3)',
            border: '1px solid #E68A00'
          }}
        >
          {/* Glossy overlay */}
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
          <Camera size={32} className="group-hover:rotate-12 transition-transform relative z-10" />
        </button>
        <button 
          onClick={() => setCurrentReceipt({
            id: crypto.randomUUID(),
            date: new Date().toISOString().split('T')[0],
            store_name: '',
            amount: 0,
            category: '立替',
            note: '',
            status: 'pending',
            timestamp: Date.now()
          })}
          className="w-14 h-14 bg-white text-[#003366] rounded-full shadow-xl flex items-center justify-center hover:bg-stone-50 transition-all active:scale-90 border border-stone-100"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Modals & Overlays */}
      <AnimatePresence>
        {showScanner && (
          <Scanner 
            onCapture={handleCapture} 
            onClose={() => setShowScanner(false)} 
            isProcessing={processingItems.length > 0}
          />
        )}
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[32px] w-full max-w-md p-8 shadow-2xl"
            >
              <h2 className="text-xl font-bold mb-6 text-[#003366]">アプリ設定</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                    Gemini APIキー (自動読み込み失敗時用)
                  </label>
                  <input 
                    type="password"
                    value={manualApiKey}
                    onChange={(e) => {
                      const val = e.target.value;
                      setManualApiKey(val);
                      localStorage.setItem('manual_api_key', val);
                    }}
                    placeholder="AI Studioから取得したキーを入力"
                    className="w-full bg-stone-50 border border-stone-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF9900]/20"
                  />
                  <p className="mt-2 text-[10px] text-stone-400 leading-relaxed">
                    ※通常はPC側のSecrets設定が自動反映されますが、スマホでエラーが出る場合はこちらに直接入力してください。
                  </p>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="flex-1 py-4 bg-[#003366] text-white font-bold rounded-2xl hover:bg-[#002244] transition-colors"
                  >
                    閉じる
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
        {currentReceipt && (
          <ReceiptEditor 
            receipt={currentReceipt}
            onSave={async (updated) => {
              let finalStatus = updated.status;
              if (updated.status === 'sent') {
                const success = await sendToSpreadsheet(updated);
                if (!success) {
                  showToast('スプレッドシートへの送信に失敗しました。', 'error');
                  finalStatus = 'pending';
                }
              }

              const exists = history.find(h => h.id === updated.id);
              if (exists) {
                updateReceipt({ ...updated, status: finalStatus });
                showToast(finalStatus === 'sent' ? '送信しました。' : '更新しました。', 'success');
              } else {
                addReceipt({ ...updated, status: finalStatus });
                showToast(finalStatus === 'sent' ? '送信しました。' : '保存しました。', 'success');
              }
            }}
            onDelete={deleteReceipt}
            onClose={() => setCurrentReceipt(null)}
          />
        )}
      </AnimatePresence>

      <Toast toast={toast} />
    </div>
  );
};

export default App;
