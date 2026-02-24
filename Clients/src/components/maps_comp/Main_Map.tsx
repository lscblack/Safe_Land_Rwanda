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
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
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
  Stethoscope,
  Pill,
  Baby,
  Heart,
  Eye,
  Brain,
  Droplet,
  FlaskConical,
  BookOpen,
  GraduationCap,
  Library,
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
  Wallet,
  Mail,
  FileText,
  Scale,
  Shield,
  Flame,
  Waves,
  Plane,
  BusFront,
  Bike as BikeIcon,
  ParkingMeter,
  BatteryCharging,
  LandPlot,
  Music,
  Camera,
  Dumbbell,
  Mountain,
  Tent,
  Hotel,
  Building,
  Globe,
  Wifi,
  Printer,
  Laptop,
  WashingMachine,
  Theater,
  Film,
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
}

interface Owner {
  fullName: string;
  sharePercentage?: string;
  idNo?: string;
  partyId?: string;
}

interface Representative {
  foreNames: string;
  surname: string;
}

interface ParcelInfo {
  upi: string;
  area?: number;
  rightType?: string;
  landUse?: string;
  owners: Owner[];
  representative?: Representative;
  estimatedAmount?: number;
  images: { id: number; file_path: string }[];
  remainingLeaseTerm?: number;
  transactionStatus: {
    inTransaction: boolean;
    underMortgage: boolean;
    hasCaveat: boolean;
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
  };
  overlapping?: boolean;
  coordinates?: number[][];
  documents?: { id: number; title: string; file_path: string }[];
  valuation?: {
    amount: number;
    date: string;
    valuator: string;
  };
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
}

interface Road {
  id: string;
  name: string;
  type: 'main' | 'secondary' | 'residential' | 'highway';
  distance: number;
  position: [number, number];
}

