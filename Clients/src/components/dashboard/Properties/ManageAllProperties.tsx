import  { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutGrid, List as ListIcon, Search, RefreshCw,
    MapPin, Building2, User, Briefcase, Eye,
    Edit2, Trash2, History, X, CheckCircle2, AlertTriangle,
   DollarSign, Calendar,
    Database, Save, ArrowLeft, Upload,Image as ImageIcon,
    Video, Map, Home, Factory, Trees, Landmark, Tractor,
    ChevronRight, Plus, FileText, AlertCircle,
    Layers, Ruler, UserCircle, Hash, Shield,
    Scale, Lock, Unlock, Users, UserPlus,
     MapPinned, MapPinHouse, Building,
    Calculator,  FileDigit, LandPlot, Mountain,
    Trees as Forest, Sprout, Combine,
    Loader,
    Timer,
    CheckCheck,
    CheckCheckIcon
} from 'lucide-react';
import clsx from 'clsx';
import api from '../../../instance/mainAxios';
import { FORM_CONFIG, type FormField} from './propertyFormConfig';
import RecordPropertyPage from './RecordPropertyPage';

// ============================================================================
// COMPLETE TYPES BASED ON YOUR EXACT DATA STRUCTURE
// ============================================================================

// Owner/Party information
interface ParcelParty {
    idNo?: string;
    id?: string | number;
    gender?: "M" | "F" | "U" | string;
    fullName?: string;
    surname?: string;
    foreNames?: string;
    idTypeName?: string;
    countryName?: string;
    maritalStatus?: "U" | "M" | "S" | string;
    sharePercentage?: string;
    phone?: string;
    email?: string;
    address?: ParcelLocationUnit;
}

// Location unit with codes and names
interface ParcelLocationUnit {
    cellCode?: string;
    cellName?: string;
    sectorCode?: string;
    sectorName?: string;
    villageCode?: string;
    villageName?: string;
    districtCode?: string;
    districtName?: string;
    provinceCode?: string;
    provinceName?: string;
}

// Parcel location structure (nested objects)
interface ParcelLocation {
    cell?: ParcelLocationUnit | { cellCode?: string; cellName?: string };
    sector?: ParcelLocationUnit | { sectorCode?: string; sectorName?: string };
    village?: ParcelLocationUnit | { villageCode?: string; villageName?: string };
    district?: ParcelLocationUnit | { districtCode?: string; districtName?: string };
    province?: ParcelLocationUnit | { provinceCode?: string; provinceName?: string };
}

// Representative information
interface Representative {
    idNo?: string;
    id?: string | number;
    gender?: string;
    surname?: string;
    foreNames?: string;
    fullName?: string;
    address?: ParcelLocation | any;
    idTypeName?: string;
    countryName?: string;
    maritalStatus?: string;
}

// Valuation prices
interface Valuation {
    maxPrice?: string | number;
    minPrice?: string | number;
    max_price?: string | number;
    min_price?: string | number;
}

// Planned land use
interface PlannedLandUse {
    upi?: string;
    area?: number;
    landUseName?: string;
    landUseNameEnglish?: string;
    landUseNameKinyarwanda?: string;
}

// Coordinate point
interface Coordinate {
    lat?: string;
    lon?: string;
    latitude?: string;
    longitude?: string;
}

// Main parcel information structure (matches your parcel_information)
interface ParcelInformation {
    landUseName: string | undefined;
    upi?: string;
    size?: number;
    owners?: ParcelParty[];
    inProcess?: boolean;
    in_process?: boolean;
    rightType?: string;
    right_type?: string;
    valuation?: Valuation | any;
    valuationValue?: Valuation | any;
    coordinates?: Coordinate[];
    landUseCode?: number;
    xCoordinate?: string;
    yCoordinate?: string;
    parcelLocation?: ParcelLocation;
    parcel_location?: ParcelLocation;
    representative?: Representative | any;
    isUnderMortgage?: boolean;
    is_under_mortgage?: boolean;
    isUnderRestriction?: boolean;
    is_under_restriction?: boolean;
    plannedLandUses?: PlannedLandUse[];
    planned_land_uses?: PlannedLandUse[];
    landUseNameEnglish?: string;
    landUseNameKinyarwanda?: string;
    remainingLeaseTerm?: number;
    remaining_lease_term?: number;
    coordinateReferenceSystem?: string;
    coordinate_reference_system?: string;
    _allowed_buyer_roles?: string[];
}

// Image object
interface PropertyImage {
    id?: number;
    property_id?: number;
    category?: string;
    file_path: string;
    file_type?: string;
    uploaded_at?: string;
}

// Category object
interface PropertyCategory {
    id: number;
    name?: string;
    label?: string;
    icon?: string;
}

// Subcategory object
interface PropertySubCategory {
    id: number;
    category_id?: number;
    name?: string;
    label?: string;
}

// Uploader user info
interface UploaderUser {
    id?: number;
    first_name?: string;
    last_name?: string;
    email?: string;
    avatar?: string;
    role?: string[];
}

// Uploader info
interface UploaderInfo {
    user?: UploaderUser;
}

// Main Property interface matching your SQL model and API response
interface Property {
    [x: string]: any;
    // Core fields from your SQL
    id: number;
    upi: string;
    owner_id?: string | number;
    owner_name?: string;
    category_id?: number;
    subcategory_id?: number;
    parcel_id?: string;
    size?: number | string;
    location?: string | null;
    district?: string;
    sector?: string;
    cell?: string;
    village?: string;
    land_use?: string;
    status?: 'active' | 'sold' | 'pending' | 'draft' | 'published';
    estimated_amount?: number | null;
    latitude?: number;
    longitude?: number;
    amount_paid?: number | null;
    new_owner_id?: string | null;
    video_link?: string | null;
    details?: Record<string, any> | null;

    // Parcel information (rich nested data)
    parcel_information?: ParcelInformation | null;

    // Duplicate fields from API
    right_type?: string;
    gis_coordinates?: string;
    created_at?: string;
    updated_at?: string;

    // Images array
    images?: PropertyImage[];

    // Category and subcategory objects
    category?: PropertyCategory;
    subcategory?: PropertySubCategory;

    // Uploader information
    uploaded_by?: UploaderInfo;
    uploader_type?: string;
    uploaded_by_name?: string;

    // Additional property features
    has_fence?: string;
    has_water?: string;
    has_parking?: string;
    sewage_type?: string;
    fence_material?: string;
    has_electricity?: string;
    parking_capacity?: string;
    parking_material?: string;

    // Mortgage/restriction flags
    isUnderMortgage?: boolean;
    isUnderRestriction?: boolean;
    inProcess?: boolean;
    is_under_mortgage?: boolean;
    remaining_lease_term?: any;
    is_under_restriction?: boolean;
    in_process?: boolean;

    // Planned land uses
    planned_land_uses?: PlannedLandUse[];

    // Raw parcel data from UPI
    parcel_raw?: ParcelInformation;

    // Owner arrays
    owners?: ParcelParty[];
    representative?: Representative | any;
}


// History item
interface PropertyHistoryItem {
    id: number;
    date: string;
    action: string;
    user: string;
    details: string;
    moved_at?: string;
    changed_at?: string;
    change_type?: string;
    changed_by_user_id?: number | string;
}

// Icon mapping for categories
const IconMap: Record<string, any> = {
    TreePalm: Trees,
    Tractor: Tractor,
    Home: Home,
    Building2: Building2,
    Factory: Factory,
    Landmark: Landmark,
    Mountain: Mountain,
    Forest: Forest,
    Sprout: Sprout,
    Combine: Combine
};

// ============================================================================
// PROPERTY MANAGEMENT COMPONENT
// ============================================================================

