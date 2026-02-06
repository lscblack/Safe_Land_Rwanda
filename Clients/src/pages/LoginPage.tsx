import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck, Globe, Moon, Sun, CheckCircle, ArrowLeft, Phone } from 'lucide-react';
import { clsx } from 'clsx';
import { translations } from '../langs/alllangs';
import { useLanguage } from '../contexts/language-context';
import { useTheme } from '../contexts/theme-context';
import api from '../instance/mainAxios';

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
    "https://www.arcadiasafaris.com/wp-content/uploads/2023/12/25-Top-Attractions-in-Rwanda-2.jpg",
    "https://visitrwanda.com/wp-content/uploads/fly-images/1210/Visit-Rwanda-Kigali-Centre-Roads-1920x1281.jpg",
];

export const LoginPage = () => {
    // -- State --
    const { t } = useLanguage(); // Get translation function
    const [currentLang, setCurrentLang] = useState<LangKey>();
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const { theme, toggleTheme } = useTheme();
    const [isLoading, setIsLoading] = useState(false);
    const [loginStep, setLoginStep] = useState<'credentials' | 'otp-method' | 'otp-verify'>('credentials');
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [otpMethod, setOtpMethod] = useState<'email' | 'sms' | null>(null);
    const [otpCode, setOtpCode] = useState('');
    const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(''));
    const [otpPhone, setOtpPhone] = useState('');
    const [otpEmail, setOtpEmail] = useState('');
    const [loginError, setLoginError] = useState<string | null>(null);
    const [loginSuccess, setLoginSuccess] = useState<string | null>(null);
    const [liipError, setLiipError] = useState<string | null>(null);
    const [useLiip, setUseLiip] = useState(false);
    const [loginIdType, setLoginIdType] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);

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

    const maskEmail = (email: string) => {
        const [user, domain] = email.split('@');
        if (!domain) return email;
        const maskedUser = user.length <= 2 ? `${user[0] || ''}***` : `${user.slice(0, 2)}***`;
        return `${maskedUser}@${domain}`;
    };

    const isEmail = (value: string) => /\S+@\S+\.\S+/.test(value);
    const isEmailLocked = isEmail(identifier) && otpEmail === identifier;

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError(null);
        setLiipError(null);
        setLoginSuccess(null);

        if (!identifier || !password) {
            setLoginError('Please enter your identifier and password.');
            return;
        }

        if (isEmail(identifier)) {
            setOtpEmail(identifier);
        }

        setIsLoading(true);
        try {
            if (useLiip) {
                const validateResponse = await api.post('/api/liip/validate-login', {
                    id_or_email: identifier,
                    password,
                });
                const { valid, message, id_type } = validateResponse.data || {};
                if (!valid) {
                    setLoginError(message || 'Invalid credentials.');
                    return;
                }
                setLoginIdType(id_type || null);
                if (id_type === 'PASSPORT' && otpMethod === 'sms') {
                    setOtpMethod('email');
                }
            } else {
                const validateResponse = await api.post('/api/user/validate-login', {
                    identifier,
                    password,
                });
                const { valid, message, id_type } = validateResponse.data || {};
                if (!valid) {
                    setLoginError(message || 'Invalid credentials.');
                    return;
                }
                setLoginIdType(id_type || null);
                if (id_type === 'PASSPORT' && otpMethod === 'sms') {
                    setOtpMethod('email');
                }
            }

            setLoginStep('otp-method');
        } catch (err: any) {
            const msg = err.response?.data?.detail || err.message || 'Failed to verify account.';
            setLoginError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendOtp = async (validateLiip = true) => {
        setLoginError(null);
        if (!otpMethod) {
            setLoginError('Please choose how to receive your OTP.');
            return;
        }

        if (otpMethod === 'email') {
            if (!otpEmail || !isEmail(otpEmail)) {
                setLoginError('Please provide a valid email for OTP.');
                return;
            }
        }

        if (otpMethod === 'sms') {
            if (!otpPhone) {
                setLoginError('Please provide a phone number for OTP.');
                return;
            }
        }

        setIsLoading(true);
        try {
            if (useLiip && validateLiip) {
                await api.post('/api/liip/login', {
                    id_or_email: identifier,
                    password,
                });
            }
            await api.post('/otp/send', {
                otp_type: otpMethod === 'email' ? 'email' : 'sms',
                purpose: 'login',
                email: otpMethod === 'email' ? otpEmail : undefined,
                phone: otpMethod === 'sms' ? otpPhone : undefined,
            });
            setLoginSuccess(useLiip && validateLiip ? 'LIIP account verified. OTP sent. Enter the code to continue.' : 'OTP sent. Enter the code to continue.');
            setLoginStep('otp-verify');
        } catch (err: any) {
            const msg = err.response?.data?.detail || err.message || 'Failed to send OTP.';
            setLoginError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtpAndLogin = async () => {
        setLoginError(null);
        if (!otpCode || otpCode.length !== 6) {
            setLoginError('Please enter the 6-character OTP code.');
            return;
        }

        setIsLoading(true);
        try {
            await api.post('/otp/verify', {
                otp_code: otpCode,
                purpose: 'login',
                email: otpMethod === 'email' ? otpEmail : undefined,
                phone: otpMethod === 'sms' ? otpPhone : undefined,
            });

            const response = useLiip
                ? await api.post('/api/liip/login', { id_or_email: identifier, password })
                : await api.post('/api/user/login', { identifier, password });

            const { access_token, refresh_token } = response.data;
            localStorage.setItem('user_access_token', access_token);
            localStorage.setItem('user_refresh_token', refresh_token);

            setLoginSuccess(useLiip ? 'LIIP login successful. Redirecting...' : 'Login successful. Redirecting...');
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1000);
        } catch (err: any) {
            const msg = err.response?.data?.detail || err.message || 'Login failed.';
            setLoginError(msg);
        } finally {
            setIsLoading(false);
        }
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
                        {(loginError || loginSuccess || liipError) && (
                            <div className={clsx(
                                "rounded-xl px-4 py-3 text-sm",
                                (loginError || liipError) ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"
                            )}>
                                {loginError || liipError || loginSuccess}
                                {liipError && (
                                    <div className="mt-2 text-xs">
                                        <a href="https://amakuru.lands.rw/" className="text-primary font-semibold hover:underline">Open LIIP</a>
                                    </div>
                                )}
                            </div>
                        )}

                        {loginStep === 'credentials' && (
                            <>
                                <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Use LIIP Login</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">LIIP login uses OTP</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setUseLiip((prev) => !prev);
                                            setLoginError(null);
                                            setLiipError(null);
                                            setLoginSuccess(null);
                                            setLoginStep('credentials');
                                            setOtpMethod(null);
                                            setOtpCode('');
                                        }}
                                        className={clsx(
                                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                                            useLiip ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
                                        )}
                                        aria-pressed={useLiip}
                                        aria-label="Toggle LIIP login"
                                    >
                                        <span
                                            className={clsx(
                                                "inline-block h-5 w-5 transform rounded-full bg-white transition-transform",
                                                useLiip ? "translate-x-5" : "translate-x-1"
                                            )}
                                        />
                                    </button>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">
                                        Email / Phone / NID
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center text-gray-400 group-focus-within:text-primary transition-colors pointer-events-none">
                                            <Mail size={20} />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="user@example.com"
                                            value={identifier}
                                            onChange={(e) => setIdentifier(e.target.value)}
                                            className="w-full bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white pl-12 pr-4 py-5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all group-hover:border-gray-300 dark:group-hover:border-gray-600"
                                            required
                                        />
                                    </div>
                                </div>

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
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
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
                            </>
                        )}

                        {loginStep === 'otp-method' && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setLoginStep('credentials')}
                                    className="text-xs text-gray-500 hover:text-primary"
                                >
                                    Back to login
                                </button>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">Choose OTP Delivery</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setOtpMethod('email')}
                                            className={clsx(
                                                "px-4 py-3 rounded-xl border text-sm font-semibold",
                                                otpMethod === 'email' ? "border-primary text-primary bg-primary/5" : "border-gray-200 dark:border-gray-700"
                                            )}
                                        >
                                            Email
                                        </button>
                                        {loginIdType !== 'PASSPORT' && (
                                            <button
                                                type="button"
                                                onClick={() => setOtpMethod('sms')}
                                                className={clsx(
                                                    "px-4 py-3 rounded-xl border text-sm font-semibold",
                                                    otpMethod === 'sms' ? "border-primary text-primary bg-primary/5" : "border-gray-200 dark:border-gray-700"
                                                )}
                                            >
                                                Phone
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {otpMethod === 'email' && (
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">Email</label>
                                        <div className="relative group">
                                            <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center text-gray-400"><Mail size={20} /></div>
                                            <input
                                                type="email"
                                                value={isEmailLocked ? maskEmail(otpEmail) : otpEmail}
                                                onChange={(e) => setOtpEmail(e.target.value)}
                                                placeholder="name@example.com"
                                                className="w-full bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white pl-12 pr-4 py-5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                                                disabled={isEmailLocked}
                                                required
                                            />
                                        </div>
                                        {isEmail(otpEmail) && (
                                            <p className="text-xs text-gray-500">We will send to {maskEmail(otpEmail)}</p>
                                        )}
                                    </div>
                                )}

                                {otpMethod === 'sms' && loginIdType !== 'PASSPORT' && (
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">Phone</label>
                                        <div className="relative group">
                                            <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center text-gray-400"><Phone size={20} /></div>
                                            <input
                                                type="tel"
                                                value={otpPhone}
                                                onChange={(e) => setOtpPhone(e.target.value)}
                                                placeholder="07..."
                                                className="w-full bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white pl-12 pr-4 py-5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                                                required
                                            />
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {loginStep === 'otp-verify' && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setLoginStep('otp-method')}
                                    className="text-xs text-gray-500 hover:text-primary"
                                >
                                    Back to OTP method
                                </button>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">OTP Code</label>
                                    <div className="flex items-center justify-between gap-2">
                                        {otpDigits.map((digit, idx) => (
                                            <input
                                                key={idx}
                                                ref={(el) => { otpInputRefs.current[idx] = el; }}
                                                type="text"
                                                inputMode="text"
                                                maxLength={1}
                                                value={digit}
                                                onChange={(e) => {
                                                    const value = e.target.value.toUpperCase();
                                                    const next = [...otpDigits];
                                                    next[idx] = value.slice(-1);
                                                    setOtpDigits(next);
                                                    setOtpCode(next.join(''));
                                                    if (value && idx < 5) {
                                                        otpInputRefs.current[idx + 1]?.focus();
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
                                                        otpInputRefs.current[idx - 1]?.focus();
                                                    }
                                                }}
                                                onPaste={(e) => {
                                                    e.preventDefault();
                                                    const paste = e.clipboardData.getData('text').replace(/\s/g, '').toUpperCase();
                                                    if (!paste) return;
                                                    const chars = paste.slice(0, 6).split('');
                                                    const next = Array(6).fill('');
                                                    for (let i = 0; i < chars.length; i += 1) next[i] = chars[i];
                                                    setOtpDigits(next);
                                                    setOtpCode(next.join(''));
                                                    const focusIndex = Math.min(chars.length, 5);
                                                    otpInputRefs.current[focusIndex]?.focus();
                                                }}
                                                className="w-12 h-12 text-center text-lg font-semibold bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                                                required
                                            />
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

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
                        {loginStep === 'credentials' && (
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
                                        <span>{useLiip ? 'Continue with LIIP' : t('auth.login.submitButton')}</span>
                                        <ArrowRight size={20} />
                                    </>
                                )}
                            </button>
                        )}

                        {loginStep === 'otp-method' && (
                            <button
                                type="button"
                                onClick={() => handleSendOtp(true)}
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
                                        <span>Send OTP</span>
                                        <ArrowRight size={20} />
                                    </>
                                )}
                            </button>
                        )}

                        {loginStep === 'otp-verify' && (
                            <button
                                type="button"
                                onClick={handleVerifyOtpAndLogin}
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
                                        <span>Verify & Login</span>
                                        <ArrowRight size={20} />
                                    </>
                                )}
                            </button>
                        )}

                        {loginStep === 'otp-verify' && (
                            <button
                                type="button"
                                onClick={() => handleSendOtp(false)}
                                disabled={isLoading}
                                className={clsx(
                                    "w-full border border-primary text-primary font-semibold py-4 rounded-xl transition-all flex justify-center items-center gap-2",
                                    isLoading && "opacity-80 cursor-wait"
                                )}
                            >
                                Resend OTP
                            </button>
                        )}

                        
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