interface FilterState {
  status: "all" | "overlapping" | "underMortgage" | "inTransaction" | "available";
  landUse: string[];
  area: [number, number];
  ownership: string;
  nearbyCategories: string[];
  nearbyTypes: string[];
  searchRadius: number; // in meters
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
   POI TYPE ICONS MAPPING
========================= */
const poiIcons: Record<string, { icon: React.ReactNode; color: string }> = {
  // Healthcare
  hospital: { icon: <Hospital size={16} />, color: "#EF4444" },
  clinic: { icon: <Stethoscope size={16} />, color: "#F97316" },
  pharmacy: { icon: <Pill size={16} />, color: "#10B981" },
  dental: { icon: <Baby size={16} />, color: "#8B5CF6" },
  veterinary: { icon: <Dog size={16} />, color: "#EC4899" },
  rehabilitation: { icon: <Heart size={16} />, color: "#EF4444" },
  eye_care: { icon: <Eye size={16} />, color: "#3B82F6" },
  mental_health: { icon: <Brain size={16} />, color: "#8B5CF6" },
  blood_bank: { icon: <Droplet size={16} />, color: "#EF4444" },
  diagnostic_lab: { icon: <FlaskConical size={16} />, color: "#6B7280" },

  // Education
  school: { icon: <School size={16} />, color: "#3B82F6" },
  university: { icon: <GraduationCap size={16} />, color: "#6366F1" },
  kindergarten: { icon: <Baby size={16} />, color: "#EC4899" },
  library: { icon: <Library size={16} />, color: "#8B5CF6" },
  training_center: { icon: <BookOpen size={16} />, color: "#F59E0B" },

  // Food & Dining
  restaurant: { icon: <Utensils size={16} />, color: "#F59E0B" },
  cafe: { icon: <Coffee size={16} />, color: "#8B5CF6" },
  fast_food: { icon: <Pizza size={16} />, color: "#EF4444" },
  bakery: { icon: <Cake size={16} />, color: "#F97316" },
  ice_cream: { icon: <IceCream size={16} />, color: "#EC4899" },

  // Retail & Commerce
  shop: { icon: <Store size={16} />, color: "#10B981" },
  supermarket: { icon: <ShoppingCart size={16} />, color: "#10B981" },
  mall: { icon: <Building2 size={16} />, color: "#6366F1" },
  boutique: { icon: <Shirt size={16} />, color: "#EC4899" },
  market: { icon: <Store size={16} />, color: "#F59E0B" },
  convenience_store: { icon: <ShoppingBag size={16} />, color: "#10B981" },
  electronics: { icon: <Laptop size={16} />, color: "#3B82F6" },
  clothing: { icon: <Shirt size={16} />, color: "#EC4899" },
  furniture: { icon: <Sofa size={16} />, color: "#8B5CF6" },
  bookstore: { icon: <BookOpen size={16} />, color: "#F59E0B" },
  hardware: { icon: <Wrench size={16} />, color: "#6B7280" },
  florist: { icon: <Flower2 size={16} />, color: "#EC4899" },
  jewelry: { icon: <Gem size={16} />, color: "#F59E0B" },
  pet_store: { icon: <Dog size={16} />, color: "#8B5CF6" },

  // Finance & Services
  bank: { icon: <Landmark size={16} />, color: "#6366F1" },
  atm: { icon: <Wallet size={16} />, color: "#10B981" },
  post_office: { icon: <Mail size={16} />, color: "#3B82F6" },
  insurance: { icon: <Shield size={16} />, color: "#8B5CF6" },
  currency_exchange: { icon: <Wallet size={16} />, color: "#F59E0B" },
  notary: { icon: <FileText size={16} />, color: "#6B7280" },
  legal: { icon: <Scale size={16} />, color: "#8B5CF6" },

  // Safety & Emergency
  police: { icon: <Shield size={16} />, color: "#1F2937" },
  fire_station: { icon: <Flame size={16} />, color: "#EF4444" },
  ambulance: { icon: <Heart size={16} />, color: "#EF4444" },

  // Transportation & Mobility
  fuel_station: { icon: <Fuel size={16} />, color: "#DC2626" },
  bus_stop: { icon: <Bus size={16} />, color: "#3B82F6" },
  bus_station: { icon: <BusFront size={16} />, color: "#3B82F6" },
  train_station: { icon: <Train size={16} />, color: "#8B5CF6" },
  airport: { icon: <Plane size={16} />, color: "#6B7280" },
  taxi_stand: { icon: <Car size={16} />, color: "#F59E0B" },
  parking: { icon: <ParkingCircle size={16} />, color: "#3B82F6" },
  parking_garage: { icon: <ParkingMeter size={16} />, color: "#3B82F6" },
  bicycle_rental: { icon: <BikeIcon size={16} />, color: "#10B981" },
  ev_charging: { icon: <BatteryCharging size={16} />, color: "#10B981" },

  // Religion & Culture
  church: { icon: <Church size={16} />, color: "#8B5CF6" },
  mosque: { icon: <Building2 size={16} />, color: "#10B981" },
  temple: { icon: <Building2 size={16} />, color: "#F59E0B" },
  cultural_center: { icon: <LandPlot size={16} />, color: "#8B5CF6" },
  museum: { icon: <Landmark size={16} />, color: "#8B5CF6" },

  // Recreation & Nature
  park: { icon: <Trees size={16} />, color: "#059669" },
  playground: { icon: <Baby size={16} />, color: "#F59E0B" },
  gym: { icon: <Dumbbell size={16} />, color: "#3B82F6" },
  beach: { icon: <Waves size={16} />, color: "#3B82F6" },
  hiking_trail: { icon: <Mountain size={16} />, color: "#059669" },
  zoo: { icon: <Dog size={16} />, color: "#F59E0B" },

  // Tourism & Hospitality
  hotel: { icon: <Hotel size={16} />, color: "#6366F1" },
  hostel: { icon: <Building size={16} />, color: "#F59E0B" },
  resort: { icon: <Building2 size={16} />, color: "#10B981" },
  tourist_info: { icon: <Info size={16} />, color: "#3B82F6" },

  // Technology & Work
  internet_cafe: { icon: <Wifi size={16} />, color: "#3B82F6" },
  coworking_space: { icon: <Laptop size={16} />, color: "#8B5CF6" },
  office: { icon: <Building2 size={16} />, color: "#6B7280" },
  printing_center: { icon: <Printer size={16} />, color: "#F59E0B" },

  // Others
  car_repair: { icon: <Wrench size={16} />, color: "#6B7280" },
  laundromat: { icon: <WashingMachine size={16} />, color: "#3B82F6" },
  theater: { icon: <Theater size={16} />, color: "#EC4899" },
  cinema: { icon: <Film size={16} />, color: "#8B5CF6" },

  // Roads
  main_road: { icon: <Car size={16} />, color: "#374151" },
  highway: { icon: <Car size={16} />, color: "#1F2937" },

  // Default
  default: { icon: <MapPin size={16} />, color: "#6B7280" },
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
      transition: all 0.2s;
    ">${React.createElement(poi.icon.type, { size: isSelected ? 16 : 12, color: 'white' })}</div>`,
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
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

/* =========================
   COLOR ENGINE
========================= */
function getParcelColor(status: ParcelStatus, overlapping: boolean): string {
  if (overlapping) return "#F97316";
  if (status.inTransaction) return "#EF4444";
  if (status.underMortgage) return "#F59E0B";
  if (status.hasCaveat) return "#8B5CF6";
  if (status.isProvisional) return "#6B7280";
  return "var(--color-primary)";
}

/* =========================
   GENERATE NEARBY PLACES BASED ON COORDINATES
========================= */
function generateNearbyPlaces(lat: number, lng: number, parcelId: string): { places: NearbyPlace[], mainRoad: Road | null } {
  // Use the parcel coordinates to generate unique nearby places
  // This ensures different parcels show different nearby places
  
  // Create a deterministic but varied set of places based on coordinates
  const seed = (lat * 100 + lng * 100).toFixed(2);
  const hash = parseInt(seed.replace(/[^0-9]/g, '')) || 1;
  
  const placeNames = [
    ['Pharmacy', 'Clinic', 'Hospital', 'Dental Clinic', 'Eye Care'],
    ['School', 'Library', 'University', 'Training Center', 'Kindergarten'],
    ['Restaurant', 'Cafe', 'Bakery', 'Fast Food', 'Ice Cream'],
    ['Supermarket', 'Shop', 'Mall', 'Market', 'Bookstore'],
    ['Bank', 'ATM', 'Post Office', 'Insurance', 'Currency Exchange'],
    ['Police', 'Fire Station', 'Ambulance', 'Security Office'],
    ['Fuel Station', 'Bus Stop', 'Taxi Stand', 'Parking', 'EV Charging'],
    ['Church', 'Mosque', 'Temple', 'Cultural Center', 'Museum'],
    ['Park', 'Gym', 'Playground', 'Sports Complex', 'Hiking Trail'],
    ['Hotel', 'Hostel', 'Resort', 'Tourist Info', 'Spa'],
  ];
  
  const categories = [
    'Healthcare', 'Education', 'Food & Dining', 'Retail & Commerce', 
    'Finance & Services', 'Safety & Emergency', 'Transportation & Mobility',
    'Religion & Culture', 'Recreation & Nature', 'Tourism & Hospitality'
  ];
  
  const types = [
    ['pharmacy', 'clinic', 'hospital', 'dental', 'eye_care'],
    ['school', 'library', 'university', 'training_center', 'kindergarten'],
    ['restaurant', 'cafe', 'bakery', 'fast_food', 'ice_cream'],
    ['supermarket', 'shop', 'mall', 'market', 'bookstore'],
    ['bank', 'atm', 'post_office', 'insurance', 'currency_exchange'],
    ['police', 'fire_station', 'ambulance', 'security_office'],
    ['fuel_station', 'bus_stop', 'taxi_stand', 'parking', 'ev_charging'],
    ['church', 'mosque', 'temple', 'cultural_center', 'museum'],
    ['park', 'gym', 'playground', 'sports_complex', 'hiking_trail'],
    ['hotel', 'hostel', 'resort', 'tourist_info', 'spa'],
  ];

  const places: NearbyPlace[] = [];
  
  // Generate 15-25 places based on the parcel coordinates
  const numPlaces = 15 + (hash % 10);
  
  for (let i = 0; i < numPlaces; i++) {
    const categoryIndex = i % categories.length;
    const nameIndex = (i + hash) % placeNames[categoryIndex].length;
    const typeIndex = (i + hash) % types[categoryIndex].length;
    
    // Calculate position within 100m radius
    const angle = (i * 137.5 * hash) % 360; // Golden angle approximation for even distribution
    const distance = 20 + (hash * i % 80); // 20-100m range
    const rad = angle * Math.PI / 180;
    
    // Convert meters to degrees (approximately)
    const latOffset = (distance / 111320) * Math.cos(rad);
    const lngOffset = (distance / (111320 * Math.cos(lat * Math.PI / 180))) * Math.sin(rad);
    
    const placeLat = lat + latOffset;
    const placeLng = lng + lngOffset;
    
    // Generate rating between 3.5 and 5.0
    const rating = 3.5 + (hash * i % 15) / 10;
    
    places.push({
      id: `${parcelId}_${categories[categoryIndex]}_${i}`,
      name: `${placeNames[categoryIndex][nameIndex]} ${i + 1}`,
      category: categories[categoryIndex],
      type: types[categoryIndex][typeIndex],
      distance: Math.round(distance),
      position: [placeLat, placeLng],
      address: `KK ${Math.floor(10 + (hash % 20))} Rd, Kigali`,
      phone: `+250 78${Math.floor(8 + (hash % 2))} ${Math.floor(100 + (hash % 900))} ${Math.floor(100 + (hash % 900))}`,
      hours: ['8AM - 8PM', '24/7', '9AM - 6PM', '7AM - 10PM', '10AM - 11PM'][hash % 5],
      rating: Math.round(rating * 10) / 10,
    });
  }
  
  // Generate main roads
  const roadNames = ['KK 15 Road', 'KN 5 Road', 'KK 14 Road', 'KN 3 Road', 'KK 20 Road', 'KN 8 Ave'];
  const roadTypes: ('main' | 'highway')[] = ['main', 'highway'];
  
  const roads: Road[] = [];
  const numRoads = 2 + (hash % 2);
  
  for (let i = 0; i < numRoads; i++) {
    const roadDistance = 20 + (hash * (i + 1) % 150);
    const angle = (i * 90 + hash) % 360;
    const rad = angle * Math.PI / 180;
    
    const latOffset = (roadDistance / 111320) * Math.cos(rad);
    const lngOffset = (roadDistance / (111320 * Math.cos(lat * Math.PI / 180))) * Math.sin(rad);
    
    roads.push({
      id: `road_${parcelId}_${i}`,
      name: roadNames[(hash + i) % roadNames.length],
      type: roadTypes[i % roadTypes.length],
      distance: roadDistance,
      position: [lat + latOffset, lng + lngOffset],
    });
  }
  
  // Find closest main road
  const mainRoads = roads.filter(r => r.type === 'main' || r.type === 'highway');
  const closestMainRoad = mainRoads.length > 0 
    ? mainRoads.reduce((prev, curr) => prev.distance < curr.distance ? prev : curr)
    : null;
  
  return { places, mainRoad: closestMainRoad };
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
  showSidebar = true 
}: ParcelMapProps) {
  const [parcels, setParcels] = useState<any[]>([]);
  const [selectedUPI, setSelectedUPI] = useState<string | null>(null);
  const [parcelInfo, setParcelInfo] = useState<ParcelInfo | null>(null);
  const [loadingMap, setLoadingMap] = useState(true);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [mapStyle, setMapStyle] = useState<"osm" | "satellite" | "dark" | "streets">("streets");
  const [filter, setFilter] = useState<FilterState>({
    status: "all",
    landUse: [],
    area: [0, 10000],
    ownership: "all",
    nearbyCategories: [],
    nearbyTypes: [],
    searchRadius: 100,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [enable3D, setEnable3D] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [autoZoom, setAutoZoom] = useState(true);
  const [mapCenter] = useState<[number, number]>([-1.9403, 29.8739]);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [clickedParcel, setClickedParcel] = useState<string | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [mainRoad, setMainRoad] = useState<Road | null>(null);
  const [showNearby, setShowNearby] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<NearbyPlace | null>(null);

  /* =========================
     FETCH MAPPING DATA
  ========================== */
  useEffect(() => {
    async function loadParcels() {
      setLoadingMap(true);
      try {
        const res = await api.get("/api/mapping/mappings");
        setParcels(res.data);
        
        if (res.data.length > 0) {
          const lastParcel = res.data[res.data.length - 1];
          setSelectedUPI(lastParcel.upi);
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
        const geo = parse(p.official_registry_polygon);
        const positions = geo.coordinates[0].map(([lng, lat]: [number, number]) => [lat, lng]);
        return { 
          ...p, 
          geojson: geo, 
          positions, 
          center: getCenter(positions), 
          overlapping: false, 
          overlapsWith: [] 
        };
      } catch (e) {
        console.error("Failed to parse polygon for parcel", p.upi, e);
        return null;
      }
    }).filter(Boolean);

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
      color: getParcelColor(p.status_details || {}, p.overlapping),
      overlapping: p.overlapping,
    }));
  }, [parcels]);

