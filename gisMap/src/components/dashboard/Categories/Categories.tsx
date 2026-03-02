import React, { useEffect, useState } from 'react';
// Get backend base URL from env
const BASE_URL = import.meta.env.VITE_BASE_URL?.replace(/\/$/, '') || '';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Layers, Tag, Search, FolderTree,
    Loader2, Database, AlertCircle, X, Trash2, Edit2, ChevronRight,
    ArrowRight
} from 'lucide-react';
import { clsx } from 'clsx';
import api from '../../../instance/mainAxios';

// --- TYPES ---
interface Category {
    id: number;
    name: string;
    label: string;
    icon?: string;
}

interface SubCategory {
    id: number;
    category_id: number;
    name: string;
    label: string;
}

// --- ANIMATION VARIANTS ---
const tabContentVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
};

export const CategoryManagement = () => {
    // --- STATE ---
    const [categories, setCategories] = useState<Category[]>([]);
    const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // UI State
    const [activeTab, setActiveTab] = useState<'categories' | 'subcategories'>('categories');
    const [modalOpen, setModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Totals from backend
    const [categoryTotal, setCategoryTotal] = useState<number>(0);
    const [subcategoryTotal, setSubcategoryTotal] = useState<number>(0);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

    // Forms
    const [catForm, setCatForm] = useState<{ id?: number; name: string; label: string; icon: File | null }>({ name: '', label: '', icon: null });
    const [subForm, setSubForm] = useState<{ category_id: string; name: string; label: string }>({ category_id: '', name: '', label: '' });
    // For image preview
    const [catPreview, setCatPreview] = useState<string | null>(null);
    // Edit state
    const [editId, setEditId] = useState<number | null>(null);
    const [editSubId, setEditSubId] = useState<number | null>(null);
    console.log("Edit Sub ID:", editSubId);
    // Track whether name was auto-generated from label (so manual edits persist)
    const [catNameAuto, setCatNameAuto] = useState(true);
    const [subNameAuto, setSubNameAuto] = useState(true);

    // --- FETCH DATA ---
    const fetchData = async () => {
        setLoading(true);
        try {
            const [catsRes, subsRes] = await Promise.all([
                api.get('/api/property/categories'),
                api.get('/api/property/subcategories')
            ]);
            setCategories(Array.isArray(catsRes.data.items) ? catsRes.data.items : []);
            setSubCategories(Array.isArray(subsRes.data.items) ? subsRes.data.items : []);
            setCategoryTotal(Number(catsRes.data.total || 0));
            setSubcategoryTotal(Number(subsRes.data.total || 0));
        } catch (error) {
            console.error("Failed to load Category", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- HANDLERS ---
    // Modern file input with preview
    // Modern drag-and-drop upload for icon (categories only)
    const catInputRef = React.useRef<HTMLInputElement>(null);

    const handleCatIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
        setCatForm({ ...catForm, icon: file });
        if (file) {
            const reader = new FileReader();
            reader.onload = ev => setCatPreview(ev.target?.result as string);
            reader.readAsDataURL(file);
        } else {
            setCatPreview(null);
        }
    };
    // Drag and drop handlers
    const handleCatDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            setCatForm({ ...catForm, icon: file });
            const reader = new FileReader();
            reader.onload = ev => setCatPreview(ev.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (activeTab === 'categories') {
                const formData = new FormData();
                formData.append('name', catForm.name);
                formData.append('label', catForm.label);
                if (catForm.icon) formData.append('icon', catForm.icon);
                if (editId) {
                    // Update
                    await api.put(`/api/property/categories/${editId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                } else {
                    // Create
                    await api.post('/api/property/categories', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                }
                setCatForm({ name: '', label: '', icon: null });
                setCatPreview(null);
                setEditId(null);
            } else {
                const formData = new FormData();
                formData.append('category_id', subForm.category_id);
                formData.append('name', subForm.name);
                formData.append('label', subForm.label);
                if (editSubId) {
                    // Update existing subcategory
                    await api.put(`/api/property/subcategories/${editSubId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                    setEditSubId(null);
                } else {
                    // Create new subcategory
                    await api.post('/api/property/subcategories', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                }
                setSubForm({ ...subForm, name: '', label: '' });
            }
            await fetchData();
            setModalOpen(false);
        } catch (error) {
            alert("Failed to save entry. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    // Edit handler for categories
    const handleEdit = (cat: Category) => {
        setCatForm({ id: cat.id, name: cat.name, label: cat.label, icon: null });
        setCatPreview(cat.icon ? `${BASE_URL}/assets/${cat.icon}` : null);
        setEditId(cat.id);
        setModalOpen(true);
    };

    // Click a category to view its subcategories
    const handleCategoryClick = (cat: Category) => {
        setSelectedCategoryId(cat.id);
        setActiveTab('subcategories');
        setSearchQuery('');
    };

    // Edit handler for subcategories
    const handleEditSub = (sub: SubCategory) => {
        setSubForm({ category_id: String(sub.category_id), name: sub.name, label: sub.label });
        setEditSubId(sub.id);
        setModalOpen(true);
    };


    // Delete handler for categories and subcategories
    const handleDelete = async (id: number) => {
        if (!window.confirm("Are you sure? This action cannot be undone.")) return;
        try {
            if (activeTab === 'categories') {
                await api.delete(`/api/property/categories/${id}`);
            } else {
                await api.delete(`/api/property/subcategories/${id}`);
            }
            await fetchData();
        } catch (error) {
            alert("Failed to delete. Please try again.");
        }
    };

    // Filter Logic
    const filteredCats = categories.filter(c => c.label.toLowerCase().includes(searchQuery.toLowerCase()));
    const filteredSubs = subCategories.filter(s => s.label.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#050c1a] text-slate-900 dark:text-white font-sans p-2 sm:p-4 md:p-6 lg:p-10 transition-colors duration-300 w-full">
            <div className="w-full mx-auto space-y-8">

                {/* --- HEADER --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            <FolderTree className="text-[#395d91]" />
                            Category Manager
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-xl text-sm">
                            Configure the classification structure for the marketplace. Manage property Categories and their specific Sub-types.
                        </p>
                    </div>

                    <button
                        onClick={() => setModalOpen(true)}
                        className="px-6 py-3 bg-[#395d91] hover:bg-[#2d4a75] text-white font-bold rounded-xl shadow-blue-900/20 flex items-center gap-2 transition-all"
                    >
                        <Plus size={18} />
                        <span>Add New {activeTab === 'categories' ? 'Category' : 'Sub-Category'}</span>
                    </button>
                </div>

                {/* --- CONTROLS BAR --- */}
                <div className="bg-white dark:bg-[#0a162e] p-2 rounded-2xl border border-gray-200 dark:border-gray-800 flex flex-col md:flex-row gap-4 items-center justify-between ">

                    {/* TABS */}
                    <div className="flex p-1 bg-gray-100 dark:bg-[#112240] rounded-xl w-full md:w-auto">
                        <button
                            onClick={() => { setActiveTab('categories'); setSelectedCategoryId(null); }}
                            className={clsx(
                                "px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all flex-1 md:flex-none justify-center",
                                activeTab === 'categories'
                                    ? "bg-white dark:bg-[#395d91] text-[#395d91] dark:text-white"
                                    : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
                            )}
                        >
                            <Layers size={16} /> Categories ({categoryTotal})
                        </button>
                        <button
                            onClick={() => { setActiveTab('subcategories'); setSelectedCategoryId(null); }}
                            className={clsx(
                                "px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all flex-1 md:flex-none justify-center",
                                activeTab === 'subcategories'
                                    ? "bg-white dark:bg-[#395d91] text-[#395d91] dark:text-white"
                                    : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
                            )}
                        >
                            <Tag size={16} /> Sub-Categories ({selectedCategoryId ? filteredSubs.filter(s => s.category_id === selectedCategoryId).length : subcategoryTotal})
                        </button>
                    </div>

                    {/* SEARCH */}
                    <div className="relative w-full md:w-96 pr-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder={`Search ${activeTab}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-[#112240] border-transparent focus:border-[#395d91] border-2 rounded-xl text-sm outline-none transition-all"
                        />
                    </div>
                </div>

                {/* --- DATA TABLE AREA --- */}
                <div className="bg-white dark:bg-[#0a162e] border border-gray-200 dark:border-gray-800 overflow-hidden min-h-[500px] flex flex-col w-full">

                    {/* Header Row */}
                    <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gradient-to-r from-gray-50 via-white to-gray-100 dark:from-[#0f1f3a] dark:via-[#0a162e] dark:to-[#0f1f3a] border-b border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider w-full">
                        <div className="col-span-2">Icon</div>
                        <div className="col-span-7">Label</div>
                        <div className="col-span-3 text-right">Actions</div>
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                            <Loader2 className="animate-spin mb-2" size={32} />
                            <p className="text-sm">Loading Data...</p>
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && ((activeTab === 'categories' && filteredCats.length === 0) || (activeTab === 'subcategories' && filteredSubs.length === 0)) && (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                            <Database size={40} strokeWidth={1} className="mb-3 opacity-50" />
                            <p>No records found.</p>
                        </div>
                    )}

                    {/* Table Content */}
                    {!loading && (
                        <div className="flex-1 overflow-y-auto p-2">
                            <AnimatePresence mode="wait">
                                {activeTab === 'categories' ? (
                                    <motion.div
                                        key="cats"
                                        variants={tabContentVariants}
                                        initial="hidden" animate="visible" exit="exit"
                                        className="space-y-1"
                                    >
                                        {filteredCats.map((cat) => (
                                            <div
                                                key={cat.id}
                                                onClick={() => handleCategoryClick(cat)}
                                                className={clsx(
                                                    "grid grid-cols-12 gap-4 px-4 py-3 bg-white/80 dark:bg-[#0a162e]/80 hover:bg-blue-50 dark:hover:bg-[#1a2a4a] transition-all items-center group border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-400 w-full cursor-pointer",
                                                    (selectedCategoryId === cat.id && activeTab === 'categories') ? 'ring-2 ring-[#395d91]/20' : ''
                                                )}
                                            >
                                                <div className="col-span-2 flex items-center">
                                                    {cat.icon ? (
                                                        <img
                                                            src={`${import.meta.env.VITE_BASE_URL}/assets/${cat.icon}`}
                                                            alt={cat.label}
                                                            className="w-14 h-14 object-cover border-2 border-blue-200 dark:border-blue-400 bg-white"
                                                        />
                                                    ) : (
                                                        <div className="w-14 h-14 bg-[#395d91]/10 text-[#395d91] dark:text-blue-400 flex items-center justify-center border-2 border-gray-200 dark:border-gray-700">
                                                            <Layers size={22} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="col-span-7 flex flex-col justify-center">
                                                    <span className="font-bold text-base text-slate-900 dark:text-white">{cat.label}</span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{cat.name}</span>
                                                </div>
                                                <div className="col-span-3 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={(e) => { e.stopPropagation(); handleEdit(cat); }} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg text-gray-500 transition-colors"><Edit2 size={14} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(cat.id); }} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 rounded-lg transition-colors"><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="subs"
                                        variants={tabContentVariants}
                                        initial="hidden" animate="visible" exit="exit"
                                        className="space-y-1"
                                    >
                                        {(selectedCategoryId ? filteredSubs.filter(s => s.category_id === selectedCategoryId) : filteredSubs).map((sub,index) => {
                                            const parent = categories.find(c => c.id === sub.category_id);
                                            return (
                                                <div key={sub.id} className="grid grid-cols-12 gap-4 px-4 py-3 bg-white/80 dark:bg-[#0a162e]/80 hover:bg-blue-50 dark:hover:bg-[#1a2a4a] transition-all items-center group border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-400 w-full">
                                                    <div className="col-span-1 text-gray-400 font-mono text-xs">#{index+1}</div>
                                                    <div className="col-span-4 flex items-center gap-4">
                                                        <div className="w-14 h-14 bg-blue-50 dark:bg-white/10 text-blue-400 flex items-center justify-center border-2 border-gray-200 dark:border-gray-700">
                                                            <Tag size={22} />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-base text-slate-900 dark:text-white">{sub.label}</p>
                                                            <p className="text-xs text-gray-400 font-mono">{sub.name}</p>
                                                        </div>
                                                    </div>
                                                    <div className="col-span-4">
                                                        {parent ? (
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-[#112240] text-blue-700 dark:text-blue-200 text-xs font-bold border border-blue-100 dark:border-blue-900">
                                                                <Layers size={14} /> {parent.label}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-red-400 flex items-center gap-1"><AlertCircle size={14} /> Orphaned</span>
                                                        )}
                                                    </div>
                                                    <div className="col-span-3 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={(e) => { e.stopPropagation(); handleEditSub(sub); }} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg text-gray-500 transition-colors"><Edit2 size={14} /></button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(sub.id); }} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 rounded-lg transition-colors"><Trash2 size={14} /></button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>

            {/* === POPUP MODAL === */}
            <AnimatePresence>
                {modalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setModalOpen(false)}
                            className="absolute inset-0 bg-[#0a162e]/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-2xl bg-white dark:bg-[#0f1f3a] rounded-3xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                        >
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-[#112240]">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    {activeTab === 'categories' ? <Layers size={18} className="text-[#395d91]" /> : <Tag size={18} className="text-[#395d91]" />}
                                    {(activeTab === 'categories' ? (editId ? 'Edit' : 'Add') : (editSubId ? 'Edit' : 'Add'))} {activeTab === 'categories' ? 'Category' : 'Sub-Category'}
                                </h3>
                                <button onClick={() => setModalOpen(false)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                                    <X size={20} className="text-gray-500" />
                                </button>
                            </div>

                            <form onSubmit={handleCreate} className="p-6 space-y-5">
                                {activeTab === 'subcategories' && (
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Parent Category</label>
                                        <div className="relative">
                                            <select
                                                value={subForm.category_id}
                                                onChange={(e) => setSubForm({ ...subForm, category_id: e.target.value })}
                                                className="w-full p-3 bg-gray-50 dark:bg-[#0a162e] border-2 border-gray-100 dark:border-gray-800 rounded-xl text-sm font-medium outline-none focus:border-[#395d91] appearance-none text-slate-900 dark:text-white"
                                            >
                                                <option value="">Select Parent...</option>
                                                {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                            </select>
                                            <ChevronRight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 rotate-90 pointer-events-none" />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Category Label <span className="text-red-500">*</span></label>
                                    <input
                                        placeholder={activeTab === 'categories' ? "e.g. Residential" : "e.g. Apartment"}
                                        value={activeTab === 'categories' ? catForm.label : subForm.label}
                                        onChange={(e) => {
                                            const label = e.target.value;
                                            if (activeTab === 'categories') {
                                                const slug = label
                                                    .toLowerCase()
                                                    .replace(/[^a-z0-9]+/g, '_')
                                                    .replace(/^_+|_+$/g, '');
                                                setCatForm({
                                                    ...catForm,
                                                    label,
                                                    name: catNameAuto ? slug : catForm.name
                                                });
                                                // keep auto flag true unless user edited name
                                            } else {
                                                const slug = label
                                                    .toLowerCase()
                                                    .replace(/[^a-z0-9]+/g, '_')
                                                    .replace(/^_+|_+$/g, '');
                                                setSubForm({ ...subForm, label, name: subNameAuto ? slug : subForm.name });
                                            }
                                        }}
                                        className="w-full p-3 bg-gray-50 dark:bg-[#0a162e] border-2 border-gray-100 dark:border-gray-800 rounded-xl text-sm font-medium outline-none focus:border-[#395d91] text-slate-900 dark:text-white"
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Category Key</label>
                                    <input
                                        placeholder="e.g. residential_prop"
                                        value={activeTab === 'categories' ? catForm.name : subForm.name}
                                        onChange={(e) => {
                                            const v = e.target.value.toLowerCase().replace(/\s+/g, '_');
                                            if (activeTab === 'categories') {
                                                setCatForm({ ...catForm, name: v });
                                                setCatNameAuto(false);
                                            } else {
                                                setSubForm({ ...subForm, name: v });
                                                setSubNameAuto(false);
                                            }
                                        }}
                                        className="w-full p-3 bg-gray-50 dark:bg-[#0a162e] border-2 border-gray-100 dark:border-gray-800 rounded-xl text-sm font-mono text-gray-500 outline-none focus:border-[#395d91]"
                                        required
                                    />
                                </div>

                                {activeTab === 'categories' && (
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-1">Icon (Image)</label>
                                        <div
                                            className="w-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-[#0a162e] py-6 cursor-pointer hover:border-[#395d91] transition-colors"
                                            onClick={() => catInputRef.current?.click()}
                                            onDrop={handleCatDrop}
                                            onDragOver={e => e.preventDefault()}
                                        >
                                            {catPreview ? (
                                                <img src={catPreview} alt="Preview" className="w-16 h-16 rounded-lg object-cover border mb-2" />
                                            ) : (
                                                <span className="text-gray-400 text-sm">Drag & drop or click to select image</span>
                                            )}
                                            <input
                                                ref={catInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={handleCatIconChange}
                                                className="hidden"
                                            />
                                        </div>
                                    </div>
                                )}
                                {activeTab === 'subcategories' && null}

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setModalOpen(false)}
                                        className="flex-1 py-3 rounded-xl border-2 border-gray-100 dark:border-gray-800 font-bold text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 py-3 rounded-xl bg-[#395d91] hover:bg-[#2d4a75] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-blue-900/20"
                                    >
                                        {submitting ? <Loader2 className="animate-spin" size={18} /> : <>Create <ArrowRight size={16} /></>}
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