import parse from "wellknown";
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
    Circle,
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
    Building2,
    Hospital,
    School,
    Store,
    Landmark,
    Trees,
    Church,
    Fuel,
    Utensils,
    MapPin,
    Star,
    Info,
    Car,
    Bus,
    Train,
    Bike,
    ParkingCircle,
    PawPrint,
    Banknote,
    Stethoscope,
    Pill,
    Baby,
    Heart,
    Bone,
    Eye,
    Brain,
    Droplet,
    FlaskConical,
    BookOpen,
    GraduationCap,
    Library,
    Mic,
    Palette,
    Drum,
    Coffee,
    Pizza,
    Cake,
    IceCream,
    ShoppingBag,
    ShoppingCart,
    Shirt,
    Sofa,
    Wrench,
    Flower2,
    Gem,
    Dog,
    Cat,
    Wallet,
    Mail,
    FileText,
    Scale,
    Gavel,
    Shield,
    Flame,
    Waves,
    Plane,
    TrainTrack,
    BusFront,
    Bike as BikeIcon,
    ParkingMeter,
    BatteryCharging,
    Church as ChurchIcon,
    LandPlot,
    Drama,
    Music,
    Camera,
    Dumbbell,
    Waves as Beach,
    Mountain,
    Bird,
    Tent,
    Hotel,
    Building,
    Globe,
    Sparkles,
    Wifi,
    Printer,
    Laptop,
    WashingMachine,
    Scissors,
    Theater,
    MicVocal,
    Palette as Art,
    Camera as Photo,
    Scissors as Tattoo,
    Film,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Shield as ShieldIcon,
    Eye as EyeIcon,
    Lock,
    UserCheck,
    UserX,
    AlertTriangle,
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

interface Coordinate {
    lat: string;
    lon: string;
}

interface ValuationValue {
    minPrice?: string;
    maxPrice?: string;
}

interface PlannedLandUse {
    upi: string;
    landUseName: string;
    area?: number;
}

interface LocationDetail {
    villageCode?: string;
    villageName?: string;
    cellCode?: string;
    cellName?: string;
    sectorCode?: string;
    sectorName?: string;
    districtCode?: string;
    districtName?: string;
    provinceCode?: string;
    provinceName?: string;
}

interface ParcelInfo {
    upi: string;
    area?: number;
    size?: number;
    rightType?: string;
    landUse?: string;
    landUseNameEnglish?: string;
    landUseNameKinyarwanda?: string;
    landUseCode?: number;
    owners: Owner[];
    representative?: Representative;
    estimatedAmount?: number;
    images: { id: number; file_path: string }[];
    remainingLeaseTerm?: number;
    transactionStatus: {
        inTransaction: boolean;
        underMortgage: boolean;
        hasCaveat: boolean;
        inProcess?: boolean;
        isUnderMortgage?: boolean;
        isUnderRestriction?: boolean;
        status?: string;
        isPublished?: boolean;
    };
    location: {
        village?: string;
        cell?: string;
        sector?: string;
        district?: string;
        province?: string;
        placeName?: string;
        road?: string;
        neighborhood?: string;
        mainRoad?: string;
        mainRoadDistance?: number;
        parcelLocation?: {
            village?: LocationDetail;
            cell?: LocationDetail;
            sector?: LocationDetail;
            district?: LocationDetail;
            province?: LocationDetail;
        };
    };
    overlapping?: boolean;
    coordinates?: Coordinate[];
    documents?: { id: number; title: string; file_path: string }[];
    valuation?: {
        amount: number;
        date: string;
        valuator: string;
        minPrice?: string;
        maxPrice?: string;
    };
    plannedLandUses?: PlannedLandUse[];
    coordinateReferenceSystem?: string;
    xCoordinate?: string;
    yCoordinate?: string;
    externalDataError?: boolean;
    propertyDataError?: boolean;
    verificationFailed?: boolean;
    dataSource?: 'external' | 'property' | 'both' | 'none';
    // Access control fields
    uploaderId?: number;
    uploaderName?: string;
    uploaderEmail?: string;
    uploaderRole?: string;
    isOwnedByUser?: boolean;
}

interface NearbyPlace {
    id: string;
    name: string;
    category: string;
    type: string;
    subType?: string;
    distance: number; // in meters
    position: [number, number];
    address?: string;
    rating?: number;
    phone?: string;
    hours?: string;
    website?: string;
    road?: string;
}

interface FilterState {
    status: "all" | "overlapping" | "underMortgage" | "inTransaction" | "available" | "myProperties";
    landUse: string[];
    area: [number, number];
    ownership: string;
    nearbyCategories: string[];
    nearbyTypes: string[];
    searchRadius: number; // in meters
    showAllProperties: boolean;
}

interface DraggableModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title: string;
    subtitle?: string;
    isLoading?: boolean;
}

// Access Denied Popup Component
function AccessDeniedPopup({ onClose }: { onClose: () => void }) {
    return (
        <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            padding: 24,
            borderRadius: 12,
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            zIndex: 2000,
            maxWidth: 400,
            textAlign: 'center',
        }}>
            <div style={{ marginBottom: 16 }}>
                <ShieldIcon size={48} color="#EF4444" style={{ margin: '0 auto' }} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: '#111827' }}>
                Access Denied
            </h3>
            <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>
                You don't have permission to view details of this property.
                This property was uploaded by another user.
            </p>
            <button
                onClick={onClose}
                style={{
                    backgroundColor: 'var(--color-primary)',
                    color: 'white',
                    border: 'none',
                    padding: '8px 24px',
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                }}
            >
                Got it
            </button>
        </div>
    );
}

/* =========================
   PRICE FORMATTER
========================= */
function formatPrice(price?: number): string {
    if (!price) return '';

    if (price >= 1000000) {
        return `${(price / 1000000).toFixed(1)}M`;
    } else if (price >= 1000) {
        return `${(price / 1000).toFixed(0)}k`;
    } else {
        return price.toString();
    }
}

/* =========================
   DISTANCE FORMATTER
========================= */
function formatDistance(meters: number): string {
    if (meters >= 1000) {
        return `${(meters / 1000).toFixed(1)}km`;
    } else {
        return `${Math.round(meters)}m`;
    }
}

