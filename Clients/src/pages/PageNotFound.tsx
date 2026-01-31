import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Home, Search, HelpCircle, Globe, Moon, Sun,
    MapPin
} from 'lucide-react';
import { clsx } from 'clsx';
import { translations } from '../langs/alllangs';
import { useLanguage } from '../contexts/language-context';
import { useTheme } from '../contexts/theme-context';

type LangKey = keyof typeof translations;

export const NotFoundPage = () => {
    // -- Global State --
    const [currentLang, setCurrentLang] = useState<LangKey>();
    const { t } = useLanguage(); // Get translation function
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const { theme, toggleTheme } = useTheme();
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



    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-[#0a162e] text-slate-900 dark:text-white transition-colors duration-300 font-sans relative overflow-hidden">

            {/* ================= BACKGROUND DECORATION ================= */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Large Faint Logo Watermark */}
                <div className="absolute -top-20 -left-20 opacity-[0.03] dark:opacity-[0.05] rotate-12">
                    <img src="/logo_icon.png" className="w-[500px] h-[500px]" alt="" />
                </div>
                <div className="absolute bottom-0 right-0 w-full h-1/3 bg-gradient-to-t from-gray-200/50 dark:from-[#050c1a] to-transparent" />
            </div>

            {/* ================= TOP CONTROLS (Floating) ================= */}
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

            {/* ================= MAIN CONTENT ================= */}
            <div className="relative z-10 w-full max-w-4xl px-6 text-center">

                {/* Animated 404 Visual */}
                <div className="relative w-64 h-64 mx-auto mb-8 flex items-center justify-center">
                    {/* Pulsing Radar Rings */}
                    <motion.div
                        animate={{ scale: [1, 1.5, 2], opacity: [0.5, 0.2, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                        className="absolute w-32 h-32 rounded-full border-2 border-primary/30"
                    />
                    <motion.div
                        animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                        className="absolute w-32 h-32 rounded-full border-2 border-primary/50"
                    />

                    {/* Central Map Icon */}
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ type: "spring", bounce: 0.5 }}
                        className="relative z-10 bg-white dark:bg-[#112240] p-6 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700"
                    >
                        <MapPin size={64} className="text-gray-300 dark:text-gray-600" />
                        {/* Floating Question Mark */}
                        <motion.div
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white w-10 h-10 rounded-full flex items-center justify-center border-4 border-gray-50 dark:border-[#0a162e]"
                        >
                            <span className="font-bold text-lg">?</span>
                        </motion.div>
                    </motion.div>

                    {/* Big 404 Text behind */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[180px] font-black text-gray-100 dark:text-white/5 -z-10 select-none tracking-tighter">
                        404
                    </div>
                </div>

                {/* Text */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-4 mb-10"
                >
                    <h1 className="text-4xl md:text-5xl font-bold text-secondary dark:text-white">
                        {t('error.404.title')}
                    </h1>
                    <p className="text-lg text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
                        {t('error.404.subtitle')}
                    </p>
                </motion.div>

                {/* Action Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4"
                >
                    {/* Primary: Go Home */}
                    <a
                        href="/"
                        className="w-full sm:w-auto px-8 py-3.5 bg-primary hover:bg-[#2d4a75] text-white rounded-xl font-bold shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2"
                    >
                        <Home size={18} />
                        <span>{t('error.404.backHome')}</span>
                    </a>

                    {/* Secondary Group */}
                    <div className="flex gap-4 w-full sm:w-auto">
                        <a
                            href="/search"
                            className="flex-1 sm:flex-none px-6 py-3.5 bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-semibold hover:border-primary/50 transition-all flex items-center justify-center gap-2"
                        >
                            <Search size={18} />
                            <span>{t('error.404.search')}</span>
                        </a>
                        <a
                            href="/support"
                            className="flex-1 sm:flex-none px-6 py-3.5 bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-semibold hover:border-primary/50 transition-all flex items-center justify-center gap-2"
                        >
                            <HelpCircle size={18} />
                            <span className="hidden sm:inline">{t('error.404.support')}</span>
                        </a>
                    </div>
                </motion.div>

            </div>

            {/* Footer Branding */}
            <div className="absolute bottom-8 text-center w-full">
                <div className="flex items-center justify-center gap-2 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                    <img src="/logo_icon.png" className="w-6 h-6" alt="Logo" />
                    <span className="font-bold text-gray-400 dark:text-gray-600 tracking-widest text-sm">SAFELAND</span>
                </div>
            </div>

        </div>
    );
};