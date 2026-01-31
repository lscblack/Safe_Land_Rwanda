import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mail, ArrowLeft, ArrowRight, Globe, Moon, Sun,
    ShieldCheck, CheckCircle, KeyRound
} from 'lucide-react';
import { clsx } from 'clsx';
import { translations } from '../langs/alllangs';
import { useLanguage } from '../contexts/language-context';
import { useTheme } from '../contexts/theme-context';

type LangKey = keyof typeof translations;

// Background Images (Consistent with Login/Register)
const SLIDER_IMAGES = [
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=2070&auto=format&fit=crop",
    "https://www.karmod.com/media/blog/98/prefab-house-in-rwanda-cover.jpg",
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop",
];

export const ForgotPasswordPage = () => {
    // -- Global State --
    const [currentLang, setCurrentLang] = useState<LangKey>();
    const { t } = useLanguage(); // Get translation function
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const { theme, toggleTheme } = useTheme();
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // -- Form State --
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // -- Refs --
    const langMenuRef = useRef<HTMLDivElement>(null);



    // -- Effects --
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
                setIsLangMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % SLIDER_IMAGES.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // Simulate API Call
        setTimeout(() => {
            setIsLoading(false);
            setIsSuccess(true);
        }, 2000);
    };

    return (
        <div className="min-h-screen w-full flex bg-gray-50 dark:bg-[#0a162e] text-slate-900 dark:text-white transition-colors duration-300 font-sans overflow-hidden">

            {/* ================= LEFT SIDE: SLIDER ================= */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-foreground/90 dark:bg-background">
                <AnimatePresence mode="popLayout">
                    <motion.img
                        key={currentImageIndex}
                        src={SLIDER_IMAGES[currentImageIndex]}
                        alt="SafeLand Context"
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 0.6, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.5 }}
                        className="absolute inset-0 w-full h-full object-cover mix-blend-overlay"
                    />
                </AnimatePresence>

                <div className="relative z-20 flex flex-col justify-between p-16 h-full text-white">
                    <div className="h-12 w-auto opacity-90">
                        <div className="flex items-center gap-2 h-12">
                            <img src="/logo_words.png" alt="SafeLand" className="h-full object-contain brightness-0 invert" />
                        </div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="max-w-xl space-y-6"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/40 border border-primary/50 text-blue-100 text-xs font-semibold uppercase tracking-wider backdrop-blur-md shadow-lg">
                            <ShieldCheck size={14} />
                            <span>Account Security</span>
                        </div>

                        <h2 className="text-4xl md:text-5xl font-bold leading-tight drop-shadow-lg">
                            {t('auth.forgot.title')}
                        </h2>

                        <p className="text-lg text-gray-200 leading-relaxed font-light drop-shadow-md">
                            {t('auth.forgot.subtitle')}
                        </p>

                        <div className="flex gap-2 pt-6">
                            {SLIDER_IMAGES.map((_, idx) => (
                                <div key={idx} className={clsx("h-1 rounded-full transition-all duration-500", idx === currentImageIndex ? "w-8 bg-primary" : "w-2 bg-white/30")} />
                            ))}
                        </div>
                    </motion.div>

                    <div className="text-xs text-gray-400 flex justify-between items-center border-t border-white/10 pt-6">
                        <span>© {new Date().getFullYear()} SafeLand Rwanda</span>
                    </div>
                </div>
            </div>


            {/* ================= RIGHT SIDE: FORM ================= */}
            <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 relative">

                {/* --- CONTROLS --- */}
                <div className="absolute top-6 right-6 flex items-center gap-3 z-30">
                    {/* Language */}
                    <div className="relative" ref={langMenuRef}>
                        <button
                            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                            className={clsx("flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm font-medium shadow-sm", isLangMenuOpen ? "bg-primary text-white border-primary" : "bg-white dark:bg-[#112240] border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-primary/50")}
                        >
                            <Globe size={16} />
                            <span className="uppercase">{currentLang}</span>
                        </button>
                        <AnimatePresence>
                            {isLangMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                    className="absolute right-0 top-full mt-2 w-32 bg-white dark:bg-[#112240] rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50"
                                >
                                    {(['EN', 'FR', 'KIN'] as const).map((l) => (
                                        <button key={l} onClick={() => { setCurrentLang(l); setIsLangMenuOpen(false); }} className={clsx("w-full text-left px-4 py-3 text-sm transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0", currentLang === l ? "bg-primary/5 text-primary font-bold" : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5")}>
                                            {l === 'KIN' ? 'Kinyarwanda' : l === 'FR' ? 'Français' : 'English'}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    {/* Theme */}
                    <button onClick={toggleTheme} className="p-2.5 rounded-lg bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-primary hover:border-primary/50 transition-all shadow-sm">
                        {theme ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                </div>


                {/* --- MAIN CONTENT AREA --- */}
                <AnimatePresence mode="wait">
                    {!isSuccess ? (
                        // >>> STATE 1: INPUT FORM <<<
                        <motion.div
                            key="form"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95, y: -20 }}
                            className="w-full max-w-lg space-y-8"
                        >
                            {/* Header */}
                            <div className="text-center space-y-4">
                                <div className="flex justify-center mb-6">
                                    <div className="w-16 h-16 bg-primary/10 dark:bg-white/5 rounded-2xl flex items-center justify-center text-primary">
                                        <KeyRound size={32} />
                                    </div>
                                </div>
                                <h1 className="text-3xl font-bold tracking-tight text-secondary dark:text-white">
                                    {t('auth.forgot.title')}
                                </h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                                    {t('auth.forgot.subtitle')}
                                </p>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">
                                        {t('auth.forgot.emailLabel')}
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center text-gray-400 group-focus-within:text-primary transition-colors pointer-events-none">
                                            <Mail size={20} />
                                        </div>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="lscblack@safeland.rw"
                                            className="w-full bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white pl-12 pr-4 py-5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all group-hover:border-gray-300 dark:group-hover:border-gray-600"
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className={clsx(
                                        "w-full bg-primary hover:bg-[#2d4a75] text-white font-bold py-4 rounded-xl shadow-primary/25 hover:shadow-primary/40 active:scale-[0.98] transition-all flex justify-center items-center gap-2",
                                        isLoading && "opacity-80 cursor-wait"
                                    )}
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <span>{t('auth.forgot.submit')}</span>
                                            <ArrowRight size={20} />
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Footer */}
                            <div className="text-center">
                                <a href="/login" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-primary transition-colors">
                                    <ArrowLeft size={16} />
                                    {t('auth.forgot.backToLogin')}
                                </a>
                            </div>
                        </motion.div>
                    ) : (
                        // >>> STATE 2: SUCCESS CONFIRMATION <<<
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-full max-w-md text-center space-y-6"
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                                className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto text-green-600 dark:text-green-400"
                            >
                                <CheckCircle size={40} />
                            </motion.div>

                            <div className="space-y-2">
                                <h2 className="text-3xl font-bold text-secondary dark:text-white">
                                    {t('auth.forgot.successTitle')}
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400">
                                    {t('auth.forgot.successSubtitle')} <span className="font-semibold text-secondary dark:text-white">{email}</span>
                                </p>
                            </div>

                            <div className="pt-4 space-y-4">
                                <a
                                    href="/login"
                                    className="block w-full bg-primary hover:bg-[#2d4a75] text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/25 transition-all"
                                >
                                    {t('auth.forgot.backToLogin')}
                                </a>

                                <p className="text-xs text-gray-400">
                                    {t('auth.forgot.resend')} <button onClick={() => setIsSuccess(false)} className="text-primary font-bold hover:underline">{t('auth.forgot.resendLink')}</button>
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};