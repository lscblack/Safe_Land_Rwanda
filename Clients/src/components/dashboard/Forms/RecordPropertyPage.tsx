import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TreePine, Tractor, Home, Building2, Factory, Landmark,
    ChevronRight, Save, ArrowLeft, CheckCircle2
} from 'lucide-react';
import { clsx } from 'clsx';
import { useTheme } from '../../../contexts/theme-context';
import { FORM_CONFIG, type Category, type FormField, type SubCategory } from './propertyFormConfig';
import Select from 'react-select';


// Icon Map for Dynamic Rendering
const IconMap: Record<string, any> = {
    TreePine, Tractor, Home, Building2, Factory, Landmark
};

const RecordPropertyPage = () => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // --- STATE ---
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [selectedSubCategory, setSelectedSubCategory] = useState<SubCategory | null>(null);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentStep, setCurrentStep] = useState<1 | 2>(1);
    const [isUpiVerifying, setIsUpiVerifying] = useState(false);
    const [isUpiVerified, setIsUpiVerified] = useState(false);
    const [upiError, setUpiError] = useState<string | null>(null);

    // --- HANDLERS ---
    const handleCategorySelect = (category: Category) => {
        setSelectedCategory(category);
        setSelectedSubCategory(null);
        setFormData({}); // Reset form
        setCurrentStep(1);
    };

    const handleSubCategorySelect = (sub: SubCategory) => {
        setSelectedSubCategory(sub);
        setFormData({}); // Reset form
        setCurrentStep(1);
        setIsUpiVerified(false);
        setUpiError(null);
    };

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleVerifyUpi = async () => {
        const upi = String(formData.upi || '').trim();
        if (!upi) {
            setUpiError('UPI is required.');
            setIsUpiVerified(false);
            return;
        }
        setIsUpiVerifying(true);
        setUpiError(null);
        // TODO: replace with real API call
        setTimeout(() => {
            if (upi.length < 6) {
                setUpiError('UPI seems invalid.');
                setIsUpiVerified(false);
            } else {
                setIsUpiVerified(true);
            }
            setIsUpiVerifying(false);
        }, 700);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Simulate API Call
        console.log("Submitting:", {
            category: selectedCategory?.id,
            subCategory: selectedSubCategory?.id,
            data: formData
        });

        setTimeout(() => {
            setIsSubmitting(false);
            alert("Property Recorded Successfully!");
            // Reset or Navigate away
            setSelectedCategory(null);
        }, 1500);
    };

    // --- MEDIA & LOCATION HANDLERS ---
    const handleImagesUpload = (fieldName: string, files: FileList | null) => {
        if (!files) return;
        const arr = Array.from(files).map(file => Object.assign(file, { preview: URL.createObjectURL(file) }));
        setFormData(prev => ({ ...prev, [fieldName]: [...(prev[fieldName] || []), ...arr] }));
    };

    const removeImage = (fieldName: string, index: number) => {
        setFormData(prev => {
            const list = Array.isArray(prev[fieldName]) ? [...prev[fieldName]] : [];
            const item = list.splice(index, 1)[0];
            if (item && item.preview) URL.revokeObjectURL(item.preview);
            return { ...prev, [fieldName]: list };
        });
    };

    const handleVideosUpload = (fieldName: string, files: FileList | null) => {
        if (!files || files.length === 0) return;
        const file = files[0];
        const withPreview = Object.assign(file, { preview: URL.createObjectURL(file) });
        setFormData(prev => ({ ...prev, [fieldName]: withPreview }));
    };

    const removeVideo = (fieldName: string) => {
        setFormData(prev => {
            const item = prev[fieldName];
            if (item && item.preview) URL.revokeObjectURL(item.preview);
            return { ...prev, [fieldName]: null };
        });
    };

    const handle3DUpload = (fieldName: string, file: File | null) => {
        if (!file) return;
        const withPreview = Object.assign(file, { preview: URL.createObjectURL(file) });
        setFormData(prev => ({ ...prev, [fieldName]: withPreview }));
    };

    const remove3D = (fieldName: string) => {
        setFormData(prev => {
            const item = prev[fieldName];
            if (item && item.preview) URL.revokeObjectURL(item.preview);
            return { ...prev, [fieldName]: null };
        });
    };

    const handleUseMyLocation = (latField: string, lngField: string) => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }
        navigator.geolocation.getCurrentPosition((pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setFormData(prev => ({ ...prev, [latField]: lat, [lngField]: lng }));
        }, (err) => {
            alert('Unable to get location: ' + err.message);
        });
    };

    const getMissingRequiredFields = () => {
        if (!selectedSubCategory) return [] as string[];
        const missing: string[] = [];
        selectedSubCategory.fields.forEach((field) => {
            if (!field.required) return;
            if (field.conditional) {
                const dependentValue = formData[field.conditional.field];
                if (dependentValue !== field.conditional.value) return;
            }
            const val = formData[field.name];
            if (val === undefined || val === null || val === '') {
                missing.push(field.name);
            }
        });
        return missing;
    };

    const isStep1Valid = () => getMissingRequiredFields().length === 0;

    const isStep2Valid = () => {
        const images = formData.images || [];
        const video = formData.video;
        const estimatedAmount = formData.estimated_amount;
        const lat = formData.latitude;
        const lng = formData.longitude;
        const upi = String(formData.upi || '').trim();
        return images.length > 0 && !!video && !!estimatedAmount && !!lat && !!lng && !!upi && isUpiVerified;
    };

    // --- RENDER HELPERS ---

    const selectStyles = {
        control: (base: any) => ({
            ...base,
            backgroundColor: isDark ? '#112240' : '#F9FAFB',
            borderColor: isDark ? '#374151' : '#E5E7EB',
            borderRadius: '0.75rem',
            minHeight: '48px',
            boxShadow: 'none',
            ':hover': {
                borderColor: isDark ? '#4B5563' : '#CBD5E1'
            }
        }),
        menu: (base: any) => ({
            ...base,
            backgroundColor: isDark ? '#0F1F3A' : '#FFFFFF',
            color: isDark ? '#E5E7EB' : '#1F2937',
            borderRadius: '0.75rem',
            overflow: 'hidden',
            zIndex: 50
        }),
        option: (base: any, state: any) => ({
            ...base,
            backgroundColor: state.isSelected
                ? (isDark ? '#1F3B63' : '#E5EDFA')
                : state.isFocused
                    ? (isDark ? '#12284A' : '#F1F5F9')
                    : 'transparent',
            color: isDark ? '#E5E7EB' : '#1F2937',
            cursor: 'pointer'
        }),
        singleValue: (base: any) => ({
            ...base,
            color: isDark ? '#E5E7EB' : '#1F2937'
        }),
        input: (base: any) => ({
            ...base,
            color: isDark ? '#E5E7EB' : '#1F2937'
        }),
        placeholder: (base: any) => ({
            ...base,
            color: isDark ? '#9CA3AF' : '#94A3B8'
        })
    };

    // Renders a single field input based on its type
    const renderField = (field: FormField) => {
        // Check Conditional Logic
        if (field.conditional) {
            const dependentValue = formData[field.conditional.field];
            if (dependentValue !== field.conditional.value) return null;
        }

        const commonClasses = "w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#112240] text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all";

        switch (field.type) {
            case 'section_header':
                return (
                    <div className="col-span-full mt-4 mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-primary">{field.label}</h4>
                    </div>
                );

            case 'select':
                const options = (field.options || []).map(opt => ({ value: opt, label: opt }));
                return (
                    <Select
                        isSearchable
                        options={options}
                        value={options.find(o => o.value === formData[field.name]) || null}
                        onChange={(opt: any) => handleInputChange(field.name, opt ? opt.value : '')}
                        placeholder="Select..."
                        styles={selectStyles}
                    />
                );

            case 'radio':
                return (
                    <div className="flex gap-4 pt-2">
                        {field.options?.map(opt => (
                            <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name={field.name}
                                    value={opt}
                                    checked={formData[field.name] === opt}
                                    onChange={() => handleInputChange(field.name, opt)}
                                    className="w-4 h-4 text-primary focus:ring-primary"
                                />
                                <span className="text-sm font-medium">{opt}</span>
                            </label>
                        ))}
                    </div>
                );

            case 'multiselect':
                // Simple Multi-select implementation using checkboxes for better UX
                const currentVals = (formData[field.name] as string[]) || [];
                return (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        {field.options?.map(opt => (
                            <label key={opt} className={clsx(
                                "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all text-xs",
                                currentVals.includes(opt)
                                    ? "bg-primary/10 border-primary text-primary font-bold"
                                    : "bg-gray-50 dark:bg-[#112240] border-gray-200 dark:border-gray-700 text-gray-500"
                            )}>
                                <input
                                    type="checkbox"
                                    checked={currentVals.includes(opt)}
                                    onChange={(e) => {
                                        const newVals = e.target.checked
                                            ? [...currentVals, opt]
                                            : currentVals.filter(v => v !== opt);
                                        handleInputChange(field.name, newVals);
                                    }}
                                    className="hidden"
                                />
                                {currentVals.includes(opt) && <CheckCircle2 size={12} />}
                                <span>{opt}</span>
                            </label>
                        ))}
                    </div>
                );

            default: // text, number
                return (
                    <input
                        type={field.type}
                        className={commonClasses}
                        placeholder={field.label}
                        value={formData[field.name] || ''}
                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                    />
                );
        }
    };

    return (
        <div className="min-h-screen bg-white rounded-2xl dark:bg-[#050c1a] text-slate-900 dark:text-white p-4 md:p-8 font-sans transition-colors duration-300">

            <div className="max-w-full mx-auto">

                {/* --- HEADER --- */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight mb-2">Record Property</h1>
                        <p className="text-gray-500 dark:text-gray-400">Add new land or building assets to the registry.</p>
                    </div>
                    {selectedCategory && (
                        <button
                            onClick={() => { setSelectedCategory(null); setSelectedSubCategory(null); }}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-bold shadow-sm"
                        >
                            <ArrowLeft size={16} />
                            Change Category
                        </button>
                    )}
                </div>

                {/* --- STEP 1: CATEGORY SELECTION --- */}
                {!selectedCategory && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
                    >
                        {FORM_CONFIG.map((cat) => {
                            const Icon = IconMap[cat.icon];
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => handleCategorySelect(cat)}
                                    className="flex flex-col cursor-pointer items-center justify-center p-6 rounded-2xl bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 hover:border-primary hover:shadow-lg hover:-translate-y-1 transition-all group"
                                >
                                    <div className="w-14 h-14 rounded-xl bg-gray-50 dark:bg-[#0a162e] flex items-center justify-center mb-4 text-gray-400 group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                                        <Icon size={28} />
                                    </div>
                                    <span className="font-bold text-sm">{cat.label}</span>
                                </button>
                            )
                        })}
                    </motion.div>
                )}

                {/* --- STEP 2: FORM & SUB-CATEGORY --- */}
                {selectedCategory && (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">

                        {/* SIDEBAR: Sub-Category Menu */}
                        <div className="lg:col-span-1 space-y-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 px-2">
                                {selectedCategory.label} Types
                            </h3>
                            {selectedCategory.subCategories.map(sub => (
                                <button
                                    key={sub.id}
                                    onClick={() => handleSubCategorySelect(sub)}
                                    className={clsx(
                                        "w-full cursor-pointer text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center justify-between",
                                        selectedSubCategory?.id === sub.id
                                            ? "bg-primary text-white shadow-md shadow-primary/20"
                                            : "bg-white dark:bg-[#112240] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                                    )}
                                >
                                    {sub.label}
                                    {selectedSubCategory?.id === sub.id && <ChevronRight size={16} />}
                                </button>
                            ))}
                        </div>

                        {/* MAIN FORM AREA */}
                        <div className="lg:col-span-3">
                            <AnimatePresence mode="wait">
                                {selectedSubCategory ? (
                                    <motion.form
                                        key={selectedSubCategory.id}
                                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                                        onSubmit={handleSubmit}
                                        className="bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 rounded-2xl p-6 md:p-8"
                                    >
                                        <div className="mb-6 pb-6 border-b border-gray-100 dark:border-gray-700">
                                            <h2 className="text-xl font-bold">{selectedSubCategory.label}</h2>
                                            <p className="text-xs text-gray-500">Step {currentStep} of 2 — {currentStep === 1 ? 'Property details' : 'Media & Location'}</p>
                                        </div>

                                        {/* STEP 1: PROPERTY DETAILS */}
                                        {currentStep === 1 && (
                                            <>
                                                {getMissingRequiredFields().length > 0 && (
                                                    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 px-4 py-3 text-sm">
                                                        Please complete all required fields before continuing.
                                                    </div>
                                                )}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {selectedSubCategory.fields.map((field) => (
                                                        <div
                                                            key={field.name}
                                                            className={clsx(
                                                                field.width === 'full' ? 'col-span-1 md:col-span-2' : 'col-span-1'
                                                            )}
                                                        >
                                                            {field.type !== 'section_header' && (
                                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                                                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                                                </label>
                                                            )}
                                                            {renderField(field)}
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (!isStep1Valid()) return;
                                                            setCurrentStep(2);
                                                        }}
                                                        disabled={!isStep1Valid()}
                                                        className="bg-primary hover:bg-[#2d4a75] text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                                    >
                                                        Continue
                                                        <ChevronRight size={18} />
                                                    </button>
                                                </div>
                                            </>
                                        )}

                                        {/* STEP 2: MEDIA & LOCATION */}
                                        {currentStep === 2 && (
                                            <>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="col-span-1 md:col-span-2">
                                                        <h4 className="text-sm font-bold uppercase tracking-wider text-primary mb-3">Media & Location</h4>

                                                        {/* Images - drag & drop */}
                                                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Images (multiple)</label>
                                                        <div
                                                            onDragOver={(e) => e.preventDefault()}
                                                            onDrop={(e) => { e.preventDefault(); handleImagesUpload('images', e.dataTransfer.files); }}
                                                            className="w-full p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#112240] text-slate-900 dark:text-white"
                                                        >
                                                            <p className="text-sm text-gray-500 mb-2">Drag & drop images here, or click to upload.</p>
                                                            <input type="file" accept="image/*" multiple onChange={(e) => handleImagesUpload('images', e.target.files)} className="mb-2" />
                                                            <div className="flex gap-2 flex-wrap">
                                                                {(formData.images || []).map((img: any, idx: number) => (
                                                                    <div key={idx} className="w-24 h-24 rounded-md overflow-hidden relative border">
                                                                        <img src={img.preview || img} alt={`img-${idx}`} className="w-full h-full object-cover" />
                                                                        <button type="button" onClick={() => removeImage('images', idx)} className="absolute top-1 right-1 bg-white/80 rounded-full p-1 text-xs">x</button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Video - single file drag & drop */}
                                                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block mt-4">Video (single)</label>
                                                        <div
                                                            onDragOver={(e) => e.preventDefault()}
                                                            onDrop={(e) => { e.preventDefault(); handleVideosUpload('video', e.dataTransfer.files); }}
                                                            className="w-full p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#112240] text-slate-900 dark:text-white"
                                                        >
                                                            <p className="text-sm text-gray-500 mb-2">Drag & drop a video here, or click to upload.</p>
                                                            <input type="file" accept="video/*" onChange={(e) => handleVideosUpload('video', e.target.files)} className="mb-2" />
                                                            {formData.video && (
                                                                <div className="w-56 h-32 rounded-md overflow-hidden relative border">
                                                                    <video src={formData.video.preview || formData.video} className="w-full h-full object-cover" controls />
                                                                    <button type="button" onClick={() => removeVideo('video')} className="absolute top-1 right-1 bg-white/80 rounded-full p-1 text-xs">x</button>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* 3D Video / Model (optional) */}
                                                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block mt-4">3D Video / Model (optional)</label>
                                                        <div
                                                            onDragOver={(e) => e.preventDefault()}
                                                            onDrop={(e) => { e.preventDefault(); handle3DUpload('video_3d', e.dataTransfer.files?.[0] || null); }}
                                                            className="w-full p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#112240] text-slate-900 dark:text-white"
                                                        >
                                                            <p className="text-sm text-gray-500 mb-2">Drag & drop 3D video/model here, or click to upload.</p>
                                                            <input type="file" accept="video/*,model/*,.gltf,.glb" onChange={(e) => handle3DUpload('video_3d', e.target.files?.[0] || null)} />
                                                            {formData.video_3d && (
                                                                <div className="mt-2 w-full relative">
                                                                    <video src={formData.video_3d.preview || formData.video_3d} controls className="w-full h-40 object-cover rounded-md" />
                                                                    <button type="button" onClick={() => remove3D('video_3d')} className="absolute top-2 right-2 bg-white/80 rounded-full p-1 text-xs">x</button>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* UPI */}
                                                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block mt-4">UPI</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                value={formData.upi || ''}
                                                                onChange={(e) => {
                                                                    setFormData(prev => ({ ...prev, upi: e.target.value }));
                                                                    setIsUpiVerified(false);
                                                                    setUpiError(null);
                                                                }}
                                                                placeholder="Enter UPI"
                                                                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#112240]"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={handleVerifyUpi}
                                                                disabled={isUpiVerifying}
                                                                className="px-4 py-3 rounded-xl bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 text-sm font-bold"
                                                            >
                                                                {isUpiVerifying ? 'Verifying...' : isUpiVerified ? 'Verified' : 'Verify'}
                                                            </button>
                                                        </div>
                                                        {upiError && <p className="text-xs text-red-500 mt-1">{upiError}</p>}


                                                        {/* Location */}
                                                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block mt-4">Location (Latitude / Longitude)</label>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <input type="number" step="any" value={formData.latitude || ''} onChange={(e) => setFormData(prev => ({ ...prev, latitude: e.target.value }))} placeholder="Latitude" className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#112240]" />
                                                            <input type="number" step="any" value={formData.longitude || ''} onChange={(e) => setFormData(prev => ({ ...prev, longitude: e.target.value }))} placeholder="Longitude" className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#112240]" />
                                                        </div>
                                                        <div className="mt-2 flex gap-2">
                                                            <button type="button" onClick={() => handleUseMyLocation('latitude', 'longitude')} className="px-3 py-2 rounded-md bg-white dark:bg-[#112240] border">Use my location</button>
                                                        </div>

                                                        {/* Estimated Amount */}
                                                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block mt-4">Estimated Amount</label>
                                                        <input type="number" step="0.01" value={formData.estimated_amount || ''} onChange={(e) => setFormData(prev => ({ ...prev, estimated_amount: e.target.value }))} placeholder="Estimated value in RWF" className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#112240]" />
                                                    </div>
                                                </div>

                                                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-between">
                                                    <button
                                                        type="button"
                                                        onClick={() => setCurrentStep(1)}
                                                        className="px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#112240] text-sm font-bold"
                                                    >
                                                        Back
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        disabled={isSubmitting || !isStep2Valid()}
                                                        className="bg-primary hover:bg-[#2d4a75] text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                                    >
                                                        {isSubmitting ? "Saving..." : "Save Record"}
                                                        {!isSubmitting && <Save size={18} />}
                                                    </button>
                                                </div>
                                            </>
                                        )}

                                    </motion.form>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                        className="h-64 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50/50 dark:bg-[#112240]/50"
                                    >
                                        <p className="text-sm font-medium">Select a property type from the left menu to begin.</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                    </div>
                )}

            </div>
        </div>
    );
};
export default RecordPropertyPage;