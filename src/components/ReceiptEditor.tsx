import React, { useState } from 'react';
import { X, Save, Trash2, Send } from 'lucide-react';
import { motion } from 'motion/react';
import { ReceiptData } from '../types';
import { CATEGORIES } from '../constants';

interface ReceiptEditorProps {
  receipt: ReceiptData;
  onSave: (updated: ReceiptData) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export const ReceiptEditor: React.FC<ReceiptEditorProps> = ({ receipt, onSave, onDelete, onClose }) => {
  const [edited, setEdited] = useState<ReceiptData>({ ...receipt });

  const handleSave = (status: ReceiptData['status'] = 'pending') => {
    onSave({ ...edited, status });
    onClose();
  };

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center"
      onClick={onClose}
    >
      <div 
        className="bg-stone-50 w-full max-w-2xl rounded-t-[40px] p-8 pb-12 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-[#003366]">内容の確認</h2>
          <button onClick={onClose} className="p-3 bg-stone-100 text-stone-400 rounded-2xl hover:bg-stone-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">日付</label>
              <input 
                type="date" 
                value={edited.date}
                onChange={e => setEdited(prev => ({ ...prev, date: e.target.value }))}
                className="w-full bg-white border-none rounded-2xl p-4 text-stone-800 font-medium shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">金額</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold">¥</span>
                <input 
                  type="number" 
                  value={edited.amount}
                  onChange={e => setEdited(prev => ({ ...prev, amount: Number(e.target.value) }))}
                  className="w-full bg-white border-none rounded-2xl p-4 pl-8 text-stone-800 font-mono font-bold shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">店舗名</label>
            <input 
              type="text" 
              value={edited.store_name}
              onChange={e => setEdited(prev => ({ ...prev, store_name: e.target.value }))}
              className="w-full bg-white border-none rounded-2xl p-4 text-stone-800 font-medium shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="店舗名を入力"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">カテゴリー</label>
            <div className="flex gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setEdited(prev => ({ ...prev, category: cat }))}
                  className={`flex-1 p-4 rounded-2xl font-bold transition-all relative overflow-hidden ${
                    edited.category === cat 
                      ? 'text-white shadow-lg shadow-orange-500/30 border border-orange-600' 
                      : 'bg-white text-stone-400 hover:bg-stone-100 border border-stone-100'
                  }`}
                  style={edited.category === cat ? {
                    background: 'linear-gradient(to bottom, #FFB84D 0%, #FF9900 100%)',
                  } : {}}
                >
                  {edited.category === cat && (
                    <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
                  )}
                  <span className="relative z-10">{cat}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">備考</label>
            <textarea 
              value={edited.note}
              onChange={e => setEdited(prev => ({ ...prev, note: e.target.value }))}
              rows={2}
              className="w-full bg-white border-none rounded-2xl p-4 text-stone-800 font-medium shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
              placeholder="購入内容やメモ..."
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-10">
          <button 
            onClick={() => { onDelete(receipt.id); onClose(); }}
            className="p-4 rounded-2xl bg-rose-50 text-rose-600 font-bold flex items-center justify-center gap-2 hover:bg-rose-100 transition-colors border border-rose-100"
          >
            <Trash2 size={20} />
          </button>
          <button 
            onClick={() => handleSave('pending')}
            className="p-4 rounded-2xl bg-white text-stone-600 font-bold flex items-center justify-center gap-2 hover:bg-stone-50 transition-colors border border-stone-200 shadow-sm"
          >
            <Save size={20} /> 保存
          </button>
          <button 
            onClick={() => handleSave('sent')}
            className="p-4 rounded-2xl text-white font-bold flex items-center justify-center gap-2 shadow-xl shadow-blue-900/20 relative overflow-hidden active:scale-95 transition-all border border-[#00264d]"
            style={{
              background: 'linear-gradient(to bottom, #004d99 0%, #003366 100%)',
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
            <Send size={20} className="relative z-10" />
            <span className="relative z-10">送信</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};
