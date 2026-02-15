
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Building2, Users, BarChart3, Settings, LogOut, Timer, Building } from 'lucide-react';
import { clsx } from 'clsx';

// Define all possible views (sync with Dashboard)
type ViewState =
    | 'overview'
    | 'properties'
    | 'users'
    | 'analytics'
    | 'settings'
    | 'property-categories'
    | 'agencies'
    | 'apply-agency'
    | 'apply-broker'
    | 'my-agency'
    | 'agency-users'
    | 'rdb-certificate';

// Sidebar props
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

// Centralized menu config with role access
const MENU_CONFIG = [
    {
        id: 'overview',
        place: 'main',
        icon: LayoutDashboard,
        labelKey: 'dash.nav.overview',
        roles: ['admin', 'seller', 'buyer', 'blocker'],
    },
    {
        id: 'category',
        place: 'main',
        icon: Building,
        labelKey: 'Property Categories',
        roles: ['admin'],
        isCollapsible: true,
    },
    {
        id: 'my-properties',
        place: 'main',
        icon: LayoutDashboard,
        labelKey: 'My Properties',
        roles: ['seller', 'buyer', 'blocker'],
    },
    {
        id: 'properties',
        place: 'main',
        icon: Building2,
        labelKey: 'Manage Properties',
        roles: ['admin', 'seller', 'blocker'],
        isCollapsible: true,
    },
    {
        id: 'users',
        place: 'main',
        icon: Users,
        labelKey: 'dash.nav.users',
        roles: ['admin'],
    },
    {
        id: 'agencies',
        place: 'main',
        icon: Building2,
        labelKey: 'Agencies&Brokers',
        roles: ['admin',"buyer"],
    },
    {
        id: 'analytics',
        place: 'main',
        icon: BarChart3,
        labelKey: 'Market Analytics',
        roles: ['admin', 'seller', 'buyer'],
    },

    {
        id: 'settings',
        place: 'management',
        icon: Settings,
        labelKey: 'dash.nav.settings',
        roles: ['admin', 'seller'],
    },
    {
        id: 'history',
        icon: Timer,
        place: 'management',
        labelKey: 'History',
        roles: ['admin', 'seller', 'buyer', 'blocker'],
    },
];

// Sidebar navigation item
const NavItem = ({ icon: Icon, label, onClick, isActive }: { icon: any, label: string, onClick?: () => void, isActive?: boolean }) => (
    <button
        onClick={onClick}
        className={clsx(
            'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group font-medium text-sm relative',
            isActive ? 'text-white bg-primary' : 'text-gray-400 hover:bg-white/5 hover:text-white'
        )}
    >
        <Icon size={18} className={clsx(isActive ? 'text-white' : 'text-gray-400 group-hover:text-white')} />
        <span>{label}</span>
        {isActive && (
            <motion.div layoutId="active-border" className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-white" />
        )}
    </button>
);

