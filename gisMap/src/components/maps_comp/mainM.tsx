import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  Filter,
  Search,
  Globe,
  Home,
  Eye,
  ChevronDown,
  Menu,
  Layers,
  RefreshCw,
  Map as MapIcon,
  Satellite,
  Moon,
  Navigation,
  Info,
  Shield,
  FileText,
  Download,
  Maximize2,
  Minimize2,
  RotateCw,
  Trash2,
  Check,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  Ban,
  Circle,
  Square,
  HelpCircle,
  User,
  Users,
  MapPinned,
  Building,
  Calendar,
  GripHorizontal,
  Heart,
  UserRound,
  UserCircle,
  UserMinus,
  HeartHandshake,
  UserCog,
  Film,
  Globe2,
  EyeOff,
} from 'lucide-react';
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
  Popup as LeafletPopup,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../instance/mainAxios';
import parse from 'wellknown';
import * as turf from '@turf/turf';

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

/* =========================
   TYPES
========================= */
interface ParcelData {
  id?: number;
  upi: string;
  positions: [number, number][];
  center: [number, number];
  color: string;
  isVerified: boolean;
  hasOverlap: boolean;
  overlapsWith: string[];
  overlapPercentage?: number;
  district?: string;
  sector?: string;
  cell?: string;
  village?: string;
  area?: number;
  province?: string;
  forSale?: boolean;
  price?: number | null;
  property_id?: number | null;
  land_use_type?: string;
  planned_land_use?: string;
  tenure_type?: string;
  remaining_lease_term?: number;
  under_mortgage?: boolean;
  has_caveat?: boolean;
  in_transaction?: boolean;
  year_of_record?: number;
  full_address?: string;
}

interface PropertyImage {
  id: number;
  property_id: number;
  category: string;
  file_path: string;
  file_type: string;
  uploaded_at: string;
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
  share?: string;
}

interface Representative {
  foreNames: string;
  surname: string;
  idNo?: string;
  idTypeName?: string;
  countryName?: string;
  gender?: string;
  maritalStatus?: string;
}

interface ExternalParcelInfo {
  parcelDetails: any;
  upi: string;
  area: number;
  address: {
    villageName: string;
    cellName: string;
    sectorName: string;
    districtName: string;
    provinceName: string;
    string: string;
  };
  landUse?: {
    landUseTypeNameEnglish: string;
  };
  rightTypeName?: string;
  remainingLeaseTerm?: number;
  owners?: ExternalOwner[];
  parcelRepresentative?: ExternalRepresentative;
  valuationValues?: {
    minPrice: string;
    maxPrice: string;
  };
  plannedLandUses?: Array<{
    landUseName: string;
    area: number;
  }>;
}

interface ExternalOwner {
  fullName: string;
  idNo: string;
  gender: string;
  maritalStatus: string;
  share: string;
  countryId?: string;
}

interface ExternalRepresentative {
  foreNames: string;
  surname: string;
  idNo: string;
  idTypeName?: string;
  countryName?: string;
  gender?: string;
  maritalStatus?: string;
}

interface PropertyApiResponse {
  id: number;
  upi: string;
  owner_name: string;
  size: number;
  district: string;
  sector: string;
  cell: string;
  village: string;
  land_use: string;
  status: string;
  estimated_amount: number;
  details: PropertyDetails;
  parcel_information: {
    owners?: Owner[];
    representative?: Representative;
  };
  images: PropertyImage[];
  category?: {
    label: string;
  };
  subcategory?: {
    label: string;
  };
  video_link?: string;
  uploaded_by_name?: string;
  uploader_type?: string;
}

interface CombinedPropertyData {
  propertyData?: PropertyApiResponse;
  externalData?: ExternalParcelInfo;
  source: 'property' | 'external' | 'both';
}

interface StepOneProps {
  onVerify: (file: File) => Promise<void>;
  isVerifying: boolean;
  verificationResult: VerificationResult | null;
  onReset: () => void;
}

interface StepTwoProps {
  parcels: ParcelData[];
  verifiedUPI: string;
  onBack: () => void;
  onVerifyAnother: () => void;
  filterAvailable: boolean;
  setFilterAvailable: (value: boolean) => void;
  viewMode: 'district' | 'all';
  setViewMode: (mode: 'district' | 'all') => void;
  onRefreshParcels: () => Promise<void>;
}

interface VerificationResult {
  success: boolean;
  data?: any;
  error?: string;
  upi?: string;
}

interface StoredVerification {
  upi: string;
  timestamp: number;
}

interface AppState {
  step: 'upload' | 'map';
  verifiedUPI: string;
  viewMode: 'district' | 'all';
  filterAvailable: boolean;
  parcels: ParcelData[];
  lastUpdated: number;
}

/* =========================
   UTILITY FUNCTIONS
========================= */
function formatArea(area?: number): string {
  if (!area) return 'N/A';
  if (area >= 10000) {
    return `${(area / 10000).toFixed(2)} ha`;
  }
  return `${area.toFixed(0)} m²`;
}

function formatPrice(price?: number | null): string {
  if (!price) return 'Not for sale';
  
  // Format large numbers with commas
  if (price >= 1000000000) {
    return `${(price / 1000000000).toFixed(2)}B RWF`;
  } else if (price >= 1000000) {
    return `${(price / 1000000).toFixed(1)}M RWF`;
  } else if (price >= 1000) {
    return `${(price / 1000).toFixed(0)}K RWF`;
  }
  return `${price.toLocaleString()} RWF`;
}

function getCenter(coords: [number, number][]): [number, number] {
  let lat = 0;
  let lng = 0;
  coords.forEach(([la, ln]) => {
    lat += la;
    lng += ln;
  });
  return [lat / coords.length, lng / coords.length];
}

