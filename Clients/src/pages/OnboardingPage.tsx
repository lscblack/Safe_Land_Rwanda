import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, Wallet, TrendingUp, Lock, Sun, Moon } from 'lucide-react';

import { useTheme } from '../contexts/theme-context';
import { markOnboardingSeen } from '../components/security/useOnboardingCheck';
import { SafeCaptcha } from '../components/security/SafeCaptcha';

export const OnboardingPage = () => {
    const navigate = useNavigate();
    const [isHuman, setIsHuman] = useState(false);
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    const handleGetStarted = () => {
        if (!isHuman) return;
        markOnboardingSeen(); // Sets the secure, signed timestamp
        navigate('/home');
    };

    const features = [
        { icon: ShieldCheck, title: "Verified Land", desc: "NLA Integration" },
        { icon: Wallet, title: "Transactions", desc: "Blockchain Locking" },
        { icon: TrendingUp, title: "AI Insights", desc: "Smart Valuation" },
    ];

    return (
        <div className="min-h-screen w-full transition-colors duration-500 bg-gray-100 dark:bg-[#020617] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">

            {/* --- THEME TOGGLE (Top Right) --- */}
            <div className="absolute top-6 right-6 z-50">
                <button
                    onClick={toggleTheme}
                    className="p-3 rounded-full bg-white dark:bg-white/10 shadow-lg border border-gray-100 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/20 transition-all text-slate-600 dark:text-white backdrop-blur-md"
                >
                    {isDark ? <Sun size={20} /> : <Moon size={20} />}
                </button>
            </div>

            {/* --- BACKGROUND AMBIENCE (Backdrop) --- */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden transition-opacity duration-500">
                {/* Darker/Blurred Backdrop Effect */}
                <div className="absolute inset-0 bg-white/50 dark:bg-black/40 backdrop-blur-sm z-0"></div>
                
                {/* Orbs */}
                <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-500/20 dark:bg-primary/20 rounded-full blur-[120px] -translate-x-1/4 -translate-y-1/4 mix-blend-multiply dark:mix-blend-normal animate-pulse"></div>
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-500/20 dark:bg-purple-600/20 rounded-full blur-[120px] translate-x-1/4 translate-y-1/4 mix-blend-multiply dark:mix-blend-normal animate-pulse"></div>

                {/* Tech Grid Pattern */}
                <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
                    style={{ backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)', backgroundSize: '40px 40px' }}
                />
            </div>

            {/* --- POPUP CARD CONTAINER --- */}
            <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", duration: 0.8, bounce: 0.3 }}
                className="relative z-10 w-full max-w-[440px] bg-white/80 dark:bg-[#0f1f3a]/80 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-[2.5rem] shadow-2xl shadow-blue-900/10 dark:shadow-black/60 p-8 sm:p-10 flex flex-col items-center text-center space-y-8"
            >
                
                {/* Animated Logo Container */}
                <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
                    className="w-20 h-20 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl flex items-center justify-center shadow-lg dark:shadow-inner"
                >
                    <img
                        src="/logo_icon.png"
                        alt="SafeLand"
                        className="w-full h-full object-contain scale-150 transition-all duration-300 dark:brightness-0 dark:invert"
                    />
                </motion.div>

                {/* Text Content */}
                <div className="space-y-3">
                    <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight"
                    >
                        SafeLand Access
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-sm text-slate-500 dark:text-blue-100/70 font-medium leading-relaxed px-4"
                    >
                        Complete security verification to access Rwanda's verified real estate marketplace.
                    </motion.p>
                </div>

                {/* Features Grid (Compact) */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="w-full grid grid-cols-3 gap-2"
                >
                    {features.map((f, i) => (
                        <div key={i} className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex flex-col items-center gap-2">
                            <f.icon size={18} className="text-primary" />
                            <p className="font-bold text-[10px] text-slate-700 dark:text-gray-300">{f.title}</p>
                        </div>
                    ))}
                </motion.div>

                {/* --- SECURITY CHECK SECTION --- */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="w-full space-y-6 pt-2"
                >
                    {/* The Captcha Widget */}
                    <div className="flex justify-center w-full transform scale-95 origin-top">
                        <SafeCaptcha
                            onVerify={(val) => setIsHuman(val)}
                            className="bg-white dark:bg-[#0a162e] border-gray-200 dark:border-gray-600 shadow-inner"
                        />
                    </div>

                    {/* The Main Action Button (Pop-up Animation) */}
                    <div className="h-14 relative w-full">
                        <AnimatePresence mode="wait">
                            {isHuman ? (
                                <motion.button
                                    key="enter-btn"
                                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                                    onClick={handleGetStarted}
                                    className="w-full py-3.5 bg-primary hover:bg-[#2d4a75] text-white font-bold rounded-xl shadow-lg shadow-primary/30 flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
                                >
                                    <span>Enter Marketplace</span>
                                    <ArrowRight size={18} />
                                </motion.button>
                            ) : (
                                <motion.div
                                    key="locked-btn"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="w-full py-3.5 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-400 dark:text-gray-500 font-bold rounded-xl flex items-center justify-center gap-2 cursor-not-allowed text-sm"
                                >
                                    <Lock size={16} />
                                    <span>Locked</span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>

            </motion.div>
        </div>
    );
};