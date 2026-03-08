import { useState, useEffect } from 'react';
import { ReceiptData } from '../types';

export const useReceipts = () => {
  const [history, setHistory] = useState<ReceiptData[]>([]);
  const [currentReceipt, setCurrentReceipt] = useState<ReceiptData | null>(null);
  const [processingItems, setProcessingItems] = useState<string[]>([]);

  // ローカルストレージから読み込み
  useEffect(() => {
    const saved = localStorage.getItem('receipt_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load history', e);
      }
    }
  }, []);

  // ローカルストレージに保存
  useEffect(() => {
    localStorage.setItem('receipt_history', JSON.stringify(history));
  }, [history]);

  const addReceipt = (receipt: ReceiptData) => {
    setHistory(prev => [receipt, ...prev]);
  };

  const updateReceipt = (updated: ReceiptData) => {
    setHistory(prev => prev.map(item => item.id === updated.id ? updated : item));
  };

  const deleteReceipt = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const startProcessing = (id: string) => setProcessingItems(prev => [...prev, id]);
  const endProcessing = (id: string) => setProcessingItems(prev => prev.filter(p => p !== id));

  return {
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
  };
};
