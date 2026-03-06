// SellProperty.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload, FileText, CheckCircle2, AlertCircle, Loader2, X,
    Map, Building2,
    RefreshCw, Eye, Search, Trash2, Plus, ArrowUpCircle,
    FileWarning, Clock, AlertTriangle, Info, CheckCheck, Shield,
    Landmark, Database, MapPin,
    Calendar, FileDigit,
    Maximize2, Minimize2, Satellite, Moon, Globe,
    AlertOctagon
} from 'lucide-react';
import { clsx } from 'clsx';
import api from '../../instance/mainAxios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import RecordPropertyPage from '../dashboard/Properties/RecordPropertyPage';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMap, WMSTileLayer, ScaleControl, ZoomControl } from 'react-leaflet';
import * as wk from 'wellknown';


// ============================================================================
// TYPES
// ============================================================================

interface VerificationResponse {
    id: number;
    upi: string;
    property_id: number | null;
    uploaded_by: string;
    official_registry_polygon: string;
    document_detected_polygon: string;
    latitude: number;
    longitude: number;
    parcel_area_sqm: number;
    province: string;
    district: string;
    sector: string;
    cell: string;
    village: string;
    full_address: string;
    land_use_type: string;
    planned_land_use: string;
    is_developed: boolean;
    has_infrastructure: boolean;
    has_building: boolean;
    building_floors: number;
    tenure_type: string;
    lease_term_years: number;
    remaining_lease_term: number;
    under_mortgage: boolean;
    has_caveat: boolean;
    in_transaction: boolean;
    registration_date: string | null;
    approval_date: string | null;
    year_of_record: number;
    overlaps: boolean;
    save_to_buy: boolean;
    status_details: any | null;
    for_sale: boolean;
    price: number | null;
    created_at: string;
    updated_at: string;
    already_registered: boolean;
    property: string;
}

interface UploadFile {
    id: string;
    file: File;
    name: string;
    size: number;
    status: 'pending' | 'processing' | 'success' | 'error' | 'verified';
    progress?: number;
    result?: VerificationResponse;
    error?: string;
    mappingId?: number;
}

interface Mapping {
    id: number;
    upi: string;
    official_registry_polygon: string;
    document_detected_polygon: string;
    latitude: number;
    longitude: number;
    parcel_area_sqm: number;
    province: string;
    district: string;
    sector: string;
    cell: string;
    village: string;
    land_use_type: string;
    planned_land_use: string;
    is_developed: boolean;
    has_infrastructure: boolean;
    has_building: boolean;
    under_mortgage: boolean;
    has_caveat: boolean;
    in_transaction: boolean;
    overlaps: boolean;
    year_of_record: number;
    created_at: string;
    property_id: number | null;
    property_status?: 'draft' | 'published' | null;
    for_sale?: boolean;
    price?: number | null;
}

interface TabType {
    id: 'upload' | 'mappings' | 'map';
    label: string;
    icon: any;
}

interface ParcelWithGeometry {
    id: number;
    upi: string;
    positions: [number, number][];
    center: [number, number];
    color: string;
    area: number;
    land_use_type: string;
    district: string;
    sector: string;
    cell: string;
    geo: any;
    village: string;
    under_mortgage: boolean;
    has_caveat: boolean;
    in_transaction: boolean;
    overlaps: boolean;
    property_id: number | null;
    property_status?: 'draft' | 'published' | null;
    created_at: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

const formatArea = (area?: number): string => {
    if (!area) return 'N/A';
    if (area >= 10000) {
        return `${(area / 10000).toFixed(2)} ha`;
    }
    return `${area.toFixed(0)} m²`;
};

const getCenter = (coords: [number, number][]): [number, number] => {
    let lat = 0;
    let lng = 0;
    coords.forEach(([la, ln]) => {
        lat += la;
        lng += ln;
    });
    return [lat / coords.length, lng / coords.length];
};

// Fix for default markers in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// ============================================================================
// MAP COMPONENTS
// ============================================================================

interface MapControllerProps {
    center: [number, number];
    zoom: number;
}

function MapController({ center, zoom }: MapControllerProps) {
    const map = useMap();

    useEffect(() => {
        map.flyTo(center, zoom, {
            duration: 1.5
        });
    }, [center, zoom, map]);

    return null;
}

interface PolygonWithLabelProps {
    parcel: ParcelWithGeometry;
    isSelected: boolean;
    onClick: () => void;
}

function PolygonWithLabel({ parcel, isSelected, onClick }: PolygonWithLabelProps) {
    const [hovered, setHovered] = useState(false);
    const map = useMap();

    // Determine color based on parcel status
    const getParcelColor = () => {
        if (parcel.overlaps) return '#EF4444'; // Red for overlaps
        if (parcel.under_mortgage || parcel.has_caveat || parcel.in_transaction) return '#F59E0B'; // Orange for issues
        if (parcel.property_id) return '#10B981'; // Green for properties
        return '#3B82F6'; // Blue for mapped parcels without property
    };

    const color = getParcelColor();

    return (
        <>
            <Polygon
                positions={parcel.positions}
                pathOptions={{
                    color: isSelected ? '#6366F1' : color,
                    weight: isSelected ? 5 : hovered ? 4 : 3,
                    fillColor: isSelected ? '#6366F1' : color,
                    fillOpacity: isSelected ? 0.5 : hovered ? 0.35 : 0.25,
                    dashArray: parcel.overlaps ? '5, 5' : undefined,
                }}
                eventHandlers={{
                    click: (e) => {
                        L.DomEvent.stopPropagation(e);
                        onClick();
                    },
                    mouseover: (e) => {
                        setHovered(true);
                        e.target.setStyle({
                            weight: 4,
                            fillOpacity: 0.35,
                        });
                    },
                    mouseout: (e) => {
                        setHovered(false);
                        e.target.setStyle({
                            weight: isSelected ? 5 : 3,
                            fillOpacity: isSelected ? 0.5 : 0.25,
                        });
                    },
                }}
            >
                <Popup>
                    <div className="min-w-[280px] max-w-[320px]">
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-primary truncate">{parcel.upi}</h4>
                            {parcel.overlaps && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium flex items-center gap-1">
                                    <AlertOctagon size={10} />
                                    Overlap
                                </span>
                            )}
                        </div>

                        <div className="space-y-2 text-sm">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <span className="text-gray-500 text-xs">Area</span>
                                    <p className="font-medium">{formatArea(parcel.area)}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500 text-xs">Land Use</span>
                                    <p className="font-medium truncate">{parcel.land_use_type}</p>
                                </div>
                            </div>

                            <div>
                                <span className="text-gray-500 text-xs">Location</span>
                                <p className="text-sm">{parcel.village}, {parcel.cell}</p>
                                <p className="text-xs text-gray-500">{parcel.sector}, {parcel.district}</p>
                            </div>

                            <div>
                                <span className="text-gray-500 text-xs">Status</span>
                                <div className="flex gap-1 flex-wrap mt-1">
                                    {parcel.under_mortgage && (
                                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">
                                            Mortgage
                                        </span>
                                    )}
                                    {parcel.has_caveat && (
                                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                                            Caveat
                                        </span>
                                    )}
                                    {parcel.in_transaction && (
                                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">
                                            In Transaction
                                        </span>
                                    )}
                                    {!parcel.under_mortgage && !parcel.has_caveat && !parcel.in_transaction && !parcel.overlaps && (
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                                            Clear
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-500">Uploaded:</span>
                                    <span className="font-medium">{formatDate(parcel.created_at)}</span>
                                </div>
                                {parcel.property_id ? (
                                    <div className="mt-2 flex items-center gap-1 text-green-600">
                                        <CheckCircle2 size={14} />
                                        <span className="text-xs font-medium">
                                            Property Created ({parcel.property_status === 'published' ? 'Published' : 'Draft'})
                                        </span>
                                    </div>
                                ) : (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // Handle create property - will be passed from parent
                                        }}
                                        className="mt-2 w-full px-3 py-1.5 bg-primary text-white rounded-lg text-xs hover:bg-primary/90 flex items-center justify-center gap-1 transition-colors"
                                    >
                                        <Plus size={12} />
                                        Create Property
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </Popup>
            </Polygon>

            {map.getZoom() >= 15 && (
                <Marker
                    position={parcel.center}
                    icon={L.divIcon({
                        html: `<div style="
                            background-color: rgba(255,255,255,0.95);
                            padding: 2px 8px;
                            border-radius: 12px;
                            font-size: 10px;
                            font-weight: 600;
                            color: #1F2937;
                            border: 2px solid ${color};
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                            white-space: nowrap;
                            pointer-events: none;
                        ">${formatArea(parcel.area)}</div>`,
                        className: 'area-label',
                        iconSize: [70, 24],
                        iconAnchor: [35, 12],
                    })}
                    interactive={false}
                />
            )}
        </>
    );
}

// ============================================================================
// PARCEL DETAILS MODAL
// ============================================================================

interface ParcelDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    parcel: ParcelWithGeometry | null;
    onCreateProperty?: (parcel: ParcelWithGeometry) => void;
}

function ParcelDetailsModal({ isOpen, onClose, parcel, onCreateProperty }: ParcelDetailsModalProps) {
    if (!isOpen || !parcel) return null;

    return (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative bg-white dark:bg-[#0f1f3a] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#112240] flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className={clsx(
                            "p-2 rounded-full",
                            parcel.overlaps ? 'bg-red-100' :
                                parcel.under_mortgage || parcel.has_caveat || parcel.in_transaction ? 'bg-orange-100' :
                                    parcel.property_id ? 'bg-green-100' : 'bg-blue-100'
                        )}>
                            {parcel.overlaps ? (
                                <AlertOctagon size={20} className="text-red-600" />
                            ) : parcel.under_mortgage || parcel.has_caveat || parcel.in_transaction ? (
                                <AlertTriangle size={20} className="text-orange-600" />
                            ) : parcel.property_id ? (
                                <CheckCircle2 size={20} className="text-green-600" />
                            ) : (
                                <MapPin size={20} className="text-blue-600" />
                            )}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">Parcel Details</h3>
                            <p className="text-xs text-gray-500">UPI: {parcel.upi}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
                    {/* Status Alert */}
                    {parcel.overlaps && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-xl">
                            <h4 className="text-sm font-bold text-red-800 dark:text-red-400 mb-2 flex items-center gap-2">
                                <AlertOctagon size={16} />
                                Overlap Detected
                            </h4>
                            <p className="text-sm text-red-700 dark:text-red-300">
                                This parcel overlaps with another parcel in the registry. Please verify the boundaries.
                            </p>
                        </div>
                    )}

