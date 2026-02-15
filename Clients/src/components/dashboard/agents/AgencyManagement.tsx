import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Building2, User, MapPin, Plus, Search,
    Upload, Loader2, CheckCircle2, Briefcase, FileText, 
    X, AlertCircle, Trash2, ShieldCheck,
    LayoutGrid, List as ListIcon, RefreshCw, Edit
} from 'lucide-react';
import { clsx } from 'clsx';
import api from '../../../instance/mainAxios';

// --- TYPES ---
interface Agency {
    certificate_path: any;
    id?: number;
    name: string;
    type: 'agency' | 'broker';
    location: string;
    owner_user_id: number;
    logo_path?: string;
    status: string; // 'active' | 'inactive' | 'pending'
    created_at?: string;
}

// --- ANIMATION ---
const fadeVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } }
};

interface AgencyManagementProps {
    initialOpen?: boolean;
    initialType?: 'agency' | 'broker';
}

export const AgencyManagement = ({ initialOpen = false, initialType = 'agency' }: AgencyManagementProps) => {
    // --- STATE ---
    const [agencies, setAgencies] = useState<Agency[]>([]);
    const [loggedUser, setLoggedUser] = useState<any | null>(null);
    const [activeRole, setActiveRole] = useState<string | null>(() => {
        try {
            const v = localStorage.getItem('activeRole') || localStorage.getItem('active_role');
            return v ? String(v).toLowerCase() : null;
        } catch (e) {
            return null;
        }
    });
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'agency' | 'broker'>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Modal & Form
    const [isModalOpen, setIsModalOpen] = useState<boolean>(initialOpen);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalMode, setModalMode] = useState<'create'|'edit'|'view'>('create');
    const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
    const [formData, setFormData] = useState<Agency>({
        name: '',
        type: initialType || 'agency',
        location: '',
        owner_user_id: 1, // Replace with dynamic user ID
        status: 'inactive',
        certificate_path: null
    });
    
    // File Handlers
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [certFile, setCertFile] = useState<File | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isPdfViewerOpen, setIsPdfViewerOpen] = useState<boolean>(false);

    // --- API CALLS ---
    const fetchData = async () => {
        setLoading(true);
        try {
            // Request owner-specific agencies by default so newly created (inactive) agencies show for the creator
            const res = await api.get<Agency[]>('/api/agency/agencies-brokers?mine=true');
            setAgencies(res.data);
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // fetch logged user profile to determine admin privileges and active role
        (async () => {
            try {
                const res = await api.get('/api/user/profile');
                setLoggedUser(res.data);
                const roles = res.data?.role || res.data?.roles || [];
                const active = res.data?.active_role ?? res.data?.activeRole ?? (Array.isArray(roles) ? roles[0] : roles);
                // respect existing localStorage override if present
                try {
                    const stored = localStorage.getItem('activeRole') || localStorage.getItem('active_role');
                    if (!stored) setActiveRole(active ? String(active).toLowerCase() : null);
                } catch (e) {
                    setActiveRole(active ? String(active).toLowerCase() : null);
                }
            } catch (e) {
                // ignore
            }
        })();
    }, []);

    const isBuyer = activeRole === 'buyer';
    const isAdminView = activeRole === 'admin' || activeRole === 'superadmin';

    // Listen for out-of-band active role changes (other components may update localStorage or dispatch an event)
    useEffect(() => {
        const onStorage = (ev: StorageEvent) => {
            if (ev.key && (ev.key === 'active_role' || ev.key === 'activeRole')) {
                setActiveRole(ev.newValue ? String(ev.newValue).toLowerCase() : null);
            }
        };
        const onCustom = (ev: any) => {
            const val = ev?.detail?.activeRole ?? ev?.detail?.active_role;
            if (val) setActiveRole(String(val).toLowerCase());
        };
        window.addEventListener('storage', onStorage);
        window.addEventListener('activeRoleChanged', onCustom as EventListener);
        return () => {
            window.removeEventListener('storage', onStorage);
            window.removeEventListener('activeRoleChanged', onCustom as EventListener);
        };
    }, []);

    useEffect(() => {
        if (!isModalOpen) setPdfUrl(null);
    }, [isModalOpen]);

    // Prevent save/print shortcuts while PDF viewer open
    useEffect(() => {
        if (!isPdfViewerOpen) return;
        const onKey = (e: KeyboardEvent) => {
            const isCtrl = e.ctrlKey || e.metaKey;
            // block Ctrl+S, Ctrl+P, Ctrl+Shift+S
            if (isCtrl && (e.key.toLowerCase() === 's' || e.key.toLowerCase() === 'p')) {
                e.preventDefault();
                e.stopPropagation();
            }
            if (isCtrl && e.shiftKey && e.key.toLowerCase() === 's') {
                e.preventDefault();
                e.stopPropagation();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isPdfViewerOpen]);

    // Reflect changes to initialOpen/initialType when props change
    useEffect(() => {
        setIsModalOpen(Boolean(initialOpen));
        setFormData((f) => ({ ...f, type: initialType || 'agency' }));
        console.log('AgencyManagement props', { initialOpen, initialType });
    }, [initialOpen, initialType]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Ensure owner_user_id is a number
            const payload = { ...formData } as any;
            // coerce owner_user_id if explicitly set; otherwise omit to let server assign current user
            if (formData.owner_user_id && Number(formData.owner_user_id) !== 1) {
                payload.owner_user_id = Number(formData.owner_user_id);
            } else {
                delete payload.owner_user_id;
            }
            console.log('Submitting agency payload', payload, 'mode:', modalMode);
            let res: any;
            if (modalMode === 'edit' && selectedAgency?.id) {
                // update
                res = await api.put<Agency>(`/api/agency/agencies-brokers/${selectedAgency.id}`, payload);
            } else {
                // create
                res = await api.post<Agency>('/api/agency/agencies-brokers', payload);
            }
            const newId = res.data.id ?? selectedAgency?.id;
            if (newId) {
                if (logoFile) {
                    const logoData = new FormData();
                    logoData.append('file', logoFile);
                    await api.post(`/api/agency/agencies-brokers/${newId}/logo`, logoData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                }
                if (certFile) {
                    const certData = new FormData();
                    certData.append('user_id', (formData.owner_user_id || '').toString());
                    certData.append('file', certFile);
                    await api.post('/api/agency/rdb-certificate/upload', certData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                }
            }
            resetForm();
            setModalMode('create');
            setSelectedAgency(null);
            fetchData();
        } catch (error: any) {
            // Show server validation errors when available
            if (error.response) {
                console.error('API error response:', error.response.status, error.response.data);
                const data = error.response.data;
                // Common FastAPI validation error format
                if (data && data.detail) {
                    alert(`Create failed: ${JSON.stringify(data.detail)}`);
                } else {
                    alert(`Create failed: ${JSON.stringify(data)}`);
                }
            } else {
                console.error(error);
                alert('Operation failed. See console.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormData({ name: '', type: initialType || 'agency', location: '', owner_user_id: 1, status: 'active', certificate_path: null });
        setLogoFile(null);
        setLogoPreview(null);
        setCertFile(null);
        setIsModalOpen(false);
    };

    // --- FILTERING ---
    const filteredList = agencies.filter(item => {
        const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            item.location.toLowerCase().includes(searchQuery.toLowerCase());
        const matchType = filterType === 'all' || item.type === filterType;
        return matchSearch && matchType;
    });

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>, arg1: string): void {
        const file = (e.target.files && e.target.files[0]) ? e.target.files[0] : null;
        if (!file) return;
        if (arg1 === 'logo') {
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        } else if (arg1 === 'cert') {
            setCertFile(file);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#050c1a] text-slate-900 dark:text-white font-sans transition-colors duration-300">
            
            {/* FULL WIDTH CONTAINER */}
            <div className="w-full max-w-[1920px] mx-auto p-4 lg:p-8">
                
                {/* --- HEADER --- */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-8 border-b border-gray-200 dark:border-white/10 pb-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-[#395d91]/10 rounded-lg text-[#395d91] dark:text-[#5b85c7] border border-[#395d91]/20">
                                <Briefcase size={22} />
                            </div>
                            <h1 className="text-3xl font-bold">Partner Management</h1>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xl">
                            Administer agencies, brokers, and compliance documents.
                        </p>
                    </div>
                    
                    <div className="flex gap-3">
                        <button onClick={fetchData} className="p-3 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-gray-500">
                            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                        </button>
                        <button 
                            onClick={() => { setModalMode('create'); setSelectedAgency(null); setFormData({ name: '', type: initialType || 'agency', location: '', owner_user_id: 1, status: 'inactive', certificate_path: null }); setIsModalOpen(true); }}
                            className="px-6 py-3 bg-[#395d91] hover:bg-[#2d4a75] text-white font-bold rounded-lg flex items-center gap-2 transition-colors"
                        >
                            <Plus size={18} /> Register Partner
                        </button>
                    </div>
                </div>

                {/* --- METRICS BAR --- */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <MetricCard label="Total Partners" value={agencies.length} icon={Briefcase} />
                    <MetricCard label="Agencies" value={agencies.filter(a => a.type === 'agency').length} icon={Building2} color="text-[#395d91] dark:text-[#5b85c7]" />
                    <MetricCard label="Brokers" value={agencies.filter(a => a.type === 'broker').length} icon={User} color="text-purple-600 dark:text-purple-400" />
                    <MetricCard label="Pending Certs" value={agencies.filter(a => a.status === 'pending').length} icon={FileText} color="text-amber-500" />
                </div>

                {/* --- TOOLBAR --- */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search partners..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white dark:bg-[#0a162e] border border-gray-200 dark:border-white/10 rounded-lg pl-10 pr-4 py-3 text-sm focus:border-[#395d91] outline-none transition-colors"
                        />
                    </div>

                    {/* Filters */}
                    <div className="flex p-1 bg-white dark:bg-[#0a162e] border border-gray-200 dark:border-white/10 rounded-lg">
                        {['all', 'agency', 'broker'].map((type) => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type as any)}
                                className={clsx(
                                    "px-6 py-2 rounded-md text-sm font-bold capitalize transition-all",
                                    filterType === type 
                                        ? "bg-[#395d91] text-white" 
                                        : "text-gray-500 hover:text-slate-900 dark:hover:text-white"
                                )}
                            >
                                {type === 'all' ? 'All' : type + 's'}
                            </button>
                        ))}
                    </div>

                    {/* View Toggle */}
                    <div className="flex p-1 bg-white dark:bg-[#0a162e] border border-gray-200 dark:border-white/10 rounded-lg">
                        <button 
                            onClick={() => setViewMode('grid')} 
                            className={clsx(
                                "p-2 rounded-md transition-colors", 
                                viewMode === 'grid' ? "bg-gray-100 dark:bg-white/10 text-slate-900 dark:text-white" : "text-gray-400"
                            )}
                        >
                            <LayoutGrid size={18}/>
                        </button>
                        <button 
                            onClick={() => setViewMode('list')} 
                            className={clsx(
                                "p-2 rounded-md transition-colors", 
                                viewMode === 'list' ? "bg-gray-100 dark:bg-white/10 text-slate-900 dark:text-white" : "text-gray-400"
                            )}
                        >
                            <ListIcon size={18}/>
                        </button>
                    </div>
                </div>

                {/* --- DATA GRID / LIST --- */}
                {loading ? (
                    <div className="h-64 flex items-center justify-center text-gray-400">
                        <Loader2 className="animate-spin" size={32}/>
                    </div>
                ) : filteredList.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl">
                        <AlertCircle size={32} className="mb-2 opacity-50"/>
                        <p>No partners found.</p>
                    </div>
                ) : (
                    <motion.div 
                        initial="hidden" animate="visible" variants={fadeVariants}
                        className={clsx(
                            viewMode === 'grid' 
                                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
                                : "flex flex-col gap-3"
                        )}
                    >
                        {filteredList.map((agency) => (
                            <div 
                                key={agency.id}
                                className={clsx(
                                    "bg-white dark:bg-[#0a162e] border border-gray-200 dark:border-white/10 hover:border-[#395d91] dark:hover:border-[#395d91] transition-all group overflow-hidden relative",
                                    viewMode === 'grid' ? "rounded-2xl p-6 flex flex-col" : "rounded-xl p-4 flex items-center gap-6"
                                )}
                            >
                                {/* Status Indicator */}
                                <div className={clsx(
                                    "absolute top-0 right-0 w-0 h-0 border-t-[40px] border-l-[40px] border-t-transparent border-l-transparent",
                                    agency.status === 'active' ? "border-t-green-500" : "border-t-red-500"
                                )}/>
                                <div className={clsx(
                                    "absolute top-2 right-2 w-2 h-2 rounded-full",
                                    agency.status === 'active' ? "bg-green-500" : "bg-red-500"
                                )}/>

                                {/* Logo Area */}
                                <div className={clsx("shrink-0", viewMode === 'grid' ? "mb-4" : "")}>
                                    <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center overflow-hidden">
                                        {agency.logo_path ? (
                                            <img src={`${import.meta.env.VITE_BASE_URL}/assets/${agency.logo_path}`} className="w-full h-full object-cover" alt={agency.name} />
                                        ) : (
                                            agency.type === 'agency' ? <Building2 className="text-gray-400" /> : <User className="text-gray-400" />
                                        )}
                                    </div>
                                </div>

                                {/* Content Area */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#395d91] bg-[#395d91]/10 px-1.5 py-0.5 rounded border border-[#395d91]/20">
                                            {agency.type}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-slate-900 dark:text-white truncate text-lg">{agency.name}</h3>
                                    
                                    <div className={clsx("mt-3 space-y-1", viewMode === 'list' && "flex gap-6 mt-0 items-center space-y-0")}>
                                        <p className="text-sm text-gray-500 flex items-center gap-2">
                                            <MapPin size={14}/> {agency.location || 'N/A'}
                                        </p>
                                        <p className="text-sm text-gray-500 flex items-center gap-2">
                                            <ShieldCheck size={14} className={agency.status === 'active' ? "text-green-500" : "text-gray-400"}/> 
                                            RDB Verified
                                        </p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className={clsx(
                                    "flex gap-2", 
                                    viewMode === 'grid' ? "mt-4 pt-4 border-t border-gray-100 dark:border-white/5" : "ml-auto"
                                )}>
                                    <button 
                                        className="flex-1 px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-xs font-bold text-slate-700 dark:text-white transition-colors" 
                                        onClick={() => { setSelectedAgency(agency); setModalMode('view'); setIsModalOpen(true); }}
                                    >
                                        View Profile
                                    </button>
                                    {isBuyer ? (
                                        // Buyers: show Edit and delete (delete disabled for active)
                                        <>
                                            <button 
                                                title="Edit" 
                                                onClick={() => { setSelectedAgency(agency); setFormData({ ...agency }); setModalMode('edit'); setIsModalOpen(true); }} 
                                                className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-white/5"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button 
                                                title={agency.status === 'active' ? 'Cannot delete approved agency' : 'Delete'} 
                                                onClick={async () => { 
                                                    if (agency.status === 'active') return; 
                                                    if (!confirm('Delete this agency?')) return; 
                                                    await api.delete(`/api/agency/agencies-brokers/${agency.id}`); 
                                                    fetchData(); 
                                                }} 
                                                className={clsx(
                                                    'p-2 rounded-lg', 
                                                    agency.status === 'active' ? 'text-gray-400 cursor-not-allowed' : 'text-red-500 hover:bg-red-50 dark:hover:bg-white/5'
                                                )}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </>
                                    ) : (
                                        // Admin view: icon-only controls; non-admin: small trash icon (disabled if active)
                                        isAdminView ? (
                                            <>
                                                {/* Activate / Deactivate toggle for admins (no delete) */}
                                                {agency.status !== 'active' ? (
                                                    <button
                                                        title="Activate"
                                                        onClick={async () => {
                                                            try {
                                                                const payload = {
                                                                    name: agency.name,
                                                                    type: agency.type,
                                                                    location: agency.location,
                                                                    owner_user_id: agency.owner_user_id,
                                                                    certificate_path: agency.certificate_path,
                                                                    status: 'active'
                                                                } as any;
                                                                await api.put(`/api/agency/agencies-brokers/${agency.id}`, payload);
                                                                fetchData();
                                                            } catch (e) { console.error(e); }
                                                        }}
                                                        className="p-2 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-white/5"
                                                    >
                                                        <CheckCircle2 size={16} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        title="Deactivate"
                                                        onClick={async () => {
                                                            try {
                                                                const payload = {
                                                                    name: agency.name,
                                                                    type: agency.type,
                                                                    location: agency.location,
                                                                    owner_user_id: agency.owner_user_id,
                                                                    certificate_path: agency.certificate_path,
                                                                    status: 'inactive'
                                                                } as any;
                                                                await api.put(`/api/agency/agencies-brokers/${agency.id}`, payload);
                                                                fetchData();
                                                            } catch (e) { console.error(e); }
                                                        }}
                                                        className="p-2 rounded-lg text-yellow-600 hover:bg-yellow-50 dark:hover:bg-white/5"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                )}
                                             
                                            </>
                                        ) : (
                                            // Non-admin users: show delete icon but disable if agency is active
                                            <>
                                                <button 
                                                    title={agency.status === 'active' ? 'Cannot delete approved agency' : 'Delete'} 
                                                    onClick={async () => { 
                                                        if (agency.status === 'active') return; 
                                                        if (!confirm('Delete this agency?')) return; 
                                                        await api.delete(`/api/agency/agencies-brokers/${agency.id}`); 
                                                        fetchData(); 
                                                    }} 
                                                    className={clsx(
                                                        'p-2 rounded-lg', 
                                                        agency.status === 'active' ? 'text-gray-400 cursor-not-allowed' : 'text-red-500 hover:bg-red-50 dark:hover:bg-white/5'
                                                    )}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                                
                                                <button 
                                                    title="Edit" 
                                                    onClick={async () => { 
                                                        setSelectedAgency(agency); 
                                                        setFormData({ ...agency }); 
                                                        setModalMode('edit'); 
                                                        setIsModalOpen(true); 
                                                    }} 
                                                    className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-white/5"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                            </>
                                        )
                                    )}
                                </div>
                            </div>
                        ))}
                    </motion.div>
                )}
            </div>

            {/* === CREATE PARTNER MODAL === */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }} 
                            animate={{ scale: 1, opacity: 1, y: 0 }} 
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-lg bg-white dark:bg-[#0a162e] border border-gray-200 dark:border-white/10 overflow-hidden rounded-2xl"
                        >
                            <div className="p-6 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0f1f3a] flex justify-between items-center">
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                    {modalMode === 'view' ? 'Partner Details' : modalMode === 'edit' ? 'Edit Partner' : 'New Partner Registration'}
                                </h2>
                                <button 
                                    onClick={() => { 
                                        setIsModalOpen(false); 
                                        setModalMode('create'); 
                                        setSelectedAgency(null); 
                                    }}
                                    className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <X className="text-gray-400 hover:text-slate-900 dark:hover:text-white" size={20} />
                                </button>
                            </div>

                            {modalMode === 'view' && selectedAgency ? (
                                <div className="p-6 space-y-4">
                                    <div className="flex gap-4 items-start">
                                        <div className="w-28 h-28 rounded-lg bg-gray-100 overflow-hidden border border-gray-200 dark:border-white/10">
                                            {selectedAgency.logo_path ? (
                                                <img 
                                                    src={`${import.meta.env.VITE_BASE_URL}/assets/${selectedAgency.logo_path}`} 
                                                    alt="logo" 
                                                    className="w-full h-full object-cover" 
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                    No Image
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-xl font-bold">{selectedAgency.name}</h3>
                                            <p className="text-sm text-gray-500">Type: {selectedAgency.type}</p>
                                            <p className="text-sm text-gray-500">Location: {selectedAgency.location || 'N/A'}</p>
                                            <p className="text-sm text-gray-500">Status: {selectedAgency.status}</p>
                                            {selectedAgency.created_at && (
                                                <p className="text-xs text-gray-400">Created: {selectedAgency.created_at}</p>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <h4 className="text-sm font-bold mb-2">RDB Certificate</h4>
                                        {selectedAgency.certificate_path ? (
                                            <div className="flex flex-col gap-3">
                                                <div className="flex gap-2 items-center">
                                                    <button
                                                        onClick={() => {
                                                            const pdfFile = `${import.meta.env.VITE_BASE_URL.replace(/\/$/, '')}/assets/${selectedAgency.certificate_path}`;
                                                            const viewer = `${window.location.origin}/pdf_viewer.html?file=${encodeURIComponent(pdfFile)}`;
                                                            setPdfUrl(viewer);
                                                            setIsPdfViewerOpen(true);
                                                        }}
                                                        className="px-3 py-2 bg-gray-100 dark:bg-white/5 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                                                    >
                                                        View PDF (Large)
                                                    </button>
                                                    <span className="text-sm text-gray-500 truncate">{selectedAgency.certificate_path}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-400">No certificate uploaded</p>
                                        )}
                                    </div>

                                    <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-white/10">
                                        {isAdminView && selectedAgency.status !== 'active' && (
                                            <button 
                                                onClick={async () => { 
                                                    await api.put(`/api/agency/agencies-brokers/${selectedAgency.id}/approve`); 
                                                    fetchData(); 
                                                    setSelectedAgency({ ...selectedAgency, status: 'active' }); 
                                                }} 
                                                className="px-4 py-2 rounded-lg text-green-600 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-sm font-bold"
                                            >
                                                Approve
                                            </button>
                                        )}
                                        {( isBuyer || (loggedUser && loggedUser.id === selectedAgency.owner_user_id) && !isAdminView) && (
                                            <button 
                                                onClick={() => { 
                                                    setFormData({ ...selectedAgency } as any); 
                                                    setModalMode('edit'); 
                                                }} 
                                                className="px-4 py-2 rounded-lg text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors text-sm font-bold"
                                            >
                                                Edit
                                            </button>
                                        )}
                                        {(isBuyer || (loggedUser && loggedUser.id === selectedAgency.owner_user_id && !isAdminView)) && (
                                            <button 
                                                onClick={async () => { 
                                                    if (!confirm('Delete this agency?')) return; 
                                                    await api.delete(`/api/agency/agencies-brokers/${selectedAgency.id}`); 
                                                    fetchData(); 
                                                    setIsModalOpen(false); 
                                                }} 
                                                className="px-4 py-2 rounded-lg text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-sm font-bold"
                                            >
                                                Delete
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => { 
                                                setIsModalOpen(false); 
                                                setSelectedAgency(null); 
                                            }} 
                                            className="ml-auto px-4 py-2 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-sm font-bold"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                    {/* Type Selector */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <label className={clsx(
                                            "cursor-pointer border p-4 rounded-xl flex flex-col items-center gap-2 transition-all",
                                            formData.type === 'agency' 
                                                ? "border-[#395d91] bg-[#395d91]/5 ring-1 ring-[#395d91]" 
                                                : "border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5"
                                        )}>
                                            <input 
                                                type="radio" 
                                                className="hidden" 
                                                disabled={modalMode === 'edit'}
                                                checked={formData.type === 'agency'} 
                                                onChange={() => setFormData({...formData, type: 'agency'})}
                                            />
                                            <Building2 className={formData.type === 'agency' ? "text-[#395d91]" : "text-gray-400"} size={24} />
                                            <span className={clsx(
                                                "text-xs font-bold uppercase", 
                                                formData.type === 'agency' ? "text-[#395d91]" : "text-gray-500"
                                            )}>
                                                Agency
                                            </span>
                                        </label>
                                        <label className={clsx(
                                            "cursor-pointer border p-4 rounded-xl flex flex-col items-center gap-2 transition-all",
                                            formData.type === 'broker' 
                                                ? "border-[#395d91] bg-[#395d91]/5 ring-1 ring-[#395d91]" 
                                                : "border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5"
                                        )}>
                                            <input 
                                                type="radio" 
                                                className="hidden" 
                                                disabled={modalMode === 'edit'}
                                                checked={formData.type === 'broker'} 
                                                onChange={() => setFormData({...formData, type: 'broker'})}
                                            />
                                            <User className={formData.type === 'broker' ? "text-[#395d91]" : "text-gray-400"} size={24} />
                                            <span className={clsx(
                                                "text-xs font-bold uppercase", 
                                                formData.type === 'broker' ? "text-[#395d91]" : "text-gray-500"
                                            )}>
                                                Broker
                                            </span>
                                        </label>
                                    </div>

                                    {/* Text Inputs */}
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase text-gray-500 ml-1">Entity Name</label>
                                            <input 
                                                required
                                                value={formData.name}
                                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                                className="w-full p-3 bg-white dark:bg-[#0f1f3a] border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:border-[#395d91] outline-none transition-colors text-slate-900 dark:text-white"
                                                placeholder="e.g. Kigali Homes Ltd."
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase text-gray-500 ml-1">Location</label>
                                            <input 
                                                required
                                                value={formData.location}
                                                onChange={(e) => setFormData({...formData, location: e.target.value})}
                                                className="w-full p-3 bg-white dark:bg-[#0f1f3a] border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:border-[#395d91] outline-none transition-colors text-slate-900 dark:text-white"
                                                placeholder="e.g. Nyarutarama"
                                            />
                                        </div>
                                    </div>

                                    {/* File Inputs */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase text-gray-500 ml-1">Logo</label>
                                            <label className="flex flex-col items-center justify-center h-24 border border-dashed border-gray-300 dark:border-white/20 rounded-lg cursor-pointer hover:border-[#395d91] transition-colors relative bg-gray-50 dark:bg-[#0f1f3a] overflow-hidden">
                                                {logoPreview ? (
                                                    <img src={logoPreview} className="w-full h-full object-cover opacity-80" alt="Preview"/>
                                                ) : (
                                                    <div className="flex flex-col items-center">
                                                        <Upload size={18} className="text-gray-400 mb-1"/>
                                                        <span className="text-[10px] text-gray-500">Select Image</span>
                                                    </div>
                                                )}
                                                <input 
                                                    type="file" 
                                                    className="hidden" 
                                                    accept="image/*" 
                                                    onChange={(e) => handleFileChange(e, 'logo')} 
                                                />
                                            </label>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold uppercase text-gray-500 ml-1">RDB Cert</label>
                                            <label className={clsx(
                                                "flex flex-col items-center justify-center h-24 border border-dashed rounded-lg cursor-pointer transition-colors bg-gray-50 dark:bg-[#0f1f3a]",
                                                certFile ? "border-green-500 bg-green-50 dark:bg-green-900/10" : "border-gray-300 dark:border-white/20 hover:border-[#395d91]"
                                            )}>
                                                <FileText size={18} className={certFile ? "text-green-600" : "text-gray-400 mb-1"}/>
                                                <span className={clsx("text-[10px]", certFile ? "text-green-600 font-bold" : "text-gray-500")}>
                                                    {certFile ? "PDF Attached" : "Select PDF"}
                                                </span>
                                                <input 
                                                    type="file" 
                                                    className="hidden" 
                                                    accept="application/pdf" 
                                                    onChange={(e) => handleFileChange(e, 'cert')} 
                                                />
                                            </label>
                                        </div>
                                    </div>

                                    <button 
                                        type="submit" 
                                        disabled={isSubmitting}
                                        className="w-full py-3.5 bg-[#395d91] hover:bg-[#2d4a75] text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                                    >
                                        {isSubmitting ? (
                                            <Loader2 className="animate-spin" size={18}/>
                                        ) : (
                                            modalMode === 'edit' ? (
                                                <>Save Changes <CheckCircle2 size={18}/></>
                                            ) : (
                                                <>Create Account <CheckCircle2 size={18}/></>
                                            )
                                        )}
                                    </button>
                                </form>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Full-screen PDF viewer overlay (separate from modal) */}
            {isPdfViewerOpen && pdfUrl && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onContextMenu={(e) => e.preventDefault()}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setIsPdfViewerOpen(false); setPdfUrl(null); }} />
                    <div className="relative w-full max-w-[1200px] h-[90vh] bg-white dark:bg-[#071226] rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 z-10" onContextMenu={(e) => e.preventDefault()}>
                        <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-white/5 bg-white dark:bg-[#071226]">
                            <div className="text-sm font-semibold">RDB Certificate</div>
                            <div className="flex items-center gap-2">
                                <a href={pdfUrl} target="_blank" rel="noreferrer" className="text-xs text-gray-500 hover:text-gray-700 hidden">Open in new tab</a>
                                <button onClick={() => { setIsPdfViewerOpen(false); setPdfUrl(null); }} className="px-3 py-1 rounded bg-gray-100 dark:bg-white/5 text-sm">Close</button>
                            </div>
                        </div>
                        <iframe src={pdfUrl} title="RDB Certificate" className="w-full h-[calc(100%_-_48px)]" sandbox="allow-scripts allow-same-origin" />
                    </div>
                </div>
            )}
        </div>
    );
};

// --- SUB COMPONENT: Metric Card ---
const MetricCard = ({ label, value, icon: Icon, color = "text-slate-900 dark:text-white" }: any) => (
    <div className="bg-white dark:bg-[#0a162e] border border-gray-200 dark:border-white/10 p-5 rounded-2xl flex items-center justify-between">
        <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
            <p className={clsx("text-2xl font-bold", color)}>{value}</p>
        </div>
        <div className="p-3 bg-gray-100 dark:bg-white/5 rounded-xl text-gray-400">
            <Icon size={24}/>
        </div>
    </div>
);