/* =========================
   POI TYPE ICONS MAPPING
========================= */
const poiIcons: Record<string, { icon: React.ReactNode; color: string; emoji: string; category: string }> = {
    // Healthcare
    hospital: { icon: <Hospital size={16} />, color: "#EF4444", emoji: "🏥", category: "Healthcare" },
    clinic: { icon: <Stethoscope size={16} />, color: "#F97316", emoji: "🏥", category: "Healthcare" },
    pharmacy: { icon: <Pill size={16} />, color: "#10B981", emoji: "💊", category: "Healthcare" },
    doctors: { icon: <Stethoscope size={16} />, color: "#3B82F6", emoji: "👨‍⚕️", category: "Healthcare" },
    dentist: { icon: <Baby size={16} />, color: "#8B5CF6", emoji: "🦷", category: "Healthcare" },

    // Education
    school: { icon: <School size={16} />, color: "#3B82F6", emoji: "🏫", category: "Education" },
    university: { icon: <GraduationCap size={16} />, color: "#6366F1", emoji: "🎓", category: "Education" },
    kindergarten: { icon: <Baby size={16} />, color: "#EC4899", emoji: "🧸", category: "Education" },
    library: { icon: <Library size={16} />, color: "#8B5CF6", emoji: "📚", category: "Education" },
    college: { icon: <GraduationCap size={16} />, color: "#6366F1", emoji: "🏛️", category: "Education" },

    // Food & Dining
    restaurant: { icon: <Utensils size={16} />, color: "#F59E0B", emoji: "🍽️", category: "Food & Dining" },
    cafe: { icon: <Coffee size={16} />, color: "#8B5CF6", emoji: "☕", category: "Food & Dining" },
    fast_food: { icon: <Pizza size={16} />, color: "#EF4444", emoji: "🍔", category: "Food & Dining" },
    bar: { icon: <Coffee size={16} />, color: "#6B7280", emoji: "🍺", category: "Food & Dining" },
    pub: { icon: <Coffee size={16} />, color: "#6B7280", emoji: "🍻", category: "Food & Dining" },
    bakery: { icon: <Cake size={16} />, color: "#F97316", emoji: "🥖", category: "Food & Dining" },

    // Retail & Commerce
    supermarket: { icon: <ShoppingCart size={16} />, color: "#10B981", emoji: "🛒", category: "Retail" },
    mall: { icon: <Building2 size={16} />, color: "#6366F1", emoji: "🏬", category: "Retail" },
    market: { icon: <Store size={16} />, color: "#F59E0B", emoji: "🏪", category: "Retail" },
    shop: { icon: <Store size={16} />, color: "#10B981", emoji: "🛒", category: "Retail" },
    convenience: { icon: <ShoppingBag size={16} />, color: "#10B981", emoji: "🏪", category: "Retail" },
    department_store: { icon: <Building2 size={16} />, color: "#6366F1", emoji: "🏬", category: "Retail" },

    // Finance
    bank: { icon: <Landmark size={16} />, color: "#6366F1", emoji: "🏦", category: "Finance" },
    atm: { icon: <Banknote size={16} />, color: "#10B981", emoji: "💳", category: "Finance" },
    bureau_de_change: { icon: <Wallet size={16} />, color: "#F59E0B", emoji: "💱", category: "Finance" },

    // Transportation
    fuel: { icon: <Fuel size={16} />, color: "#DC2626", emoji: "⛽", category: "Transportation" },
    petrol_station: { icon: <Fuel size={16} />, color: "#DC2626", emoji: "⛽", category: "Transportation" },
    bus_stop: { icon: <Bus size={16} />, color: "#3B82F6", emoji: "🚌", category: "Transportation" },
    bus_station: { icon: <BusFront size={16} />, color: "#3B82F6", emoji: "🚏", category: "Transportation" },
    taxi: { icon: <Car size={16} />, color: "#F59E0B", emoji: "🚕", category: "Transportation" },
    parking: { icon: <ParkingCircle size={16} />, color: "#3B82F6", emoji: "🅿️", category: "Transportation" },
    bicycle_rental: { icon: <BikeIcon size={16} />, color: "#10B981", emoji: "🚲", category: "Transportation" },

    // Emergency
    police: { icon: <Shield size={16} />, color: "#1F2937", emoji: "👮", category: "Emergency" },
    fire_station: { icon: <Flame size={16} />, color: "#EF4444", emoji: "🚒", category: "Emergency" },

    // Religion
    place_of_worship: { icon: <Church size={16} />, color: "#8B5CF6", emoji: "⛪", category: "Religion" },
    church: { icon: <Church size={16} />, color: "#8B5CF6", emoji: "⛪", category: "Religion" },
    mosque: { icon: <Church size={16} />, color: "#10B981", emoji: "🕌", category: "Religion" },
    temple: { icon: <Building2 size={16} />, color: "#F59E0B", emoji: "🛕", category: "Religion" },

    // Recreation
    park: { icon: <Trees size={16} />, color: "#059669", emoji: "🌳", category: "Recreation" },
    playground: { icon: <Baby size={16} />, color: "#F59E0B", emoji: "🛝", category: "Recreation" },
    gym: { icon: <Dumbbell size={16} />, color: "#3B82F6", emoji: "💪", category: "Recreation" },
    fitness_centre: { icon: <Dumbbell size={16} />, color: "#3B82F6", emoji: "🏋️", category: "Recreation" },
    sports_centre: { icon: <Dumbbell size={16} />, color: "#3B82F6", emoji: "⚽", category: "Recreation" },
    stadium: { icon: <Building2 size={16} />, color: "#3B82F6", emoji: "🏟️", category: "Recreation" },

    // Tourism
    hotel: { icon: <Hotel size={16} />, color: "#6366F1", emoji: "🏨", category: "Tourism" },
    hostel: { icon: <Building size={16} />, color: "#F59E0B", emoji: "🏠", category: "Tourism" },
    guest_house: { icon: <Building size={16} />, color: "#10B981", emoji: "🏡", category: "Tourism" },
    tourist_info: { icon: <Info size={16} />, color: "#3B82F6", emoji: "ℹ️", category: "Tourism" },
    landmark: { icon: <Landmark size={16} />, color: "#8B5CF6", emoji: "🗽", category: "Tourism" },
    monument: { icon: <Landmark size={16} />, color: "#8B5CF6", emoji: "🗿", category: "Tourism" },

    // Government & Public Services
    town_hall: { icon: <Building2 size={16} />, color: "#374151", emoji: "🏛️", category: "Government" },
    post_office: { icon: <Mail size={16} />, color: "#3B82F6", emoji: "📮", category: "Government" },
    courthouse: { icon: <Scale size={16} />, color: "#8B5CF6", emoji: "⚖️", category: "Government" },
    prison: { icon: <Building2 size={16} />, color: "#374151", emoji: "🏛️", category: "Government" },

    // Default
    default: { icon: <MapPin size={16} />, color: "#6B7280", emoji: "📍", category: "Other" },
};

/* =========================
   CUSTOM MARKER ICONS
========================= */
const createPoiIcon = (type: string, isSelected: boolean = false) => {
    const poi = poiIcons[type] || poiIcons.default;
    return L.divIcon({
        html: `<div style="
      background-color: ${poi.color};
      width: ${isSelected ? 32 : 24}px;
      height: ${isSelected ? 32 : 24}px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      border: ${isSelected ? '3px solid white' : '2px solid white'};
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      font-size: ${isSelected ? 16 : 12}px;
      transition: all 0.2s;
    ">${poi.emoji}</div>`,
        className: 'custom-poi-icon',
        iconSize: [isSelected ? 32 : 24, isSelected ? 32 : 24],
        iconAnchor: [isSelected ? 16 : 12, isSelected ? 16 : 12],
    });
};

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
    const [size, setSize] = useState({ width: 480, height: 600 });
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

                const minWidth = 380;
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
   DISTANCE CALCULATOR
========================= */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/* =========================
   COLOR ENGINE - YOUR PARCELS IN BLUE
========================= */
function getParcelColor(status: ParcelStatus, overlapping: boolean, isOwnedByUser: boolean): string {
    // Your parcels are blue
    if (isOwnedByUser) return "#3B82F6"; // Bright blue for user's properties

    // Other parcels use the original color logic
    if (overlapping) return "#F97316";
    if (status.inTransaction) return "#EF4444";
    if (status.underMortgage) return "#F59E0B";
    if (status.hasCaveat) return "#8B5CF6";
    if (status.isProvisional) return "#6B7280";
    if (status.status === 'published') return "var(--color-primary)";
    if (status.status === 'pending') return "#F59E0B";
    if (status.status === 'draft') return "#6B7280";
    return "var(--color-primary)";
}

/* =========================
   PRICE MARKER COMPONENT
========================= */
function PriceMarker({ position, price }: { position: [number, number]; price?: number }) {
    const formattedPrice = formatPrice(price);

    if (!formattedPrice) return null;

    const markerIcon = L.divIcon({
        html: `<div style="
      background-color: white;
      color: var(--color-primary);
      padding: 4px 8px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border: 2px solid var(--color-primary);
      white-space: nowrap;
    ">${formattedPrice}</div>`,
        className: 'price-marker',
        iconSize: [60, 30],
        iconAnchor: [30, 15],
    });

    return (
        <Marker position={position} icon={markerIcon} />
    );
}

