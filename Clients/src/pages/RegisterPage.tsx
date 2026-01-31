import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mail, User, Phone, Upload,
    CreditCard, ArrowRight, ArrowLeft, Globe, Moon, Sun,
    CheckCircle, ShieldCheck,
} from 'lucide-react';
import { clsx } from 'clsx';
import ReactFlagsSelect from "react-flags-select"; // The library you requested
import { translations } from '../langs/alllangs';
import { useLanguage } from '../contexts/language-context';
import { useTheme } from '../contexts/theme-context';

// Define types based on your setup
type LangKey = keyof typeof translations;
type IdType = 'nid' | 'passport' | null;

// Background Images
const SLIDER_IMAGES = [
    "https://www.karmod.com/media/blog/98/prefab-house-in-rwanda-cover.jpg",
    "https://questforwonder.com/wp-content/uploads/2024/03/top-tourist-spots-in-rwanda-africa.jpg",
    "https://visitrwanda.com/wp-content/uploads/fly-images/1210/Visit-Rwanda-Kigali-Centre-Roads-1920x1281.jpg",
];

export const RegisterPage = () => {
    // -- Global UI State --
    const { t } = useLanguage(); // Get translation function
    const [currentLang, setCurrentLang] = useState<LangKey>();
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const { theme, toggleTheme } = useTheme();
    // -- Form State --
    const [step, setStep] = useState<1 | 2>(1);
    const [idType, setIdType] = useState<IdType>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [passportPreview, setPassportPreview] = useState<string | null>(null);

    // -- Country Select State --
    const [selectedCountry, setSelectedCountry] = useState("RW");
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


    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setPassportPreview(url);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setTimeout(() => setIsLoading(false), 2000);
    };

    const handleStep1Continue = () => {
        if (idType) setStep(2);
    };

    // -- Animation Variants --
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        },
        exit: { opacity: 0, x: -20 }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <div className="min-h-screen w-full flex bg-gray-50 dark:bg-[#0a162e] text-slate-900 dark:text-white transition-colors duration-300 font-sans overflow-hidden">

            {/* ================= LEFT SIDE: VISUALS ================= */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-foreground/90 dark:bg-background">
                <AnimatePresence mode="popLayout">
                    <motion.img
                        key={currentImageIndex}
                        src={SLIDER_IMAGES[currentImageIndex]}
                        alt="Rwanda Context"
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
                            <span>Secure Registration</span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-bold leading-tight drop-shadow-lg">{t('auth.register.title')}</h2>
                        <p className="text-lg text-gray-200 leading-relaxed font-light drop-shadow-md">{t('auth.register.subtitle')}</p>

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

            {/* ================= RIGHT SIDE: DYNAMIC FORM ================= */}
            <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 relative">

                {/* --- CONTROLS --- */}
                <div className="absolute top-6 right-6 flex items-center gap-3 z-30">
                    {/* Language */}
                    <div className="relative" ref={langMenuRef}>
                        <button
                            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                            className={clsx("flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm font-medium ", isLangMenuOpen ? "bg-primary text-white border-primary" : "bg-white dark:bg-[#112240] border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-primary/50")}
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
                    <button onClick={toggleTheme} className="p-2.5 rounded-lg bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-primary hover:border-primary/50 transition-all ">
                        {theme ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                </div>

                {/* --- FORM AREA --- */}
                <AnimatePresence mode="wait">

                    {/* >>> STEP 1: MODERNIZED IDENTITY SELECTION <<< */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="w-full max-w-xl space-y-8"
                        >
                            <motion.div variants={itemVariants} className="text-center space-y-2">
                                <h2 className="text-3xl font-bold tracking-tight text-secondary dark:text-white">
                                    {t('auth.register.step1Title')}
                                </h2>
                                <p className="text-gray-500 dark:text-gray-400">Choose your verification method.</p>
                            </motion.div>

                            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* MODERN CARD: National ID */}
                                <motion.button
                                    whileHover={{ scale: 1.03, y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setIdType('nid')}
                                    className={clsx(
                                        "group relative flex flex-col items-center p-8 rounded-2xl border transition-all duration-300 overflow-hidden",
                                        idType === 'nid'
                                            ? "border-primary ring-2 ring-primary/20 bg-gradient-to-br from-white to-blue-50 dark:from-[#112240] dark:to-primary/10 shadow-xl shadow-primary/10"
                                            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-[#112240] hover:border-primary/50 hover:shadow-lg"
                                    )}
                                >
                                    <div className={clsx(
                                        "p-4 rounded-full mb-4 transition-colors duration-300",
                                        idType === 'nid' ? "bg-primary text-white" : "bg-gray-100 dark:bg-white/5 text-gray-500 group-hover:bg-primary/10 group-hover:text-primary"
                                    )}>
                                        <CreditCard size={32} />
                                    </div>
                                    <span className="font-bold text-lg text-secondary dark:text-white">{t('auth.register.nid')}</span>
                                    <span className="text-xs text-gray-400 mt-2">For Rwandan Citizens</span>

                                    {/* Selected Indicator */}
                                    {idType === 'nid' && (
                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-3 right-3 text-primary">
                                            <CheckCircle size={22} fill="currentColor" className="text-white dark:text-[#112240]" />
                                        </motion.div>
                                    )}
                                </motion.button>

                                {/* MODERN CARD: Passport */}
                                <motion.button
                                    whileHover={{ scale: 1.03, y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setIdType('passport')}
                                    className={clsx(
                                        "group relative flex flex-col items-center p-8 rounded-2xl border transition-all duration-300 overflow-hidden",
                                        idType === 'passport'
                                            ? "border-primary ring-2 ring-primary/20 bg-gradient-to-br from-white to-blue-50 dark:from-[#112240] dark:to-primary/10 shadow-xl shadow-primary/10"
                                            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-[#112240] hover:border-primary/50 hover:shadow-lg"
                                    )}
                                >
                                    <div className={clsx(
                                        "p-4 rounded-full mb-4 transition-colors duration-300",
                                        idType === 'passport' ? "bg-primary text-white" : "bg-gray-100 dark:bg-white/5 text-gray-500 group-hover:bg-primary/10 group-hover:text-primary"
                                    )}>
                                        <Globe size={32} />
                                    </div>
                                    <span className="font-bold text-lg text-secondary dark:text-white">{t('auth.register.passport')}</span>
                                    <span className="text-xs text-gray-400 mt-2">For International Users</span>

                                    {/* Selected Indicator */}
                                    {idType === 'passport' && (
                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-3 right-3 text-primary">
                                            <CheckCircle size={22} fill="currentColor" className="text-white dark:text-[#112240]" />
                                        </motion.div>
                                    )}
                                </motion.button>
                            </motion.div>

                            <motion.button
                                variants={itemVariants}
                                onClick={handleStep1Continue}
                                disabled={!idType}
                                whileHover={idType ? { scale: 1.02 } : {}}
                                whileTap={idType ? { scale: 0.98 } : {}}
                                className={clsx(
                                    "w-full font-bold py-4 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2",
                                    idType
                                        ? "bg-primary hover:bg-[#2d4a75] text-white shadow-primary/25 cursor-pointer"
                                        : "bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                                )}
                            >
                                <span>{t('auth.register.continue')}</span>
                                <ArrowRight size={20} />
                            </motion.button>

                            <motion.div variants={itemVariants} className="text-center pt-2">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {t('auth.register.loginLink')}{" "}
                                    <a href="/login" className="font-bold text-primary hover:underline">{t('auth.register.login')}</a>
                                </p>
                            </motion.div>
                        </motion.div>
                    )}

                    {/* >>> STEP 2: DETAILS FORM <<< */}
                    {step === 2 && (
                        <motion.div
                            key="step2"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="w-full max-w-xl space-y-6"
                        >
                            <motion.button
                                variants={itemVariants}
                                onClick={() => setStep(1)}
                                className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors text-sm font-medium mb-2"
                            >
                                <ArrowLeft size={16} />
                                {t('auth.register.back')}
                            </motion.button>

                            <motion.div variants={itemVariants} className="text-center mb-6">
                                <h2 className="text-2xl font-bold text-secondary dark:text-white">
                                    {idType === 'passport' ? t('auth.register.passport') : t('auth.register.nid')}
                                </h2>
                                <p className="text-sm text-gray-500">Provide your verified credentials.</p>
                            </motion.div>

                            <form onSubmit={handleSubmit} className="space-y-5">

                                {/* PASSPORT UPLOAD */}
                                {idType === 'passport' && (
                                    <motion.div variants={itemVariants} className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">
                                            {t('auth.register.uploadPassport')}
                                        </label>
                                        <div className="relative w-full h-40 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-primary hover:bg-primary/5 transition-all bg-gray-50 dark:bg-[#112240] flex flex-col items-center justify-center cursor-pointer group overflow-hidden">
                                            <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                            {passportPreview ? (
                                                <motion.img initial={{ opacity: 0 }} animate={{ opacity: 1 }} src={passportPreview} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="flex flex-col items-center space-y-2">
                                                    <div className="p-3 bg-white dark:bg-white/5 rounded-full  group-hover:scale-110 transition-transform">
                                                        <Upload size={24} className="text-primary" />
                                                    </div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 px-4 text-center">
                                                        {t('auth.register.uploadHint')}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}

                                {/* NATIONAL ID INPUT */}
                                {idType === 'nid' && (
                                    <motion.div variants={itemVariants} className="space-y-1.5">
                                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">{t('auth.register.nidNumber')}</label>
                                        <div className="relative group">
                                            <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center text-gray-400 group-focus-within:text-primary pointer-events-none"><CreditCard size={20} /></div>
                                            <input type="text" placeholder="1 199X 8 00XX XX X XX" className="w-full bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white pl-12 pr-4 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all" required />
                                        </div>
                                    </motion.div>
                                )}

                                {/* COMMON FIELDS */}
                                <motion.div variants={itemVariants} className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">{t('auth.register.fullName')}</label>
                                    <div className="relative group">
                                        <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center text-gray-400 group-focus-within:text-primary pointer-events-none"><User size={20} /></div>
                                        <input type="text" placeholder="Legal Name" className="w-full bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white pl-12 pr-4 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all" required />
                                    </div>
                                </motion.div>

                                <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">{t('auth.register.phone')}</label>
                                        <div className="relative group">
                                            <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center text-gray-400 group-focus-within:text-primary pointer-events-none"><Phone size={18} /></div>
                                            <input type="tel" placeholder="+250..." className="w-full bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white pl-10 pr-4 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all" required />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">{t('auth.register.email')}</label>
                                        <div className="relative group">
                                            <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center text-gray-400 group-focus-within:text-primary pointer-events-none"><Mail size={18} /></div>
                                            <input type="email" placeholder="email@..." className="w-full bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white pl-10 pr-4 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all" required />
                                        </div>
                                    </div>
                                </motion.div>

                                {/* COUNTRY SELECTOR (Library) */}
                                <motion.div variants={itemVariants} className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">{t('auth.register.country')}</label>
                                    <div className="relative country-select-wrapper">
                                        <ReactFlagsSelect
                                            selected={selectedCountry}
                                            onSelect={(code) => setSelectedCountry(code)}
                                            searchable
                                            searchPlaceholder="Search Country"
                                            className="w-full font-sans"
                                            selectButtonClassName="bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white py-4 rounded-xl transition-all"
                                        />
                                        {/* CSS override to fix ReactFlagsSelect dark mode text */}
                                        <style>{`
                      .country-select-wrapper button { padding-top: 1rem; padding-bottom: 1rem; border-radius: 0.75rem; width: 100%; text-align: left; }
                      .country-select-wrapper button:focus { outline: 2px solid #395d91; border-color: transparent; }
                      .dark .country-select-wrapper button { background-color: #112240; border-color: #374151; color: white; }
                      .dark .country-select-wrapper ul { background-color: #112240; border-color: #374151; color: white; }
                      .dark .country-select-wrapper li:hover { background-color: rgba(255,255,255,0.1); }
                    `}</style>
                                    </div>
                                </motion.div>

                                {/* Residence Checkbox */}
                                <motion.div variants={itemVariants} className="flex items-center p-4 bg-gray-50 dark:bg-[#112240] rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary/50 transition-colors">
                                    <input id="residence" type="checkbox" className="w-5 h-5 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer" />
                                    <label htmlFor="residence" className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer select-none">
                                        {t('auth.register.residence')}
                                    </label>
                                </motion.div>

                                <motion.button
                                    variants={itemVariants}
                                    type="submit"
                                    disabled={isLoading}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={clsx(
                                        "w-full bg-primary hover:bg-[#2d4a75] text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all flex justify-center items-center gap-2 mt-4",
                                        isLoading && "opacity-80 cursor-wait"
                                    )}
                                >
                                    {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><span>{t('auth.register.submit')}</span><CheckCircle size={20} /></>}
                                </motion.button>

                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>
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