import * as wk from "wellknown";
import * as turf from "@turf/turf";
import {
    MapContainer,
    TileLayer,
    Polygon,
    Marker,
    Tooltip,
    useMap,
    WMSTileLayer,
    ZoomControl,
    ScaleControl,
    useMapEvents,
    Popup,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    ChevronLeft,
    ChevronRight,
    Map as MapIcon,
    Satellite,
    Moon,
    Filter,
    Navigation,
    Layers,
    GripHorizontal,
    Loader2,
    RefreshCw,
    MapPin,
    Info,
    Heart,
    Globe,
    Film,
    AlertCircle,
    CheckCircle2,
    Menu,
    User,
    Users,
    UserRound,
    UserCog,
    UserCircle,
    UserMinus,
    HeartHandshake,
} from "lucide-react";
import L from "leaflet";
import api from "../../instance/mainAxios";

// Fix for default markers in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Types
interface ParcelStatus {
    inTransaction: boolean;
    underMortgage: boolean;
    hasCaveat: boolean;
    isProvisional?: boolean;
    area?: number;
    status?: string;
    isPublished?: boolean;
}

interface Owner {
    fullName: string;
    sharePercentage?: string;
    idNo?: string;
    partyId?: string;
    idTypeName?: string;
    countryName?: string;
    gender?: string;
    maritalStatus?: string;
}

interface Representative {
    foreNames: string;
    surname: string;
    idNo?: string;
    idTypeName?: string;
    countryName?: string;
    gender?: string;
    maritalStatus?: string;
    address?: {
        village?: { villageName: string };
        cell?: { cellName: string };
        sector?: { sectorName: string };
        district?: { districtName: string };
        province?: { provinceName: string };
    };
}

interface PlannedLandUse {
    upi: string;
    landUseName: string;
    area?: number;
}

interface ValuationValue {
    minPrice?: string;
    maxPrice?: string;
}

interface PropertyImage {
    id: number;
    property_id: number;
    category: string;
    file_path: string;
    file_type: string;
    uploaded_at: string;
}

interface Category {
    id: number;
    name: string;
    label: string;
    icon: string | null;
}

interface Subcategory {
    id: number;
    category_id: number;
    name: string;
    label: string;
}

interface UploadedBy {
    user: {
        id: number;
        first_name: string;
        last_name: string;
        email: string;
        avatar: string;
        role: string[];
    };
}

interface PropertyDetails {
    condition?: string;
    built_area?: string;
    building_type?: string;
    floors?: string;
    roof_type?: string;
    roof_material?: string;
    wall_material?: string;
    floor_material?: string;
    under_construction?: string;
    construction_year?: string;
    units?: string;
    bedrooms?: string;
    sitting_rooms?: string;
    bathrooms?: string;
    store_rooms?: string;
    kitchen?: string;
    other_rooms?: string;
    hasCaveat?: boolean;
    underMortgage?: boolean;
    inTransaction?: boolean;
    isProvisional?: boolean;
    hasBuilding?: boolean;
    hasInfrastructure?: boolean;
    parcelCoordinates?: {
        lat: number;
        lon: number;
    };
}

interface ParcelInformation {
    upi: string;
    size: number;
    landUseNameEnglish?: string;
    landUseNameKinyarwanda?: string;
    landUseCode?: number;
    rightType?: string;
    coordinateReferenceSystem?: string;
    xCoordinate?: string;
    yCoordinate?: string;
    remainingLeaseTerm?: number;
    inProcess?: boolean;
    owners?: Owner[];
    representative?: Representative;
    isUnderMortgage?: boolean;
    isUnderRestriction?: boolean;
    parcelLocation?: {
        village?: { villageCode: string; villageName: string };
        cell?: { cellCode: string; cellName: string };
        sector?: { sectorCode: string; sectorName: string };
        district?: { districtCode: string; districtName: string };
        province?: { provinceCode: string; provinceName: string };
    };
    coordinates?: { lat: string; lon: string }[];
    plannedLandUses?: PlannedLandUse[];
    planned_land_uses?: PlannedLandUse[];
    valuation?: ValuationValue;
    valuationValue?: ValuationValue;
    right_type?: string;
    coordinate_reference_system?: string;
    remaining_lease_term?: number;
    is_under_mortgage?: boolean;
    is_under_restriction?: boolean;
    in_process?: boolean;
    parcel_location?: {
        village?: { villageCode: string; villageName: string };
        cell?: { cellCode: string; cellName: string };
        sector?: { sectorCode: string; sectorName: string };
        district?: { districtCode: string; districtName: string };
        province?: { provinceCode: string; provinceName: string };
    };
    gis_coordinates?: string;
}

interface PropertyApiResponse {
    id: number;
    upi: string;
    owner_id: string;
    owner_name: string;
    category_id: number;
    subcategory_id: number;
    parcel_id: string;
    size: number;
    location: string | null;
    district: string;
    sector: string;
    cell: string;
    village: string;
    land_use: string;
    status: string;
    estimated_amount: number;
    latitude: number;
    longitude: number;
    amount_paid: number | null;
    new_owner_id: string | null;
    video_link: string;
    details: PropertyDetails;
    parcel_information: ParcelInformation;
    right_type: string;
    gis_coordinates: string | null;
    created_at: string;
    updated_at: string;
    images: PropertyImage[];
    category: Category;
    subcategory: Subcategory;
    uploaded_by: UploadedBy;
    uploader_type: string;
    uploaded_by_name: string;
}

// External API Response Types
interface ExternalOwner {
    tin?: string;
    idNo: string;
    boxNo?: string;
    share: string;
    gender: string;
    partyId: string;
    surname: string;
    fullName: string;
    idTypeId: string;
    birthDate?: string;
    countryId: string;
    deathDate?: string;
    foreNames: string;
    startDate: string;
    villageId: string;
    streetName?: string;
    addressLine1?: string;
    businessType: string;
    isProvisional: boolean;
    maritalStatus: string;
    endTransactionId?: string;
    startTransactionId: string;
}

interface ExternalRepresentative {
    tin?: string;
    idNo: string;
    boxNo?: string;
    gender: string;
    address?: {
        cellId: string;
        string: string;
        cellName: string;
        sectorId: string;
        villageId: string;
        districtId: string;
        provinceId: string;
        sectorName: string;
        villageName: string;
        districtName: string;
        provinceNameFrench: string;
        provinceNameEnglish: string;
        provinceNameKinyarwanda: string;
    };
    partyId: string;
    surname: string;
    fullName: string;
    idTypeId: string;
    birthDate?: string;
    countryId: string;
    deathDate?: string;
    foreNames: string;
    startDate: string;
    villageId: string;
    streetName?: string;
    addressLine1?: string;
    isProvisional: boolean;
    maritalStatus: string;
    endTransactionId?: string;
    startTransactionId: string;
}

interface ExternalParcelInfo {
    parcelDetails: any;
    upi: string;
    area: number;
    shape?: string;
    cellId?: string;
    string?: string;
    tenure?: {
        isInquiry: boolean;
        rightTypeId: string;
        onCertificate: boolean;
        rightTypeKind: string;
        rightTypeName: string;
        rightTypeCategory: string;
    };
    address: {
        cellId: string;
        string: string;
        cellName: string;
        sectorId: string;
        villageId: string;
        districtId: string;
        provinceId: string;
        sectorName: string;
        villageName: string;
        districtName: string;
        provinceNameFrench: string;
        provinceNameEnglish: string;
        provinceNameKinyarwanda: string;
    };
    endDate?: string;
    landUse: {
        endDate?: string;
        landUseId: number;
        leaseTerm: number;
        landUseTypeNameFrench: string;
        landUseTypeNameEnglish: string;
        landUseTypeNameKinyarwanda: string;
    };
    cellName: string;
    sectorId: string;
    hasCaveat: boolean;
    isInquiry: boolean;
    landUseId: number;
    landValue: string;
    leaseTerm: number;
    startDate: string;
    villageId: string;
    districtId: string;
    provinceId: string;
    sectorName: string;
    hasBuilding: boolean;
    isDeveloped: boolean;
    rightTypeId: string;
    villageName: string;
    districtName: string;
    leaseEndDate?: string;
    provinceName: string;
    buildingValue: string;
    inTransaction: boolean;
    isProvisional: boolean;
    landUseTypeId: number;
    onCertificate: boolean;
    parcelPolygon: {
        polygon: string;
    };
    rightTypeKind: string;
    rightTypeName: string;
    underMortgage: boolean;
    leaseStartDate?: string;
    parcelGeometry?: any;
    plannedLandUses: {
        upi: string;
        area: number;
        landUseName: string;
    }[];
    valuationValues: {
        maxPrice: string;
        minPrice: string;
    };
    endTransactionId?: string;
    totalMarketValue: number;
    hasInfrastructure: boolean;
    parcelCoordinates: {
        lat: number;
        lon: number;
    };
    rightTypeCategory: string;
    provinceNameFrench: string;
    remainingLeaseTerm: number;
    startTransactionId: string;
    provinceNameEnglish: string;
    landUseTypeNameFrench: string;
    landUseTypeNameEnglish: string;
    numberOfBuildingFloors: number;
    provinceNameKinyarwanda: string;
    startLeaseTransactionId: string;
    landUseTypeNameKinyarwanda: string;
    owners: ExternalOwner[];
    parcelRepresentative?: ExternalRepresentative;
}

