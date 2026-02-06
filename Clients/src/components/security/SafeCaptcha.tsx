import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { ShieldCheck, CheckCircle2, Fingerprint, Lock, Cpu, Scan } from 'lucide-react';
import { clsx } from 'clsx';

interface SafeCaptchaProps {
  onVerify: (isValid: boolean) => void;
  className?: string;
}

export const SafeCaptcha: React.FC<SafeCaptchaProps> = ({ onVerify, className }) => {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'analyzing' | 'verified'>('idle');
  const [progress, setProgress] = useState(0);
  const controls = useAnimation();
  const intervalRef = useRef<number | null>(null);

  // --- INTERACTION HANDLERS ---

  const startScan = () => {
    if (status === 'verified' || status === 'analyzing') return;
    setStatus('scanning');
    
    // Start filling progress
    let p = 0;
    intervalRef.current = window.setInterval(() => {
      p += 2; // Speed of scan
      setProgress(p);
      if (p >= 100) {
        completeScan();
      }
    }, 20); // 20ms * 50 ticks = 1 second hold time
  };

  const stopScan = () => {
    if (status === 'verified' || status === 'analyzing') return;
    
    // Reset if released too early
    if (intervalRef.current) clearInterval(intervalRef.current);
    setStatus('idle');
    setProgress(0);
  };

  const completeScan = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setStatus('analyzing');
    
    // Simulate Backend/AI Analysis
    setTimeout(() => {
      setStatus('verified');
      onVerify(true);
    }, 1500);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className={clsx("w-full max-w-sm font-sans select-none", className)}>
      
      {/* CAPTCHA CONTAINER */}
      <motion.div
        className={clsx(
          "relative overflow-hidden rounded-2xl border-2 transition-all duration-500",
          status === 'idle' 
            ? "bg-gray-50 dark:bg-[#0f1f3a] border-gray-200 dark:border-gray-700 hover:border-primary/40"
            : status === 'scanning'
            ? "bg-blue-50/30 dark:bg-blue-900/10 border-primary shadow-[0_0_20px_rgba(57,93,145,0.2)]"
            : status === 'analyzing'
            ? "bg-purple-50/30 dark:bg-purple-900/10 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.2)]"
            : "bg-green-50/30 dark:bg-green-900/10 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.2)]"
        )}
        onMouseDown={startScan}
        onMouseUp={stopScan}
        onMouseLeave={stopScan}
        onTouchStart={startScan}
        onTouchEnd={stopScan}
      >
        {/* === PROGRESS FILL (Background) === */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-primary/10 pointer-events-none"
          initial={{ width: '0%' }}
          animate={{ width: `${progress}%` }}
          transition={{ ease: "linear", duration: 0 }}
        />

        <div className="relative p-3 sm:p-4 flex items-center justify-between min-h-[72px]">
          
          {/* --- INTERACTIVE TRIGGER (Fingerprint) --- */}
          <div className="flex items-center gap-4 z-10">
            <div className="relative w-12 h-12 flex items-center justify-center">
               
               {/* Pulse Effect (Idle) */}
               {status === 'idle' && (
                 <motion.div 
                   animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                   transition={{ duration: 2, repeat: Infinity }}
                   className="absolute inset-0 bg-primary/20 rounded-full"
                 />
               )}

               {/* Ring Spinner (Analyzing) */}
               {status === 'analyzing' && (
                 <motion.div 
                   animate={{ rotate: 360 }}
                   transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                   className="absolute inset-0 border-2 border-transparent border-t-purple-500 rounded-full"
                 />
               )}

               {/* Icon Container */}
               <div className={clsx(
                 "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 relative overflow-hidden",
                 status === 'idle' ? "bg-white dark:bg-white/10 text-gray-400 border border-gray-200 dark:border-white/5" :
                 status === 'scanning' ? "bg-primary text-white scale-95" :
                 status === 'analyzing' ? "bg-primary text-white" :
                 "bg-green-500 text-white"
               )}>
                  <AnimatePresence mode="wait">
                    {status === 'idle' && (
                      <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                         <Fingerprint size={24} strokeWidth={1.5} />
                      </motion.div>
                    )}
                    {status === 'scanning' && (
                      <motion.div key="scan" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 0.5, repeat: Infinity }}>
                         <Scan size={24} />
                      </motion.div>
                    )}
                    {status === 'analyzing' && (
                      <motion.div key="analyze" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
                         <Cpu size={24} />
                      </motion.div>
                    )}
                    {status === 'verified' && (
                      <motion.div key="success" initial={{ scale: 0.5, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring' }}>
                         <CheckCircle2 size={24} />
                      </motion.div>
                    )}
                  </AnimatePresence>
               </div>
            </div>

            {/* --- TEXT LABELS --- */}
            <div className="flex flex-col">
              <span className={clsx(
                "text-sm font-bold transition-colors duration-300",
                status === 'verified' ? "text-green-600 dark:text-green-400" : 
                status === 'analyzing' ? "text-purple-600 dark:text-purple-400" :
                status === 'scanning' ? "text-primary" :
                "text-slate-700 dark:text-gray-200"
              )}>
                {status === 'idle' && "Hold to verify"}
                {status === 'scanning' && "Scanning identity..."}
                {status === 'analyzing' && "Analyzing behavior..."}
                {status === 'verified' && "Access Granted"}
              </span>
              <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                {status === 'idle' ? "Human Verification" : 
                 status === 'scanning' ? "Biometric check active" :
                 status === 'analyzing' ? "Running Heuristics..." :
                 "Session Secured"}
              </span>
            </div>
          </div>

          {/* --- SECURITY BADGE --- */}
          <div className="hidden sm:flex flex-col items-end opacity-40">
            <ShieldCheck size={18} className="text-gray-400 mb-0.5" />
            <span className="text-[8px] font-bold text-gray-400">SL-V3</span>
          </div>
        </div>

        {/* === SCANNER OVERLAY ANIMATION === */}
        <AnimatePresence>
          {(status === 'scanning' || status === 'analyzing') && (
            <>
              <motion.div 
                initial={{ top: 0, opacity: 0 }}
                animate={{ top: "100%", opacity: 1 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_10px_rgba(59,130,246,0.8)] z-20"
              />
              <motion.div 
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                 className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none mix-blend-overlay"
              />
            </>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Footer Info */}
      <div className="flex justify-between px-3 mt-2 opacity-50 transition-opacity duration-300 hover:opacity-100">
        <span className="text-[9px] text-gray-400 flex items-center gap-1">
          <Lock size={8} /> 256-bit SSL
        </span>
        <span className="text-[9px] text-gray-400">
          Protected by <span className="font-bold text-primary">SafeLand Sec</span>
        </span>
      </div>
    </div>
  );
};