function getGenderIcon(gender: string) {
  switch (gender?.toUpperCase()) {
    case 'M': return <User size={14} />;
    case 'F': return <UserCircle size={14} />;
    default: return <UserRound size={14} />;
  }
}

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
   MAP COMPONENTS
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

function ZoomToParcel({ parcel, shouldZoom }: { parcel: ParcelData; shouldZoom: boolean }) {
  const map = useMap();
  
  useEffect(() => {
    if (!parcel || !shouldZoom) return;
    
    // Fly to the parcel bounds
    map.flyToBounds(parcel.positions, {
      padding: [60, 60],
      maxZoom: 18,
      duration: 1.5,
    });
  }, [parcel, map, shouldZoom]);
  
  return null;
}

/* =========================
   AREA LABEL COMPONENT
========================= */
function AreaLabel({ parcel }: { parcel: ParcelData }) {
  const map = useMap();
  const zoom = map.getZoom();
  
  // Only show label at zoom level 15 and above
  if (zoom < 15) return null;
  
  const areaText = formatArea(parcel.area);
  
  return (
    <Marker
      position={parcel.center}
      icon={L.divIcon({
        html: `<div style="
          background-color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          color: #374151;
          border: 1px solid #E5E7EB;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          white-space: nowrap;
          pointer-events: none;
          opacity: 0.9;
        ">${areaText}</div>`,
        className: 'area-label',
        iconSize: [60, 20],
        iconAnchor: [30, 10],
      })}
      interactive={false}
    />
  );
}