interface FilterState {
    status: "all" | "overlapping" | "underMortgage" | "inTransaction" | "available";
    landUse: string[];
    area: [number, number];
}

interface DraggableModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title: string;
    subtitle?: string;
    isLoading?: boolean;
}



/* =========================
   AREA FORMATTER
========================= */
function formatArea(area?: number): string {
    if (!area) return 'N/A';
    if (area >= 10000) {
        return `${(area / 10000).toFixed(2)} ha`;
    }
    return `${area.toFixed(0)} m²`;
}

/* =========================
   GENDER ICON
========================= */
function getGenderIcon(gender: string) {
    switch (gender?.toUpperCase()) {
        case 'M': return <User size={14} />;
        case 'F': return <UserCircle size={14} />;
        default: return <UserRound size={14} />;
    }
}

/* =========================
   MARITAL STATUS ICON
========================= */
function getMaritalStatusIcon(status: string) {
    switch (status?.toUpperCase()) {
        case 'M': return <HeartHandshake size={14} />;
        case 'S': return <User size={14} />;
        case 'D': return <UserMinus size={14} />;
        case 'W': return <Heart size={14} />;
        default: return <User size={14} />;
    }
}

/* =========================
   DRAGGABLE & RESIZABLE MODAL
========================= */
function DraggableModal({
    isOpen,
    onClose,
    children,
    title,
    subtitle,
    isLoading = false,
}: DraggableModalProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [position, setPosition] = useState({ x: 20, y: 20 });
    const [size, setSize] = useState({ width: 520, height: 650 });
    const [resizeDirection, setResizeDirection] = useState<string | null>(null);

    const modalRef = useRef<HTMLDivElement>(null);
    const dragHandleRef = useRef<HTMLDivElement>(null);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const startSize = useRef({ width: 0, height: 0 });
    const startPos = useRef({ x: 0, y: 0 });

    const handleDragStart = useCallback((e: React.MouseEvent) => {
        if (dragHandleRef.current?.contains(e.target as Node)) {
            setIsDragging(true);
            dragStartPos.current = { x: e.clientX - position.x, y: e.clientY - position.y };
        }
    }, [position]);

    const handleResizeStart = useCallback((e: React.MouseEvent, direction: string) => {
        e.stopPropagation();
        setIsResizing(true);
        setResizeDirection(direction);
        dragStartPos.current = { x: e.clientX, y: e.clientY };
        startSize.current = { width: size.width, height: size.height };
        startPos.current = { x: position.x, y: position.y };
    }, [size, position]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                const newX = e.clientX - dragStartPos.current.x;
                const newY = e.clientY - dragStartPos.current.y;

                const maxX = window.innerWidth - size.width - 20;
                const maxY = window.innerHeight - size.height - 20;

                setPosition({
                    x: Math.max(20, Math.min(newX, maxX)),
                    y: Math.max(20, Math.min(newY, maxY)),
                });
            } else if (isResizing && resizeDirection) {
                let newWidth = size.width;
                let newHeight = size.height;
                let newX = position.x;
                let newY = position.y;

                const deltaX = e.clientX - dragStartPos.current.x;
                const deltaY = e.clientY - dragStartPos.current.y;

                const minWidth = 400;
                const minHeight = 500;

                if (resizeDirection.includes('e')) {
                    newWidth = Math.max(minWidth, startSize.current.width + deltaX);
                }
                if (resizeDirection.includes('w')) {
                    const potentialWidth = Math.max(minWidth, startSize.current.width - deltaX);
                    if (potentialWidth !== startSize.current.width) {
                        newWidth = potentialWidth;
                        newX = startPos.current.x + (startSize.current.width - newWidth);
                    }
                }
                if (resizeDirection.includes('s')) {
                    newHeight = Math.max(minHeight, startSize.current.height + deltaY);
                }
                if (resizeDirection.includes('n')) {
                    const potentialHeight = Math.max(minHeight, startSize.current.height - deltaY);
                    if (potentialHeight !== startSize.current.height) {
                        newHeight = potentialHeight;
                        newY = startPos.current.y + (startSize.current.height - newHeight);
                    }
                }

                setSize({ width: newWidth, height: newHeight });
                setPosition({ x: newX, y: newY });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setIsResizing(false);
            setResizeDirection(null);
        };

        if (isDragging || isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, resizeDirection, size.width, size.height, position.x, position.y]);

    if (!isOpen) return null;

    return (
        <div
            ref={modalRef}
            style={{
                position: 'absolute',
                left: position.x,
                top: position.y,
                width: size.width,
                height: size.height,
                backgroundColor: 'white',
                borderRadius: 12,
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                zIndex: 1000,
                cursor: isDragging ? 'grabbing' : 'default',
                transition: isDragging || isResizing ? 'none' : 'box-shadow 0.2s',
                border: '1px solid #E5E7EB',
            }}
            onMouseDown={handleDragStart}
        >
            <div
                ref={dragHandleRef}
                style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #F3F4F6',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'grab',
                    userSelect: 'none',
                    backgroundColor: 'var(--color-primary)',
                    color: 'white',
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12,
                }}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                    <GripHorizontal size={16} />
                    <div style={{ overflow: 'hidden' }}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {title}
                        </h3>
                        {subtitle && (
                            <p style={{ fontSize: 12, opacity: 0.9, margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        width: 28,
                        height: 28,
                        borderRadius: 14,
                        border: 'none',
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        flexShrink: 0,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
                >
                    <X size={14} />
                </button>
            </div>

            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: isLoading ? 0 : '16px',
                backgroundColor: 'white',
                position: 'relative',
            }}>
                {isLoading ? (
                    <div style={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 12,
                    }}>
                        <Loader2 size={40} className="animate-spin" color="var(--color-primary)" />
                        <span style={{ color: '#6B7280', fontSize: 13 }}>Loading property details...</span>
                    </div>
                ) : children}
            </div>

            <div onMouseDown={(e) => handleResizeStart(e, 'n')} style={{ position: 'absolute', top: 0, left: 10, right: 10, height: 6, cursor: 'n-resize' }} />
            <div onMouseDown={(e) => handleResizeStart(e, 's')} style={{ position: 'absolute', bottom: 0, left: 10, right: 10, height: 6, cursor: 's-resize' }} />
            <div onMouseDown={(e) => handleResizeStart(e, 'e')} style={{ position: 'absolute', top: 10, bottom: 10, right: 0, width: 6, cursor: 'e-resize' }} />
            <div onMouseDown={(e) => handleResizeStart(e, 'w')} style={{ position: 'absolute', top: 10, bottom: 10, left: 0, width: 6, cursor: 'w-resize' }} />
            <div onMouseDown={(e) => handleResizeStart(e, 'ne')} style={{ position: 'absolute', top: 0, right: 0, width: 20, height: 20, cursor: 'ne-resize' }} />
            <div onMouseDown={(e) => handleResizeStart(e, 'nw')} style={{ position: 'absolute', top: 0, left: 0, width: 20, height: 20, cursor: 'nw-resize' }} />
            <div onMouseDown={(e) => handleResizeStart(e, 'se')} style={{ position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, cursor: 'se-resize' }} />
            <div onMouseDown={(e) => handleResizeStart(e, 'sw')} style={{ position: 'absolute', bottom: 0, left: 0, width: 20, height: 20, cursor: 'sw-resize' }} />
        </div>
    );
}

/* =========================
   MAP CLICK HANDLER
========================= */
function MapClickHandler({ onEmptyClick }: { onEmptyClick: () => void }) {
    useMapEvents({
        click: (e) => {
            const target = e.originalEvent.target as HTMLElement;
            if (target.tagName === 'DIV' || target.tagName === 'svg' || target.classList.contains('leaflet-container')) {
                onEmptyClick();
            }
        },
    });
    return null;
}

/* =========================
   3D MAP VIEW
========================= */
function Map3DView({ enabled }: { enabled: boolean }) {
    const map = useMap();

    useEffect(() => {
        if (enabled) {
            map.setMaxZoom(22);
            map.setMinZoom(15);
        } else {
            map.setMaxZoom(19);
            map.setMinZoom(10);
        }
    }, [enabled, map]);

    return null;
}

/* =========================
   AUTO ZOOM
========================= */
function ZoomToParcel({ parcel, shouldZoom }: { parcel: any; shouldZoom: boolean }) {
    const map = useMap();
    useEffect(() => {
        if (!parcel || !shouldZoom) return;
        map.flyToBounds(parcel.positions, {
            padding: [60, 60],
            maxZoom: 17,
            duration: 1,
        });
    }, [parcel, map, shouldZoom]);
    return null;
}

/* =========================
   CENTER CALCULATOR
========================= */
function getCenter(coords: [number, number][]): [number, number] {
    let lat = 0;
    let lng = 0;
    coords.forEach(([la, ln]) => {
        lat += la;
        lng += ln;
    });
    return [lat / coords.length, lng / coords.length];
}

/* =========================
   COLOR ENGINE
========================= */
function getParcelColor(status: ParcelStatus, overlapping: boolean): string {
    // Red for issues (mortgage/overlap/transaction)
    if (overlapping || status?.underMortgage || status?.inTransaction) return "#EF4444";

    // Blue for regular parcels
    return "#3B82F6";
}

