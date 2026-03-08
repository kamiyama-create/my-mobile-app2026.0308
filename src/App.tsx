import React, { useState } from 'react';
import { Camera, Plus, History, Settings, LogOut, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types & Constants
import { ReceiptData } from './types';
import { IMAGE_CONFIG, COLORS } from './constants';

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

const App: React.FC = () => {
  const [showScanner, setShowScanner] = useState(false);
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

  // スプレッドシート同期（シミュレーション）
  const syncWithSpreadsheet = async () => {
    setIsSyncing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const mockData: ReceiptData[] = [
        { id: 'ss-1', date: '2026-03-01', store_name: 'スプレッドシート同期', amount: 12500, category: '立替', note: '自動同期データ', status: 'sent', timestamp: Date.now() },
        { id: 'ss-2', date: '2026-03-03', store_name: 'スプレッドシート同期', amount: 8900, category: '預かり金', note: '自動同期データ', status: 'sent', timestamp: Date.now() },
        { id: 'ss-3', date: '2026-03-05', store_name: 'スプレッドシート同期', amount: 15000, category: '立替', note: '自動同期データ', status: 'sent', timestamp: Date.now() },
      ];
      
      setHistory(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const newData = mockData.filter(m => !existingIds.has(m.id));
        return [...newData, ...prev];
      });
      showToast('スプレッドシートと同期しました。', 'success');
    } catch (err) {
      showToast('同期に失敗しました。', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

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
            <h1 className="text-2xl font-black tracking-tight text-[#003366]">ReceiptScan</h1>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">SUB-CART EDITION</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={syncWithSpreadsheet}
              disabled={isSyncing}
              title="スプレッドシート同期" 
              className={`p-3 bg-stone-50 text-stone-400 rounded-2xl hover:bg-stone-100 transition-all ${isSyncing ? 'animate-spin text-[#FF9900]' : ''}`}
            >
              <RefreshCw size={20} />
            </button>
            <button title="設定" className="p-3 bg-stone-50 text-stone-400 rounded-2xl hover:bg-stone-100 transition-colors">
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
              <span className="text-xs font-bold uppercase tracking-[0.2em] opacity-70">今月の合計支出</span>
              <div className="bg-[#FF9900] px-3 py-1 rounded-full text-[10px] font-bold shadow-lg shadow-orange-500/30">
                ACTIVE
              </div>
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-5xl font-black">¥{totalAmount.toLocaleString()}</span>
              <span className="text-blue-200 font-bold">合計</span>
            </div>
            <div className="mt-8 flex gap-4">
              <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 flex-1 border border-white/10">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">件数</span>
                <p className="text-xl font-black mt-1">{history.length} <span className="text-xs opacity-60">件</span></p>
              </div>
              <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 flex-1 border border-white/10">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">送信済み</span>
                <p className="text-xl font-black mt-1">{history.filter(h => h.status === 'sent').length} <span className="text-xs opacity-60">件</span></p>
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
