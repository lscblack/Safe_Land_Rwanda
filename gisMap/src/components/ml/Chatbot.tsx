// SimpleAiChatbot.tsx — fully integrated with SafeLand RAG backend
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User, Loader2, MapPin, Paperclip, FileText, Edit2, ShieldAlert, Mic } from 'lucide-react';
import api from '../../instance/mainAxios';

interface SpeechRecognitionAlternative {
    transcript: string;
}

interface SpeechRecognitionResultLike {
    isFinal: boolean;
    [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionEventLike extends Event {
    results: {
        [index: number]: SpeechRecognitionResultLike;
        length: number;
    };
}

interface SpeechRecognitionLike extends EventTarget {
    lang: string;
    interimResults: boolean;
    maxAlternatives: number;
    continuous: boolean;
    onresult: ((event: SpeechRecognitionEventLike) => void) | null;
    onerror: ((event: Event) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
}

const UPI_SPEECH_RE = /\b\d+\/\d+\/\d+\/\d+\/\d+\b/g;
const DIGIT_WORDS: Record<string, string> = {
    '0': 'zero',
    '1': 'one',
    '2': 'two',
    '3': 'three',
    '4': 'four',
    '5': 'five',
    '6': 'six',
    '7': 'seven',
    '8': 'eight',
    '9': 'nine',
};

function verbalizeUpiForSpeech(upi: string): string {
    return upi
        .split('')
        .map(ch => {
            if (ch === '/') return ' slash ';
            return DIGIT_WORDS[ch] ?? ch;
        })
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function normalizeTextForSpeech(text: string): string {
    return text.replace(UPI_SPEECH_RE, (upi) => `${verbalizeUpiForSpeech(upi)}`);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface ParcelRef {
    upi: string;
    polygon: string | null;
    lat: number | null;
    lon: number | null;
    // Status / condition fields
    for_sale?: boolean;
    price?: number | null;
    under_mortgage?: boolean;
    has_caveat?: boolean;
    in_transaction?: boolean;
    overlaps?: boolean;
    property_id?: number | null;
    has_condition?: boolean;
    // Detail fields for inline card
    district?: string | null;
    sector?: string | null;
    land_use_type?: string | null;
    parcel_area_sqm?: number | null;
}

interface Message {
    id: string;
    type: 'user' | 'bot';
    content: string;
    timestamp: Date;
    parcels?: ParcelRef[];
}

export interface SimpleAiChatbotProps {
    position?: 'bottom-right' | 'bottom-left';
    title?: string;
    zIndex?: number;
    verifiedUPI?: string | null;
    /** Called every time the bot returns parcel suggestions so the map can highlight them */
    onParcelsUpdate?: (parcels: ParcelRef[]) => void;
    /** Called when the user clicks a specific parcel chip — should open the DetailPopup */
    onParcelSelect?: (upi: string) => void;
    /** Called whenever the active/selected UPI changes (PDF upload, single chip reply, chip click) */
    onUpiChange?: (upi: string) => void;
}

// ---------------------------------------------------------------------------
// Session helpers (persisted in sessionStorage so a page-refresh starts fresh)
// ---------------------------------------------------------------------------
const SESSION_KEY = (upi: string | null) => `chat_session_id_${upi ?? 'global'}`;

const getStoredSessionId = (upi: string | null): number | null => {
    const v = sessionStorage.getItem(SESSION_KEY(upi));
    return v ? parseInt(v, 10) : null;
};

const storeSessionId = (upi: string | null, id: number) => {
    sessionStorage.setItem(SESSION_KEY(upi), String(id));
};

const clearSessionId = (upi: string | null) => {
    sessionStorage.removeItem(SESSION_KEY(upi));
};

// ---------------------------------------------------------------------------
// Admin-only query guard
// ---------------------------------------------------------------------------
const ADMIN_ONLY_PATTERNS = [
    /how many (parcels|properties|lands|titles)/i,
    /list all (parcels|properties|owners|users|people)/i,
    /all parcels (with|that|owned|belonging|having)/i,
    /count.*parcel/i,
    /who (owns|owned) all/i,
    /all owners/i,
    /total number of (parcels|properties|land)/i,
    /database.*all/i,
    /all land.*owner/i,
    /which (owner|person|user).*owns/i,
    /parcels.*belonging to/i,
    /show me all/i,
];

function isAdminOnlyQuery(text: string): boolean {
    return ADMIN_ONLY_PATTERNS.some(p => p.test(text));
}

// ---------------------------------------------------------------------------
// Markdown renderer
// ---------------------------------------------------------------------------
function renderInlineMarkdown(text: string): React.ReactNode[] {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**'))
            return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
        if (part.startsWith('*') && part.endsWith('*'))
            return <em key={i}>{part.slice(1, -1)}</em>;
        if (part.startsWith('`') && part.endsWith('`'))
            return <code key={i} className="bg-black/10 rounded px-0.5 font-mono text-[11px]">{part.slice(1, -1)}</code>;
        return <React.Fragment key={i}>{part}</React.Fragment>;
    });
}

function RenderMarkdown({ text, isUser }: { text: string; isUser?: boolean }) {
    const lines = text.split('\n');
    return (
        <div className="space-y-0.5">
            {lines.map((line, i) => {
                if (line.startsWith('### '))
                    return <p key={i} className="font-bold text-[12px] mt-1">{renderInlineMarkdown(line.slice(4))}</p>;
                if (line.startsWith('## '))
                    return <p key={i} className="font-bold text-[13px] mt-1">{renderInlineMarkdown(line.slice(3))}</p>;
                if (line.startsWith('# '))
                    return <p key={i} className="font-bold text-sm mt-1">{renderInlineMarkdown(line.slice(2))}</p>;
                if (line.startsWith('- ') || line.startsWith('* '))
                    return (
                        <div key={i} className="flex gap-1.5 items-start">
                            <span className="mt-1 shrink-0">•</span>
                            <span>{renderInlineMarkdown(line.slice(2))}</span>
                        </div>
                    );
                if (line.trim() === '') return <div key={i} className="h-1" />;
                return <p key={i} className={`leading-relaxed ${isUser ? '' : ''}`}>{renderInlineMarkdown(line)}</p>;
            })}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export const SimpleAiChatbot: React.FC<SimpleAiChatbotProps> = ({
    verifiedUPI = null,
    position = 'bottom-right',
    title = 'Land Assistant',
    zIndex = 9999,
    onParcelsUpdate,
    onParcelSelect,
    onUpiChange,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    // activeUPI: starts from prop, gets updated whenever a new parcel is identified
    const [activeUPI, setActiveUPI] = useState<string | null>(verifiedUPI ?? null);
    const [sessionId, setSessionId] = useState<number | null>(() => getStoredSessionId(verifiedUPI));
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '0',
            type: 'bot',
            content: verifiedUPI
                ? `Hello! I'm your SafeLand Land Assistant. I can see you're looking at parcel **${verifiedUPI}**. Ask me anything about it — price, land use, legal status, safety, and more!`
                : 'Please select a parcel on the map or upload a land certificate PDF to start chat.',
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isUploadingPdf, setIsUploadingPdf] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [sessionError, setSessionError] = useState<string | null>(null);
    // lastUploadedUpi: tracks the most recently uploaded PDF parcel so
    // the session always focuses on the newest upload (unless user says 'compare')
    const [lastUploadedUpi, setLastUploadedUpi] = useState<string | null>(null);
    // chipNotices: inline notices shown below a parcel chip after the user clicks it
    const [chipNotices, setChipNotices] = useState<Record<string, string>>({});

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
    const initializedSessionForUpiRef = useRef<string | null>(verifiedUPI ?? null);

    const speechRecognitionSupported = typeof window !== 'undefined' &&
        ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    const hasSelectedParcel = Boolean(activeUPI);

    // -----------------------------------------------------------------------
    // Scroll to bottom on new messages
    // -----------------------------------------------------------------------
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input when chat opens
    useEffect(() => {
        if (isOpen) setTimeout(() => inputRef.current?.focus(), 150);
    }, [isOpen]);

    const makeWelcomeMessage = useCallback((upi: string | null): Message => {
        return {
            id: Date.now().toString(),
            type: 'bot',
            content: upi
                ? `Hello! I'm your SafeLand Land Assistant. I can see you're looking at parcel **${upi}**. Ask me anything about it — price, land use, legal status, safety, and more!`
                : 'Please select a parcel on the map or upload a land certificate PDF to start chat.',
            timestamp: new Date(),
        };
    }, []);

    const startNewSessionForParcel = useCallback(async (upi: string) => {
        const normalized = upi.trim();
        if (!normalized) return;

        try {
            clearSessionId(normalized);
            const { data } = await api.post('/api/chat/sessions', {
                upi: normalized,
                title: `Parcel ${normalized}`,
            });
            const id: number = data.id;
            storeSessionId(normalized, id);
            setSessionId(id);
            setMessages([makeWelcomeMessage(normalized)]);
            setSessionError(null);
        } catch {
            setSessionId(null);
            setSessionError('Could not start a new chat session for this parcel. Please try again.');
        }
    }, [makeWelcomeMessage]);

    // Keep activeUPI in sync if the parent changes verifiedUPI externally
    useEffect(() => {
        if (verifiedUPI) setActiveUPI(verifiedUPI);
    }, [verifiedUPI]);

    // Start a fresh chat session whenever parcel selection changes
    useEffect(() => {
        if (!activeUPI) {
            setSessionId(null);
            setMessages([makeWelcomeMessage(null)]);
            initializedSessionForUpiRef.current = null;
            return;
        }

        if (initializedSessionForUpiRef.current === activeUPI) return;
        initializedSessionForUpiRef.current = activeUPI;
        setIsOpen(true);
        setIsListening(false);
        void startNewSessionForParcel(activeUPI);
    }, [activeUPI, makeWelcomeMessage, startNewSessionForParcel]);

    // Cleanup speech resources on unmount
    useEffect(() => {
        return () => {
            try {
                recognitionRef.current?.stop();
            } catch {
                // no-op
            }
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    // -----------------------------------------------------------------------
    // Create (or reuse) a backend session
    // -----------------------------------------------------------------------
    const ensureSession = useCallback(async (): Promise<number> => {
        if (sessionId) return sessionId;
        const { data } = await api.post('/api/chat/sessions', {
            upi: activeUPI ?? null,
            title: activeUPI ? `Parcel ${activeUPI}` : 'General inquiry',
        });
        const id: number = data.id;
        storeSessionId(activeUPI, id);
        setSessionId(id);
        return id;
    }, [sessionId, activeUPI]);

    // -----------------------------------------------------------------------
    // PDF upload
    // -----------------------------------------------------------------------
    const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.type !== 'application/pdf') {
            setSessionError('Please upload a PDF file.');
            return;
        }

        setIsUploadingPdf(true);
        setSessionError(null);
        // Show a user-side message immediately
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            type: 'user',
            content: `📄 Uploaded certificate: ${file.name}`,
            timestamp: new Date(),
        }]);

        try {
            const sid = await ensureSession();
            const form = new FormData();
            form.append('file', file);
            const { data } = await api.post(
                `/api/chat/sessions/${sid}/upload-pdf`,
                form,
                { headers: { 'Content-Type': 'multipart/form-data' } },
            );

            if (!data.success) {
                setMessages(prev => [...prev, {
                    id: (Date.now() + 1).toString(),
                    type: 'bot',
                    content: data.message ?? 'Could not read the PDF. Please ensure it is a valid land certificate.',
                    timestamp: new Date(),
                }]);
                return;
            }

            const parcel: ParcelRef = data.parcel;

            // Determine whether the user is in a 'compare' context so we keep old parcels
            const isCompareContext = messages.some(m =>
                m.type === 'user' && /compare|vs\.?\s|versus/i.test(m.content)
            );

            // If NOT in compare mode and there's a previous upload, note the switch
            const switchNotice =
                lastUploadedUpi && !isCompareContext && parcel && parcel.upi !== lastUploadedUpi
                    ? `\n\n(Switched focus to **${parcel.upi}** — previous parcel **${lastUploadedUpi}** is now secondary. Say "compare" to analyse both.)`
                    : '';

            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                type: 'bot',
                content: (data.message ?? '') + switchNotice,
                timestamp: new Date(),
                parcels: parcel ? [parcel] : undefined,
            }]);
            if (parcel) {
                // Always zoom/highlight the newly uploaded parcel
                onParcelsUpdate?.([parcel]);
                // Update active UPI to the new upload
                setActiveUPI(parcel.upi);
                onUpiChange?.(parcel.upi);
                setLastUploadedUpi(parcel.upi);
                // If the parcel has no issues and is for sale, open the detail popup
                const hasIssue = parcel.under_mortgage || parcel.has_caveat ||
                    parcel.in_transaction || parcel.overlaps || parcel.has_condition;
                if (!hasIssue && parcel.for_sale) {
                    onParcelSelect?.(parcel.upi);
                }
            }
        } catch (err: any) {
            setMessages(prev => [...prev, {
                id: (Date.now() + 2).toString(),
                type: 'bot',
                content: 'Failed to process the PDF. Please try again.',
                timestamp: new Date(),
            }]);
        } finally {
            setIsUploadingPdf(false);
            // Reset file input so the same file can be uploaded again if needed
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // -----------------------------------------------------------------------
    // Chip click — zoom always; open popup only if for_sale & no issues
    // -----------------------------------------------------------------------
    const handleChipClick = (p: ParcelRef) => {
        // Always zoom to the parcel and update active UPI
        onParcelsUpdate?.([p]);
        setActiveUPI(p.upi);
        onUpiChange?.(p.upi);

        const hasIssue = p.under_mortgage || p.has_caveat ||
            p.in_transaction || p.overlaps || p.has_condition;

        if (!hasIssue && p.for_sale) {
            // Clean parcel that is for sale → open detail popup
            onParcelSelect?.(p.upi);
            setChipNotices(prev => ({ ...prev, [p.upi]: '' }));
        } else {
            // Build a specific notice
            const issues: string[] = [];
            if (p.under_mortgage) issues.push('under mortgage');
            if (p.has_caveat) issues.push('has a caveat');
            if (p.in_transaction) issues.push('currently in a transaction — not safe to buy');
            if (p.overlaps) issues.push('has a boundary overlap with another parcel');
            if (!p.for_sale) issues.push('not listed for sale');

            const notice = issues.length
                ? `⚠️ This parcel is ${issues.join(', ')}. It is not safe to proceed with a purchase at this time.`
                : '⚠️ This parcel has unresolved conditions. Inspect carefully before buying.';

            setChipNotices(prev => ({ ...prev, [p.upi]: notice }));
        }
    };

    const speakText = useCallback((text: string) => {
        if (!text || typeof window === 'undefined' || !window.speechSynthesis) return;
        const spokenText = normalizeTextForSpeech(text);
        const utterance = new SpeechSynthesisUtterance(spokenText);
        utterance.lang = 'en-US';
        utterance.rate = 1;
        utterance.pitch = 1;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    }, []);

    // -----------------------------------------------------------------------
    // Send a message (shared for text + voice)
    // -----------------------------------------------------------------------
    const sendMessage = async (rawText: string, viaVoice: boolean) => {
        const text = rawText.trim();
        if (!text || isLoading) return;

        if (!hasSelectedParcel) {
            const prompt = 'Please select a parcel on the map or upload a land certificate PDF to start chat.';
            setMessages(prev => [
                ...prev,
                {
                    id: Date.now().toString(),
                    type: 'bot',
                    content: prompt,
                    timestamp: new Date(),
                },
            ]);
            setSessionError(prompt);
            return;
        }

        // Guard: admin-only questions should not be answered for regular users
        if (isAdminOnlyQuery(text)) {
            setMessages(prev => [
                ...prev,
                { id: Date.now().toString(), type: 'user', content: text, timestamp: new Date() },
                {
                    id: (Date.now() + 1).toString(),
                    type: 'bot',
                    content: '🔒 Only authorised administrators can query aggregate system data such as parcel counts, owner lists, or bulk statistics. If you believe you should have access, please contact your administrator.',
                    timestamp: new Date(),
                },
            ]);
            setInput('');
            return;
        }

        const userMsg: Message = {
            id: Date.now().toString(),
            type: 'user',
            content: viaVoice ? `🎤 ${text}` : text,
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMsg]);
        if (!viaVoice) setInput('');
        setIsLoading(true);
        setSessionError(null);

        try {
            const sid = await ensureSession();
            const { data } = viaVoice
                ? await api.post(`/api/chat/sessions/${sid}/voice`, {
                    transcript: text,
                    locale: 'en-US',
                    selected_upi: activeUPI,
                })
                : await api.post(`/api/chat/sessions/${sid}/message`, {
                    message: text,
                    selected_upi: activeUPI,
                });

            const replyParcels: ParcelRef[] = Array.isArray(data.parcels) ? data.parcels : [];

            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                type: 'bot',
                content: data.reply?.content ?? "I'm not sure about that. Could you rephrase?",
                timestamp: new Date(),
                parcels: replyParcels.length ? replyParcels : undefined,
            };
            setMessages(prev => [...prev, botMsg]);

            if (viaVoice) {
                const ttsText: string = data?.voice?.tts_text || botMsg.content;
                speakText(ttsText);
            }

            if (replyParcels.length > 0) {
                onParcelsUpdate?.(replyParcels);
                const firstUpi = replyParcels[0]?.upi;
                if (firstUpi) {
                    setActiveUPI(firstUpi);
                    onUpiChange?.(firstUpi);
                }
            }

        } catch (err: any) {
            const detail = err?.response?.data?.detail ?? "Sorry, I'm having trouble connecting. Please try again.";
            // If the session was deleted on the server, clear stored id and retry once
            if (err?.response?.status === 404 && sessionId) {
                sessionStorage.removeItem(SESSION_KEY(activeUPI));
                setSessionId(null);
                setSessionError('Session expired — starting a new conversation.');
            } else {
                setMessages(prev => [
                    ...prev,
                    {
                        id: (Date.now() + 2).toString(),
                        type: 'bot',
                        content: detail,
                        timestamp: new Date(),
                    },
                ]);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = async () => {
        await sendMessage(input, false);
    };

    const startVoiceCapture = async () => {
        if (!hasSelectedParcel) {
            setSessionError('Please select a parcel on the map or upload a land certificate PDF before using voice chat.');
            return;
        }
        if (!speechRecognitionSupported) {
            setSessionError('Voice input is not supported in this browser.');
            return;
        }
        if (isLoading || isUploadingPdf || isListening) return;

        setSessionError(null);

        const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition: SpeechRecognitionLike = new SpeechRecognitionCtor();
        recognitionRef.current = recognition;
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.continuous = false;

        recognition.onresult = async (event: SpeechRecognitionEventLike) => {
            const result = event.results[0];
            const transcript = result?.[0]?.transcript?.trim() || '';
            if (!transcript) {
                setSessionError('No speech detected. Please try again.');
                return;
            }
            await sendMessage(transcript, true);
        };

        recognition.onerror = () => {
            setSessionError('Voice recognition failed. Please try again.');
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        setIsListening(true);
        recognition.start();
    };

    const formatTime = (date: Date) =>
        date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    /** Returns Tailwind border/text/bg classes based on parcel status */
    const getChipClasses = (p: ParcelRef): string => {
        const hasIssue = p.has_condition || p.under_mortgage || p.has_caveat || p.in_transaction || p.overlaps;
        if (hasIssue)
            return 'bg-red-50 border-red-300 text-red-700 hover:bg-red-600 hover:text-white';
        if (p.property_id)
            return 'bg-green-50 border-green-300 text-green-700 hover:bg-green-600 hover:text-white';
        return 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-600 hover:text-white';
    };

    const formatPrice = (price: number | null | undefined): string | null => {
        if (!price) return null;
        if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(1)}M RWF`;
        if (price >= 1_000) return `${(price / 1_000).toFixed(0)}K RWF`;
        return `${price} RWF`;
    };

    const positionStyles =
        position === 'bottom-right'
            ? { bottom: '20px', right: '20px' }
            : { bottom: '20px', left: '20px' };

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------
    return (
        <>
            {/* Floating button */}
            {!isOpen && (
                <motion.button
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    onClick={() => setIsOpen(true)}
                    style={{ ...positionStyles, zIndex, position: 'fixed' }}
                    className="w-14 h-14 rounded-full bg-[#395d91] text-white shadow-lg hover:bg-[#2d4a75] transition-colors flex items-center justify-center"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                >
                    <MessageCircle size={24} />
                </motion.button>
            )}

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ scale: 0.85, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.85, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                        style={{
                            ...positionStyles,
                            zIndex,
                            position: 'fixed',
                            width: '400px',
                            height: '540px',
                        }}
                        className="bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
                    >
                        {/* ── Header ── */}
                        <div className="flex items-center justify-between px-4 py-3 bg-[#395d91] text-white flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                    <Bot size={16} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm">{title}</h3>
                                    <p className="text-xs text-white/80 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" />
                                        {activeUPI ? `Parcel ${activeUPI}` : 'Ask me anything'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* ── Session error banner ── */}
                        {sessionError && (
                            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-700">
                                {sessionError}
                            </div>
                        )}

                        {!hasSelectedParcel && (
                            <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 text-xs text-blue-700">
                                Select a parcel on the map or upload a certificate to enable chat and voice.
                            </div>
                        )}

                        {/* ── Messages ── */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map(message => (
                                <div
                                    key={message.id}
                                    className={`flex gap-2 ${message.type === 'user' ? 'justify-end' : 'justify-start'
                                        }`}
                                >
                                    {message.type === 'bot' && (
                                        <div className="w-8 h-8 rounded-full bg-[#395d91] flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <Bot size={14} className="text-white" />
                                        </div>
                                    )}

                                    <div className="max-w-[75%] flex flex-col gap-1.5">
                                        {/* Bubble */}
                                        <div
                                            className={`rounded-2xl px-4 py-2 text-sm ${message.type === 'user'
                                                ? 'bg-[#395d91] text-white rounded-br-none'
                                                : 'bg-[#f1f5f9] text-gray-800 rounded-bl-none'
                                                }`}
                                        >
                                            <RenderMarkdown
                                                text={message.content}
                                                isUser={message.type === 'user'}
                                            />
                                            <div className={`flex items-center justify-between mt-1 gap-2`}>
                                                <p className={`text-[10px] ${message.type === 'user' ? 'text-white/70' : 'text-gray-400'}`}>
                                                    {formatTime(message.timestamp)}
                                                </p>
                                                {/* Edit & resend button — user messages only */}
                                                {message.type === 'user' && !message.content.startsWith('📄') && (
                                                    <button
                                                        onClick={() => setInput(message.content)}
                                                        title="Edit and resend"
                                                        className="p-0.5 rounded text-white/50 hover:text-white/90 transition-colors"
                                                    >
                                                        <Edit2 size={10} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Parcel chips — only on bot messages */}
                                        {message.type === 'bot' && message.parcels && message.parcels.length > 0 && (
                                            <div className="mt-1 space-y-1.5">
                                                {message.parcels.map(p => {
                                                    const chipCls = getChipClasses(p);
                                                    const priceStr = formatPrice(p.price);
                                                    const hasIssue = p.under_mortgage || p.has_caveat ||
                                                        p.in_transaction || p.overlaps || p.has_condition;
                                                    const notice = chipNotices[p.upi];
                                                    return (
                                                        <div key={p.upi} className="flex flex-col gap-0.5">
                                                            {/* Chip button */}
                                                            <button
                                                                onClick={() => handleChipClick(p)}
                                                                title={hasIssue ? 'View issues' : 'Zoom to parcel & open details'}
                                                                className={`inline-flex items-center gap-1 px-2 py-1 border rounded-full text-[11px] font-medium transition-colors shadow-sm self-start ${chipCls}`}
                                                            >
                                                                <MapPin size={10} />
                                                                {p.upi}
                                                                {p.for_sale === false && (
                                                                    <span className="ml-1 opacity-75 text-[9px]">(Not for sale)</span>
                                                                )}
                                                                {p.in_transaction && (
                                                                    <span className="ml-1 text-[9px] font-bold">⚠ In Transaction</span>
                                                                )}
                                                            </button>
                                                            {/* Mini info strip */}
                                                            {(p.parcel_area_sqm || p.district || p.price != null) && (
                                                                <div className="pl-2 flex flex-wrap gap-x-2 gap-y-0 text-[10px] text-gray-500">
                                                                    {p.parcel_area_sqm != null && (
                                                                        <span>{p.parcel_area_sqm.toLocaleString()} m²</span>
                                                                    )}
                                                                    {p.land_use_type && <span>{p.land_use_type}</span>}
                                                                    {p.district && <span>{p.district}</span>}
                                                                    {priceStr && <span className="text-green-700 font-medium">{priceStr}</span>}
                                                                    {p.under_mortgage && <span className="text-red-500">🔴 Mortgage</span>}
                                                                    {p.has_caveat && <span className="text-red-500">⚠️ Caveat</span>}
                                                                    {p.in_transaction && <span className="text-orange-500 font-medium">🔄 In Transaction — not safe to buy</span>}
                                                                    {p.overlaps && <span className="text-red-500">⚡ Overlaps</span>}
                                                                </div>
                                                            )}
                                                            {/* Inline notice shown after chip click */}
                                                            {notice && (
                                                                <div className="mt-0.5 ml-1 flex items-start gap-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
                                                                    <ShieldAlert size={10} className="mt-0.5 shrink-0" />
                                                                    <span>{notice}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                                {message.parcels.length > 1 && (
                                                    <button
                                                        onClick={() => onParcelsUpdate?.(message.parcels!)}
                                                        className="inline-flex items-center gap-1 px-2 py-1 bg-[#395d91] text-white rounded-full text-[11px] font-medium hover:bg-[#2d4a75] transition-colors shadow-sm"
                                                    >
                                                        <MapPin size={10} />
                                                        Show all {message.parcels.length} on map
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {message.type === 'user' && (
                                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <User size={14} className="text-gray-600" />
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Typing indicator */}
                            {isLoading && (
                                <div className="flex gap-2">
                                    <div className="w-8 h-8 rounded-full bg-[#395d91] flex items-center justify-center">
                                        <Bot size={14} className="text-white" />
                                    </div>
                                    <div className="bg-[#f1f5f9] rounded-2xl px-4 py-3 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* ── Input ── */}
                        <div className="p-3 border-t border-gray-200 flex-shrink-0">
                            {/* PDF hint */}
                            <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-1.5">
                                <FileText size={10} />
                                <span>Attach a land certificate PDF to ask questions about it</span>
                            </div>
                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="application/pdf"
                                className="hidden"
                                onChange={handlePdfUpload}
                            />
                            <div className="flex gap-2">
                                {/* PDF upload button */}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isLoading || isUploadingPdf}
                                    title="Upload land certificate PDF"
                                    className="px-2 py-2 border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 hover:text-[#395d91] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                                >
                                    {isUploadingPdf
                                        ? <Loader2 size={16} className="animate-spin" />
                                        : <Paperclip size={16} />
                                    }
                                </button>
                                <button
                                    onClick={startVoiceCapture}
                                    disabled={isLoading || isUploadingPdf || !speechRecognitionSupported || !hasSelectedParcel}
                                    title={speechRecognitionSupported ? 'Speak to ask a question' : 'Voice input not supported in this browser'}
                                    className={`px-2 py-2 border rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 ${isListening
                                        ? 'border-red-300 text-red-600 bg-red-50'
                                        : 'border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-[#395d91]'
                                        }`}
                                >
                                    {isListening
                                        ? <Loader2 size={16} className="animate-spin" />
                                        : <Mic size={16} />
                                    }
                                </button>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                    placeholder={activeUPI ? `Ask about ${activeUPI}…` : 'Select parcel first…'}
                                    disabled={isLoading || isUploadingPdf || !hasSelectedParcel}
                                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#395d91]/20 focus:border-[#395d91] disabled:bg-gray-50"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || isLoading || isUploadingPdf || !hasSelectedParcel}
                                    className="px-3 py-2 bg-[#395d91] text-white rounded-lg hover:bg-[#2d4a75] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default SimpleAiChatbot;