/* =========================
   POLYGON WITH AREA LABEL
========================= */
function ParcelPolygonWithLabel({ parcel, isSelected, onClick }: { parcel: any; isSelected: boolean; onClick: () => void }) {
    const map = useMap();
    const [hovered, setHovered] = useState(false);

    // Format area for display - use size from API response
    const areaText = formatArea(parcel.size || parcel.area || parcel.status_details?.area);

    return (
        <>
            <Polygon
                positions={parcel.positions}
                pathOptions={{
                    color: parcel.color,
                    weight: isSelected ? 3 : hovered ? 2 : 1,
                    fillColor: parcel.color,
                    fillOpacity: isSelected ? 0.3 : hovered ? 0.2 : 0.1,
                }}
                eventHandlers={{
                    click: (e) => {
                        L.DomEvent.stopPropagation(e);
                        onClick();
                    },
                    mouseover: (e) => {
                        setHovered(true);
                        e.target.setStyle({ weight: 2, fillOpacity: 0.2 });
                    },
                    mouseout: (e) => {
                        setHovered(false);
                        e.target.setStyle({
                            weight: isSelected ? 3 : 1,
                            fillOpacity: isSelected ? 0.3 : 0.1,
                        });
                    },
                }}
            >
                <Tooltip sticky direction="top">
                    <div style={{ fontSize: 11, padding: '2px 6px' }}>
                        <strong>{parcel.upi.substring(0, 12)}...</strong><br />
                        Area: {areaText}
                        {parcel.status_details?.underMortgage && (
                            <><br /><span style={{ color: '#EF4444' }}>🏦 Under Mortgage</span></>
                        )}
                        {parcel.status_details?.inTransaction && (
                            <><br /><span style={{ color: '#EF4444' }}>🔄 In Transaction</span></>
                        )}
                        {parcel.overlapping && (
                            <><br /><span style={{ color: '#EF4444' }}>⚠️ Overlapping</span></>
                        )}
                    </div>
                </Tooltip>
            </Polygon>

            {/* Area Label inside polygon */}
            {map.getZoom() >= 15 && (
                <Marker
                    position={parcel.center}
                    icon={L.divIcon({
                        html: `<div style="
                            background-color: rgba(255,255,255,0.9);
                            padding: 2px 6px;
                            border-radius: 4px;
                            font-size: 11px;
                            font-weight: 500;
                            color: #374151;
                            border: 1px solid #E5E7EB;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                            white-space: nowrap;
                            pointer-events: none;
                        ">${areaText}</div>`,
                        className: 'area-label',
                        iconSize: [60, 20],
                        iconAnchor: [30, 10],
                    })}
                    interactive={false}
                />
            )}
        </>
    );
}