  /* =========================
     FILTERING
  ========================== */
  const filteredParcels = useMemo(() => {
    return parsedParcels.filter(p => {
      if (filter.status === "overlapping" && !p.overlapping) return false;
      if (filter.status === "underMortgage" && !p.status_details?.underMortgage) return false;
      if (filter.status === "inTransaction" && !p.status_details?.inTransaction) return false;
      if (filter.status === "available" && (p.overlapping || p.status_details?.inTransaction || p.status_details?.underMortgage)) return false;
      
      if (searchQuery && !p.upi.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      
      if (p.status_details?.area) {
        if (p.status_details.area < filter.area[0] || p.status_details.area > filter.area[1]) return false;
      }
      
      return true;
    });
  }, [parsedParcels, filter, searchQuery]);

  const selectedParcel = useMemo(() => 
    filteredParcels.find((p) => p.upi === selectedUPI),
    [filteredParcels, selectedUPI]
  );

  /* =========================
     GENERATE NEARBY PLACES WHEN PARCEL CHANGES
  ========================== */
  useEffect(() => {
    if (!selectedParcel || !showNearby) {
      setNearbyPlaces([]);
      setMainRoad(null);
      return;
    }
    
    // Generate places based on the selected parcel's coordinates
    const { places, mainRoad: road } = generateNearbyPlaces(
      selectedParcel.center[0], 
      selectedParcel.center[1],
      selectedParcel.upi
    );
    
    setNearbyPlaces(places);
    setMainRoad(road);
    
    // Update parcel info with main road details
    if (road) {
      setParcelInfo(prev => prev ? {
        ...prev,
        location: {
          ...prev.location,
          mainRoad: road.name,
          mainRoadDistance: Math.round(road.distance),
        }
      } : null);
    }
    
  }, [selectedParcel, showNearby]);

  /* =========================
     FETCH PARCEL INFO
  ========================== */
  const handleParcelClick = useCallback(async (upi: string) => {
    if (clickedParcel === upi && loadingInfo) return;
    
    setSelectedUPI(upi);
    setAutoZoom(true);
    setLoadingInfo(true);
    setClickedParcel(upi);
    setSelectedPlace(null);
    
    try {
      const [externalRes, propertyRes] = await Promise.all([
        api.get(`/api/external/title_data?upi=${upi}&language=english`),
        api.get(`/api/property/properties/by-upi/${encodeURIComponent(upi)}`),
      ]);
      
      const externalData = externalRes.data.data?.parcelDetails || {};
      const propertyData = propertyRes.data || {};

      const merged: ParcelInfo = {
        upi: upi,
        area: externalData.area || propertyData.size,
        rightType: externalData.rightTypeName || propertyData.right_type,
        landUse: externalData.landUse?.landUseTypeNameEnglish || propertyData.land_use,
        owners: externalData.owners || propertyData.parcel_information?.owners || [],
        representative: externalData.parcelRepresentative || propertyData.parcel_information?.representative,
        estimatedAmount: propertyData.estimated_amount,
        images: propertyData.images || [],
        documents: propertyData.documents || [],
        remainingLeaseTerm: externalData.remainingLeaseTerm || propertyData.parcel_information?.remaining_lease_term,
        transactionStatus: {
          inTransaction: propertyData.details?.inTransaction || externalData.inTransaction || false,
          underMortgage: propertyData.details?.underMortgage || externalData.underMortgage || false,
          hasCaveat: propertyData.details?.hasCaveat || externalData.hasCaveat || false,
        },
        location: {
          village: externalData.villageName || propertyData.village,
          cell: externalData.cellName || propertyData.cell,
          sector: externalData.sectorName || propertyData.sector,
          district: externalData.districtName || propertyData.district,
          province: externalData.provinceName || propertyData.provinceNameEnglish,
        },
        overlapping: parsedParcels.find((p) => p.upi === upi)?.overlapping,
        valuation: propertyData.valuation,
        coordinates: parsedParcels.find((p) => p.upi === upi)?.positions,
      };

      setParcelInfo(merged);
      setCurrentImageIndex(0);
    } catch (err) {
      console.error("Failed to load parcel info", err);
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
    setNearbyPlaces([]);
    setMainRoad(null);
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
      {/* ================= SIDEBAR ================= */}
      {showSidebar && (
        <div style={{
          width: 340,
          backgroundColor: '#ffffff',
          borderRight: '1px solid #E5E7EB',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{ 
            padding: '16px',
            borderBottom: '1px solid #E5E7EB',
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
              {filteredParcels.length} parcels • {selectedUPI ? '1 selected' : 'No selection'}
            </p>
          </div>

          {/* Search */}
          <div style={{ padding: '12px' }}>
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
          <div style={{ padding: '0 12px 12px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
          </div>

          {/* Filter Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{ overflow: 'hidden' }}
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
                      ownership: "all",
                      nearbyCategories: [],
                      nearbyTypes: [],
                      searchRadius: 100,
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

          {/* Main Road Info */}
          {showNearby && selectedParcel && mainRoad && (
            <div style={{ 
              padding: '12px',
              backgroundColor: '#F0F9FF',
              margin: '0 12px 12px',
              borderRadius: 8,
              border: '1px solid #BAE6FD',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Car size={14} color="#0284C7" />
                <h4 style={{ fontSize: 13, fontWeight: 600, margin: 0, color: '#0369A1' }}>
                  Main Road Access
                </h4>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: mainRoad.type === 'highway' ? '#1F2937' : '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Car size={16} color="white" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{mainRoad.name}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>
                    {Math.round(mainRoad.distance)} meters away
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Nearby Places Panel */}
          {showNearby && selectedParcel && (
            <div style={{ 
              padding: '12px',
              backgroundColor: '#F9FAFB',
              margin: '0 12px 12px',
              borderRadius: 8,
              border: '1px solid #E5E7EB',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={14} color="var(--color-primary)" />
                  <h4 style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>
                    Nearby Places (100m)
                  </h4>
                </div>
              </div>
              
              {nearbyPlaces.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#6B7280', fontSize: 12 }}>
                  No places found within 100m
                </div>
              ) : (
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
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
                        {places.slice(0, 3).map((place) => (
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
                              }}>
                                {React.createElement(poiIcons[place.type]?.icon.type || MapPin, { size: 12, color: 'white' })}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 12, fontWeight: 500 }}>{place.name}</div>
                                <div style={{ fontSize: 11, color: '#6B7280' }}>
                                  {Math.round(place.distance)}m away
                                </div>
                              </div>
                              {place.rating && (
                                <div style={{ fontSize: 11, color: '#F59E0B', display: 'flex', alignItems: 'center', gap: 2 }}>
                                  <Star size={10} fill="#F59E0B" color="#F59E0B" />
                                  {place.rating}
                                </div>
                              )}
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
                </div>
              )}
            </div>
          )}

          {/* Parcel List */}
          <div style={{ 
            flex: 1,
            overflowY: 'auto',
            padding: '0 12px 12px',
          }}>
            {filteredParcels.map((parcel) => (
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
                      Area: {parcel.status_details?.area || 'N/A'} m²
                    </div>
                    {selectedUPI === parcel.upi && mainRoad && (
                      <div style={{ fontSize: 11, color: 'var(--color-primary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Car size={10} />
                        {mainRoad.name} ({Math.round(mainRoad.distance)}m)
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
            ))}
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
          zoom={17}
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

          {/* Search Radius Circle - 100m */}
          {selectedParcel && showNearby && (
            <Circle
              center={selectedParcel.center}
              radius={100}
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
                smoothFactor: 1,
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
                </div>
              </Tooltip>
            </Polygon>
          ))}

          {/* Selected Parcel Marker */}
          {selectedParcel && (
            <Marker position={selectedParcel.center}>
              <Popup>
                <div style={{ minWidth: '250px' }}>
                  <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-primary)' }}>
                    {selectedParcel.upi}
                  </h4>
                  <div style={{ fontSize: 12 }}>
                    <div><strong>Area:</strong> {selectedParcel.status_details?.area || 'N/A'} m²</div>
                    {mainRoad && (
                      <>
                        <div><strong>Main Road:</strong> {mainRoad.name}</div>
                        <div><strong>Distance to Road:</strong> {Math.round(mainRoad.distance)}m</div>
                      </>
                    )}
                    <div style={{ marginTop: 8 }}>
                      <strong>Nearby ({nearbyPlaces.length} places within 100m):</strong>
                      <ul style={{ margin: '4px 0 0 0', paddingLeft: 16, maxHeight: 150, overflowY: 'auto' }}>
                        {nearbyPlaces.slice(0, 5).map(place => (
                          <li key={place.id} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                            {React.createElement(poiIcons[place.type]?.icon.type || MapPin, { size: 10 })}
                            {place.name} ({Math.round(place.distance)}m)
                          </li>
                        ))}
                      </ul>
                    </div>
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
                    }}>
                      {React.createElement(poiIcons[place.type]?.icon.type || MapPin, { size: 14, color: 'white' })}
                    </div>
                    <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{place.name}</h4>
                  </div>
                  <div style={{ fontSize: 12 }}>
                    <div><strong>Category:</strong> {place.category}</div>
                    <div><strong>Type:</strong> {place.type.replace('_', ' ')}</div>
                    <div><strong>Distance:</strong> {Math.round(place.distance)}m</div>
                    {place.address && <div><strong>Address:</strong> {place.address}</div>}
                    {place.phone && <div><strong>Phone:</strong> {place.phone}</div>}
                    {place.hours && <div><strong>Hours:</strong> {place.hours}</div>}
                    {place.rating && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <strong>Rating:</strong> 
                        <Star size={12} fill="#F59E0B" color="#F59E0B" />
                        {place.rating}/5
                      </div>
                    )}
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

        {/* Property Modal */}
        <DraggableModal
          isOpen={!!parcelInfo}
          onClose={handleModalClose}
          title="Property Details"
          subtitle={`UPI: ${parcelInfo?.upi || ''}`}
          isLoading={loadingInfo}
        >
          {parcelInfo && !loadingInfo && (
            <div>
              {/* Location Header with Road Info */}
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
                {mainRoad && (
                  <div style={{ fontSize: 12, color: '#075985', marginLeft: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Car size={12} />
                    Main Road: {mainRoad.name} ({Math.round(mainRoad.distance)}m)
                  </div>
                )}
                {parcelInfo.location.village && (
                  <div style={{ fontSize: 12, color: '#075985', marginLeft: 20 }}>
                    📍 {parcelInfo.location.village}, {parcelInfo.location.sector}
                  </div>
                )}
              </div>

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
                      {parcelInfo.area ? `${parcelInfo.area.toLocaleString()} m²` : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#6B7280' }}>Land Use</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{parcelInfo.landUse || 'N/A'}</div>
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

              {/* Administrative Location */}
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

              {/* Nearby Places Summary */}
              {nearbyPlaces.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={14} />
                    Nearby Places (within 100m)
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
                        {places.slice(0, 2).map(place => (
                          <div key={place.id} style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 6,
                            padding: '4px',
                            backgroundColor: 'white',
                            borderRadius: 4,
                            marginBottom: 2,
                          }}>
                            <div style={{
                              width: 20,
                              height: 20,
                              borderRadius: 10,
                              backgroundColor: poiIcons[place.type]?.color || '#6B7280',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                            }}>
                              {React.createElement(poiIcons[place.type]?.icon.type || MapPin, { size: 10, color: 'white' })}
                            </div>
                            <span style={{ fontSize: 11, flex: 1 }}>{place.name}</span>
                            <span style={{ fontSize: 10, color: '#6B7280' }}>{Math.round(place.distance)}m</span>
                          </div>
                        ))}
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
                    {parcelInfo.owners.slice(0, 2).map((owner, index) => (
                      <div key={index} style={{ 
                        padding: '8px 12px',
                        borderBottom: index < Math.min(parcelInfo.owners.length, 2) - 1 ? '1px solid #E5E7EB' : 'none',
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 500 }}>{owner.fullName}</div>
                        <div style={{ fontSize: 11, color: '#6B7280' }}>
                          Share: {owner.sharePercentage || 'N/A'}
                        </div>
                      </div>
                    ))}
                    {parcelInfo.owners.length > 2 && (
                      <div style={{ padding: '8px 12px', fontSize: 11, color: '#6B7280' }}>
                        +{parcelInfo.owners.length - 2} more
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
                      Mortgage
                    </span>
                  )}
                  {parcelInfo.overlapping && (
                    <span style={{ padding: '4px 8px', backgroundColor: '#FFF7ED', color: '#F97316', borderRadius: 12, fontSize: 11 }}>
                      Overlapping
                    </span>
                  )}
                </div>
              </div>

              {/* Valuation */}
              {parcelInfo.estimatedAmount && (
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 8px 0' }}>Valuation</h4>
                  <div style={{
                    padding: 12,
                    backgroundColor: 'rgba(var(--color-primary), 0.05)',
                    borderRadius: 8,
                  }}>
                    <div style={{ fontSize: 18, fontWeight: 600 }}>
                      RWF {parcelInfo.estimatedAmount.toLocaleString()}
                    </div>
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