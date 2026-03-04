// SimpleAiChatbot.tsx — fully integrated with SafeLand RAG backend
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User, Loader2, MapPin, Paperclip, FileText } from 'lucide-react';
import api from '../../instance/mainAxios';

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
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [sessionId, setSessionId] = useState<number | null>(() => getStoredSessionId(verifiedUPI));
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '0',
            type: 'bot',
            content: verifiedUPI
                ? `Hello! I'm your SafeLand Land Assistant. I can see you're looking at parcel **${verifiedUPI}**. Ask me anything about it — price, land use, legal status, safety, and more!`
                : "Hello! I'm your SafeLand Land Assistant. Ask me about any parcel, e.g. 'What parcels have no issues?' or mention a UPI like 1/01/01/001/0001.",
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isUploadingPdf, setIsUploadingPdf] = useState(false);
    const [sessionError, setSessionError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    // -----------------------------------------------------------------------
    // Create (or reuse) a backend session
    // -----------------------------------------------------------------------
    const ensureSession = useCallback(async (): Promise<number> => {
        if (sessionId) return sessionId;
        const { data } = await api.post('/api/chat/sessions', {
            upi: verifiedUPI ?? null,
            title: verifiedUPI ? `Parcel ${verifiedUPI}` : 'General inquiry',
        });
        const id: number = data.id;
        storeSessionId(verifiedUPI, id);
        setSessionId(id);
        return id;
    }, [sessionId, verifiedUPI]);

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
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                type: 'bot',
                content: data.message,
                timestamp: new Date(),
                parcels: parcel ? [parcel] : undefined,
            }]);
            if (parcel) {
                onParcelsUpdate?.([parcel]);
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
    // Send a message
    // -----------------------------------------------------------------------
    const handleSend = async () => {
        const text = input.trim();
        if (!text || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            type: 'user',
            content: text,
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);
        setSessionError(null);

        try {
            const sid = await ensureSession();
            const { data } = await api.post(`/api/chat/sessions/${sid}/message`, {
                message: text,
            });

            const parcels: ParcelRef[] = data.parcels ?? [];

            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                type: 'bot',
                content: data.reply?.content ?? "I'm not sure about that. Could you rephrase?",
                timestamp: new Date(),
                parcels: parcels.length > 0 ? parcels : undefined,
            };
            setMessages(prev => [...prev, botMsg]);

            // Notify parent map
            if (parcels.length > 0) onParcelsUpdate?.(parcels);

        } catch (err: any) {
            const detail = err?.response?.data?.detail ?? "Sorry, I'm having trouble connecting. Please try again.";
            // If the session was deleted on the server, clear stored id and retry once
            if (err?.response?.status === 404 && sessionId) {
                sessionStorage.removeItem(SESSION_KEY(verifiedUPI));
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

    const formatTime = (date: Date) =>
        date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    /** Returns Tailwind border/text/bg classes based on parcel status */
    const getChipClasses = (p: ParcelRef): string => {
        const hasIssue = p.has_condition || p.under_mortgage || p.has_caveat || p.in_transaction || p.overlaps;
        if (hasIssue)
            return 'bg-red-50 border-red-300 text-red-700 hover:bg-red-600 hover:text-white';
        if (p.property_id)
            return 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-600 hover:text-white';
        return 'bg-green-50 border-green-300 text-green-700 hover:bg-green-600 hover:text-white';
    };

    const formatPrice = (price: number | null | undefined): string | null => {
        if (!price) return null;
        if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(1)}M RWF`;
        if (price >= 1_000)     return `${(price / 1_000).toFixed(0)}K RWF`;
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
                                        {verifiedUPI ? `Parcel ${verifiedUPI}` : 'Ask me anything'}
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

                        {/* ── Messages ── */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map(message => (
                                <div
                                    key={message.id}
                                    className={`flex gap-2 ${
                                        message.type === 'user' ? 'justify-end' : 'justify-start'
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
                                            className={`rounded-2xl px-4 py-2 text-sm ${
                                                message.type === 'user'
                                                    ? 'bg-[#395d91] text-white rounded-br-none'
                                                    : 'bg-[#f1f5f9] text-gray-800 rounded-bl-none'
                                            }`}
                                        >
                                            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                                            <p
                                                className={`text-[10px] mt-1 ${
                                                    message.type === 'user' ? 'text-white/70' : 'text-gray-400'
                                                }`}
                                            >
                                                {formatTime(message.timestamp)}
                                            </p>
                                        </div>

                                        {/* Parcel chips — only on bot messages */}
                                        {message.type === 'bot' && message.parcels && message.parcels.length > 0 && (
                                            <div className="mt-1 space-y-1.5">
                                                {message.parcels.map(p => {
                                                    const chipCls = getChipClasses(p);
                                                    const priceStr = formatPrice(p.price);
                                                    return (
                                                        <div key={p.upi} className="flex flex-col gap-0.5">
                                                            {/* Chip button */}
                                                            <button
                                                                onClick={() => {
                                                                    onParcelsUpdate?.([p]);
                                                                    onParcelSelect?.(p.upi);
                                                                }}
                                                                title="Zoom to parcel & open details"
                                                                className={`inline-flex items-center gap-1 px-2 py-1 border rounded-full text-[11px] font-medium transition-colors shadow-sm self-start ${chipCls}`}
                                                            >
                                                                <MapPin size={10} />
                                                                {p.upi}
                                                                {p.for_sale === false && (
                                                                    <span className="ml-1 opacity-75 text-[9px]">(Not for sale)</span>
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
                                                                    {p.has_caveat     && <span className="text-red-500">⚠️ Caveat</span>}
                                                                    {p.in_transaction && <span className="text-orange-500">🔄 In Transaction</span>}
                                                                    {p.overlaps       && <span className="text-red-500">⚡ Overlaps</span>}
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
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                    placeholder={verifiedUPI ? `Ask about ${verifiedUPI}…` : 'Ask about any parcel…'}
                                    disabled={isLoading || isUploadingPdf}
                                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#395d91]/20 focus:border-[#395d91] disabled:bg-gray-50"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || isLoading || isUploadingPdf}
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