import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Building2, Users, BarChart3, Settings,
    Bell, Search, Menu, X, LogOut, ChevronDown,
    TrendingUp, Wallet, ShieldCheck, MapPin,
    MoreVertical, Globe, Sun, Moon, Home, Briefcase
} from 'lucide-react';
import { clsx } from 'clsx';
// --- YOUR CONTEXTS ---
import { useLanguage } from '../contexts/language-context';
import { useTheme } from '../contexts/theme-context';

type ViewState = 'overview' | 'properties' | 'users' | 'analytics' | 'settings';

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

    // --- SUB-COMPONENTS ---

    const NavItem = ({ id, icon: Icon, label }: { id: ViewState, icon: any, label: string }) => {
        const isActive = activeView === id;
        return (
            <button
                onClick={() => { setActiveView(id); setSidebarOpen(false); }}
                className={clsx(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group font-medium text-sm relative",
                    isActive
                        ? "text-white bg-primary"
                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                )}
            >
                <Icon size={18} className={clsx(isActive ? "text-white" : "text-gray-400 group-hover:text-white")} />
                <span>{label}</span>
                {isActive && (
                    <motion.div layoutId="active-border" className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-white" />
                )}
            </button>
        );
    };

    return (
        <div className="flex h-screen bg-[#F3F4F6] dark:bg-[#050c1a] font-sans overflow-hidden transition-colors duration-300">

            {/* ==================== 1. SIDEBAR (Dark Professional Theme) ==================== */}

            {/* Mobile Backdrop */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setSidebarOpen(false)}
                        className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar Container */}
            <aside
                className={clsx(
                    "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#0a162e] text-white flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 border-r border-gray-800",
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Brand Header */}
                <div className="h-16 flex items-center px-6 border-b border-white/10">
                    <div className="flex items-center gap-2.5 justify-start w-full">
                        <div className="w-full h-13 py-1 rounded-lg flex items-start justify-start">
                            <img src="/logo_words.png" alt="" className="h-full object-contain brightness-0 invert" />
                        </div>
                        {/* <span className="text-lg font-bold tracking-tight">SafeLand</span> */}
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-gray-400">
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation Links */}
                <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
                    <div className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Main Menu</div>
                    <NavItem id="overview" icon={LayoutDashboard} label={t('dash.nav.overview')} />
                    <NavItem id="properties" icon={Building2} label={t('dash.nav.properties')} />
                    <NavItem id="users" icon={Users} label={t('dash.nav.users')} />

                    <div className="px-3 mt-6 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Management</div>
                    <NavItem id="analytics" icon={BarChart3} label={t('dash.nav.analytics')} />
                    <NavItem id="settings" icon={Settings} label={t('dash.nav.settings')} />
                </div>

                {/* User Mini Profile */}
                <div className="p-4 border-t border-white/10 bg-[#081226]">
                    <div className="flex items-center gap-3">
                        <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="Admin" className="w-9 h-9 rounded-full border border-white/20" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate text-white">Admin User</p>
                            <p className="text-xs text-gray-400 truncate">admin@safeland.rw</p>
                        </div>
                        <button className="text-gray-400 hover:text-white transition-colors">
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </aside>


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
                                {activeView === 'properties' && <EmptyWidget title="Properties Management" />}
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