                    {(parcel.under_mortgage || parcel.has_caveat || parcel.in_transaction) && (
                        <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/30 rounded-xl">
                            <h4 className="text-sm font-bold text-orange-800 dark:text-orange-400 mb-2 flex items-center gap-2">
                                <AlertTriangle size={16} />
                                Parcel Restrictions
                            </h4>
                            <ul className="space-y-1 text-sm text-orange-700 dark:text-orange-300">
                                {parcel.under_mortgage && (
                                    <li className="flex items-center gap-2">
                                        <Shield size={14} /> Under mortgage
                                    </li>
                                )}
                                {parcel.has_caveat && (
                                    <li className="flex items-center gap-2">
                                        <FileDigit size={14} /> Has caveat
                                    </li>
                                )}
                                {parcel.in_transaction && (
                                    <li className="flex items-center gap-2">
                                        <Clock size={14} /> Currently in transaction
                                    </li>
                                )}
                            </ul>
                        </div>
                    )}

                    {/* Parcel Information Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-gray-50 dark:bg-[#112240] p-3 rounded-lg">
                            <div className="text-xs text-gray-500 mb-1">Land Use</div>
                            <div className="font-medium">{parcel.land_use_type}</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-[#112240] p-3 rounded-lg">
                            <div className="text-xs text-gray-500 mb-1">Area</div>
                            <div className="font-medium">{formatArea(parcel.area)}</div>
                        </div>
                    </div>

                    {/* Location */}
                    <div className="mb-6">
                        <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                            <MapPin size={16} className="text-primary" />
                            Location
                        </h4>
                        <div className="bg-gray-50 dark:bg-[#112240] p-4 rounded-lg">
                            <p className="text-sm">{parcel.village}, {parcel.cell}</p>
                            <p className="text-sm">{parcel.sector}, {parcel.district}</p>
                        </div>
                    </div>

