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
            <span className="bg-orange-500 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
              {capturedCount > 0 ? `${capturedCount}枚 撮影済み` : 'レシートを枠に合わせてください'}
            </span>
          </div>
        </div>

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
            className="px-6 py-2 bg-slate-800/80 backdrop-blur-md text-white rounded-full font-bold shadow-lg border border-white/20"
          >
            完了
          </button>
        </div>
      </div>

      {/* 下部コントロール */}
      <div className="h-40 bg-black flex items-center justify-center relative">
        <button
          onClick={capture}
          disabled={isProcessing}
          className={`w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-all active:scale-90 ${isProcessing ? 'opacity-50' : 'hover:bg-white/10'}`}
        >
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
            <Camera size={32} className="text-black" />
          </div>
        </button>
        
        {isProcessing && (
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <span className="text-white/70 text-xs animate-pulse">AI解析中...</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};