// Main Sidebar component
export default function Sidebar({ activeView, setActiveView, isSidebarOpen, setSidebarOpen, loggedUser, handleLogout, t, propertiesView, setPropertiesView }: Props) {
    // State for properties submenu
    const [propertiesOpen, setPropertiesOpen] = useState(false);
    // const [activeRole, setActiveRole] = useState<string | null>(null);
    const [selectedRole, setActiveRole] = useState<string | null>(null);

    // Restore persisted UI state from sessionStorage on mount
    React.useEffect(() => {
        try {
            const av = localStorage.getItem('activeView');
            if (av) setActiveView(av as ViewState);
            const pv = localStorage.getItem('propertiesView');
            if (pv && (pv === 'record' || pv === 'manage')) setPropertiesView(pv as 'record' | 'manage');
            const role = localStorage.getItem('activeRole');
            if (role) setActiveRole(role);
        } catch (e) {
            // ignore storage errors
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Persist changes to localStorage
    React.useEffect(() => { try { localStorage.setItem('activeView', activeView); } catch (e) { } }, [activeView]);
    React.useEffect(() => { try { localStorage.setItem('propertiesView', propertiesView); } catch (e) { } }, [propertiesView]);
    React.useEffect(() => { try { if (selectedRole) localStorage.setItem('activeRole', selectedRole); } catch (e) { } }, [selectedRole]);


    // Extract user roles as lowercase array, fallback to guest
    const userRolesRaw = loggedUser && (loggedUser.roles || loggedUser.role || loggedUser.usertype || loggedUser.user_type);
    const userRoles: string[] = Array.isArray(userRolesRaw)
        ? userRolesRaw.map((r) => String(r).toLowerCase())
        : userRolesRaw
            ? [String(userRolesRaw).toLowerCase()]
            : ['buyer'];
    const activeRole = selectedRole ?? userRoles[0]; // always resolved

    const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

    // // Set default active role if not set
    // React.useEffect(() => {
    //     if (!activeRole && userRoles.length > 0) {
    //         setActiveRole(userRoles[0]);
    //     }
    // }, [userRoles, activeRole]);

    // Helper: check if user has access to a menu item
    const hasAccess = (menu: any) => menu.roles.some((role: string) => (activeRole ? activeRole === role : userRoles.includes(role)));

    // Get management menu items user can access
    const managementMenus = MENU_CONFIG.filter(m => m.place === 'management' && hasAccess(m));

    return (
        <>
            {/* Sidebar overlay for mobile */}
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
                    'fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#0a162e] text-white flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 border-r border-gray-800',
                    isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                {/* Logo and close button */}
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

                {/* Main menu section */}
                <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
                    <div className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Main Menu</div>
                    {/* Render menu items based on access */}
                    {MENU_CONFIG.filter(hasAccess).filter(menu => menu.place === 'main').map((menu) => {
                        if (menu.id === 'properties') {
                            // Properties menu with collapsible submenu
                            return (
                                <div key={menu.id}>
                                    <button
                                        onClick={() => setPropertiesOpen((prev) => !prev)}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white text-sm"
                                    >
                                        <menu.icon size={18} />
                                        <span>{t(menu.labelKey)}</span>
                                        <span className="ml-auto text-xs text-gray-400">{propertiesOpen ? '▾' : '▸'}</span>
                                    </button>
                                    <AnimatePresence>
                                        {propertiesOpen && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="pl-6 pr-3 py-2 space-y-1">
                                                <button
                                                    onClick={() => { setActiveView('properties'); setPropertiesView('record'); setSidebarOpen(false); }}
                                                    className={clsx('w-full text-left px-3 py-2 rounded-md text-sm', propertiesView === 'record' ? 'bg-white/5 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white')}
                                                >
                                                    Record Property
                                                </button>
                                                <button
                                                    onClick={() => { setActiveView('properties'); setPropertiesView('manage'); setSidebarOpen(false); }}
                                                    className={clsx('w-full text-left px-3 py-2 rounded-md text-sm', propertiesView === 'manage' ? 'bg-white/5 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white')}
                                                >
                                                    Manage Property
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        }
                        // Agencies special handling: buyers should see apply options;
                        // non-admin users should see only their agency/broker item.
                        if (menu.id === 'agencies') {
                            // activeRole is resolved selected role or user's primary role
                            const isBuyer = activeRole === 'buyer';
                            const isAdminUser = userRoles.includes('admin') || userRoles.includes('superadmin') || activeRole === 'admin' || activeRole === 'superadmin';

                            if (isBuyer) {
                                return (
                                    <NavItem
                                        key={menu.id}
                                        icon={menu.icon}
                                        label={t('Apply for Agency/Broker')}
                                        onClick={() => { setActiveView('apply-agency'); setSidebarOpen(false); }}
                                        isActive={activeView === 'apply-agency' || activeView === 'apply-broker'}
                                    />
                                );
                            }

                            // Non-admin users only see their agency/broker account link
                            if (!isAdminUser) {
                                return (
                                    <NavItem
                                        key={menu.id}
                                        icon={menu.icon}
                                        label={t('My Agency/Broker')}
                                        onClick={() => { setActiveView('agencies'); setSidebarOpen(false); }}
                                        isActive={activeView === 'agencies'}
                                    />
                                );
                            }

                            // Admin and superadmin: show normal agencies item
                            return (
                                <NavItem
                                    key={menu.id}
                                    icon={menu.icon}
                                    label={t(menu.labelKey)}
                                    onClick={() => { setActiveView(menu.id as ViewState); setSidebarOpen(false); }}
                                    isActive={activeView === menu.id}
                                />
                            );
                        }

                        // All other menu items
                        return (
                            <NavItem
                                key={menu.id}
                                icon={menu.icon}
                                label={t(menu.labelKey)}
                                onClick={() => { setActiveView(menu.id as ViewState); setSidebarOpen(false); }}
                                isActive={activeView === menu.id}
                            />
                        );
                    })}

                    {/* Management section: only show if user has accessible management menus */}
                    {managementMenus.length > 0 && (
                        <>
                            <div className="px-3 mt-6 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Management</div>
                            {managementMenus.map(menu => (
                                <NavItem
                                    key={menu.id}
                                    icon={menu.icon}
                                    label={t(menu.labelKey)}
                                    onClick={() => { setActiveView(menu.id as ViewState); setSidebarOpen(false); }}
                                    isActive={activeView === menu.id}
                                />
                            ))}
                        </>
                    )}
                </div>

                {/* User info, role switch, and logout */}
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
                            {/* Role dropdown */}
                            {userRoles.length > 1 && (
                                <div className="relative mt-2">
                                    <button
                                        onClick={() => setRoleDropdownOpen((v) => !v)}
                                        className="w-full text-xs bg-white/10 text-white rounded px-2 py-1 flex items-center gap-2 hover:bg-white/20 border border-white/20"
                                    >
                                        <span className="truncate">{activeRole ? activeRole.charAt(0).toUpperCase() + activeRole.slice(1) : 'Role'}</span>
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                    </button>
                                    {roleDropdownOpen && (
                                        <div className="absolute left-0 -mt-20 w-full bg-[#0a162e] border border-white/20 rounded shadow z-50">
                                            {userRoles.map((role) => (
                                                <button
                                                    key={role}
                                                    onClick={() => {
                                                        setActiveRole(role);
                                                        // navigate to overview when role changes
                                                        try { setActiveView('overview'); } catch (e) { /* noop if prop not passed */ }
                                                        // notify other components
                                                        try { window.dispatchEvent(new CustomEvent('activeRoleChanged', { detail: { activeRole: role } })); } catch (e) {}
                                                        setRoleDropdownOpen(false);
                                                        setSidebarOpen(false);
                                                    }}
                                                    className={clsx('w-full text-left px-3 py-1 text-xs', activeRole === role ? 'bg-primary text-white' : 'text-gray-300 hover:bg-white/10')}
                                                >
                                                    {role.charAt(0).toUpperCase() + role.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
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