/* =========================
   OWNER CARD COMPONENT
========================= */
function OwnerCard({ owner }: { owner: Owner }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg mb-2 overflow-hidden">
      <div
        onClick={() => setExpanded(!expanded)}
        className="p-3 bg-gray-50 dark:bg-gray-800 flex items-center justify-between cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">
            {owner.fullName?.charAt(0) || '?'}
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">{owner.fullName}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <span className="flex items-center gap-1">
                {getGenderIcon(owner.gender || '')}
                {owner.gender === 'M' ? 'Male' : owner.gender === 'F' ? 'Female' : 'Other'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                {getMaritalStatusIcon(owner.maritalStatus || '')}
                {owner.maritalStatus === 'M' ? 'Married' :
                  owner.maritalStatus === 'S' ? 'Single' :
                  owner.maritalStatus === 'D' ? 'Divorced' :
                  owner.maritalStatus === 'W' ? 'Widowed' : 'Unknown'}
              </span>
            </div>
          </div>
        </div>
        <ChevronDown size={16} className={`transform transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </div>

      {expanded && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-3 text-xs">
            {owner.idNo && (
              <div>
                <div className="text-gray-500">ID Number</div>
                <div className="font-medium">{owner.idNo}</div>
              </div>
            )}
            {owner.idTypeName && (
              <div>
                <div className="text-gray-500">ID Type</div>
                <div className="font-medium">{owner.idTypeName}</div>
              </div>
            )}
            {owner.countryName && (
              <div>
                <div className="text-gray-500">Country</div>
                <div className="font-medium">{owner.countryName}</div>
              </div>
            )}
            {(owner.sharePercentage || owner.share) && (
              <div>
                <div className="text-gray-500">Share</div>
                <div className="font-medium">{owner.sharePercentage || owner.share}%</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================
   DETAIL POPUP COMPONENT
========================= */
interface DetailPopupProps {
  parcel: ParcelData;
  onClose: () => void;
  combinedData: CombinedPropertyData | null;
  loading: boolean;
}

function DetailPopup({ parcel, onClose, combinedData, loading }: DetailPopupProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (loading) {
    return (
      <div className="min-w-[320px] max-w-[400px] p-8 flex flex-col items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary mb-3" />
        <p className="text-sm text-gray-600">Loading property details...</p>
      </div>
    );
  }

  const propertyData = combinedData?.propertyData;
  const externalData = combinedData?.externalData;

  return (
    <div className="min-w-[320px] max-w-[400px] max-h-[80vh] overflow-y-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sticky top-0 bg-white dark:bg-gray-800 pt-2 pb-2 z-10 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-primary text-base truncate flex-1 flex items-center gap-2">
          <MapPin size={16} />
          {parcel.upi}
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full ml-2 flex-shrink-0"
        >
          <X size={16} />
        </button>
      </div>

      {/* Price Badge - Fix: Show price correctly */}
      {parcel.forSale && parcel.price && parcel.price > 0 && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="text-xs text-green-700 dark:text-green-400 mb-1">Price</div>
          <div className="text-xl font-bold text-green-600 dark:text-green-400">
            {formatPrice(parcel.price)}
          </div>
        </div>
      )}

      {/* Images Gallery */}
      {propertyData?.images && propertyData.images.length > 0 && (
        <div className="mb-4">
          <div className="relative rounded-lg overflow-hidden aspect-video bg-gray-100 dark:bg-gray-700">
            <img
              src={`${api.defaults?.baseURL?.replace(/\/$/, '') || ''}/assets/${propertyData.images[currentImageIndex]?.file_path}`}
              alt="Property"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x225?text=No+Image';
              }}
            />
            {propertyData.images.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentImageIndex((prev) =>
                    prev === 0 ? propertyData.images.length - 1 : prev - 1
                  )}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center hover:bg-white shadow-lg"
                >
                  <ChevronDown size={14} className="rotate-90" />
                </button>
                <button
                  onClick={() => setCurrentImageIndex((prev) =>
                    prev === propertyData.images.length - 1 ? 0 : prev + 1
                  )}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center hover:bg-white shadow-lg"
                >
                  <ChevronDown size={14} className="-rotate-90" />
                </button>
              </>
            )}
          </div>
          <div className="text-xs text-center text-gray-500 mt-1">
            {currentImageIndex + 1} / {propertyData.images.length}
          </div>
        </div>
      )}

      {/* Status Badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        {parcel.isVerified && (
          <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs flex items-center gap-1 border border-primary/20">
            <CheckCircle2 size={12} />
            Verified
          </span>
        )}
        {parcel.forSale && (
          <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs flex items-center gap-1">
            <DollarSign size={12} />
            For Sale
          </span>
        )}
        {parcel.under_mortgage && (
          <span className="px-2 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 rounded-full text-xs flex items-center gap-1">
            <AlertCircle size={12} />
            Under Mortgage
          </span>
        )}
        {parcel.has_caveat && (
          <span className="px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 rounded-full text-xs flex items-center gap-1">
            <Shield size={12} />
            Has Caveat
          </span>
        )}
        {parcel.in_transaction && (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full text-xs flex items-center gap-1">
            <RefreshCw size={12} />
            In Transaction
          </span>
        )}
        {parcel.hasOverlap && (
          <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded-full text-xs flex items-center gap-1">
            <AlertTriangle size={12} />
            Overlap
          </span>
        )}
      </div>

      {/* Data Source Indicators */}
      <div className="flex gap-2 mb-4">
        {combinedData?.source === 'both' && (
          <div className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full flex items-center gap-1">
            <Globe2 size={12} />
            Registry + Property
          </div>
        )}
        {combinedData?.source === 'property' && (
          <div className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
            <Building size={12} />
            Property Records
          </div>
        )}
        {combinedData?.source === 'external' && (
          <div className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full flex items-center gap-1">
            <Globe size={12} />
            Registry Only
          </div>
        )}
      </div>

      {/* Basic Information */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mb-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Parcel Information</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-gray-500">Area</div>
            <div className="text-sm font-medium">{formatArea(parcel.area)}</div>
          </div>
          {parcel.land_use_type && (
            <div>
              <div className="text-xs text-gray-500">Land Use</div>
              <div className="text-sm font-medium">{parcel.land_use_type}</div>
            </div>
          )}
          {parcel.tenure_type && (
            <div>
              <div className="text-xs text-gray-500">Tenure</div>
              <div className="text-sm font-medium">{parcel.tenure_type}</div>
            </div>
          )}
          {parcel.remaining_lease_term !== undefined && (
            <div>
              <div className="text-xs text-gray-500">Lease Remaining</div>
              <div className="text-sm font-medium">{parcel.remaining_lease_term} years</div>
            </div>
          )}
          {parcel.year_of_record && (
            <div>
              <div className="text-xs text-gray-500">Year</div>
              <div className="text-sm font-medium">{parcel.year_of_record}</div>
            </div>
          )}
        </div>
      </div>

      {/* Location */}
      {(parcel.village || parcel.cell || parcel.sector || parcel.district) && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mb-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
            <MapPinned size={12} />
            Location
          </h4>
          <div className="space-y-1 text-sm">
            {parcel.village && <div className="flex"><span className="w-16 text-gray-500">Village:</span> {parcel.village}</div>}
            {parcel.cell && <div className="flex"><span className="w-16 text-gray-500">Cell:</span> {parcel.cell}</div>}
            {parcel.sector && <div className="flex"><span className="w-16 text-gray-500">Sector:</span> {parcel.sector}</div>}
            {parcel.district && <div className="flex"><span className="w-16 text-gray-500">District:</span> {parcel.district}</div>}
          </div>
        </div>
      )}

      {/* Property Details from API */}
      {propertyData && (
        <>
          {/* Owner Information */}
          {propertyData.parcel_information?.owners && propertyData.parcel_information.owners.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                <Users size={12} />
                Owners ({propertyData.parcel_information.owners.length})
              </h4>
              <div className="space-y-2">
                {propertyData.parcel_information.owners.map((owner: Owner, index: number) => (
                  <OwnerCard key={index} owner={owner} />
                ))}
              </div>
            </div>
          )}

          {/* Representative */}
          {propertyData.parcel_information?.representative && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                <UserCog size={12} />
                Representative
              </h4>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">
                    {propertyData.parcel_information.representative.foreNames?.charAt(0) || '?'}
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      {propertyData.parcel_information.representative.foreNames} {propertyData.parcel_information.representative.surname}
                    </div>
                    {propertyData.parcel_information.representative.idNo && (
                      <div className="text-xs text-gray-500">
                        ID: {propertyData.parcel_information.representative.idNo}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Property Details */}
          {propertyData.details && Object.keys(propertyData.details).length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                <Building size={12} />
                Property Details
              </h4>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="grid grid-cols-2 gap-3">
                  {propertyData.details.condition && (
                    <div>
                      <div className="text-xs text-gray-500">Condition</div>
                      <div className="text-sm">{propertyData.details.condition}</div>
                    </div>
                  )}
                  {propertyData.details.building_type && (
                    <div>
                      <div className="text-xs text-gray-500">Building Type</div>
                      <div className="text-sm">{propertyData.details.building_type}</div>
                    </div>
                  )}
                  {propertyData.details.bedrooms && (
                    <div>
                      <div className="text-xs text-gray-500">Bedrooms</div>
                      <div className="text-sm">{propertyData.details.bedrooms}</div>
                    </div>
                  )}
                  {propertyData.details.bathrooms && (
                    <div>
                      <div className="text-xs text-gray-500">Bathrooms</div>
                      <div className="text-sm">{propertyData.details.bathrooms}</div>
                    </div>
                  )}
                  {propertyData.details.floors && (
                    <div>
                      <div className="text-xs text-gray-500">Floors</div>
                      <div className="text-sm">{propertyData.details.floors}</div>
                    </div>
                  )}
                  {propertyData.details.built_area && (
                    <div>
                      <div className="text-xs text-gray-500">Built Area</div>
                      <div className="text-sm">{propertyData.details.built_area} m²</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Video Link */}
          {propertyData.video_link && propertyData.video_link !== "http://localhost:5173/login" && (
            <div className="mb-4">
              <a
                href={propertyData.video_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 w-full justify-center"
              >
                <Film size={16} />
                Watch Video
              </a>
            </div>
          )}
        </>
      )}

      {/* External Registry Data */}
      {externalData && !propertyData && (
        <>
          {/* External Owners */}
          {externalData.owners && externalData.owners.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                <Users size={12} />
                Registry Owners ({externalData.owners.length})
              </h4>
              <div className="space-y-2">
                {externalData.owners.map((owner: ExternalOwner, index: number) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">
                        {owner.fullName?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{owner.fullName}</div>
                        {owner.idNo && <div className="text-xs text-gray-500">ID: {owner.idNo}</div>}
                      </div>
                    </div>
                    <div className="flex gap-3 text-xs text-gray-600">
                      {owner.gender && <span>Gender: {owner.gender === 'M' ? 'Male' : 'Female'}</span>}
                      {owner.share && <span>Share: {owner.share}%</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* External Representative */}
          {externalData.parcelRepresentative && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                <UserCog size={12} />
                Registry Representative
              </h4>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">
                    {externalData.parcelRepresentative.foreNames?.charAt(0) || '?'}
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      {externalData.parcelRepresentative.foreNames} {externalData.parcelRepresentative.surname}
                    </div>
                    {externalData.parcelRepresentative.idNo && (
                      <div className="text-xs text-gray-500">ID: {externalData.parcelRepresentative.idNo}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Valuation */}
          {externalData.valuationValues && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Valuation Range</h4>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <div className="text-sm font-medium text-primary">
                  {parseInt(externalData.valuationValues.minPrice).toLocaleString()} - {parseInt(externalData.valuationValues.maxPrice).toLocaleString()} RWF
                </div>
              </div>
            </div>
          )}

          {/* Planned Land Uses */}
          {externalData.plannedLandUses && externalData.plannedLandUses.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Planned Land Uses</h4>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                {externalData.plannedLandUses.map((use, idx) => (
                  <div key={idx} className="text-sm mb-1 last:mb-0">
                    • {use.landUseName} {use.area && `(${formatArea(use.area)})`}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* No additional data message */}
      {!propertyData && !externalData && (
        <div className="text-center py-6 text-gray-500">
          <Info size={24} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No additional property details available</p>
        </div>
      )}
    </div>
  );
}

/* =========================
   POLYGON WITH LABEL
========================= */
function ParcelPolygon({ parcel, isSelected, onClick }: { parcel: ParcelData; isSelected: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  const getPathOptions = () => {
    const baseOptions: L.PathOptions = {
      color: parcel.color,
      weight: isSelected ? 4 : hovered ? 3 : 2,
      fillColor: parcel.color,
      fillOpacity: isSelected ? 0.4 : hovered ? 0.25 : 0.15,
    };

    if (!parcel.isVerified && parcel.forSale === false) {
      return {
        ...baseOptions,
        dashArray: '5, 5',
        color: '#991B1B',
      };
    }

    if (parcel.hasOverlap) {
      return {
        ...baseOptions,
        dashArray: '5, 5',
      };
    }

    return baseOptions;
  };

  return (
    <>
      <Polygon
        positions={parcel.positions}
        pathOptions={getPathOptions()}
        eventHandlers={{
          click: (e) => {
            L.DomEvent.stopPropagation(e);
            onClick();
          },
          mouseover: (e) => {
            setHovered(true);
            e.target.setStyle({ weight: 3, fillOpacity: 0.25 });
          },
          mouseout: (e) => {
            setHovered(false);
            e.target.setStyle({
              weight: isSelected ? 4 : 2,
              fillOpacity: isSelected ? 0.4 : 0.15,
            });
          },
        }}
      >
        <Tooltip sticky direction="top">
          <div className="text-xs p-1 min-w-[150px]">
            <div className="font-bold text-primary">{parcel.upi}</div>
            <div className="flex items-center gap-1 mt-1">
              <MapPin size={10} className="text-gray-500" />
              <span>Area: {formatArea(parcel.area)}</span>
            </div>
            
            {parcel.price && parcel.price > 0 && (
              <div className="flex items-center gap-1 mt-1 text-green-600 font-medium">
                <DollarSign size={10} />
                <span>{formatPrice(parcel.price)}</span>
              </div>
            )}
            
            {parcel.village && (
              <div className="text-gray-600 dark:text-gray-400 mt-1 text-[10px]">
                {parcel.village}, {parcel.cell}
              </div>
            )}
            
            {parcel.isVerified && (
              <div className="text-green-600 flex items-center gap-1 mt-1 font-medium">
                <CheckCircle2 size={12} />
                Your Verified Land
              </div>
            )}
            
            {!parcel.isVerified && parcel.forSale === true && (
              <div className="text-green-600 flex items-center gap-1 mt-1">
                <DollarSign size={12} />
                For Sale
              </div>
            )}
            
            {!parcel.isVerified && parcel.forSale === false && (
              <div className="text-red-700 flex items-center gap-1 mt-1 font-medium">
                <Ban size={12} />
                Not Available
              </div>
            )}
            
            {parcel.hasOverlap && (
              <div className="text-red-600 flex items-center gap-1 mt-1">
                <AlertTriangle size={12} />
                Overlap
              </div>
            )}
          </div>
        </Tooltip>
      </Polygon>

      <AreaLabel parcel={parcel} />

      {/* Overlap Warning Icon */}
      {parcel.hasOverlap && (
        <Marker
          position={parcel.center}
          icon={L.divIcon({
            html: '<div class="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></div>',
            className: 'overlap-warning',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          })}
          interactive={false}
        />
      )}
    </>
  );
}

/* =========================
   STEP 1: UPLOAD PAGE
========================= */
function StepOne({ onVerify, isVerifying, verificationResult, onReset }: StepOneProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (file.type !== 'application/pdf') {
      alert('Please select a PDF file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Please select a PDF file');
      return;
    }
    await onVerify(selectedFile);
  };

  if (verificationResult?.success) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-background rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-200 dark:border-gray-800"
      >
        <div className="bg-primary p-8 text-white">
          <h1 className="text-3xl font-bold mb-2">Verify Your Land Title</h1>
          <p className="text-blue-100">
            Upload your e-title document to verify your property
          </p>
        </div>

        <div className="p-8">
          <div className="mb-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <h2 className="text-lg font-semibold text-primary mb-3 flex items-center gap-2">
              <Shield size={20} />
              Before You Verify
            </h2>
            <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-primary" />
                <span>Upload your PDF e-title document to verify its authenticity</span>
              </div>
              <div className="flex items-start gap-2">
                <Info size={16} className="mt-0.5 flex-shrink-0 text-primary" />
                <span><span className="font-semibold">Important:</span> Your verified parcel will be stored in your current browser session only</span>
              </div>
              <div className="flex items-start gap-2 font-medium text-primary">
                <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
                <span>Make sure you have the correct document before proceeding</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                E-Title Document (PDF) <span className="text-red-500">*</span>
              </label>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => !isVerifying && fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                  transition-colors duration-200
                  ${isDragging
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-300 dark:border-gray-700 hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-800'
                  }
                  ${isVerifying ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                  disabled={isVerifying}
                />
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <CheckCircle2 size={24} />
                    <span className="text-sm font-medium">{selectedFile.name}</span>
                    {!isVerifying && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                        }}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                        type="button"
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <Upload size={40} className="mx-auto mb-3 text-gray-400" />
                    <p className="text-sm font-medium text-foreground mb-1">
                      {isDragging ? 'Drop your PDF here' : 'Drag & drop or click to browse'}
                    </p>
                    <p className="text-xs text-gray-500">PDF files only, max 10MB</p>
                  </>
                )}
              </div>
            </div>

            {verificationResult?.error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-800 dark:text-red-400 mb-1">Verification Failed</h3>
                  <p className="text-sm text-red-700 dark:text-red-300">{verificationResult.error}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifying || !selectedFile}
              className={`
                w-full py-3 px-4 rounded-lg text-white font-medium
                flex items-center justify-center gap-2 text-lg
                transition-all transform hover:scale-[1.02]
                ${isVerifying || !selectedFile
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-primary hover:bg-primary/90'
                }
              `}
            >
              {isVerifying ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Verifying Document...
                </>
              ) : (
                <>
                  <Shield size={20} />
                  Verify & View on Map
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center flex items-center justify-center gap-1">
            <Info size={12} />
            Your verified parcel will be stored in this browser session only
          </p>
        </div>
      </motion.div>
    </div>
  );
}

/* =========================
   STEP 2: MAP VIEW
========================= */
function StepTwo({ 
  parcels, 
  verifiedUPI, 
  onBack, 
  onVerifyAnother, 
  filterAvailable, 
  setFilterAvailable,
  viewMode,
  setViewMode,
  onRefreshParcels
}: StepTwoProps) {
  const [selectedParcel, setSelectedParcel] = useState<ParcelData | null>(null);
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite' | 'dark'>('streets');
  const [enable3D, setEnable3D] = useState(false);
  const [autoZoom, setAutoZoom] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [combinedData, setCombinedData] = useState<CombinedPropertyData | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [mapCenter] = useState<[number, number]>([-1.9403, 29.8739]);

  const verifiedParcel = useMemo(() => 
    parcels.find(p => p.upi === verifiedUPI),
    [parcels, verifiedUPI]
  );

  const displayedParcels = useMemo(() => {
    if (viewMode === 'all') return parcels;
    
    if (!filterAvailable) return parcels;
    return parcels.filter(p => 
      p.isVerified || // Always show verified parcels
      p.forSale === true // Show only parcels for sale
    );
  }, [parcels, filterAvailable, viewMode]);

  // Auto-zoom to verified parcel when map loads
  useEffect(() => {
    if (verifiedParcel && autoZoom) {
      setSelectedParcel(verifiedParcel);
    }
  }, [verifiedParcel, autoZoom]);

  const handleParcelClick = async (parcel: ParcelData) => {
    // Only open popup if parcel is for sale or is verified
    if (!parcel.forSale && !parcel.isVerified) {
      // Show a temporary message
      setSelectedParcel(parcel);
      setTimeout(() => setSelectedParcel(null), 2000);
      return;
    }

    setSelectedParcel(parcel);
    setShowPopup(true);
    setAutoZoom(true);
    setLoadingDetails(true);

    try {
      // Fetch combined data from both sources
      let propertyData: PropertyApiResponse | undefined;
      let externalData: ExternalParcelInfo | undefined;
      let propertySuccess = false;
      let externalSuccess = false;

      // Try property API
      try {
        const propertyResponse = await api.get(`/api/property/properties/by-upi/${encodeURIComponent(parcel.upi)}`);
        if (propertyResponse.data) {
          propertyData = propertyResponse.data;
          propertySuccess = true;
        }
      } catch (err) {
        console.warn('Property API failed:', err);
      }

      // Try external NLA API
      try {
        const externalResponse = await api.get('/api/external/title_data', {
          params: { upi: parcel.upi, language: 'english' }
        });
        if (externalResponse.data.success && externalResponse.data.found) {
          externalData = externalResponse.data.data;
          externalSuccess = true;
        }
      } catch (err) {
        console.warn('External API failed:', err);
      }

      let source: 'property' | 'external' | 'both' = 'external';
      if (propertySuccess && externalSuccess) {
        source = 'both';
      } else if (propertySuccess) {
        source = 'property';
      }

      setCombinedData({ propertyData, externalData, source });
    } catch (error) {
      console.error('Failed to fetch property details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefreshParcels();
    setRefreshing(false);
  };

  const getTileLayer = () => {
    switch (mapStyle) {
      case 'satellite':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      case 'dark':
        return 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png';
      default:
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
  };

  const stats = {
    total: parcels.length,
    verified: parcels.filter(p => p.isVerified).length,
    overlapping: parcels.filter(p => p.hasOverlap).length,
    forSale: parcels.filter(p => p.forSale === true).length,
    notForSale: parcels.filter(p => p.forSale === false).length,
    district: parcels[0]?.district || 'Unknown',
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-background">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-[1000] bg-gradient-to-b from-black/50 to-transparent p-4 pointer-events-none">
        <div className="flex justify-between items-center pointer-events-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="bg-white/90 backdrop-blur rounded-lg px-3 py-2 flex items-center gap-2 hover:bg-white transition-colors shadow-lg text-foreground"
            >
              <ArrowLeft size={18} />
              <span>Back</span>
            </button>
            <button
              onClick={onVerifyAnother}
              className="bg-white/90 backdrop-blur rounded-lg px-4 py-2 flex items-center gap-2 hover:bg-white transition-colors shadow-lg"
              style={{ color: 'var(--color-primary)' }}
            >
              <Upload size={18} />
              <span className="font-medium">Verify Another Land</span>
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-white/90 backdrop-blur rounded-lg px-3 py-2 flex items-center gap-2 hover:bg-white transition-colors shadow-lg text-foreground"
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="bg-white/90 backdrop-blur rounded-lg flex p-1 shadow-lg">
              <button
                onClick={() => setViewMode('district')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'district' 
                    ? 'bg-primary text-white' 
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                District View
              </button>
              <button
                onClick={() => setViewMode('all')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'all' 
                    ? 'bg-primary text-white' 
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Parcels
              </button>
            </div>

            {/* Available Filter Toggle - Only show in district mode */}
            {viewMode === 'district' && (
              <button
                onClick={() => setFilterAvailable(!filterAvailable)}
                className={`
                  backdrop-blur rounded-lg px-4 py-2 flex items-center gap-2 shadow-lg transition-colors
                  ${filterAvailable 
                    ? 'bg-green-600 text-white' 
                    : 'bg-white/90 text-foreground hover:bg-white'
                  }
                `}
              >
                <DollarSign size={16} />
                <span className="text-sm font-medium">
                  {filterAvailable ? 'Available Only' : 'Show All'}
                </span>
                {filterAvailable && (
                  <X size={14} className="ml-1" onClick={(e) => {
                    e.stopPropagation();
                    setFilterAvailable(false);
                  }} />
                )}
              </button>
            )}

            <div className="bg-white/90 backdrop-blur rounded-lg px-4 py-2 flex gap-4 shadow-lg text-foreground">
              <div className="text-sm">
                <span className="text-gray-600 dark:text-gray-400">Parcels:</span>
                <span className="font-semibold ml-1">{stats.total}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600 dark:text-gray-400">For Sale:</span>
                <span className="font-semibold ml-1 text-green-600">{stats.forSale}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600 dark:text-gray-400">Overlaps:</span>
                <span className="font-semibold ml-1 text-red-600">{stats.overlapping}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Map Controls */}
      <div className="absolute top-24 right-4 z-[1000] flex flex-col gap-2 pointer-events-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-1 flex flex-col">
          <button
            onClick={() => setMapStyle('streets')}
            className={`p-2 rounded ${mapStyle === 'streets' ? 'bg-primary/20' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            title="Street Map"
          >
            <MapIcon size={18} color={mapStyle === 'streets' ? 'var(--color-primary)' : '#6B7280'} />
          </button>
          <button
            onClick={() => setMapStyle('satellite')}
            className={`p-2 rounded ${mapStyle === 'satellite' ? 'bg-primary/20' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            title="Satellite"
          >
            <Satellite size={18} color={mapStyle === 'satellite' ? 'var(--color-primary)' : '#6B7280'} />
          </button>
          <button
            onClick={() => setMapStyle('dark')}
            className={`p-2 rounded ${mapStyle === 'dark' ? 'bg-primary/20' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            title="Dark Mode"
          >
            <Moon size={18} color={mapStyle === 'dark' ? 'var(--color-primary)' : '#6B7280'} />
          </button>
        </div>

        <button
          onClick={() => setEnable3D(!enable3D)}
          className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 ${enable3D ? 'bg-primary/20' : ''}`}
          title="3D View"
        >
          <Layers size={18} color={enable3D ? 'var(--color-primary)' : '#374151'} />
        </button>

        <button
          onClick={() => setAutoZoom(!autoZoom)}
          className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 ${autoZoom ? 'bg-primary/20' : ''}`}
          title="Auto Zoom"
        >
          <Navigation size={18} color={autoZoom ? 'var(--color-primary)' : '#374151'} />
        </button>

        <button
          onClick={() => {
            if (verifiedParcel) {
              setSelectedParcel(verifiedParcel);
              setAutoZoom(true);
            }
          }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Recenter on Your Land"
        >
          <RefreshCw size={18} color="#374151" />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 dark:bg-gray-800/90 backdrop-blur rounded-lg shadow-lg p-3 pointer-events-auto">
        <h4 className="text-xs font-semibold mb-2 text-gray-500 dark:text-gray-400">LEGEND</h4>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-primary rounded-sm" />
            <span className="text-xs text-foreground">Your Verified Land</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-600 rounded-sm" />
            <span className="text-xs text-foreground">For Sale</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded-sm" />
            <span className="text-xs text-foreground">Other Parcels</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-600 rounded-sm border-2 border-red-800 border-dashed" />
            <span className="text-xs text-foreground flex items-center gap-1">
              Overlap Detected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#991B1B] rounded-sm border-2 border-red-900 border-dashed" />
            <span className="text-xs text-foreground flex items-center gap-1">
              Not Available
            </span>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <MapContainer
        center={verifiedParcel?.center || mapCenter}
        zoom={13}
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

        <MapClickHandler onEmptyClick={() => {
          setSelectedParcel(null);
          setShowPopup(false);
        }} />

        {/* Parcel Polygons */}
        {displayedParcels.map((parcel) => (
          <ParcelPolygon
            key={parcel.upi}
            parcel={parcel}
            isSelected={selectedParcel?.upi === parcel.upi}
            onClick={() => handleParcelClick(parcel)}
          />
        ))}

        <ZoomControl position="bottomright" />
        <ScaleControl position="bottomleft" metric={true} imperial={false} />
        <Map3DView enabled={enable3D} />
        {selectedParcel && autoZoom && (
          <ZoomToParcel parcel={selectedParcel} shouldZoom={autoZoom} />
        )}
      </MapContainer>

      {/* Detail Popup - Only shown for parcels that are for sale or verified */}
      <AnimatePresence>
        {showPopup && selectedParcel && (selectedParcel.forSale || selectedParcel.isVerified) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[2000] bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden border border-gray-200 dark:border-gray-700"
          >
            <DetailPopup 
              parcel={selectedParcel} 
              onClose={() => {
                setShowPopup(false);
                setSelectedParcel(null);
                setCombinedData(null);
              }}
              combinedData={combinedData}
              loading={loadingDetails}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Not available message */}
      <AnimatePresence>
        {selectedParcel && !selectedParcel.forSale && !selectedParcel.isVerified && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[2000] bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 shadow-lg"
          >
            <div className="flex items-center gap-3">
              <Ban size={20} className="text-red-600" />
              <div>
                <h3 className="font-semibold text-red-800 dark:text-red-400">Not Available</h3>
                <p className="text-sm text-red-700 dark:text-red-300">This parcel is not for sale</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* =========================
   MAIN COMPONENT
========================= */
export default function ParcelVerificationFlow() {
  const [step, setStep] = useState<'upload' | 'map'>('upload');
  const [parcels, setParcels] = useState<ParcelData[]>([]);
  const [verifiedUPI, setVerifiedUPI] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [filterAvailable, setFilterAvailable] = useState(false);
  const [viewMode, setViewMode] = useState<'district' | 'all'>('district');
  const [initialLoading, setInitialLoading] = useState(true);

  // Load saved state from session storage on mount
  useEffect(() => {
    const loadSavedState = async () => {
      try {
        const savedState = sessionStorage.getItem('parcelVerificationState');
        if (savedState) {
          const parsed = JSON.parse(savedState) as AppState;
          
          // Only restore if not expired (24 hours)
          if (Date.now() - parsed.lastUpdated < 24 * 60 * 60 * 1000) {
            setStep(parsed.step);
            setVerifiedUPI(parsed.verifiedUPI);
            setViewMode(parsed.viewMode);
            setFilterAvailable(parsed.filterAvailable);
            
            if (parsed.parcels.length > 0) {
              setParcels(parsed.parcels);
            } else {
              // Fetch parcels if none in storage
              await fetchAllParcelsAndUpdate();
            }
          } else {
            // Expired, fetch fresh data
            await fetchAllParcelsAndUpdate();
          }
        } else {
          // No saved state, fetch fresh data
          await fetchAllParcelsAndUpdate();
        }
      } catch (error) {
        console.error('Failed to load saved state:', error);
        await fetchAllParcelsAndUpdate();
      } finally {
        setInitialLoading(false);
      }
    };

    loadSavedState();
  }, []);

  // Save state to session storage whenever it changes
  useEffect(() => {
    if (parcels.length > 0) {
      const stateToSave: AppState = {
        step,
        verifiedUPI,
        viewMode,
        filterAvailable,
        parcels,
        lastUpdated: Date.now(),
      };
      sessionStorage.setItem('parcelVerificationState', JSON.stringify(stateToSave));
    }
  }, [step, verifiedUPI, viewMode, filterAvailable, parcels]);

  // Save verified UPI to separate storage for quick access
  useEffect(() => {
    if (verifiedUPI) {
      const stored: StoredVerification[] = JSON.parse(sessionStorage.getItem('verifiedParcels') || '[]');
      const exists = stored.some(s => s.upi === verifiedUPI);
      if (!exists) {
        stored.push({ upi: verifiedUPI, timestamp: Date.now() });
        sessionStorage.setItem('verifiedParcels', JSON.stringify(stored));
      }
    }
  }, [verifiedUPI]);

  /* =========================
     FETCH ALL PARCELS
  ========================== */
  const fetchAllParcels = useCallback(async () => {
    try {
      const response = await api.get('/api/mappings/');
      const allParcels = response.data;

      const parsed = allParcels
        .map((p: any) => {
          try {
            const geo = parse(p.official_registry_polygon);
            
            let coordinates = [];
            if (geo.type === 'Polygon') {
              coordinates = geo.coordinates[0];
            } else if (geo.type === 'MultiPolygon') {
              coordinates = geo.coordinates[0][0];
            } else {
              return null;
            }

            const positions = coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);

            return {
              id: p.id,
              upi: p.upi,
              positions,
              center: getCenter(positions),
              color: '#F97316', // Orange default
              isVerified: false,
              hasOverlap: p.overlaps || false,
              overlapsWith: [],
              district: p.district,
              sector: p.sector,
              cell: p.cell,
              village: p.village,
              province: p.province,
              area: p.parcel_area_sqm || p.area,
              forSale: p.for_sale || false,
              price: p.price || null,
              property_id: p.property_id,
              land_use_type: p.land_use_type,
              planned_land_use: p.planned_land_use,
              tenure_type: p.tenure_type,
              remaining_lease_term: p.remaining_lease_term,
              under_mortgage: p.under_mortgage,
              has_caveat: p.has_caveat,
              in_transaction: p.in_transaction,
              year_of_record: p.year_of_record,
              full_address: p.full_address,
            };
          } catch (e) {
            console.error('Failed to parse polygon for parcel', p.upi, e);
            return null;
          }
        })
        .filter(Boolean);

      // Calculate overlaps if not provided by API
      for (let i = 0; i < parsed.length; i++) {
        for (let j = i + 1; j < parsed.length; j++) {
          try {
            const polyA = turf.polygon([parsed[i].positions.map(([lat, lng]) => [lng, lat])]);
            const polyB = turf.polygon([parsed[j].positions.map(([lat, lng]) => [lng, lat])]);

            if (turf.booleanIntersects(polyA, polyB)) {
              const intersection = turf.intersect(turf.featureCollection([polyA, polyB]));
              if (intersection) {
                const overlapArea = turf.area(intersection);
                const areaA = turf.area(polyA);
                const areaB = turf.area(polyB);

                if ((overlapArea / areaA) > 0.01 || (overlapArea / areaB) > 0.01) {
                  parsed[i].hasOverlap = true;
                  parsed[j].hasOverlap = true;
                  parsed[i].overlapsWith.push(parsed[j].upi);
                  parsed[j].overlapsWith.push(parsed[i].upi);
                }
              }
            }
          } catch (e) {
            console.error('Error checking overlap:', e);
          }
        }
      }

      // Mark verified parcels from session storage
      const storedVerifications: StoredVerification[] = JSON.parse(sessionStorage.getItem('verifiedParcels') || '[]');
      const verifiedUPIs = new Set(storedVerifications.map(v => v.upi));

      return parsed.map((p: ParcelData) => {
        if (verifiedUPIs.has(p.upi)) {
          return {
            ...p,
            color: '#395d91',
            isVerified: true,
          };
        }
        
        let color = '#F97316';
        if (p.hasOverlap) {
          color = '#EF4444';
        } else if (p.forSale === true) {
          color = '#10B981';
        } else if (p.forSale === false) {
          color = '#991B1B';
        }
        
        return {
          ...p,
          color,
          isVerified: false,
        };
      });
    } catch (error) {
      console.error('Failed to fetch parcels:', error);
      return [];
    }
  }, []);

  /* =========================
     FETCH AND UPDATE PARCELS
  ========================== */
  const fetchAllParcelsAndUpdate = useCallback(async () => {
    const allParcels = await fetchAllParcels();
    setParcels(allParcels);
  }, [fetchAllParcels]);

  /* =========================
     FETCH DISTRICT PARCELS
  ========================== */
  const fetchDistrictParcels = useCallback(async (district?: string) => {
    const allParcels = await fetchAllParcels();
    
    if (district && viewMode === 'district') {
      return allParcels.filter((p: ParcelData) => 
        p.district?.toLowerCase() === district.toLowerCase()
      );
    }
    
    return allParcels;
  }, [fetchAllParcels, viewMode]);

  /* =========================
     HANDLE VERIFICATION
  ========================== */
  const handleVerify = async (file: File) => {
    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/api/mappings/verify-pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data) {
        const result = response.data;
        const verifiedUpi = result.upi;
        const verifiedDistrict = result.district;
        
        // Fetch parcels based on current view mode
        const allParcels = viewMode === 'all' 
          ? await fetchAllParcels()
          : await fetchDistrictParcels(verifiedDistrict);
        
        // Mark the verified parcel
        const updatedParcels = allParcels.map((p: ParcelData) => {
          if (p.upi === verifiedUpi) {
            return {
              ...p,
              color: '#395d91', // Primary blue
              isVerified: true,
              forSale: result.for_sale || false,
              price: result.price || null,
              area: result.parcel_area_sqm || p.area,
              land_use_type: result.land_use_type || p.land_use_type,
              tenure_type: result.tenure_type || p.tenure_type,
              remaining_lease_term: result.remaining_lease_term || p.remaining_lease_term,
            };
          }
          
          let color = '#F97316';
          if (p.hasOverlap) {
            color = '#EF4444';
          } else if (p.forSale === true) {
            color = '#10B981';
          } else if (p.forSale === false) {
            color = '#991B1B';
          }
          
          return {
            ...p,
            color,
            isVerified: false,
          };
        });

        setParcels(updatedParcels);
        setVerifiedUPI(verifiedUpi);
        
        setVerificationResult({
          success: true,
          upi: verifiedUpi,
          data: result,
        });

        setStep('map');
      } else {
        setVerificationResult({
          success: false,
          error: 'Verification failed - invalid response',
        });
      }
    } catch (error: any) {
      setVerificationResult({
        success: false,
        error: error.response?.data?.message || error.message || 'Verification failed',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleReset = () => {
    setVerificationResult(null);
  };

  const handleBack = () => {
    setStep('upload');
  };

  const handleVerifyAnother = () => {
    setStep('upload');
    setVerificationResult(null);
  };

  const handleRefreshParcels = async () => {
    await fetchAllParcelsAndUpdate();
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-primary mx-auto mb-4" />
          <p className="text-foreground">Loading parcels...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {step === 'upload' ? (
        <StepOne
          onVerify={handleVerify}
          isVerifying={isVerifying}
          verificationResult={verificationResult}
          onReset={handleReset}
        />
      ) : (
        <StepTwo
          parcels={parcels}
          verifiedUPI={verifiedUPI}
          onBack={handleBack}
          onVerifyAnother={handleVerifyAnother}
          filterAvailable={filterAvailable}
          setFilterAvailable={setFilterAvailable}
          viewMode={viewMode}
          setViewMode={setViewMode}
          onRefreshParcels={handleRefreshParcels}
        />
      )}
    </>
  );
}