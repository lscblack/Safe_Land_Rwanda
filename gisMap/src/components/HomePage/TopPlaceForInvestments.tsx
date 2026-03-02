import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, ArrowRight, Activity, Cpu, Database, Target, FileText, ScanLine
} from 'lucide-react';
import { clsx } from 'clsx';
import { useLanguage } from '../../contexts/language-context';

// --- AI PREDICTION DATA ---
const PREDICTIONS = [
  {
    id: 1,
    name: "Nyamata, Bugesera",
    code: "ZONE-BGS-01",
    tag: "Logistic Hub",
    currentGrowth: 12.4,
    predictedGrowth: 18.5,
    confidence: 98,
    desc: "Airport construction creates +240% demand spike in logistics warehousing.",
    chartData: [40, 45, 60, 75, 85, 95] // Last value is prediction
  },
  {
    id: 2,
    name: "Rebero, Kigali",
    code: "ZONE-RBR-09",
    tag: "Luxury",
    currentGrowth: 10.1,
    predictedGrowth: 14.2,
    confidence: 94,
    desc: "Diplomatic zoning reallocation suggests 15% land value appreciation.",
    chartData: [50, 52, 55, 65, 80, 88]
  },
  {
    id: 3,
    name: "Kinyinya, Gasabo",
    code: "ZONE-KNY-04",
    tag: "Green City",
    currentGrowth: 8.5,
    predictedGrowth: 12.8,
    confidence: 91,
    desc: "Green City infrastructure tender approval confirms long-term stability.",
    chartData: [30, 35, 40, 50, 65, 75]
  },
];

 const MarketMLSection = () => {
  const { t } = useLanguage();
  const [selectedZone, setSelectedZone] = useState(PREDICTIONS[0]);
  const [isScanning, setIsScanning] = useState(false);

  // Simulate a "Scan" effect when switching zones
  useEffect(() => {
    setIsScanning(true);
    const timer = setTimeout(() => setIsScanning(false), 600);
    return () => clearTimeout(timer);
  }, [selectedZone]);

  return (
    <section className="py-24 bg-slate-50 dark:bg-[#0b1221] overflow-hidden border-t border-gray-200 dark:border-gray-800">
      <div className="w-11/12 mx-auto">
        
        {/* ================= HEADER (Tech Style) ================= */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
          <div className="max-w-2xl">
            <motion.div 
               initial={{ opacity: 0, x: -20 }}
               whileInView={{ opacity: 1, x: 0 }}
               viewport={{ once: true }}
               className="flex items-center gap-3 text-primary font-bold mb-3"
            >
               <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded text-[10px] font-mono border border-blue-200 dark:border-blue-800">
                  <Cpu size={12} />
                  <span>MODEL_V.4.2</span>
               </div>
               <span className="uppercase tracking-widest text-xs font-bold">{t('ml.title')}</span>
            </motion.div>
            
            <motion.h2 
               initial={{ opacity: 0, y: 10 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4"
            >
               Predictive <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">Analytics</span>
            </motion.h2>
            
            <p className="text-lg text-gray-500 dark:text-gray-400 font-mono text-sm md:text-base">
               {t('ml.subtitle')}
            </p>
          </div>
          
          <div className="text-right hidden md:block">
             <div className="flex items-center justify-end gap-2 text-green-500 font-mono text-sm mb-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                SYSTEM ONLINE
             </div>
             <p className="text-xs text-gray-400">Last Data Update: 14s ago</p>
          </div>
        </div>


        {/* ================= MAIN DASHBOARD GRID ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           
           {/* --- LEFT: DATA VISUALIZER (5 Cols) --- */}
           <div className="lg:col-span-5 flex flex-col gap-6">
              
              {/* 1. Main Chart Card */}
              <motion.div 
                 className="flex-1 bg-white dark:bg-[#0a162e] rounded-3xl border-2 border-slate-100 dark:border-gray-800 p-6 relative overflow-hidden"
              >
                 {/* Grid Background Pattern */}
                 <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                      style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                 </div>

                 {/* Scanning Overlay Animation */}
                 <AnimatePresence>
                    {isScanning && (
                      <motion.div 
                        initial={{ top: "-10%" }}
                        animate={{ top: "110%" }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6, ease: "linear" }}
                        className="absolute left-0 right-0 h-1 bg-primary/50 shadow-[0_0_20px_rgba(59,130,246,0.5)] z-20"
                      />
                    )}
                 </AnimatePresence>

                 <div className="flex justify-between items-start mb-8 relative z-10">
                    <div>
                       <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Activity size={18} className="text-primary" />
                          Growth Projection
                       </h3>
                       <p className="text-xs text-gray-400 font-mono mt-1">{selectedZone.code}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] text-gray-400 uppercase font-bold">{t('ml.confidence')}</p>
                       <p className="text-2xl font-mono font-bold text-green-600 dark:text-green-400">{selectedZone.confidence}%</p>
                    </div>
                 </div>

                 {/* The Chart */}
                 <div className="flex items-end justify-between h-48 gap-3 relative z-10 pl-2 border-l border-gray-200 dark:border-gray-700 border-b border-gray-200 dark:border-gray-700">
                    {selectedZone.chartData.map((val, i) => {
                       const isPrediction = i === selectedZone.chartData.length - 1;
                       return (
                          <div key={i} className="w-full relative group flex flex-col justify-end h-full">
                             {/* Label */}
                             <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                {val}%
                             </div>
                             
                             {/* The Bar */}
                             <motion.div 
                               initial={{ height: 0 }}
                               animate={{ height: `${val}%` }}
                               transition={{ duration: 0.5, delay: i * 0.05 }}
                               className={clsx(
                                  "w-full rounded-t-sm transition-all duration-300 relative",
                                  isPrediction 
                                    ? "bg-[repeating-linear-gradient(45deg,#3b82f6,#3b82f6_5px,#60a5fa_5px,#60a5fa_10px)] opacity-80" // Striped for prediction
                                    : "bg-slate-800 dark:bg-slate-600"
                               )}
                             >
                                {isPrediction && (
                                   <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rounded-full animate-ping" />
                                )}
                             </motion.div>
                             
                             {/* Axis Label */}
                             <div className="text-[10px] text-center mt-2 text-gray-400 font-mono">
                                {isPrediction ? '2026' : `'2${i+1}`}
                             </div>
                          </div>
                       )
                    })}
                 </div>

                 <div className="mt-4 flex justify-between items-center text-xs font-mono text-gray-500">
                    <div className="flex items-center gap-2">
                       <div className="w-3 h-3 bg-slate-800 dark:bg-slate-600 rounded-sm"></div> {t('ml.historical')}
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="w-3 h-3 bg-blue-400 opacity-80 rounded-sm"></div> {t('ml.predicted')}
                    </div>
                 </div>
              </motion.div>

              {/* 2. Key Metrics Strip */}
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-white dark:bg-[#0a162e] p-5 rounded-2xl border-2 border-slate-100 dark:border-gray-800">
                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Current Yield</p>
                    <p className="text-xl font-mono font-bold text-slate-900 dark:text-white">{selectedZone.currentGrowth}%</p>
                 </div>
                 <div className="bg-primary text-white p-5 rounded-2xl border-2 border-primary relative overflow-hidden">
                    <div className="absolute right-0 top-0 p-2 opacity-20"><TrendingUp size={40}/></div>
                    <p className="text-[10px] uppercase font-bold text-blue-100 mb-1">Predicted Yield</p>
                    <p className="text-xl font-mono font-bold text-white flex gap-2">
                       {selectedZone.predictedGrowth}% <ArrowRight size={16} className="-rotate-45" />
                    </p>
                 </div>
              </div>

           </div>


           {/* --- RIGHT: ZONE TERMINAL LIST (7 Cols) --- */}
           <div className="lg:col-span-7 flex flex-col h-full">
              
              <div className="bg-white dark:bg-[#0a162e] rounded-3xl border-2 border-slate-100 dark:border-gray-800 flex-1 flex flex-col overflow-hidden">
                 <div className="p-4 bg-slate-50 dark:bg-[#112240] border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <span className="text-xs font-mono font-bold text-gray-500">DETECTED_OPPORTUNITIES (3)</span>
                    <Database size={14} className="text-gray-400" />
                 </div>

                 <div className="flex-1 p-2 space-y-2">
                    {PREDICTIONS.map((zone, idx) => {
                       const isSelected = selectedZone.id === zone.id;
                       return (
                          <motion.div
                             key={zone.id}
                             onClick={() => setSelectedZone(zone)}
                             initial={{ x: 20, opacity: 0 }}
                             whileInView={{ x: 0, opacity: 1 }}
                             transition={{ delay: idx * 0.1 }}
                             className={clsx(
                                "group cursor-pointer p-4 md:p-5 rounded-xl border-2 transition-all duration-200 relative overflow-hidden",
                                isSelected 
                                  ? "bg-blue-50/50 dark:bg-blue-900/10 border-primary" 
                                  : "bg-transparent border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                             )}
                          >
                             {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
                             
                             <div className="flex justify-between items-start relative z-10">
                                <div className="flex items-start gap-4">
                                   <div className={clsx(
                                      "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-colors",
                                      isSelected ? "bg-primary text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                                   )}>
                                      {idx + 1}
                                   </div>
                                   <div>
                                      <h4 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                                         {zone.name}
                                         {isSelected && <ScanLine size={14} className="text-primary animate-pulse" />}
                                      </h4>
                                      <div className="flex items-center gap-2 mt-1">
                                         <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-gray-100 dark:bg-gray-800 text-gray-500">
                                            {zone.code}
                                         </span>
                                         <span className="text-xs text-primary font-bold">{zone.tag}</span>
                                      </div>
                                      
                                      <AnimatePresence>
                                         {isSelected && (
                                            <motion.p 
                                              initial={{ height: 0, opacity: 0 }}
                                              animate={{ height: "auto", opacity: 1 }}
                                              exit={{ height: 0, opacity: 0 }}
                                              className="text-sm text-gray-500 dark:text-gray-400 mt-3 font-mono leading-relaxed"
                                            >
                                               {zone.desc}
                                            </motion.p>
                                         )}
                                      </AnimatePresence>
                                   </div>
                                </div>

                                <div className="text-right hidden sm:block">
                                   <p className="text-[10px] uppercase font-bold text-gray-400">Prediction</p>
                                   <p className={clsx(
                                      "text-xl font-mono font-bold",
                                      isSelected ? "text-primary" : "text-gray-400"
                                   )}>
                                      +{zone.predictedGrowth}%
                                   </p>
                                </div>
                             </div>
                          </motion.div>
                       )
                    })}
                 </div>
              </div>

              {/* --- ACTION BUTTONS --- */}
              <div className="mt-6 flex flex-col sm:flex-row gap-4">
                 
                 <motion.button 
                   whileHover={{ scale: 1.02 }}
                   whileTap={{ scale: 0.98 }}
                   className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold font-mono text-sm border-2 border-transparent hover:opacity-90 transition-all"
                 >
                    <Target size={18} />
                    <span>{t('ml.btn.assets')} {selectedZone.name.split(',')[0]}</span>
                 </motion.button>

                 <motion.button 
                   whileHover={{ scale: 1.02 }}
                   whileTap={{ scale: 0.98 }}
                   className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-white dark:bg-[#0a162e] border-2 border-gray-200 dark:border-gray-700 text-slate-700 dark:text-white rounded-xl font-bold font-mono text-sm hover:border-primary hover:text-primary transition-all"
                 >
                    <FileText size={18} />
                    <span>{t('ml.btn.analyze')}</span>
                 </motion.button>

              </div>
           </div>

        </div>
      </div>
    </section>
  );
};
export default MarketMLSection;