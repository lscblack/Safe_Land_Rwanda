import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, UserPlus, Search, Filter, Shield, 
    CheckCircle2, XCircle, Mail,
    MapPin, Edit2, Lock, Download,Smartphone, FileBadge,
    GripVertical, Briefcase, Building2, User as UserIcon,
    ArrowRightLeft, Save, X,
    Loader2
} from 'lucide-react';
import { clsx } from 'clsx';
import api from '../../../instance/mainAxios';

// --- TYPES ---
interface User {
    id: number;
    first_name: string;
    last_name: string;
    middle_name?: string;
    email: string;
    phone: string;
    avatar: string;
    role: string[]; 
    n_id_number: string;
    id_type: string;
    user_code: string;
    country: string;
    is_active: boolean;
    is_verified: boolean;
    created_at: string;
}

// --- CONFIG ---
const AVAILABLE_ROLES = ['admin', 'agent', 'broker', 'buyer', 'seller', 'moderator'];

const ROLE_STYLES: Record<string, { icon: any, color: string, bg: string, border: string }> = {
    admin: { icon: Shield, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' },
    agent: { icon: Briefcase, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
    broker: { icon: Building2, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    user: { icon: UserIcon, color: 'text-gray-500', bg: 'bg-gray-500/10', border: 'border-gray-500/20' },
    default: { icon: UserIcon, color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/20' }
};

export const UserManagement = () => {
    // --- STATE ---
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [showRolesModal, setShowRolesModal] = useState(false);
    const [rolesModalUser, setRolesModalUser] = useState<User | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        first_name: '', last_name: '', email: '', phone: '',
        role: ['user'], n_id_number: '', country: 'Rwanda', password: ''
    });

    // --- API CALLS ---
    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get<User[]>('/api/user/admin/users'); // Adjusted endpoint based on context
            // Handle if response is array or paginated object
            const data = Array.isArray(res.data) ? res.data : (res.data as any).items || [];
            setUsers(data);
        } catch (error) {
            console.error("Failed to load users", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- HANDLERS ---
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (!editingUser) {
                await api.post('/auth/register', formData);
            } else {
                // Update logic would go here
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            alert("Operation failed");
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditRoles = (user: User) => {
        setRolesModalUser(user);
        setShowRolesModal(true);
    };

    const openCreate = () => {
        setEditingUser(null);
        setFormData({
            first_name: '', last_name: '', email: '', phone: '',
            role: ['user'], n_id_number: '', country: 'Rwanda', password: ''
        });
        setIsModalOpen(true);
    };

    const toggleStatus = async (id: number, currentStatus: boolean) => {
        try {
            setUsers(users.map(u => u.id === id ? { ...u, is_active: !currentStatus } : u));
            await api.put(`/api/user/admin/users/${id}/status`, { is_active: !currentStatus });
        } catch (e) {
            fetchData();
        }
    };

    // --- FILTER LOGIC ---
    const filteredUsers = users.filter(user => {
        const matchesSearch = 
            user.first_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            user.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.n_id_number.includes(searchQuery);
        
        const matchesRole = roleFilter === 'All' || user.role.includes(roleFilter.toLowerCase());
        const matchesStatus = statusFilter === 'All' 
            ? true 
            : statusFilter === 'Active' ? user.is_active 
            : !user.is_active;

        return matchesSearch && matchesRole && matchesStatus;
    });

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#050c1a] text-slate-900 dark:text-white font-sans p-6 lg:p-10 transition-colors duration-300">
            <div className="max-w-[1920px] mx-auto w-full">
                
                {/* --- HEADER --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 border-b border-gray-200 dark:border-white/10 pb-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-[#395d91]/10 rounded-lg text-[#395d91] dark:text-[#5b85c7] border border-[#395d91]/20">
                                <Users size={22} />
                            </div>
                            <h1 className="text-3xl font-bold">User Management</h1>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                            Administer user accounts, roles, and verification status.
                        </p>
                    </div>
                    
                    <div className="flex gap-3">
                        <button className="p-3 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 transition-colors">
                            <Download size={20} />
                        </button>
                        <button 
                            onClick={openCreate}
                            className="px-6 py-3 bg-[#395d91] hover:bg-[#2d4a75] text-white font-bold rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-blue-900/20"
                        >
                            <UserPlus size={18} /> Add User
                        </button>
                    </div>
                </div>

                {/* --- STATS ROW --- */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <StatBox label="Total Users" value={users.length} icon={Users} />
                    <StatBox label="Verified Identity" value={users.filter(u => u.is_verified).length} icon={Shield} color="text-green-500" />
                    <StatBox label="Active Now" value={users.filter(u => u.is_active).length} icon={ZapIcon} color="text-[#395d91]" />
                    <StatBox label="Pending Review" value={users.filter(u => !u.is_verified).length} icon={AlertIcon} color="text-amber-500" />
                </div>

                {/* --- FILTERS & SEARCH --- */}
                <div className="bg-white dark:bg-[#0a162e] p-2 rounded-2xl border border-gray-200 dark:border-white/10 flex flex-col md:flex-row gap-4 items-center justify-between mb-6 shadow-sm">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search by name, email, NID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-[#112240] border border-gray-200 dark:border-white/10 rounded-xl text-sm focus:border-[#395d91] outline-none transition-colors"
                        />
                    </div>

                    <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                        <FilterSelect 
                            value={roleFilter} 
                            onChange={setRoleFilter} 
                            options={['All', 'Admin', 'Agent', 'Broker', 'User']} 
                        />
                        <FilterSelect 
                            value={statusFilter} 
                            onChange={setStatusFilter} 
                            options={['All', 'Active', 'Inactive']} 
                        />
                    </div>
                </div>

                {/* --- USERS TABLE --- */}
                <div className="bg-white dark:bg-[#0a162e] border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 dark:bg-[#0f1f3a] text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-white/10">
                            <tr>
                                <th className="p-4">User Identity</th>
                                <th className="p-4">Contact Info</th>
                                <th className="p-4">Role & Permissions</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-sm">
                            {loading ? (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-500">Loading users...</td></tr>
                            ) : filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden border border-gray-200 dark:border-white/10">
                                                <img src={user.avatar || 'https://via.placeholder.com/40'} alt="" className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                    {user.first_name} {user.last_name}
                                                    {user.is_verified && <CheckCircle2 size={14} className="text-green-500" />}
                                                </p>
                                                <p className="text-xs text-gray-500 font-mono">{user.user_code}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                                <Mail size={14} className="text-[#395d91]" /> {user.email}
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-500 text-xs">
                                                <Smartphone size={14} /> {user.phone}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-wrap gap-1">
                                            {user.role.map((r, i) => (
                                                <span key={i} className={clsx(
                                                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                                                    (ROLE_STYLES[r] || ROLE_STYLES.default).bg,
                                                    // (ROLE_STYLES[r] || ROLE_STYLES.default).text,
                                                    (ROLE_STYLES[r] || ROLE_STYLES.default).border,
                                                    "text-gray-600 dark:text-gray-300" // Fallback
                                                )}>
                                                    {r}
                                                </span>
                                            ))}
                                            <button 
                                                onClick={() => handleEditRoles(user)} 
                                                className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-dashed border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 transition-colors"
                                            >
                                                + Edit
                                            </button>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <button 
                                            onClick={() => toggleStatus(user.id, user.is_active)}
                                            className={clsx(
                                                "px-3 py-1 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5",
                                                user.is_active 
                                                    ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900 hover:bg-green-200" 
                                                    : "bg-gray-100 dark:bg-white/5 text-gray-500 border-gray-200 dark:border-white/10 hover:bg-gray-200"
                                            )}
                                        >
                                            <div className={clsx("w-2 h-2 rounded-full", user.is_active ? "bg-green-500" : "bg-gray-400")} />
                                            {user.is_active ? "Active" : "Inactive"}
                                        </button>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-500 hover:text-[#395d91] transition-colors" title="Edit User">
                                                <Edit2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

            </div>

            {/* === CREATE USER MODAL === */}
            <AnimatePresence>
                {isModalOpen && !editingUser && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }} 
                            animate={{ scale: 1, opacity: 1, y: 0 }} 
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-2xl bg-white dark:bg-[#0a162e] border border-gray-200 dark:border-white/10 rounded-[24px] shadow-2xl overflow-hidden"
                        >
                            <div className="p-6 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0f1f3a] flex justify-between items-center">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create New User</h2>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full text-gray-500 transition-colors"><XCircle size={24}/></button>
                            </div>
                            <form onSubmit={handleSave} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-2 gap-6">
                                    <InputGroup label="First Name" value={formData.first_name} onChange={(v:any) => setFormData({...formData, first_name: v})} required />
                                    <InputGroup label="Last Name" value={formData.last_name} onChange={(v:any) => setFormData({...formData, last_name: v})} required />
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <InputGroup label="Email Address" type="email" value={formData.email} onChange={(v:any) => setFormData({...formData, email: v})} required icon={Mail} />
                                    <InputGroup label="Phone Number" type="tel" value={formData.phone} onChange={(v:any) => setFormData({...formData, phone: v})} required icon={Smartphone} />
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <InputGroup label="National ID / Passport" value={formData.n_id_number} onChange={(v:any) => setFormData({...formData, n_id_number: v})} required icon={FileBadge} />
                                    <InputGroup label="Country" value={formData.country} onChange={(v:any) => setFormData({...formData, country: v})} icon={MapPin} />
                                </div>
                                <InputGroup label="Initial Password" type="password" value={formData.password} onChange={(v:any) => setFormData({...formData, password: v})} required icon={Lock} />
                                <div className="pt-4 flex gap-4">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 rounded-xl border border-gray-200 dark:border-white/10 font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">Cancel</button>
                                    <button type="submit" disabled={submitting} className="flex-1 py-3.5 rounded-xl bg-[#395d91] hover:bg-[#2d4a75] text-white font-bold shadow-lg shadow-blue-900/20 transition-all">{submitting ? "Saving..." : "Create User"}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}

                {/* === ROLES MODAL (Modern Drag & Drop) === */}
                {showRolesModal && rolesModalUser && (
                    <RolesModal
                        user={rolesModalUser}
                        onClose={() => { setShowRolesModal(false); setRolesModalUser(null); }}
                        onSaved={() => { setShowRolesModal(false); setRolesModalUser(null); fetchData(); }}
                    />
                )}
            </AnimatePresence>

        </div>
    );
};

// --- MODERN ROLES MODAL ---
const RolesModal = ({ user, onClose, onSaved }: any) => {
    const [currentRoles, setCurrentRoles] = useState<string[]>(user.role || []);
    const [draggingRole, setDraggingRole] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Calculate available roles dynamically
    const available = AVAILABLE_ROLES.filter(r => !currentRoles.includes(r));

    const handleDragStart = (e: React.DragEvent, role: string) => {
        setDraggingRole(role);
        e.dataTransfer.setData('role', role);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDrop = (e: React.DragEvent, target: 'current' | 'available') => {
        e.preventDefault();
        const role = e.dataTransfer.getData('role');
        if (!role) return;

        if (target === 'current' && !currentRoles.includes(role)) {
            setCurrentRoles([...currentRoles, role]);
        } else if (target === 'available' && currentRoles.includes(role)) {
            setCurrentRoles(currentRoles.filter(r => r !== role));
        }
        setDraggingRole(null);
    };

    const handleDragOver = (e: React.DragEvent) => e.preventDefault();

    const save = async () => {
        setSaving(true);
        try {
            await api.put('/api/user/role', { user_id: user.id, roles: currentRoles });
            onSaved();
        } catch (e) {
            console.error(e);
            alert('Failed to save roles');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div onClick={onClose} className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm" />
            <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-3xl bg-white dark:bg-[#0a162e] border border-gray-200 dark:border-white/10 rounded-[24px] shadow-2xl overflow-hidden"
            >
                <div className="p-6 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0f1f3a] flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Manage Roles</h2>
                        <p className="text-sm text-gray-500">Drag and drop to assign permissions for {user.first_name}.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full text-gray-500"><X size={20}/></button>
                </div>

                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 h-[400px]">
                    
                    {/* AVAILABLE COLUMN */}
                    <div 
                        onDragOver={handleDragOver} 
                        onDrop={(e) => handleDrop(e, 'available')}
                        className={clsx(
                            "flex flex-col h-full rounded-2xl border-2 border-dashed transition-all p-4 relative",
                            draggingRole && currentRoles.includes(draggingRole) 
                                ? "border-green-400 bg-green-50/10 dark:bg-green-900/5" 
                                : "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0f1f3a]/50"
                        )}
                    >
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <ArrowRightLeft size={14}/> Available Roles
                        </h4>
                        <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
                            {available.length === 0 && (
                                <div className="h-full flex items-center justify-center text-gray-400 text-sm italic">All roles assigned</div>
                            )}
                            <AnimatePresence>
                                {available.map(role => (
                                    <RoleItem key={role} role={role} onDragStart={handleDragStart} />
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* ASSIGNED COLUMN */}
                    <div 
                        onDragOver={handleDragOver} 
                        onDrop={(e) => handleDrop(e, 'current')}
                        className={clsx(
                            "flex flex-col h-full rounded-2xl border-2 border-dashed transition-all p-4 relative",
                            draggingRole && !currentRoles.includes(draggingRole) 
                                ? "border-[#395d91] bg-[#395d91]/5" 
                                : "border-gray-200 dark:border-white/10 bg-white dark:bg-[#0a162e]"
                        )}
                    >
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Shield size={14} className="text-[#395d91]"/> Assigned Roles
                        </h4>
                        <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
                            {currentRoles.length === 0 && (
                                <div className="h-full flex items-center justify-center text-gray-400 text-sm italic">Drop roles here</div>
                            )}
                            <AnimatePresence>
                                {currentRoles.map(role => (
                                    <RoleItem key={role} role={role} onDragStart={handleDragStart} isAssigned />
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0f1f3a] flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-200 dark:hover:bg-white/5 transition-colors">Cancel</button>
                    <button onClick={save} disabled={saving} className="px-6 py-3 rounded-xl bg-[#395d91] hover:bg-[#2d4a75] text-white font-bold shadow-lg flex items-center gap-2">
                        {saving ? <Loader2 className="animate-spin" size={18}/> : <><Save size={18}/> Save Roles</>}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

// Draggable Role Item Component
const RoleItem = ({ role, onDragStart, isAssigned }: any) => {
    const config = ROLE_STYLES[role] || ROLE_STYLES.default;
    const Icon = config.icon;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            draggable
            onDragStart={(e: any) => onDragStart(e, role)}
            className={clsx(
                "p-3 rounded-xl border flex items-center justify-between cursor-grab active:cursor-grabbing hover:shadow-md transition-all group",
                isAssigned 
                    ? "bg-white dark:bg-[#112240] border-gray-200 dark:border-gray-700" 
                    : "bg-white dark:bg-[#0a162e] border-gray-200 dark:border-white/5 opacity-80 hover:opacity-100"
            )}
        >
            <div className="flex items-center gap-3">
                <div className={clsx("p-2 rounded-lg", config.bg, config.color)}>
                    <Icon size={16} />
                </div>
                <span className="font-bold text-sm text-slate-700 dark:text-gray-200 capitalize">{role.replace('_', ' ')}</span>
            </div>
            <GripVertical size={16} className="text-gray-300 group-hover:text-gray-500" />
        </motion.div>
    );
};

// --- UTILS ---
const StatBox = ({ label, value, icon: Icon, color = "text-slate-900 dark:text-white" }: any) => (
    <div className="bg-white dark:bg-[#0a162e] border border-gray-200 dark:border-white/10 p-5 rounded-2xl flex items-center justify-between shadow-sm">
        <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
            <p className={clsx("text-2xl font-bold", color)}>{value}</p>
        </div>
        <div className="p-3 bg-gray-100 dark:bg-white/5 rounded-xl text-gray-400">
            <Icon size={24} />
        </div>
    </div>
);

const FilterSelect = ({ value, onChange, options }: any) => (
    <div className="relative">
        <select 
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="appearance-none pl-4 pr-8 py-2.5 bg-gray-50 dark:bg-[#112240] border border-gray-200 dark:border-white/10 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 focus:border-[#395d91] outline-none cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
        >
            {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <Filter size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
);

const InputGroup = ({ label, value, onChange, type = "text", required, icon: Icon }: any) => (
    <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
            <input 
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                required={required}
                className="w-full pl-4 pr-4 py-3 bg-gray-50 dark:bg-[#050c1a] border border-gray-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:border-[#395d91] outline-none transition-colors"
            />
            {Icon && <Icon size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />}
        </div>
    </div>
);

const ZapIcon = ({ size, className }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>;
const AlertIcon = ({ size, className }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>;