export const PropertyManagement = () => {
    // --- UI State ---
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // --- Data State ---
    const [properties, setProperties] = useState<Property[]>([]);
    const [total, setTotal] = useState(0);
    const [limit] = useState(50);
    const [skip, setSkip] = useState(0);

    // --- Modal States ---
    const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [showHistory, setShowHistory] = useState(false);
    const [historyItems, setHistoryItems] = useState<PropertyHistoryItem[]>([]);

    // --- Edit Modal State ---
    const [editProperty, setEditProperty] = useState<Property | null>(null);
    const [editForm, setEditForm] = useState<Partial<Property>>({});
    const [editStep, setEditStep] = useState<1 | 2>(1);
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    // --- Category Selection State ---
    const [categories, setCategories] = useState<PropertyCategory[]>([]);
    const [subCategories, setSubCategories] = useState<PropertySubCategory[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<PropertyCategory | null>(null);
    const [selectedSubCategory, setSelectedSubCategory] = useState<PropertySubCategory | null>(null);
    const [categoryMismatchWarning, setCategoryMismatchWarning] = useState<string | null>(null);
    const [isVerifyingCategory, setIsVerifyingCategory] = useState(false);

    // --- Delete State ---
    const [deletingId, setDeletingId] = useState<number | null>(null);

    // --- Create State ---
    const [isCreating, setIsCreating] = useState(false);

    // --- OTP/Publish State ---
    const [showOTPModal, setShowOTPModal] = useState(false);
    const [pendingPublishId, setPendingPublishId] = useState<number | null>(null);
    const [otpCode, setOtpCode] = useState('');
    const [otpPhase, setOtpPhase] = useState<'enter_contact' | 'enter_code'>('enter_contact');
    const [contactInput, setContactInput] = useState('');
    const [maskedContact, setMaskedContact] = useState<string | null>(null);
    const [otpDelivery, setOtpDelivery] = useState<'sms' | 'email' | null>(null);

    // --- Map Modal State ---
    const [showMapModal, setShowMapModal] = useState(false);
    const [mapUrl] = useState<string | null>(null);

    // --- Contact Popup State ---
    const [contactPopup, setContactPopup] = useState<{ show: boolean, message?: string }>({ show: false });

    // --- Toasts ---
    const [toasts, setToasts] = useState<Array<{ id: number, type: 'success' | 'error' | 'info', message: string }>>([]);
    // Reverify modal state
    const [reverifyModalOpen, setReverifyModalOpen] = useState(false);
    const [reverifyPayload, setReverifyPayload] = useState<{ differences: any[]; remote?: any; local?: any; auto_unpublished?: boolean }>({ differences: [], remote: null, local: null, auto_unpublished: false });

    // Logged user + active role (used to show admin controls)
    const [loggedUser, setLoggedUser] = useState<any | null>(null);
    console.log('Logged user:', loggedUser,reverifyModalOpen,reverifyPayload);
    const [activeRole, setActiveRole] = useState<string | null>(localStorage.getItem('activeRole') || localStorage.getItem('active_role') || null);
    const isAdminView = activeRole === 'admin' || activeRole === 'superadmin';

    // Helper: Add toast notification
    const addToast = (type: 'success' | 'error' | 'info', message: string) => {
        const id = Date.now() + Math.floor(Math.random() * 1000);
        setToasts(t => [...t, { id, type, message }]);
        setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 5000);
    };

    // fetch current user profile to determine active role (admin view)
    useEffect(() => {
        (async () => {
            try {
                const res = await api.get('/api/user/profile');
                setLoggedUser(res.data);
                const roles = res.data?.role || res.data?.roles || [];
                const active = res.data?.active_role ?? res.data?.activeRole ?? (Array.isArray(roles) ? roles[0] : roles);
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

    // ============================================================================
    // DATA MAPPING FUNCTIONS
    // ============================================================================

    /**
     * Maps server response to Property interface
     * Ensures all nested fields are properly accessed with fallbacks
     */
    const mapServerToProperty = (serverData: any): Property => {
        // Safely access nested fields
        const parcelInfo = serverData.parcel_information || serverData.parcel_raw || {};
        const parcelRaw = serverData.parcel_raw || serverData.parcel_information || {};
        const uploadedByName = serverData.uploaded_by_name ||
            (serverData.uploaded_by?.user &&
                `${serverData.uploaded_by.user.first_name || ''} ${serverData.uploaded_by.user.last_name || ''}`.trim()) ||
            '';

        // Extract location from various possible sources
        const parcelLoc = serverData.parcel_location ||
            parcelInfo.parcel_location ||
            parcelInfo.parcelLocation ||
            parcelRaw.parcelLocation ||
            null;

        // Get location components with fallbacks
        const village = parcelLoc?.village?.villageName ||
            parcelLoc?.village ||
            serverData.village ||
            '';
        const cell = parcelLoc?.cell?.cellName ||
            parcelLoc?.cell ||
            serverData.cell ||
            '';
        const sector = parcelLoc?.sector?.sectorName ||
            parcelLoc?.sector ||
            serverData.sector ||
            '';
        const district = parcelLoc?.district?.districtName ||
            parcelLoc?.district ||
            serverData.district ||
            '';

        // Build location string
        const locationStr = [village, cell, sector, district]
            .filter(Boolean)
            .join(', ') || serverData.location || '—';

        // Get owners from various sources
        const owners = parcelInfo.owners ||
            serverData.owners ||
            parcelRaw.owners ||
            [];

        // Get representative
        const representative = parcelInfo.representative ||
            serverData.representative ||
            parcelRaw.representative ||
            null;

        // Get planned land uses
        const plannedLandUses = parcelInfo.planned_land_uses ||
            parcelInfo.plannedLandUses ||
            serverData.planned_land_uses ||
            serverData.plannedLandUses ||
            parcelRaw.plannedLandUses ||
            [];

        // Get land use
        const landUse = serverData.land_use ||
            parcelInfo.landUseNameEnglish ||
            parcelRaw.landUseNameEnglish ||
            parcelInfo.landUseName ||
            parcelRaw.landUseName ||
            '';

        // Get size
        const propertySize = serverData.size ||
            serverData.parcel_size ||
            parcelInfo.size ||
            parcelRaw.size ||
            '';

        // Mortgage/restriction flags
        const isUnderMortgage = serverData.is_under_mortgage ??
            serverData.isUnderMortgage ??
            parcelInfo.is_under_mortgage ??
            parcelInfo.isUnderMortgage ??
            parcelRaw.isUnderMortgage ??
            false;

        const isUnderRestriction = serverData.is_under_restriction ??
            serverData.isUnderRestriction ??
            parcelInfo.is_under_restriction ??
            parcelInfo.isUnderRestriction ??
            parcelRaw.isUnderRestriction ??
            false;

        const inProcess = serverData.in_process ??
            serverData.inProcess ??
            parcelInfo.in_process ??
            parcelInfo.inProcess ??
            parcelRaw.inProcess ??
            false;

        // Get category and subcategory
        const category = serverData.category || null;
        const subcategory = serverData.subcategory || null;

        // Get images
        const images = serverData.images || [];

        // Get video link
        const videoLink = serverData.video_link || serverData.videoLink || null;

        // Get GIS coordinates
        const gisCoordinates = serverData.gis_coordinates || '';

        // Get remaining lease term
        // const remainingLeaseTerm = serverData.remainingLeaseTerm ??
        //     parcelInfo.remaining_lease_term ??
        //     parcelInfo.remainingLeaseTerm ??
        //     null;

        // Get right type
        const rightType = serverData.right_type ||
            parcelInfo.right_type ||
            parcelInfo.rightType ||
            '';

        // Get coordinates
        const latitude = serverData.latitude ??
            (parcelInfo.coordinates?.[0]?.lat ? parseFloat(parcelInfo.coordinates[0].lat) : null) ??
            (parcelRaw.coordinates?.[0]?.lat ? parseFloat(parcelRaw.coordinates[0].lat) : null);

        const longitude = serverData.longitude ??
            (parcelInfo.coordinates?.[0]?.lon ? parseFloat(parcelInfo.coordinates[0].lon) : null) ??
            (parcelRaw.coordinates?.[0]?.lon ? parseFloat(parcelRaw.coordinates[0].lon) : null);

        // Return fully mapped property
        return {
            // Core fields
            id: serverData.id,
            upi: serverData.upi || '',
            owner_id: serverData.owner_id || owners[0]?.idNo || owners[0]?.id || '',
            owner_name: serverData.owner_name || owners[0]?.fullName || owners[0]?.full_name || '',
            category_id: serverData.category_id || category?.id,
            subcategory_id: serverData.subcategory_id || subcategory?.id,
            parcel_id: serverData.parcel_id,
            size: propertySize,
            location: locationStr,
            district,
            sector,
            cell,
            village,
            land_use: landUse,
            status: serverData.status || 'draft',
            estimated_amount: serverData.estimated_amount,
            latitude,
            longitude,
            amount_paid: serverData.amount_paid,
            new_owner_id: serverData.new_owner_id,
            video_link: videoLink,
            details: serverData.details || {},

            // Parcel information
            parcel_information: parcelInfo,

            // Additional fields
            right_type: rightType,
            gis_coordinates: gisCoordinates,
            created_at: serverData.created_at,
            updated_at: serverData.updated_at,

            // Images
            images,

            // Category objects
            category,
            subcategory,

            // Uploader info
            uploaded_by: serverData.uploaded_by,
            uploader_type: serverData.uploader_type,
            uploaded_by_name: uploadedByName,

            // Property features
            has_fence: serverData.has_fence,
            has_water: serverData.has_water,
            has_parking: serverData.has_parking,
            sewage_type: serverData.sewage_type,
            fence_material: serverData.fence_material,
            has_electricity: serverData.has_electricity,
            parking_capacity: serverData.parking_capacity,
            parking_material: serverData.parking_material,

            // Flags
            isUnderMortgage,
            isUnderRestriction,
            inProcess,
            is_under_mortgage: isUnderMortgage,
            is_under_restriction: isUnderRestriction,
            in_process: inProcess,

            // Planned land uses
            planned_land_uses: plannedLandUses,

            // Raw data
            parcel_raw: parcelRaw,

            // Owners and representative
            owners,
            representative
        };
    };

    // ============================================================================
    // DATA LOADING FUNCTIONS
    // ============================================================================

    /**
     * Load properties from API
     */
    const loadProperties = async (lim = limit, sk = skip) => {
        setIsLoading(true);
        try {
            const res = await api.get('/api/property/properties/mine', {
                params: { limit: lim, skip: sk }
            });

            const items = res.data.items || [];
            const mapped = items.map((it: any) => mapServerToProperty(it));

            setProperties(mapped);
            setTotal(res.data.total || 0);
            addToast('success', `Loaded ${mapped.length} properties`);
        } catch (e: any) {
            console.error('Load properties failed', e);
            addToast('error', 'Failed to load properties: ' + (e?.response?.data?.detail || e.message));
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Load categories and subcategories for edit form
     */
    const loadCategories = async () => {
        try {
            const [catsRes, subsRes] = await Promise.all([
                api.get('/api/property/categories'),
                api.get('/api/property/subcategories')
            ]);
            setCategories(catsRes.data.items || []);
            setSubCategories(subsRes.data.items || []);
        } catch (e) {
            console.error('Failed to load categories', e);
            addToast('error', 'Failed to load categories');
        }
    };

    /**
     * Load property history
     */
    const loadHistory = async (property: Property) => {
        if (!property?.upi) return;

        try {
            const res = await api.get(`/api/property/properties/${property.upi}/history`);
            const body = res.data;
            const items = (body.history || []).map((h: any, idx: number) => ({
                id: idx + 1,
                date: h.moved_at || h.changed_at || '',
                action: h.change_type || 'change',
                user: String(h.changed_by_user_id || ''),
                details: JSON.stringify(h)
            }));
            setHistoryItems(items);
        } catch (e: any) {
            console.error('Fetch history failed', e);
            addToast('error', 'Failed to load history');
        }
    };

    // Initial load
    useEffect(() => {
        loadProperties();
        loadCategories();
    }, []);

    // Load history when modal opens
    useEffect(() => {
        if (showHistory && selectedProperty) {
            loadHistory(selectedProperty);
        }
    }, [showHistory, selectedProperty]);

    // ============================================================================
    // HANDLER FUNCTIONS
    // ============================================================================

    /**
     * Refresh properties
     */
    const handleRefresh = async () => {
        await loadProperties(limit, skip);
    };

    /**
     * Handle pagination
     */
    const handlePrevPage = async () => {
        const newSkip = Math.max(0, skip - limit);
        setSkip(newSkip);
        await loadProperties(limit, newSkip);
    };

    const handleNextPage = async () => {
        const newSkip = Math.min(skip + limit, Math.max(0, total - limit));
        setSkip(newSkip);
        await loadProperties(limit, newSkip);
    };

    /**
     * Get formatted location text
     */
    const getLocationText = (property: Property): string => {
        const parts = [
            property.village,
            property.cell,
            property.sector,
            property.district
        ].filter(Boolean);

        return parts.length > 0 ? parts.join(', ') : property.location || '—';
    };

    /**
     * Handle property deletion
     */
    const handleDelete = (id: number) => {
        setDeletingId(id);
    };

    const confirmDelete = async () => {
        if (!deletingId) return;

        try {
            await api.delete(`/api/property/properties/${deletingId}`);
            addToast('success', 'Property deleted successfully');
            setDeletingId(null);
            await loadProperties(limit, skip);
        } catch (e: any) {
            console.error('Delete failed', e);
            addToast('error', 'Failed to delete property: ' + (e?.response?.data?.detail || e.message));
        }
    };

    /**
     * Handle publish property
     */
    const handlePublish = async (property: Property) => {
        if (property.status === 'published') {
            setContactPopup({
                show: true,
                message: 'Property already published. To request changes contact our agents.'
            });
            return;
        }

        try {
            const res = await api.put(`/api/property/properties/${property.id}/status`, {
                status: 'published'
            });

            const json = res.data;

            if (json && json.otp_required) {
                setPendingPublishId(property.id);
                setOtpPhase('enter_contact');
                setMaskedContact(json.masked_contact || null);
                setOtpDelivery(json.otp_delivery || null);
                setContactInput('');
                setShowOTPModal(true);
                addToast('info', 'Verification required — enter contact to receive OTP');
            } else {
                await loadProperties(limit, skip);
                addToast('success', 'Property published successfully');
            }
        } catch (e: any) {
            console.error('Publish request failed', e);
            const errMsg = e?.response?.data?.detail || e?.message || 'Publish request failed';
            addToast('error', String(errMsg));
        }
    };

    /**
     * Request OTP for publishing
     */
    const requestSendOtp = async () => {
        if (!pendingPublishId) return;

        try {
            const payload: any = { contact: contactInput };
            if (otpDelivery) payload.method = otpDelivery;

            await api.post(`/api/property/properties/${pendingPublishId}/send_publish_otp`, payload);
            setOtpPhase('enter_code');
            addToast('success', 'OTP sent — enter the code to publish');
        } catch (e: any) {
            console.error('Request OTP failed', e);
            const errMsg = e?.response?.data?.detail || e?.message || 'Failed to request OTP';
            addToast('error', String(errMsg));
        }
    };

    /**
     * Submit OTP for publishing
     */
    const submitOtp = async () => {
        if (!pendingPublishId) return;

        try {
            await api.put(`/api/property/properties/${pendingPublishId}/status`, {
                status: 'published',
                otp_code: otpCode
            });

            setShowOTPModal(false);
            setOtpCode('');
            setPendingPublishId(null);
            await loadProperties(limit, skip);
            addToast('success', 'Property published successfully');
        } catch (e: any) {
            console.error('OTP submit failed', e);
            const errMsg = e?.response?.data?.detail || e?.message || 'OTP submit failed';
            addToast('error', String(errMsg));
        }
    };

    /**
     * Admin: Unpublish a published property (set status -> draft)
     */
    const unpublishProperty = async (propertyId: number) => {
        try {
            await api.put(`/api/property/properties/${propertyId}/status`, { status: 'draft' });
            addToast('success', 'Property unpublished');
            await loadProperties(limit, skip);
            if (selectedProperty && selectedProperty.id === propertyId) {
                const refreshed = (await api.get(`/api/property/properties/${propertyId}`)).data;
                setSelectedProperty(refreshed);
            }
        } catch (e: any) {
            console.error('Unpublish failed', e);
            const errMsg = e?.response?.data?.detail || e?.message || 'Unpublish failed';
            addToast('error', String(errMsg));
        }
    };

    /**
     * Admin: Re-verify UPI/parcel info against external LAIS and show differences
     */
    const reverifyProperty = async (propertyId: number) => {
        try {
            const res = await api.post(`/api/property/properties/${propertyId}/reverify`);
            const data = res.data;
            const diffs = data.differences || [];
            // open a structured modal with diffs instead of alert()
            setReverifyPayload({ differences: diffs, remote: data.remote, local: data.local, auto_unpublished: !!data.auto_unpublished });
            setReverifyModalOpen(true);
            if (data.auto_unpublished) {
                addToast('error', 'Property auto-unpublished due to LAIS changes');
                await loadProperties(limit, skip);
            } else if (data.ok) {
                addToast('success', 'Reverify OK — no differences');
            }
        } catch (e: any) {
            console.error('Reverify failed', e);
            const errMsg = e?.response?.data?.detail || e?.message || 'Reverify failed';
            addToast('error', String(errMsg));
        }
    };

    /**
     * Verify category against parcel land use
     */
    const verifyCategoryMatch = async (categoryId: number, subcategoryId: number) => {
        if (!editProperty?.parcel_raw) return true;

        setIsVerifyingCategory(true);
        try {
            const parcelUse = (editProperty.parcel_raw.landUseNameEnglish ||
                editProperty.parcel_raw.landUseName ||
                '').toLowerCase();

            // Find category and subcategory labels
            const cat = categories.find(c => c.id === categoryId);
            const subCat = subCategories.find(s => s.id === subcategoryId);

            if (!cat || !subCat) return true;

            const categoryLabel = cat.label?.toLowerCase() || cat.name?.toLowerCase() || '';
            const subCategoryLabel = subCat.label?.toLowerCase() || subCat.name?.toLowerCase() || '';
            console.log(subCategoryLabel)
            // Check if parcel use matches category
            const matches =
                parcelUse.includes(categoryLabel) ||
                categoryLabel.includes(parcelUse) ||
                (parcelUse.includes('residential') && categoryLabel.includes('residential')) ||
                (parcelUse.includes('commercial') && categoryLabel.includes('commercial')) ||
                (parcelUse.includes('agricultur') && categoryLabel.includes('agricultur')) ||
                (parcelUse.includes('forest') && categoryLabel.includes('forest')) ||
                (parcelUse.includes('industrial') && categoryLabel.includes('industrial')) ||
                (parcelUse.includes('public') && categoryLabel.includes('public'));

            if (!matches) {
                setCategoryMismatchWarning(
                    `Parcel land use (${editProperty.parcel_raw.landUseNameEnglish || editProperty.parcel_raw.landUseName}) does not match selected category (${cat.label || cat.name}). Your property may not be approved.`
                );
            } else {
                setCategoryMismatchWarning(null);
            }

            return matches;
        } catch (e) {
            console.error('Category verification failed', e);
            return true;
        } finally {
            setIsVerifyingCategory(false);
        }
    };

    /**
     * Open edit modal
     */
    const openEdit = (property: Property) => {
        setEditProperty(property);
        setEditStep(1);
        setCategoryMismatchWarning(null);

        // Find category and subcategory
        const cat = categories.find(c =>
            c.id === property.category_id ||
            c.name === property.category ||
            c.label === property.category
        );

        if (cat) {
            setSelectedCategory(cat);

            const sub = subCategories.find(s =>
                s.id === property.subcategory_id &&
                s.category_id === cat.id
            );

            if (sub) setSelectedSubCategory(sub);
        }

        // Prefill edit form
        setEditForm({
            upi: property.upi,
            owner_name: property.owner_name,
            owner_id: property.owner_id,
            category_id: property.category_id,
            subcategory_id: property.subcategory_id,
            estimated_amount: property.estimated_amount,
            size: property.size,
            land_use: property.land_use,
            video_link: property.video_link,
            gis_coordinates: property.gis_coordinates,
            latitude: property.latitude,
            longitude: property.longitude,
            district: property.district,
            sector: property.sector,
            cell: property.cell,
            village: property.village,
            remaining_lease_term: property.remaining_lease_term,
            right_type: property.right_type,
            details: { ...(property.details || {}) },
            // Include UPI-fetched fields as read-only references
            is_under_mortgage: property.is_under_mortgage,
            is_under_restriction: property.is_under_restriction,
            in_process: property.in_process,
            parcel_raw: property.parcel_raw,
            owners: property.owners,
            representative: property.representative,
            planned_land_uses: property.planned_land_uses
        });
    };

    /**
     * Handle input change in edit form
     */
    const handleInputChange = (field: keyof Property, value: any) => {
        setEditForm(prev => ({ ...prev, [field]: value }));
    };

    /**
     * Handle details change in edit form
     */
    const handleDetailsChange = (key: string, value: any) => {
        setEditForm(prev => ({
            ...prev,
            details: { ...(prev.details || {}), [key]: value }
        }));
    };

    /**
     * Handle category change
     */
    const handleCategoryChange = async (cat: PropertyCategory) => {
        setSelectedCategory(cat);
        setSelectedSubCategory(null);
        handleInputChange('category_id', cat.id);
        handleInputChange('subcategory_id', null);

        // Clear form fields from previous subcategory
        const updatedDetails: Record<string, any> = {};
        if (editForm.estimated_amount) updatedDetails.estimated_amount = editForm.estimated_amount;
        if (editForm.size) updatedDetails.size = editForm.size;

        handleInputChange('details', updatedDetails);

        // Verify if category matches parcel land use
        if (editProperty?.parcel_raw && cat) {
            await verifyCategoryMatch(cat.id, 0);
        }
    };

    /**
     * Handle subcategory change
     */
    const handleSubCategoryChange = async (sub: PropertySubCategory) => {
        setSelectedSubCategory(sub);
        handleInputChange('subcategory_id', sub.id);

        // Load form fields from config for this subcategory
        const configCategory = FORM_CONFIG.find(c =>
            c.label.toLowerCase() === selectedCategory?.label?.toLowerCase() ||
            String(c.id) === String(selectedCategory?.id)
        );

        if (configCategory) {
            const configSub = configCategory.subCategories.find(s =>
                s.label.toLowerCase() === sub.label?.toLowerCase() ||
                String(s.id) === String(sub.id)
            );

            if (configSub) {
                // Preserve existing values for fields that match
                const existingDetails = editForm.details || {};
                const newDetails: Record<string, any> = {};

                // Initialize with existing values or defaults
                configSub.fields.forEach(field => {
                    if (field.name in existingDetails) {
                        newDetails[field.name] = existingDetails[field.name];
                    } else {
                        // Set default based on field type
                        if (field.type === 'multiselect') newDetails[field.name] = [];
                        else if (field.type === 'checkbox') newDetails[field.name] = false;
                        else if (field.type === 'radio' && field.options?.length) newDetails[field.name] = field.options[0];
                        else newDetails[field.name] = '';
                    }
                });

                handleInputChange('details', newDetails);
            }
        }

        // Verify category match with subcategory
        if (editProperty?.parcel_raw && selectedCategory) {
            await verifyCategoryMatch(selectedCategory.id, sub.id);
        }
    };

    /**
     * Handle image upload
     */
    const handleImagesUpload = async (files: FileList | null) => {
        if (!files || !editProperty) return;

        const formData = new FormData();
        Array.from(files).forEach(file => {
            formData.append('files', file);
        });

        try {
            setIsUploadingImage(true);
            await api.post(`/api/property/properties/${editProperty.id}/images/bulk`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Refresh property data
            const refreshed = (await api.get(`/api/property/properties/${editProperty.id}`)).data;
            const mapped = mapServerToProperty(refreshed);
            setEditProperty(mapped);
            setEditForm(prev => ({ ...prev, images: mapped.images }));
            addToast('success', 'Images uploaded successfully');
        } catch (err: any) {
            console.error('Upload failed', err);
            addToast('error', 'Image upload failed: ' + (err?.response?.data?.detail || err.message));
        } finally {
            setIsUploadingImage(false);
        }
    };

    /**
     * Handle image delete
     */
    const handleImageDelete = async (imageId: number) => {
        if (!editProperty) return;

        try {
            await api.delete(`/api/property/properties/${editProperty.id}/images/${imageId}`);

            // Refresh property data
            const refreshed = (await api.get(`/api/property/properties/${editProperty.id}`)).data;
            const mapped = mapServerToProperty(refreshed);
            setEditProperty(mapped);
            setEditForm(prev => ({ ...prev, images: mapped.images }));
            addToast('success', 'Image deleted successfully');
        } catch (err: any) {
            console.error('Delete failed', err);
            addToast('error', 'Failed to delete image: ' + (err?.response?.data?.detail || err.message));
        }
    };

    /**
     * Save edit changes
     */
    const saveEdit = async () => {
        if (!editProperty) return;

        // Validate required fields
        if (!selectedCategory || !selectedSubCategory) {
            addToast('error', 'Please select category and property type');
            return;
        }

        // Check category mismatch warning
        if (categoryMismatchWarning) {
            const proceed = window.confirm(categoryMismatchWarning + '\n\nDo you want to continue anyway?');
            if (!proceed) return;
        }

        try {
            // Only allow updating estimated amount, video link, and arbitrary details
            const payload: any = {
                estimated_amount: editForm.estimated_amount ?? editProperty.estimated_amount,
                video_link: editForm.video_link || editProperty.video_link,
                details: { ...(editForm.details || {}) }
            };

            await api.put(`/api/property/properties/${editProperty.id}`, payload);

            addToast('success', 'Property updated successfully');
            setEditProperty(null);
            await loadProperties(limit, skip);
        } catch (e: any) {
            console.error('Save edit failed', e);
            addToast('error', 'Failed to save changes: ' + (e?.response?.data?.detail || e.message));
        }
    };

    // ============================================================================
    // RENDER FORM FIELD
    // ============================================================================

    const renderFormField = (field: FormField) => {
        // Check conditional logic
        if (field.conditional) {
            const dependentValue = editForm.details?.[field.conditional.field];
            if (dependentValue !== field.conditional.value) return null;
        }

        const commonClasses = "w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#112240] text-slate-900 dark:text-white focus:border-primary outline-none transition-all";
        const value = editForm.details?.[field.name] || '';

        switch (field.type) {
            case 'section_header':
                return (
                    <div className="col-span-full mt-4 mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-primary">{field.label}</h4>
                    </div>
                );

            case 'select':
                return (
                    <select
                        value={value}
                        onChange={(e) => handleDetailsChange(field.name, e.target.value)}
                        className={commonClasses}
                    >
                        <option value="">Select...</option>
                        {field.options?.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                );

            case 'radio':
                return (
                    <div className="flex flex-wrap gap-4 pt-2">
                        {field.options?.map(opt => (
                            <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name={`details.${field.name}`}
                                    value={opt}
                                    checked={value === opt}
                                    onChange={() => handleDetailsChange(field.name, opt)}
                                    className="w-4 h-4 text-primary focus:ring-primary"
                                />
                                <span className="text-sm font-medium">{opt}</span>
                            </label>
                        ))}
                    </div>
                );

            case 'multiselect':
                const currentVals = (value as string[]) || [];
                return (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        {field.options?.map(opt => (
                            <label
                                key={opt}
                                className={clsx(
                                    "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all text-xs",
                                    currentVals.includes(opt)
                                        ? "bg-primary/10 border-primary text-primary font-bold"
                                        : "bg-gray-50 dark:bg-[#112240] border-gray-200 dark:border-gray-700 text-gray-500"
                                )}
                            >
                                <input
                                    type="checkbox"
                                    checked={currentVals.includes(opt)}
                                    onChange={(e) => {
                                        const newVals = e.target.checked
                                            ? [...currentVals, opt]
                                            : currentVals.filter(v => v !== opt);
                                        handleDetailsChange(field.name, newVals);
                                    }}
                                    className="hidden"
                                />
                                {currentVals.includes(opt) && <CheckCircle2 size={12} />}
                                <span>{opt}</span>
                            </label>
                        ))}
                    </div>
                );

            case 'checkbox':
                return (
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={!!value}
                            onChange={(e) => handleDetailsChange(field.name, e.target.checked)}
                            className="w-4 h-4 text-primary rounded focus:ring-primary"
                        />
                        <span className="text-sm">{field.label}</span>
                    </label>
                );

            default: // text, number
                return (
                    <input
                        type={field.type}
                        className={commonClasses}
                        placeholder={field.label}
                        value={value}
                        onChange={(e) => handleDetailsChange(field.name, field.type === 'number' ? parseFloat(e.target.value) : e.target.value)}
                    />
                );
        }
    };

    // ============================================================================
    // HELPER COMPONENTS
    // ============================================================================

    /**
     * Uploader Badge Component
     */
    const UploaderBadge = ({ type, name }: { type: string, name: string }) => {
        const config = {
            agency: { icon: Building2, color: "text-[#395d91]", bg: "bg-[#395d91]/10", border: "border-[#395d91]/20" },
            broker: { icon: Briefcase, color: "text-purple-600", bg: "bg-purple-500/10", border: "border-purple-500/20" },
            admin: { icon: User, color: "text-gray-600", bg: "bg-gray-500/10", border: "border-gray-500/20" },
            seller: { icon: User, color: "text-gray-600", bg: "bg-gray-500/10", border: "border-gray-500/20" }
        }[type] || { icon: User, color: "text-gray-500", bg: "bg-gray-100", border: "border-gray-200" };

        const Icon = config.icon;

        return (
            <div className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border ${config.bg} ${config.border}`}>
                <Icon size={12} className={config.color} />
                <div className="flex flex-col leading-none">
                    <span className={`text-[9px] font-bold uppercase ${config.color} opacity-70`}>{type}</span>
                    <span className={`text-xs font-bold ${config.color}`}>{name}</span>
                </div>
            </div>
        );
    };

    /**
     * Detail Item Component
     */
    const DetailItem = ({ label, value, icon: Icon }: { label: string, value: string | number | null | undefined, icon?: any }) => (
        <div className="p-3 bg-white dark:bg-[#112240] border border-gray-100 dark:border-gray-800 rounded-xl">
            <div className="flex items-center gap-1 mb-1">
                {Icon && <Icon size={12} className="text-gray-400" />}
                <p className="text-[10px] uppercase font-bold text-gray-400">{label}</p>
            </div>
            <p className="font-medium text-slate-900 dark:text-white truncate">{value ?? '—'}</p>
        </div>
    );

    /**
     * Owner Card Component
     */
    const OwnerCard = ({ owner }: { owner: ParcelParty }) => (
        <div className="text-sm border-b border-gray-100 dark:border-gray-800 pb-2 last:border-0">
            <div className="font-bold">{owner.fullName || '—'}</div>
            <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                <div className="flex items-center gap-1">
                    <Hash size={10} />
                    ID: {owner.idNo || owner.id || '—'}
                </div>
                {owner.sharePercentage && (
                    <div className="flex items-center gap-1">
                        <Scale size={10} />
                        Share: {owner.sharePercentage}
                    </div>
                )}
                {owner.gender && (
                    <div className="flex items-center gap-1">
                        <UserCircle size={10} />
                        Gender: {owner.gender === 'M' ? 'Male' : owner.gender === 'F' ? 'Female' : owner.gender}
                    </div>
                )}
                {owner.maritalStatus && (
                    <div className=" items-center gap-1 hidden">
                        <Users size={10} />
                        Status: {owner.maritalStatus === 'U' ? 'Unknown' : owner.maritalStatus}
                    </div>
                )}
            </div>
        </div>
    );

    // ============================================================================
    // MAIN RENDER
    // ============================================================================

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#050c1a] text-slate-900 dark:text-white p-6 lg:p-10 font-sans transition-colors duration-300">
            <div className="max-w-full mx-auto space-y-8">

                {/* --- HEADER --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            <Building2 size={28} className="text-primary" />
                            Property Manager
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
                            Manage listings, verify parcel data, and track asset history.
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleRefresh}
                            className="p-3 bg-white dark:bg-[#0a162e] border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 text-gray-500 transition-colors"
                            disabled={isLoading}
                        >
                            <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
                        </button>

                        <div className="flex p-1 bg-white dark:bg-[#0a162e] border border-gray-200 dark:border-gray-700 rounded-xl">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={clsx(
                                    "p-2 rounded-lg transition-all",
                                    viewMode === 'grid' ? "bg-primary text-white" : "text-gray-400 hover:text-gray-600"
                                )}
                            >
                                <LayoutGrid size={20} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={clsx(
                                    "p-2 rounded-lg transition-all",
                                    viewMode === 'list' ? "bg-primary text-white" : "text-gray-400 hover:text-gray-600"
                                )}
                            >
                                <ListIcon size={20} />
                            </button>
                        </div>

                        <button
                            onClick={() => setIsCreating(true)}
                            className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors flex items-center gap-2"
                        >
                            <Plus size={16} />
                            New Property
                        </button>
                    </div>
                </div>

                {/* --- SEARCH BAR --- */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by UPI, Owner, or Location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-[#0a162e] border-2 border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium focus:border-primary outline-none transition-colors"
                    />
                </div>

                {/* --- PAGINATION INFO (TOP) --- */}
                <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                        Showing {Math.min(skip + 1, total || 0)} - {Math.min(skip + limit, total || 0)} of {total} properties
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrevPage}
                            disabled={skip === 0}
                            className="px-3 py-1 rounded border bg-white dark:bg-[#0a162e] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Prev
                        </button>
                        <button
                            onClick={handleNextPage}
                            disabled={skip + limit >= total}
                            className="px-3 py-1 rounded border bg-white dark:bg-[#0a162e] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>

                {/* --- CONTENT AREA --- */}
                <AnimatePresence mode="wait">
                    {viewMode === 'grid' ? (
                        <motion.div
                            key="grid"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                        >
                            {properties.length > 0 ? properties.map((property) => (
                                <motion.div
                                    key={property.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="group bg-white dark:bg-[#0a162e] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden hover:border-primary/50 transition-all"
                                >
                                    {/* Image Area */}
                                    <div className="h-48 relative overflow-hidden">
                                        {property.images && property.images.length > 0 ? (
                                            <img
                                                src={`${api.defaults?.baseURL?.replace(/\/$/, '') || ''}/assets/${property.images[0].file_path}`}
                                                alt={property.upi}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=No+Image';
                                                }}
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
                                                <ImageIcon size={40} className="text-gray-400" />
                                            </div>
                                        )}

                                        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-xs font-mono px-2 py-1 rounded">
                                            UPI: {property.upi}
                                        </div>

                                        <div className={clsx(
                                            "absolute top-3 right-3 px-2 py-1 rounded text-xs font-bold uppercase",
                                            property.status === 'active' || property.status === 'published'
                                                ? 'bg-green-500 text-white'
                                                : property.status === 'draft'
                                                    ? 'bg-amber-500 text-white'
                                                    : 'bg-gray-500 text-white'
                                        )}>
                                            {property.status}
                                        </div>
                                    </div>

                                    {/* Content Area */}
                                    <div className="p-5">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">
                                                    {property.estimated_amount
                                                        ? Number(property.estimated_amount).toLocaleString() + ' RWF'
                                                        : '—'}
                                                </h3>
                                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                                    <MapPin size={12} />
                                                    {getLocationText(property)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Uploader Info */}
                                        {property.uploader_type && property.uploaded_by_name && (
                                            <div className="mb-4">
                                                <UploaderBadge
                                                    type={property.uploader_type}
                                                    name={property.uploaded_by_name}
                                                />
                                            </div>
                                        )}

                                        {/* Info Grid */}
                                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-4 bg-gray-50 dark:bg-[#0f1f3a] p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                                            <div>
                                                <span className="block text-[10px] uppercase font-bold text-gray-400">Parcel Size</span>
                                                <span className="font-mono text-slate-700 dark:text-gray-300">
                                                    {property.size || property.size || '—'} m²
                                                </span>
                                            </div>
                                            <div>
                                                <span className="block text-[10px] uppercase font-bold text-gray-400">Land Use</span>
                                                <span className="font-mono text-slate-700 dark:text-gray-300">
                                                    {property.land_use ? property.land_use.split(' ')[0] : '—'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Flags */}
                                        {property.parcel_information && (
                                            <div className="mb-3 flex gap-2">
                                                {property.parcel_information?.is_under_mortgage && (
                                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold flex items-center gap-1">
                                                        <Shield size={10} /> Mortgage
                                                    </span>
                                                )}
                                                {property.parcel_information?.is_under_restriction && (
                                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold flex items-center gap-1">
                                                        <Lock size={10} /> Restriction
                                                    </span>
                                                )}
                                                {property.parcel_information?.in_process && (
                                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold flex items-center gap-1">
                                                        <Loader size={10} className="animate-spin" /> In Process
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                                            <button
                                                onClick={() => setSelectedProperty(property)}
                                                className="flex-1 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                                            >
                                                <Eye size={14} /> View
                                            </button>
                                            {!isAdminView && (
                                                <button
                                                    onClick={() => {
                                                        if (property.status === 'published') {
                                                            setContactPopup({
                                                                show: true,
                                                                message: 'Property is published — contact our agents to request changes.'
                                                            });
                                                            return;
                                                        }
                                                        openEdit(property);
                                                    }}
                                                    className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 text-gray-500 transition-colors"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                            )}
                                            {(!isAdminView) ? (
                                                <button
                                                    onClick={() => {
                                                        if (property.status === 'published') {
                                                            setContactPopup({ show: true, message: 'Published properties cannot be deleted. Unpublish first (admin only).' });
                                                            return;
                                                        }
                                                        handleDelete(property.id);
                                                    }}
                                                    title={property.status === 'published' ? 'Cannot delete published property' : 'Delete'}
                                                    className={clsx(
                                                        'p-2 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors',
                                                        property.status === 'published' ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-red-50 dark:hover:bg-red-900/10 text-gray-500 hover:text-red-500'
                                                    )}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            ) : (
                                                // Admin view: show Unpublish for published properties
                                                property.status === 'published' && (
                                                    <button
                                                        onClick={() => unpublishProperty(property.id)}
                                                        title="Unpublish"
                                                        className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors text-yellow-600 hover:bg-yellow-50 dark:hover:bg-white/5"
                                                    >
                                                        <Unlock size={16} />
                                                    </button>
                                                )
                                            )}
                                            {!isAdminView && (
                                                <button
                                                    onClick={() => handlePublish(property)}
                                                    className={clsx(
                                                        "p-2 rounded-lg text-xs font-bold transition-colors",
                                                        property.status === 'published'
                                                            ? "border border-green-200 bg-green-50 text-green-700"
                                                            : "border border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                                                    )}
                                                >
                                                    {property.status === 'published' ? 'Published' : 'Publish'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )) : (
                                <div className="col-span-full p-12 text-center text-gray-500 bg-white dark:bg-[#0a162e] rounded-2xl border border-gray-200 dark:border-gray-800">
                                    <Building2 size={48} className="mx-auto mb-4 text-gray-300" />
                                    <p className="text-lg mb-2">No properties found</p>
                                    <p className="text-sm text-gray-400 mb-6">Get started by creating your first property listing</p>
                                    <button
                                        onClick={() => setIsCreating(true)}
                                        className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
                                    >
                                        Create Property
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="list"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="bg-white dark:bg-[#0a162e] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden"
                        >
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 dark:bg-[#0f1f3a] text-xs uppercase text-gray-500 font-bold border-b border-gray-200 dark:border-gray-800">
                                    <tr>
                                        <th className="px-6 py-4">Property</th>
                                        <th className="px-6 py-4">Location</th>
                                        <th className="px-6 py-4">Expected</th>
                                        <th className="px-6 py-4">Source</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {properties.length > 0 ? properties.map((property) => (
                                        <tr key={property.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                                                        {property.images && property.images.length > 0 ? (
                                                            <img
                                                                src={`${api.defaults?.baseURL?.replace(/\/$/, '') || ''}/assets/${property.images[0].file_path}`}
                                                                className="w-full h-full object-cover"
                                                                alt=""
                                                                onError={(e) => {
                                                                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40?text=No+Image';
                                                                }}
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <ImageIcon size={16} className="text-gray-400" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-sm text-slate-900 dark:text-white font-mono">{property.upi}</div>
                                                        <div className="text-xs text-gray-500">{property.category?.label || property.category?.name || '—'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                                {getLocationText(property)}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white">
                                                <div>{property.estimated_amount ? Number(property.estimated_amount).toLocaleString() + ' RWF' : '—'}</div>
                                                <div className="text-xs text-gray-400">
                                                    {property.updated_at ? new Date(property.updated_at).toLocaleDateString() : ''}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {property.uploader_type && property.uploaded_by_name && (
                                                    <UploaderBadge
                                                        type={property.uploader_type}
                                                        name={property.uploaded_by_name}
                                                    />
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={clsx(
                                                    "px-2 py-1 rounded-full text-xs font-bold capitalize",
                                                    property.status === 'active' || property.status === 'published'
                                                        ? 'bg-green-100 text-green-700'
                                                        : property.status === 'draft'
                                                            ? 'bg-amber-100 text-amber-700'
                                                            : 'bg-gray-100 text-gray-600'
                                                )}>
                                                    {property.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => setSelectedProperty(property)}
                                                        className="p-1.5 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    {!isAdminView && (
                                                        <button
                                                            onClick={() => {
                                                                if (property.status === 'published') {
                                                                    setContactPopup({
                                                                        show: true,
                                                                        message: 'Property is published — contact our agents to request changes.'
                                                                    });
                                                                    return;
                                                                }
                                                                openEdit(property);
                                                            }}
                                                            className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                    )}
                                                    {/* Admin: show unpublish & reverify inline for published items */}
                                                    {(activeRole === 'admin' || activeRole === 'superadmin') && property.status === 'published' && (
                                                        <>
                                                            <button
                                                                onClick={() => unpublishProperty(property.id)}
                                                                title="Unpublish"
                                                                className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-yellow-600 rounded"
                                                            >
                                                                <Unlock size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => reverifyProperty(property.id)}
                                                                title="Reverify UPI"
                                                                className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-indigo-600 rounded"
                                                            >
                                                                <Database size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                    {!(activeRole === 'admin' || activeRole === 'superadmin') && (
                                                        <button
                                                            onClick={() => {
                                                                if (property.status === 'published') {
                                                                    setContactPopup({ show: true, message: 'Published properties cannot be deleted. Unpublish first.' });
                                                                    return;
                                                                }
                                                                handleDelete(property.id);
                                                            }}
                                                            className={clsx('p-1.5 rounded', property.status === 'published' ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-red-50 text-gray-400 hover:text-red-600')}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                    {!isAdminView && (
                                                        <button
                                                            onClick={() => handlePublish(property)}
                                                            className={clsx(
                                                                "p-1.5 rounded text-xs font-bold",
                                                                property.status === 'published'
                                                                    ? "bg-green-50 text-green-700"
                                                                    : "bg-green-50 text-green-700 hover:bg-green-100"
                                                            )}
                                                        >
                                                            {property.status === 'published' ? 'Published' : 'Publish'}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                                                <p className="mb-4">No properties found</p>
                                                <button
                                                    onClick={() => setIsCreating(true)}
                                                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold"
                                                >
                                                    Create Property
                                                </button>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* --- BOTTOM PAGINATION --- */}
                <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                        Showing {Math.min(skip + 1, total || 0)} - {Math.min(skip + limit, total || 0)} of {total} properties
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrevPage}
                            disabled={skip === 0}
                            className="px-3 py-1 rounded border bg-white dark:bg-[#0a162e] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Prev
                        </button>
                        <button
                            onClick={handleNextPage}
                            disabled={skip + limit >= total}
                            className="px-3 py-1 rounded border bg-white dark:bg-[#0a162e] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* --- CREATE RECORD MODAL --- */}
            <AnimatePresence>
                {isCreating && (
                    <div className="fixed inset-0 z-[120] flex items-start justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsCreating(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 20, opacity: 0 }}
                            className="relative bg-white dark:bg-[#0f1f3a] rounded-2xl w-full max-w-6xl max-h-[92vh] overflow-auto z-30 p-4"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">Create New Property</h2>
                                <button onClick={() => setIsCreating(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                                    <X size={20} />
                                </button>
                            </div>
                            <RecordPropertyPage />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* --- PROPERTY DETAIL MODAL --- */}
            <AnimatePresence>
                {selectedProperty && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedProperty(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-6xl bg-white dark:bg-[#0f1f3a] rounded-3xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-start bg-gray-50 dark:bg-[#112240]">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h2 className="text-xl font-bold">{selectedProperty.upi}</h2>
                                        <span className={clsx(
                                            "px-2 py-0.5 rounded-full text-xs font-bold",
                                            selectedProperty.status === 'active' || selectedProperty.status === 'published'
                                                ? 'bg-green-100 text-green-700'
                                                : selectedProperty.status === 'draft'
                                                    ? 'bg-amber-100 text-amber-700'
                                                    : 'bg-gray-100 text-gray-600'
                                        )}>
                                            {selectedProperty.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 flex items-center gap-1">
                                        <MapPin size={14} /> {getLocationText(selectedProperty)}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    {/* Admin controls: unpublish & reverify */}
                                    {(activeRole === 'admin' || activeRole === 'superadmin') && selectedProperty && (
                                        <>
                                            {selectedProperty.status === 'published' && (
                                                <button
                                                    onClick={() => unpublishProperty(selectedProperty.id)}
                                                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full"
                                                    title="Unpublish"
                                                >
                                                    <Unlock size={20} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => reverifyProperty(selectedProperty.id)}
                                                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full"
                                                title="Reverify UPI"
                                            >
                                                <Database size={20} />
                                            </button>
                                        </>
                                    )}
                                    <button
                                        onClick={() => {
                                            setShowHistory(true);
                                        }}
                                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full"
                                    >
                                        <History size={20} />
                                    </button>
                                    <button
                                        onClick={() => setSelectedProperty(null)}
                                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Content - Scrollable */}
                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    {/* Left Column: Images & Key Info */}
                                    <div className="lg:col-span-1 space-y-6">
                                        {/* Image Gallery */}
                                        <div className="space-y-3">
                                            <div className="h-64 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                                                {selectedProperty.images && selectedProperty.images.length > 0 ? (
                                                    <img
                                                        src={`${api.defaults?.baseURL?.replace(/\/$/, '') || ''}/assets/${selectedProperty.images[selectedImageIndex]?.file_path}`}
                                                        alt={`Property ${selectedProperty.upi}`}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Image+Not+Found';
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <ImageIcon size={48} className="text-gray-400" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Thumbnails */}
                                            {selectedProperty.images && selectedProperty.images.length > 1 && (
                                                <div className="flex gap-2 overflow-x-auto pb-2">
                                                    {selectedProperty.images.map((img, idx) => (
                                                        <button
                                                            key={img.id || idx}
                                                            onClick={() => setSelectedImageIndex(idx)}
                                                            className={clsx(
                                                                "w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0",
                                                                selectedImageIndex === idx ? 'border-primary' : 'border-transparent'
                                                            )}
                                                        >
                                                            <img
                                                                src={`${api.defaults?.baseURL?.replace(/\/$/, '') || ''}/assets/${img.file_path}`}
                                                                alt={`Thumb ${idx}`}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/64?text=No+Image';
                                                                }}
                                                            />
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Amount Needed */}
                                        <div className="p-4 bg-white dark:bg-[#071025] rounded-xl border border-gray-100 dark:border-gray-800">
                                            <p className="text-xs text-gray-500 uppercase font-semibold mb-2 flex items-center gap-1">
                                                <DollarSign size={12} /> Amount Needed
                                            </p>
                                            <p className="text-2xl font-extrabold text-primary dark:text-white">
                                                {selectedProperty.estimated_amount
                                                    ? Number(selectedProperty.estimated_amount).toLocaleString() + ' RWF'
                                                    : '—'}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                Last updated: {selectedProperty.updated_at ? new Date(selectedProperty.updated_at).toLocaleString() : '—'}
                                            </p>
                                        </div>

                                        {/* Listed By */}
                                        {selectedProperty.uploader_type && selectedProperty.uploaded_by_name && (
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase font-bold mb-2 flex items-center gap-1">
                                                    <User size={12} /> Listed By
                                                </p>
                                                <UploaderBadge
                                                    type={selectedProperty.uploader_type}
                                                    name={selectedProperty.uploaded_by_name}
                                                />
                                            </div>
                                        )}


                                        {/* Alerts */}
                                        {(selectedProperty) && (
                                            <div className={`${selectedProperty.isUnderMortgage || selectedProperty.isUnderRestriction || selectedProperty.inProcess ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30' : 'bg-green-50/60 dark:bg-green-900/10 border-green-100 dark:border-green-900/30'} p-4 border rounded-xl font-bold space-y-2`}>
                                                <p className={`${selectedProperty.isUnderMortgage || selectedProperty.isUnderRestriction || selectedProperty.inProcess ? 'text-red-500' : 'text-green-700'} text-xs font-bold uppercase flex items-center gap-2`}>
                                                    <AlertTriangle size={14} /> Risk Alerts
                                                </p>
                                                {selectedProperty && (
                                                    <div className={`${selectedProperty.isUnderMortgage ? 'text-red-400' : 'text-green-600'} text-xs flex items-center gap-1`}>
                                                        {selectedProperty.isUnderMortgage ? (
                                                            <>
                                                                <Shield size={12} /> Property Under Mortgage
                                                            </>
                                                        ) : (
                                                            <>
                                                                <CheckCheck size={12} /> No Mortgage
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                                {selectedProperty && (
                                                    <div className={`${selectedProperty.isUnderRestriction ? 'text-red-400' : 'text-green-600'} text-xs flex items-center gap-1`}>
                                                        {selectedProperty.isUnderRestriction ? (
                                                            <>
                                                                <Lock size={12} /> Property Under Restriction
                                                            </>
                                                        ) : (
                                                            <>
                                                                <CheckCheck size={12} /> No Restrictions
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                                {selectedProperty && (
                                                    <div className={`${selectedProperty.inProcess ? 'text-red-400' : 'text-green-600'} text-xs flex items-center gap-1`}>
                                                        {selectedProperty.inProcess ? (
                                                            <>
                                                                <Timer size={12} /> this Property is in process
                                                            </>
                                                        ) : (
                                                            <>
                                                                <CheckCheckIcon size={12} /> No Process
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Quick Stats */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <DetailItem
                                                label="Parcel Size"
                                                value={selectedProperty.size ? `${selectedProperty.size} m²` : '—'}
                                                icon={Ruler}
                                            />
                                            <DetailItem
                                                label="Remaining Lease"
                                                value={selectedProperty.parcel_information?.remainingLeaseTerm ? `${selectedProperty.parcel_information?.remainingLeaseTerm} Years` : '—'}
                                                icon={Calendar}
                                            />
                                            <DetailItem
                                                label="Right Type"
                                                value={selectedProperty.right_type || '—'}
                                                icon={FileText}
                                            />
                                            <DetailItem
                                                label="Land Use"
                                                value={selectedProperty.land_use || '—'}
                                                icon={LandPlot}
                                            />
                                        </div>
                                    </div>

                                    {/* Right Column: Detailed Information */}
                                    <div className="lg:col-span-2 space-y-8">
                                        {/* Representative Section */}
                                        {selectedProperty.representative && (
                                            <section>
                                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                                    <UserPlus size={18} className="text-primary" /> Representative
                                                </h3>
                                                <div className="bg-white dark:bg-[#071025] rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                                                    <div className="font-bold">
                                                        {selectedProperty.representative.surname
                                                            ? `${selectedProperty.representative.surname} ${selectedProperty.representative.foreNames || ''}`.trim()
                                                            : selectedProperty.representative.fullName || '—'}
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-2 space-y-1">
                                                        <div className="flex items-center gap-1">
                                                            <Hash size={10} />
                                                            ID: {selectedProperty.representative.idNo || selectedProperty.representative.id || '—'}
                                                        </div>
                                                        {selectedProperty.representative.gender && (
                                                            <div className="flex items-center gap-1">
                                                                <UserCircle size={10} />
                                                                Gender: {selectedProperty.representative.gender}
                                                            </div>
                                                        )}
                                                        {selectedProperty.representative.address && (
                                                            <div className="flex items-start gap-1 mt-2">
                                                                <MapPin size={10} className="mt-0.5" />
                                                                <div>
                                                                    {selectedProperty.representative.address.village?.villageName},
                                                                    {selectedProperty.representative.address.cell?.cellName},
                                                                    {selectedProperty.representative.address.sector?.sectorName},
                                                                    {selectedProperty.representative.address.district?.districtName}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </section>
                                        )}
                                        {/* Parcel Details Section */}
                                        <section>
                                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                                <Database size={18} className="text-primary" /> Parcel Information
                                            </h3>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                <DetailItem label="UPI" value={selectedProperty.upi} icon={Hash} />
                                                <DetailItem label="Parcel ID" value={selectedProperty.parcel_id || '—'} icon={FileDigit} />
                                                <DetailItem label="Category" value={selectedProperty.category?.label || selectedProperty.category?.name || '—'} icon={Layers} />
                                                <DetailItem label="Subcategory" value={selectedProperty.subcategory?.label || selectedProperty.subcategory?.name || '—'} icon={Layers} />
                                                <DetailItem label="GIS Coordinates" value={
                                                    selectedProperty.gis_coordinates || 'N/A'
                                                } icon={Map} />
                                                <DetailItem label="Latitude / Longitude" value={

                                                    (selectedProperty.latitude && selectedProperty.longitude ?
                                                        `${selectedProperty.latitude.toFixed(6)}, ${selectedProperty.longitude.toFixed(6)}` : '—')
                                                } icon={Map} />
                                            </div>
                                        </section>

                                        {/* Location Section */}
                                        <section>
                                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                                <MapPinned size={18} className="text-primary" /> Location Details
                                            </h3>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <DetailItem label="Province" value={
                                                    selectedProperty.parcel_information?.parcel_location?.province?.provinceName ||
                                                    selectedProperty.parcel_raw?.parcelLocation?.province?.provinceName ||
                                                    '—'
                                                } icon={MapPinHouse} />
                                                <DetailItem label="District" value={selectedProperty.district || '—'} icon={Building} />
                                                <DetailItem label="Sector" value={selectedProperty.sector || '—'} icon={Building2} />
                                                <DetailItem label="Cell" value={selectedProperty.cell || '—'} icon={MapPin} />
                                                <DetailItem label="Village" value={selectedProperty.village || '—'} icon={MapPin} />
                                            </div>
                                        </section>

                                        {/* Owners Section */}
                                        <section>
                                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                                <Users size={18} className="text-primary" /> Owners
                                            </h3>
                                            <div className="space-y-3 bg-white dark:bg-[#071025] rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                                                {(selectedProperty.owners && selectedProperty.owners.length > 0) ? (
                                                    selectedProperty.owners.map((owner, idx) => (
                                                        <OwnerCard key={idx} owner={owner} />
                                                    ))
                                                ) : (
                                                    <p className="text-sm text-gray-500">No owner information available</p>
                                                )}
                                            </div>
                                        </section>

                                        {/* Valuation Section */}
                                        {(selectedProperty.parcel_information?.valuationValue || selectedProperty.parcel_information?.valuation) && (
                                            <section>
                                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                                    <Calculator size={18} className="text-primary" /> Valuation
                                                </h3>
                                                <div className="grid grid-cols-2 gap-4">
                                                    {(() => {
                                                        const val = selectedProperty.parcel_information?.valuationValue ||
                                                            selectedProperty.parcel_information?.valuation ||
                                                            {};
                                                        return (
                                                            <>
                                                                <DetailItem
                                                                    label="Min Price"
                                                                    value={val.minPrice || val.min_price ? `${Number(val.minPrice || val.min_price).toLocaleString()} RWF` : '—'}
                                                                    icon={DollarSign}
                                                                />
                                                                <DetailItem
                                                                    label="Max Price"
                                                                    value={val.maxPrice || val.max_price ? `${Number(val.maxPrice || val.max_price).toLocaleString()} RWF` : '—'}
                                                                    icon={DollarSign}
                                                                />
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </section>
                                        )}

                                        {/* Planned Land Uses */}
                                        {selectedProperty.planned_land_uses && selectedProperty.planned_land_uses.length > 0 && (
                                            <section>
                                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                                    <LandPlot size={18} className="text-primary" /> Planned Land Uses
                                                </h3>
                                                <div className="space-y-2">
                                                    {selectedProperty.planned_land_uses.map((use, idx) => (
                                                        <div key={idx} className="bg-white dark:bg-[#071025] rounded-lg border border-gray-100 dark:border-gray-800 p-3">
                                                            <div className="font-bold">{use.landUseName || use.landUseNameEnglish || use.landUseNameKinyarwanda || '—'}</div>
                                                            <div className="text-xs text-gray-500 mt-1">Area: {use.area || selectedProperty.size || '—'} m²</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}

                                        {/* Property Features */}
                                        {(selectedProperty.details && Object.keys(selectedProperty.details).length > 0) && (
                                            <section>
                                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                                    <Home size={18} className="text-primary" /> Property Features
                                                </h3>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                    {selectedProperty.details && Object.entries(selectedProperty.details).filter(([key]) => !['cell', 'village', 'district', 'sector'].includes(key)).map(([key, value]) => (
                                                        <DetailItem key={key} label={key.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")} value={value} icon={Home} />
                                                    ))}

                                                </div>
                                            </section>
                                        )}

                                        {/* Video Links */}
                                        {selectedProperty.video_link && (
                                            <section>
                                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                                    <Video size={18} className="text-primary" /> Media
                                                </h3>
                                                <div className="bg-white dark:bg-[#071025] rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                                                    <a
                                                        href={selectedProperty.video_link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary hover:underline flex items-center gap-2"
                                                    >
                                                        <Video size={16} />
                                                        Watch Video Tour
                                                    </a>
                                                </div>
                                            </section>
                                        )}
                                    </div>
                                </div>

                                {/* Debug Panel - Raw JSON Data */}
                                <div className="mt-8 space-y-4 hidden">
                                    <details className="group">
                                        <summary className="text-sm font-bold text-gray-500 cursor-pointer hover:text-gray-700 flex items-center gap-2">
                                            <ChevronRight size={16} className="group-open:rotate-90 transition-transform" />
                                            View Raw Parcel Information
                                        </summary>
                                        <div className="mt-4 p-4 bg-gray-50 dark:bg-[#071025] rounded-xl border border-gray-200 dark:border-gray-800">
                                            <pre className="text-xs overflow-auto max-h-96" style={{ whiteSpace: 'pre-wrap' }}>
                                                {JSON.stringify(selectedProperty.parcel_information || selectedProperty.parcel_raw, null, 2)}
                                            </pre>
                                        </div>
                                    </details>

                                    <details className="group">
                                        <summary className="text-sm font-bold text-gray-500 cursor-pointer hover:text-gray-700 flex items-center gap-2">
                                            <ChevronRight size={16} className="group-open:rotate-90 transition-transform" />
                                            View Full Property Record
                                        </summary>
                                        <div className="mt-4 p-4 bg-gray-50 dark:bg-[#071025] rounded-xl border border-gray-200 dark:border-gray-800">
                                            <pre className="text-xs overflow-auto max-h-96" style={{ whiteSpace: 'pre-wrap' }}>
                                                {JSON.stringify(selectedProperty, null, 2)}
                                            </pre>
                                        </div>
                                    </details>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#112240] flex justify-between">
                                <button
                                    onClick={() => setShowHistory(true)}
                                    className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    <History size={16} /> View History
                                </button>
                                <div className="flex gap-2">
                                    {!isAdminView && (
                                        <button
                                            onClick={() => {
                                                setSelectedProperty(null);
                                                openEdit(selectedProperty);
                                            }}
                                            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                                        >
                                            <Edit2 size={16} /> Edit
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setSelectedProperty(null)}
                                        className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* --- EDIT MODAL --- */}
            <AnimatePresence>
                {editProperty && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setEditProperty(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="relative bg-white dark:bg-[#0f1f3a] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col z-10"
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-start bg-gray-50 dark:bg-[#112240]">
                                <div>
                                    <h3 className="text-xl font-bold flex items-center gap-2">
                                        <Edit2 size={20} className="text-primary" />
                                        Edit Property — {editProperty.upi}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        Step {editStep} of 2: {editStep === 1 ? 'Basic Information' : 'Property Details & Media'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setEditProperty(null)}
                                    className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Content - Scrollable */}
                            <div className="flex-1 overflow-y-auto p-6">
                                {editStep === 1 ? (
                                    /* STEP 1: Basic Information */
                                    <div className="space-y-6">
                                        {/* Category Mismatch Warning */}
                                        {categoryMismatchWarning && (
                                            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl p-4 flex items-start gap-3">
                                                <AlertCircle size={20} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300">Category Mismatch Detected</h4>
                                                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">{categoryMismatchWarning}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* UPI-fetched fields - READ ONLY */}
                                        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-xl p-4">
                                            <h4 className="text-xs font-bold uppercase text-blue-700 dark:text-blue-400 mb-3 flex items-center gap-2">
                                                <Database size={14} />
                                                System Data (Read-only - Fetched from UPI)
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="text-xs text-gray-500 dark:text-gray-400">Under Mortgage</label>
                                                    <div className="mt-1 p-2 bg-white dark:bg-[#0a162e] rounded border border-gray-200 dark:border-gray-700 text-sm">
                                                        {editProperty.is_under_mortgage ? 'Yes' : 'No'}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-500 dark:text-gray-400">Under Restriction</label>
                                                    <div className="mt-1 p-2 bg-white dark:bg-[#0a162e] rounded border border-gray-200 dark:border-gray-700 text-sm">
                                                        {editProperty.is_under_restriction ? 'Yes' : 'No'}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-500 dark:text-gray-400">In Process</label>
                                                    <div className="mt-1 p-2 bg-white dark:bg-[#0a162e] rounded border border-gray-200 dark:border-gray-700 text-sm">
                                                        {editProperty.in_process ? 'Yes' : 'No'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                                                <p>Parcel Land Use: <span className="font-bold">{editProperty.land_use || 'N/A'}</span></p>
                                                <p>Owner: {editProperty.owner_name || 'N/A'}</p>
                                            </div>
                                        </div>

                                        {/* Editable Fields - Category Selection */}
                                        <div>
                                            <h4 className="text-sm font-bold mb-3">Category & Property Type</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* Category Selection */}
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Category</label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {categories.map((cat) => {
                                                            const Icon = IconMap[cat.icon || 'Home'] || Home;
                                                            const isSelected = selectedCategory?.id === cat.id;
                                                            return (
                                                                <button
                                                                    key={cat.id}
                                                                    type="button"
                                                                    onClick={() => handleCategoryChange(cat)}
                                                                    className={clsx(
                                                                        "flex flex-col items-center justify-center p-3 rounded-xl border transition-all",
                                                                        isSelected
                                                                            ? "bg-primary/10 border-primary text-primary"
                                                                            : "bg-gray-50 dark:bg-[#112240] border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300"
                                                                    )}
                                                                >
                                                                    <Icon size={20} />
                                                                    <span className="text-[10px] font-bold mt-1">{cat.label || cat.name}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Subcategory Selection */}
                                                {selectedCategory && (
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Property Type</label>
                                                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                                            {subCategories
                                                                .filter(s => s.category_id === selectedCategory.id)
                                                                .map((sub) => {
                                                                    const isSelected = selectedSubCategory?.id === sub.id;
                                                                    return (
                                                                        <button
                                                                            key={sub.id}
                                                                            type="button"
                                                                            onClick={() => handleSubCategoryChange(sub)}
                                                                            className={clsx(
                                                                                "w-full p-3 rounded-xl border text-left text-sm font-medium transition-all",
                                                                                isSelected
                                                                                    ? "bg-primary/10 border-primary text-primary"
                                                                                    : "bg-gray-50 dark:bg-[#112240] border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300"
                                                                            )}
                                                                        >
                                                                            {sub.label || sub.name}
                                                                        </button>
                                                                    );
                                                                })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Owner Details - Read Only */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Owner Name</label>
                                                <input
                                                    type="text"
                                                    value={editForm.owner_name || ''}
                                                    disabled={true}
                                                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-[#112240] text-sm cursor-not-allowed"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Owner ID</label>
                                                <input
                                                    type="text"
                                                    value={editForm.owner_id || ''}
                                                    disabled={true}
                                                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-[#112240] text-sm cursor-not-allowed"
                                                />
                                            </div>
                                        </div>

                                        {/* Location Fields - Read Only */}
                                        <div>
                                            <h4 className="text-sm font-bold mb-3">Location</h4>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">District</label>
                                                    <input
                                                        type="text"
                                                        value={editForm.district || ''}
                                                        disabled={true}
                                                        className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-[#112240] text-sm cursor-not-allowed"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Sector</label>
                                                    <input
                                                        type="text"
                                                        value={editForm.sector || ''}
                                                        disabled={true}
                                                        className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-[#112240] text-sm cursor-not-allowed"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Cell</label>
                                                    <input
                                                        type="text"
                                                        value={editForm.cell || ''}
                                                        disabled={true}
                                                        className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-[#112240] text-sm cursor-not-allowed"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Village</label>
                                                    <input
                                                        type="text"
                                                        value={editForm.village || ''}
                                                        disabled={true}
                                                        className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-[#112240] text-sm cursor-not-allowed"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Basic Property Details - Some Editable */}
                                        <div>
                                            <h4 className="text-sm font-bold mb-3">Property Details</h4>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Parcel Size (m²)</label>
                                                    <input
                                                        type="number"
                                                        value={editForm.size || editForm.size || ''}
                                                        disabled={true}
                                                        className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-[#112240] text-sm cursor-not-allowed"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Estimated Amount (RWF)</label>
                                                    <input
                                                        type="number"
                                                        value={editForm.estimated_amount || ''}
                                                        onChange={(e) => handleInputChange('estimated_amount', parseFloat(e.target.value))}
                                                        className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#112240] text-sm focus:border-primary outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Land Use</label>
                                                    <input
                                                        type="text"
                                                        value={editForm.land_use || ''}
                                                        disabled={true}
                                                        className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-[#112240] text-sm cursor-not-allowed"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Remaining Lease </label>
                                                    <input
                                                        type="number"
                                                        value={editForm?.remaining_lease_term || ''}
                                                        disabled={true}
                                                        className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-[#112240] text-sm cursor-not-allowed"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Right Type</label>
                                                    <select
                                                        value={editForm.right_type || ''}
                                                        onChange={(e) => handleInputChange('right_type', e.target.value)}
                                                        disabled={true}
                                                        className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-[#112240] text-sm cursor-not-allowed"
                                                    >
                                                        <option value="">Select...</option>
                                                        <option value="Freehold">Freehold</option>
                                                        <option value="Leasehold">Leasehold</option>
                                                        <option value="Emphyteutic Lease">Emphyteutic Lease</option>
                                                        <option value="Customary">Customary</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* STEP 2: Property Details & Media */
                                    <div className="space-y-8">
                                        {/* Dynamic Form Fields from Config */}
                                        {selectedSubCategory && (
                                            <div>
                                                <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                                                    <FileText size={16} className="text-primary" />
                                                    {selectedSubCategory.label} Details
                                                </h4>

                                                {(() => {
                                                    const configCategory = FORM_CONFIG.find(c =>
                                                        c.label.toLowerCase() === selectedCategory?.label?.toLowerCase()
                                                    );
                                                    const configSub = configCategory?.subCategories.find(s =>
                                                        s.label.toLowerCase() === selectedSubCategory.label?.toLowerCase()
                                                    );

                                                    if (!configSub) {
                                                        return (
                                                            <div className="p-8 text-center text-gray-500 border-2 border-dashed rounded-xl">
                                                                <p>No specific fields defined for this property type.</p>
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                            {configSub.fields.map((field) => (
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
                                                                    {renderFormField(field)}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        )}

                                        {/* Images Management */}
                                        <div>
                                            <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                                                <ImageIcon size={16} className="text-primary" />
                                                Property Images
                                            </h4>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                                {editProperty.images?.map((img, idx) => (
                                                    <div key={img.id || idx} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                                                        <img
                                                            src={`${api.defaults?.baseURL?.replace(/\/$/, '') || ''}/assets/${img.file_path}`}
                                                            alt={`Property ${idx}`}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Error';
                                                            }}
                                                        />
                                                        <button
                                                            onClick={() => img.id && handleImageDelete(img.id)}
                                                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center">
                                                <input
                                                    type="file"
                                                    id="image-upload"
                                                    multiple
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => handleImagesUpload(e.target.files)}
                                                    disabled={isUploadingImage}
                                                />
                                                <label
                                                    htmlFor="image-upload"
                                                    className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors"
                                                >
                                                    {isUploadingImage ? (
                                                        <>
                                                            <RefreshCw size={16} className="animate-spin" />
                                                            Uploading...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Upload size={16} />
                                                            Upload Images
                                                        </>
                                                    )}
                                                </label>
                                                <p className="text-xs text-gray-500 mt-2">PNG, JPG, JPEG up to 10MB each</p>
                                            </div>
                                        </div>

                                        {/* Video Links */}
                                        <div>
                                            <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                                                <Video size={16} className="text-primary" />
                                                Video & 3D Content
                                            </h4>

                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Video Link (YouTube/Vimeo)</label>
                                                    <input
                                                        type="url"
                                                        value={editForm.video_link || ''}
                                                        onChange={(e) => handleInputChange('video_link', e.target.value)}
                                                        placeholder="https://www.youtube.com/watch?v=..."
                                                        className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#112240] text-sm focus:border-primary outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* GIS Coordinates */}
                                        <div>
                                            <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                                                <Map size={16} className="text-primary" />
                                                GIS Coordinates
                                            </h4>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Latitude</label>
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        value={editForm.latitude || ''}
                                                        onChange={(e) => handleInputChange('latitude', parseFloat(e.target.value))}
                                                        className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#112240] text-sm focus:border-primary outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Longitude</label>
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        value={editForm.longitude || ''}
                                                        onChange={(e) => handleInputChange('longitude', parseFloat(e.target.value))}
                                                        className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#112240] text-sm focus:border-primary outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <input
                                                type="text"
                                                value={editForm.gis_coordinates || ''}
                                                onChange={(e) => handleInputChange('gis_coordinates', e.target.value)}
                                                placeholder="Or enter as 'lat, lon' (e.g. -1.9441,30.0619)"
                                                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#112240] text-sm focus:border-primary outline-none mt-2"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#112240] flex justify-between">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (editStep === 1) {
                                            setEditProperty(null);
                                        } else {
                                            setEditStep(1);
                                        }
                                    }}
                                    className="px-6 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a162e] text-sm font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-center gap-2"
                                >
                                    <ArrowLeft size={16} />
                                    {editStep === 1 ? 'Cancel' : 'Back'}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        if (editStep === 1) {
                                            if (!selectedCategory || !selectedSubCategory) {
                                                addToast('error', 'Please select category and property type');
                                                return;
                                            }
                                            setEditStep(2);
                                        } else {
                                            saveEdit();
                                        }
                                    }}
                                    disabled={isVerifyingCategory}
                                    className="px-8 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {editStep === 1 ? (
                                        <>
                                            Continue
                                            <ChevronRight size={16} />
                                        </>
                                    ) : (
                                        <>
                                            <Save size={16} />
                                            Save Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* --- HISTORY MODAL --- */}
            <AnimatePresence>
                {showHistory && selectedProperty && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-end">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowHistory(false)}
                            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="relative w-full max-w-md h-full bg-white dark:bg-[#0a162e] border-l border-gray-200 dark:border-gray-800 shadow-2xl p-6 overflow-y-auto"
                        >
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                    <History size={20} className="text-primary" /> Audit Log
                                </h3>
                                <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-8 relative before:absolute before:left-[19px] before:top-2 before:bottom-0 before:w-[2px] before:bg-gray-100 dark:before:bg-gray-800">
                                {historyItems.length > 0 ? historyItems.map((item) => (
                                    <div key={item.id} className="relative pl-12">
                                        <div className="absolute left-0 top-1 w-10 h-10 bg-white dark:bg-[#0a162e] border border-gray-200 dark:border-gray-800 rounded-full flex items-center justify-center z-10 text-gray-400 text-xs font-bold">
                                            {item.date ? new Date(item.date).toLocaleDateString().slice(0, 2) : ''}
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 font-mono mb-1">
                                                {item.date ? new Date(item.date).toLocaleString() : ''}
                                            </p>
                                            <h4 className="font-bold text-slate-900 dark:text-white">{item.action || 'Change'}</h4>
                                            <p className="text-sm text-gray-500 mt-1">{item.details || ''}</p>
                                            <div className="mt-2 inline-flex items-center gap-1 text-[10px] bg-gray-100 dark:bg-[#112240] px-2 py-1 rounded">
                                                <User size={10} /> User ID: {item.user || 'System'}
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="p-6 text-sm text-gray-500 text-center">
                                        <History size={32} className="mx-auto mb-3 text-gray-300" />
                                        <p>No history entries for this property.</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* --- DELETE CONFIRM MODAL --- */}
            <AnimatePresence>
                {deletingId && (
                    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setDeletingId(null)}
                            className="absolute inset-0 bg-black/40"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="relative bg-white dark:bg-[#0f1f3a] rounded-xl p-6 w-full max-w-md z-10"
                        >
                            <h3 className="text-lg font-bold mb-2">Confirm Delete</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                Are you sure you want to delete this property? This action cannot be undone.
                            </p>
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setDeletingId(null)}
                                    className="px-4 py-2 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                                >
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* --- OTP MODAL --- */}
            <AnimatePresence>
                {showOTPModal && (
                    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowOTPModal(false)}
                            className="absolute inset-0 bg-black/40"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="relative bg-white dark:bg-[#0f1f3a] rounded-xl p-6 w-full max-w-md z-10"
                        >
                            <h3 className="text-lg font-bold mb-4">Verification Required</h3>

                            {otpPhase === 'enter_contact' ? (
                                <>
                                    <p className="text-sm text-gray-500 mb-4">
                                        Enter the phone number or email where you'd like to receive the verification code.
                                    </p>
                                    {maskedContact && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                            Suggested: <span className="font-bold">{maskedContact}</span>
                                        </p>
                                    )}
                                    <input
                                        value={contactInput}
                                        onChange={(e) => setContactInput(e.target.value)}
                                        className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#112240] mb-4"
                                        placeholder={maskedContact || "Phone or email"}
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => { setShowOTPModal(false); setContactInput(''); }}
                                            className="px-4 py-2 rounded border border-gray-200 dark:border-gray-700"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={requestSendOtp}
                                            className="px-4 py-2 rounded bg-primary text-white hover:bg-primary/90"
                                        >
                                            Send Code
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className="text-sm text-gray-500 mb-4">
                                        Enter the verification code sent to your contact.
                                    </p>
                                    <input
                                        value={otpCode}
                                        onChange={(e) => setOtpCode(e.target.value)}
                                        className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#112240] mb-4"
                                        placeholder="OTP code"
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => { setShowOTPModal(false); setOtpCode(''); }}
                                            className="px-4 py-2 rounded border border-gray-200 dark:border-gray-700"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={submitOtp}
                                            className="px-4 py-2 rounded bg-primary text-white hover:bg-primary/90"
                                        >
                                            Verify & Publish
                                        </button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* --- MAP MODAL --- */}
            <AnimatePresence>
                {showMapModal && mapUrl && (
                    <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowMapModal(false)}
                            className="absolute inset-0 bg-black/60"
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="relative bg-white dark:bg-[#071025] rounded-xl p-4 w-full max-w-4xl h-[80vh] z-80"
                        >
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-lg font-bold">Property Location Map</h3>
                                <button onClick={() => setShowMapModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="w-full h-[calc(100%-48px)]">
                                <iframe
                                    title="property-map"
                                    src={mapUrl}
                                    className="w-full h-full border-0 rounded"
                                    allowFullScreen
                                    loading="lazy"
                                />
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* --- CONTACT POPUP --- */}
            <AnimatePresence>
                {contactPopup.show && (
                    <div className="fixed bottom-6 right-6 z-70">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="bg-white dark:bg-[#0b1530] p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 max-w-sm"
                        >
                            <div className="flex items-start gap-3">
                                <AlertTriangle size={20} className="text-amber-500 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="font-bold mb-1">Action Blocked</p>
                                    <p className="text-sm text-gray-500">{contactPopup.message}</p>
                                </div>
                                <button
                                    onClick={() => setContactPopup({ show: false })}
                                    className="text-sm text-gray-400 hover:text-gray-600"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* --- TOAST NOTIFICATIONS --- */}
            <div className="fixed bottom-6 left-6 z-80 flex flex-col gap-3">
                <AnimatePresence>
                    {toasts.map(t => (
                        <motion.div
                            key={t.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className={clsx(
                                "px-4 py-3 rounded-lg shadow-lg text-sm flex items-center gap-2",
                                t.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
                                    t.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
                                        'bg-blue-50 text-blue-800 border border-blue-200'
                            )}
                        >
                            {t.type === 'success' && <CheckCircle2 size={16} />}
                            {t.type === 'error' && <AlertTriangle size={16} />}
                            {t.type === 'info' && <AlertCircle size={16} />}
                            {t.message}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};