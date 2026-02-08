import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Building2, Users, BarChart3, Settings, LogOut } from 'lucide-react';
import { clsx } from 'clsx';

type ViewState = 'overview' | 'properties' | 'users' | 'analytics' | 'settings';

type Props = {
    activeView: ViewState;
    setActiveView: (v: ViewState) => void;
    isSidebarOpen: boolean;
    setSidebarOpen: (v: boolean) => void;
    loggedUser: any | null;
    handleLogout: () => void;
    t: (k: string) => string;
    propertiesView: 'record' | 'manage';
    setPropertiesView: (v: 'record' | 'manage') => void;
};

const NavItem = ({ icon: Icon, label, onClick, isActive }: { id?: ViewState, icon: any, label: string, onClick?: () => void, isActive?: boolean }) => {
    const active = !!isActive;
    return (
        <button
            onClick={onClick}
            className={clsx(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group font-medium text-sm relative",
                active ? "text-white bg-primary" : "text-gray-400 hover:bg-white/5 hover:text-white"
            )}
        >
            <Icon size={18} className={clsx(active ? "text-white" : "text-gray-400 group-hover:text-white")} />
            <span>{label}</span>
            {active && (
                <motion.div layoutId="active-border" className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-white" />
            )}
        </button>
    );
};

export default function Sidebar({ activeView, setActiveView, isSidebarOpen, setSidebarOpen, loggedUser, handleLogout, t, propertiesView, setPropertiesView }: Props) {
    const [propertiesOpen, setPropertiesOpen] = useState(false);

    // Normalize role(s) to array
    const userRolesRaw = loggedUser && (loggedUser.role || loggedUser.usertype || loggedUser.user_type);
    const userRoles: string[] = Array.isArray(userRolesRaw)
        ? userRolesRaw.map(r => String(r).toLowerCase())
        : userRolesRaw
            ? [String(userRolesRaw).toLowerCase()]
            : ['guest'];

    // Role-based menu arrays
    const menusByRole: any = {
        admin: ['overview', 'properties', 'users', 'analytics', 'settings'],
        seller: ['overview', 'properties', 'analytics', 'settings'],
        buyer: ['overview', 'properties', 'analytics'],
        blocker: ['overview', 'properties'],
        guest: ['overview', 'properties']
    };

    // Combine allowed menus for all user roles
    const allowedMenus = Array.from(new Set(
        userRoles.flatMap(role => menusByRole[role] || menusByRole['guest'])
    ));

    // Helper booleans for role checks
    const isAdmin = userRoles.includes('admin');
    const isSeller = userRoles.includes('seller');
    const isBuyer = userRoles.includes('buyer');
    const isBlocker = userRoles.includes('blocker');
    console.log(isAdmin, isSeller, isBuyer, isBlocker);

    return (
        <>
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setSidebarOpen(false)}
                        className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
                    />
                )}
            </AnimatePresence>

            <aside
                className={clsx(
                    "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#0a162e] text-white flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 border-r border-gray-800",
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="h-16 flex items-center px-6 border-b border-white/10">
                    <div className="flex items-center gap-2.5 justify-start w-full">
                        <div className="w-full h-13 py-1 rounded-lg flex items-start justify-start">
                            <img src="/logo_words.png" alt="" className="h-full object-contain brightness-0 invert" />
                        </div>
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-gray-400">
                        <LogOut size={20} />
                    </button>
                </div>

                <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
                    <div className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Main Menu</div>
                    {allowedMenus.includes('overview') && (
                        <NavItem id="overview" icon={LayoutDashboard} label={t('dash.nav.overview')} onClick={() => { setActiveView('overview'); setSidebarOpen(false); }} isActive={activeView === 'overview'} />
                    )}

                    {allowedMenus.includes('properties') && (
                        <div>
                            <button onClick={() => setPropertiesOpen(prev => !prev)} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white text-sm">
                                <Building2 size={18} />
                                <span>{t('dash.nav.properties')}</span>
                                <span className="ml-auto text-xs text-gray-400">{propertiesOpen ? '▾' : '▸'}</span>
                            </button>
                            <AnimatePresence>
                                {propertiesOpen && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="pl-6 pr-3 py-2 space-y-1">
                                        <button onClick={() => { setActiveView('properties'); setPropertiesView('record'); setSidebarOpen(false); }} className={clsx("w-full text-left px-3 py-2 rounded-md text-sm", propertiesView === 'record' ? 'bg-white/5 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white')}>Record Property</button>
                                        <button onClick={() => { setActiveView('properties'); setPropertiesView('manage'); setSidebarOpen(false); }} className={clsx("w-full text-left px-3 py-2 rounded-md text-sm", propertiesView === 'manage' ? 'bg-white/5 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white')}>Manage Property</button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    {allowedMenus.includes('users') && (
                        <NavItem id="users" icon={Users} label={t('dash.nav.users')} onClick={() => { setActiveView('users'); setSidebarOpen(false); }} isActive={activeView === 'users'} />
                    )}

                    <div className="px-3 mt-6 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Management</div>
                    <NavItem id="analytics" icon={BarChart3} label={t('dash.nav.analytics')} onClick={() => { setActiveView('analytics'); setSidebarOpen(false); }} isActive={activeView === 'analytics'} />
                    <NavItem id="settings" icon={Settings} label={t('dash.nav.settings')} onClick={() => { setActiveView('settings'); setSidebarOpen(false); }} isActive={activeView === 'settings'} />
                </div>

                <div className="p-4 border-t border-white/10 bg-[#081226]">
                    <div className="flex items-center gap-3">
                        {loggedUser?.avatar ? (
                            <img src={loggedUser.avatar} alt="User" className="w-9 h-9 rounded-full border border-white/20 object-cover" />
                        ) : (
                            <div className="w-9 h-9 rounded-full border border-white/20 bg-white/10 flex items-center justify-center text-xs font-bold text-white">
                                {(loggedUser?.first_name?.[0] || 'U').toUpperCase()}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate text-white">
                                {loggedUser ? `${loggedUser.first_name || ''} ${loggedUser.last_name || ''}`.trim() || 'User' : 'User'}
                            </p>
                            <p className="text-xs text-gray-400 truncate">{loggedUser?.email || ''}</p>
                        </div>
                        <button onClick={handleLogout} className="text-gray-400 hover:text-white transition-colors">
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
