import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TreePine, Tractor, Home, Building2, Factory, Landmark,
    ChevronRight, Save, ArrowLeft, CheckCircle2
} from 'lucide-react';
import { clsx } from 'clsx';
import { useTheme } from '../../../contexts/theme-context';
import { FORM_CONFIG, type Category, type FormField, type SubCategory } from './propertyFormConfig';
import api from '../../../instance/mainAxios';
import Select from 'react-select';


// Icon Map for Dynamic Rendering
const IconMap: Record<string, any> = {
    TreePine, Tractor, Home, Building2, Factory, Landmark
};

const RecordPropertyPage = () => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // --- STATE ---
    const [selectedCategory, setSelectedCategory] = useState<any | null>(null);
    const [selectedSubCategory, setSelectedSubCategory] = useState<any | null>(null);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [currentStep, setCurrentStep] = useState<1 | 2>(1);
    const [isUpiVerifying, setIsUpiVerifying] = useState(false);
    const [isUpiVerified, setIsUpiVerified] = useState(false);
    const [upiError, setUpiError] = useState<string | null>(null);
    const [parcelInfo, setParcelInfo] = useState<any | null>(null);
    const [parcelStatusMessage, setParcelStatusMessage] = useState<string | null>(null);
    const [parcelAllowed, setParcelAllowed] = useState<boolean>(false);
    const [parcelCategoryWarning, setParcelCategoryWarning] = useState<string | null>(null);
    // categories from backend mapped to FORM_CONFIG
    const [dbCategories, setDbCategories] = useState<any[]>([]);
    const [dbSubCategories, setDbSubCategories] = useState<any[]>([]);
    const [formCategories, setFormCategories] = useState<Category[]>(FORM_CONFIG);

    // Load taxonomy from backend and map to the static FORM_CONFIG fields
    React.useEffect(() => {
        const loadTaxonomy = async () => {
            try {
                const [catsRes, subsRes] = await Promise.all([
                    api.get('/api/property/categories'),
                    api.get('/api/property/subcategories')
                ]);
                const cats = Array.isArray(catsRes.data.items) ? catsRes.data.items : [];
                const subs = Array.isArray(subsRes.data.items) ? subsRes.data.items : [];
                setDbCategories(cats);
                setDbSubCategories(subs);

                const mapped = FORM_CONFIG.map(cfg => {
                    const dbCat = cats.find((c: any) => (c.name === cfg.id) || (c.label === cfg.label));
                    const mappedSubs = (cfg.subCategories || []).map(sc => {
                        const dbSub = subs.find((s: any) => (s.name === sc.id) || (s.label === sc.label));
                        if (!dbSub) return null;
                        return ({ ...sc, id: dbSub.id });
                    }).filter(Boolean) as SubCategory[];
                    return ({ ...cfg, id: dbCat ? dbCat.id : cfg.id, subCategories: mappedSubs, icon: dbCat?.icon || cfg.icon });
                });
                setFormCategories(mapped);
            } catch (err) {
                console.error('Failed to load taxonomy for form', err);
            }
        };
        loadTaxonomy();
    }, []);

    // --- HANDLERS ---
    const handleChangeCategory = () => {
        // Reset selection and clear form + verification state
        setSelectedCategory(null);
        setSelectedSubCategory(null);
        setFormData({});
        setIsUpiVerified(false);
        setIsUpiVerifying(false);
        setUpiError(null);
        setParcelInfo(null);
        setParcelStatusMessage(null);
        setParcelAllowed(false);
        setParcelCategoryWarning(null);
        setCurrentStep(1);
    };
    const handleCategorySelect = (category: any) => {
        setSelectedCategory(category);
        setSelectedSubCategory(null);
        setFormData(prev => ({ ...prev, upi: prev.upi || formData.upi })); // keep UPI and owner
        setCurrentStep(1);
    };

    const handleSubCategorySelect = (sub: any) => {
        // Find matching form definition for this subcategory if available
        const formCat = FORM_CONFIG.find(cfg => cfg.id === selectedCategory?.name || cfg.label === selectedCategory?.label || cfg.id === String(selectedCategory?.id));
        let fields = [] as any[];
        if (formCat) {
            const formSub = (formCat.subCategories || []).find((fs: any) => fs.id === sub.name || fs.label === sub.label || fs.id === String(sub.id));
            if (formSub) fields = formSub.fields || [];
        }
        setSelectedSubCategory({ ...sub, fields });
        setFormData(prev => ({ upi: prev.upi || '', owner_id: prev.owner_id || '', owner_name: prev.owner_name || '' }));
        setCurrentStep(1);
    };

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleVerifyUpi = async () => {
        const upi = String(formData.upi || '').trim();
        setParcelInfo(null);
        setParcelStatusMessage(null);
        setParcelAllowed(false);
        if (!upi) {
            setUpiError('UPI is required.');
            setIsUpiVerified(false);
            return;
        }
        setIsUpiVerifying(true);
        setUpiError(null);
        try {
            const res = await api.post('/api/external/parcel', { upi, owner_id: formData.owner_id || '' });
            const data = res.data;
            setParcelInfo(data);

            // Check if this UPI was already uploaded by the current user (prevent re-upload)
            try {
                const mineRes = await api.get('/api/property/properties/mine');
                const myItems = Array.isArray(mineRes.data.items) ? mineRes.data.items : (Array.isArray(mineRes.data) ? mineRes.data : []);
                const upiNormalized = String(upi).trim();
                const already = myItems.some((it: any) => String(it.upi || it.UPI || '').trim() === upiNormalized);
                if (already) {
                    setParcelStatusMessage('This UPI has already been uploaded by you — re-upload is not allowed.');
                    setParcelAllowed(false);
                    setIsUpiVerified(false);
                    setParcelCategoryWarning(null);
                    setIsUpiVerifying(false);
                    return;
                }
            } catch (e) {
                // ignore failures to check user's existing properties
            }

            // Auto-populate district/sector/cell/village and coordinates from parcel data.
            try {
                const loc = data.parcelLocation || data.parcel_location || data.representative?.address || null;
                const district = loc?.district?.districtName || loc?.districtName || '';
                const sector = loc?.sector?.sectorName || loc?.sectorName || '';
                const cell = loc?.cell?.cellName || loc?.cellName || '';
                const village = loc?.village?.villageName || loc?.villageName || '';

                // prefer coordinates array first, then top-level latitude/longitude fields
                let lat: number | null = null;
                let lon: number | null = null;
                try {
                    if (Array.isArray(data.coordinates) && data.coordinates.length > 0) {
                        const c0: any = data.coordinates[0];
                        const maybeLat = c0?.lat ?? c0?.latitude ?? null;
                        const maybeLon = c0?.lon ?? c0?.longitude ?? c0?.lng ?? null;
                        const nlat = maybeLat !== null && maybeLat !== undefined ? Number(maybeLat) : NaN;
                        const nlon = maybeLon !== null && maybeLon !== undefined ? Number(maybeLon) : NaN;
                        if (!Number.isNaN(nlat)) lat = nlat;
                        if (!Number.isNaN(nlon)) lon = nlon;
                    }
                } catch (e) {
                    // ignore
                }
                if ((lat === null || lon === null) && (data.latitude !== undefined || data.longitude !== undefined)) {
                    const nlat = data.latitude !== undefined && data.latitude !== null ? Number(data.latitude) : NaN;
                    const nlon = data.longitude !== undefined && data.longitude !== null ? Number(data.longitude) : NaN;
                    if (!Number.isNaN(nlat)) lat = nlat;
                    if (!Number.isNaN(nlon)) lon = nlon;
                }

                setFormData(prev => ({
                    ...prev,
                    district: district || prev.district,
                    sector: sector || prev.sector,
                    cell: cell || prev.cell,
                    village: village || prev.village,
                    ...(lat !== null ? { latitude: lat } : {}),
                    ...(lon !== null ? { longitude: lon } : {})
                }));
            } catch (e) {
                // ignore
            }

            // Determine ownership: prefer representative, else first owner
            let ownerId = '';
            let ownerName = '';
            if (data.representative && data.representative.idNo) {
                ownerId = data.representative.idNo;
                ownerName = `${data.representative.foreNames || ''} ${data.representative.surname || ''}`.trim();
            } else if (Array.isArray(data.owners) && data.owners.length > 0) {
                ownerId = data.owners[0].idNo || '';
                ownerName = data.owners[0].fullName || '';
            }
            if (ownerId) {
                setFormData(prev => ({ ...prev, owner_id: ownerId, owner_name: ownerName }));
            }

            // Check blocking conditions
            const blockedReasons: string[] = [];
            if (data.isUnderMortgage || data.isUnderMortgage === true) blockedReasons.push('Under mortgage');
            if (data.isUnderRestriction || data.isUnderRestriction === true) blockedReasons.push('Under restriction');
            if (data.inProcess || data.inProcess === true) blockedReasons.push('Parcel currently in process');

            if (blockedReasons.length > 0) {
                setParcelStatusMessage(`Upload blocked: ${blockedReasons.join(', ')}.`);
                setParcelAllowed(false);
                setIsUpiVerified(false);
                setParcelCategoryWarning(null);
            } else {
                setParcelStatusMessage('Parcel OK for upload.');
                setParcelAllowed(true);
                setIsUpiVerified(true);
                // Check land-use vs selected category (warn if mismatch)
                try {
                    const parcelUseRaw = (data.landUseNameEnglish || data.landUseName || '').toString();
                    const catLabelRaw = (selectedCategory?.label || selectedCategory?.name || '').toString();
                    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
                    const p = normalize(parcelUseRaw);
                    const c = normalize(catLabelRaw);
                    if (p && c && !(p.includes(c) || c.includes(p))) {
                        setParcelCategoryWarning(`Parcel land use (${parcelUseRaw || 'N/A'}) does not match selected category (${catLabelRaw || 'N/A'}). Your property may not be approved.`);
                    } else {
                        setParcelCategoryWarning(null);
                    }
                } catch (e) {
                    setParcelCategoryWarning(null);
                }
            }
        } catch (err: any) {
            console.error('Failed to fetch parcel info', err);
            setUpiError(err?.response?.data?.detail || err.message || 'Failed to verify UPI');
            setIsUpiVerified(false);
            setParcelAllowed(false);
        } finally {
            setIsUpiVerifying(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isUpiVerified || !parcelAllowed) {
            setToast({ type: 'error', message: parcelStatusMessage || 'Please verify UPI and ensure parcel is allowed before submitting.' });
            return;
        }
        // If parcel land-use mismatches selected category, require explicit confirmation
        if (parcelCategoryWarning) {
            const ok = window.confirm(parcelCategoryWarning + '\n\nDo you want to continue anyway?');
            if (!ok) return;
        }
        if (!selectedCategory || !selectedSubCategory) {
            setToast({ type: 'error', message: 'Please select category and sub-category' });
            return;
        }
        setIsSubmitting(true);
        try {
            // Prepare payload: include known top-level fields and bundle others into details
            const payload: any = {
                upi: String(formData.upi || ''),
                owner_id: String(formData.owner_id || ''),
                owner_name: String(formData.owner_name || ''),
                category_id: Number(selectedCategory.id),
                subcategory_id: Number(selectedSubCategory.id),
                estimated_amount: formData.estimated_amount || null,
                latitude: formData.latitude || null,
                longitude: formData.longitude || null,
                // size: prefer explicit form field, fallback to parcelInfo.size or sum of planned land uses
                size: formData.size || parcelInfo?.size || (Array.isArray(parcelInfo?.plannedLandUses) ? parcelInfo.plannedLandUses.reduce((s: number, p: any) => s + (Number(p.area || 0)), 0) : null),
                // video link (YouTube or other) instead of file upload
                video_link: formData.video_link || null,
                // include parcel verification details returned by /api/external/parcel
                parcel_raw: parcelInfo || null,
                planned_land_uses: parcelInfo?.plannedLandUses || parcelInfo?.planned_land_uses || [],
                isUnderMortgage: parcelInfo?.isUnderMortgage || false,
                isUnderRestriction: parcelInfo?.isUnderRestriction || false,
                inProcess: parcelInfo?.inProcess || false,
            };

            // Add all other fields into details
            const baseKeys = new Set(['upi', 'owner_id', 'owner_name', 'category_id', 'subcategory_id', 'estimated_amount', 'latitude', 'longitude', 'images', 'video_link', 'video_3d']);
            const details: any = {};
            Object.keys(formData).forEach(k => {
                if (!baseKeys.has(k)) details[k] = formData[k];
            });
            payload.details = details;

            const res = await api.post('/api/property/properties', payload);
            const created = res.data;
            // If images exist, upload each one
            const imgs = formData.images || [];
            if (created && created.id && imgs.length > 0) {
                for (const img of imgs) {
                    try {
                        const fd = new FormData();
                        fd.append('category', 'gallery');
                        fd.append('file_type', 'image');
                        fd.append('file', img);
                        await api.post(`/api/property/properties/${created.id}/images`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                    } catch (err) {
                        console.warn('Failed to upload image', err);
                    }
                }
            }

            setToast({ type: 'success', message: 'Property Recorded Successfully!' });
            setSelectedCategory(null);
            setSelectedSubCategory(null);
            setFormData({});
        } catch (err: any) {
            console.error('Create property failed', err);
            const detail = err?.response?.data?.detail ?? err?.message ?? err;
            let msg: string;
            if (typeof detail === 'string') {
                msg = detail;
            } else if (detail && typeof detail === 'object') {
                if (Array.isArray((detail as any).non_serializable_fields)) {
                    msg = (detail as any).non_serializable_fields.map((f: any) => `${f.key}(${f.type})`).join(', ');
                    msg = 'Non-serializable fields: ' + msg;
                } else {
                    try {
                        msg = JSON.stringify(detail);
                    } catch (e) {
                        msg = String(detail);
                    }
                }
            } else {
                msg = String(detail);
            }
            setToast({ type: 'error', message: 'Failed to create property: ' + msg });
        } finally {
            setIsSubmitting(false);
        }
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

    // Note: location should be filled from parcel endpoint; manual geolocation removed per request.

    const getMissingRequiredFields = () => {
        if (!selectedSubCategory) return [] as string[];
        const missing: string[] = [];
        selectedSubCategory.fields.forEach((field: any) => {
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
        const video_link = formData.video_link;
        const estimatedAmount = formData.estimated_amount;
        const lat = formData.latitude;
        const lng = formData.longitude;
        const upi = String(formData.upi || '').trim();
        return images.length > 0 && !!video_link && !!estimatedAmount && !!lat && !!lng && !!upi && isUpiVerified;
    };

    // --- RENDER HELPERS ---

    const formLocked = !isUpiVerified;

    // Auto-dismiss toast
    React.useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 6000);
        return () => clearTimeout(t);
    }, [toast]);

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
                        isDisabled={formLocked}
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
                                    disabled={formLocked}
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
                    <div className={clsx("grid grid-cols-2 gap-2 mt-2", formLocked && 'opacity-60 pointer-events-none')}>
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
                                    disabled={formLocked}
                                />
                                {currentVals.includes(opt) && <CheckCircle2 size={12} />}
                                <span>{opt}</span>
                            </label>
                        ))}
                    </div>
                );

            default: {
                // text, number - add special validation for built-up area fields
                const isNumber = field.type === 'number';
                const labelLower = (field.label || '').toString().toLowerCase();
                const nameLower = (field.name || '').toString().toLowerCase();
                const isBuiltUpField = /built[\s-_]?up|builtup|built/.test(nameLower) || labelLower.includes('built');

                // compute plot size from explicit size, parcel info size, or planned land uses
                const computePlotSize = () => {
                    try {
                        const s = formData.size || parcelInfo?.size || parcelInfo?.area || null;
                        if (s && !Number.isNaN(Number(s))) return Number(s);
                        const pls = parcelInfo?.plannedLandUses || parcelInfo?.planned_land_uses || [];
                        if (Array.isArray(pls) && pls.length > 0) {
                            return pls.reduce((acc: number, p: any) => acc + (Number(p.area || p.size || 0) || 0), 0);
                        }
                    } catch (e) {
                        // ignore
                    }
                    return null;
                };

                const plotSize = computePlotSize();

                const handleNumberChange = (e: any) => {
                    const raw = e.target.value;
                    // allow empty
                    if (raw === '' || raw === null) return handleInputChange(field.name, raw);
                    const num = Number(raw);
                    if (Number.isNaN(num)) return handleInputChange(field.name, raw);
                    if (isBuiltUpField && plotSize && num > plotSize) {
                        setToast({ type: 'error', message: `Value cannot exceed plot size (${plotSize} sqm).` });
                        // clamp to plot size
                        setFormData(prev => ({ ...prev, [field.name]: plotSize }));
                        setFieldErrors(prev => ({ ...prev, [field.name]: `Cannot exceed ${plotSize}` }));
                        return;
                    }
                    // clear any previous field error
                    setFieldErrors(prev => {
                        const np = { ...prev };
                        delete np[field.name];
                        return np;
                    });
                    handleInputChange(field.name, raw);
                };

                return (
                    <>
                        <input
                            type={field.type}
                            className={commonClasses}
                            placeholder={field.label}
                            value={formData[field.name] || ''}
                            onChange={isNumber && isBuiltUpField ? handleNumberChange : (e: any) => handleInputChange(field.name, e.target.value)}
                            disabled={formLocked}
                            {...(isNumber && plotSize ? { max: plotSize } : {})}
                        />
                        {fieldErrors[field.name] && (
                            <p className="text-xs text-red-500 mt-1">{fieldErrors[field.name]}</p>
                        )}
                    </>
                );
            }
        }
    };

    return (
        <div className="min-h-screen bg-white rounded-2xl dark:bg-[#050c1a] text-slate-900 dark:text-white p-4 md:p-8 font-sans transition-colors duration-300">

            <div className="max-w-full mx-auto">
                {toast && (
                    <div className={clsx(
                        "mb-4 rounded-xl px-4 py-3 text-sm flex items-start justify-between",
                        toast.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                    )}>
                        <div className="flex-1 mr-4">{toast.message}</div>
                        <button onClick={() => setToast(null)} className="ml-2 text-xs font-semibold px-2 py-1">Dismiss</button>
                    </div>
                )}

                {/* --- HEADER --- */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight mb-2">Record Property</h1>
                        <p className="text-gray-500 dark:text-gray-400">Add new land or building assets to the registry.</p>
                    </div>
                    {selectedCategory && (
                        <button
                            onClick={handleChangeCategory}
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
                        {/* UPI verifier removed from main grid — moved into property form (owner section) */}
                        {dbCategories.map((cat) => {
                            // try to get icon from FORM_CONFIG mapping (formCategories)
                            const mapped = formCategories.find(fc => fc.id === cat.id || fc.label === cat.label || fc.id === cat.name);
                            const Icon = IconMap[mapped?.icon || 'Home'] || IconMap['Home'];
                            return (
                                <button
                                    key={String(cat.id)}
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
                            {dbSubCategories.filter(s => s.category_id === selectedCategory?.id).map(sub => (
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
                                                    {/* Owner details + UPI verifier (moved here) */}
                                                    <div className="col-span-1 md:col-span-2 grid grid-cols-3 gap-2 items-center">
                                                        <div className="col-span-2">
                                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">UPI</label>
                                                            <input type="text" value={formData.upi || ''} onChange={(e) => { setFormData(prev => ({ ...prev, upi: e.target.value })); setIsUpiVerified(false); setUpiError(null); }} placeholder="Enter UPI (e.g. 5/07/08/01/6464)" className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#112240]" />
                                                            {upiError && <p className="text-xs text-red-500 mt-1">{upiError}</p>}
                                                        </div>
                                                        <div className="col-span-1">
                                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">&nbsp;</label>
                                                            <button type="button" onClick={handleVerifyUpi} disabled={isUpiVerifying} className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#112240] text-sm font-bold">
                                                                {isUpiVerifying ? 'Verifying...' : isUpiVerified ? 'Verified' : 'Verify'}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="col-span-1 md:col-span-2">
                                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Owner ID <span className="text-red-500">*</span></label>
                                                        <input type="text" readOnly={true} value={formData.owner_id || ''} onChange={(e) => setFormData(prev => ({ ...prev, owner_id: e.target.value }))} className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#112240]" disabled={formLocked} />
                                                    </div>
                                                    <div className="col-span-1 md:col-span-2">
                                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Owner Name</label>
                                                        <input type="text" readOnly={true} value={formData.owner_name || ''} onChange={(e) => setFormData(prev => ({ ...prev, owner_name: e.target.value }))} className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#112240]" disabled={formLocked} />
                                                    </div>
                                                    {/* Parcel status & quick info (colored) */}
                                                    <div className="col-span-1 md:col-span-2 text-sm mt-2">
                                                        {parcelStatusMessage && (
                                                            <div className={clsx('inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold', parcelAllowed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}>
                                                                <span className="mr-2 w-2 h-2 rounded-full" style={{ background: parcelAllowed ? '#16a34a' : '#dc2626' }} />
                                                                {parcelStatusMessage}
                                                            </div>
                                                        )}
                                                        {parcelCategoryWarning && (
                                                            <div className="mt-2 p-2 rounded-md bg-amber-50 text-amber-800 text-xs">
                                                                {parcelCategoryWarning}
                                                            </div>
                                                        )}
                                                        {parcelInfo && (
                                                            <div className="mt-2 text-xs text-gray-400">
                                                                <div>Land use: {parcelInfo.landUseNameEnglish || parcelInfo.landUseName || 'N/A'}</div>
                                                                <div>Size: {parcelInfo.size || parcelInfo.area || 'N/A'}</div>
                                                                <div>Representative: {parcelInfo.representative ? `${parcelInfo.representative.foreNames || ''} ${parcelInfo.representative.surname || ''}` : (parcelInfo.owners && parcelInfo.owners[0]?.fullName) || 'N/A'}</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {selectedSubCategory.fields.map((field: any) => (
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
                                                        disabled={!isStep1Valid() || formLocked || !!parcelCategoryWarning}
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
                                                            onDragOver={(e) => { if (!formLocked) e.preventDefault(); }}
                                                            onDrop={(e) => { if (!formLocked) { e.preventDefault(); handleImagesUpload('images', e.dataTransfer.files); } }}
                                                            className={clsx("w-full p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#112240] text-slate-900 dark:text-white", formLocked && 'opacity-60 pointer-events-none')}
                                                        >
                                                            <p className="text-sm text-gray-500 mb-2">Drag & drop images here, or click to upload.</p>
                                                            <input type="file" accept="image/*" multiple onChange={(e) => handleImagesUpload('images', e.target.files)} className="mb-2" disabled={formLocked} />
                                                            <div className="flex gap-2 flex-wrap">
                                                                {(formData.images || []).map((img: any, idx: number) => (
                                                                    <div key={idx} className="w-24 h-24 rounded-md overflow-hidden relative border">
                                                                        <img src={img.preview || img} alt={`img-${idx}`} className="w-full h-full object-cover" />
                                                                        <button type="button" onClick={() => removeImage('images', idx)} className="absolute top-1 right-1 bg-white/80 rounded-full p-1 text-xs">x</button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Video link (YouTube or other) */}
                                                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block mt-4">Video Link (YouTube/URL)</label>
                                                        <div className={clsx("w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#112240] text-slate-900 dark:text-white", formLocked && 'opacity-60 pointer-events-none')}>
                                                            <input type="url" placeholder="https://www.youtube.com/watch?v=..." value={formData.video_link || ''} onChange={(e) => setFormData(prev => ({ ...prev, video_link: e.target.value }))} className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a162e]" disabled={formLocked} />
                                                            {formData.video_link && (
                                                                <div className="mt-2 text-xs text-gray-400">Preview: <a href={formData.video_link} target="_blank" rel="noreferrer" className="text-primary underline">Open link</a></div>
                                                            )}
                                                        </div>

                                                        {/* 3D Video / Model (optional) */}
                                                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block mt-4">3D Video / Model (optional)</label>
                                                        <div
                                                            onDragOver={(e) => { if (!formLocked) e.preventDefault(); }}
                                                            onDrop={(e) => { if (!formLocked) { e.preventDefault(); handle3DUpload('video_3d', e.dataTransfer.files?.[0] || null); } }}
                                                            className={clsx("w-full p-4 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#112240] text-slate-900 dark:text-white", formLocked && 'opacity-60 pointer-events-none')}
                                                        >
                                                            <p className="text-sm text-gray-500 mb-2">Drag & drop 3D video/model here, or click to upload.</p>
                                                            <input type="file" accept="video/*,model/*,.gltf,.glb" onChange={(e) => handle3DUpload('video_3d', e.target.files?.[0] || null)} disabled={formLocked} />
                                                            {formData.video_3d && (
                                                                <div className="mt-2 w-full relative">
                                                                    <video src={formData.video_3d.preview || formData.video_3d} controls className="w-full h-40 object-cover rounded-md" />
                                                                    <button type="button" onClick={() => remove3D('video_3d')} className="absolute top-2 right-2 bg-white/80 rounded-full p-1 text-xs">x</button>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* UPI verifier moved to Owner section in Step 1 */}


                                                        {/* Location */}
                                                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block mt-4">Location (Latitude / Longitude)</label>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <input type="number" disabled={true} step="any" value={formData.latitude || ''} onChange={(e) => setFormData(prev => ({ ...prev, latitude: e.target.value }))} placeholder="Latitude" className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#112240]" />
                                                            <input type="number" disabled={true} step="any" value={formData.longitude || ''} onChange={(e) => setFormData(prev => ({ ...prev, longitude: e.target.value }))} placeholder="Longitude" className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#112240]" />
                                                        </div>
                                                        {/* Location should be filled from parcel endpoint; manual location removed */}

                                                        {/* Estimated Amount */}
                                                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block mt-4">Estimated Amount</label>
                                                        <input type="number" step="0.01" value={formData.estimated_amount || ''} onChange={(e) => setFormData(prev => ({ ...prev, estimated_amount: e.target.value }))} placeholder="Estimated value in RWF" className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#112240]" disabled={formLocked} />
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