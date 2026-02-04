import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, AlertTriangle, XCircle,
  Link, Lock, BrainCircuit, UserCheck, CheckCircle2,
  Ban, Gavel
} from 'lucide-react';
import { clsx } from 'clsx';
import { useLanguage } from '../../contexts/language-context';

const FeaturesSection = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState(0);

  // --- NLA SIMULATION STATE ---
  const [nlaState, setNlaState] = useState(0);
  useEffect(() => {
    if (activeTab === 0) {
      const interval = setInterval(() => {
        setNlaState((prev) => (prev + 1) % 3);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const features = [
    {
      id: 0,
      title: "NLA Verification",
      subtitle: "Official Data Sync",
      desc: "We cross-reference every specific UPI directly with the National Land Authority registry to detect ownership mismatches and hidden mortgages instantly.",
      icon: ShieldCheck,
      visual: (
        <div className="relative h-full flex flex-col items-center justify-center p-6 md:p-10">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between w-full max-w-sm border-b border-gray-200 dark:border-gray-700 pb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">NLA Live Feed</span>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-[10px] font-mono text-gray-400">SYNC_ACTIVE</span>
            </div>
          </div>

          {/* The List of Scenarios */}
          <div className="w-full max-w-sm space-y-3">

            {/* 1. SUCCESS CASE */}
            <motion.div
              initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }}
              className="bg-white dark:bg-[#112240] p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-green-50 dark:bg-green-900/20 rounded text-green-600">
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">UPI 2/04/05/03/124</p>
                  <p className="text-[10px] text-gray-500">Owner Match Confirmed</p>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-[10px] font-bold rounded">
                VALID
              </span>
            </motion.div>

            {/* 2. MORTGAGE CASE */}
            <motion.div
              initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}
              className="bg-white dark:bg-[#112240] p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between opacity-70"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-amber-50 dark:bg-amber-900/20 rounded text-amber-600">
                  <Gavel size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">UPI 1/03/08/04/420</p>
                  <p className="text-[10px] text-gray-500">Encumbrance Found</p>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded">
                CAVEAT
              </span>
            </motion.div>

            {/* 3. FRAUD CASE */}
            <motion.div
              initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }}
              className="bg-white dark:bg-[#112240] p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-red-50 dark:bg-red-900/20 rounded text-red-600">
                  <Ban size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">UPI 5/01/00/00/000</p>
                  <p className="text-[10px] text-gray-500">ID Mismatch</p>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 text-[10px] font-bold rounded">
                REJECTED
              </span>
            </motion.div>
            {/* 3. Transaction */}
            <motion.div
              initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }}
              className="bg-white dark:bg-[#112240] p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-red-50 dark:bg-red-900/20 rounded text-red-600">
                  <Ban size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">UPI 5/00/00/00/000</p>
                  <p className="text-[10px] text-gray-500">On Going Transactions</p>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-red-900/40 text-blue-700 dark:text-blue-400 text-[10px] font-bold rounded">
                IN PROCESS
              </span>
            </motion.div>

          </div>
        </div>
      )
    },
    {
      id: 1,
      title: "Blockchain Ledger",
      subtitle: "Anti-Double Selling",
      desc: "Our decentralized ledger locks the property instantly upon agreement. Even if an owner tries to resell it won't work, the system rejects the duplicate transfer.",
      icon: Link,
      visual: (
        <div className="relative h-full flex flex-col items-center justify-center p-8">
          <div className="relative">
            {/* Chain Links Animation */}
            <div className="flex flex-col gap-2 items-center">
              <motion.div
                animate={{ borderColor: ["#395d91", "#60a5fa", "#395d91"] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-64 p-4 bg-white dark:bg-[#112240] border-2 border-primary rounded-xl shadow-lg z-20 text-center"
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Lock size={16} className="text-primary" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Smart Contract Active</span>
                </div>
                <p className="font-mono text-[10px] text-slate-500 mb-2">Hash: 0x8F... Locked</p>
                <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-full animate-pulse" />
                </div>
              </motion.div>

              {/* Connection Line */}
              <div className="h-8 w-0.5 bg-primary/30"></div>

              <div className="w-64 p-4 bg-gray-50 dark:bg-[#0a162e] border border-gray-200 dark:border-gray-700 rounded-xl text-center opacity-60 grayscale relative overflow-hidden">
                <div className="absolute inset-0 bg-red-500/5 z-0"></div>
                <p className="font-bold text-slate-500 text-xs relative z-10">Concurrent Sale Attempt</p>
                <p className="text-[10px] text-red-600 font-bold mt-1 relative z-10 flex items-center justify-center gap-1">
                  <Ban size={10} /> REJECTED: ASSET LOCKED
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 2,
      title: "AI Risk Analysis",
      subtitle: "Smart Investment",
      desc: "Don't invest blindly. Our AI scans zoning laws and infrastructure plans to warn you about 'Bad Investments' (e.g., road expansions) before you commit helps you know best places to invest in.",
      icon: BrainCircuit,
      visual: (
        <div className="relative h-full flex items-center justify-center">
          <div className="w-full max-w-xs bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 p-5 rounded-xl shadow-lg">
            <div className="flex items-center gap-3 mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="p-1.5 bg-primary/10 rounded text-primary"><BrainCircuit size={18} /></div>
              <div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-white">SafeLand AI</h4>
                <p className="text-[10px] text-gray-500">Risk Assessment</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-xs items-center">
                <span className="text-gray-500">Zoning</span>
                <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle2 size={10} /> R1-Residential</span>
              </div>
              <div className="flex justify-between text-xs items-center">
                <span className="text-gray-500">Valuation</span>
                <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle2 size={10} /> Fair Market</span>
              </div>
              <div className="flex justify-between text-xs items-center">
                <span className="text-gray-500">Market Trends</span>
                <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle2 size={10} /> Shows Best Places to invest in</span>
              </div>
              <div className="flex justify-between text-xs items-center p-2 bg-red-50 dark:bg-red-900/10 rounded border border-red-100 dark:border-red-900/30">
                <span className="text-red-800 dark:text-red-400 font-medium">Infrastructure</span>
                <span className="text-red-600 font-bold flex items-center gap-1"><AlertTriangle size={10} /> Road Conflict</span>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: "Certified Agents",
      subtitle: "Verified Licenses",
      desc: "We verify every agent's license with the Valid certiface. No unlicensed middlemen, no 'commission chasers', just certified professionals.",
      icon: UserCheck,
      visual: (
        <div className="relative h-full flex items-center justify-center p-6">
          <div className="relative w-full grid grid-cols-1 gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((_, i) => (
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-white dark:bg-[#112240] p-4 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 flex items-center gap-4 relative z-10"
              >
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xs border-2 border-primary">JD</div>
                <div
                  key={i}>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">Jean Doe</h4>
                  <p className="text-[10px] text-gray-500">Kigali Prime Estates</p>
                  <span className="inline-flex items-center gap-1 text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded mt-1 font-bold">
                    <CheckCircle2 size={10} /> Valid Certificate
                  </span>
                </div>
              </motion.div>
            ))}

            {/* Blocked Scammer */}
            <div className="absolute top-10 left-4 right-4 bg-gray-50 dark:bg-black/40 p-4 rounded-xl border border-red-100 dark:border-red-900/50 flex items-center gap-4 -z-10 opacity-60 scale-95 grayscale">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center"><Ban size={16} className="text-gray-400" /></div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-500 text-xs">Unlicensed User</h4>
                <span className="text-[10px] text-red-500 font-bold mt-1 block">LICENSE MISSING</span>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <section className="py-24 bg-white dark:bg-[#050c1a] overflow-hidden">
      <div className="w-11/12 mx-auto">

        {/* HEADER */}
        <div className="mb-16 md:text-center max-w-3xl md:mx-auto">
          <span className="text-primary font-bold tracking-widest text-xs uppercase mb-2 block">
            The SafeLand Standard
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
            Trust Through <span className="text-primary">Transparency</span>
          </h2>
          <p className="text-lg text-gray-500 dark:text-gray-400 leading-relaxed">
            Eliminating fraud with Government Data, Blockchain, and AI.
          </p>
        </div>

        {/* MAIN LAYOUT SPLIT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

          {/* --- LEFT: NAVIGATION GRID (2-Col on Desktop) --- */}
          {/* Added lg:col-span-6 to give space for the 2x2 grid */}
          <div className="lg:col-span-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, idx) => (
              <button
                key={feature.id}
                onClick={() => setActiveTab(idx)}
                className={clsx(
                  "text-left p-5 rounded-xl transition-all duration-200 border relative overflow-hidden flex flex-col h-full",
                  activeTab === idx
                    ? "bg-primary/5 dark:bg-[#0a162e] border-primary shadow-sm"
                    : "bg-white dark:bg-transparent border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                )}
              >
                <div className={clsx(
                  "w-10 h-10 rounded-lg flex items-center justify-center mb-4 transition-colors",
                  activeTab === idx ? "bg-primary text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                )}>
                  <feature.icon size={20} />
                </div>

                <h3 className={clsx(
                  "text-base font-bold mb-1 transition-colors",
                  activeTab === idx ? "text-primary" : "text-slate-900 dark:text-white"
                )}>
                  {feature.title}
                </h3>

                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                  {feature.subtitle}
                </p>

                <p className={clsx(
                  "text-sm leading-relaxed transition-all mt-auto",
                  activeTab === idx ? "text-gray-600 dark:text-gray-300" : "text-gray-400 opacity-80"
                )}>
                  {feature.desc}
                </p>
              </button>
            ))}
          </div>


          {/* --- RIGHT: DYNAMIC VISUAL DASHBOARD --- */}
          <div className="lg:col-span-6 h-full min-h-[450px]">
            <div className="relative h-full w-full bg-slate-50 dark:bg-[#0a162e] rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">

              {/* Dashboard Header */}
              <div className="absolute top-0 left-0 right-0 h-10 bg-white dark:bg-[#112240] border-b border-gray-200 dark:border-gray-700 flex items-center px-4 justify-between z-10">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-600" />
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-600" />
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400 uppercase">
                  <Lock size={10} /> Secure_Environment_V1.0
                </div>
              </div>

              {/* Content Area */}
              <div className="pt-10 h-full flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="w-full h-full"
                  >
                    {features[activeTab].visual}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Background Grid Pattern */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

export default FeaturesSection;