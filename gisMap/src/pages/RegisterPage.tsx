import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mail, Phone, Upload,
    CreditCard, ArrowRight, ArrowLeft, Globe, Moon, Sun,
    CheckCircle, ShieldCheck, Loader2, Lock, AlertCircle
} from 'lucide-react';
import { clsx } from 'clsx';
import ReactFlagsSelect from "react-flags-select";
import { useLanguage } from '../contexts/language-context';
import { useTheme } from '../contexts/theme-context';
import api from '../instance/mainAxios';


type IdType = 'nid' | 'passport' | null;

// Background Images
const SLIDER_IMAGES = [
    "https://www.karmod.com/media/blog/98/prefab-house-in-rwanda-cover.jpg",
    "https://silverbackwildadventures.b-cdn.net/wp-content/uploads/2025/11/Kigali-City3.png",
    "https://visitrwanda.com/wp-content/uploads/fly-images/1210/Visit-Rwanda-Kigali-Centre-Roads-1920x1281.jpg",
];

export const RegisterPage = () => {
    // -- Global UI State --
    const { t } = useLanguage();
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const { toggleTheme, theme } = useTheme();
    const isDark = theme === 'dark';

    // -- Form Logic State --
    const [step, setStep] = useState<1 | 2>(1);
    const [idType, setIdType] = useState<IdType>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [passportPreview, setPassportPreview] = useState<string | null>(null);

    // -- Terms & Conditions Modal State --
    const [localAccepted, setLocalAccepted] = useState<boolean>(() => {
        // try {
        //     return localStorage.getItem('register_terms_accepted') === 'true';
        // } catch (e) {
        //     return false;
        // }
        return false; // Disable localStorage persistence for now due to potential issues in private browsing modes and to ensure all users see terms at least once.
    });
    const [sessionAccepted, setSessionAccepted] = useState(false);
    const [termsOpen, setTermsOpen] = useState<boolean>(!localAccepted);
    const [agreeChecked, setAgreeChecked] = useState(false);
    const [rememberChoice, setRememberChoice] = useState(true);

    useEffect(() => {
        setTermsOpen(!localAccepted && !sessionAccepted);
    }, [localAccepted, sessionAccepted]);

    // --- CRITICAL CHANGE: INDEPENDENT NID STATE ---
    // This exists outside of formData so updates don't reset it
    const [nid, setNid] = useState('');
    const [passportNumber, setPassportNumber] = useState('');

    // -- NID Verification State --
    const [isVerifying, setIsVerifying] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [showVerifiedForm, setShowVerifiedForm] = useState(false);
    const [nidError, setNidError] = useState<string | null>(null);
    const [allowedPhoneNumbers, setAllowedPhoneNumbers] = useState<string[]>([]);
    const [phoneError, setPhoneError] = useState<string | null>(null);
    const [registerError, setRegisterError] = useState<string | null>(null);
    const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);
    const [emailOtpCode, setEmailOtpCode] = useState('');
    const [emailOtpSent, setEmailOtpSent] = useState(false);
    const [emailOtpVerified, setEmailOtpVerified] = useState(false);
    const [emailOtpError, setEmailOtpError] = useState<string | null>(null);
    const [emailOtpLoading, setEmailOtpLoading] = useState(false);

    // -- Data State (Excluding NID) --
    const [formData, setFormData] = useState({
        first_name: '',
        middle_name: '',
        last_name: '',
        email: '',
        phone: '',
        sex: '',
        country: '',
        password: '',
        avatar: '',
    });


    // -- Effects --
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % SLIDER_IMAGES.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    // -- Handlers --

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Real-time phone validation for NID users
        if (idType === 'nid' && name === 'phone' && showVerifiedForm) {
            validateNidPhone(value);
        }
    };

    const verifyRequestIdRef = useRef(0);
    const canShowVerifiedForm = showVerifiedForm && allowedPhoneNumbers.length > 0;

    // Verify Phone against API list
    const validateNidPhone = (inputPhone: string) => {
        const cleanInput = inputPhone.replace(/\D/g, '');
        const isValid = allowedPhoneNumbers.some(allowed => {
            const cleanAllowed = allowed.replace(/\D/g, '');
            return cleanInput.includes(cleanAllowed) || cleanAllowed.includes(cleanInput);
        });

        if (!isValid && cleanInput.length > 3) {
            setPhoneError("This number is not registered under your ID.");
        } else {
            setPhoneError(null);
        }
    };

    // --- NID VERIFICATION LOGIC (SEPARATED) ---
    const handleVerifyNID = async () => {
        if (nid.length !== 16) {
            setNidError("National ID must be 16 digits.");
            return;
        }

        setIsVerifying(true);
        setNidError(null);

        // We do NOT clear showVerifiedForm here immediately to avoid flashing
        // unless it's a completely new verification attempt

        const requestId = ++verifyRequestIdRef.current;

        try {
            const [citizenRes, phoneRes] = await Promise.all([
                api.get(`/api/external/citizen/${nid}`),
                api.get(`/api/external/nid/${nid}/phonenumbers`)
            ]);

            // Race Condition Check
            if (verifyRequestIdRef.current !== requestId) return;

            const data = citizenRes.data.GetCitizenResult;
            const phones = phoneRes.data;

            if (!data) throw new Error("Citizen not found");

            const phoneList = Array.isArray(phones) ? phones : [];
            if (phoneList.length === 0) throw new Error("No phone numbers found");

            setAllowedPhoneNumbers(phoneList.map((p: any) => p.msidn));

            // --- UPDATE FORM DATA ---
            // We verify ONLY fields we want to auto-fill.
            // We NEVER touch 'nid' here because it's in its own state.
            setFormData(prev => ({
                ...prev,
                first_name: data.ForeName || '',
                last_name: data.Surnames || '',
                middle_name: '',
                sex: data.Sex || data.sex || '',
                // Fix for Country: Use Code (RW) if available, else name
                country: data.CountryOfBirth,
                avatar: data.Photo ? `data:image/jpeg;base64,${data.Photo}` : 'offchain/assets/logo_white.png',
            }));

            setIsVerified(true);
            setShowVerifiedForm(true); // Reveal the rest of the form

        } catch (err: any) {
            console.error("Verification failed:", err);
            if (verifyRequestIdRef.current === requestId) {
                const msg = err.response?.data?.detail || err.message || "Verification failed.";
                setNidError(msg);
                setIsVerified(false);
                // Only hide form if verification failed
                setShowVerifiedForm(false);
            }
        } finally {
            if (verifyRequestIdRef.current === requestId) {
                setIsVerifying(false);
            }
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setPassportPreview(url);
            setFormData(prev => ({ ...prev, avatar: 'offchain/assets/logo_white.png' }));
        }
    };

    const handleAcceptTerms = () => {
        if (rememberChoice) {
            try {
                localStorage.setItem('register_terms_accepted', 'true');
                setLocalAccepted(true);
            } catch (e) {
                // ignore storage errors
            }
        }
        setSessionAccepted(true);
        setTermsOpen(false);
    };

    const handleDeclineTerms = () => {
        // If user declines, navigate back to home
        window.location.href = '/';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (idType === 'nid') {
            if (!canShowVerifiedForm) return;
            if (phoneError) return;
        }
        if (idType === 'passport' && !passportNumber) {
            setRegisterError("Passport number is required.");
            return;
        }
        if (idType === 'passport' && !emailOtpVerified) {
            setRegisterError("Please verify your email before registering.");
            return;
        }

        setIsLoading(true);
        setRegisterError(null);
        setRegisterSuccess(null);

        try {
            // --- CONSTRUCT PAYLOAD ---
            // Here we merge the independent 'nid' state with the rest of the form
            const payload = {
                first_name: formData.first_name,
                middle_name: formData.middle_name,
                last_name: formData.last_name,
                email: formData.email,
                phone: formData.phone,
                sex: formData.sex,
                country: formData.country,
                password: formData.password,
                avatar: formData.avatar,
                id_type: idType === 'nid' ? 'NID' : 'PASSPORT',
                // Explicitly grab NID from its own state
                n_id_number: idType === 'passport' ? passportNumber : nid,
            };

            await api.post('/api/user/register', payload);
            setRegisterSuccess("Registration successful. Redirecting to login...");
            setIsLoading(false);
            setTimeout(() => {
                window.location.href = '/login';
            }, 1500);
        } catch (err: any) {
            console.error("Registration failed:", err);
            const msg = err.response?.data?.detail || err.message || "Registration failed. Please try again.";
            setRegisterError(msg);
            setIsLoading(false);
        }
    };

    const handleSendEmailOtp = async () => {
        setEmailOtpError(null);
        if (!formData.email) {
            setEmailOtpError('Please enter your email first.');
            return;
        }
        setEmailOtpLoading(true);
        try {
            await api.post('/otp/send', {
                otp_type: 'email',
                email: formData.email,
                purpose: 'registration'
            });
            setEmailOtpSent(true);
        } catch (err: any) {
            const msg = err.response?.data?.detail || err.message || 'Failed to send OTP.';
            setEmailOtpError(msg);
        } finally {
            setEmailOtpLoading(false);
        }
    };

    const handleVerifyEmailOtp = async () => {
        setEmailOtpError(null);
        if (!emailOtpCode || emailOtpCode.length !== 6) {
            setEmailOtpError('Please enter the 6-digit OTP.');
            return;
        }
        setEmailOtpLoading(true);
        try {
            await api.post('/otp/verify', {
                otp_code: emailOtpCode,
                email: formData.email,
                purpose: 'registration'
            });
            setEmailOtpVerified(true);
        } catch (err: any) {
            const msg = err.response?.data?.detail || err.message || 'OTP verification failed.';
            setEmailOtpError(msg);
        } finally {
            setEmailOtpLoading(false);
        }
    };
    // -- Animation Variants --
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
        exit: { opacity: 0, x: -20 }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <>
            <div aria-hidden={termsOpen} className="min-h-screen w-full flex bg-gray-50 dark:bg-[#0a162e] text-slate-900 dark:text-white transition-colors duration-300 font-sans overflow-hidden">
                {/* LEFT SIDE VISUALS */}
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
                    <div className="relative z-20 flex flex-col justify-between p-16 h-full text-white w-full">
                        <div className="h-12 w-auto opacity-90">
                            <div className="flex items-center gap-2 h-12">
                                <img src="/logo_icon.png" alt="SafeLand" className="h-full object-contain brightness-0 invert" />
                                <span className="font-bold text-2xl">SafeLand</span>
                            </div>
                        </div>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="max-w-xl space-y-6">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/40 border border-primary/50 text-blue-100 text-xs font-semibold uppercase tracking-wider backdrop-blur-md shadow-lg">
                                <ShieldCheck size={14} /> <span>Secure Registration</span>
                            </div>
                            <h2 className="text-4xl md:text-5xl font-bold leading-tight drop-shadow-lg">{t('auth.register.title')}</h2>
                            <p className="text-lg text-gray-200 leading-relaxed font-light drop-shadow-md">{t('auth.register.subtitle')}</p>
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

                {/* RIGHT SIDE: FORM */}
                <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-y-auto">
                    <div className="absolute top-6 right-6 flex items-center gap-3 z-30">
                        <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition">
                            {isDark ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                    </div>

                    <AnimatePresence mode="wait">

                        {/* STEP 1: IDENTITY SELECTION */}
                        {step === 1 && (
                            <motion.div key="step1" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="w-full max-w-xl space-y-8">
                                <motion.div variants={itemVariants} className="text-center space-y-2">
                                    <h2 className="text-3xl font-bold tracking-tight text-secondary dark:text-white">{t('auth.register.step1Title')}</h2>
                                    <p className="text-gray-500 dark:text-gray-400">Choose your verification method.</p>
                                </motion.div>

                                <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {/* NID Card */}
                                    <motion.button whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => setIdType('nid')}
                                        className={clsx("group relative flex flex-col items-center p-8 rounded-2xl border transition-all duration-300 overflow-hidden", idType === 'nid' ? "border-primary ring-2 ring-primary/20 bg-gradient-to-br from-white to-blue-50 dark:from-[#112240] dark:to-primary/10 shadow-xl" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-[#112240] hover:border-primary/50")}>
                                        <div className={clsx("p-4 rounded-full mb-4 transition-colors duration-300", idType === 'nid' ? "bg-primary text-white" : "bg-gray-100 dark:bg-white/5 text-gray-500 group-hover:bg-primary/10 group-hover:text-primary")}><CreditCard size={32} /></div>
                                        <span className="font-bold text-lg text-secondary dark:text-white">{t('auth.register.nid')}</span>
                                        <span className="text-xs text-gray-400 mt-2">Rwandan Citizens</span>
                                        {idType === 'nid' && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-3 right-3 text-primary"><CheckCircle size={22} fill="currentColor" className="text-white dark:text-[#112240]" /></motion.div>}
                                    </motion.button>
                                    {/* Passport Card */}
                                    <motion.button whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }} onClick={() => setIdType('passport')}
                                        className={clsx("group relative flex flex-col items-center p-8 rounded-2xl border transition-all duration-300 overflow-hidden", idType === 'passport' ? "border-primary ring-2 ring-primary/20 bg-gradient-to-br from-white to-blue-50 dark:from-[#112240] dark:to-primary/10 shadow-xl" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-[#112240] hover:border-primary/50")}>
                                        <div className={clsx("p-4 rounded-full mb-4 transition-colors duration-300", idType === 'passport' ? "bg-primary text-white" : "bg-gray-100 dark:bg-white/5 text-gray-500 group-hover:bg-primary/10 group-hover:text-primary")}><Globe size={32} /></div>
                                        <span className="font-bold text-lg text-secondary dark:text-white">{t('auth.register.passport')}</span>
                                        <span className="text-xs text-gray-400 mt-2">International Users</span>
                                        {idType === 'passport' && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-3 right-3 text-primary"><CheckCircle size={22} fill="currentColor" className="text-white dark:text-[#112240]" /></motion.div>}
                                    </motion.button>
                                </motion.div>

                                <motion.button variants={itemVariants} onClick={() => idType && setStep(2)} disabled={!idType}
                                    className={clsx("w-full font-bold py-4 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2", idType ? "bg-primary hover:bg-[#2d4a75] text-white shadow-primary/25 cursor-pointer" : "bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed")}>
                                    <span>{t('auth.register.continue')}</span><ArrowRight size={20} />
                                </motion.button>
                                <motion.div variants={itemVariants} className="text-center pt-2">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {t('auth.register.loginLink')} <a href="/login" className="font-bold text-primary hover:underline">{t('auth.register.login')}</a>
                                    </p>
                                </motion.div>
                            </motion.div>
                        )}

                        {/* STEP 2: DETAILS FORM */}
                        {step === 2 && (
                            <motion.div key="step2" variants={containerVariants} initial="hidden" animate="visible" exit="exit" className="w-full max-w-xl space-y-6">
                                <motion.button variants={itemVariants} onClick={() => setStep(1)} className="flex items-center gap-2 text-gray-500 hover:text-primary transition-colors text-sm font-medium mb-2">
                                    <ArrowLeft size={16} /> {t('auth.register.back')}
                                </motion.button>

                                <motion.div variants={itemVariants} className="text-center mb-6">
                                    <h2 className="text-2xl font-bold text-secondary dark:text-white">{idType === 'nid' ? "National ID Verification" : "Passport Registration"}</h2>
                                    <p className="text-sm text-gray-500">{idType === 'nid' ? "Verify your identity to auto-fill details." : "Enter your details manually."}</p>
                                </motion.div>

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    {(registerError || registerSuccess) && (
                                        <div className={clsx(
                                            "rounded-xl px-4 py-3 text-sm",
                                            registerError ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"
                                        )}>
                                            {registerError || registerSuccess}
                                        </div>
                                    )}

                                    {/* --- NID SPECIFIC LOGIC --- */}
                                    {idType === 'nid' && (
                                        <>
                                            {/* NID INPUT & VERIFY BUTTON */}
                                            <motion.div variants={itemVariants} className="space-y-1.5">
                                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">{t('auth.register.nidNumber')}</label>
                                                <div className="flex gap-2">
                                                    <div className="relative group flex-1">
                                                        <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center text-gray-400"><CreditCard size={20} /></div>
                                                        {/* ID INPUT BOUND TO INDEPENDENT STATE */}
                                                        <input
                                                            type="text"
                                                            value={nid}
                                                            onChange={(e) => {
                                                                const val = e.target.value.replace(/\D/g, '');
                                                                setNid(val);
                                                                // If user edits ID after verifying, we should require re-verification
                                                                if (isVerified) {
                                                                    setIsVerified(false);
                                                                    setShowVerifiedForm(false);
                                                                }
                                                            }}
                                                            maxLength={16}
                                                            placeholder="1 199X 8 00XX XX X XX"
                                                            className={clsx(
                                                                "w-full bg-white dark:bg-[#112240] border text-gray-900 dark:text-white pl-12 pr-4 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all",
                                                                nidError ? "border-red-500" : "border-gray-200 dark:border-gray-700 focus:border-primary",
                                                                isVerified && "bg-green-50 dark:bg-green-900/10 border-green-500"
                                                            )}
                                                            required
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={handleVerifyNID}
                                                        disabled={isVerifying || nid.length !== 16}
                                                        className="bg-primary disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white px-6 rounded-xl font-bold flex items-center justify-center transition-all min-w-[100px]"
                                                    >
                                                        {isVerifying ? <Loader2 className="animate-spin" /> : isVerified ? <CheckCircle /> : "Verify"}
                                                    </button>
                                                </div>
                                                {nidError && <p className="text-xs text-red-500 ml-1">{nidError}</p>}
                                            </motion.div>

                                            {/* AUTO-FILLED DATA (ONLY SHOW IF VERIFIED) */}
                                            <AnimatePresence>
                                                {canShowVerifiedForm && (
                                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-5">

                                                        {/* Names (Read Only) */}
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-1.5 opacity-70">
                                                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">First Name</label>
                                                                <input type="text" value={formData.first_name} readOnly className="w-full bg-gray-100 dark:bg-[#0f1f3a] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-4 py-3 rounded-xl cursor-not-allowed" />
                                                            </div>
                                                            <div className="space-y-1.5 opacity-70">
                                                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Last Name</label>
                                                                <input type="text" value={formData.last_name} readOnly className="w-full bg-gray-100 dark:bg-[#0f1f3a] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-4 py-3 rounded-xl cursor-not-allowed" />
                                                            </div>
                                                        </div>

                                                        {/* Email (Editable) */}
                                                        <div className="space-y-1.5">
                                                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">Email Address</label>
                                                            <div className="relative">
                                                                <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center text-gray-400"><Mail size={20} /></div>
                                                                <input
                                                                    type="email"
                                                                    name="email"
                                                                    value={formData.email}
                                                                    onChange={handleInputChange}
                                                                    placeholder="user@example.com"
                                                                    className="w-full bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white pl-12 pr-4 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                                                                    required
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Country (Auto-Filled but Editable) */}
                                                        <div className="space-y-1.5">
                                                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">Country</label>
                                                            <ReactFlagsSelect
                                                                selected={formData.country}
                                                                onSelect={(code) => setFormData(prev => ({ ...prev, country: code }))}
                                                                searchable
                                                                disabled={true} // Locked for NID
                                                                className="w-full"
                                                                selectButtonClassName="bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-5 py-5 rounded-xl cursor-not-allowed"
                                                            />
                                                        </div>

                                                        {/* Phone (Validated against API List) */}
                                                        <div className="space-y-1.5">
                                                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">Registered Phone Number</label>
                                                            <div className="relative">
                                                                <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center text-gray-400"><Phone size={20} /></div>
                                                                <input
                                                                    type="tel"
                                                                    name="phone"
                                                                    value={formData.phone}
                                                                    onChange={handleInputChange}
                                                                    placeholder="07..."
                                                                    className={clsx(
                                                                        "w-full bg-white dark:bg-[#112240] border text-gray-900 dark:text-white pl-12 pr-4 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50",
                                                                        phoneError ? "border-red-500 focus:ring-red-500" : "border-gray-200 dark:border-gray-700 focus:border-primary"
                                                                    )}
                                                                    required
                                                                />
                                                            </div>
                                                            {phoneError ? (
                                                                <p className="text-xs text-red-500 ml-1 flex items-center gap-1"><AlertCircle size={12} /> {phoneError}</p>
                                                            ) : (
                                                                <p className="text-[10px] text-gray-400 ml-1">Must match a number registered to your ID.</p>
                                                            )}
                                                        </div>

                                                        {/* Password */}
                                                        <div className="space-y-1.5">
                                                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">Create Password</label>
                                                            <div className="relative">
                                                                <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center text-gray-400"><Lock size={20} /></div>
                                                                <input
                                                                    type="password"
                                                                    name="password"
                                                                    value={formData.password}
                                                                    onChange={handleInputChange}
                                                                    className="w-full bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white pl-12 pr-4 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                                                                    required
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Sex (Read Only from NID) */}
                                                        <div className="space-y-1.5">
                                                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">Sex</label>
                                                            <select
                                                                name="sex"
                                                                value={formData.sex}
                                                                disabled
                                                                className="w-full bg-gray-100 dark:bg-[#0f1f3a] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-4 py-3 rounded-xl cursor-not-allowed"
                                                            >
                                                                <option value="">{formData.sex ? formData.sex : "Select"}</option>
                                                                <option value="M">Male</option>
                                                                <option value="F">Female</option>
                                                            </select>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </>
                                    )}

                                    {/* --- PASSPORT SPECIFIC LOGIC (Show All Manual Inputs) --- */}
                                    {idType === 'passport' && (
                                        <>
                                            <motion.div variants={itemVariants} className="space-y-2">
                                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">Upload Passport Page</label>
                                                <div className="relative w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-primary bg-gray-50 dark:bg-[#112240] flex flex-col items-center justify-center cursor-pointer overflow-hidden">
                                                    <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                                    {passportPreview ? (
                                                        <img src={passportPreview} alt="Preview" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="flex flex-col items-center space-y-1">
                                                            <Upload size={24} className="text-primary" />
                                                            <span className="text-xs text-gray-500">Click to upload</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>

                                            <motion.div variants={itemVariants} className="space-y-1.5">
                                                <input
                                                    type="text"
                                                    name="passport_number"
                                                    placeholder="Passport Number"
                                                    value={passportNumber}
                                                    onChange={(e) => setPassportNumber(e.target.value.trim())}
                                                    className="w-full bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-4 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                    required
                                                />
                                            </motion.div>

                                            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
                                                <input type="text" name="first_name" placeholder="First Name" onChange={handleInputChange} className="w-full bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-4 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50" required />
                                                <input type="text" name="last_name" placeholder="Last Name" onChange={handleInputChange} className="w-full bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-4 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50" required />
                                            </motion.div>

                                            <motion.div variants={itemVariants} className="space-y-1.5">
                                                <input
                                                    type="email"
                                                    name="email"
                                                    placeholder="Email Address"
                                                    value={formData.email}
                                                    onChange={(e) => {
                                                        handleInputChange(e);
                                                        setEmailOtpSent(false);
                                                        setEmailOtpVerified(false);
                                                        setEmailOtpCode('');
                                                    }}
                                                    className="w-full bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-4 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                    required
                                                />
                                            </motion.div>

                                            <motion.div variants={itemVariants} className="space-y-2">
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={handleSendEmailOtp}
                                                        disabled={emailOtpLoading}
                                                        className="px-4 py-3 rounded-xl bg-primary text-white font-semibold w-full"
                                                    >
                                                        {emailOtpLoading ? 'Sending...' : 'Send Email OTP'}
                                                    </button>
                                                    {emailOtpSent && (
                                                        <button
                                                            type="button"
                                                            onClick={handleVerifyEmailOtp}
                                                            disabled={emailOtpLoading}
                                                            className="px-4 py-3 rounded-xl border border-primary text-primary font-semibold w-full"
                                                        >
                                                            {emailOtpLoading ? 'Verifying...' : 'Verify OTP'}
                                                        </button>
                                                    )}
                                                </div>
                                                {emailOtpSent && (
                                                    <input
                                                        type="text"
                                                        placeholder="Enter 6-digit OTP"
                                                        value={emailOtpCode}
                                                        onChange={(e) => setEmailOtpCode(e.target.value)}
                                                        className="w-full bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                    />
                                                )}
                                                {emailOtpVerified && (
                                                    <p className="text-xs text-green-600">Email verified.</p>
                                                )}
                                                {emailOtpError && (
                                                    <p className="text-xs text-red-600">{emailOtpError}</p>
                                                )}
                                            </motion.div>

                                            <motion.div variants={itemVariants} className="space-y-1.5">
                                                <input type="tel" name="phone" placeholder="Phone Number" onChange={handleInputChange} className="w-full bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-4 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50" required />
                                            </motion.div>

                                            <motion.div variants={itemVariants} className="space-y-1.5">
                                                <ReactFlagsSelect
                                                    selected={formData.country}
                                                    onSelect={(code) => setFormData(prev => ({ ...prev, country: code }))}
                                                    searchable
                                                    className="w-full"
                                                    selectButtonClassName="bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-4 py-4 rounded-xl"
                                                />
                                            </motion.div>

                                            <motion.div variants={itemVariants} className="space-y-1.5">
                                                <input type="password" name="password" placeholder="Create Password" onChange={handleInputChange} className="w-full bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-4 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50" required />
                                            </motion.div>

                                            <motion.div variants={itemVariants} className="space-y-1.5">
                                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">Sex</label>
                                                <select
                                                    name="sex"
                                                    value={formData.sex}
                                                    onChange={handleInputChange}
                                                    className="w-full bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white px-4 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                    required
                                                >
                                                    <option value="">Select</option>
                                                    <option value="M">Male</option>
                                                    <option value="F">Female</option>
                                                </select>
                                            </motion.div>
                                        </>
                                    )}

                                    {/* Submit Button */}
                                    {(idType === 'passport' || (idType === 'nid' )) && (
                                        <motion.button
                                            variants={itemVariants}
                                            type="submit"
                                            disabled={isLoading || !!phoneError}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            className={clsx(
                                                "w-full bg-primary hover:bg-[#2d4a75] text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all flex justify-center items-center gap-2 mt-4",
                                                (isLoading || !!phoneError) && "opacity-80 cursor-wait bg-gray-400"
                                            )}
                                        >
                                            {isLoading ? <Loader2 className="animate-spin" /> : <><span>{t('auth.register.submit')}</span><CheckCircle size={20} /></>}
                                        </motion.button>
                                    )}
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
                {/* Terms & Conditions Modal (blocks page until accepted) */}
                {termsOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                        <div className="relative z-60 max-w-3xl w-full bg-white dark:bg-[#071023] text-slate-900 dark:text-white rounded-2xl shadow-xl p-6 sm:p-10 mx-4">
                            <h3 className="text-xl font-bold">SafeLand — Terms & Consent</h3>
                            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">Before you register, SafeLand requests your permission to access official parcel and identity information to verify ownership and securely complete your registration. We will only use this information for verification, identity validation, and account setup.</p>

                            <div className="mt-4 max-h-72 overflow-auto text-xs text-gray-700 dark:text-gray-200 space-y-3 border-t border-gray-100 dark:border-gray-800 pt-3">
                                <p><strong>Purpose</strong><br />SafeLand uses parcel and identity data solely to confirm property details and your identity during onboarding. Data will not be used for marketing or sold to third parties without your explicit consent, except where required by law.</p>
                                <p><strong>Restrictions</strong><br />Automated scraping or systematic retrieval of data to build external databases, directories, or compilations is prohibited. Data accessed through our verification process must not be republished or redistributed.</p>
                                <p><strong>User Responsibilities</strong><br />You represent that all registration information you submit will be true, accurate, current, and complete. If you provide false or misleading information, SafeLand may suspend or terminate your account.</p>
                                <p><strong>Updates</strong><br />These terms may be updated from time to time. Continued use of the service after changes are posted constitutes acceptance of the revised terms.</p>
                            </div>

                            <div className="mt-4 flex items-start gap-3">
                                <input id="agree" type="checkbox" checked={agreeChecked} onChange={(e) => setAgreeChecked(e.target.checked)} className="h-4 w-4 mt-1" />
                                <label htmlFor="agree" className="text-sm">I have read and agree to SafeLand's terms above, and I grant permission to access my parcel and identity information for verification. I understand SafeLand will keep my information confidential and will not share it without my consent, except as required by law.</label>
                            </div>

                            <div className="mt-4 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <input id="remember" type="checkbox" checked={rememberChoice} onChange={(e) => setRememberChoice(e.target.checked)} className="h-4 w-4" />
                                    <label htmlFor="remember" className="text-sm text-gray-500">Remember my choice on this device</label>
                                </div>

                                <div className="flex gap-2">
                                    <button onClick={handleDeclineTerms} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm">Decline</button>
                                    <button onClick={handleAcceptTerms} disabled={!agreeChecked} className="px-4 py-2 rounded-lg bg-primary text-white text-sm disabled:opacity-60">Accept</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>

    );
};