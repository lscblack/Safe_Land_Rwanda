import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, UserPlus, Search, Filter, MoreVertical, 
    Shield, CheckCircle2, XCircle, Mail, Phone, 
    MapPin, Edit2, Trash2, Lock, RefreshCw,
    FileBadge, Smartphone, Fingerprint, Download
} from 'lucide-react';
import { clsx } from 'clsx';
import api from '../../../instance/mainAxios';

// --- TYPES (Matching models.py) ---
interface User {
    id: number;
    first_name: string;
    last_name: string;
    middle_name?: string;
    email: string;
    phone: string;
    avatar: string;
    role: string[]; // JSONB list
    n_id_number: string;
    id_type: string;
    user_code: string;
    country: string;
    is_active: boolean;
    is_verified: boolean;
    created_at: string;
}

// --- ANIMATION ---
const tableVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.05 } }
};

export const UserManagement = () => {
    // --- STATE ---
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All'); // Active/Inactive

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        role: ['user'], // Default
        n_id_number: '',
        country: 'Rwanda',
        password: '' // Only for create
    });

    // --- API CALLS ---
    const fetchData = async () => {
        setLoading(true);
        try {
            // Mocking the endpoint based on standard conventions
            const res = await api.get<User[]>('/users');
            setUsers(res.data);
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
            if (editingUser) {
                // Update
                await api.put(`/users/${editingUser.id}`, formData);
            } else {
                // Create
                await api.post('/auth/register', formData); // Assuming auth route for creation
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            alert("Operation failed");
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setFormData({
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            n_id_number: user.n_id_number,
            country: user.country,
            password: ''
        });
        setIsModalOpen(true);
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
            // Optimistic update
            setUsers(users.map(u => u.id === id ? { ...u, is_active: !currentStatus } : u));
            await api.patch(`/users/${id}`, { is_active: !currentStatus });
        } catch (e) {
            fetchData(); // Revert on error
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
                <div className="bg-white dark:bg-[#0a162e] p-2 rounded-2xl border border-gray-200 dark:border-white/10 flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
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
                <div className="bg-white dark:bg-[#0a162e] border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden">
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
                                                    r === 'admin' ? "bg-red-100 dark:bg-red-900/20 text-red-600 border-red-200 dark:border-red-900" :
                                                    r === 'agent' ? "bg-purple-100 dark:bg-purple-900/20 text-purple-600 border-purple-200 dark:border-purple-900" :
                                                    "bg-blue-100 dark:bg-blue-900/20 text-blue-600 border-blue-200 dark:border-blue-900"
                                                )}>
                                                    {r}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="mt-1 text-xs text-gray-400 flex items-center gap-1">
                                            <Fingerprint size={12}/> ID: {user.n_id_number}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <button 
                                            onClick={() => toggleStatus(user.id, user.is_active)}
                                            className={clsx(
                                                "px-3 py-1 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5",
                                                user.is_active 
                                                    ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900 hover:bg-green-200 dark:hover:bg-green-900/40" 
                                                    : "bg-gray-100 dark:bg-white/5 text-gray-500 border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10"
                                            )}
                                        >
                                            <div className={clsx("w-2 h-2 rounded-full", user.is_active ? "bg-green-500" : "bg-gray-400")} />
                                            {user.is_active ? "Active" : "Inactive"}
                                        </button>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleEdit(user)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-500 hover:text-[#395d91] transition-colors">
                                                <Edit2 size={16} />
                                            </button>
                                            <button className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-gray-500 hover:text-red-500 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

            </div>

            {/* === USER MODAL === */}
            <AnimatePresence>
                {isModalOpen && (
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
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                    {editingUser ? "Edit User Profile" : "Create New User"}
                                </h2>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full text-gray-500 transition-colors"><XCircle size={24}/></button>
                            </div>

                            <form onSubmit={handleSave} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                                
                                <div className="grid grid-cols-2 gap-6">
                                    <InputGroup label="First Name" value={formData.first_name} onChange={v => setFormData({...formData, first_name: v})} required />
                                    <InputGroup label="Last Name" value={formData.last_name} onChange={v => setFormData({...formData, last_name: v})} required />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <InputGroup label="Email Address" type="email" value={formData.email} onChange={v => setFormData({...formData, email: v})} required icon={Mail} />
                                    <InputGroup label="Phone Number" type="tel" value={formData.phone} onChange={v => setFormData({...formData, phone: v})} required icon={Smartphone} />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <InputGroup label="National ID / Passport" value={formData.n_id_number} onChange={v => setFormData({...formData, n_id_number: v})} required icon={FileBadge} />
                                    <InputGroup label="Country" value={formData.country} onChange={v => setFormData({...formData, country: v})} icon={MapPin} />
                                </div>

                                {/* Roles Selection */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">System Roles</label>
                                    <div className="flex gap-3">
                                        {['admin', 'agent', 'broker', 'user'].map(role => (
                                            <button
                                                key={role}
                                                type="button"
                                                onClick={() => {
                                                    const newRoles = formData.role.includes(role) 
                                                        ? formData.role.filter(r => r !== role)
                                                        : [...formData.role, role];
                                                    setFormData({...formData, role: newRoles});
                                                }}
                                                className={clsx(
                                                    "px-4 py-2 rounded-lg text-sm font-bold border transition-all uppercase",
                                                    formData.role.includes(role) 
                                                        ? "bg-[#395d91] text-white border-[#395d91]" 
                                                        : "bg-gray-50 dark:bg-white/5 text-gray-500 border-gray-200 dark:border-white/10 hover:border-[#395d91]"
                                                )}
                                            >
                                                {role}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {!editingUser && (
                                    <InputGroup label="Initial Password" type="password" value={formData.password} onChange={v => setFormData({...formData, password: v})} required icon={Lock} />
                                )}

                                <div className="pt-4 flex gap-4">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 py-3.5 rounded-xl border border-gray-200 dark:border-white/10 font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={submitting}
                                        className="flex-1 py-3.5 rounded-xl bg-[#395d91] hover:bg-[#2d4a75] text-white font-bold shadow-lg shadow-blue-900/20 transition-all"
                                    >
                                        {submitting ? "Saving..." : "Save Changes"}
                                    </button>
                                </div>

                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

// --- SUB COMPONENTS ---

const StatBox = ({ label, value, icon: Icon, color = "text-slate-900 dark:text-white" }: any) => (
    <div className="bg-white dark:bg-[#0a162e] border border-gray-200 dark:border-white/10 p-5 rounded-2xl flex items-center justify-between">
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

// Icon Placeholders
const ZapIcon = ({ size, className }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>;
const AlertIcon = ({ size, className }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>;