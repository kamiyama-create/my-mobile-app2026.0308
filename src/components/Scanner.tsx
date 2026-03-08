import React, { useRef, useState, useCallback } from 'react';
import { Camera, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ScannerProps {
  onCapture: (file: File) => void;
  onClose: () => void;
  isProcessing: boolean;
}

export const Scanner: React.FC<ScannerProps> = ({ onCapture, onClose, isProcessing }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedCount, setCapturedCount] = useState(0);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
    } catch (err) {
      console.error("Camera error:", err);
      alert("カメラの起動に失敗しました。ブラウザの設定を確認してください。");
    }
  }, []);

  React.useEffect(() => {
    startCamera();
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [startCamera]);

  const capture = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `receipt_${Date.now()}.jpg`, { type: 'image/jpeg' });
          onCapture(file);
          setCapturedCount(prev => prev + 1);
        }
      }, 'image/jpeg', 0.9);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex flex-col"
    >
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* ガイド枠 */}
        <div className="relative z-10 w-4/5 aspect-[3/4] border-2 border-dashed border-white/50 rounded-2xl shadow-[0_0_0_100vmax_rgba(0,0,0,0.5)]">
          <div className="absolute -top-12 left-0 right-0 text-center">
            <span className="bg-[#FF9900] text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
              {capturedCount > 0 ? `${capturedCount}枚 撮影済み` : 'レシートを枠に合わせてください'}
            </span>
          </div>
        </div>

        {/* エラー表示 */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-48 left-6 right-6 z-30"
            >
              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-[#FF9900] rounded-full flex items-center justify-center animate-pulse">
                  <Camera size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-bold text-sm">AI解析中...</p>
                  <p className="text-white/60 text-[10px]">しばらくお待ちください</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 上部コントロール */}
        <div className="absolute top-6 left-6 right-6 flex justify-between items-start z-20">
          <button 
            onClick={onClose}
            className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-colors"
          >
            <X size={24} />
          </button>
          <button 
            onClick={onClose}
            className="px-6 py-2 text-white rounded-full font-bold shadow-lg border border-[#00264d] relative overflow-hidden active:scale-95 transition-all"
            style={{
              background: 'linear-gradient(to bottom, #004d99 0%, #003366 100%)',
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
            <span className="relative z-10">完了</span>
          </button>
        </div>
      </div>

      {/* 下部コントロール */}
      <div className="h-40 bg-black flex items-center justify-center relative">
        <button
          onClick={capture}
          disabled={isProcessing}
          className={`w-20 h-20 rounded-full border-4 border-white/20 flex items-center justify-center transition-all active:scale-90 relative overflow-hidden ${isProcessing ? 'opacity-50' : 'hover:scale-105'}`}
          style={{
            background: 'linear-gradient(to bottom, #FFB84D 0%, #FF9900 100%)',
            boxShadow: '0 0 20px rgba(255,153,0,0.3)'
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
          <Camera size={32} className="text-white relative z-10" />
        </button>
        
        {isProcessing && (
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <span className="text-[#FF9900] text-xs font-bold animate-pulse">AI解析中...</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};
