import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck, Globe, Moon, Sun, CheckCircle, ArrowLeft } from 'lucide-react';
import { clsx } from 'clsx';
import { translations } from '../langs/alllangs';
import { useLanguage } from '../contexts/language-context';
import { useTheme } from '../contexts/theme-context';

// ==========================================
// 1. TRANSLATION DATA (Your Format)
// ==========================================


type LangKey = keyof typeof translations;

// ==========================================
// 2. MAIN COMPONENT
// ==========================================

// Images for the left slider
const SLIDER_IMAGES = [
    "https://www.karmod.com/media/blog/98/prefab-house-in-rwanda-cover.jpg",
    "https://questforwonder.com/wp-content/uploads/2024/03/top-tourist-spots-in-rwanda-africa.jpg",
    "https://visitrwanda.com/wp-content/uploads/fly-images/1210/Visit-Rwanda-Kigali-Centre-Roads-1920x1281.jpg",
];

export const LoginPage = () => {
    // -- State --
    const { t } = useLanguage(); // Get translation function
    const [currentLang, setCurrentLang] = useState<LangKey>();
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const { theme, toggleTheme } = useTheme();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // -- Refs for Click Outside --
    const langMenuRef = useRef<HTMLDivElement>(null);

    // -- Effect: Handle Click Outside Language Menu --
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
                setIsLangMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // -- Effect: Slider Timer --
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % SLIDER_IMAGES.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setTimeout(() => setIsLoading(false), 2000);
    };

    return (
        <div className="min-h-screen w-full flex bg-gray-50 dark:bg-[#0a162e] text-slate-900 dark:text-white transition-colors duration-300 font-sans overflow-hidden">

            {/* ================= LEFT SIDE: SLIDER (Desktop Only) ================= */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-foreground/90 dark:bg-background">

                {/* Animated Background Slider */}
                <AnimatePresence mode="popLayout">
                    <motion.img
                        key={currentImageIndex}
                        src={SLIDER_IMAGES[currentImageIndex]}
                        alt="SafeLand Property"
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 0.6, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.5 }}
                        className="absolute inset-0 w-full h-full object-cover mix-blend-overlay"
                    />
                </AnimatePresence>

                {/* Gradient Overlay */}
                {/* <div className="absolute inset-0 bg-gradient-to-t from-[#0a162e] via-[#0a162e]/30 to-[#0a162e]/0 z-10" /> */}

                {/* Content Layer */}
                <div className="relative z-20 flex flex-col justify-between p-16 h-full text-white">

                    {/* Logo (Left Top) */}
                    <div className="h-12 w-auto opacity-90">
                        <div className="flex items-center gap-2 h-12">
                            <img
                                src="/logo_words.png"
                                alt="SafeLand"
                                className="h-full object-contain brightness-0 invert"
                            />
                        </div>
                    </div>

                    {/* Hero Text */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="max-w-xl space-y-6"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/40 border border-primary/50 text-blue-100 text-xs font-semibold uppercase tracking-wider backdrop-blur-md shadow-lg">
                            <ShieldCheck size={14} />
                            <span>NLA Verified Platform</span>
                        </div>

                        <h2 className="text-4xl md:text-5xl font-bold leading-tight drop-shadow-lg">
                            {t('auth.login.heroTitle')}
                        </h2>

                        <p className="text-lg text-gray-200 leading-relaxed font-light drop-shadow-md">
                            {t('auth.login.heroSubtitle')}
                        </p>

                        {/* Slider Indicators */}
                        <div className="flex gap-2 pt-6">
                            {SLIDER_IMAGES.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={clsx(
                                        "h-1 rounded-full transition-all duration-500",
                                        idx === currentImageIndex ? "w-8 bg-primary" : "w-2 bg-white/30"
                                    )}
                                />
                            ))}
                        </div>
                    </motion.div>

                    {/* Copyright */}
                    <div className="text-xs text-gray-400 flex justify-between items-center border-t border-white/10 pt-6">
                        <span>© {new Date().getFullYear()} SafeLand Rwanda</span>
                        <div className="flex gap-4">
                            <a href="/" className="hover:text-white transition-colors">Back To Home</a>
                            <a href="#" className="hover:text-white transition-colors">Privacy</a>
                            <a href="#" className="hover:text-white transition-colors">Terms</a>
                        </div>
                    </div>
                </div>
            </div>


            {/* ================= RIGHT SIDE: LOGIN FORM ================= */}
            <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 relative">

                {/* --- TOP CONTROLS --- */}
                <div className="absolute top-6 right-6 flex items-center gap-3 z-30">

                    {/* LANGUAGE TOGGLE (CLICK-BASED) */}
                    <div className="relative" ref={langMenuRef}>
                        <button
                            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                            className={clsx(
                                "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm font-medium shadow-sm",
                                isLangMenuOpen
                                    ? "bg-primary text-white border-primary" // Active State
                                    : "bg-white dark:bg-[#112240] border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-primary/50"
                            )}
                        >
                            <Globe size={16} />
                            <span className="uppercase">{currentLang}</span>
                        </button>

                        {/* The Menu - Conditional Rendering based on state, NOT hover */}
                        <AnimatePresence>
                            {isLangMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute right-0 top-full mt-2 w-32 bg-white dark:bg-[#112240] rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50"
                                >
                                    {(['EN', 'FR', 'KIN'] as const).map((l) => (
                                        <button
                                            key={l}
                                            onClick={() => {
                                                setCurrentLang(l);
                                                setIsLangMenuOpen(false); // Close on select
                                            }}
                                            className={clsx(
                                                "w-full text-left px-4 py-3 text-sm transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0",
                                                currentLang === l
                                                    ? "bg-primary/5 text-primary font-bold"
                                                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                                            )}
                                        >
                                            {l === 'KIN' ? 'Kinyarwanda' : l === 'FR' ? 'Français' : 'English'}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* THEME TOGGLE */}
                    <button
                        onClick={toggleTheme}
                        className="p-2.5 rounded-lg bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-primary hover:border-primary/50 transition-all shadow-sm"
                    >
                        {theme ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                </div>


                {/* --- MAIN FORM CONTENT --- */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                    className="w-full max-w-lg space-y-8"
                >
                    {/* Responsive Logo Header */}
                    <div className="text-center space-y-4">
                        <div className="flex justify-center mb-6">
                            <div className="flex items-center gap-2 h-16 px-2">
                                {/* Logo inverts perfectly in dark mode */}
                                <img
                                    src="/logo_words.png"
                                    alt="SafeLand Rwanda Logo"
                                    className="h-full object-contain transition-all duration-300 dark:brightness-0 dark:invert"
                                />
                            </div>
                        </div>

                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-secondary dark:text-white">
                                {t('auth.login.welcomeBack')}
                            </h1>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                {t('auth.login.enterDetails')}
                            </p>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-5">

                        {/* Email Field */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">
                                {t('auth.login.emailLabel')}
                            </label>
                            <div className="relative group">
                                <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center text-gray-400 group-focus-within:text-primary transition-colors pointer-events-none">
                                    <Mail size={20} />
                                </div>
                                <input
                                    type="email"
                                    placeholder="admin@safeland.rw"
                                    className="w-full bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white pl-12 pr-4 py-5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all group-hover:border-gray-300 dark:group-hover:border-gray-600"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    {t('auth.login.passwordLabel')}
                                </label>
                                <a href="/forgot-password" className="text-xs font-semibold text-primary hover:text-blue-500 transition-colors">
                                    {t('auth.login.forgotPassword')}
                                </a>
                            </div>
                            <div className="relative group">
                                <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center text-gray-400 group-focus-within:text-primary transition-colors pointer-events-none">
                                    <Lock size={20} />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    className="w-full bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white pl-12 pr-12 py-5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all group-hover:border-gray-300 dark:group-hover:border-gray-600"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-0 top-0 bottom-0 w-12 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {/* Remember Me */}
                        <div className="flex items-center pt-1">
                            <label className="flex items-center cursor-pointer group">
                                <div className="relative">
                                    <input
                                        id="remember"
                                        type="checkbox"
                                        className="peer sr-only"
                                    />
                                    <div className="h-5 w-5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-primary peer-checked:bg-primary peer-checked:border-primary transition-all flex items-center justify-center">
                                        <CheckCircle size={12} className="text-white opacity-0 peer-checked:opacity-100 transform scale-50 peer-checked:scale-100 transition-all" />
                                    </div>
                                </div>
                                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors">
                                    {t('auth.login.rememberMe')}
                                </span>
                            </label>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={clsx(
                                "w-full bg-primary cursor-pointer hover:bg-[#2d4a75] text-white font-bold py-5 rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-[0.98] transition-all flex justify-center items-center gap-2 mt-4",
                                isLoading && "opacity-80 cursor-wait"
                            )}
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>{t('auth.login.submitButton')}</span>
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer Register Link */}
                    <div className="pt-2 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('auth.login.noAccount')}{" "}
                            <a href="/register" className="font-bold text-primary hover:text-blue-500 hover:underline transition-colors">
                                {t('auth.login.registerLink')}
                            </a>
                        </p>
                    </div>
                </motion.div>
                {/*-- back to home link --*/}
                <div className="absolute bottom-6 left-6 text-sm text-gray-500 hover:text-primary transition-colors">
                    <a href="/" className="flex items-center gap-1">
                        <ArrowLeft size={14} />
                        Back to Home
                    </a>
                </div>
            </div>
        </div>
    );
};