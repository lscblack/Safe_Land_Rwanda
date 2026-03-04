import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Building2, Users, BarChart3, Settings, LogOut, Timer, Building, Map, Plus } from 'lucide-react';
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
    | 'rdb-certificate'
    | 'maps'
    | 'Usermaps'
    | 'gis_pdf'
    | 'rdb-certificate'
    | 'history'
    | 'category'
    | 'my-properties';

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
        roles: ['admin', 'seller', 'buyer', 'brocker', 'moderator', 'super_admin'],
    },
    {
        id: 'maps',
        place: 'main',
        icon: Map,
        labelKey: 'GIS Map',
        roles: ['super_admin', 'admin'],
    },
    {
        id: 'Usermaps',
        place: 'main',
        icon: Map,
        labelKey: 'GIS Map',
        roles: ['buyer', 'brocker'],
    },
    {
        id: 'gis_pdf',
        place: 'main',
        icon: Plus,
        labelKey: 'GIS Registry',
        roles: ['super_admin', 'admin'],
    },
    {
        id: 'gis_pdf_user',
        place: 'main',
        icon: Plus,
        labelKey: 'GIS Registry',
        roles: ['seller', 'buyer', 'brocker'],
    },
    {
        id: 'category',
        place: 'main',
        icon: Building,
        labelKey: 'Property Categories',
        roles: ['admin', 'super_admin',],
        isCollapsible: true,
    },
    {
        id: 'my-properties',
        place: 'main',
        icon: LayoutDashboard,
        labelKey: 'My Properties',
        roles: ['buyer', 'brocker'],
    },
    {
        id: 'properties',
        place: 'main',
        icon: Building2,
        labelKey: 'Manage Properties',
        roles: ['admin', 'seller', 'brocker', 'super_admin'],
        isCollapsible: true,
    },
    {
        id: 'users',
        place: 'main',
        icon: Users,
        labelKey: 'dash.nav.users',
        roles: ['admin', 'super_admin'],
    },
    {
        id: 'agencies',
        place: 'main',
        icon: Building2,
        labelKey: 'Agencies&Brokers',
        roles: ['admin', 'super_admin'],
    },
    {
        id: 'analytics',
        place: 'main',
        icon: BarChart3,
        labelKey: 'Market Analytics',
        roles: ['admin', 'seller', 'buyer', 'moderator', 'super_admin', 'brocker'],
    },
    {
        id: 'settings',
        place: 'management',
        icon: Settings,
        labelKey: 'dash.nav.settings',
        roles: ['admin', 'seller', 'super_admin'],
    },
    {
        id: 'history',
        icon: Timer,
        place: 'management',
        labelKey: 'verify E-Title',
        roles: ['admin', 'seller', 'buyer', 'brocker', 'super_admin'],
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
export default function Sidebar({ 
    activeView, 
    setActiveView, 
    isSidebarOpen, 
    setSidebarOpen, 
    loggedUser, 
    handleLogout, 
    t, 
    propertiesView, 
    setPropertiesView 
}: Props) {
    // State for properties submenu
    const [propertiesOpen, setPropertiesOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

    // Extract user roles as lowercase array
    const getUserRoles = (): string[] => {
        if (!loggedUser) return [];
        
        // Try different possible role field names
        const rolesRaw = loggedUser.roles || loggedUser.role || loggedUser.usertype || loggedUser.user_type;
        
        if (Array.isArray(rolesRaw)) {
            return rolesRaw.map(r => String(r).toLowerCase());
        } else if (rolesRaw) {
            return [String(rolesRaw).toLowerCase()];
        }
        
        return [];
    };

    const userRoles = getUserRoles();
    
    // Set default active role based on user's actual role
    useEffect(() => {
        if (!selectedRole && userRoles.length > 0) {
            // Use the first role from user's actual roles
            setSelectedRole(userRoles[0]);
        }
    }, [userRoles, selectedRole]);

    // Restore persisted UI state from localStorage on mount
    useEffect(() => {
        try {
            const av = localStorage.getItem('activeView');
            if (av) setActiveView(av as ViewState);
            
            const pv = localStorage.getItem('propertiesView');
            if (pv && (pv === 'record' || pv === 'manage')) setPropertiesView(pv as 'record' | 'manage');
            
            const role = localStorage.getItem('activeRole');
            // Only restore if the role exists in user's actual roles
            if (role && userRoles.includes(role)) {
                setSelectedRole(role);
            }
        } catch (e) {
            // ignore storage errors
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Persist changes to localStorage
    useEffect(() => { 
        try { localStorage.setItem('activeView', activeView); } catch (e) { } 
    }, [activeView]);
    
    useEffect(() => { 
        try { localStorage.setItem('propertiesView', propertiesView); } catch (e) { } 
    }, [propertiesView]);
    
    useEffect(() => { 
        try { 
            if (selectedRole) localStorage.setItem('activeRole', selectedRole); 
        } catch (e) { } 
    }, [selectedRole]);

    // Get the active role - this should ALWAYS be from user's actual roles
    const activeRole = selectedRole || (userRoles.length > 0 ? userRoles[0] : null);

    // If no active role (shouldn't happen for logged-in users), don't render menu items
    if (!activeRole) {
        return null; // or a loading state
    }

    // Helper: check if user has access to a menu item
    const hasAccess = (menu: any) => {
        // Always check against the active role (which comes from user's actual roles)
        return menu.roles.includes(activeRole);
    };

    // Get main menu items user can access
    const mainMenus = MENU_CONFIG.filter(m => m.place === 'main' && hasAccess(m));
    
    // Get management menu items user can access
    const managementMenus = MENU_CONFIG.filter(m => m.place === 'management' && hasAccess(m));

    // Render menu item based on its type
    const renderMenuItem = (menu: any) => {
        // Special handling for properties menu with submenu
        if (menu.id === 'properties') {
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
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }} 
                                animate={{ opacity: 1, height: 'auto' }} 
                                exit={{ opacity: 0, height: 0 }} 
                                className="pl-6 pr-3 py-2 space-y-1"
                            >
                                <button
                                    onClick={() => { 
                                        setActiveView('properties'); 
                                        setPropertiesView('record'); 
                                        setSidebarOpen(false); 
                                    }}
                                    className={clsx(
                                        'w-full hidden text-left px-3 py-2 rounded-md text-sm',
                                        activeView === 'properties' && propertiesView === 'record' 
                                            ? 'bg-white/5 text-white' 
                                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                    )}
                                >
                                    Record Property
                                </button>
                                <button
                                    onClick={() => { 
                                        setActiveView('properties'); 
                                        setPropertiesView('manage'); 
                                        setSidebarOpen(false); 
                                    }}
                                    className={clsx(
                                        'w-full text-left px-3 py-2 rounded-md text-sm',
                                        activeView === 'properties' && propertiesView === 'manage' 
                                            ? 'bg-white/5 text-white' 
                                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                    )}
                                >
                                    Manage Property
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            );
        }

        // Special handling for agencies menu
        if (menu.id === 'agencies') {
            const isBuyer = activeRole === 'buyer';
            const isAdminUser = ['admin', 'super_admin'].includes(activeRole);

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

            if (!isAdminUser) {
                return (
                    <NavItem
                        key={menu.id}
                        icon={menu.icon}
                        label={t('My Agency/Broker')}
                        onClick={() => { setActiveView('my-agency'); setSidebarOpen(false); }}
                        isActive={activeView === 'my-agency'}
                    />
                );
            }

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

        // Default menu item
        return (
            <NavItem
                key={menu.id}
                icon={menu.icon}
                label={t(menu.labelKey)}
                onClick={() => { setActiveView(menu.id as ViewState); setSidebarOpen(false); }}
                isActive={activeView === menu.id}
            />
        );
    };

    return (
        <>
            {/* Sidebar overlay for mobile */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
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
                    <div className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Main Menu
                    </div>
                    
                    {/* Render main menu items */}
                    {mainMenus.map(menu => renderMenuItem(menu))}

                    {/* Management section */}
                    {managementMenus.length > 0 && (
                        <>
                            <div className="px-3 mt-6 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Management
                            </div>
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
                                {loggedUser 
                                    ? `${loggedUser.first_name || ''} ${loggedUser.last_name || ''}`.trim() || 'User' 
                                    : 'User'
                                }
                            </p>
                            <p className="text-xs text-gray-400 truncate">{loggedUser?.email || ''}</p>
                            
                            {/* Role dropdown - show only if user has multiple roles */}
                            {userRoles.length > 1 && (
                                <div className="relative mt-2">
                                    <button
                                        onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                                        className="w-full text-xs bg-white/10 text-white rounded px-2 py-1 flex items-center gap-2 hover:bg-white/20 border border-white/20"
                                    >
                                        <span className="truncate">
                                            {activeRole ? activeRole.charAt(0).toUpperCase() + activeRole.slice(1) : 'Role'}
                                        </span>
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    
                                    {roleDropdownOpen && (
                                        <div className="absolute bottom-full left-0 w-full bg-[#0a162e] border border-white/20 rounded shadow z-50 mb-1">
                                            {userRoles.map((role) => (
                                                <button
                                                    key={role}
                                                    onClick={() => {
                                                        setSelectedRole(role);
                                                        setActiveView('overview');
                                                        window.dispatchEvent(new CustomEvent('activeRoleChanged', { 
                                                            detail: { activeRole: role } 
                                                        }));
                                                        setRoleDropdownOpen(false);
                                                        setSidebarOpen(false);
                                                    }}
                                                    className={clsx(
                                                        'w-full text-left px-3 py-2 text-sm',
                                                        activeRole === role 
                                                            ? 'bg-primary text-white' 
                                                            : 'text-gray-300 hover:bg-white/10'
                                                    )}
                                                >
                                                    {role.charAt(0).toUpperCase() + role.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        <button 
                            onClick={handleLogout} 
                            className="text-gray-400 hover:text-white transition-colors"
                            title="Logout"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}