/* =========================
   OWNER CARD COMPONENT
========================= */
function OwnerCard({ owner }: { owner: any }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div style={{
            border: '1px solid #E5E7EB',
            borderRadius: 8,
            marginBottom: 8,
            overflow: 'hidden',
        }}>
            <div
                onClick={() => setExpanded(!expanded)}
                style={{
                    padding: '10px 12px',
                    backgroundColor: '#F9FAFB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: 'var(--color-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: 14,
                        fontWeight: 600,
                    }}>
                        {owner.fullName?.charAt(0) || '?'}
                    </div>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{owner.fullName}</div>
                        <div style={{ fontSize: 11, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                            {getGenderIcon(owner.gender || '')}
                            <span>{owner.gender === 'M' ? 'Male' : owner.gender === 'F' ? 'Female' : 'Other'}</span>
                            <span>•</span>
                            {getMaritalStatusIcon(owner.maritalStatus || '')}
                            <span>{
                                owner.maritalStatus === 'M' ? 'Married' :
                                    owner.maritalStatus === 'S' ? 'Single' :
                                        owner.maritalStatus === 'D' ? 'Divorced' :
                                            owner.maritalStatus === 'W' ? 'Widowed' : 'Unknown'
                            }</span>
                        </div>
                    </div>
                </div>
                <div style={{ color: '#6B7280' }}>
                    {expanded ? <ChevronRight size={16} /> : <ChevronRight size={16} style={{ transform: 'rotate(90deg)' }} />}
                </div>
            </div>

            {expanded && (
                <div style={{ padding: '12px', borderTop: '1px solid #E5E7EB' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                        {owner.idNo && (
                            <div>
                                <div style={{ fontSize: 10, color: '#6B7280' }}>ID Number</div>
                                <div style={{ fontSize: 12, fontWeight: 500 }}>{owner.idNo}</div>
                            </div>
                        )}
                        {owner.idTypeName && (
                            <div>
                                <div style={{ fontSize: 10, color: '#6B7280' }}>ID Type</div>
                                <div style={{ fontSize: 12, fontWeight: 500 }}>{owner.idTypeName}</div>
                            </div>
                        )}
                        {owner.countryName && (
                            <div>
                                <div style={{ fontSize: 10, color: '#6B7280' }}>Country</div>
                                <div style={{ fontSize: 12, fontWeight: 500 }}>{owner.countryName}</div>
                            </div>
                        )}
                        {owner.sharePercentage && (
                            <div>
                                <div style={{ fontSize: 10, color: '#6B7280' }}>Share</div>
                                <div style={{ fontSize: 12, fontWeight: 500 }}>{owner.sharePercentage}</div>
                            </div>
                        )}
                        {owner.share && (
                            <div>
                                <div style={{ fontSize: 10, color: '#6B7280' }}>Share</div>
                                <div style={{ fontSize: 12, fontWeight: 500 }}>{owner.share}%</div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

/* =========================
   MAIN COMPONENT
========================= */
interface ParcelMapProps {
    height?: string | number;
    width?: string | number;
    showSidebar?: boolean;
}

export default function ParcelMap({
    height = '100%',
    width = '100%',
    showSidebar = true,
}: ParcelMapProps) {
    const [parcels, setParcels] = useState<any[]>([]);
    const [selectedUPI, setSelectedUPI] = useState<string | null>(null);
    const [combinedData, setCombinedData] = useState<any | null>(null);
    const [loadingMap, setLoadingMap] = useState(true);
    const [loadingInfo, setLoadingInfo] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [mapStyle, setMapStyle] = useState<"osm" | "satellite" | "dark" | "streets">("streets");
    const [filter, setFilter] = useState<FilterState>({
        status: "all",
        landUse: [],
        area: [0, 10000],
    });
    const [showFilters, setShowFilters] = useState(false);
    const [enable3D, setEnable3D] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [autoZoom, setAutoZoom] = useState(true);
    const [mapCenter] = useState<[number, number]>([-1.9403, 29.8739]);
    const [initialLoadDone, setInitialLoadDone] = useState(false);
    const [clickedParcel, setClickedParcel] = useState<string | null>(null);
    const [sidebarVisible, setSidebarVisible] = useState(true);

    /* =========================
       FETCH MAPPING DATA
    ========================== */
    useEffect(() => {
        async function loadParcels() {
            setLoadingMap(true);
            try {
                // Fetch all parcels
                const allRes = await api.get("/api/mappings");
                const allParcels = allRes.data.map((parcel: any) => ({
                    ...parcel,
                    uploader_id: parcel.uploaded_by || parcel.user_id || 1,
                    uploader_name: parcel.uploaded_by_name || parcel.user_name || 'Unknown',
                    uploader_email: parcel.uploaded_by_email || '',
                }));
                setParcels(allParcels);

                // Select first parcel if exists
                if (allParcels.length > 0) {
                    setSelectedUPI(allParcels[0].upi);
                }
            } catch (err) {
                console.error("Failed to load parcels", err);
            } finally {
                setLoadingMap(false);
                setInitialLoadDone(true);
            }
        }
        loadParcels();
    }, []);

    /* =========================
       PARSE + OVERLAP DETECTION
    ========================== */
    const parsedParcels = useMemo(() => {
        if (!parcels.length) return [];

        const temp = parcels.map((p) => {
            try {
                const geo = wk.parse(p.official_registry_polygon);
                
                // Type-guard to ensure the geometry has coordinates
                if (!geo || !('coordinates' in geo)) {
                    throw new Error("Invalid geometry: missing coordinates");
                }
                
                const coordinates = (geo as any).coordinates[0];
                const positions = coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);

                return {
                    ...p,
                    geojson: geo,
                    positions,
                    center: getCenter(positions),
                    overlapping: false,
                    overlapsWith: [],
                };
            } catch (e) {
                console.error("Failed to parse polygon for parcel", p.upi, e);
                return null;
            }
        }).filter(Boolean);

        // Calculate overlaps
        for (let i = 0; i < temp.length; i++) {
            for (let j = i + 1; j < temp.length; j++) {
                try {
                    const polyA = turf.polygon(temp[i].geojson.coordinates);
                    const polyB = turf.polygon(temp[j].geojson.coordinates);

                    if (turf.booleanIntersects(polyA, polyB)) {
                        const intersection = turf.intersect(turf.featureCollection([polyA, polyB]));

                        if (intersection) {
                            const overlapArea = turf.area(intersection);
                            const areaA = turf.area(polyA);
                            const areaB = turf.area(polyB);

                            // Calculate what percentage of each parcel is overlapped
                            const percentOfA = (overlapArea / areaA) * 100;
                            const percentOfB = (overlapArea / areaB) * 100;

                            // Only mark as overlapping if more than 1% of either parcel is overlapped
                            const threshold = 0.1; // 1% threshold

                            if (percentOfA > threshold || percentOfB > threshold) {
                                temp[i].overlapping = true;
                                temp[j].overlapping = true;
                                temp[i].overlapsWith.push(temp[j].upi);
                                temp[j].overlapsWith.push(temp[i].upi);

                                // Store the percentage for reference
                                temp[i].overlapPercentage = percentOfA;
                                temp[j].overlapPercentage = percentOfB;
                            }
                        }
                    }
                } catch (e) {
                    console.error("Error checking overlap", e);
                }
            }
        }

        return temp.map((p) => ({
            ...p,
            color: getParcelColor(p.status_details || {}, p.overlapping),
            overlapping: p.overlapping,
        }));
    }, [parcels]);

    /* =========================
       FILTERING
    ========================== */
    const filteredParcels = useMemo(() => {
        return parsedParcels.filter(p => {
            // Status filter
            if (filter.status === "overlapping" && !p.overlapping) return false;
            if (filter.status === "underMortgage") {
                if (!p.status_details || !p.status_details.underMortgage) return false;
            }
            if (filter.status === "inTransaction") {
                if (!p.status_details || !p.status_details.inTransaction) return false;
            }
            if (filter.status === "available") {
                const isAvailable = !p.overlapping &&
                    (!p.status_details || (!p.status_details.inTransaction && !p.status_details.underMortgage));
                if (!isAvailable) return false;
            }

            // Search filter
            if (searchQuery && searchQuery.trim() !== "") {
                if (!p.upi.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            }

            // Area filter - use size from API response
            const area = p.size || p.area || p.status_details?.area;
            if (area) {
                if (area < filter.area[0] || area > filter.area[1]) return false;
            }

            return true;
        });
    }, [parsedParcels, filter, searchQuery]);

    const selectedParcel = useMemo(() =>
        filteredParcels.find((p) => p.upi === selectedUPI),
        [filteredParcels, selectedUPI]
    );

    /* =========================
       FETCH COMBINED PROPERTY DATA
    ========================== */
    const fetchCombinedData = useCallback(async (upi: string) => {
        try {
            setLoadingInfo(true);

            let propertyData: PropertyApiResponse | undefined;
            let externalData: ExternalParcelInfo | undefined;
            let propertySuccess = false;
            let externalSuccess = false;

            // Try property API first
            try {
                const propertyResponse = await api.get(`/api/property/properties/by-upi/${encodeURIComponent(upi)}`);
                if (propertyResponse.data) {
                    propertyData = propertyResponse.data;
                    propertySuccess = true;
                }
            } catch (propertyErr) {
                console.warn("Property API failed:", propertyErr);
            }

            // Try external API
            try {
                const externalResponse = await api.get<any>(`/api/external/title_data`, {
                    params: {
                        upi: upi,
                        language: 'english'
                    }
                });
                if (externalResponse.data.success && externalResponse.data.found) {
                    externalData = externalResponse.data.data;
                    externalSuccess = true;
                }
            } catch (externalErr) {
                console.warn("External API failed:", externalErr);
            }

            // Determine source and set combined data
            let source: 'property' | 'external' | 'both' = 'external';
            if (propertySuccess && externalSuccess) {
                source = 'both';
            } else if (propertySuccess) {
                source = 'property';
            }

            setCombinedData({
                source,
                propertyData,
                externalData,
                hasPropertyRecord: propertySuccess
            });

        } catch (error) {
            console.error("Failed to fetch property data:", error);
            setCombinedData(null);
        } finally {
            setLoadingInfo(false);
        }
    }, []);

    /* =========================
       HANDLE PARCEL CLICK
    ========================== */
    const handleParcelClick = useCallback(async (upi: string) => {
        if (clickedParcel === upi && loadingInfo) return;

        const parcel = parsedParcels.find((p) => p.upi === upi);

        if (!parcel) return;

        // For admin view, load info for all parcels
        setSelectedUPI(upi);
        setAutoZoom(true);
        await fetchCombinedData(upi);
        setClickedParcel(upi);
        setCurrentImageIndex(0);
    }, [parsedParcels, clickedParcel, loadingInfo, fetchCombinedData]);

    /* =========================
       HANDLE EMPTY CLICK
    ========================== */
    const handleEmptyClick = useCallback(() => {
        setSelectedUPI(null);
        setCombinedData(null);
        setAutoZoom(false);
    }, []);

    /* =========================
       HANDLE MODAL CLOSE
    ========================== */
    const handleModalClose = useCallback(() => {
        setCombinedData(null);
    }, []);

    /* =========================
       MAP TILE URLS
    ========================== */
    const getTileLayer = () => {
        switch (mapStyle) {
            case "satellite":
                return "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
            case "dark":
                return "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png";
            case "streets":
                return "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
            default:
                return "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
        }
    };

    if (loadingMap && !initialLoadDone) {
        return (
            <div style={{
                height,
                width,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#F9FAFB',
                borderRadius: 12,
            }}>
                <Loader2 size={40} className="animate-spin" color="var(--color-primary)" />
            </div>
        );
    }

    return (
        <>
        <div style={{
            display: 'flex',
            height,
            width,
            position: 'relative',
            backgroundColor: '#F9FAFB',
            borderRadius: 12,
            overflow: 'hidden',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            {/* Sidebar Toggle Button */}
            {showSidebar && !sidebarVisible && (
                <button
                    onClick={() => setSidebarVisible(true)}
                    style={{
                        position: 'absolute',
                        top: 12,
                        left: 12,
                        zIndex: 1000,
                        backgroundColor: 'white',
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        cursor: 'pointer',
                    }}
                >
                    <Menu size={16} color="var(--color-primary)" />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>Show Sidebar</span>
                </button>
            )}

            {/* ================= SIDEBAR ================= */}
            {showSidebar && sidebarVisible && (
                <div style={{
                    width: 360,
                    backgroundColor: '#ffffff',
                    borderRight: '1px solid #E5E7EB',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100vh',
                    overflow: 'hidden',
                    position: 'relative',
                }}>
                    {/* Sidebar Header with Close Button */}
                    <div style={{
                        padding: '16px',
                        borderBottom: '1px solid #E5E7EB',
                        backgroundColor: '#ffffff',
                        flexShrink: 0,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}>
                        <div>
                            <h2 style={{
                                fontSize: 18,
                                fontWeight: 600,
                                color: 'var(--color-primary)',
                                margin: '0 0 4px 0',
                            }}>
                                Property Explorer (Admin)
                            </h2>
                            <p style={{ color: '#6B7280', fontSize: 13, margin: 0 }}>
                                {filteredParcels.length} parcels
                            </p>
                        </div>
                        <button
                            onClick={() => setSidebarVisible(false)}
                            style={{
                                width: 28,
                                height: 28,
                                borderRadius: 14,
                                border: 'none',
                                backgroundColor: '#F3F4F6',
                                color: '#6B7280',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                            }}
                        >
                            <X size={14} />
                        </button>
                    </div>

                    {/* Search */}
                    <div style={{
                        padding: '12px',
                        borderBottom: '1px solid #E5E7EB',
                        backgroundColor: '#ffffff',
                        flexShrink: 0,
                    }}>
                        <input
                            type="text"
                            placeholder="Search by UPI..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid #E5E7EB',
                                borderRadius: 8,
                                fontSize: 13,
                                outline: 'none',
                                transition: 'border-color 0.2s',
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                            onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                        />
                    </div>

                    {/* Filter Toggles */}
                    <div style={{
                        padding: '10px 12px 12px',
                        display: 'flex',
                        gap: 8,
                        flexWrap: 'wrap',
                        borderBottom: '1px solid #E5E7EB',
                        backgroundColor: '#ffffff',
                        flexShrink: 0,
                    }}>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 12px',
                                backgroundColor: showFilters ? 'var(--color-primary)' : '#F3F4F6',
                                color: showFilters ? 'white' : '#374151',
                                border: 'none',
                                borderRadius: 20,
                                fontSize: 12,
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                        >
                            <Filter size={14} />
                            {showFilters ? 'Hide Filters' : 'Show Filters'}
                        </button>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '2px 4px',
                            backgroundColor: '#F3F4F6',
                            borderRadius: 20,
                        }}>
                            <div style={{
                                width: 12,
                                height: 12,
                                borderRadius: 3,
                                backgroundColor: '#3B82F6',
                            }} />
                            <span style={{ fontSize: 11 }}>Regular</span>
                        </div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '2px 4px',
                            backgroundColor: '#F3F4F6',
                            borderRadius: 20,
                        }}>
                            <div style={{
                                width: 12,
                                height: 12,
                                borderRadius: 3,
                                backgroundColor: '#EF4444',
                            }} />
                            <span style={{ fontSize: 11 }}>Issues</span>
                        </div>
                    </div>

                    {/* Scrollable Content Area */}
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: '#ffffff',
                        paddingBottom: "100px",
                    }}>
                        {/* Filter Panel */}
                        <AnimatePresence>
                            {showFilters && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    style={{ overflow: 'hidden', flexShrink: 0 }}
                                >
                                    <div style={{
                                        padding: '12px',
                                        backgroundColor: '#F9FAFB',
                                        margin: '0 12px 12px',
                                        borderRadius: 8,
                                    }}>
                                        <div style={{ marginBottom: 12 }}>
                                            <label style={{
                                                display: 'block',
                                                fontSize: 12,
                                                fontWeight: 500,
                                                color: '#4B5563',
                                                marginBottom: 4
                                            }}>
                                                Property Status
                                            </label>
                                            <select
                                                value={filter.status}
                                                onChange={(e) => setFilter({ ...filter, status: e.target.value as any })}
                                                style={{
                                                    width: '100%',
                                                    padding: '6px 8px',
                                                    border: '1px solid #E5E7EB',
                                                    borderRadius: 6,
                                                    fontSize: 12,
                                                    backgroundColor: 'white',
                                                }}
                                            >
                                                <option value="all">All Properties</option>
                                                <option value="available">Available</option>
                                                <option value="overlapping">Overlapping</option>
                                                <option value="underMortgage">Under Mortgage</option>
                                                <option value="inTransaction">In Transaction</option>
                                            </select>
                                        </div>

                                        <div style={{ marginBottom: 12 }}>
                                            <label style={{
                                                display: 'block',
                                                fontSize: 12,
                                                fontWeight: 500,
                                                color: '#4B5563',
                                                marginBottom: 4
                                            }}>
                                                Area Range (m²)
                                            </label>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <input
                                                    type="number"
                                                    placeholder="Min"
                                                    value={filter.area[0]}
                                                    onChange={(e) => setFilter({ ...filter, area: [Number(e.target.value), filter.area[1]] })}
                                                    style={{
                                                        flex: 1,
                                                        padding: '4px 6px',
                                                        border: '1px solid #E5E7EB',
                                                        borderRadius: 6,
                                                        fontSize: 12,
                                                    }}
                                                />
                                                <input
                                                    type="number"
                                                    placeholder="Max"
                                                    value={filter.area[1]}
                                                    onChange={(e) => setFilter({ ...filter, area: [filter.area[0], Number(e.target.value)] })}
                                                    style={{
                                                        flex: 1,
                                                        padding: '4px 6px',
                                                        border: '1px solid #E5E7EB',
                                                        borderRadius: 6,
                                                        fontSize: 12,
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setFilter({
                                                status: "all",
                                                landUse: [],
                                                area: [0, 10000],
                                            })}
                                            style={{
                                                width: '100%',
                                                padding: '6px',
                                                backgroundColor: 'white',
                                                border: '1px solid #E5E7EB',
                                                borderRadius: 6,
                                                fontSize: 12,
                                                color: '#6B7280',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            Reset Filters
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Parcel List */}
                        <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '0 12px 12px',
                            minHeight: '200px',
                        }}>
                            {filteredParcels.length === 0 ? (
                                <div style={{
                                    padding: '32px 16px',
                                    textAlign: 'center',
                                    color: '#6B7280',
                                    fontSize: 13,
                                }}>
                                    No parcels match your filters
                                </div>
                            ) : (
                                filteredParcels.map((parcel) => (
                                    <motion.div
                                        key={parcel.upi}
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        onClick={() => handleParcelClick(parcel.upi)}
                                        style={{
                                            padding: '12px',
                                            backgroundColor: selectedUPI === parcel.upi ? 'rgba(var(--color-primary), 0.05)' : 'white',
                                            border: '1px solid',
                                            borderColor: selectedUPI === parcel.upi ? 'var(--color-primary)' : '#E5E7EB',
                                            borderRadius: 8,
                                            cursor: 'pointer',
                                            marginBottom: 6,
                                            position: 'relative',
                                            opacity: (clickedParcel === parcel.upi && loadingInfo) ? 0.7 : 1,
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                            <div style={{ overflow: 'hidden', flex: 1 }}>
                                                <div style={{
                                                    fontWeight: 500,
                                                    fontSize: 13,
                                                    color: '#111827',
                                                    marginBottom: 2,
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                }}>
                                                    {parcel.upi}
                                                    {clickedParcel === parcel.upi && loadingInfo && (
                                                        <Loader2 size={12} className="animate-spin" color="var(--color-primary)" />
                                                    )}
                                                </div>
                                                <div style={{ fontSize: 12, color: '#6B7280' }}>
                                                    Area: {formatArea(parcel.size || parcel.area || parcel.status_details?.area)}
                                                </div>
                                                {parcel.village && (
                                                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                                                        {parcel.village}, {parcel.cell}, {parcel.sector}
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{
                                                width: 10,
                                                height: 10,
                                                borderRadius: '50%',
                                                backgroundColor: parcel.color,
                                                flexShrink: 0,
                                            }} />
                                        </div>
                                        <div style={{
                                            display: 'flex',
                                            gap: 6,
                                            marginTop: 6,
                                            fontSize: 11,
                                            flexWrap: 'wrap',
                                        }}>
                                            {parcel.overlapping && <span style={{ color: '#EF4444' }}>⚠️ Overlap</span>}
                                            {parcel.status_details?.underMortgage && <span style={{ color: '#EF4444' }}>🏦 Mortgage</span>}
                                            {parcel.status_details?.inTransaction && <span style={{ color: '#EF4444' }}>🔄 Active</span>}
                                            {parcel.land_use_type && <span style={{ color: '#6B7280' }}>📋 {parcel.land_use_type}</span>}
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ================= MAP SECTION ================= */}
            <div style={{
                flex: 1,
                position: 'relative',
                backgroundColor: '#E5E7EB',
            }}>
                {/* Map Controls */}
                <div style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                }}>
                    {/* Map Style Controls */}
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: 8,
                        padding: 2,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                    }}>
                        <button
                            onClick={() => setMapStyle('streets')}
                            style={{
                                width: 36,
                                height: 36,
                                backgroundColor: mapStyle === 'streets' ? 'var(--color-primary)' : 'transparent',
                                border: 'none',
                                borderRadius: 6,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                            title="Street Map"
                        >
                            <MapIcon size={16} color={mapStyle === 'streets' ? 'white' : '#6B7280'} />
                        </button>
                        <button
                            onClick={() => setMapStyle('satellite')}
                            style={{
                                width: 36,
                                height: 36,
                                backgroundColor: mapStyle === 'satellite' ? 'var(--color-primary)' : 'transparent',
                                border: 'none',
                                borderRadius: 6,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                            }}
                            title="Satellite"
                        >
                            <Satellite size={16} color={mapStyle === 'satellite' ? 'white' : '#6B7280'} />
                        </button>
                        <button
                            onClick={() => setMapStyle('dark')}
                            style={{
                                width: 36,
                                height: 36,
                                backgroundColor: mapStyle === 'dark' ? 'var(--color-primary)' : 'transparent',
                                border: 'none',
                                borderRadius: 6,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                            }}
                            title="Dark Mode"
                        >
                            <Moon size={16} color={mapStyle === 'dark' ? 'white' : '#6B7280'} />
                        </button>
                    </div>

                    {/* 3D Toggle */}
                    <button
                        onClick={() => setEnable3D(!enable3D)}
                        style={{
                            width: 36,
                            height: 36,
                            backgroundColor: enable3D ? 'var(--color-primary)' : 'white',
                            border: 'none',
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        }}
                        title="3D View"
                    >
                        <Layers size={16} color={enable3D ? 'white' : '#374151'} />
                    </button>

                    {/* Auto Zoom Toggle */}
                    <button
                        onClick={() => setAutoZoom(!autoZoom)}
                        style={{
                            width: 36,
                            height: 36,
                            backgroundColor: autoZoom ? 'var(--color-primary)' : 'white',
                            border: 'none',
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        }}
                        title="Auto Zoom"
                    >
                        <Navigation size={16} color={autoZoom ? 'white' : '#374151'} />
                    </button>

                    {/* Recenter Button */}
                    <button
                        onClick={() => {
                            if (selectedParcel) {
                                setAutoZoom(true);
                            }
                        }}
                        style={{
                            width: 36,
                            height: 36,
                            backgroundColor: 'white',
                            border: 'none',
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        }}
                        title="Recenter on selected"
                    >
                        <RefreshCw size={16} color="#374151" />
                    </button>
                </div>

                {/* Map Container */}
                <MapContainer
                    center={selectedParcel?.center || mapCenter}
                    zoom={15}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={true}
                    scrollWheelZoom={true}
                    preferCanvas={true}
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

                    <MapClickHandler onEmptyClick={handleEmptyClick} />

                    {/* Parcel Polygons with Area Labels */}
                    {filteredParcels.map((parcel) => (
                        <ParcelPolygonWithLabel
                            key={parcel.upi}
                            parcel={parcel}
                            isSelected={selectedUPI === parcel.upi}
                            onClick={() => handleParcelClick(parcel.upi)}
                        />
                    ))}

                    {/* Selected Parcel Marker */}
                    {selectedParcel && (
                        <Marker position={selectedParcel.center}>
                            <Popup>
                                <div style={{ minWidth: '300px', maxHeight: '400px', overflowY: 'auto' }}>
                                    <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-primary)' }}>
                                        {selectedParcel.upi}
                                    </h4>

                                    {/* Basic Info */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(2, 1fr)',
                                        gap: 8,
                                        marginBottom: 12,
                                        padding: '8px',
                                        backgroundColor: '#F9FAFB',
                                        borderRadius: 6,
                                    }}>
                                        <div>
                                            <div style={{ fontSize: 10, color: '#6B7280' }}>Area</div>
                                            <div style={{ fontSize: 13, fontWeight: 600 }}>{formatArea(selectedParcel.size || selectedParcel.area)}</div>
                                        </div>
                                        {selectedParcel.land_use_type && (
                                            <div>
                                                <div style={{ fontSize: 10, color: '#6B7280' }}>Land Use</div>
                                                <div style={{ fontSize: 13, fontWeight: 600 }}>{selectedParcel.land_use_type}</div>
                                            </div>
                                        )}
                                        {selectedParcel.village && (
                                            <div style={{ gridColumn: 'span 2' }}>
                                                <div style={{ fontSize: 10, color: '#6B7280' }}>Location</div>
                                                <div style={{ fontSize: 12 }}>
                                                    {selectedParcel.village}, {selectedParcel.cell}, {selectedParcel.sector}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Status Indicators */}
                                    {(selectedParcel.overlapping || selectedParcel.status_details?.underMortgage || selectedParcel.status_details?.inTransaction) && (
                                        <div style={{ marginBottom: 12 }}>
                                            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Status</div>
                                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                {selectedParcel.overlapping && (
                                                    <span style={{ padding: '2px 6px', backgroundColor: '#FEF2F2', color: '#EF4444', borderRadius: 12, fontSize: 10 }}>
                                                        Overlap
                                                    </span>
                                                )}
                                                {selectedParcel.status_details?.underMortgage && (
                                                    <span style={{ padding: '2px 6px', backgroundColor: '#FEF2F2', color: '#EF4444', borderRadius: 12, fontSize: 10 }}>
                                                        Mortgage
                                                    </span>
                                                )}
                                                {selectedParcel.status_details?.inTransaction && (
                                                    <span style={{ padding: '2px 6px', backgroundColor: '#FEF2F2', color: '#EF4444', borderRadius: 12, fontSize: 10 }}>
                                                        In Transaction
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Note about full details */}
                                    <div style={{
                                        padding: '8px',
                                        backgroundColor: '#F3F4F6',
                                        borderRadius: 6,
                                        fontSize: 11,
                                        color: '#4B5563',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                    }}>
                                        <Info size={14} />
                                        Click to view complete property details in the sidebar
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    )}

                    <ZoomControl position="bottomright" />
                    <ScaleControl position="bottomleft" metric={true} imperial={false} />
                    <Map3DView enabled={enable3D} />
                    {selectedParcel && autoZoom && (
                        <ZoomToParcel parcel={selectedParcel} shouldZoom={autoZoom} />
                    )}
                </MapContainer>

                {/* Property Modal - Combined Data from Both Sources */}
                <DraggableModal
                    isOpen={!!combinedData}
                    onClose={handleModalClose}
                    title="Property Details"
                    subtitle={`UPI: ${selectedParcel?.upi || ''}`}
                    isLoading={loadingInfo}
                >
                    {combinedData && !loadingInfo && (
                        <div>
                            {/* Data Source Badge */}
                            <div style={{ marginBottom: 16 }}>
                                <div style={{
                                    padding: '8px 12px',
                                    backgroundColor: combinedData.source === 'both' ? '#F0FDF4' :
                                        combinedData.source === 'property' ? '#EFF6FF' :
                                            combinedData.source === 'external' ? '#FEF3C7' : '#F3F4F6',
                                    borderRadius: 8,
                                    border: `1px solid ${combinedData.source === 'both' ? '#86EFAC' :
                                        combinedData.source === 'property' ? '#93C5FD' :
                                            combinedData.source === 'external' ? '#FCD34D' :
                                                '#E5E7EB'
                                        }`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                }}>
                                    {combinedData.source === 'both' && <CheckCircle2 size={16} color="#10B981" />}
                                    {combinedData.source === 'property' && <Info size={16} color="#3B82F6" />}
                                    {combinedData.source === 'external' && <AlertCircle size={16} color="#F59E0B" />}
                                    <span style={{ fontSize: 12, fontWeight: 500 }}>
                                        {combinedData.source === 'both' && 'Data from both property records and external registry'}
                                        {combinedData.source === 'property' && 'Data from local property records'}
                                        {combinedData.source === 'external' && 'Data from external registry (no property record)'}
                                    </span>
                                </div>
                            </div>

                            {/* No Property Record Message */}
                            {!combinedData.hasPropertyRecord && combinedData.externalData && (
                                <div style={{
                                    marginBottom: 16,
                                    padding: '12px',
                                    backgroundColor: '#FEF3C7',
                                    border: '1px solid #F59E0B',
                                    borderRadius: 8,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                }}>
                                    <AlertCircle size={16} color="#F59E0B" />
                                    <span style={{ fontSize: 13, color: '#92400E' }}>
                                        This parcel has no property record in our system.
                                    </span>
                                </div>
                            )}

                            {/* Show Property Data if available */}
                            {combinedData.propertyData && (
                                <>
                                    {/* Basic Property Information */}
                                    <div style={{ marginBottom: 20 }}>
                                        <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Info size={16} color="var(--color-primary)" />
                                            Property Information
                                        </h4>
                                        <div style={{
                                            backgroundColor: '#F9FAFB',
                                            padding: 16,
                                            borderRadius: 8,
                                        }}>
                                            <div style={{ marginBottom: 12 }}>
                                                <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 2 }}>UPI</div>
                                                <div style={{ fontSize: 14, fontWeight: 500 }}>{combinedData.propertyData.upi}</div>
                                            </div>

                                            <div style={{ marginBottom: 12 }}>
                                                <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 2 }}>Area</div>
                                                <div style={{ fontSize: 14, fontWeight: 600 }}>{formatArea(combinedData.propertyData.size)}</div>
                                            </div>

                                            {combinedData.propertyData.land_use && (
                                                <div style={{ marginBottom: 12 }}>
                                                    <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 2 }}>Land Use</div>
                                                    <div style={{ fontSize: 14 }}>{combinedData.propertyData.land_use}</div>
                                                </div>
                                            )}

                                            {combinedData.propertyData.right_type && (
                                                <div style={{ marginBottom: 12 }}>
                                                    <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 2 }}>Right Type</div>
                                                    <div style={{ fontSize: 14 }}>{combinedData.propertyData.right_type}</div>
                                                </div>
                                            )}

                                            {combinedData.propertyData.estimated_amount && (
                                                <div style={{ marginBottom: 12 }}>
                                                    <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 2 }}>Estimated Amount</div>
                                                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-primary)' }}>
                                                        RWF {combinedData.propertyData.estimated_amount.toLocaleString()}
                                                    </div>
                                                </div>
                                            )}

                                            {combinedData.propertyData.status && (
                                                <div>
                                                    <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 2 }}>Status</div>
                                                    <span style={{
                                                        padding: '4px 8px',
                                                        backgroundColor: combinedData.propertyData.status === 'published' ? '#F0FDF4' : '#FEF2F2',
                                                        color: combinedData.propertyData.status === 'published' ? '#166534' : '#991B1B',
                                                        borderRadius: 12,
                                                        fontSize: 11,
                                                        display: 'inline-block'
                                                    }}>
                                                        {combinedData.propertyData.status}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Location Information */}
                                    {(combinedData.propertyData.village || combinedData.propertyData.cell ||
                                        combinedData.propertyData.sector || combinedData.propertyData.district) && (
                                            <div style={{ marginBottom: 20 }}>
                                                <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <MapPin size={16} color="var(--color-primary)" />
                                                    Location
                                                </h4>
                                                <div style={{
                                                    backgroundColor: '#F9FAFB',
                                                    padding: 16,
                                                    borderRadius: 8,
                                                }}>
                                                    {combinedData.propertyData.village && (
                                                        <div style={{ marginBottom: 8 }}>
                                                            <span style={{ fontSize: 11, color: '#6B7280', width: 70, display: 'inline-block' }}>Village:</span>
                                                            <span style={{ fontSize: 13, marginLeft: 8 }}>{combinedData.propertyData.village}</span>
                                                        </div>
                                                    )}
                                                    {combinedData.propertyData.cell && (
                                                        <div style={{ marginBottom: 8 }}>
                                                            <span style={{ fontSize: 11, color: '#6B7280', width: 70, display: 'inline-block' }}>Cell:</span>
                                                            <span style={{ fontSize: 13, marginLeft: 8 }}>{combinedData.propertyData.cell}</span>
                                                        </div>
                                                    )}
                                                    {combinedData.propertyData.sector && (
                                                        <div style={{ marginBottom: 8 }}>
                                                            <span style={{ fontSize: 11, color: '#6B7280', width: 70, display: 'inline-block' }}>Sector:</span>
                                                            <span style={{ fontSize: 13, marginLeft: 8 }}>{combinedData.propertyData.sector}</span>
                                                        </div>
                                                    )}
                                                    {combinedData.propertyData.district && (
                                                        <div>
                                                            <span style={{ fontSize: 11, color: '#6B7280', width: 70, display: 'inline-block' }}>District:</span>
                                                            <span style={{ fontSize: 13, marginLeft: 8 }}>{combinedData.propertyData.district}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                    {/* Images Gallery */}
                                    {combinedData.propertyData.images && combinedData.propertyData.images.length > 0 && (
                                        <div style={{ marginBottom: 20 }}>
                                            <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px 0' }}>Images</h4>
                                            <div style={{
                                                position: 'relative',
                                                borderRadius: 8,
                                                overflow: 'hidden',
                                                aspectRatio: '16/9',
                                                backgroundColor: '#F3F4F6',
                                            }}>
                                                <img
                                                    src={`${api.defaults?.baseURL?.replace(/\/$/, '') || ''}/assets/${combinedData.propertyData.images[currentImageIndex]?.file_path}`}
                                                    alt="Property"
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        objectFit: 'cover',
                                                    }}
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x225?text=No+Image';
                                                    }}
                                                />
                                                {combinedData.propertyData.images.length > 1 && (
                                                    <>
                                                        <button
                                                            onClick={() => setCurrentImageIndex((prev) =>
                                                                prev === 0 ? combinedData.propertyData.images.length - 1 : prev - 1
                                                            )}
                                                            style={{
                                                                position: 'absolute',
                                                                left: 6,
                                                                top: '50%',
                                                                transform: 'translateY(-50%)',
                                                                width: 28,
                                                                height: 28,
                                                                borderRadius: 14,
                                                                backgroundColor: 'rgba(255,255,255,0.9)',
                                                                border: 'none',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            <ChevronLeft size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => setCurrentImageIndex((prev) =>
                                                                prev === combinedData.propertyData.images.length - 1 ? 0 : prev + 1
                                                            )}
                                                            style={{
                                                                position: 'absolute',
                                                                right: 6,
                                                                top: '50%',
                                                                transform: 'translateY(-50%)',
                                                                width: 28,
                                                                height: 28,
                                                                borderRadius: 14,
                                                                backgroundColor: 'rgba(255,255,255,0.9)',
                                                                border: 'none',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            <ChevronRight size={14} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Parcel Information */}
                                    {combinedData.propertyData.parcel_information && (
                                        <>
                                            {/* Owners */}
                                            {combinedData.propertyData.parcel_information.owners &&
                                                combinedData.propertyData.parcel_information.owners.length > 0 && (
                                                    <div style={{ marginBottom: 20 }}>
                                                        <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <Users size={16} color="var(--color-primary)" />
                                                            Owners ({combinedData.propertyData.parcel_information.owners.length})
                                                        </h4>
                                                        <div style={{
                                                            backgroundColor: '#F9FAFB',
                                                            borderRadius: 8,
                                                            overflow: 'hidden',
                                                        }}>
                                                            {combinedData.propertyData.parcel_information.owners.map((owner: any, index: number) => (
                                                                <OwnerCard key={index} owner={owner} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                            {/* Representative */}
                                            {combinedData.propertyData.parcel_information.representative && (
                                                <div style={{ marginBottom: 20 }}>
                                                    <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <UserCog size={16} color="var(--color-primary)" />
                                                        Representative
                                                    </h4>
                                                    <div style={{
                                                        backgroundColor: '#F9FAFB',
                                                        padding: 16,
                                                        borderRadius: 8,
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                                            <div style={{
                                                                width: 36,
                                                                height: 36,
                                                                borderRadius: 18,
                                                                backgroundColor: 'var(--color-primary)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                color: 'white',
                                                                fontSize: 16,
                                                                fontWeight: 600,
                                                            }}>
                                                                {combinedData.propertyData.parcel_information.representative.foreNames?.charAt(0) || '?'}
                                                            </div>
                                                            <div>
                                                                <div style={{ fontSize: 14, fontWeight: 600 }}>
                                                                    {combinedData.propertyData.parcel_information.representative.foreNames} {combinedData.propertyData.parcel_information.representative.surname}
                                                                </div>
                                                                {combinedData.propertyData.parcel_information.representative.idNo && (
                                                                    <div style={{ fontSize: 12, color: '#6B7280' }}>
                                                                        ID: {combinedData.propertyData.parcel_information.representative.idNo}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#6B7280', marginTop: 4, flexWrap: 'wrap' }}>
                                                            {combinedData.propertyData.parcel_information.representative.idTypeName && (
                                                                <span>Type: {combinedData.propertyData.parcel_information.representative.idTypeName}</span>
                                                            )}
                                                            {combinedData.propertyData.parcel_information.representative.countryName && (
                                                                <span>Country: {combinedData.propertyData.parcel_information.representative.countryName}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* Property Details */}
                                    {combinedData.propertyData.details && (
                                        <div style={{ marginBottom: 20 }}>
                                            <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px 0' }}>Property Details</h4>
                                            <div style={{
                                                backgroundColor: '#F9FAFB',
                                                padding: 16,
                                                borderRadius: 8,
                                            }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                                                    {combinedData.propertyData.details.condition && (
                                                        <div>
                                                            <div style={{ fontSize: 11, color: '#6B7280' }}>Condition</div>
                                                            <div style={{ fontSize: 13 }}>{combinedData.propertyData.details.condition}</div>
                                                        </div>
                                                    )}
                                                    {combinedData.propertyData.details.building_type && (
                                                        <div>
                                                            <div style={{ fontSize: 11, color: '#6B7280' }}>Building Type</div>
                                                            <div style={{ fontSize: 13 }}>{combinedData.propertyData.details.building_type}</div>
                                                        </div>
                                                    )}
                                                    {combinedData.propertyData.details.built_area && (
                                                        <div>
                                                            <div style={{ fontSize: 11, color: '#6B7280' }}>Built Area</div>
                                                            <div style={{ fontSize: 13 }}>{combinedData.propertyData.details.built_area} m²</div>
                                                        </div>
                                                    )}
                                                    {combinedData.propertyData.details.floors && (
                                                        <div>
                                                            <div style={{ fontSize: 11, color: '#6B7280' }}>Floors</div>
                                                            <div style={{ fontSize: 13 }}>{combinedData.propertyData.details.floors}</div>
                                                        </div>
                                                    )}
                                                    {combinedData.propertyData.details.bedrooms && (
                                                        <div>
                                                            <div style={{ fontSize: 11, color: '#6B7280' }}>Bedrooms</div>
                                                            <div style={{ fontSize: 13 }}>{combinedData.propertyData.details.bedrooms}</div>
                                                        </div>
                                                    )}
                                                    {combinedData.propertyData.details.bathrooms && (
                                                        <div>
                                                            <div style={{ fontSize: 11, color: '#6B7280' }}>Bathrooms</div>
                                                            <div style={{ fontSize: 13 }}>{combinedData.propertyData.details.bathrooms}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Show External Data if available and no property data */}
                            {combinedData.externalData && (
                                <div>
                                    {/* External Registry Information */}
                                    <div style={{ marginBottom: 20 }}>
                                        <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Globe size={16} color="var(--color-primary)" />
                                            External Registry Information
                                        </h4>
                                        <div style={{
                                            backgroundColor: '#F9FAFB',
                                            padding: 16,
                                            borderRadius: 8,
                                        }}>
                                            <div style={{ marginBottom: 12 }}>
                                                <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 2 }}>UPI</div>
                                                <div style={{ fontSize: 14, fontWeight: 500 }}>{combinedData.externalData.parcelDetails.upi}</div>
                                            </div>

                                            <div style={{ marginBottom: 12 }}>
                                                <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 2 }}>Area</div>
                                                <div style={{ fontSize: 14, fontWeight: 600 }}>{formatArea(combinedData.externalData.parcelDetails.area)}</div>
                                            </div>

                                            {combinedData.externalData.parcelDetails.landUse && (
                                                <div style={{ marginBottom: 12 }}>
                                                    <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 2 }}>Land Use</div>
                                                    <div style={{ fontSize: 14 }}>{combinedData.externalData.parcelDetails.landUse.landUseTypeNameEnglish}</div>
                                                </div>
                                            )}

                                            {combinedData.externalData.parcelDetails.rightTypeName && (
                                                <div style={{ marginBottom: 12 }}>
                                                    <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 2 }}>Right Type</div>
                                                    <div style={{ fontSize: 14 }}>{combinedData.externalData.parcelDetails.rightTypeName}</div>
                                                </div>
                                            )}

                                            {combinedData.externalData.parcelDetails.remainingLeaseTerm && (
                                                <div style={{ marginBottom: 12 }}>
                                                    <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 2 }}>Remaining Lease</div>
                                                    <div style={{ fontSize: 14 }}>{combinedData.externalData.parcelDetails.remainingLeaseTerm} years</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* External Location */}
                                    {combinedData.externalData.parcelDetails.address && (
                                        <div style={{ marginBottom: 20 }}>
                                            <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <MapPin size={16} color="var(--color-primary)" />
                                                Location
                                            </h4>
                                            <div style={{
                                                backgroundColor: '#F9FAFB',
                                                padding: 16,
                                                borderRadius: 8,
                                            }}>
                                                <div style={{ fontSize: 13, marginBottom: 4 }}>{combinedData.externalData.parcelDetails.address.string}</div>
                                                <div style={{ fontSize: 12, color: '#6B7280' }}>
                                                    {combinedData.externalData.parcelDetails.address.villageName && <span>{combinedData.externalData.parcelDetails.address.villageName}, </span>}
                                                    {combinedData.externalData.parcelDetails.address.cellName && <span>{combinedData.externalData.parcelDetails.address.cellName}, </span>}
                                                    {combinedData.externalData.parcelDetails.address.sectorName && <span>{combinedData.externalData.parcelDetails.address.sectorName}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {/* Representative */}
                                    {combinedData.externalData.parcelRepresentative && (
                                        <div style={{ marginBottom: 20 }}>
                                            <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <UserCog size={16} color="var(--color-primary)" />
                                                Representative (Registry)
                                            </h4>
                                            <div style={{
                                                backgroundColor: '#F9FAFB',
                                                padding: 16,
                                                borderRadius: 8,
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                                    <div style={{
                                                        width: 36,
                                                        height: 36,
                                                        borderRadius: 18,
                                                        backgroundColor: 'var(--color-primary)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: 'white',
                                                        fontSize: 16,
                                                        fontWeight: 600,
                                                    }}>
                                                        {combinedData.externalData.parcelRepresentative.foreNames?.replace(" ", "").charAt(0) || '?'}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: 14, fontWeight: 600 }}>
                                                            {combinedData.externalData.parcelRepresentative.foreNames} {combinedData.externalData.parcelRepresentative.surname}
                                                        </div>
                                                        {combinedData.externalData.parcelRepresentative.idNo && (
                                                            <div style={{ fontSize: 12, color: '#6B7280' }}>
                                                                ID: {combinedData.externalData.parcelRepresentative.idNo}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#6B7280', marginTop: 4, flexWrap: 'wrap' }}>
                                                    {combinedData.externalData.parcelRepresentative.idTypeName && (
                                                        <span>Type: {combinedData.externalData.parcelRepresentative.idTypeName}</span>
                                                    )}
                                                    {combinedData.externalData.parcelRepresentative.countryName && (
                                                        <span>Country: {combinedData.externalData.parcelRepresentative.countryName}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {/* External Owners */}
                                    {combinedData.externalData.owners && combinedData.externalData.owners.length > 0 && (
                                        <div style={{ marginBottom: 20 }}>
                                            <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Users size={16} color="var(--color-primary)" />
                                                Owners ({combinedData.externalData.owners.length})
                                            </h4>
                                            <div style={{
                                                backgroundColor: '#F9FAFB',
                                                borderRadius: 8,
                                                overflow: 'hidden',
                                            }}>
                                                {combinedData.externalData.owners.map((owner: any, index: number) => (
                                                    <div key={index} style={{
                                                        padding: '12px',
                                                        borderBottom: index < (combinedData.externalData?.owners?.length || 0) - 1 ? '1px solid #E5E7EB' : 'none',
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                            <div style={{
                                                                width: 32,
                                                                height: 32,
                                                                borderRadius: 16,
                                                                backgroundColor: 'var(--color-primary)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                color: 'white',
                                                                fontSize: 14,
                                                                fontWeight: 600,
                                                            }}>
                                                                {owner.fullName?.charAt(0) || '?'}
                                                            </div>
                                                            <div>
                                                                <div style={{ fontSize: 13, fontWeight: 600 }}>{owner.fullName}</div>
                                                                {owner.idNo && (
                                                                    <div style={{ fontSize: 11, color: '#6B7280' }}>ID: {owner.idNo}</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 11, color: '#6B7280', flexWrap: 'wrap' }}>
                                                            {owner.countryId && <span>Country: {owner.countryId}</span>}
                                                            {owner.gender && <span>Gender: {owner.gender === 'M' ? 'Male' : 'Female'}</span>}
                                                            {owner.share && <span>Share: {owner.share}%</span>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* External Valuation */}
                                    {combinedData.externalData.valuationValues && (
                                        <div style={{ marginBottom: 20 }}>
                                            <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px 0' }}>Valuation Range</h4>
                                            <div style={{
                                                backgroundColor: '#F9FAFB',
                                                padding: 16,
                                                borderRadius: 8,
                                            }}>
                                                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-primary)' }}>
                                                    RWF {parseInt(combinedData.externalData.valuationValues.minPrice).toLocaleString()} - {parseInt(combinedData.externalData.valuationValues.maxPrice).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Planned Land Uses */}
                                    {combinedData.externalData.plannedLandUses && combinedData.externalData.plannedLandUses.length > 0 && (
                                        <div style={{ marginBottom: 20 }}>
                                            <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px 0' }}>Planned Land Uses</h4>
                                            <div style={{
                                                backgroundColor: '#F9FAFB',
                                                padding: 16,
                                                borderRadius: 8,
                                            }}>
                                                {combinedData.externalData.plannedLandUses.map((use: any, idx: number) => (
                                                    <div key={idx} style={{ fontSize: 13, marginBottom: idx < (combinedData.externalData?.plannedLandUses?.length || 0) - 1 ? 8 : 0 }}>
                                                        • {use.landUseName} {use.area ? `(${formatArea(use.area)})` : ''}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Status Badges */}
                            <div style={{ marginBottom: 20 }}>
                                <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px 0' }}>Status</h4>
                                {/** message if their is no status */}
                                {!combinedData.propertyData?.parcelDetails?.inTransaction && !combinedData.propertyData?.parcelDetails?.underMortgage && !combinedData.propertyData?.parcelDetails?.hasCaveat && (
                                    <><span style={{ color: '#6B7280', fontSize: 13 }}>No Status</span></>
                                )}
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {combinedData.propertyData?.parcelDetails?.inTransaction && (
                                        <span style={{ padding: '4px 8px', backgroundColor: '#FEF2F2', color: '#EF4444', borderRadius: 12, fontSize: 11 }}>
                                            In Transaction
                                        </span>
                                    )}
                                    {combinedData.propertyData?.parcelDetails?.underMortgage && (
                                        <span style={{ padding: '4px 8px', backgroundColor: '#FEF2F2', color: '#EF4444', borderRadius: 12, fontSize: 11 }}>
                                            Under Mortgage
                                        </span>
                                    )}
                                    {combinedData.propertyData?.parcelDetails?.hasCaveat && (
                                        <span style={{ padding: '4px 8px', backgroundColor: '#F3E8FF', color: '#8B5CF6', borderRadius: 12, fontSize: 11 }}>
                                            Has Caveat
                                        </span>
                                    )}

                                    {selectedParcel?.overlapping && (
                                        <span style={{ padding: '4px 8px', backgroundColor: '#FEF2F2', color: '#EF4444', borderRadius: 12, fontSize: 11 }}>
                                            Overlapping
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Uploader Information - Only if property data exists */}
                            {combinedData.propertyData?.uploaded_by && (
                                <div style={{ marginBottom: 16 }}>
                                    <h4 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <User size={16} color="var(--color-primary)" />
                                        Uploaded By
                                    </h4>
                                    <div style={{
                                        backgroundColor: '#F9FAFB',
                                        padding: 12,
                                        borderRadius: 8,
                                    }}>
                                        <div style={{ fontSize: 13, fontWeight: 500 }}>
                                            {combinedData.propertyData.uploaded_by_name}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                                            Type: {combinedData.propertyData.uploader_type}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Category Information - Only if property data exists */}
                            {combinedData.propertyData?.category && (
                                <div style={{ marginBottom: 16 }}>
                                    <h4 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 8px 0' }}>Category</h4>
                                    <div style={{
                                        backgroundColor: '#F9FAFB',
                                        padding: 12,
                                        borderRadius: 8,
                                    }}>
                                        <div style={{ fontSize: 13, fontWeight: 500 }}>
                                            {combinedData.propertyData.category.label}
                                        </div>
                                        {combinedData.propertyData.subcategory && (
                                            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                                                Subcategory: {combinedData.propertyData.subcategory.label}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Video Link - Only if property data exists */}
                            {combinedData.propertyData?.video_link &&
                                combinedData.propertyData.video_link !== "http://localhost:5173/login" && (
                                    <div style={{ marginBottom: 16 }}>
                                        <h4 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Film size={16} color="var(--color-primary)" />
                                            Video
                                        </h4>
                                        <a
                                            href={combinedData.propertyData.video_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                display: 'inline-block',
                                                padding: '8px 16px',
                                                backgroundColor: 'var(--color-primary)',
                                                color: 'white',
                                                textDecoration: 'none',
                                                borderRadius: 6,
                                                fontSize: 12,
                                            }}
                                        >
                                            Watch Video
                                        </a>
                                    </div>
                                )}
                        </div>
                    )}
                </DraggableModal>

                {/* Global Loading Overlay */}
                {loadingInfo && !combinedData && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(255,255,255,0.7)',
                        backdropFilter: 'blur(2px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 900,
                        pointerEvents: 'none',
                    }}>
                        <div style={{
                            backgroundColor: 'white',
                            padding: '12px 24px',
                            borderRadius: 30,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                        }}>
                            <Loader2 size={20} className="animate-spin" color="var(--color-primary)" />
                            <span style={{ fontSize: 13, color: '#374151' }}>Loading property details...</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
        </>
    );
}