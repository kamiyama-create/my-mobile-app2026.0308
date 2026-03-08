import React, { useState } from 'react';
import { Camera, Plus, History, Settings, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types & Constants
import { ReceiptData } from './types';
import { IMAGE_CONFIG } from './constants';

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

const App: React.FC = () => {
  const [showScanner, setShowScanner] = useState(false);
  const { 
    history, 
    currentReceipt, 
    setCurrentReceipt, 
    processingItems, 
    addReceipt, 
    updateReceipt, 
    deleteReceipt,
    startProcessing,
    endProcessing
  } = useReceipts();
  const { toast, showToast } = useToast();

  const handleCapture = async (file: File) => {
    const processingId = crypto.randomUUID();
    startProcessing(processingId);
    
    try {
      const { base64, type } = await getResizedBase64(file, IMAGE_CONFIG.MAX_SIDE, IMAGE_CONFIG.QUALITY);
      const result = await analyzeReceiptImage(base64, type);

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
      
      addReceipt(newEntry);
      setCurrentReceipt(newEntry);
      showToast(`${newEntry.store_name}を解析しました。`, 'success');
    } catch (error) {
      console.error('Analysis error:', error);
      showToast('解析に失敗しました。もう一度撮影し直すか、手動で入力してください。', 'error');
    } finally {
      endProcessing(processingId);
    }
  };

  const totalAmount = history.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 pb-32">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-stone-100">
        <div className="max-w-2xl mx-auto px-6 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-emerald-600">ReceiptScan</h1>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">経費管理アシスタント</p>
          </div>
          <div className="flex gap-2">
            <button title="設定" className="p-3 bg-stone-50 text-stone-400 rounded-2xl hover:bg-stone-100 transition-colors">
              <Settings size={20} />
            </button>
            <button title="ログアウト" className="p-3 bg-stone-50 text-stone-400 rounded-2xl hover:bg-stone-100 transition-colors">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-8">
        {/* Dashboard Card */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-emerald-600 rounded-[40px] p-8 text-white shadow-2xl shadow-emerald-200 mb-10 relative overflow-hidden"
        >
          <div className="relative z-10">
            <span className="text-xs font-bold uppercase tracking-[0.2em] opacity-70">合計支出</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-5xl font-black">¥{totalAmount.toLocaleString()}</span>
              <span className="text-emerald-200 font-bold">合計</span>
            </div>
            <div className="mt-8 flex gap-4">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">件数</span>
                <p className="text-xl font-black mt-1">{history.length} <span className="text-xs opacity-60">件</span></p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">送信済み</span>
                <p className="text-xl font-black mt-1">{history.filter(h => h.status === 'sent').length} <span className="text-xs opacity-60">件</span></p>
              </div>
            </div>
          </div>
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-10 w-60 h-60 bg-emerald-400/20 rounded-full blur-3xl" />
        </motion.div>

        {/* History Section */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <History size={20} className="text-emerald-500" />
            最近の履歴
          </h2>
          <button className="text-sm font-bold text-emerald-600 hover:text-emerald-700">すべて見る</button>
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
          className="w-20 h-20 bg-emerald-600 text-white rounded-full shadow-[0_20px_40px_rgba(16,185,129,0.3)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all group"
        >
          <Camera size={32} className="group-hover:rotate-12 transition-transform" />
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
          className="w-14 h-14 bg-white text-emerald-600 rounded-full shadow-xl flex items-center justify-center hover:bg-stone-50 transition-colors"
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
        {currentReceipt && (
          <ReceiptEditor 
            receipt={currentReceipt}
            onSave={(updated) => {
              const exists = history.find(h => h.id === updated.id);
              if (exists) {
                updateReceipt(updated);
                showToast('更新しました。', 'success');
              } else {
                addReceipt(updated);
                showToast('保存しました。', 'success');
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
