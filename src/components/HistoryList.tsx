import React from 'react';
import { Clock, Store, Tag, ChevronRight, Loader2 } from 'lucide-react';
import { ReceiptData } from '../types';

interface HistoryListProps {
  items: ReceiptData[];
  processingIds: string[];
  onSelect: (item: ReceiptData) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({ items, processingIds, onSelect }) => {
  if (items.length === 0 && processingIds.length === 0) {
    return (
      <div className="text-center py-20 bg-stone-50 rounded-3xl border-2 border-dashed border-stone-200">
        <p className="text-stone-400">履歴がありません。<br/>右下のボタンから撮影してください。</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 解析中のアイテム */}
      {processingIds.map(id => (
        <div key={id} className="bg-white p-5 rounded-3xl shadow-sm border border-stone-100 flex items-center gap-4 animate-pulse">
          <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center">
            <Loader2 className="animate-spin text-stone-400" />
          </div>
          <div className="flex-1">
            <div className="h-4 bg-stone-100 rounded w-1/3 mb-2" />
            <div className="h-3 bg-stone-100 rounded w-1/2" />
          </div>
        </div>
      ))}

      {/* 履歴アイテム */}
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => onSelect(item)}
          className="w-full text-left bg-white p-5 rounded-3xl shadow-sm border border-stone-100 hover:border-emerald-200 hover:shadow-md transition-all group flex items-center gap-4"
        >
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${item.status === 'sent' ? 'bg-blue-50 text-[#003366]' : 'bg-stone-50 text-stone-600'}`}>
            <Store size={24} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-1">
              <h3 className="font-bold text-stone-800 truncate">{item.store_name}</h3>
              <span className="font-mono font-bold text-[#003366]">¥{item.amount.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-stone-400">
              <span className="flex items-center gap-1"><Clock size={12} /> {item.date}</span>
              <span className="flex items-center gap-1"><Tag size={12} /> {item.category}</span>
              {item.status === 'sent' && <span className="text-[#FF9900] font-bold">送信済み</span>}
            </div>
          </div>
          
          <ChevronRight size={20} className="text-stone-300 group-hover:text-[#FF9900] transition-colors" />
        </button>
      ))}
    </div>
  );
};
