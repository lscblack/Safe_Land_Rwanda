import  { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
 
    Bell, Search, Menu,  Globe, Sun, Moon, Home, Briefcase
} from 'lucide-react';
import { clsx } from 'clsx';
import axios from 'axios';
// --- YOUR CONTEXTS ---
import { useLanguage } from '../contexts/language-context';
import { useTheme } from '../contexts/theme-context';
import RecordPropertyPage from '../components/dashboard/Forms/RecordPropertyPage';
import Sidebar from '../components/dashboard/Sidebar';

type ViewState = 'overview' | 'properties' | 'users' | 'analytics' | 'settings';

type LoggedUser = {
    first_name?: string;
    last_name?: string;
    email?: string;
    avatar?: string | null;
};

export const DashboardLayout = () => {
    // -- Global State --
    const { t, language, setLanguage } = useLanguage();
    const { theme, toggleTheme } = useTheme();

    // -- UI State --
    const [activeView, setActiveView] = useState<ViewState>('overview');
    const [isSidebarOpen, setSidebarOpen] = useState(false); // Mobile only
    const [isProfileOpen, setProfileOpen] = useState(false);
    const [isNotifOpen, setNotifOpen] = useState(false);
    const [isLangMenuOpen, setLangMenuOpen] = useState(false);
    const [loggedUser, setLoggedUser] = useState<LoggedUser | null>(null);
    const [propertiesView, setPropertiesView] = useState<'record' | 'manage'>('record');
    console.log("Current Language:", isProfileOpen);
    // -- Refs --   
    const profileRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);
    const langRef = useRef<HTMLDivElement>(null);

    // Close dropdowns on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
            if (langRef.current && !langRef.current.contains(e.target as Node)) setLangMenuOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchProfile = async () => {
            const userToken = localStorage.getItem('user_access_token');
            if (!userToken) {
                window.location.href = '/login';
                return;
            }
            try {
                const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/api/user/profile`, {
                    headers: { Authorization: `Bearer ${userToken}` },
                });
                console.log("Fetched User Profile:", response.data);
                setLoggedUser(response.data);
            } catch {
                window.location.href = '/login';
            }
        };
        fetchProfile();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('user_access_token');
        localStorage.removeItem('user_refresh_token');
        window.location.href = '/login';
    };

    // --- SUB-COMPONENTS ---

    return (
        <div className="flex h-screen bg-[#F3F4F6] dark:bg-[#050c1a] font-sans overflow-hidden transition-colors duration-300">

            <Sidebar
                activeView={activeView}
                setActiveView={setActiveView}
                isSidebarOpen={isSidebarOpen}
                setSidebarOpen={setSidebarOpen}
                loggedUser={loggedUser}
                handleLogout={handleLogout}
                t={t}
                propertiesView={propertiesView}
                setPropertiesView={setPropertiesView}
            />


            {/* ==================== 2. MAIN CONTENT AREA ==================== */}
            <div className="flex-1 flex flex-col min-w-0 h-full relative">

                {/* --- TOP NAVBAR --- */}
                <header className="h-16 bg-white dark:bg-[#0a162e] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 sm:px-6 z-30 flex-shrink-0">

                    {/* Left: Mobile Menu & Breadcrumbs */}
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg">
                            <Menu size={20} />
                        </button>
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <Home size={14} />
                            <span>/</span>
                            <span className="capitalize font-medium text-gray-900 dark:text-white">{activeView}</span>
                        </div>
                    </div>

                    {/* Right: Global Actions */}
                    <div className="flex items-center gap-2 sm:gap-4">

                        {/* Search */}
                        <div className="hidden md:flex items-center bg-gray-100 dark:bg-[#112240] rounded-lg px-3 py-2 w-64 border border-transparent focus-within:border-primary/50 transition-all">
                            <Search size={16} className="text-gray-400" />
                            <input type="text" placeholder="Search properties, users..." className="bg-transparent border-none focus:outline-none text-sm ml-2 w-full text-gray-700 dark:text-gray-200 placeholder-gray-400" />
                        </div>

                        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block"></div>

                        {/* Language */}
                        <div className="relative" ref={langRef}>
                            <button onClick={() => setLangMenuOpen(!isLangMenuOpen)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-300 transition-colors">
                                <Globe size={18} />
                            </button>
                            {isLangMenuOpen && (
                                <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-[#0a162e] rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50">
                                    {(['EN', 'FR', 'KIN'] as const).map(l => (
                                        <button key={l} onClick={() => { setLanguage(l); setLangMenuOpen(false) }} className={clsx("w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-white/5", language === l ? "text-primary font-bold" : "text-gray-600 dark:text-gray-300")}>{l}</button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Theme */}
                        <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-300 transition-colors">
                            {theme ? <Sun size={18} /> : <Moon size={18} />}
                        </button>

                        {/* Notifications */}
                        <div className="relative" ref={notifRef}>
                            <button onClick={() => setNotifOpen(!isNotifOpen)} className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-300 transition-colors">
                                <Bell size={18} />
                                <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-[#0a162e]" />
                            </button>
                            {/* Notif Dropdown */}
                            <AnimatePresence>
                                {isNotifOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                                        className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-[#0a162e] rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
                                    >
                                        <div className="p-3 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-[#0f1f3a]">
                                            <span className="text-xs font-bold uppercase text-gray-500">Notifications</span>
                                            <span className="text-xs text-primary font-semibold cursor-pointer">Clear</span>
                                        </div>
                                        <div className="max-h-[250px] overflow-y-auto">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="p-3 hover:bg-gray-50 dark:hover:bg-white/5 border-b border-gray-100 dark:border-gray-800 last:border-0 cursor-pointer flex gap-3">
                                                    <div className="mt-1 w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-800 dark:text-white">New Verification Request</p>
                                                        <p className="text-xs text-gray-500 mt-0.5">Plot #492 in Gasabo requires review.</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                    </div>
                </header>

                {/* --- SCROLLABLE CONTENT AREA --- */}
                <main className="flex-1 overflow-y-auto bg-[#F3F4F6] dark:bg-[#050c1a] p-4 sm:p-6 lg:p-8">

                    <div className="max-w-full mx-auto h-full flex flex-col">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeView}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.2 }}
                                className="flex-1"
                            >
                                {activeView === 'overview' && <EmptyWidget title="Overview Management" />}
                                {activeView === 'properties' && propertiesView === 'record' && <RecordPropertyPage />}
                                {activeView === 'properties' && propertiesView === 'manage' && <EmptyWidget title="Manage Properties" />}
                                {activeView === 'users' && <EmptyWidget title="User Management" />}
                                {activeView === 'analytics' && <EmptyWidget title="Analytics Center" />}
                                {activeView === 'settings' && <EmptyWidget title="System Settings" />}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                </main>
            </div>
        </div>
    );
};



// 3. EMPTY STATE WIDGET
const EmptyWidget = ({ title }: { title: string }) => (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
        <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center text-gray-400 mb-4">
            <Briefcase size={32} />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm">This module is currently under development. Check back later for updates.</p>
    </div>
);

