import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ToastState } from '../types';

interface ToastProps {
  toast: ToastState | null;
}

export const Toast: React.FC<ToastProps> = ({ toast }) => {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          className="fixed bottom-24 left-6 right-6 z-[60] flex justify-center pointer-events-none"
        >
          <div className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 text-white font-bold backdrop-blur-md ${toast.type === 'success' ? 'bg-emerald-600/90' : 'bg-rose-600/90'}`}>
            {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            {toast.message}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