                    {/* Status Details */}
                    <div className="mb-6">
                        <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                            <Shield size={16} className="text-primary" />
                            Status Details
                        </h4>
                        <div className="bg-gray-50 dark:bg-[#112240] p-4 rounded-lg">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-xs text-gray-500">Under Mortgage</div>
                                    <div className="font-medium flex items-center gap-2">
                                        {parcel.under_mortgage ? (
                                            <>
                                                <span className="text-red-600">Yes</span>
                                                <Shield size={14} className="text-red-600" />
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-green-600">No</span>
                                                <CheckCircle2 size={14} className="text-green-600" />
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500">Has Caveat</div>
                                    <div className="font-medium flex items-center gap-2">
                                        {parcel.has_caveat ? (
                                            <>
                                                <span className="text-red-600">Yes</span>
                                                <FileDigit size={14} className="text-red-600" />
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-green-600">No</span>
                                                <CheckCircle2 size={14} className="text-green-600" />
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500">In Transaction</div>
                                    <div className="font-medium flex items-center gap-2">
                                        {parcel.in_transaction ? (
                                            <>
                                                <span className="text-red-600">Yes</span>
                                                <Clock size={14} className="text-red-600" />
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-green-600">No</span>
                                                <CheckCircle2 size={14} className="text-green-600" />
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500">Overlaps</div>
                                    <div className="font-medium flex items-center gap-2">
                                        {parcel.overlaps ? (
                                            <>
                                                <span className="text-red-600">Yes</span>
                                                <AlertOctagon size={14} className="text-red-600" />
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-green-600">No</span>
                                                <CheckCircle2 size={14} className="text-green-600" />
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Upload Date */}
                    <div className="mb-6">
                        <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                            <Calendar size={16} className="text-primary" />
                            Upload Information
                        </h4>
                        <div className="bg-gray-50 dark:bg-[#112240] p-4 rounded-lg">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500">Uploaded on:</span>
                                <span className="font-medium">{formatDate(parcel.created_at)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Property Status */}
                    {parcel.property_id && (
                        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 rounded-lg">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 size={20} className="text-green-600" />
                                <div>
                                    <h4 className="font-medium text-green-800 dark:text-green-400">Property Created</h4>
                                    <p className="text-sm text-green-700 dark:text-green-300">
                                        Status: {parcel.property_status === 'published' ? 'Published' : 'Draft'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#112240] flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
                    >
                        Close
                    </button>

                    {!parcel.property_id && !parcel.overlaps && !parcel.under_mortgage && !parcel.has_caveat && !parcel.in_transaction && (
                        <button
                            onClick={() => {
                                onClose();
                                onCreateProperty?.(parcel);
                            }}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium flex items-center gap-2"
                        >
                            <Plus size={16} />
                            Create Property
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

// ============================================================================
// VERIFICATION MODAL
// ============================================================================

interface VerificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    verificationData: VerificationResponse | null;
    onConfirm: (hasBuildingOrInfra: boolean) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

function VerificationModal({
    isOpen,
    onClose,
    verificationData,
    onConfirm,
    onCancel,
    isLoading = false
}: VerificationModalProps) {
    if (!isOpen || !verificationData) return null;

    const hasIssues = verificationData.under_mortgage ||
        verificationData.has_caveat ||
        verificationData.in_transaction ||
        verificationData.overlaps;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative bg-white dark:bg-[#0f1f3a] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#112240] flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className={clsx(
                            "p-2 rounded-full",
                            hasIssues ? 'bg-red-100' : 'bg-green-100'
                        )}>
                            {hasIssues ? (
                                <AlertTriangle size={20} className="text-red-600" />
                            ) : (
                                <CheckCircle2 size={20} className="text-green-600" />
                            )}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">Parcel Verification Result</h3>
                            <p className="text-xs text-gray-500">UPI: {verificationData.upi}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
                    {/* Blocking Issues Alert */}
                    {hasIssues && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-xl">
                            <h4 className="text-sm font-bold text-red-800 dark:text-red-400 mb-2 flex items-center gap-2">
                                <AlertTriangle size={16} />
                                This parcel cannot be listed for sale
                            </h4>
                            <ul className="space-y-1 text-sm text-red-700 dark:text-red-300">
                                {verificationData.overlaps && (
                                    <li className="flex items-center gap-2">
                                        <AlertOctagon size={14} /> Overlaps with another parcel
                                    </li>
                                )}
                                {verificationData.under_mortgage && (
                                    <li className="flex items-center gap-2">
                                        <Shield size={14} /> Under mortgage
                                    </li>
                                )}
                                {verificationData.has_caveat && (
                                    <li className="flex items-center gap-2">
                                        <FileDigit size={14} /> Has caveat
                                    </li>
                                )}
                                {verificationData.in_transaction && (
                                    <li className="flex items-center gap-2">
                                        <Clock size={14} /> Currently in transaction
                                    </li>
                                )}
                            </ul>
                        </div>
                    )}

                    {/* Parcel Information Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-gray-50 dark:bg-[#112240] p-3 rounded-lg">
                            <div className="text-xs text-gray-500 mb-1">Land Use</div>
                            <div className="font-medium">{verificationData.land_use_type}</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-[#112240] p-3 rounded-lg">
                            <div className="text-xs text-gray-500 mb-1">Planned Use</div>
                            <div className="font-medium text-sm">{verificationData.planned_land_use}</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-[#112240] p-3 rounded-lg">
                            <div className="text-xs text-gray-500 mb-1">Area</div>
                            <div className="font-medium">{verificationData.parcel_area_sqm.toLocaleString()} m²</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-[#112240] p-3 rounded-lg">
                            <div className="text-xs text-gray-500 mb-1">Tenure</div>
                            <div className="font-medium">{verificationData.tenure_type}</div>
                        </div>
                    </div>

                    {/* Location */}
                    <div className="mb-6">
                        <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                            <MapPin size={16} className="text-primary" />
                            Location
                        </h4>
                        <div className="bg-gray-50 dark:bg-[#112240] p-4 rounded-lg">
                            <p className="text-sm">{verificationData.full_address}</p>
                            <div className="grid grid-cols-5 gap-2 mt-3 text-xs">
                                <div>
                                    <span className="text-gray-500">Province:</span>
                                    <div className="font-medium">{verificationData.province}</div>
                                </div>
                                <div>
                                    <span className="text-gray-500">District:</span>
                                    <div className="font-medium">{verificationData.district}</div>
                                </div>
                                <div>
                                    <span className="text-gray-500">Sector:</span>
                                    <div className="font-medium">{verificationData.sector}</div>
                                </div>
                                <div>
                                    <span className="text-gray-500">Cell:</span>
                                    <div className="font-medium">{verificationData.cell}</div>
                                </div>
                                <div>
                                    <span className="text-gray-500">Village:</span>
                                    <div className="font-medium">{verificationData.village}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Development Status */}
                    <div className="mb-6">
                        <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                            <Building2 size={16} className="text-primary" />
                            Development Status
                        </h4>
                        <div className="bg-gray-50 dark:bg-[#112240] p-4 rounded-lg">
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <div className="text-xs text-gray-500 mb-1">Is Developed</div>
                                    <div className="flex items-center gap-2">
                                        {verificationData.is_developed ? (
                                            <>
                                                <CheckCircle2 size={14} className="text-green-600" />
                                                <span>Yes</span>
                                            </>
                                        ) : (
                                            <>
                                                <X size={14} className="text-red-600" />
                                                <span>No</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 mb-1">Has Building</div>
                                    <div className="flex items-center gap-2">
                                        {verificationData.has_building ? (
                                            <>
                                                <CheckCircle2 size={14} className="text-green-600" />
                                                <span>Yes</span>
                                            </>
                                        ) : (
                                            <>
                                                <X size={14} className="text-red-600" />
                                                <span>No</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 mb-1">Has Infrastructure</div>
                                    <div className="flex items-center gap-2">
                                        {verificationData.has_infrastructure ? (
                                            <>
                                                <CheckCircle2 size={14} className="text-green-600" />
                                                <span>Yes</span>
                                            </>
                                        ) : (
                                            <>
                                                <X size={14} className="text-red-600" />
                                                <span>No</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {verificationData.building_floors > 0 && (
                                <div className="mt-2 text-sm">
                                    <span className="text-gray-500">Building Floors:</span>{' '}
                                    <span className="font-medium">{verificationData.building_floors}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Key Dates */}
                    <div className="mb-6">
                        <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                            <Calendar size={16} className="text-primary" />
                            Lease Information
                        </h4>
                        <div className="bg-gray-50 dark:bg-[#112240] p-4 rounded-lg">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-xs text-gray-500">Lease Term</div>
                                    <div className="font-medium">{verificationData.lease_term_years} years</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500">Remaining</div>
                                    <div className="font-medium">{verificationData.remaining_lease_term} years</div>
                                </div>
                                {verificationData.registration_date && (
                                    <div>
                                        <div className="text-xs text-gray-500">Registration Date</div>
                                        <div className="font-medium">{formatDate(verificationData.registration_date)}</div>
                                    </div>
                                )}
                                {verificationData.approval_date && (
                                    <div>
                                        <div className="text-xs text-gray-500">Approval Date</div>
                                        <div className="font-medium">{formatDate(verificationData.approval_date)}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Already Registered Warning */}
                    {verificationData.already_registered && (
                        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30 rounded-lg">
                            <div className="flex items-start gap-2">
                                <Info size={16} className="text-yellow-600 shrink-0 mt-0.5" />
                                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                                    This parcel has already been registered in our system.
                                    {verificationData.property === 'not found'
                                        ? ' No property record exists yet.'
                                        : ' A property record exists.'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#112240] flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
                    >
                        Cancel
                    </button>

                    {!hasIssues && (
                        <>
                            {!verificationData.has_building && !verificationData.has_infrastructure ? (
                                <button
                                    onClick={() => onConfirm(false)}
                                    disabled={isLoading}
                                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium flex items-center gap-2"
                                >
                                    {isLoading ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <CheckCircle2 size={16} />
                                    )}
                                    Add to Map
                                </button>
                            ) : (
                                <button
                                    onClick={() => onConfirm(true)}
                                    disabled={isLoading}
                                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium flex items-center gap-2"
                                >
                                    {isLoading ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <Building2 size={16} />
                                    )}
                                    Add Building Details
                                </button>
                            )}
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

// ============================================================================
// PDF UPLOADER COMPONENT
// ============================================================================

interface PdfUploaderProps {
    onUploadComplete?: (mappingId?: number, verificationData?: VerificationResponse) => void;
    onVerificationComplete?: (data: VerificationResponse) => void;
    onError?: (error: string) => void;
}

function PdfUploader({ onUploadComplete, onVerificationComplete, onError }: PdfUploaderProps) {
    const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentIndex, setCurrentIndex] = useState<number>(-1);
    const [verificationModal, setVerificationModal] = useState<{
        isOpen: boolean;
        data: VerificationResponse | null;
        fileId: string;
    }>({
        isOpen: false,
        data: null,
        fileId: ''
    });
    const [isVerifying, setIsVerifying] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const processingRef = useRef<boolean>(false);

    const uploadStats = {
        total: uploadFiles.length,
        processed: uploadFiles.filter(f => f.status === 'success' || f.status === 'error' || f.status === 'verified').length,
        success: uploadFiles.filter(f => f.status === 'success' || f.status === 'verified').length,
        error: uploadFiles.filter(f => f.status === 'error').length,
        pending: uploadFiles.filter(f => f.status === 'pending').length,
        verified: uploadFiles.filter(f => f.status === 'verified').length,
    };

    const validateFiles = (fileList: File[]): File[] => {
        return fileList.filter(file => {
            if (file.type !== 'application/pdf') {
                alert(`File "${file.name}" is not a PDF. Only PDF files are allowed.`);
                return false;
            }
            if (uploadFiles.some(f => f.name === file.name && f.size === file.size)) {
                alert(`File "${file.name}" already exists in the upload list.`);
                return false;
            }
            return true;
        });
    };

    const handleFiles = (fileList: File[]) => {
        const validFiles = validateFiles(Array.from(fileList));

        const newFiles: UploadFile[] = validFiles.map(file => ({
            id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            file,
            name: file.name,
            size: file.size,
            status: 'pending',
        }));

        setUploadFiles(prev => [...prev, ...newFiles]);
    };

    const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(Array.from(e.dataTransfer.files));
    };

    const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const removeFile = (id: string) => {
        setUploadFiles(prev => prev.filter(f => f.id !== id));
        if (verificationModal.fileId === id) {
            setVerificationModal({ isOpen: false, data: null, fileId: '' });
        }
    };

    const clearAll = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        if (isProcessing) {
            setUploadFiles([]);
            setCurrentIndex(-1);
            setIsProcessing(false);
            processingRef.current = false;
        } else {
            setUploadFiles([]);
            setCurrentIndex(-1);
        }
        setVerificationModal({ isOpen: false, data: null, fileId: '' });
    };

    const removeCompleted = () => {
        setUploadFiles(prev => prev.filter(f => f.status === 'pending' || f.status === 'processing'));
        setVerificationModal({ isOpen: false, data: null, fileId: '' });
    };

    const processFile = async (file: UploadFile, index: number): Promise<void> => {
        abortControllerRef.current = new AbortController();

        setUploadFiles(prev => prev.map((f, i) =>
            i === index ? { ...f, status: 'processing', progress: 0 } : f
        ));

        const formData = new FormData();
        formData.append('file', file.file);

        try {
            let progressInterval: ReturnType<typeof setInterval> | null = null;

            if (!abortControllerRef.current.signal.aborted) {
                progressInterval = setInterval(() => {
                    setUploadFiles(prev => prev.map((f, i) =>
                        i === index && f.status === 'processing'
                            ? { ...f, progress: Math.min((f.progress || 0) + 5, 90) }
                            : f
                    ));
                }, 500);
            }

            // Step 1: Extract PDF
            const extractResponse = await api.post('/api/mappings/extract-pdf', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                signal: abortControllerRef.current.signal,
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total && !abortControllerRef.current?.signal.aborted) {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setUploadFiles(prev => prev.map((f, i) =>
                            i === index ? { ...f, progress: Math.min(percentCompleted, 90) } : f
                        ));
                    }
                },
            });

            if (progressInterval) {
                clearInterval(progressInterval);
            }

            if (abortControllerRef.current?.signal.aborted) {
                return;
            }

            const extractData = extractResponse.data;
            const mappingId = extractData.id;

            // Step 2: Verify the extracted data
            const verifyFormData = new FormData();
            verifyFormData.append('file', file.file);

            const verifyResponse = await api.post('/api/mappings/verify-pdf', verifyFormData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                signal: abortControllerRef.current.signal,
            });

            if (abortControllerRef.current?.signal.aborted) {
                return;
            }

            const verificationData: VerificationResponse = verifyResponse.data;

            // Update file with success and verification data
            setUploadFiles(prev => prev.map((f, i) =>
                i === index ? {
                    ...f,
                    status: 'verified',
                    progress: 100,
                    result: verificationData,
                    mappingId: mappingId
                } : f
            ));

            // Show verification modal for this file
            setVerificationModal({
                isOpen: true,
                data: verificationData,
                fileId: file.id
            });

            onVerificationComplete?.(verificationData);

            // Process next file
            const nextPendingIndex = uploadFiles.findIndex(
                (f, idx) => idx > index && f.status === 'pending'
            );

            if (nextPendingIndex !== -1) {
                setCurrentIndex(nextPendingIndex);
                await processFile(uploadFiles[nextPendingIndex], nextPendingIndex);
            } else {
                setIsProcessing(false);
                processingRef.current = false;
                setCurrentIndex(-1);
                abortControllerRef.current = null;
            }

        } catch (error: any) {
            console.error(`Error processing ${file.name}:`, error);

            if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
                return;
            }

            setUploadFiles(prev => prev.map((f, i) =>
                i === index
                    ? {
                        ...f,
                        status: 'error',
                        error: error.response?.data?.detail || error.message || "Processing failed",
                        progress: undefined,
                    }
                    : f
            ));

            const nextPendingIndex = uploadFiles.findIndex(
                (f, idx) => idx > index && f.status === 'pending'
            );

            if (nextPendingIndex !== -1) {
                setCurrentIndex(nextPendingIndex);
                await processFile(uploadFiles[nextPendingIndex], nextPendingIndex);
            } else {
                setIsProcessing(false);
                processingRef.current = false;
                setCurrentIndex(-1);
                abortControllerRef.current = null;
            }
        }
    };

    const startProcessing = async () => {
        if (uploadFiles.length === 0) return;
        if (isProcessing || processingRef.current) return;

        const firstPendingIndex = uploadFiles.findIndex(f => f.status === 'pending');
        if (firstPendingIndex === -1) return;

        setIsProcessing(true);
        processingRef.current = true;
        setCurrentIndex(firstPendingIndex);

        await processFile(uploadFiles[firstPendingIndex], firstPendingIndex);
    };

    const retryFailed = async () => {
        const failedFiles = uploadFiles.filter(f => f.status === 'error');
        if (failedFiles.length === 0) return;

        setUploadFiles(prev => prev.map(f =>
            f.status === 'error' ? { ...f, status: 'pending', progress: undefined, error: undefined } : f
        ));

        if (!isProcessing && !processingRef.current) {
            const firstPendingIndex = uploadFiles.findIndex(f => f.status === 'pending');
            if (firstPendingIndex !== -1) {
                setIsProcessing(true);
                processingRef.current = true;
                setCurrentIndex(firstPendingIndex);
                await processFile(uploadFiles[firstPendingIndex], firstPendingIndex);
            }
        }
    };

    const stopProcessing = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        setIsProcessing(false);
        processingRef.current = false;
        setCurrentIndex(-1);

        setUploadFiles(prev => prev.map(f =>
            f.status === 'processing' ? { ...f, status: 'pending', progress: undefined } : f
        ));
    };

    const handleVerificationConfirm = async (hasBuildingOrInfra: boolean) => {
        if (!verificationModal.data || !verificationModal.fileId) return;
        hasBuildingOrInfra ? "" : ""

        setIsVerifying(true);

        try {
            // Find the file
            const file = uploadFiles.find(f => f.id === verificationModal.fileId);
            if (!file) return;

            const data = verificationModal.data;

            // Check for blocking conditions
            if (data.under_mortgage || data.has_caveat || data.in_transaction || data.overlaps) {
                alert('This parcel cannot be listed due to mortgage, caveat, active transaction, or overlap.');
                setVerificationModal({ isOpen: false, data: null, fileId: '' });
                setIsVerifying(false);
                return;
            }

            // Close modal
            setVerificationModal({ isOpen: false, data: null, fileId: '' });

            // Update file status to success
            setUploadFiles(prev => prev.map(f =>
                f.id === verificationModal.fileId
                    ? { ...f, status: 'success' }
                    : f
            ));

            // Call onUploadComplete with mappingId and verification data
            onUploadComplete?.(file.mappingId, data);

        } catch (error) {
            console.error('Error in verification confirmation:', error);
            onError?.('Failed to process verification');
        } finally {
            setIsVerifying(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success':
                return <CheckCircle2 size={20} className="text-green-500" />;
            case 'verified':
                return <CheckCheck size={20} className="text-blue-500" />;
            case 'error':
                return <AlertCircle size={20} className="text-red-500" />;
            case 'processing':
                return <Loader2 size={20} className="animate-spin text-blue-500" />;
            default:
                return <Clock size={20} className="text-gray-400" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'success': return 'bg-green-50 border-green-200';
            case 'verified': return 'bg-blue-50 border-blue-200';
            case 'error': return 'bg-red-50 border-red-200';
            case 'processing': return 'bg-blue-50 border-blue-200';
            default: return 'bg-gray-50 border-gray-200';
        }
    };

    return (
        <>
            <div className="bg-white dark:bg-[#0a162e] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-primary)' }}>
                    Upload PDF Title Deeds
                </h3>

                {/* Upload Stats */}
                {uploadFiles.length > 0 && (
                    <div className="grid grid-cols-5 gap-4 mb-4">
                        <div className="bg-gray-50 dark:bg-[#112240] p-3 rounded-lg">
                            <div className="text-xs text-gray-500">Total</div>
                            <div className="text-lg font-semibold">{uploadStats.total}</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-[#112240] p-3 rounded-lg">
                            <div className="text-xs text-gray-500">Processed</div>
                            <div className="text-lg font-semibold text-blue-600">{uploadStats.processed}</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-[#112240] p-3 rounded-lg">
                            <div className="text-xs text-gray-500">Verified</div>
                            <div className="text-lg font-semibold text-blue-600">{uploadStats.verified}</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-[#112240] p-3 rounded-lg">
                            <div className="text-xs text-gray-500">Success</div>
                            <div className="text-lg font-semibold text-green-600">{uploadStats.success}</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-[#112240] p-3 rounded-lg">
                            <div className="text-xs text-gray-500">Failed</div>
                            <div className="text-lg font-semibold text-red-600">{uploadStats.error}</div>
                        </div>
                    </div>
                )}

                {/* Drop Zone */}
                <div
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={clsx(
                        'border-2 border-dashed rounded-lg p-8 mb-4 text-center cursor-pointer transition-colors duration-200',
                        isDragging
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'
                            : 'border-gray-300 dark:border-gray-700 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-white/5'
                    )}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onChange={(e) => handleFiles(Array.from(e.target.files || []))}
                    />
                    <ArrowUpCircle
                        size={48}
                        className={clsx(
                            'mx-auto mb-3',
                            isDragging ? 'text-blue-500' : 'text-gray-400'
                        )}
                    />
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {isDragging ? 'Drop your PDFs here' : 'Drag & drop PDF files or click to browse'}
                    </p>
                    <p className="text-xs text-gray-500">
                        Only PDF files are accepted. Each PDF will be verified against the registry.
                    </p>
                </div>

                {/* Upload Actions */}
                {uploadFiles.length > 0 && (
                    <div className="flex gap-2 mb-4 flex-wrap">
                        {!isProcessing ? (
                            <button
                                onClick={startProcessing}
                                disabled={uploadStats.pending === 0}
                                className={clsx(
                                    'px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5',
                                    uploadStats.pending === 0
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                )}
                            >
                                <Upload size={14} />
                                Process ({uploadStats.pending})
                            </button>
                        ) : (
                            <button
                                onClick={stopProcessing}
                                className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1.5"
                            >
                                <X size={14} />
                                Stop Processing
                            </button>
                        )}

                        {uploadStats.error > 0 && !isProcessing && (
                            <button
                                onClick={retryFailed}
                                className="px-3 py-1.5 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700 flex items-center gap-1.5"
                            >
                                <AlertCircle size={14} />
                                Retry Failed ({uploadStats.error})
                            </button>
                        )}

                        <button
                            onClick={removeCompleted}
                            disabled={isProcessing}
                            className="px-3 py-1.5 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 flex items-center gap-1.5"
                        >
                            <CheckCircle2 size={14} />
                            Clear Completed
                        </button>

                        <button
                            onClick={clearAll}
                            disabled={isProcessing}
                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1.5 ml-auto"
                        >
                            <Trash2 size={14} />
                            Clear All
                        </button>
                    </div>
                )}

                {/* File List */}
                {uploadFiles.length > 0 && (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                        {uploadFiles.map((file, index) => (
                            <motion.div
                                key={file.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className={clsx(
                                    'border rounded-lg overflow-hidden',
                                    getStatusColor(file.status),
                                    index === currentIndex && 'ring-2 ring-blue-400'
                                )}
                            >
                                <div className="p-3">
                                    <div className="flex items-start gap-2">
                                        <div className="flex-shrink-0 mt-0.5">
                                            <FileText size={18} className="text-gray-500" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                                                    {file.name}
                                                </span>
                                                {index === currentIndex && (
                                                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded-full">
                                                        Processing
                                                    </span>
                                                )}
                                                {file.status === 'verified' && (
                                                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded-full">
                                                        Verified
                                                    </span>
                                                )}
                                                {file.status === 'success' && (
                                                    <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] rounded-full">
                                                        Complete
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                                                <span>{formatFileSize(file.size)}</span>
                                                <span className="flex items-center gap-1">
                                                    {getStatusIcon(file.status)}
                                                    <span className="capitalize">
                                                        {file.status === 'verified' ? 'Awaiting confirmation' : file.status}
                                                    </span>
                                                </span>
                                            </div>

                                            {file.progress !== undefined && (
                                                <div className="mt-1.5">
                                                    <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-blue-600 rounded-full transition-all duration-300"
                                                            style={{ width: `${file.progress}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] text-gray-500 mt-0.5">
                                                        {file.progress}% complete
                                                    </span>
                                                </div>
                                            )}

                                            {file.error && (
                                                <div className="mt-1.5 text-xs text-red-600 bg-red-50 dark:bg-red-900/10 p-1.5 rounded">
                                                    <FileWarning size={12} className="inline mr-1" />
                                                    {file.error}
                                                </div>
                                            )}

                                            {file.result && (
                                                <div className="mt-2 text-xs">
                                                    <div className="font-mono text-primary">
                                                        UPI: {file.result.upi}
                                                    </div>
                                                    <div className="text-gray-500">
                                                        {file.result.full_address}
                                                    </div>
                                                    {file.result.overlaps && (
                                                        <div className="mt-1 text-red-600 flex items-center gap-1">
                                                            <AlertOctagon size={12} />
                                                            Overlap detected
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => removeFile(file.id)}
                                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors text-red-600"
                                            disabled={file.status === 'processing'}
                                            title="Remove"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Verification Modal */}
            <VerificationModal
                isOpen={verificationModal.isOpen}
                onClose={() => setVerificationModal({ isOpen: false, data: null, fileId: '' })}
                verificationData={verificationModal.data}
                onConfirm={handleVerificationConfirm}
                onCancel={() => setVerificationModal({ isOpen: false, data: null, fileId: '' })}
                isLoading={isVerifying}
            />
        </>
    );
}

// ============================================================================
// MAPPINGS LIST COMPONENT
// ============================================================================

interface MappingsListProps {
    onSelectMapping?: (mapping: Mapping) => void;
    onRefresh?: () => void;
    onCreateProperty?: (mapping: Mapping) => void;
    onViewOnMap?: (mapping: Mapping) => void;
    onViewDetails?: (mapping: Mapping) => void;
}

function MappingsList({ onSelectMapping: _onSelectMapping, onRefresh, onCreateProperty, onViewOnMap, onViewDetails }: MappingsListProps) {
    const [mappings, setMappings] = useState<Mapping[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingMarketId, setEditingMarketId] = useState<number | null>(null);
    const [marketForm, setMarketForm] = useState<{ for_sale: boolean; price: string }>({
        for_sale: false,
        price: '',
    });
    const [savingMarketId, setSavingMarketId] = useState<number | null>(null);
    const [marketError, setMarketError] = useState<string | null>(null);

    const startEditMarket = (mapping: Mapping) => {
        setMarketError(null);
        setEditingMarketId(mapping.id);
        setMarketForm({
            for_sale: Boolean(mapping.for_sale),
            price: mapping.price != null ? String(mapping.price) : '',
        });
    };

    const cancelEditMarket = () => {
        setEditingMarketId(null);
        setMarketError(null);
        setMarketForm({ for_sale: false, price: '' });
    };

    const saveMarket = async (mapping: Mapping) => {
        try {
            setMarketError(null);
            setSavingMarketId(mapping.id);

            let payloadPrice: number | null = null;
            if (marketForm.for_sale) {
                const parsed = Number((marketForm.price || '').replace(/,/g, '').trim());
                if (!Number.isFinite(parsed) || parsed <= 0) {
                    setMarketError('Enter a valid price greater than 0 for parcels listed for sale.');
                    return;
                }
                payloadPrice = parsed;
            }

            const response = await api.patch(
                `/api/mappings/upi/${encodeURIComponent(mapping.upi)}/market-status`,
                {
                    for_sale: marketForm.for_sale,
                    price: marketForm.for_sale ? payloadPrice : null,
                }
            );

            const updated = response.data;
            setMappings((prev) => prev.map((m) =>
                m.id === mapping.id
                    ? {
                        ...m,
                        for_sale: updated.for_sale,
                        price: updated.price,
                    }
                    : m
            ));

            setEditingMarketId(null);
        } catch (err: any) {
            console.error('Failed to update market status:', err);
            setMarketError(err.response?.data?.detail || 'Failed to update market status');
        } finally {
            setSavingMarketId(null);
        }
    };

    const fetchMappings = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/api/mappings/my-mappings');
            const data = response.data.map((item: any) => ({
                ...item,
                property_status: item.property_id ? 'draft' : null
            }));
            setMappings(data);
        } catch (err: any) {
            console.error('Failed to fetch mappings:', err);
            setError(err.response?.data?.message || 'Failed to load mappings');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMappings();
    }, [fetchMappings]);

    const filteredMappings = useMemo(() => {
        if (!searchQuery.trim()) return mappings;
        const query = searchQuery.toLowerCase();
        return mappings.filter(m =>
            m.upi.toLowerCase().includes(query) ||
            m.district.toLowerCase().includes(query) ||
            m.sector.toLowerCase().includes(query) ||
            m.cell.toLowerCase().includes(query)
        );
    }, [mappings, searchQuery]);

    const handleRefresh = () => {
        fetchMappings();
        onRefresh?.();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 size={40} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-[#0a162e] rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold">My Mappings</h3>
                    <p className="text-xs text-gray-500 mt-1">
                        {filteredMappings.length} parcels mapped
                    </p>
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search mappings..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <button
                        onClick={handleRefresh}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw size={18} className="text-gray-600 dark:text-gray-400" />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-[#112240] border-b border-gray-200 dark:border-gray-700">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">UPI</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Land Use</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Area</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredMappings.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                                    No mappings found. Upload a PDF to get started.
                                </td>
                            </tr>
                        ) : (
                            filteredMappings.map((mapping) => (
                                <tr
                                    key={mapping.id}
                                    className={clsx(
                                        'hover:bg-gray-50 dark:hover:bg-white/5 transition-colors',
                                        mapping.overlaps && 'bg-red-50/50 dark:bg-red-900/10'
                                    )}
                                >
                                    <td className="px-4 py-3">
                                        <div className="font-mono text-sm font-medium flex items-center gap-2">
                                            {mapping.overlaps && (
                                                <AlertOctagon size={14} className="text-red-500" />
                                            )}
                                            {mapping.upi}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-sm">
                                            <div>{mapping.village}, {mapping.cell}</div>
                                            <div className="text-xs text-gray-500">{mapping.sector}, {mapping.district}</div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm">{mapping.land_use_type}</td>
                                    <td className="px-4 py-3 text-sm">{mapping.parcel_area_sqm.toLocaleString()} m²</td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-1 flex-wrap">
                                            {mapping.overlaps && (
                                                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                                    Overlap
                                                </span>
                                            )}
                                            {mapping.under_mortgage && (
                                                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">
                                                    Mortgage
                                                </span>
                                            )}
                                            {mapping.has_caveat && (
                                                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                                                    Caveat
                                                </span>
                                            )}
                                            {mapping.in_transaction && (
                                                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">
                                                    In Transaction
                                                </span>
                                            )}
                                            {!mapping.under_mortgage && !mapping.has_caveat && !mapping.in_transaction && !mapping.overlaps && (
                                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                                                    Clear
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm">{mapping.year_of_record}</td>
                                    <td className="px-4 py-3">
                                        {mapping.property_id ? (
                                            <span className={clsx(
                                                "px-2 py-1 rounded-full text-xs",
                                                mapping.property_status === 'published'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-yellow-100 text-yellow-700'
                                            )}>
                                                {mapping.property_status === 'published' ? 'Published' : 'Draft'}
                                            </span>
                                        ) : (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onCreateProperty?.(mapping);
                                                }}
                                                className="px-2 py-1 bg-primary text-white rounded-lg text-xs hover:bg-primary/90 transition-colors flex items-center gap-1"
                                            >
                                                <Plus size={12} />
                                                Create
                                            </button>
                                        )}

                                        {!mapping.property_id && (
                                            <div className="mt-2 space-y-2">
                                                <div className="text-xs">
                                                    {mapping.for_sale ? (
                                                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">
                                                            For sale {mapping.price ? `• ${Number(mapping.price).toLocaleString()} RWF` : ''}
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                                                            Not for sale
                                                        </span>
                                                    )}
                                                </div>

                                                {editingMarketId === mapping.id ? (
                                                    <div className="space-y-2">
                                                        <select
                                                            value={marketForm.for_sale ? 'yes' : 'no'}
                                                            onChange={(e) =>
                                                                setMarketForm((prev) => ({
                                                                    ...prev,
                                                                    for_sale: e.target.value === 'yes',
                                                                }))
                                                            }
                                                            className="w-full px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded"
                                                        >
                                                            <option value="no">Not for sale</option>
                                                            <option value="yes">For sale</option>
                                                        </select>

                                                        {marketForm.for_sale && (
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                step="1"
                                                                placeholder="Price (RWF)"
                                                                value={marketForm.price}
                                                                onChange={(e) =>
                                                                    setMarketForm((prev) => ({ ...prev, price: e.target.value }))
                                                                }
                                                                className="w-full px-2 py-1 text-xs border border-gray-200 dark:border-gray-700 rounded"
                                                            />
                                                        )}

                                                        {marketError && (
                                                            <p className="text-[11px] text-red-600">{marketError}</p>
                                                        )}

                                                        <div className="flex gap-1">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    saveMarket(mapping);
                                                                }}
                                                                disabled={savingMarketId === mapping.id}
                                                                className="px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary/90 disabled:opacity-60"
                                                            >
                                                                {savingMarketId === mapping.id ? 'Saving...' : 'Save'}
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    cancelEditMarket();
                                                                }}
                                                                className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            startEditMarket(mapping);
                                                        }}
                                                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                                    >
                                                        Update market
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onViewDetails?.(mapping);
                                                }}
                                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                                                title="View Details"
                                            >
                                                <Eye size={16} className="text-gray-600 dark:text-gray-400" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onViewOnMap?.(mapping);
                                                }}
                                                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                                                title="View on Map"
                                            >
                                                <Map size={16} className="text-gray-600 dark:text-gray-400" />
                                            </button>
                                            {mapping.property_id && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // View property
                                                    }}
                                                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                                                    title="View Property"
                                                >
                                                    <Building2 size={16} className="text-gray-600 dark:text-gray-400" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ============================================================================
// MAP VIEW COMPONENT
// ============================================================================

interface MapViewProps {
    parcels: ParcelWithGeometry[];
    onParcelClick?: (parcel: ParcelWithGeometry) => void;
    onCreateProperty?: (parcel: ParcelWithGeometry) => void;
    onViewDetails?: (parcel: ParcelWithGeometry) => void;
    selectedParcelId?: number | null;
    onParcelSelect?: (parcel: ParcelWithGeometry | null) => void;
}

function MapView({ parcels, onParcelClick, onCreateProperty, onViewDetails, selectedParcelId, onParcelSelect }: MapViewProps) {
    const [mapStyle, setMapStyle] = useState<"osm" | "satellite" | "dark">("osm");
    const [selectedParcel, setSelectedParcel] = useState<ParcelWithGeometry | null>(
        selectedParcelId ? parcels.find(p => p.id === selectedParcelId) || null : null
    );
    const [isFullscreen, setIsFullscreen] = useState(false);
    const mapContainerRef = useRef<HTMLDivElement>(null);

    const defaultCenter: [number, number] = parcels.length > 0
        ? parcels[0].center
        : [-1.9403, 29.8739]; // Rwanda center

    useEffect(() => {
        if (selectedParcelId) {
            const parcel = parcels.find(p => p.id === selectedParcelId);
            setSelectedParcel(parcel || null);
        }
    }, [selectedParcelId, parcels]);

    const getTileLayer = () => {
        switch (mapStyle) {
            case "satellite":
                return "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
            case "dark":
                return "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png";
            default:
                return "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
        }
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            mapContainerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const handleParcelClick = (parcel: ParcelWithGeometry) => {
        setSelectedParcel(parcel);
        onParcelSelect?.(parcel);
        onParcelClick?.(parcel);
    };

    return (
        <div
            ref={mapContainerRef}
            className="bg-white dark:bg-[#0a162e] rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden relative"
            style={{ height: '690px' }}
        >
            {/* Map Controls */}
            <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
                <div className="bg-white dark:bg-[#112240] rounded-lg shadow-lg overflow-hidden">
                    <button
                        onClick={() => setMapStyle('osm')}
                        className={clsx(
                            'w-10 h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                            mapStyle === 'osm' ? 'text-primary' : 'text-gray-600 dark:text-gray-400'
                        )}
                        title="Street Map"
                    >
                        <Map size={18} />
                    </button>
                    <button
                        onClick={() => setMapStyle('satellite')}
                        className={clsx(
                            'w-10 h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-t border-gray-200 dark:border-gray-700',
                            mapStyle === 'satellite' ? 'text-primary' : 'text-gray-600 dark:text-gray-400'
                        )}
                        title="Satellite"
                    >
                        <Satellite size={18} />
                    </button>
                    <button
                        onClick={() => setMapStyle('dark')}
                        className={clsx(
                            'w-10 h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-t border-gray-200 dark:border-gray-700',
                            mapStyle === 'dark' ? 'text-primary' : 'text-gray-600 dark:text-gray-400'
                        )}
                        title="Dark Mode"
                    >
                        <Moon size={18} />
                    </button>
                </div>
                <button
                    onClick={toggleFullscreen}
                    className="w-10 h-10 bg-white dark:bg-[#112240] rounded-lg shadow-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                >
                    {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
            </div>

            {/* Legend */}
            <div className="absolute top-4 left-4 z-[1000] bg-white dark:bg-[#112240] rounded-lg shadow-lg p-3">
                <h4 className="text-xs font-bold mb-2">Legend</h4>
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-[#10B981] opacity-25 border-2 border-[#10B981]" />
                        <span className="text-xs">Has Property (Green)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-[#3B82F6] opacity-25 border-2 border-[#3B82F6]" />
                        <span className="text-xs">Mapped (Blue)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-[#F59E0B] opacity-25 border-2 border-[#F59E0B]" />
                        <span className="text-xs">Has Issues (Orange)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-[#EF4444] opacity-25 border-2 border-[#EF4444] border-dashed" />
                        <span className="text-xs">Overlap (Red Dashed)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-[#6366F1] opacity-50 border-2 border-[#6366F1]" />
                        <span className="text-xs">Selected (Purple)</span>
                    </div>
                </div>
            </div>

            {/* Parcel Count */}
            <div className="absolute top-4 left-48 z-[1000] bg-white dark:bg-[#112240] rounded-lg shadow-lg px-3 py-2">
                <span className="text-sm font-medium">
                    {parcels.length} Parcel{parcels.length !== 1 ? 's' : ''} on Map
                </span>
            </div>

            {/* Map Container */}
            <MapContainer
                center={defaultCenter}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
                scrollWheelZoom={true}
            >
                <TileLayer
                    url={getTileLayer()}
                    maxZoom={22}
                />

                {mapStyle === 'satellite' && (
                    <WMSTileLayer
                        url="https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/WMTS"
                        layers="World_Imagery"
                        format="image/jpeg"
                        transparent={false}
                    />
                )}

                <ZoomControl position="bottomright" />
                <ScaleControl position="bottomleft" metric={true} imperial={false} />

                {/* Render all parcels */}
                {parcels.map((parcel) => (
                    <PolygonWithLabel
                        key={parcel.id}
                        parcel={parcel}
                        isSelected={selectedParcel?.id === parcel.id}
                        onClick={() => handleParcelClick(parcel)}
                    />
                ))}

                {/* Auto-center on first parcel if available */}
                {parcels.length > 0 && !selectedParcel && (
                    <MapController center={parcels[0].center} zoom={16} />
                )}

                {/* Center on selected parcel */}
                {selectedParcel && (
                    <MapController center={selectedParcel.center} zoom={18} />
                )}
            </MapContainer>

            {/* Selected Parcel Info Panel */}
            {selectedParcel && (
                <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-[1000] bg-white dark:bg-[#112240] rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-primary truncate">{selectedParcel.upi}</h4>
                        <button
                            onClick={() => {
                                setSelectedParcel(null);
                                onParcelSelect?.(null);
                            }}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                            <X size={14} />
                        </button>
                    </div>
                    <div className="space-y-2 text-sm">
                        <p><span className="font-medium">Area:</span> {formatArea(selectedParcel.area)}</p>
                        <p><span className="font-medium">Land Use:</span> {selectedParcel.land_use_type}</p>
                        <p><span className="font-medium">Location:</span> {selectedParcel.village}, {selectedParcel.cell}</p>
                        <div className="flex gap-1 flex-wrap">
                            {selectedParcel.overlaps && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                    Overlap
                                </span>
                            )}
                            {selectedParcel.under_mortgage && (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">
                                    Mortgage
                                </span>
                            )}
                            {selectedParcel.has_caveat && (
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                                    Caveat
                                </span>
                            )}
                            {selectedParcel.in_transaction && (
                                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs">
                                    In Transaction
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={() => onViewDetails?.(selectedParcel)}
                                className="flex-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-1"
                            >
                                <Eye size={12} />
                                Details
                            </button>
                            {!selectedParcel.property_id && !selectedParcel.overlaps && !selectedParcel.under_mortgage && !selectedParcel.has_caveat && !selectedParcel.in_transaction && (
                                <button
                                    onClick={() => onCreateProperty?.(selectedParcel)}
                                    className="flex-1 px-3 py-1.5 bg-primary text-white rounded-lg text-xs hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
                                >
                                    <Plus size={12} />
                                    Create
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// MAIN SELL PROPERTY COMPONENT
// ============================================================================

interface SellPropertyProps {
    onComplete?: () => void;
}

export default function SellProperty({ onComplete }: SellPropertyProps) {
    const [activeTab, setActiveTab] = useState<TabType['id']>(() => {
        const saved = localStorage.getItem("activeView_tab");
        const validTabs: TabType['id'][] = ['upload', 'mappings', 'map'];
        return (saved && validTabs.includes(saved as TabType['id'])) ? (saved as TabType['id']) : 'upload';
    });
    const [isCreatingProperty, setIsCreatingProperty] = useState(false);
    const [selectedUpi, setSelectedUpi] = useState<string | null>(null);
    const [selectedMappingId, setSelectedMappingId] = useState<number | null>(null);
    const [refreshMappings, setRefreshMappings] = useState(0);
    const [parcels, setParcels] = useState<ParcelWithGeometry[]>([]);
    const [hasParcels, setHasParcels] = useState(false);
    const [selectedParcelId, setSelectedParcelId] = useState<number | null>(null);
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [selectedParcelForDetails, setSelectedParcelForDetails] = useState<ParcelWithGeometry | null>(null);

    const tabs: TabType[] = [
        { id: 'upload', label: 'Sell Parcel', icon: Upload },
        { id: 'mappings', label: 'My Mappings', icon: Database },
        { id: 'map', label: 'Map View', icon: Globe },
    ];

    // Load all user's mappings for the map
    const loadMappingsForMap = useCallback(async () => {
        try {
            const response = await api.get('/api/mappings/my-mappings');
            const mappings = response.data;

            const parsedParcels: ParcelWithGeometry[] = mappings
                .filter((m: any) => m.official_registry_polygon) // Only include parcels with geometry
                .map((m: any) => {
                    try {
                        const geo = wk.parse(m.official_registry_polygon) as any;
                        if (!geo || !geo.coordinates) return null;

                        const coords = geo.type === 'MultiPolygon' ? geo.coordinates[0][0] : geo.coordinates[0];
                        const positions = coords.map(([lng, lat]: [number, number]) => [lat, lng]);
                        const center = getCenter(positions);

                        return {
                            id: m.id,
                            upi: m.upi,
                            positions,
                            center,
                            color: m.overlaps ? '#EF4444' :
                                m.under_mortgage || m.has_caveat || m.in_transaction ? '#F59E0B' :
                                    m.property_id ? '#10B981' : '#3B82F6',
                            area: m.parcel_area_sqm,
                            land_use_type: m.land_use_type,
                            district: m.district,
                            sector: m.sector,
                            cell: m.cell,
                            village: m.village,
                            under_mortgage: m.under_mortgage,
                            has_caveat: m.has_caveat,
                            in_transaction: m.in_transaction,
                            overlaps: m.overlaps || false,
                            property_id: m.property_id,
                            property_status: m.property_id ? 'draft' : null,
                            created_at: m.created_at,
                        };
                    } catch (e) {
                        console.error('Failed to parse polygon for mapping', m.id, e);
                        return null;
                    }
                })
                .filter(Boolean);

            setParcels(parsedParcels);
            setHasParcels(parsedParcels.length > 0);

            // If user has parcels and is on map tab but map tab becomes hidden, switch to upload
            if (parsedParcels.length === 0 && activeTab === 'map') {
                setActiveTab('upload');
            }
        } catch (err) {
            console.error('Failed to load mappings for map:', err);
        }
    }, [activeTab]);

    // Load mappings when component mounts
    useEffect(() => {
        loadMappingsForMap();
    }, [loadMappingsForMap]);

    const handleUploadComplete = (mappingId?: number, verificationData?: VerificationResponse) => {
        console.log(mappingId)
        // Refresh mappings list and map parcels
        setRefreshMappings(prev => prev + 1);
        loadMappingsForMap();

        // Show success message
        if (verificationData) {
            alert(`Parcel ${verificationData.upi} successfully added! You can now view it on the map.`);

            // Auto-switch to map tab if parcels exist
            if (hasParcels) {
                setActiveTab('map');
            }
        }
    };

    const handleCreateProperty = (mapping: Mapping) => {
        setSelectedUpi(mapping.upi);
        setSelectedMappingId(mapping.id);
        setIsCreatingProperty(true);
    };

    const handleCreateFromMap = (parcel: ParcelWithGeometry) => {
        setSelectedUpi(parcel.upi);
        setSelectedMappingId(parcel.id);
        setIsCreatingProperty(true);
    };

    const handlePropertyCreated = () => {
        setIsCreatingProperty(false);
        setSelectedUpi(null);
        setSelectedMappingId(null);
        setRefreshMappings(prev => prev + 1);
        loadMappingsForMap(); // Refresh map with updated property status
        onComplete?.();
    };

    const handleCancelPropertyCreation = () => {
        setIsCreatingProperty(false);
        setSelectedUpi(null);
        setSelectedMappingId(null);
    };

    const handleViewOnMap = (mapping: Mapping) => {
        setSelectedParcelId(mapping.id);
        setActiveTab('map');
    };

    const handleViewDetails = (mapping: Mapping) => {
        // Find the parcel with geometry
        const parcel = parcels.find(p => p.id === mapping.id);
        if (parcel) {
            setSelectedParcelForDetails(parcel);
            setDetailsModalOpen(true);
        }
    };

    const handleViewDetailsFromMap = (parcel: ParcelWithGeometry) => {
        setSelectedParcelForDetails(parcel);
        setDetailsModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#050c1a] p-6">
            <div className="max-w-full mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Landmark size={24} className="text-primary" />
                        Sell Property
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Upload your title deed, verify the parcel, and create a property listing.
                    </p>
                </div>

                {/* Tabs - Show all tabs, but map tab is disabled if no parcels */}
                <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isDisabled = tab.id === 'map' && !hasParcels;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => !isDisabled && setActiveTab(tab.id)}
                                disabled={isDisabled}
                                className={clsx(
                                    'px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors',
                                    activeTab === tab.id
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300',
                                    isDisabled && 'opacity-50 cursor-not-allowed'
                                )}
                                title={isDisabled ? 'Upload a parcel first to view the map' : ''}
                            >
                                <Icon size={16} />
                                {tab.label}
                                {tab.id === 'map' && hasParcels && (
                                    <span className="ml-1 px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] rounded-full">
                                        {parcels.length}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Tab Content */}
                <AnimatePresence mode="wait">
                    {activeTab === 'upload' && (
                        <motion.div
                            key="upload"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <PdfUploader
                                onUploadComplete={handleUploadComplete}
                                onError={(error) => console.error('Upload error:', error)}
                            />
                        </motion.div>
                    )}

                    {activeTab === 'mappings' && (
                        <motion.div
                            key="mappings"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <MappingsList
                                key={refreshMappings}
                                onCreateProperty={handleCreateProperty}
                                onViewOnMap={handleViewOnMap}
                                onViewDetails={handleViewDetails}
                                onSelectMapping={(mapping) => {
                                    console.log('Selected mapping:', mapping);
                                }}
                            />
                        </motion.div>
                    )}

                    {activeTab === 'map' && hasParcels && (
                        <motion.div
                            key="map"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <MapView
                                parcels={parcels}
                                onCreateProperty={handleCreateFromMap}
                                onViewDetails={handleViewDetailsFromMap}
                                selectedParcelId={selectedParcelId}
                                onParcelSelect={(parcel) => setSelectedParcelId(parcel?.id || null)}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Property Creation Modal */}
                <AnimatePresence>
                    {isCreatingProperty && (
                        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCancelPropertyCreation} />
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                                className="relative bg-white dark:bg-[#0f1f3a] rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl"
                            >
                                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#112240] flex justify-between items-center">
                                    <div>
                                        <h3 className="text-lg font-bold">Create Property Listing</h3>
                                        {selectedUpi && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                UPI: <span className="font-mono">{selectedUpi}</span>
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={handleCancelPropertyCreation}
                                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                                <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
                                    <RecordPropertyPage
                                        initialUpi={selectedUpi || undefined}
                                        mappingId={selectedMappingId || undefined}
                                        onSuccess={handlePropertyCreated}
                                    />
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Parcel Details Modal */}
                <AnimatePresence>
                    {detailsModalOpen && selectedParcelForDetails && (
                        <ParcelDetailsModal
                            isOpen={detailsModalOpen}
                            onClose={() => setDetailsModalOpen(false)}
                            parcel={selectedParcelForDetails}
                            onCreateProperty={handleCreateFromMap}
                        />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}