/* =========================
   ERROR BANNER COMPONENT
========================= */
function ErrorBanner({
    type,
    message
}: {
    type: 'warning' | 'error' | 'info';
    message: string;
}) {
    const colors = {
        warning: {
            bg: '#FFFBEB',
            border: '#F59E0B',
            text: '#92400E',
            icon: <AlertCircle size={16} color="#F59E0B" />
        },
        error: {
            bg: '#FEF2F2',
            border: '#EF4444',
            text: '#991B1B',
            icon: <XCircle size={16} color="#EF4444" />
        },
        info: {
            bg: '#EFF6FF',
            border: '#3B82F6',
            text: '#1E40AF',
            icon: <Info size={16} color="#3B82F6" />
        }
    };

    const style = colors[type];

    return (
        <div style={{
            padding: '12px',
            backgroundColor: style.bg,
            border: `1px solid ${style.border}`,
            borderRadius: 8,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
        }}>
            {style.icon}
            <span style={{ fontSize: 13, color: style.text }}>{message}</span>
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
    loggedUser?: any | null;
}

export default function ParcelMap({
    height = '100%',
    width = '100%',
    showSidebar = true,
    loggedUser = null
}: ParcelMapProps) {
    const [parcels, setParcels] = useState<any[]>([]);
    const [selectedUPI, setSelectedUPI] = useState<string | null>(null);
    const [parcelInfo, setParcelInfo] = useState<ParcelInfo | null>(null);
    const [loadingMap, setLoadingMap] = useState(true);
    const [loadingInfo, setLoadingInfo] = useState(false);
    const [loadingNearby, setLoadingNearby] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [mapStyle, setMapStyle] = useState<"osm" | "satellite" | "dark" | "streets">("streets");
    const [filter, setFilter] = useState<FilterState>({
        status: "all",
        landUse: [],
        area: [0, 10000],
        ownership: "all",
        nearbyCategories: [],
        nearbyTypes: [],
        searchRadius: 500,
        showAllProperties: true,
    });
    const [showFilters, setShowFilters] = useState(false);
    const [enable3D, setEnable3D] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [autoZoom, setAutoZoom] = useState(true);
    const [mapCenter] = useState<[number, number]>([-1.9403, 29.8739]);
    const [initialLoadDone, setInitialLoadDone] = useState(false);
    const [clickedParcel, setClickedParcel] = useState<string | null>(null);
    const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
    const [showNearby, setShowNearby] = useState(true);
    const [selectedPlace, setSelectedPlace] = useState<NearbyPlace | null>(null);

    // Access control states
    const [accessDeniedPopup, setAccessDeniedPopup] = useState(false);
    const [deniedParcelUpi, setDeniedParcelUpi] = useState<string | null>(null);

    /* =========================
       GET CURRENT USER ID
    ========================== */
    const getCurrentUserId = useCallback((): number | null => {
        if (!loggedUser) return null;

        const userId = loggedUser.id ||
            loggedUser.userId ||
            loggedUser.user_id ||
            loggedUser.uid ||
            (loggedUser.user && loggedUser.user.id) ||
            null;

        return userId ? parseInt(userId.toString()) : null;
    }, [loggedUser]);

    /* =========================
       CHECK IF PARCEL BELONGS TO USER
    ========================== */
    const isParcelOwnedByUser = useCallback((parcel: any): boolean => {
        const currentUserId = getCurrentUserId();
        if (!currentUserId) return false;

        // Admin/Super Admin can see all as their own
        const userRoles = loggedUser?.roles || loggedUser?.role || [];
        const userRolesArray = Array.isArray(userRoles) ? userRoles : [userRoles];
        if (userRolesArray.includes('admin') || userRolesArray.includes('super_admin')) {
            return true;
        }

        // Check uploader_id - in your actual data, this might be different
        // Let's try multiple possible field names
        const uploaderId = parcel.uploaded_by || parcel.uploader_id || parcel.created_by || parcel.user_id;
        if (!uploaderId) return false;

        return parseInt(uploaderId.toString()) === currentUserId;
    }, [getCurrentUserId, loggedUser]);

    /* =========================
       FETCH MAPPING DATA
    ========================== */
    useEffect(() => {
        async function loadParcels() {
            setLoadingMap(true);
            try {
                const res = await api.get("/api/mappings");
                console.log("Raw parcels data from API:", res.data);
                // Add uploader info to parcels (use actual data from your API)
                const parcelsWithOwnership = res.data.map((parcel: any) => ({
                    ...parcel,
                    // Use actual fields from your API response
                    uploader_id: parcel.uploaded_by || parcel.user_id || 1,
                    uploader_name: parcel.uploaded_by_name || parcel.user_name || 'Unknown',
                    uploader_email: parcel.uploaded_by_email || '',
                }));
                setParcels(parcelsWithOwnership);

                // Select first user-owned parcel if exists, otherwise first parcel
                if (parcelsWithOwnership.length > 0) {
                    const userParcel = parcelsWithOwnership.find((p: any) => isParcelOwnedByUser(p));
                    setSelectedUPI(userParcel?.upi || parcelsWithOwnership[0].upi);
                }
            } catch (err) {
                console.error("Failed to load parcels", err);
            } finally {
                setLoadingMap(false);
                setInitialLoadDone(true);
            }
        }
        loadParcels();
    }, [isParcelOwnedByUser]);

    /* =========================
       PARSE + OVERLAP DETECTION
    ========================== */
    const parsedParcels = useMemo(() => {
        if (!parcels.length) return [];

        const temp = parcels.map((p) => {
            try {
                const geo = parse(p.official_registry_polygon);
                const positions = geo.coordinates[0].map(([lng, lat]: [number, number]) => [lat, lng]);
                // Check if this parcel belongs to current user
                const isOwnedByUser = isParcelOwnedByUser(p);

                return {
                    ...p,
                    geojson: geo,
                    positions,
                    center: getCenter(positions),
                    overlapping: false,
                    overlapsWith: [],
                    isOwnedByUser,
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
                        temp[i].overlapping = true;
                        temp[j].overlapping = true;
                        temp[i].overlapsWith.push(temp[j].upi);
                        temp[j].overlapsWith.push(temp[i].upi);
                    }
                } catch (e) {
                    console.error("Error checking overlap", e);
                }
            }
        }

        return temp.map((p) => ({
            ...p,
            color: getParcelColor(p.status_details || {}, p.overlapping, p.isOwnedByUser),
            overlapping: p.overlapping,
        }));
    }, [parcels, isParcelOwnedByUser]);

    /* =========================
       FILTERING
    ========================== */
    /* =========================
       FILTERING - FIXED VERSION
    ========================== */
    const filteredParcels = useMemo(() => {


        const result = parsedParcels.filter(p => {
            // Log each parcel for debugging

            // Status filter - make these optional, not required
            if (filter.status === "myProperties" && !p.isOwnedByUser) {
                console.log(`  Filtered out: not my property`);
                return false;
            }
            if (filter.status === "overlapping" && !p.overlapping) {
                console.log(`  Filtered out: not overlapping`);
                return false;
            }
            if (filter.status === "underMortgage") {
                // Check if status_details exists before accessing underMortgage
                if (!p.status_details || !p.status_details.underMortgage) {
                    console.log(`  Filtered out: not under mortgage`);
                    return false;
                }
            }
            if (filter.status === "inTransaction") {
                if (!p.status_details || !p.status_details.inTransaction) {
                    console.log(`  Filtered out: not in transaction`);
                    return false;
                }
            }
            if (filter.status === "available") {
                const isAvailable = !p.overlapping &&
                    (!p.status_details || (!p.status_details.inTransaction && !p.status_details.underMortgage));
                if (!isAvailable) {
                    console.log(`  Filtered out: not available`);
                    return false;
                }
            }

            // Search filter - case insensitive
            if (searchQuery && searchQuery.trim() !== "") {
                if (!p.upi.toLowerCase().includes(searchQuery.toLowerCase())) {
                    console.log(`  Filtered out: search query mismatch`);
                    return false;
                }
            }

            // Area filter - only apply if area exists and filter has valid values
            if (p.status_details?.area) {
                const area = p.status_details.area;
                // Only filter if area is outside the range
                if (area < filter.area[0] || area > filter.area[1]) {
                    console.log(`  Filtered out: area ${area} outside range [${filter.area[0]}, ${filter.area[1]}]`);
                    return false;
                }
            } else {
                // If area doesn't exist, include it by default? Or exclude? Let's include.
                console.log(`  Parcel ${p.upi} has no area data, including by default`);
            }

            // Show all properties toggle
            if (!filter.showAllProperties && !p.isOwnedByUser) {
                console.log(`  Filtered out: showAllProperties=false and not owned by user`);
                return false;
            }

            console.log(`  ✅ Parcel ${p.upi} passed all filters`);
            return true;
        });

        console.log(`Filtered result: ${result.length} parcels out of ${parsedParcels.length}`);
        return result;
    }, [parsedParcels, filter, searchQuery]);
    const selectedParcel = useMemo(() =>
        filteredParcels.find((p) => p.upi === selectedUPI),
        [filteredParcels, selectedUPI]
    );

    /* =========================
       FETCH NEARBY PLACES (OSM Overpass API)
    ========================== */
    useEffect(() => {
        async function fetchNearbyPlaces() {
            if (!selectedParcel || !showNearby) return;

            setLoadingNearby(true);

            try {
                const [lat, lng] = selectedParcel.center;
                const radius = filter.searchRadius;

                const overpassUrl = 'https://overpass-api.de/api/interpreter';

                const query = `
          [out:json];
          (
            node["amenity"](around:${radius},${lat},${lng});
            way["amenity"](around:${radius},${lat},${lng});
            node["shop"](around:${radius},${lat},${lng});
            way["shop"](around:${radius},${lat},${lng});
            node["leisure"](around:${radius},${lat},${lng});
            way["leisure"](around:${radius},${lat},${lng});
            node["tourism"](around:${radius},${lat},${lng});
            way["tourism"](around:${radius},${lat},${lng});
            node["highway"="bus_stop"](around:${radius},${lat},${lng});
            node["public_transport"](around:${radius},${lat},${lng});
            node["healthcare"](around:${radius},${lat},${lng});
            node["education"](around:${radius},${lat},${lng});
            node["place_of_worship"](around:${radius},${lat},${lng});
          );
          out body;
          >;
          out skel qt;
        `;

                const response = await fetch(overpassUrl, {
                    method: 'POST',
                    body: query,
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch nearby places');
                }

                const data = await response.json();

                const places: NearbyPlace[] = data.elements
                    .filter((element: any) => element.lat && element.lon)
                    .map((element: any) => {
                        const tags = element.tags || {};

                        let type = 'default';
                        let category = 'Other';

                        if (tags.amenity) {
                            type = tags.amenity;
                            category = poiIcons[type]?.category || 'Amenity';
                        } else if (tags.shop) {
                            type = tags.shop;
                            category = 'Retail';
                        } else if (tags.leisure) {
                            type = tags.leisure;
                            category = 'Recreation';
                        } else if (tags.tourism) {
                            type = tags.tourism;
                            category = 'Tourism';
                        } else if (tags.highway === 'bus_stop') {
                            type = 'bus_stop';
                            category = 'Transportation';
                        } else if (tags.healthcare) {
                            type = tags.healthcare;
                            category = 'Healthcare';
                        } else if (tags.education) {
                            type = tags.education;
                            category = 'Education';
                        } else if (tags.place_of_worship) {
                            type = 'place_of_worship';
                            category = 'Religion';
                        }

                        let name = tags.name || tags.brand || tags.operator;
                        if (!name) {
                            name = type.split('_').map((word: string) =>
                                word.charAt(0).toUpperCase() + word.slice(1)
                            ).join(' ');
                        }

                        return {
                            id: element.id.toString(),
                            name,
                            category,
                            type,
                            distance: calculateDistance(lat, lng, element.lat, element.lon),
                            position: [element.lat, element.lon],
                            address: tags['addr:full'] || tags['addr:street'] || tags['addr:city'],
                            phone: tags.phone,
                            hours: tags.opening_hours,
                            website: tags.website,
                            road: tags['addr:street'],
                            rating: tags.rating ? parseFloat(tags.rating) : undefined,
                        };
                    })
                    .filter((place: NearbyPlace) => place.distance <= radius)
                    .sort((a: NearbyPlace, b: NearbyPlace) => a.distance - b.distance);

                setNearbyPlaces(places);

                // Find the nearest road
                const roadQuery = `
          [out:json];
          (
            way["highway"](around:${radius},${lat},${lng});
          );
          out body geom;
        `;

                const roadResponse = await fetch(overpassUrl, {
                    method: 'POST',
                    body: roadQuery
                });

                const roadData = await roadResponse.json();

                if (roadData.elements.length > 0) {
                    let closestRoad = null;
                    let minDistance = Infinity;

                    roadData.elements.forEach((element: any) => {
                        if (element.geometry) {
                            element.geometry.forEach((point: any) => {
                                const distance = calculateDistance(lat, lng, point.lat, point.lon);
                                if (distance < minDistance) {
                                    minDistance = distance;
                                    closestRoad = {
                                        name: element.tags?.name ||
                                            (element.tags?.highway ?
                                                element.tags.highway.split('_').map((w: string) =>
                                                    w.charAt(0).toUpperCase() + w.slice(1)
                                                ).join(' ') :
                                                'Road'),
                                        distance: minDistance,
                                    };
                                }
                            });
                        }
                    });

                    if (closestRoad && parcelInfo) {
                        setParcelInfo(prev => prev ? {
                            ...prev,
                            location: {
                                ...prev.location,
                                mainRoad: closestRoad.name,
                                mainRoadDistance: Math.round(closestRoad.distance),
                                road: closestRoad.name,
                            }
                        } : null);
                    }
                }

            } catch (error) {
                console.error("Error fetching nearby places:", error);
                setNearbyPlaces([]);
            } finally {
                setLoadingNearby(false);
            }
        }

        fetchNearbyPlaces();
    }, [selectedParcel, showNearby, filter.searchRadius, parcelInfo]);

    /* =========================
       FETCH PARCEL INFO - FIXED VERSION
    ========================== */
    const handleParcelClick = useCallback(async (upi: string) => {
        if (clickedParcel === upi && loadingInfo) return;

        // Find the parcel
        const parcel = parsedParcels.find((p) => p.upi === upi);

        if (!parcel) return;

        // Check if this is user's own parcel
        if (!parcel.isOwnedByUser) {
            setDeniedParcelUpi(upi);
            setAccessDeniedPopup(true);
            return;
        }

        setSelectedUPI(upi);
        setAutoZoom(true);
        setLoadingInfo(true);
        setClickedParcel(upi);
        setSelectedPlace(null);

        // Initialize with basic info from parsed parcels - same as original
        let mergedInfo: ParcelInfo = {
            upi: upi,
            area: parcel?.status_details?.area,
            owners: [],
            images: [],
            transactionStatus: {
                inTransaction: false,
                underMortgage: false,
                hasCaveat: false,
            },
            location: {},
            overlapping: parcel?.overlapping,
            coordinates: parcel?.coordinates,
            uploaderId: parcel?.uploader_id,
            uploaderName: parcel?.uploader_name,
            uploaderEmail: parcel?.uploader_email,
            uploaderRole: parcel?.uploader_role,
            isOwnedByUser: true,
        };

        let externalDataError = false;
        let propertyDataError = false;
        let verificationFailed = false;
        let dataSource: 'external' | 'property' | 'both' | 'none' = 'none';

        try {
            // Try external API first - SAME AS ORIGINAL with "string" as owner_id
            try {
                const externalResponse = await api.post('/api/external/parcel', {
                    upi: upi,
                    owner_id: "string" // Keep exactly as original - this is what worked before
                });

                const externalData = externalResponse.data;

                if (externalData) {
                    dataSource = 'external';

                    // Map external data exactly as original
                    mergedInfo = {
                        ...mergedInfo,
                        area: externalData.size || externalData.area || mergedInfo.area,
                        size: externalData.size,
                        landUse: externalData.landUseNameEnglish || externalData.landUse,
                        landUseNameEnglish: externalData.landUseNameEnglish,
                        landUseNameKinyarwanda: externalData.landUseNameKinyarwanda,
                        landUseCode: externalData.landUseCode,
                        rightType: externalData.rightType,
                        coordinateReferenceSystem: externalData.coordinateReferenceSystem,
                        xCoordinate: externalData.xCoordinate,
                        yCoordinate: externalData.yCoordinate,
                        remainingLeaseTerm: externalData.remainingLeaseTerm,
                        owners: externalData.owners?.map((owner: any) => ({
                            fullName: owner.fullName,
                            sharePercentage: owner.sharePercentage,
                            idNo: owner.idNo,
                            idTypeName: owner.idTypeName,
                            countryName: owner.countryName,
                            gender: owner.gender,
                            maritalStatus: owner.maritalStatus,
                        })) || [],
                        representative: externalData.representative ? {
                            foreNames: externalData.representative.foreNames,
                            surname: externalData.representative.surname,
                            idNo: externalData.representative.idNo,
                            idTypeName: externalData.representative.idTypeName,
                            countryName: externalData.representative.countryName,
                            gender: externalData.representative.gender,
                            maritalStatus: externalData.representative.maritalStatus,
                            address: externalData.representative.address,
                        } : undefined,
                        transactionStatus: {
                            ...mergedInfo.transactionStatus,
                            inProcess: externalData.inProcess,
                            isUnderMortgage: externalData.isUnderMortgage,
                            isUnderRestriction: externalData.isUnderRestriction,
                            underMortgage: externalData.isUnderMortgage || false,
                            hasCaveat: externalData.isUnderRestriction || false,
                        },
                        location: {
                            ...mergedInfo.location,
                            parcelLocation: externalData.parcelLocation || externalData.parcel_location,
                            village: externalData.parcelLocation?.village?.villageName ||
                                externalData.parcel_location?.village?.villageName,
                            cell: externalData.parcelLocation?.cell?.cellName ||
                                externalData.parcel_location?.cell?.cellName,
                            sector: externalData.parcelLocation?.sector?.sectorName ||
                                externalData.parcel_location?.sector?.sectorName,
                            district: externalData.parcelLocation?.district?.districtName ||
                                externalData.parcel_location?.district?.districtName,
                            province: externalData.parcelLocation?.province?.provinceName ||
                                externalData.parcel_location?.province?.provinceName,
                        },
                        coordinates: externalData.coordinates || mergedInfo.coordinates,
                        plannedLandUses: externalData.plannedLandUses,
                        valuation: externalData.valuationValue ? {
                            minPrice: externalData.valuationValue.minPrice,
                            maxPrice: externalData.valuationValue.maxPrice,
                            amount: parseFloat(externalData.valuationValue.maxPrice || '0'),
                            date: new Date().toISOString(),
                            valuator: 'External System',
                        } : undefined,
                        estimatedAmount: externalData.valuationValue?.maxPrice ?
                            parseFloat(externalData.valuationValue.maxPrice) : undefined,
                    };
                }
            } catch (externalErr) {
                console.warn("External API failed:", externalErr);
                externalDataError = true;
            }

            // Try property API - exactly as original
            try {
                const propertyResponse = await api.get(`/api/property/properties/by-upi/${encodeURIComponent(upi)}`);
                const propertyData = propertyResponse.data;

                if (propertyData) {
                    dataSource = dataSource === 'external' ? 'both' : 'property';

                    const isPublished = propertyData.status === 'published';

                    if (!isPublished) {
                        verificationFailed = true;
                    }

                    mergedInfo = {
                        ...mergedInfo,
                        area: propertyData.size || mergedInfo.area,
                        landUse: propertyData.land_use || mergedInfo.landUse,
                        rightType: propertyData.right_type || mergedInfo.rightType,
                        estimatedAmount: propertyData.estimated_amount || mergedInfo.estimatedAmount,
                        images: propertyData.images || mergedInfo.images,
                        documents: propertyData.documents || mergedInfo.documents,
                        owners: propertyData.parcel_information?.owners?.length ?
                            propertyData.parcel_information.owners : mergedInfo.owners,
                        representative: propertyData.parcel_information?.representative || mergedInfo.representative,
                        remainingLeaseTerm: propertyData.parcel_information?.remaining_lease_term || mergedInfo.remainingLeaseTerm,
                        transactionStatus: {
                            ...mergedInfo.transactionStatus,
                            inTransaction: propertyData.details?.inTransaction || mergedInfo.transactionStatus.inTransaction,
                            underMortgage: propertyData.details?.underMortgage || mergedInfo.transactionStatus.underMortgage,
                            hasCaveat: propertyData.details?.hasCaveat || mergedInfo.transactionStatus.hasCaveat,
                            status: propertyData.status,
                            isPublished: propertyData.status === 'published',
                        },
                        location: {
                            ...mergedInfo.location,
                            village: propertyData.village || mergedInfo.location.village,
                            cell: propertyData.cell || mergedInfo.location.cell,
                            sector: propertyData.sector || mergedInfo.location.sector,
                            district: propertyData.district || mergedInfo.location.district,
                            province: propertyData.provinceNameEnglish || mergedInfo.location.province,
                        },
                        valuation: propertyData.valuation || mergedInfo.valuation,
                    };
                }
            } catch (propertyErr) {
                console.warn("Property API failed:", propertyErr);
                propertyDataError = true;
            }

            mergedInfo.externalDataError = externalDataError;
            mergedInfo.propertyDataError = propertyDataError;
            mergedInfo.verificationFailed = verificationFailed;
            mergedInfo.dataSource = dataSource;

            setParcelInfo(mergedInfo);
            setCurrentImageIndex(0);

        } catch (err) {
            console.error("Failed to load parcel info:", err);
            setParcelInfo({
                ...mergedInfo,
                externalDataError: true,
                propertyDataError: true,
                verificationFailed: true,
                dataSource: 'none',
            });
        } finally {
            setLoadingInfo(false);
            setClickedParcel(null);
        }
    }, [parsedParcels, clickedParcel, loadingInfo]);

    /* =========================
       HANDLE EMPTY CLICK
    ========================== */
    const handleEmptyClick = useCallback(() => {
        setSelectedUPI(null);
        setParcelInfo(null);
        setSelectedPlace(null);
        setAutoZoom(false);
    }, []);

    /* =========================
       HANDLE MODAL CLOSE
    ========================== */
    const handleModalClose = useCallback(() => {
        setParcelInfo(null);
        setSelectedPlace(null);
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

    /* =========================
       GROUP PLACES BY CATEGORY
    ========================== */
    const groupedPlaces = useMemo(() => {
        const groups: Record<string, NearbyPlace[]> = {};

        nearbyPlaces.forEach(place => {
            if (!groups[place.category]) {
                groups[place.category] = [];
            }
            groups[place.category].push(place);
        });

        Object.keys(groups).forEach(key => {
            groups[key].sort((a, b) => a.distance - b.distance);
        });

        return groups;
    }, [nearbyPlaces]);

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
            {/* Access Denied Popup */}
            {accessDeniedPopup && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000,
                }} onClick={() => setAccessDeniedPopup(false)}>
                    <div onClick={(e) => e.stopPropagation()}>
                        <AccessDeniedPopup onClose={() => setAccessDeniedPopup(false)} />
                    </div>
                </div>
            )}

            {/* ================= SIDEBAR ================= */}
            {/* ================= SIDEBAR ================= */}
            {showSidebar && (
                <div style={{
                    width: 340,
                    backgroundColor: '#ffffff',
                    borderRight: '1px solid #E5E7EB',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100vh',
                    overflow: 'hidden',
                }}>
                    {/* Header - Fixed */}
                    <div style={{
                        padding: '16px',
                        borderBottom: '1px solid #E5E7EB',
                        backgroundColor: '#ffffff',
                        flexShrink: 0,
                    }}>
                        <h2 style={{
                            fontSize: 18,
                            fontWeight: 600,
                            color: 'var(--color-primary)',
                            margin: '0 0 4px 0',
                        }}>
                            Property Explorer
                        </h2>
                        <p style={{ color: '#6B7280', fontSize: 13, margin: 0 }}>
                            {filteredParcels.length} parcels • {filter.showAllProperties ? 'All properties' : 'My properties only'}
                        </p>
                        {loggedUser && (
                            <div style={{
                                marginTop: 8,
                                padding: 8,
                                backgroundColor: '#F3F4F6',
                                borderRadius: 6,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                            }}>
                                <UserCheck size={14} color="var(--color-primary)" />
                                <span style={{ fontSize: 12, color: '#374151' }}>
                                    Logged in as: {loggedUser.first_name || loggedUser.email || 'User'}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Search - Fixed */}
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

                    {/* Filter Toggles - Fixed */}
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

                        <button
                            onClick={() => setShowNearby(!showNearby)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 12px',
                                backgroundColor: showNearby ? 'var(--color-primary)' : '#F3F4F6',
                                color: showNearby ? 'white' : '#374151',
                                border: 'none',
                                borderRadius: 20,
                                fontSize: 12,
                                fontWeight: 500,
                                cursor: 'pointer',
                            }}
                        >
                            <MapPin size={14} />
                            {showNearby ? 'Hide Nearby' : 'Show Nearby'}
                        </button>

                        {/* Show All Properties Toggle */}
                        <button
                            onClick={() => setFilter(prev => ({ ...prev, showAllProperties: !prev.showAllProperties }))}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 12px',
                                backgroundColor: filter.showAllProperties ? 'var(--color-primary)' : '#F3F4F6',
                                color: filter.showAllProperties ? 'white' : '#374151',
                                border: 'none',
                                borderRadius: 20,
                                fontSize: 12,
                                fontWeight: 500,
                                cursor: 'pointer',
                            }}
                        >
                            {filter.showAllProperties ? <Eye size={14} /> : <EyeOff size={14} />}
                            {filter.showAllProperties ? 'All Properties' : 'My Properties'}
                        </button>
                    </div>

                    {/* Scrollable Content Area */}
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: '#ffffff',
                        paddingBottom:"100px",
                    }}>
                        {/* Filter Panel - Scrollable */}
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
                                                <option value="myProperties">My Properties</option>
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
                                                ownership: "all",
                                                nearbyCategories: [],
                                                nearbyTypes: [],
                                                searchRadius: 500,
                                                showAllProperties: true,
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

                        {/* Nearby Places Panel - Scrollable */}
                        {showNearby && selectedParcel && (
                            <div style={{
                                padding: '12px',
                                backgroundColor: '#F9FAFB',
                                margin: '0 12px 12px',
                                borderRadius: 8,
                                border: '1px solid #E5E7EB',
                                flexShrink: 0,
                                maxHeight: '400px',
                                display: 'flex',
                                flexDirection: 'column',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexShrink: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <MapPin size={14} color="var(--color-primary)" />
                                        <h4 style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>
                                            Nearby Places ({filter.searchRadius}m)
                                        </h4>
                                    </div>
                                    {loadingNearby && <Loader2 size={12} className="animate-spin" color="var(--color-primary)" />}
                                </div>

                                <div style={{ marginBottom: 8, flexShrink: 0 }}>
                                    <input
                                        type="range"
                                        min="100"
                                        max="2000"
                                        step="100"
                                        value={filter.searchRadius}
                                        onChange={(e) => setFilter({ ...filter, searchRadius: Number(e.target.value) })}
                                        style={{ width: '100%' }}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#6B7280' }}>
                                        <span>100m</span>
                                        <span>{filter.searchRadius}m</span>
                                        <span>2000m</span>
                                    </div>
                                </div>

                                {/* Scrollable Nearby Places List */}
                                <div style={{
                                    flex: 1,
                                    overflowY: 'auto',
                                    maxHeight: '300px',
                                }}>
                                    {loadingNearby ? (
                                        <div style={{ padding: '16px', textAlign: 'center' }}>
                                            <Loader2 size={24} className="animate-spin" color="var(--color-primary)" />
                                            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 8 }}>
                                                Discovering nearby places...
                                            </div>
                                        </div>
                                    ) : nearbyPlaces.length > 0 ? (
                                        <>
                                            {Object.entries(groupedPlaces).map(([category, places]) => (
                                                <div key={category} style={{ marginBottom: 12 }}>
                                                    <h5 style={{
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                        margin: '0 0 6px 0',
                                                        color: '#374151',
                                                        paddingBottom: 2,
                                                        borderBottom: '1px solid #E5E7EB',
                                                    }}>
                                                        {category} ({places.length})
                                                    </h5>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                        {places.map((place) => (
                                                            <div
                                                                key={place.id}
                                                                onClick={() => setSelectedPlace(place)}
                                                                style={{
                                                                    padding: '6px',
                                                                    backgroundColor: selectedPlace?.id === place.id ? '#F0FDF4' : 'white',
                                                                    borderRadius: 6,
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s',
                                                                    border: selectedPlace?.id === place.id ? '1px solid var(--color-primary)' : '1px solid transparent',
                                                                }}
                                                            >
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                    <div style={{
                                                                        width: 24,
                                                                        height: 24,
                                                                        borderRadius: 12,
                                                                        backgroundColor: poiIcons[place.type]?.color || '#6B7280',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        color: 'white',
                                                                        fontSize: 12,
                                                                    }}>
                                                                        {poiIcons[place.type]?.emoji || '📍'}
                                                                    </div>
                                                                    <div style={{ flex: 1 }}>
                                                                        <div style={{ fontSize: 12, fontWeight: 500 }}>{place.name}</div>
                                                                        <div style={{ fontSize: 11, color: '#6B7280' }}>
                                                                            {formatDistance(place.distance)}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {places.length > 3 && (
                                                            <div style={{ fontSize: 11, color: '#6B7280', textAlign: 'center' }}>
                                                                +{places.length - 3} more
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    ) : (
                                        <div style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: '#6B7280' }}>
                                            No nearby places found within {filter.searchRadius}m
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Parcel List - Scrollable */}
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
                                                    {parcel.isOwnedByUser && (
                                                        <span style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 2,
                                                            backgroundColor: '#3B82F6',
                                                            color: 'white',
                                                            fontSize: 10,
                                                            padding: '2px 6px',
                                                            borderRadius: 12,
                                                        }}>
                                                            <UserCheck size={10} />
                                                            My Property
                                                        </span>
                                                    )}
                                                    {clickedParcel === parcel.upi && loadingInfo && (
                                                        <Loader2 size={12} className="animate-spin" color="var(--color-primary)" />
                                                    )}
                                                </div>
                                                <div style={{ fontSize: 12, color: '#6B7280' }}>
                                                    Area: {parcel.status_details?.area || 'N/A'} m²
                                                </div>
                                                {selectedUPI === parcel.upi && parcelInfo?.location?.mainRoad && (
                                                    <div style={{ fontSize: 11, color: 'var(--color-primary)', marginTop: 2 }}>
                                                        🛣️ {parcelInfo.location.mainRoad} ({formatDistance(parcelInfo.location.mainRoadDistance || 0)})
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
                                            {parcel.overlapping && <span style={{ color: '#F97316' }}>⚠️ Overlap</span>}
                                            {parcel.status_details?.underMortgage && <span style={{ color: '#F59E0B' }}>🏦 Mortgage</span>}
                                            {parcel.status_details?.inTransaction && <span style={{ color: '#EF4444' }}>🔄 Active</span>}
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
                    zoomControl={false}
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

                    {/* Search Radius Circle */}
                    {selectedParcel && showNearby && (
                        <Circle
                            center={selectedParcel.center}
                            radius={filter.searchRadius}
                            pathOptions={{
                                color: 'var(--color-primary)',
                                fillColor: 'var(--color-primary)',
                                fillOpacity: 0.05,
                                weight: 1,
                                dashArray: '5, 5',
                            }}
                        />
                    )}

                    {/* Parcel Polygons */}
                    {filteredParcels.map((parcel) => (
                        <Polygon
                            key={parcel.upi}
                            positions={parcel.positions}
                            pathOptions={{
                                color: parcel.color,
                                weight: selectedUPI === parcel.upi ? 3 : 1,
                                fillColor: parcel.color,
                                fillOpacity: selectedUPI === parcel.upi ? 0.3 : 0.15,
                                // smoothFactor: 1,
                            }}
                            eventHandlers={{
                                click: (e) => {
                                    L.DomEvent.stopPropagation(e);
                                    handleParcelClick(parcel.upi);
                                },
                                mouseover: (e) => {
                                    e.target.setStyle({ weight: 2, fillOpacity: 0.25 });
                                },
                                mouseout: (e) => {
                                    e.target.setStyle({
                                        weight: selectedUPI === parcel.upi ? 3 : 1,
                                        fillOpacity: selectedUPI === parcel.upi ? 0.3 : 0.15,
                                    });
                                },
                            }}
                        >
                            <Tooltip sticky direction="top">
                                <div style={{ fontSize: 11, padding: '2px 6px' }}>
                                    <strong>{parcel.upi.substring(0, 8)}...</strong><br />
                                    Area: {parcel.status_details?.area || 'N/A'} m²
                                    {parcel.isOwnedByUser ? (
                                        <><br /><span style={{ color: '#3B82F6' }}>✓ Your Property</span></>
                                    ) : (
                                        <><br /><span style={{ color: '#6B7280' }}>👤 Other User's Property</span></>
                                    )}
                                </div>
                            </Tooltip>
                        </Polygon>
                    ))}

                    {/* Price Markers on Selected Parcel */}
                    {selectedParcel && parcelInfo?.estimatedAmount && selectedParcel.isOwnedByUser && (
                        <PriceMarker
                            position={selectedParcel.center}
                            price={parcelInfo.estimatedAmount}
                        />
                    )}

                    {/* Selected Parcel Marker - Only show for user's own parcels */}
                    {selectedParcel && selectedParcel.isOwnedByUser && (
                        <Marker position={selectedParcel.center}>
                            <Popup>
                                <div style={{ minWidth: '250px', maxHeight: '300px', overflowY: 'auto' }}>
                                    <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-primary)' }}>
                                        {selectedParcel.upi}
                                    </h4>

                                    {/* Your Property Badge */}
                                    <div style={{
                                        marginBottom: 8,
                                        padding: 4,
                                        backgroundColor: '#EFF6FF',
                                        borderRadius: 4,
                                        fontSize: 11,
                                        color: '#1E40AF',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                    }}>
                                        <UserCheck size={12} />
                                        Your Property - Full Access
                                    </div>

                                    {/* Data Source Indicators */}
                                    {parcelInfo?.dataSource && (
                                        <div style={{ marginBottom: 8, fontSize: 11 }}>
                                            {parcelInfo.dataSource === 'both' && (
                                                <span style={{ color: '#10B981' }}>✅ Verified (Multiple Sources)</span>
                                            )}
                                            {parcelInfo.dataSource === 'external' && (
                                                <span style={{ color: '#3B82F6' }}>ℹ️ External Registry Data</span>
                                            )}
                                            {parcelInfo.dataSource === 'property' && (
                                                <span style={{ color: '#F59E0B' }}>⚠️ Local Property Data</span>
                                            )}
                                            {parcelInfo.dataSource === 'none' && (
                                                <span style={{ color: '#EF4444' }}>❌ Verification Failed</span>
                                            )}
                                        </div>
                                    )}

                                    {/* Error Messages */}
                                    {parcelInfo?.externalDataError && (
                                        <div style={{ marginBottom: 8, padding: 4, backgroundColor: '#FEF2F2', borderRadius: 4, fontSize: 11, color: '#991B1B' }}>
                                            ⚠️ Failed to verify with external registry
                                        </div>
                                    )}

                                    {parcelInfo?.propertyDataError && (
                                        <div style={{ marginBottom: 8, padding: 4, backgroundColor: '#FEF2F2', borderRadius: 4, fontSize: 11, color: '#991B1B' }}>
                                            ⚠️ Property data unavailable
                                        </div>
                                    )}

                                    {parcelInfo?.verificationFailed && (
                                        <div style={{ marginBottom: 8, padding: 4, backgroundColor: '#FEF2F2', borderRadius: 4, fontSize: 11, color: '#991B1B' }}>
                                            ⚠️ This property does not appear to be on the market
                                        </div>
                                    )}

                                    <div style={{ fontSize: 12 }}>
                                        <div><strong>Area:</strong> {parcelInfo?.area || selectedParcel.status_details?.area || 'N/A'} m²</div>
                                        {parcelInfo?.landUse && <div><strong>Land Use:</strong> {parcelInfo.landUse}</div>}
                                        {parcelInfo?.rightType && <div><strong>Right Type:</strong> {parcelInfo.rightType}</div>}
                                        {parcelInfo?.estimatedAmount && (
                                            <div><strong>Est. Price:</strong> RWF {parcelInfo.estimatedAmount.toLocaleString()}</div>
                                        )}
                                        {parcelInfo?.valuation?.minPrice && parcelInfo?.valuation?.maxPrice && (
                                            <div><strong>Valuation Range:</strong> RWF {parseFloat(parcelInfo.valuation.minPrice).toLocaleString()} - {parseFloat(parcelInfo.valuation.maxPrice).toLocaleString()}</div>
                                        )}
                                        {parcelInfo?.remainingLeaseTerm && (
                                            <div><strong>Lease Term:</strong> {parcelInfo.remainingLeaseTerm} years</div>
                                        )}
                                        {parcelInfo?.location?.mainRoad && (
                                            <>
                                                <div><strong>Main Road:</strong> {parcelInfo.location.mainRoad}</div>
                                                <div><strong>Distance to Road:</strong> {formatDistance(parcelInfo.location.mainRoadDistance || 0)}</div>
                                            </>
                                        )}

                                        {/* Location Info */}
                                        {(parcelInfo?.location?.village || parcelInfo?.location?.cell || parcelInfo?.location?.sector) && (
                                            <div style={{ marginTop: 8 }}>
                                                <strong>Location:</strong>
                                                <ul style={{ margin: '4px 0 0 0', paddingLeft: 16 }}>
                                                    {parcelInfo.location.village && <li>Village: {parcelInfo.location.village}</li>}
                                                    {parcelInfo.location.cell && <li>Cell: {parcelInfo.location.cell}</li>}
                                                    {parcelInfo.location.sector && <li>Sector: {parcelInfo.location.sector}</li>}
                                                    {parcelInfo.location.district && <li>District: {parcelInfo.location.district}</li>}
                                                    {parcelInfo.location.province && <li>Province: {parcelInfo.location.province}</li>}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Owners */}
                                        {parcelInfo?.owners && parcelInfo.owners.length > 0 && (
                                            <div style={{ marginTop: 8 }}>
                                                <strong>Owners:</strong>
                                                <ul style={{ margin: '4px 0 0 0', paddingLeft: 16 }}>
                                                    {parcelInfo.owners.map((owner, idx) => (
                                                        <li key={idx} style={{ fontSize: 11 }}>
                                                            {owner.fullName} {owner.sharePercentage ? `(${owner.sharePercentage})` : ''}
                                                        </li>
                                                    ))}
                                                    {parcelInfo.owners.length > 2 && (
                                                        <li style={{ fontSize: 11 }}>+{parcelInfo.owners.length - 2} more</li>
                                                    )}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Nearby Places */}
                                        {nearbyPlaces.length > 0 && (
                                            <div style={{ marginTop: 8 }}>
                                                <strong>Nearby ({nearbyPlaces.length} places within {filter.searchRadius}m):</strong>
                                                <ul style={{ margin: '4px 0 0 0', paddingLeft: 16, maxHeight: 100, overflowY: 'auto' }}>
                                                    {nearbyPlaces.map(place => (
                                                        <li key={place.id} style={{ fontSize: 11 }}>
                                                            {poiIcons[place.type]?.emoji || '📍'} {place.name} ({formatDistance(place.distance)})
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Popup>
                            <Tooltip permanent direction="top" offset={[0, -15]}>
                                <div style={{
                                    backgroundColor: 'var(--color-primary)',
                                    color: 'white',
                                    padding: '2px 8px',
                                    borderRadius: 12,
                                    fontSize: 10,
                                    fontWeight: 500,
                                }}>
                                    Selected
                                </div>
                            </Tooltip>
                        </Marker>
                    )}

                    {/* Nearby Places Markers */}
                    {showNearby && nearbyPlaces.map((place) => (
                        <Marker
                            key={place.id}
                            position={place.position}
                            icon={createPoiIcon(place.type, selectedPlace?.id === place.id)}
                            eventHandlers={{
                                click: () => setSelectedPlace(place),
                            }}
                        >
                            <Popup>
                                <div style={{ minWidth: '200px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                        <div style={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: 14,
                                            backgroundColor: poiIcons[place.type]?.color || '#6B7280',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white',
                                            fontSize: 14,
                                        }}>
                                            {poiIcons[place.type]?.emoji || '📍'}
                                        </div>
                                        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{place.name}</h4>
                                    </div>
                                    <div style={{ fontSize: 12 }}>
                                        <div><strong>Category:</strong> {place.category}</div>
                                        <div><strong>Type:</strong> {place.type.replace('_', ' ')}</div>
                                        <div><strong>Distance:</strong> {formatDistance(place.distance)}</div>
                                        {place.address && <div><strong>Address:</strong> {place.address}</div>}
                                        {place.phone && <div><strong>Phone:</strong> {place.phone}</div>}
                                        {place.hours && <div><strong>Hours:</strong> {place.hours}</div>}
                                        {place.rating && <div><strong>Rating:</strong> ⭐ {place.rating}/5</div>}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    <ZoomControl position="bottomright" />
                    <ScaleControl position="bottomleft" metric={true} imperial={false} />
                    <Map3DView enabled={enable3D} />
                    {selectedParcel && autoZoom && (
                        <ZoomToParcel parcel={selectedParcel} shouldZoom={autoZoom} />
                    )}
                </MapContainer>

                {/* Property Modal - Only shown for user's own parcels */}
                <DraggableModal
                    isOpen={!!parcelInfo && !!selectedParcel?.isOwnedByUser}
                    onClose={handleModalClose}
                    title="Property Details"
                    subtitle={`UPI: ${parcelInfo?.upi || ''}`}
                    isLoading={loadingInfo}
                >
                    {parcelInfo && !loadingInfo && (
                        <div>
                            {/* Your Property Badge */}
                            <div style={{
                                marginBottom: 16,
                                padding: '8px 12px',
                                backgroundColor: '#EFF6FF',
                                borderRadius: 8,
                                border: '1px solid #3B82F6',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                            }}>
                                <UserCheck size={16} color="#3B82F6" />
                                <span style={{ fontSize: 12, fontWeight: 500, color: '#1E40AF' }}>
                                    Your Property - Full Access
                                </span>
                            </div>

                            {/* Data Source & Error Banners */}
                            {parcelInfo.dataSource === 'none' && (
                                <ErrorBanner
                                    type="error"
                                    message="Verification failed. Unable to fetch property data from any source."
                                />
                            )}

                            {parcelInfo.externalDataError && (
                                <ErrorBanner
                                    type="warning"
                                    message="External registry verification failed. Showing available local data."
                                />
                            )}

                            {parcelInfo.propertyDataError && (
                                <ErrorBanner
                                    type="warning"
                                    message="Property data unavailable. Showing external registry data only."
                                />
                            )}

                            {parcelInfo.verificationFailed && (
                                <ErrorBanner
                                    type="info"
                                    message="This property does not appear to be on the market."
                                />
                            )}

                            {/* Data Source Badge */}
                            {parcelInfo.dataSource && parcelInfo.dataSource !== 'none' && (
                                <div style={{
                                    marginBottom: 16,
                                    padding: '8px 12px',
                                    backgroundColor: parcelInfo.dataSource === 'both' ? '#F0FDF4' :
                                        parcelInfo.dataSource === 'external' ? '#EFF6FF' :
                                            '#FFFBEB',
                                    borderRadius: 8,
                                    border: `1px solid ${parcelInfo.dataSource === 'both' ? '#86EFAC' :
                                        parcelInfo.dataSource === 'external' ? '#93C5FD' :
                                            '#FCD34D'
                                        }`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                }}>
                                    {parcelInfo.dataSource === 'both' && <CheckCircle2 size={16} color="#10B981" />}
                                    {parcelInfo.dataSource === 'external' && <Info size={16} color="#3B82F6" />}
                                    {parcelInfo.dataSource === 'property' && <AlertCircle size={16} color="#F59E0B" />}
                                    <span style={{ fontSize: 12, fontWeight: 500 }}>
                                        {parcelInfo.dataSource === 'both' && 'Data verified from multiple sources'}
                                        {parcelInfo.dataSource === 'external' && 'Data from external registry'}
                                        {parcelInfo.dataSource === 'property' && 'Data from local property records'}
                                    </span>
                                </div>
                            )}

                            {/* Location Header with Road Info */}
                            {(parcelInfo.location.mainRoad || parcelInfo.location.road || parcelInfo.location.neighborhood) && (
                                <div style={{
                                    marginBottom: 16,
                                    padding: 12,
                                    backgroundColor: '#F0F9FF',
                                    borderRadius: 8,
                                    border: '1px solid #BAE6FD',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                        <MapPin size={14} color="#0284C7" />
                                        <span style={{ fontSize: 13, fontWeight: 600, color: '#0369A1' }}>
                                            Location & Accessibility
                                        </span>
                                    </div>
                                    {parcelInfo.location.mainRoad && (
                                        <div style={{ fontSize: 12, color: '#075985', marginLeft: 20 }}>
                                            🛣️ Main Road: {parcelInfo.location.mainRoad} ({formatDistance(parcelInfo.location.mainRoadDistance || 0)})
                                        </div>
                                    )}
                                    {parcelInfo.location.road && (
                                        <div style={{ fontSize: 12, color: '#075985', marginLeft: 20 }}>
                                            📍 Nearest Road: {parcelInfo.location.road}
                                        </div>
                                    )}
                                    {parcelInfo.location.neighborhood && (
                                        <div style={{ fontSize: 12, color: '#075985', marginLeft: 20 }}>
                                            🏘️ Neighborhood: {parcelInfo.location.neighborhood}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Image Gallery */}
                            {parcelInfo.images && parcelInfo.images.length > 0 && (
                                <div style={{ marginBottom: 16 }}>
                                    <div style={{
                                        position: 'relative',
                                        borderRadius: 8,
                                        overflow: 'hidden',
                                        aspectRatio: '16/9',
                                        backgroundColor: '#F3F4F6',
                                    }}>
                                        <img
                                            src={`${api.defaults?.baseURL?.replace(/\/$/, '') || ''}/assets/${parcelInfo.images[currentImageIndex].file_path}`}
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
                                        {parcelInfo.images.length > 1 && (
                                            <>
                                                <button
                                                    onClick={() => setCurrentImageIndex((prev) =>
                                                        prev === 0 ? parcelInfo.images.length - 1 : prev - 1
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
                                                        prev === parcelInfo.images.length - 1 ? 0 : prev + 1
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

                            {/* Key Info */}
                            <div style={{ marginBottom: 16 }}>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(2, 1fr)',
                                    gap: 8
                                }}>
                                    <div>
                                        <div style={{ fontSize: 11, color: '#6B7280' }}>Area</div>
                                        <div style={{ fontSize: 14, fontWeight: 600 }}>
                                            {parcelInfo.area ? `${parcelInfo.area.toLocaleString()} m²` :
                                                parcelInfo.size ? `${parcelInfo.size.toLocaleString()} m²` : 'N/A'}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 11, color: '#6B7280' }}>Land Use</div>
                                        <div style={{ fontSize: 14, fontWeight: 600 }}>
                                            {parcelInfo.landUseNameEnglish || parcelInfo.landUse || 'N/A'}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 11, color: '#6B7280' }}>Right Type</div>
                                        <div style={{ fontSize: 14, fontWeight: 600 }}>{parcelInfo.rightType || 'N/A'}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 11, color: '#6B7280' }}>Lease Term</div>
                                        <div style={{ fontSize: 14, fontWeight: 600 }}>
                                            {parcelInfo.remainingLeaseTerm ? `${parcelInfo.remainingLeaseTerm} yrs` : 'N/A'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Price Info */}
                            {parcelInfo.estimatedAmount && (
                                <div style={{ marginBottom: 16 }}>
                                    <h4 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 8px 0' }}>Estimated Price</h4>
                                    <div style={{
                                        padding: 12,
                                        backgroundColor: 'rgba(var(--color-primary), 0.05)',
                                        borderRadius: 8,
                                    }}>
                                        <div style={{ fontSize: 18, fontWeight: 600 }}>
                                            RWF {parcelInfo.estimatedAmount.toLocaleString()}
                                        </div>
                                        <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                                            {formatPrice(parcelInfo.estimatedAmount)} on map
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Valuation Range */}
                            {parcelInfo.valuation?.minPrice && parcelInfo.valuation?.maxPrice && (
                                <div style={{ marginBottom: 16 }}>
                                    <h4 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 8px 0' }}>Valuation Range</h4>
                                    <div style={{
                                        padding: 12,
                                        backgroundColor: '#F9FAFB',
                                        borderRadius: 8,
                                    }}>
                                        <div style={{ fontSize: 14, fontWeight: 600 }}>
                                            RWF {parseFloat(parcelInfo.valuation.minPrice).toLocaleString()} - {parseFloat(parcelInfo.valuation.maxPrice).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Administrative Location */}
                            {(parcelInfo.location.village || parcelInfo.location.cell || parcelInfo.location.sector ||
                                parcelInfo.location.district || parcelInfo.location.province) && (
                                    <div style={{ marginBottom: 16 }}>
                                        <h4 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 8px 0' }}>Administrative Location</h4>
                                        <div style={{
                                            backgroundColor: '#F9FAFB',
                                            padding: 12,
                                            borderRadius: 8,
                                            fontSize: 12,
                                        }}>
                                            {parcelInfo.location.village && <div>Village: {parcelInfo.location.village}</div>}
                                            {parcelInfo.location.cell && <div>Cell: {parcelInfo.location.cell}</div>}
                                            {parcelInfo.location.sector && <div>Sector: {parcelInfo.location.sector}</div>}
                                            {parcelInfo.location.district && <div>District: {parcelInfo.location.district}</div>}
                                            {parcelInfo.location.province && <div>Province: {parcelInfo.location.province}</div>}
                                        </div>
                                    </div>
                                )}

                            {/* Nearby Places Summary */}
                            {nearbyPlaces.length > 0 && (
                                <div style={{ marginBottom: 16 }}>
                                    <h4 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <MapPin size={14} />
                                        Nearby Places ({nearbyPlaces.length})
                                    </h4>
                                    <div style={{
                                        backgroundColor: '#F9FAFB',
                                        padding: 12,
                                        borderRadius: 8,
                                        maxHeight: 200,
                                        overflowY: 'auto',
                                    }}>
                                        {Object.entries(groupedPlaces).map(([category, places]) => (
                                            <div key={category} style={{ marginBottom: 8 }}>
                                                <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                                                    {category}
                                                </div>
                                                {places.map(place => (
                                                    <div key={place.id} style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 6,
                                                        padding: '4px',
                                                        backgroundColor: 'white',
                                                        borderRadius: 4,
                                                        marginBottom: 2,
                                                    }}>
                                                        <span style={{ fontSize: 14 }}>{poiIcons[place.type]?.emoji || '📍'}</span>
                                                        <span style={{ fontSize: 11, flex: 1 }}>{place.name}</span>
                                                        <span style={{ fontSize: 10, color: '#6B7280' }}>{formatDistance(place.distance)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Planned Land Uses */}
                            {parcelInfo.plannedLandUses && parcelInfo.plannedLandUses.length > 0 && (
                                <div style={{ marginBottom: 16 }}>
                                    <h4 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 8px 0' }}>Planned Land Uses</h4>
                                    <div style={{
                                        backgroundColor: '#F9FAFB',
                                        padding: 12,
                                        borderRadius: 8,
                                    }}>
                                        {parcelInfo.plannedLandUses.map((use, idx) => (
                                            <div key={idx} style={{ fontSize: 12, marginBottom: idx < parcelInfo.plannedLandUses!.length - 1 ? 4 : 0 }}>
                                                • {use.landUseName} {use.area ? `(${use.area} m²)` : ''}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Owners */}
                            {parcelInfo.owners && parcelInfo.owners.length > 0 && (
                                <div style={{ marginBottom: 16 }}>
                                    <h4 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 8px 0' }}>Owners</h4>
                                    <div style={{
                                        backgroundColor: '#F9FAFB',
                                        borderRadius: 8,
                                        overflow: 'hidden',
                                    }}>
                                        {parcelInfo.owners.map((owner, index) => (
                                            <div key={index} style={{
                                                padding: '8px 12px',
                                                borderBottom: index < Math.min(parcelInfo.owners.length, 3) - 1 ? '1px solid #E5E7EB' : 'none',
                                            }}>
                                                <div style={{ fontSize: 12, fontWeight: 500 }}>{owner.fullName}</div>
                                                <div style={{ fontSize: 11, color: '#6B7280' }}>
                                                    {owner.sharePercentage ? `Share: ${owner.sharePercentage}` : ''}
                                                    {owner.idNo ? ` • ID: ${owner.idNo}` : ''}
                                                    {owner.countryName ? ` • ${owner.countryName}` : ''}
                                                </div>
                                            </div>
                                        ))}
                                        {parcelInfo.owners.length > 3 && (
                                            <div style={{ padding: '8px 12px', fontSize: 11, color: '#6B7280' }}>
                                                +{parcelInfo.owners.length - 3} more
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Representative */}
                            {parcelInfo.representative && (
                                <div style={{ marginBottom: 16 }}>
                                    <h4 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 8px 0' }}>Representative</h4>
                                    <div style={{
                                        backgroundColor: '#F9FAFB',
                                        padding: 12,
                                        borderRadius: 8,
                                    }}>
                                        <div style={{ fontSize: 12, fontWeight: 500 }}>
                                            {parcelInfo.representative.foreNames} {parcelInfo.representative.surname}
                                        </div>
                                        {parcelInfo.representative.idNo && (
                                            <div style={{ fontSize: 11, color: '#6B7280' }}>
                                                ID: {parcelInfo.representative.idNo} ({parcelInfo.representative.idTypeName})
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Status */}
                            <div style={{ marginBottom: 16 }}>
                                <h4 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 8px 0' }}>Status</h4>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {parcelInfo.transactionStatus.inTransaction && (
                                        <span style={{ padding: '4px 8px', backgroundColor: '#FEF2F2', color: '#EF4444', borderRadius: 12, fontSize: 11 }}>
                                            In Transaction
                                        </span>
                                    )}
                                    {parcelInfo.transactionStatus.underMortgage && (
                                        <span style={{ padding: '4px 8px', backgroundColor: '#FFFBEB', color: '#F59E0B', borderRadius: 12, fontSize: 11 }}>
                                            Under Mortgage
                                        </span>
                                    )}
                                    {parcelInfo.transactionStatus.hasCaveat && (
                                        <span style={{ padding: '4px 8px', backgroundColor: '#F3E8FF', color: '#8B5CF6', borderRadius: 12, fontSize: 11 }}>
                                            Has Caveat
                                        </span>
                                    )}
                                    {parcelInfo.transactionStatus.inProcess && (
                                        <span style={{ padding: '4px 8px', backgroundColor: '#EFF6FF', color: '#3B82F6', borderRadius: 12, fontSize: 11 }}>
                                            In Process
                                        </span>
                                    )}
                                    {parcelInfo.overlapping && (
                                        <span style={{ padding: '4px 8px', backgroundColor: '#FFF7ED', color: '#F97316', borderRadius: 12, fontSize: 11 }}>
                                            Overlapping
                                        </span>
                                    )}
                                    {parcelInfo.transactionStatus.isPublished === false && (
                                        <span style={{ padding: '4px 8px', backgroundColor: '#F3F4F6', color: '#6B7280', borderRadius: 12, fontSize: 11 }}>
                                            Not on Market
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Technical Info */}
                            {(parcelInfo.coordinateReferenceSystem || parcelInfo.xCoordinate || parcelInfo.yCoordinate) && (
                                <div style={{ marginBottom: 16 }}>
                                    <h4 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 8px 0' }}>Technical Information</h4>
                                    <div style={{
                                        backgroundColor: '#F9FAFB',
                                        padding: 12,
                                        borderRadius: 8,
                                        fontSize: 11,
                                    }}>
                                        {parcelInfo.coordinateReferenceSystem && <div>CRS: {parcelInfo.coordinateReferenceSystem}</div>}
                                        {parcelInfo.xCoordinate && parcelInfo.xCoordinate !== 'N/A' && <div>X: {parcelInfo.xCoordinate}</div>}
                                        {parcelInfo.yCoordinate && parcelInfo.yCoordinate !== 'N/A' && <div>Y: {parcelInfo.yCoordinate}</div>}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DraggableModal>

                {/* Global Loading Overlay */}
                {loadingInfo && !parcelInfo && (
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
    );
}

// Add missing EyeOff icon
function EyeOff(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
            <circle cx="12" cy="12" r="3" />
            <line x1="3" y1="3" x2="21" y2="21" />
        </svg>
    );
}