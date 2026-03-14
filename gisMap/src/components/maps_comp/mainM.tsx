import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  Globe,
  ChevronDown,
  Layers,
  RefreshCw,
  Map as MapIcon,
  Satellite,
  Moon,
  Navigation,
  Info,
  Shield,
  Trash2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  Ban,
  User,
  Users,
  MapPinned,
  Building,
  Heart,
  UserRound,
  UserCircle,
  UserMinus,
  HeartHandshake,
  UserCog,
  Film,
  Globe2,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Hospital,
  GraduationCap,
  Landmark,
  Store,
  Sparkles,
  Search,
  ShieldAlert,
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
  Popup,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../instance/mainAxios';
import { parse } from 'wellknown';
import SimpleAiChatbot from '../ml/Chatbot';

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
  planned_land_uses?: Array<{
    landUseName: string;
    area: number;
  }>;
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
  onViewMap: () => void;
  isVerifying: boolean;
  verificationResult: VerificationResult | null;
  onReset: () => void;
}

interface StepTwoProps {
  parcels: ParcelData[];
  verifiedUPI: string;
  onSelectedParcelChange: (upi: string) => void;
  onBack: () => void;
  onVerifyAnother: () => void;
  filterAvailable: boolean;
  setFilterAvailable: (value: boolean) => void;
  viewMode: 'district' | 'all';
  setViewMode: (mode: 'district' | 'all') => void;
  onRefreshParcels: () => Promise<void>;
  /** UPI coming from the chatbot — triggers an auto-zoom on the map */
  chatHighlightUPI?: string | null;
  /** UPI coming from the chatbot chip click — triggers zoom + opens the DetailPopup */
  chatDetailUPI?: string | null;
  onAddOrUpdateParcel: (parcel: ParcelData) => void;
  onApplyServerFilters: (filters: ParcelFetchFilters) => Promise<void>;
  activeServerFilters: ParcelFetchFilters;
  loadedFromDbCount: number;
  totalParcelsCount: number;
  dbForSaleCount: number;
  dbOverlapCount: number;
  isFiltering: boolean;
  onLoadMoreParcels: () => Promise<void>;
  canLoadMoreParcels: boolean;
  loadingMoreParcels: boolean;
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

interface StoredVerifiedParcel {
  upi: string;
  parcel: ParcelData;
  timestamp: number;
}

interface ParcelFetchFilters {
  province?: string;
  district?: string;
  sector?: string;
  sale_status?: 'for_sale' | 'not_for_sale';
}

interface PlannedLandUsePart {
  name: string;
  area: number;
  ratio: number;
}

interface PlannedLandUseSlice {
  name: string;
  area: number;
  color: string;
  positions: [number, number][];
  center: [number, number];
}

const PROVINCE_OPTIONS = ['Kigali City', 'Eastern', 'Western', 'Northern', 'Southern'];

const RWANDA_DISTRICT_OPTIONS = [
  'Bugesera',
  'Burera',
  'Gakenke',
  'Gasabo',
  'Gatsibo',
  'Gicumbi',
  'Gisagara',
  'Huye',
  'Kamonyi',
  'Karongi',
  'Kayonza',
  'Kicukiro',
  'Kirehe',
  'Muhanga',
  'Musanze',
  'Ngoma',
  'Ngororero',
  'Nyabihu',
  'Nyagatare',
  'Nyamagabe',
  'Nyamasheke',
  'Nyanza',
  'Nyarugenge',
  'Nyaruguru',
  'Rubavu',
  'Ruhango',
  'Rulindo',
  'Rusizi',
  'Rwamagana',
  'Rutsiro',
];

const DISTRICTS_BY_PROVINCE: Record<string, string[]> = {
  'Kigali City': ['Gasabo', 'Kicukiro', 'Nyarugenge'],
  'Eastern': ['Bugesera', 'Gatsibo', 'Kayonza', 'Kirehe', 'Ngoma', 'Nyagatare', 'Rwamagana'],
  'Western': ['Karongi', 'Ngororero', 'Nyabihu', 'Nyamasheke', 'Rubavu', 'Rusizi', 'Rutsiro'],
  'Northern': ['Burera', 'Gakenke', 'Gicumbi', 'Musanze', 'Rulindo'],
  'Southern': ['Gisagara', 'Huye', 'Kamonyi', 'Muhanga', 'Nyamagabe', 'Nyanza', 'Nyaruguru', 'Ruhango'],
};

type PoiCategory = 'hospitals' | 'schools' | 'banks' | 'markets';

interface PoiData {
  id: string;
  name: string;
  category: PoiCategory;
  position: [number, number];
}

interface AppState {
  step: 'upload' | 'map';
  verifiedUPI: string;
  viewMode: 'district' | 'all';
  filterAvailable: boolean;
  parcels: ParcelData[];
  lastUpdated: number;
}

interface RiskAssessment {
  score: number;
  level: 'Low' | 'Medium' | 'High';
  reasons: string[];
  factors: {
    boundaryOverlapRisk: boolean;
    neighborParcelConflicts: number;
    roadDistanceMeters: number | null;
    wetlandDistanceMeters: number | null;
    compactness: number;
    elongation: number;
    sharpAngleCount: number;
    fragmentationIndex: number;
  };
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

function formatDistanceValue(meters?: number | null): string {
  if (!meters || !Number.isFinite(meters)) return 'N/A';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

function getParcelColor(parcel: ParcelData, isVerified: boolean): string {
  if (isVerified) return '#395d91';
  if (parcel.hasOverlap) return '#EF4444';
  if (parcel.forSale === true) return '#10B981';
  if (parcel.forSale === false) return '#991B1B';
  return '#F97316';
}

function extractPlannedLandUses(raw: any): Array<{ landUseName: string; area: number }> {
  const planned = raw?.parcelDetails?.plannedLandUses || raw?.plannedLandUses || [];
  if (!Array.isArray(planned)) return [];

  return planned
    .map((entry: any) => ({
      landUseName: String(entry?.landUseName || '').trim(),
      area: Number(entry?.area || 0),
    }))
    .filter((entry: { landUseName: string; area: number }) => Boolean(entry.landUseName) && Number.isFinite(entry.area) && entry.area > 0);
}

function toParcelFromMapping(mapping: any, verified = false): ParcelData | null {
  const polygonWkt = mapping?.official_registry_polygon;
  if (!polygonWkt) return null;
  const geo = parse(polygonWkt);
  if (!geo) return null;

  let coordinates: any[] = [];
  if (geo.type === 'Polygon' && 'coordinates' in geo) {
    coordinates = geo.coordinates[0];
  } else if (geo.type === 'MultiPolygon' && 'coordinates' in geo) {
    coordinates = geo.coordinates[0][0];
  } else {
    return null;
  }

  const positions: [number, number][] = coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
  const parcel: ParcelData = {
    id: mapping.id,
    upi: mapping.upi,
    positions,
    center: getCenter(positions),
    color: '#F97316',
    isVerified: verified,
    hasOverlap: Boolean(mapping.overlaps),
    overlapsWith: [],
    district: mapping.district,
    sector: mapping.sector,
    cell: mapping.cell,
    village: mapping.village,
    province: mapping.province,
    area: mapping.parcel_area_sqm || mapping.area,
    forSale: mapping.for_sale ?? mapping.forSale ?? false,
    price: mapping.price ?? null,
    property_id: mapping.property_id ?? null,
    land_use_type: mapping.land_use_type,
    planned_land_use: mapping.planned_land_use,
    tenure_type: mapping.tenure_type,
    remaining_lease_term: mapping.remaining_lease_term,
    under_mortgage: mapping.under_mortgage,
    has_caveat: mapping.has_caveat,
    in_transaction: mapping.in_transaction,
    year_of_record: mapping.year_of_record,
    full_address: mapping.full_address,
    planned_land_uses: Array.isArray(mapping.planned_land_uses)
      ? mapping.planned_land_uses
      : Array.isArray(mapping.plannedLandUses)
        ? mapping.plannedLandUses
        : undefined,
  };
  parcel.color = getParcelColor(parcel, verified);
  return parcel;
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

function polygonToLocalMeters(coords: [number, number][]): [number, number][] {
  if (coords.length === 0) return [];
  const meanLat = coords.reduce((sum, [lat]) => sum + lat, 0) / coords.length;
  const meanLng = coords.reduce((sum, [, lng]) => sum + lng, 0) / coords.length;
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos((meanLat * Math.PI) / 180);

  return coords.map(([lat, lng]) => [
    (lng - meanLng) * metersPerDegLng,
    (lat - meanLat) * metersPerDegLat,
  ]);
}

function polygonAreaMeters(coords: [number, number][]): number {
  if (coords.length < 3) return 0;
  const local = polygonToLocalMeters(coords);
  let area = 0;
  for (let i = 0; i < local.length; i++) {
    const [x1, y1] = local[i];
    const [x2, y2] = local[(i + 1) % local.length];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}

function polygonPerimeterMeters(coords: [number, number][]): number {
  if (coords.length < 2) return 0;
  const local = polygonToLocalMeters(coords);
  let perimeter = 0;
  for (let i = 0; i < local.length; i++) {
    const [x1, y1] = local[i];
    const [x2, y2] = local[(i + 1) % local.length];
    perimeter += Math.hypot(x2 - x1, y2 - y1);
  }
  return perimeter;
}

function polygonShapeMetrics(coords: [number, number][]) {
  if (coords.length < 4) {
    return {
      compactness: 1,
      elongation: 1,
      sharpAngleCount: 0,
      fragmentationIndex: 0,
    };
  }

  const local = polygonToLocalMeters(coords);
  const area = polygonAreaMeters(coords);
  const perimeter = polygonPerimeterMeters(coords);
  const compactness = perimeter > 0 ? (4 * Math.PI * area) / (perimeter * perimeter) : 1;

  const xs = local.map(([x]) => x);
  const ys = local.map(([, y]) => y);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  const minDim = Math.max(Math.min(width, height), 1);
  const maxDim = Math.max(width, height);
  const elongation = maxDim / minDim;

  let sharpAngleCount = 0;
  const edgeLengths: number[] = [];

  for (let i = 0; i < local.length; i++) {
    const prev = local[(i - 1 + local.length) % local.length];
    const cur = local[i];
    const next = local[(i + 1) % local.length];

    const v1: [number, number] = [prev[0] - cur[0], prev[1] - cur[1]];
    const v2: [number, number] = [next[0] - cur[0], next[1] - cur[1]];
    const dot = v1[0] * v2[0] + v1[1] * v2[1];
    const mag = Math.hypot(v1[0], v1[1]) * Math.hypot(v2[0], v2[1]);
    if (mag > 0) {
      const angle = (Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180) / Math.PI;
      if (angle < 30 || angle > 170) sharpAngleCount += 1;
    }

    const edge = Math.hypot(next[0] - cur[0], next[1] - cur[1]);
    edgeLengths.push(edge);
  }

  const edgeMean = edgeLengths.reduce((s, v) => s + v, 0) / edgeLengths.length;
  const edgeStd = Math.sqrt(edgeLengths.reduce((s, v) => s + (v - edgeMean) ** 2, 0) / edgeLengths.length);
  const fragmentationIndex = edgeMean > 0 ? edgeStd / edgeMean : 0;

  return {
    compactness,
    elongation,
    sharpAngleCount,
    fragmentationIndex,
  };
}

function polygonArea2D(pts: [number, number][]): number {
  // Shoelace formula treating [lat, lng] as [y, x] flat plane
  let area = 0;
  const n = pts.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    area += pts[j][1] * pts[i][0];
    area -= pts[i][1] * pts[j][0];
  }
  return Math.abs(area) / 2;
}

function clipHalfPlane(
  pts: [number, number][],
  yCut: number,
  side: 'below' | 'above',
): [number, number][] {
  const output: [number, number][] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const cur = pts[i];
    const prev = pts[(i - 1 + n) % n];
    const curIn = side === 'below' ? cur[0] <= yCut : cur[0] >= yCut;
    const prevIn = side === 'below' ? prev[0] <= yCut : prev[0] >= yCut;
    if (curIn !== prevIn) {
      const t = (yCut - prev[0]) / (cur[0] - prev[0]);
      output.push([yCut, prev[1] + t * (cur[1] - prev[1])]);
    }
    if (curIn) output.push(cur);
  }
  return output;
}

function buildLandUseSlices(parcel: ParcelData): PlannedLandUseSlice[] {
  const planned = (parcel.planned_land_uses || [])
    .filter((entry) => Boolean(entry?.landUseName) && Number(entry?.area) > 0)
    .map((entry) => ({ name: entry.landUseName, area: Number(entry.area), ratio: 0 })) as PlannedLandUsePart[];

  if (planned.length < 2 || !parcel.positions || parcel.positions.length < 4) return [];

  const ring = [...parcel.positions];
  const first = ring[0];
  const last = ring[ring.length - 1];
  const closed = first[0] === last[0] && first[1] === last[1];
  const boundary = closed ? ring.slice(0, -1) : ring;
  if (boundary.length < 4) return [];

  const totalPlannedArea = planned.reduce((sum, item) => sum + item.area, 0);
  if (!totalPlannedArea || !Number.isFinite(totalPlannedArea)) return [];
  planned.forEach((item) => { item.ratio = item.area / totalPlannedArea; });

  const usageColors = ['#2563EB', '#059669', '#7C3AED', '#F59E0B', '#EC4899', '#14B8A6'];
  const slices: PlannedLandUseSlice[] = [];
  let remainingPoly: [number, number][] = [...boundary];

  for (let i = 0; i < planned.length; i++) {
    const part = planned[i];
    const isLast = i === planned.length - 1;

    if (isLast) {
      if (remainingPoly.length >= 3) {
        slices.push({
          name: part.name,
          area: part.area,
          color: usageColors[i % usageColors.length],
          positions: remainingPoly,
          center: getCenter(remainingPoly),
        });
      }
    } else {
      // Binary-search for horizontal cut lat that gives correct area proportion
      const remaining = planned.slice(i);
      const totalRemaining = remaining.reduce((s, p) => s + p.area, 0);
      const fraction = part.area / totalRemaining;
      const remainingArea = polygonArea2D(remainingPoly);
      const targetArea = remainingArea * fraction;

      const lats = remainingPoly.map((p) => p[0]);
      let lo = Math.min(...lats);
      let hi = Math.max(...lats);

      for (let iter = 0; iter < 64; iter++) {
        const mid = (lo + hi) / 2;
        const below = clipHalfPlane(remainingPoly, mid, 'below');
        const belowArea = below.length >= 3 ? polygonArea2D(below) : 0;
        if (belowArea < targetArea) lo = mid; else hi = mid;
      }

      const yCut = (lo + hi) / 2;
      const below = clipHalfPlane(remainingPoly, yCut, 'below');
      const above = clipHalfPlane(remainingPoly, yCut, 'above');

      if (below.length >= 3) {
        slices.push({
          name: part.name,
          area: part.area,
          color: usageColors[i % usageColors.length],
          positions: below,
          center: getCenter(below),
        });
      }
      remainingPoly = above.length >= 3 ? above : remainingPoly;
    }
  }

  return slices;
}

function getParcelIssueLabels(parcel: ParcelData): string[] {
  const issues: string[] = [];
  if (parcel.hasOverlap) issues.push('Boundary overlap');
  if (parcel.in_transaction) issues.push('In transaction');
  if (parcel.under_mortgage) issues.push('Under mortgage');
  if (parcel.has_caveat) issues.push('Has caveat');
  return issues;
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
function MapClickHandler({ onEmptyClick }: { onEmptyClick: (location: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click: (e) => {
      const target = e.originalEvent.target as HTMLElement;
      if (
        target.tagName === 'DIV' ||
        target.tagName === 'svg' ||
        target.tagName === 'CANVAS' ||
        target.classList.contains('leaflet-container')
      ) {
        onEmptyClick({ lat: e.latlng.lat, lng: e.latlng.lng });
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
  riskAssessment: RiskAssessment | null;
  loadingRisk: boolean;
}

function DetailPopup({ parcel, onClose, combinedData, loading, riskAssessment, loadingRisk }: DetailPopupProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const propertyData = combinedData?.propertyData;
  const externalData = combinedData?.externalData;
  const statusRows = [
    { label: 'For Sale', value: parcel.forSale === true ? 'Yes' : 'No' },
    { label: 'Under Mortgage', value: parcel.under_mortgage ? 'Yes' : 'No' },
    { label: 'Has Caveat', value: parcel.has_caveat ? 'Yes' : 'No' },
    { label: 'In Transaction', value: parcel.in_transaction ? 'Yes' : 'No' },
    { label: 'Boundary Overlap', value: parcel.hasOverlap ? 'Yes' : 'No' },
  ];

  const plannedLandUses = (externalData?.plannedLandUses && externalData.plannedLandUses.length > 0)
    ? externalData.plannedLandUses
    : (parcel.planned_land_uses || []);

  if (loading) {
    return (
      <div className=" p-8 flex flex-col items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary mb-3" />
        <p className="text-sm text-gray-600">Loading property details...</p>
      </div>
    );
  }

  return (
    <div className=" max-h-[80vh] overflow-y-auto p-4 pt-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sticky top-0 bg-white dark:bg-gray-800 pb-2 z-10 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-primary text-base truncate flex-1 flex items-center gap-2 py-4">
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

      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mb-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Status Overview</h4>
        <div className="grid grid-cols-2 gap-2">
          {statusRows.map((row) => {
            const isYes = row.value === 'Yes';
            return (
              <div key={row.label} className="rounded-md border border-gray-200 dark:border-gray-700 px-2 py-1.5">
                <div className="text-[11px] text-gray-500">{row.label}</div>
                <div className={`text-xs font-semibold ${isYes ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {row.value}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mb-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Risk Assessment</h4>
        {loadingRisk ? (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 size={14} className="animate-spin" />
            Calculating parcel risk score...
          </div>
        ) : riskAssessment ? (
          <>
            <div className="flex items-center justify-between rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 bg-white/70 dark:bg-gray-900/40">
              <div className="text-sm font-semibold text-foreground">Parcel Risk Score: {riskAssessment.score}/100</div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                riskAssessment.level === 'High'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  : riskAssessment.level === 'Medium'
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              }`}>
                {riskAssessment.level} risk
              </span>
            </div>

            <div className="mt-2">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">Reasons:</p>
              <ul className="mt-1 text-xs text-gray-700 dark:text-gray-300 list-disc pl-4 space-y-1">
                {riskAssessment.reasons.map((reason, idx) => (
                  <li key={`${reason}-${idx}`}>{reason}</li>
                ))}
              </ul>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-gray-600 dark:text-gray-300">
              <div>Distance to roads: {formatDistanceValue(riskAssessment.factors.roadDistanceMeters)}</div>
              <div>Distance to wetlands/lakes: {formatDistanceValue(riskAssessment.factors.wetlandDistanceMeters)}</div>
              <div>Neighbor conflicts: {riskAssessment.factors.neighborParcelConflicts}</div>
              <div>Boundary overlap: {riskAssessment.factors.boundaryOverlapRisk ? 'Yes' : 'No'}</div>
            </div>
          </>
        ) : (
          <div className="text-xs text-gray-500">Risk score not available yet.</div>
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
          {plannedLandUses.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Planned Land Uses</h4>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                {plannedLandUses.map((use, idx) => (
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
function ParcelPolygon({ parcel, isSelected, isCompared, onClick }: { parcel: ParcelData; isSelected: boolean; isCompared: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [hoveredSliceIdx, setHoveredSliceIdx] = useState<number | null>(null);
  const plannedLandUseSlices = useMemo(
    () => buildLandUseSlices(parcel),
    [parcel]
  );

  const getPathOptions = () => {
    const baseOptions: L.PathOptions = {
      color: parcel.color,
      weight: isSelected ? 4 : isCompared ? 4 : hovered ? 3 : 2,
      fillColor: parcel.color,
      fillOpacity: isSelected ? 0.4 : isCompared ? 0.3 : hovered ? 0.25 : 0.15,
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
              weight: isSelected ? 4 : isCompared ? 4 : 2,
              fillOpacity: isSelected ? 0.4 : isCompared ? 0.3 : 0.15,
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

      {plannedLandUseSlices.map((slice, idx) => (
        <React.Fragment key={`${parcel.upi}-planned-${idx}`}>
          <Polygon
            positions={slice.positions}
            pathOptions={{
              color: parcel.color,
              weight: 1,
              fillColor: slice.color,
              fillOpacity: 0.35,
            }}
            eventHandlers={{
              mouseover: () => setHoveredSliceIdx(idx),
              mouseout: () => setHoveredSliceIdx((prev) => (prev === idx ? null : prev)),
              click: (e) => {
                L.DomEvent.stopPropagation(e);
                onClick();
              },
            }}
          />
          {isSelected && hoveredSliceIdx !== idx && (
            <Marker
              position={slice.center}
              icon={L.divIcon({
                html: `<div style="
                  background: rgba(255,255,255,0.96);
                  border: 1px solid #E5E7EB;
                  border-radius: 6px;
                  padding: 3px 6px;
                  font-size: 10px;
                  font-weight: 600;
                  color: #1F2937;
                  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                  white-space: normal;
                  overflow-wrap: anywhere;
                  max-width: 120px;
                  pointer-events: none;
                  line-height: 1.25;
                  text-align: center;
                ">${slice.name}<br/><span style="font-size:9px;font-weight:400;color:#4B5563;">${formatArea(slice.area)}</span></div>`,
                className: 'planned-land-use-label',
                iconSize: [120, 42],
                iconAnchor: [60, 21],
              })}
              interactive={false}
            />
          )}
        </React.Fragment>
      ))}

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
function StepOne({ onVerify, onViewMap, isVerifying, verificationResult }: StepOneProps) {
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
          <div className="flex justify-between">
            <p className="text-blue-100">
              Upload your e-title document to verify your property
            </p>
            <button onClick={() => window.location.href = "/"} className='text-blue-100 cursor-pointer'>Goback</button>
          </div>
        </div>

        <div className="p-8">
          <div className="mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 grid grid-cols-2 gap-1">
            <button
              type="button"
              className="rounded-md px-3 py-2 text-sm font-medium bg-primary text-white"
            >
              Upload & Verify
            </button>
            <button
              type="button"
              onClick={onViewMap}
              className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700"
            >
              View Map
            </button>
          </div>

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
  onSelectedParcelChange,
  onBack,
  onVerifyAnother,
  filterAvailable,
  setFilterAvailable,
  viewMode,
  setViewMode,
  onRefreshParcels,
  chatHighlightUPI,
  chatDetailUPI,
  onAddOrUpdateParcel,
  onApplyServerFilters,
  activeServerFilters,
  loadedFromDbCount,
  totalParcelsCount,
  dbForSaleCount,
  dbOverlapCount,
  isFiltering,
  onLoadMoreParcels,
  canLoadMoreParcels,
  loadingMoreParcels,
}: StepTwoProps) {
  const [selectedParcel, setSelectedParcel] = useState<ParcelData | null>(null);
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite' | 'dark'>('streets');
  const [enable3D, setEnable3D] = useState(false);
  const [autoZoom, setAutoZoom] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [combinedData, setCombinedData] = useState<CombinedPropertyData | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [loadingRisk, setLoadingRisk] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedProvince, setSelectedProvince] = useState<string>(activeServerFilters.province || 'all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>(activeServerFilters.district || 'all');
  const [selectedSector, setSelectedSector] = useState<string>(activeServerFilters.sector || 'all');
  const [saleStatusFilter, setSaleStatusFilter] = useState<'all' | 'for_sale' | 'not_for_sale'>('all');
  const [compareMode, setCompareMode] = useState(false);
  const [compareUpis, setCompareUpis] = useState<string[]>([]);
  const [fetchUpi, setFetchUpi] = useState('');
  const [fetchingUpi, setFetchingUpi] = useState(false);
  const [fetchUpiError, setFetchUpiError] = useState<string | null>(null);
  // 'issues' = has legal issues (kept confidential) | 'overlap' = has boundary overlap | 'not_for_sale'
  const [issueNotice, setIssueNotice] = useState<'issues' | 'not_for_sale' | null>(null);
  const [overlappingDetails, setOverlappingDetails] = useState<Array<{ upi: string; overlap_area_sqm: number }>>([]);
  const [loadingOverlapDetails, setLoadingOverlapDetails] = useState(false);
  const [emptyAreaInfo, setEmptyAreaInfo] = useState<{ lat: number; lng: number } | null>(null);
  const [poiData, setPoiData] = useState<PoiData[]>([]);
  const [loadingPoi, setLoadingPoi] = useState(false);
  const [poiVisibility, setPoiVisibility] = useState<Record<PoiCategory, boolean>>({
    hospitals: true,
    schools: false,
    banks: false,
    markets: false,
  });
  const [mapCenter] = useState<[number, number]>([-1.9403, 29.8739]);

  const distanceMeters = useCallback((a: [number, number], b: [number, number]) => {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const earthRadius = 6371000;
    const lat1 = toRad(a[0]);
    const lat2 = toRad(b[0]);
    const deltaLat = toRad(b[0] - a[0]);
    const deltaLon = toRad(b[1] - a[1]);
    const havA = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
    return 2 * earthRadius * Math.atan2(Math.sqrt(havA), Math.sqrt(1 - havA));
  }, []);

  const formatDistance = useCallback((meters?: number | null) => {
    if (!meters || !Number.isFinite(meters)) return 'N/A';
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(2)} km`;
  }, []);

  const getParcelFacilityContext = useCallback((parcel: ParcelData) => {
    if (!parcel || poiData.length === 0) return null;

    const nearbyCounts: Record<PoiCategory, number> = {
      hospitals: 0,
      schools: 0,
      banks: 0,
      markets: 0,
    };
    const nearestByCategory: Record<PoiCategory, number | null> = {
      hospitals: null,
      schools: null,
      banks: null,
      markets: null,
    };

    let nearestPoi: PoiData | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const poi of poiData) {
      const d = distanceMeters(parcel.center, poi.position);

      if (d < nearestDistance) {
        nearestDistance = d;
        nearestPoi = poi;
      }

      if (nearestByCategory[poi.category] === null || d < (nearestByCategory[poi.category] as number)) {
        nearestByCategory[poi.category] = d;
      }

      if (d <= 1000) {
        nearbyCounts[poi.category] += 1;
      }
    }

    const landUse = (parcel.land_use_type || '').toLowerCase();
    let influenceScore = 0;
    if (landUse.includes('residential') || landUse.includes('housing')) {
      influenceScore = (nearbyCounts.schools * 2) + (nearbyCounts.hospitals * 2) + nearbyCounts.markets + nearbyCounts.banks;
    } else if (landUse.includes('commercial') || landUse.includes('business')) {
      influenceScore = (nearbyCounts.markets * 2) + (nearbyCounts.banks * 2) + nearbyCounts.schools + nearbyCounts.hospitals;
    } else if (landUse.includes('agric')) {
      influenceScore = (nearbyCounts.markets * 2) + nearbyCounts.hospitals + nearbyCounts.schools;
    } else {
      influenceScore = nearbyCounts.hospitals + nearbyCounts.schools + nearbyCounts.banks + nearbyCounts.markets;
    }

    const influenceLabel = influenceScore >= 8 ? 'High' : influenceScore >= 4 ? 'Medium' : 'Low';

    return {
      nearestPoi,
      nearestDistance: Number.isFinite(nearestDistance) ? nearestDistance : null,
      nearestByCategory,
      nearbyCounts,
      influenceScore,
      influenceLabel,
    };
  }, [poiData, distanceMeters]);

  const verifiedParcel = useMemo(() =>
    parcels.find(p => p.upi === verifiedUPI),
    [parcels, verifiedUPI]
  );

  const provinceOptions = PROVINCE_OPTIONS;

  const districtOptions = useMemo(() => {
    if (selectedProvince === 'all') {
      return RWANDA_DISTRICT_OPTIONS;
    }
    return DISTRICTS_BY_PROVINCE[selectedProvince] || RWANDA_DISTRICT_OPTIONS;
  }, [selectedProvince]);

  const sectorOptions = useMemo(() => {
    let source = selectedProvince === 'all'
      ? parcels
      : parcels.filter((p) => p.province === selectedProvince);
    if (selectedDistrict !== 'all') {
      source = source.filter((p) => (p.district || '').toLowerCase() === selectedDistrict.toLowerCase());
    }
    const sectors = Array.from(new Set(source.map((p) => p.sector).filter(Boolean) as string[]));
    return sectors.sort((a, b) => a.localeCompare(b));
  }, [parcels, selectedProvince, selectedDistrict]);

  const displayedParcels = useMemo(() => {
    let filtered = [...parcels];

    if (viewMode !== 'all' && filterAvailable) {
      filtered = filtered.filter((p) => p.isVerified || p.forSale === true);
    }

    return filtered;
  }, [parcels, filterAvailable, viewMode]);

  const compareParcels = useMemo(
    () => parcels.filter((p) => compareUpis.includes(p.upi)),
    [parcels, compareUpis]
  );

  const selectedParcelFacilityContext = useMemo(
    () => (selectedParcel ? getParcelFacilityContext(selectedParcel) : null),
    [selectedParcel, getParcelFacilityContext]
  );

  const compareFacilityContexts = useMemo(() => {
    const entries: Record<string, ReturnType<typeof getParcelFacilityContext>> = {};
    compareParcels.forEach((parcel) => {
      entries[parcel.upi] = getParcelFacilityContext(parcel);
    });
    return entries;
  }, [compareParcels, getParcelFacilityContext]);

  const emptyAreaNearestParcel = useMemo<{ parcel: ParcelData; distance: number } | null>(() => {
    if (!emptyAreaInfo || displayedParcels.length === 0) return null;

    let nearest: ParcelData | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    displayedParcels.forEach((parcel) => {
      const distance = distanceMeters([emptyAreaInfo.lat, emptyAreaInfo.lng], parcel.center);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = parcel;
      }
    });

    if (!nearest || !Number.isFinite(nearestDistance)) return null;
    return { parcel: nearest, distance: nearestDistance };
  }, [distanceMeters, displayedParcels, emptyAreaInfo]);

  // Auto-zoom to verified parcel when map loads
  useEffect(() => {
    if (verifiedParcel && autoZoom) {
      setSelectedParcel(verifiedParcel);
    }
  }, [verifiedParcel, autoZoom]);

  useEffect(() => {
    if (!selectedParcel?.upi) return;
    onSelectedParcelChange(selectedParcel.upi);
  }, [selectedParcel?.upi, onSelectedParcelChange]);

  // Auto-zoom when chatbot highlights a UPI
  useEffect(() => {
    if (!chatHighlightUPI) return;
    const target = parcels.find(p => p.upi === chatHighlightUPI);
    if (target) {
      setSelectedParcel(target);
      setAutoZoom(true);
    }
  }, [chatHighlightUPI, parcels]);

  useEffect(() => {
    if (!verifiedParcel) return;
    setSelectedProvince('all');
    setSelectedDistrict('all');
    setSelectedSector('all');
    setSaleStatusFilter('all');
  }, [verifiedParcel?.upi]);

  useEffect(() => {
    if (displayedParcels.length > 0) {
      const verifiedInView = displayedParcels.find((parcel) => parcel.upi === verifiedUPI);
      setSelectedParcel(verifiedInView || displayedParcels[0]);
      setAutoZoom(true);
    }
  }, [displayedParcels, verifiedUPI]);

  useEffect(() => {
    const filters: ParcelFetchFilters = {
      province: selectedProvince !== 'all' ? selectedProvince : undefined,
      district: selectedDistrict !== 'all' ? selectedDistrict : undefined,
      sector: selectedSector !== 'all' ? selectedSector : undefined,
      sale_status: saleStatusFilter !== 'all' ? saleStatusFilter : undefined,
    };
    onApplyServerFilters(filters);
  }, [selectedProvince, selectedDistrict, selectedSector, saleStatusFilter, onApplyServerFilters]);

  const handleParcelClick = async (parcel: ParcelData) => {
    setEmptyAreaInfo(null);
    setIssueNotice(null);
    setRiskAssessment(null);

    if (compareMode) {
      toggleCompareParcel(parcel);
    }

    // Check for legal issues (details kept confidential) and boundary overlap
    const hasLegalIssue = parcel.under_mortgage || parcel.has_caveat || parcel.in_transaction;
    const hasOverlap = parcel.hasOverlap;

    if (hasLegalIssue || hasOverlap) {
      setShowPopup(false);
      setCombinedData(null);
      setSelectedParcel(parcel);
      setAutoZoom(true);
      setIssueNotice('issues');
      if (hasOverlap) {
        // Fetch detailed overlap info: which parcels, how much area, etc.
        setOverlappingDetails([]);
        setLoadingOverlapDetails(true);
        api.get(`/api/mappings/stats/by-upi/${encodeURIComponent(parcel.upi)}`)
          .then(res => {
            const details = res?.data?.legal_issues?.overlapping_with ?? [];
            setOverlappingDetails(details);
          })
          .catch(() => setOverlappingDetails([]))
          .finally(() => setLoadingOverlapDetails(false));
      }
      return;
    }

    // Only open popup if parcel is for sale or is verified
    if (!parcel.forSale && !parcel.isVerified) {
      setShowPopup(false);
      setCombinedData(null);
      setSelectedParcel(parcel);
      setIssueNotice('not_for_sale');
      setTimeout(() => { setSelectedParcel(null); setIssueNotice(null); }, 2500);
      return;
    }

    setSelectedParcel(parcel);
    setShowPopup(true);
    setAutoZoom(true);
    setLoadingDetails(true);
    setLoadingRisk(true);

    const computeParcelRisk = async (targetParcel: ParcelData): Promise<RiskAssessment> => {
      const shape = polygonShapeMetrics(targetParcel.positions || []);
      let roadDistanceMeters: number | null = null;
      let wetlandDistanceMeters: number | null = null;
      let neighborParcelConflicts = 0;

      try {
        const statsResponse = await api.get(`/api/mappings/stats/by-upi/${encodeURIComponent(targetParcel.upi)}`);
        neighborParcelConflicts = Number(statsResponse?.data?.legal_issues?.overlapping_with?.length || 0);
      } catch {
        neighborParcelConflicts = 0;
      }

      try {
        const lats = targetParcel.positions.map((p) => p[0]);
        const lngs = targetParcel.positions.map((p) => p[1]);
        const pad = 0.01;
        const south = Math.min(...lats) - pad;
        const north = Math.max(...lats) + pad;
        const west = Math.min(...lngs) - pad;
        const east = Math.max(...lngs) + pad;

        const overpassQuery = `
          [out:json][timeout:25];
          (
            way["highway"](${south},${west},${north},${east});
            relation["highway"](${south},${west},${north},${east});
            way["natural"="wetland"](${south},${west},${north},${east});
            relation["natural"="wetland"](${south},${west},${north},${east});
            way["natural"="water"](${south},${west},${north},${east});
            relation["natural"="water"](${south},${west},${north},${east});
            way["waterway"~"river|stream|canal"](${south},${west},${north},${east});
            relation["waterway"~"river|stream|canal"](${south},${west},${north},${east});
          );
          out center;
        `;

        const response = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: overpassQuery,
        });
        const json = await response.json();
        const elements = (json?.elements || []) as any[];

        elements.forEach((el) => {
          const lat = el?.center?.lat;
          const lng = el?.center?.lon;
          if (typeof lat !== 'number' || typeof lng !== 'number') return;
          const dist = distanceMeters(targetParcel.center, [lat, lng]);
          const tags = el?.tags || {};

          const isRoad = Boolean(tags.highway);
          const isWet = tags.natural === 'wetland'
            || tags.natural === 'water'
            || ['river', 'stream', 'canal'].includes(tags.waterway || '');

          if (isRoad && (roadDistanceMeters === null || dist < roadDistanceMeters)) {
            roadDistanceMeters = dist;
          }
          if (isWet && (wetlandDistanceMeters === null || dist < wetlandDistanceMeters)) {
            wetlandDistanceMeters = dist;
          }
        });
      } catch (error) {
        console.warn('Overpass risk context fetch failed:', error);
      }

      let score = 0;
      const reasons: string[] = [];

      if (targetParcel.hasOverlap) {
        score += 28;
        reasons.push('High overlap probability with neighboring parcel');
      }

      if (neighborParcelConflicts > 0) {
        score += Math.min(22, neighborParcelConflicts * 6);
        reasons.push(`Neighbor parcel conflicts detected (${neighborParcelConflicts})`);
      }

      if (wetlandDistanceMeters !== null) {
        if (wetlandDistanceMeters < 250) {
          score += 22;
          reasons.push('Close to protected wetland/lake');
        } else if (wetlandDistanceMeters < 500) {
          score += 12;
          reasons.push('Near wetland/lake zone');
        }
      }

      if (roadDistanceMeters !== null && roadDistanceMeters > 900) {
        score += 10;
        reasons.push('Far from road access');
      }

      if (shape.compactness < 0.23) {
        score += 16;
        reasons.push('Irregular boundary shape');
      }

      if (shape.elongation > 5.5) {
        score += 12;
        reasons.push('Unusually narrow parcel shape');
      }

      if (shape.sharpAngleCount >= 4) {
        score += 10;
        reasons.push('Unnatural boundary angles detected');
      }

      if (shape.fragmentationIndex > 1.2) {
        score += 8;
        reasons.push('Fragmented/jagged parcel edge pattern');
      }

      score = Math.max(0, Math.min(100, Math.round(score)));
      const level: 'Low' | 'Medium' | 'High' = score > 75 ? 'High' : score >= 40 ? 'Medium' : 'Low';

      if (reasons.length === 0) {
        reasons.push('No major spatial fraud indicators detected in current checks');
      }

      return {
        score,
        level,
        reasons,
        factors: {
          boundaryOverlapRisk: Boolean(targetParcel.hasOverlap),
          neighborParcelConflicts,
          roadDistanceMeters,
          wetlandDistanceMeters,
          compactness: shape.compactness,
          elongation: shape.elongation,
          sharpAngleCount: shape.sharpAngleCount,
          fragmentationIndex: shape.fragmentationIndex,
        },
      };
    };

    const riskPromise = computeParcelRisk(parcel);

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
      const computedRisk = await riskPromise;
      setRiskAssessment(computedRisk);
    } catch (error) {
      console.error('Failed to fetch property details:', error);
      try {
        const computedRisk = await riskPromise;
        setRiskAssessment(computedRisk);
      } catch {
        setRiskAssessment(null);
      }
    } finally {
      setLoadingDetails(false);
      setLoadingRisk(false);
    }
  };

  const handleMapPointLookup = useCallback(async (location: { lat: number; lng: number }) => {
    setIssueNotice(null);
    setOverlappingDetails([]);
    setShowPopup(false);
    setCombinedData(null);
    setRiskAssessment(null);
    setLoadingRisk(false);

    try {
      const response = await api.get('/api/mappings/lookup/point', {
        params: {
          lat: location.lat,
          lng: location.lng,
        },
      });

      const mapping = response?.data?.mapping;
      if (response?.data?.found && mapping) {
        const parcel = toParcelFromMapping(mapping, mapping?.upi === verifiedUPI);
        if (parcel) {
          onAddOrUpdateParcel(parcel);
          await handleParcelClick(parcel);
          return;
        }
      }
    } catch (error) {
      console.warn('Point lookup failed:', error);
    }

    setSelectedParcel(null);
    setEmptyAreaInfo(location);
  }, [handleParcelClick, onAddOrUpdateParcel, verifiedUPI]);

  // When chatbot calls onParcelSelect, just zoom/highlight — do NOT open popup.
  // The popup is only opened when the user physically clicks the parcel polygon.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!chatDetailUPI) return;
    const target = parcels.find(p => p.upi === chatDetailUPI);
    if (!target) return;
    // Zoom to parcel and make it selected; close any open popup
    setShowPopup(false);
    setCombinedData(null);
    setSelectedParcel(target);
    setAutoZoom(true);
  }, [chatDetailUPI]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefreshParcels();
    setRefreshing(false);
  };

  const toggleCompareParcel = useCallback((parcel: ParcelData) => {
    setCompareUpis((prev) => {
      if (prev.includes(parcel.upi)) {
        return prev.filter((upi) => upi !== parcel.upi);
      }
      return [...prev, parcel.upi];
    });
  }, []);

  const evaluateParcelForRecommendation = useCallback((parcel: ParcelData) => {
    let score = 50;
    const positives: string[] = [];
    const cautions: string[] = [];

    const legalFlags = [
      parcel.under_mortgage ? 'Under mortgage' : null,
      parcel.has_caveat ? 'Has caveat' : null,
      parcel.in_transaction ? 'In transaction' : null,
    ].filter(Boolean) as string[];

    if (parcel.hasOverlap) {
      score -= 24;
      cautions.push('Boundary overlap risk is high');
    } else {
      score += 12;
      positives.push('No overlap conflict detected');
    }

    if (legalFlags.length > 0) {
      score -= Math.min(24, legalFlags.length * 8);
      cautions.push(`Legal status flags: ${legalFlags.join(', ')}`);
    } else {
      score += 10;
      positives.push('Legal status appears clear (no mortgage/caveat/transaction)');
    }

    if (parcel.forSale) {
      score += 10;
      positives.push('Listed for sale and ready for transaction');
    } else {
      score -= 8;
      cautions.push('Not currently listed for sale');
    }

    let pricePerSqm: number | null = null;
    if (parcel.price && parcel.area && parcel.area > 0) {
      pricePerSqm = parcel.price / parcel.area;
      if (pricePerSqm < 150000) {
        score += 8;
        positives.push('Price-to-area value is favorable');
      } else if (pricePerSqm > 400000) {
        score -= 8;
        cautions.push('Price-to-area value is high compared to peers');
      }
    }

    if (parcel.area && parcel.area > 400) {
      score += 5;
      positives.push('Parcel size supports flexible use');
    }

    const shape = polygonShapeMetrics(parcel.positions || []);
    if (shape.compactness < 0.23) {
      score -= 10;
      cautions.push('Irregular boundary shape detected');
    }
    if (shape.elongation > 5.5) {
      score -= 8;
      cautions.push('Long and narrow shape detected');
    }
    if (shape.sharpAngleCount >= 4) {
      score -= 6;
      cautions.push('Unnatural boundary angles detected');
    }
    if (shape.fragmentationIndex > 1.2) {
      score -= 6;
      cautions.push('Boundary appears fragmented/jagged');
    }

    const context = compareFacilityContexts[parcel.upi];
    if (context) {
      if (context.influenceScore >= 8) {
        score += 8;
        positives.push('Strong surrounding facility influence');
      } else if (context.influenceScore >= 4) {
        score += 4;
        positives.push('Moderate surrounding facility influence');
      } else {
        cautions.push('Limited surrounding facility influence');
      }
    }

    score = Math.max(0, Math.min(100, Math.round(score)));

    const allReasons = [...cautions, ...positives];
    const reasons = allReasons.length > 0
      ? allReasons
      : ['No major differentiating factors found among compared parcels'];

    return {
      score,
      legalStatus: legalFlags.length > 0 ? 'Flagged' : 'Clear',
      legalFlags,
      reasons,
      factors: {
        boundaryOverlapRisk: parcel.hasOverlap ? 'High' : 'Low',
        legalStatus: legalFlags.length > 0 ? legalFlags.join(', ') : 'Clear',
        saleStatus: parcel.forSale ? 'For sale' : 'Not for sale',
        area: formatArea(parcel.area),
        pricePerSqm: pricePerSqm ? `${Math.round(pricePerSqm).toLocaleString()} RWF/m²` : 'N/A',
        shapeComplexity: shape.compactness < 0.23 ? 'High irregularity' : 'Normal',
        elongation: shape.elongation.toFixed(2),
        unnaturalAngles: String(shape.sharpAngleCount),
        fragmentation: shape.fragmentationIndex.toFixed(2),
        neighborContext: context ? `${context.influenceLabel} (${context.influenceScore})` : 'N/A',
      },
    };
  }, [compareFacilityContexts]);

  const compareAnalysisByUpi = useMemo(() => {
    const table: Record<string, ReturnType<typeof evaluateParcelForRecommendation>> = {};
    compareParcels.forEach((parcel) => {
      table[parcel.upi] = evaluateParcelForRecommendation(parcel);
    });
    return table;
  }, [compareParcels, evaluateParcelForRecommendation]);

  const bestComparedParcel = useMemo(() => {
    if (compareParcels.length < 2) return null;
    const ranked = compareParcels
      .map((parcel) => ({ parcel, analysis: compareAnalysisByUpi[parcel.upi] }))
      .sort((a, b) => (b.analysis?.score || 0) - (a.analysis?.score || 0));
    return ranked[0];
  }, [compareAnalysisByUpi, compareParcels]);

  const fetchParcelByUpi = useCallback(async () => {
    const upi = fetchUpi.trim();
    if (!upi) return;
    setFetchingUpi(true);
    setFetchUpiError(null);
    // Close any currently open popup so the map is clean before zooming
    setShowPopup(false);
    setCombinedData(null);
    try {
      const res = await api.get(`/api/mappings/stats/by-upi/${encodeURIComponent(upi)}`);
      const mapping = res?.data?.mapping;
      const parcel = toParcelFromMapping(mapping, false);
      if (!parcel) {
        setFetchUpiError('Parcel found but has no polygon data.');
        return;
      }
      // Add the parcel to the map layer if not already present
      onAddOrUpdateParcel(parcel);
      // Select it and fly to it — popup stays closed; user must click the shape to open it
      setSelectedParcel(parcel);
      setAutoZoom(true);
      setFetchUpi('');
    } catch (error: any) {
      if (error?.response?.status === 404) {
        setFetchUpiError(`Parcel "${upi}" was not found in the database.`);
      } else {
        setFetchUpiError(error?.response?.data?.detail || 'Failed to fetch parcel. Please try again.');
      }
    } finally {
      setFetchingUpi(false);
    }
  }, [fetchUpi, onAddOrUpdateParcel]);

  useEffect(() => {
    const loadPoiData = async () => {
      if (displayedParcels.length === 0) {
        setPoiData([]);
        return;
      }

      const coords = displayedParcels.flatMap((parcel) => parcel.positions);
      const lats = coords.map((c) => c[0]);
      const lngs = coords.map((c) => c[1]);
      const south = Math.min(...lats);
      const north = Math.max(...lats);
      const west = Math.min(...lngs);
      const east = Math.max(...lngs);

      const overpassQuery = `
        [out:json][timeout:25];
        (
          node["amenity"~"hospital|clinic"](${south},${west},${north},${east});
          node["amenity"="school"](${south},${west},${north},${east});
          node["amenity"="bank"](${south},${west},${north},${east});
          node["shop"="supermarket"](${south},${west},${north},${east});
        );
        out body;
      `;

      setLoadingPoi(true);
      try {
        const response = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: overpassQuery,
        });
        const json = await response.json();
        const elements = (json?.elements || []) as any[];

        const points: PoiData[] = elements
          .filter((el) => typeof el.lat === 'number' && typeof el.lon === 'number')
          .map((el) => {
            let category: PoiCategory = 'markets';
            if (['hospital', 'clinic'].includes(el?.tags?.amenity)) category = 'hospitals';
            else if (el?.tags?.amenity === 'school') category = 'schools';
            else if (el?.tags?.amenity === 'bank') category = 'banks';

            return {
              id: `${el.type}-${el.id}`,
              name: el?.tags?.name || 'Unnamed place',
              category,
              position: [el.lat, el.lon],
            };
          });

        setPoiData(points);
      } catch (error) {
        console.warn('Failed to load POI details layer:', error);
        setPoiData([]);
      } finally {
        setLoadingPoi(false);
      }
    };

    loadPoiData();
  }, [displayedParcels]);

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

  const getPoiIcon = (category: PoiCategory) => {
    const colorMap: Record<PoiCategory, string> = {
      hospitals: '#DC2626',
      schools: '#2563EB',
      banks: '#7C3AED',
      markets: '#059669',
    };
    return L.divIcon({
      html: `<div style="width:10px;height:10px;border-radius:999px;background:${colorMap[category]};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.35);"></div>`,
      className: 'poi-marker-dot',
      iconSize: [10, 10],
      iconAnchor: [5, 5],
    });
  };

  const stats = {
    total: totalParcelsCount,
    verified: displayedParcels.filter(p => p.isVerified).length,
    overlapping: dbOverlapCount,
    forSale: dbForSaleCount,
    notForSale: Math.max(totalParcelsCount - dbForSaleCount, 0),
    district: displayedParcels[0]?.district || 'Unknown',
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-background">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-[1000] bg-gradient-to-b from-black/50 to-transparent p-4 pointer-events-none">
        <div className="flex justify-between items-center pointer-events-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="bg-white/90 dark:text-white dark:bg-black backdrop-blur rounded-lg px-3 py-2 flex items-center gap-2 hover:bg-white transition-colors shadow-lg text-foreground"
            >
              <ArrowLeft size={18} />
              <span>Back</span>
            </button>
            <button
              onClick={onVerifyAnother}
              className="bg-white/90 dark:bg-black backdrop-blur rounded-lg px-4 py-2 flex items-center gap-2 hover:bg-white transition-colors shadow-lg"
              style={{ color: 'var(--color-primary)' }}
            >
              <Upload size={18} />
              <span className="font-medium">Verify Another Land</span>
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-white/90 dark:bg-black backdrop-blur rounded-lg px-3 py-2 flex items-center gap-2 hover:bg-white transition-colors shadow-lg text-foreground"
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="bg-white/90 dark:bg-black backdrop-blur rounded-lg flex p-1 shadow-lg">
              <button
                onClick={() => setViewMode('district')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'district'
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-200'
                  }`}
              >
                District View
              </button>
              <button
                onClick={() => setViewMode('all')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'all'
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

            <div className="bg-white/90 dark:bg-black backdrop-blur rounded-lg px-4 py-2 flex gap-4 shadow-lg text-foreground">
              <div className="text-sm">
                <span className="text-gray-600 dark:text-gray-400">Parcels:</span>
                <span className="font-semibold ml-1">{loadedFromDbCount}</span>
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

      <button
        onClick={() => setSidebarOpen((prev) => !prev)}
        className="absolute top-24 left-4 z-[1200] bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200 transition-colors"
        title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
      >
        {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
      </button>

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            className="absolute top-36 left-4 z-[1200] dark:text-gray-200 w-90 max-h-[70vh] overflow-y-auto bg-white/95 dark:bg-gray-900/95 backdrop-blur rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <SlidersHorizontal size={16} />
                Parcel Controls
              </h3>
              <button
                onClick={() => setCompareMode((prev) => !prev)}
                className={`text-xs px-2 py-1 dark:text-white rounded-md ${compareMode ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800'}`}
              >
                {compareMode ? 'Compare: ON' : 'Compare: OFF'}
              </button>
            </div>

            <div className="space-y-3 mb-4">
              {isFiltering && (
                <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 rounded-md px-2 py-1.5 border border-primary/20">
                  <Loader2 size={12} className="animate-spin" />
                  Applying filters...
                </div>
              )}
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Province</label>
                <select
                  disabled={isFiltering}
                  value={selectedProvince}
                  onChange={(e) => {
                    setSelectedProvince(e.target.value);
                    setSelectedDistrict('all');
                    setSelectedSector('all');
                  }}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-sm"
                >
                  <option value="all">All provinces</option>
                  {provinceOptions.map((province) => (
                    <option key={province} value={province}>{province}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">District</label>
                <select
                  disabled={isFiltering}
                  value={selectedDistrict}
                  onChange={(e) => {
                    setSelectedDistrict(e.target.value);
                    setSelectedSector('all');
                  }}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-sm"
                >
                  <option value="all">All districts</option>
                  {districtOptions.map((district) => (
                    <option key={district} value={district}>{district}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Sector</label>
                <select
                  disabled={isFiltering}
                  value={selectedSector}
                  onChange={(e) => setSelectedSector(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-sm"
                >
                  <option value="all">All sectors</option>
                  {sectorOptions.map((sector) => (
                    <option key={sector} value={sector}>{sector}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Sale Status</label>
                <select
                  disabled={isFiltering}
                  value={saleStatusFilter}
                  onChange={(e) => setSaleStatusFilter(e.target.value as 'all' | 'for_sale' | 'not_for_sale')}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-sm"
                >
                  <option value="all">All parcels</option>
                  <option value="for_sale">For sale</option>
                  <option value="not_for_sale">Not for sale</option>
                </select>
              </div>
            </div>

            <div className="mb-4 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Total parcels loaded: {loadedFromDbCount}
              </div>
              {canLoadMoreParcels ? (
                <button
                  onClick={onLoadMoreParcels}
                  disabled={loadingMoreParcels}
                  className="w-full rounded-md bg-primary text-white text-xs px-3 py-2 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loadingMoreParcels ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Loading more parcels...
                    </>
                  ) : (
                    'Load More (next 100)'
                  )}
                </button>
              ) : (
                <div className="text-xs text-green-700 dark:text-green-400">All parcels loaded</div>
              )}
            </div>

            <div className="mb-4">
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Fetch parcel by UPI</label>
              <div className="flex gap-2">
                <input
                  value={fetchUpi}
                  onChange={(e) => setFetchUpi(e.target.value)}
                  placeholder="ex: 3/01/02/03/1234"
                  className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-sm"
                />
                <button
                  onClick={fetchParcelByUpi}
                  disabled={fetchingUpi || !fetchUpi.trim()}
                  className="px-3 py-2 rounded-lg bg-primary text-white disabled:opacity-60"
                >
                  {fetchingUpi ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                </button>
              </div>
              {fetchUpiError && <p className="text-xs text-red-600 mt-1">{fetchUpiError}</p>}
            </div>

            <div className="mb-4">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Map details layers</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {([
                  ['hospitals', 'Hospitals', Hospital],
                  ['schools', 'Schools', GraduationCap],
                  ['banks', 'Banks', Landmark],
                  ['markets', 'Markets', Store],
                ] as [PoiCategory, string, React.ComponentType<any>][]).map(([key, label, Icon]) => (
                  <button
                    key={key}
                    onClick={() => setPoiVisibility((prev) => ({ ...prev, [key]: !prev[key] }))}
                    className={`rounded-md px-2 py-1.5 border text-left flex items-center gap-2 ${poiVisibility[key] ? 'border-primary bg-primary/10 text-primary' : 'border-gray-300 dark:border-gray-700'}`}
                  >
                    <Icon size={13} />
                    {label}
                  </button>
                ))}
              </div>
              {loadingPoi && <p className="text-[11px] text-gray-500 mt-1">Loading places…</p>}
            </div>

            {selectedParcel && (
              <div className="mb-4 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2">Selected Plot Context</h4>
                <p className="text-xs font-medium mb-2">{selectedParcel.upi}</p>

                {selectedParcelFacilityContext?.nearestPoi ? (
                  <>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      Nearest facility: <span className="font-medium">{selectedParcelFacilityContext.nearestPoi.name}</span>
                      {' '}({selectedParcelFacilityContext.nearestPoi.category}) • {formatDistance(selectedParcelFacilityContext.nearestDistance)}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                      Surroundings (≤1km): H {selectedParcelFacilityContext.nearbyCounts.hospitals}, S {selectedParcelFacilityContext.nearbyCounts.schools}, B {selectedParcelFacilityContext.nearbyCounts.banks}, M {selectedParcelFacilityContext.nearbyCounts.markets}
                    </p>
                    <p className="text-xs mt-1 text-primary">
                      Land-use influence: {selectedParcelFacilityContext.influenceLabel} ({selectedParcelFacilityContext.influenceScore})
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-gray-500">No nearby facilities detected for distance analysis yet.</p>
                )}
              </div>
            )}

            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <h4 className="text-xs font-semibold uppercase text-gray-500 mb-2">Compare Parcels ({compareParcels.length})</h4>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {compareParcels.length === 0 && (
                  <p className="text-xs text-gray-500">Turn compare on, then click parcels on the map.</p>
                )}
                {compareParcels.map((parcel) => (
                  <div key={parcel.upi} className="rounded-md border border-gray-200 dark:border-gray-700 p-2 text-xs flex justify-between items-center">
                    <div>
                      <div className="font-medium">{parcel.upi}</div>
                      <div className="text-gray-500">{parcel.district || 'Unknown'} • Score {compareAnalysisByUpi[parcel.upi]?.score ?? 0}/100</div>
                      <div className={`text-[11px] mt-0.5 ${compareAnalysisByUpi[parcel.upi]?.legalStatus === 'Clear' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        Legal: {compareAnalysisByUpi[parcel.upi]?.legalStatus || 'Unknown'}
                      </div>
                      {compareFacilityContexts[parcel.upi]?.nearestPoi && (
                        <div className="text-gray-500">
                          Nearest: {compareFacilityContexts[parcel.upi]?.nearestPoi?.category} • {formatDistance(compareFacilityContexts[parcel.upi]?.nearestDistance || null)}
                        </div>
                      )}
                      {compareFacilityContexts[parcel.upi] && (
                        <div className="text-primary">
                          Influence: {compareFacilityContexts[parcel.upi]?.influenceLabel} ({compareFacilityContexts[parcel.upi]?.influenceScore})
                        </div>
                      )}
                    </div>
                    <button
                      className="text-red-600 hover:text-red-700"
                      onClick={() => toggleCompareParcel(parcel)}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>

              {bestComparedParcel && (
                <div className="mt-3 rounded-lg bg-primary/10 border border-primary/20 p-3">
                  <div className="text-xs font-semibold text-primary flex items-center gap-1 mb-1">
                    <Sparkles size={12} />  Recommendation
                  </div>
                  <div className="text-sm font-medium">{bestComparedParcel.parcel.upi}</div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                    Best score ({bestComparedParcel.analysis.score}/100) from all checked factors with legal status verification.
                  </p>
                  <div className="mt-2 text-[11px] space-y-1 text-gray-700 dark:text-gray-300">
                    <div>Legal status: <span className="font-semibold">{bestComparedParcel.analysis.factors.legalStatus}</span></div>
                    <div>Boundary overlap risk: <span className="font-semibold">{bestComparedParcel.analysis.factors.boundaryOverlapRisk}</span></div>
                    <div>Sale status: <span className="font-semibold">{bestComparedParcel.analysis.factors.saleStatus}</span></div>
                    <div>Area: <span className="font-semibold">{bestComparedParcel.analysis.factors.area}</span></div>
                    <div>Price/m²: <span className="font-semibold">{bestComparedParcel.analysis.factors.pricePerSqm}</span></div>
                    <div>Shape complexity: <span className="font-semibold">{bestComparedParcel.analysis.factors.shapeComplexity}</span></div>
                    <div>Elongation ratio: <span className="font-semibold">{bestComparedParcel.analysis.factors.elongation}</span></div>
                    <div>Unnatural angles: <span className="font-semibold">{bestComparedParcel.analysis.factors.unnaturalAngles}</span></div>
                    <div>Fragmentation index: <span className="font-semibold">{bestComparedParcel.analysis.factors.fragmentation}</span></div>
                    <div>Neighbor context: <span className="font-semibold">{bestComparedParcel.analysis.factors.neighborContext}</span></div>
                  </div>
                  <div className="mt-2">
                    <p className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">Why recommended:</p>
                    <ul className="list-disc pl-4 mt-1 text-[11px] text-gray-600 dark:text-gray-300 space-y-0.5">
                      {bestComparedParcel.analysis.reasons.map((reason, idx) => (
                        <li key={`${reason}-${idx}`}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
        // zoom={13}
        // style={{ height: '100%', width: '100%' }}
        // zoomControl={false}
        // scrollWheelZoom={true}
        // preferCanvas={true}
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

        <MapClickHandler onEmptyClick={(location) => {
          handleMapPointLookup(location);
        }} />

        {/* Parcel Polygons */}
        {displayedParcels.map((parcel) => (
          <ParcelPolygon
            key={parcel.upi}
            parcel={parcel}
            isSelected={selectedParcel?.upi === parcel.upi}
            isCompared={compareUpis.includes(parcel.upi)}
            onClick={() => handleParcelClick(parcel)}
          />
        ))}

        {poiData
          .filter((poi) => poiVisibility[poi.category])
          .map((poi) => (
            <Marker key={poi.id} position={poi.position} icon={getPoiIcon(poi.category)}>
              <Popup>
                <div className="text-xs">
                  <div className="font-semibold">{poi.name}</div>
                  <div className="capitalize text-gray-500">{poi.category}</div>
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

      {/* Detail Popup - only for parcels that are for sale or verified */}
      <AnimatePresence>
        {showPopup && selectedParcel && (selectedParcel.forSale || selectedParcel.isVerified) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[2000] bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden border border-gray-200 dark:border-gray-700"
          >
            <DetailPopup
              parcel={selectedParcel}
              onClose={() => {
                setShowPopup(false);
                setSelectedParcel(null);
                setCombinedData(null);
                setRiskAssessment(null);
              }}
              combinedData={combinedData}
              loading={loadingDetails}
              riskAssessment={riskAssessment}
              loadingRisk={loadingRisk}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Parcel issue / not-for-sale notice — no confidential details exposed */}
      <AnimatePresence>
        {issueNotice && selectedParcel && (
          <motion.div
            key={issueNotice}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[2000] rounded-xl shadow-xl max-w-sm w-full"
          >
            {issueNotice === 'issues' && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert size={20} className="text-red-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-800 dark:text-red-400">Not Safe for Purchase</h3>
                    <p className="text-xs font-mono text-red-800 dark:text-red-300 mt-1">UPI: {selectedParcel.upi}</p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      This parcel has unresolved legal issues. It is not safe to proceed with a purchase at this time. Contact the Rwanda Land Authority for further information.
                    </p>
                    {selectedParcel && (
                      <>
                        <div className="mt-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-red-800 dark:text-red-300">Issues found</p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {getParcelIssueLabels(selectedParcel).map((issue) => (
                              <span key={issue} className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700">
                                {issue}
                              </span>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    <details className="mt-3 rounded-lg border border-red-200 dark:border-red-700 bg-red-100/40 dark:bg-red-900/20 px-3 py-2">
                      <summary className="text-xs font-semibold text-red-800 dark:text-red-300 cursor-pointer">
                        What we check to determine land safety (NLA data)
                      </summary>
                      <ul className="mt-2 text-xs text-red-700 dark:text-red-300 space-y-1 list-disc pl-4">
                        <li>Boundary overlap/conflict status</li>
                        <li>Current transaction status</li>
                        <li>Mortgage status</li>
                        <li>Caveat/restriction status</li>
                      </ul>
                      <p className="mt-2 text-[11px] text-red-600 dark:text-red-400">Source: National Land Authority (NLA) integrated records.</p>
                    </details>

                    {selectedParcel?.hasOverlap && loadingOverlapDetails && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
                        <Loader2 size={12} className="animate-spin" /> Loading overlap details…
                      </div>
                    )}
                    {selectedParcel?.hasOverlap && !loadingOverlapDetails && overlappingDetails.length > 0 && (
                      <div className="mt-3 space-y-1">
                        <p className="text-xs font-semibold text-red-800 dark:text-red-300 uppercase tracking-wide">Conflicting parcels</p>
                        {overlappingDetails.map((ov) => (
                          <div key={ov.upi} className="flex items-center justify-between bg-red-100 dark:bg-red-900/30 rounded-lg px-3 py-1.5 text-xs">
                            <span className="font-medium text-red-900 dark:text-red-200 font-mono">{ov.upi}</span>
                            <span className="text-red-700 hidden dark:text-red-300 ml-4">
                              {ov.overlap_area_sqm != null
                                ? ov.overlap_area_sqm >= 10000
                                  ? `${(ov.overlap_area_sqm / 10000).toFixed(2)} ha overlap`
                                  : `${ov.overlap_area_sqm.toFixed(1)} m² overlap`
                                : 'overlap'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => { setIssueNotice(null); setOverlappingDetails([]); }} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-800">
                    <X size={14} className="text-red-600" />
                  </button>
                </div>
              </div>
            )}
            {issueNotice === 'not_for_sale' && (
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Ban size={20} className="text-gray-500" />
                  <div>
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300">Not Listed for Sale</h3>
                    <p className="text-xs font-mono text-gray-600 dark:text-gray-300 mt-1">UPI: {selectedParcel.upi}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">This parcel is not currently listed for sale.</p>
                    <details className="mt-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100/70 dark:bg-gray-900/40 px-3 py-2">
                      <summary className="text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                        What we check to determine land safety (NLA data)
                      </summary>
                      <ul className="mt-2 text-xs text-gray-600 dark:text-gray-300 space-y-1 list-disc pl-4">
                        <li>Boundary overlap/conflict status</li>
                        <li>Current transaction status</li>
                        <li>Mortgage status</li>
                        <li>Caveat/restriction status</li>
                      </ul>
                      <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">Source: National Land Authority (NLA) integrated records.</p>
                    </details>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!selectedParcel && emptyAreaInfo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-[2000] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-xl min-w-[320px]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <MapPin size={18} className="text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground text-sm">No parcel found in this selected area</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                    No parcel on the selected area found in our system.
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                    Lat: {emptyAreaInfo.lat.toFixed(6)} • Lng: {emptyAreaInfo.lng.toFixed(6)}
                  </p>
                  {emptyAreaNearestParcel && (
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                      Nearest known parcel: {emptyAreaNearestParcel.parcel.upi}
                      {' '}({formatDistance(emptyAreaNearestParcel.distance)})
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setEmptyAreaInfo(null)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                title="Close"
              >
                <X size={14} />
              </button>
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
  const [viewMode, setViewMode] = useState<'district' | 'all'>('all');
  /** UPI set by the chatbot — consumed by StepTwo to auto-zoom the map */
  const [chatHighlightUPI, setChatHighlightUPI] = useState<string | null>(null);
  /** UPI set when user clicks a parcel chip — consumed by StepTwo to open the DetailPopup */
  const [chatDetailUPI, setChatDetailUPI] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [activeServerFilters, setActiveServerFilters] = useState<ParcelFetchFilters>({});
  const [loadedFromDbCount, setLoadedFromDbCount] = useState(0);
  const [totalParcelsCount, setTotalParcelsCount] = useState(0);
  const [dbForSaleCount, setDbForSaleCount] = useState(0);
  const [dbOverlapCount, setDbOverlapCount] = useState(0);
  const [isFiltering, setIsFiltering] = useState(false);
  const [batchPage, setBatchPage] = useState(0);
  const [hasMoreBatchedParcels, setHasMoreBatchedParcels] = useState(false);
  const [loadingMoreParcels, setLoadingMoreParcels] = useState(false);
  const didInitRef = useRef(false);
  const latestFilterRequestRef = useRef(0);
  const inFlightParcelsFetchRef = useRef<{
    key: string;
    promise: Promise<{ items: ParcelData[]; total: number; forSaleCount: number; overlapCount: number; hasMore: boolean }>;
  } | null>(null);

  const upsertParcel = useCallback((parcel: ParcelData) => {
    setParcels((prev) => {
      const exists = prev.some((p) => p.upi === parcel.upi);
      if (exists) {
        return prev.map((p) => (p.upi === parcel.upi ? { ...p, ...parcel, color: getParcelColor({ ...p, ...parcel }, parcel.isVerified) } : p));
      }
      return [...prev, { ...parcel, color: getParcelColor(parcel, parcel.isVerified) }];
    });
  }, []);

  // Load saved state from session storage on mount
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

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

            // Always fetch first balanced backend batch (max 500) to avoid restoring huge cached datasets
            setActiveServerFilters({});
            await fetchAllParcelsAndUpdate({});
          } else {
            // Expired, fetch fresh data
            setActiveServerFilters({});
            await fetchAllParcelsAndUpdate({});
          }
        } else {
          // No saved state, fetch fresh data
          setActiveServerFilters({});
          await fetchAllParcelsAndUpdate({});
        }
      } catch (error) {
        console.error('Failed to load saved state:', error);
        setActiveServerFilters({});
        await fetchAllParcelsAndUpdate({});
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

  const normalizeParcels = useCallback((rawMappings: any[], includeStoredRecords = false) => {
    const parsed = rawMappings
      .map((p: any) => toParcelFromMapping(p, false))
      .filter(Boolean) as ParcelData[];

    const storedVerifications: StoredVerification[] = JSON.parse(sessionStorage.getItem('verifiedParcels') || '[]');
    const verifiedUPIs = new Set(storedVerifications.map(v => v.upi));
    const merged = [...parsed];

    if (includeStoredRecords) {
      const storedVerifiedRecords: StoredVerifiedParcel[] = JSON.parse(sessionStorage.getItem('verifiedParcelRecords') || '[]');
      storedVerifiedRecords.forEach((record) => {
        if (!merged.some((p) => p.upi === record.upi)) {
          merged.push({ ...record.parcel, isVerified: true, color: getParcelColor(record.parcel, true) });
        }
      });
    }

    return merged.map((p: ParcelData) => {
      const isVerified = verifiedUPIs.has(p.upi) || p.isVerified;
      return {
        ...p,
        isVerified,
        color: getParcelColor(p, isVerified),
      };
    });
  }, []);

  const hasActiveServerFilters = useCallback((filters: ParcelFetchFilters = {}) => {
    return Boolean(filters?.province || filters?.district || filters?.sector || filters?.sale_status);
  }, []);

  /* =========================
     FETCH ALL PARCELS
  ========================== */
  const fetchAllParcels = useCallback(async (
    filters: ParcelFetchFilters = {},
    options: { batchPage?: number } = {}
  ) => {
    const requestedBatchPage = options.batchPage ?? 0;
    const pageSize = 100;
    const requestOffset = requestedBatchPage * pageSize;
    const requestKey = JSON.stringify({ filters: filters || {}, offset: requestOffset, limit: pageSize });
    if (inFlightParcelsFetchRef.current?.key === requestKey) {
      return inFlightParcelsFetchRef.current.promise;
    }

    const fetchPromise = (async () => {
      try {
        const response = await api.get('/api/mappings/', {
          params: {
            ...filters,
            limit: pageSize,
            offset: requestOffset,
          },
        });
        const allParcels = Array.isArray(response.data) ? response.data : response.data?.items || [];

        const total = Number(response.headers?.['x-total-count'] ?? allParcels.length ?? 0);
        const normalized = normalizeParcels(allParcels, requestOffset === 0);
        const fallbackForSale = normalized.filter((p) => p.forSale === true).length;
        const fallbackOverlap = normalized.filter((p) => p.hasOverlap).length;
        const forSaleCount = Number(response.headers?.['x-for-sale-count'] ?? fallbackForSale);
        const overlapCount = Number(response.headers?.['x-overlap-count'] ?? fallbackOverlap);
        const hasMoreHeader = String(response.headers?.['x-has-more'] ?? '').toLowerCase() === 'true';
        const hasMore = hasMoreHeader || (requestOffset + normalized.length < total);

        return {
          items: normalized,
          total,
          forSaleCount,
          overlapCount,
          hasMore,
        };
      } catch (error) {
        console.error('Failed to fetch parcels:', error);
        return { items: [], total: 0, forSaleCount: 0, overlapCount: 0, hasMore: false };
      } finally {
        if (inFlightParcelsFetchRef.current?.key === requestKey) {
          inFlightParcelsFetchRef.current = null;
        }
      }
    })();

    inFlightParcelsFetchRef.current = { key: requestKey, promise: fetchPromise };
    return fetchPromise;
  }, [hasActiveServerFilters, normalizeParcels]);

  /* =========================
     FETCH AND UPDATE PARCELS
  ========================== */
  const fetchAllParcelsAndUpdate = useCallback(async (filters: ParcelFetchFilters = {}) => {
    const page = await fetchAllParcels(filters, { batchPage: 0 });
    setParcels(page.items);
    setLoadedFromDbCount(page.items.length);
    setTotalParcelsCount(page.total || page.items.length);
    setDbForSaleCount(page.forSaleCount || 0);
    setDbOverlapCount(page.overlapCount || 0);
    setBatchPage(0);
    setHasMoreBatchedParcels(page.hasMore && page.items.length > 0);
  }, [fetchAllParcels]);

  const applyServerFilters = useCallback(async (filters: ParcelFetchFilters) => {
    const normalizeValue = (value?: string) => {
      const normalized = value?.trim().toLowerCase();
      return normalized && normalized !== 'all' ? normalized : undefined;
    };

    const normalized: ParcelFetchFilters = {
      province: normalizeValue(filters.province),
      district: normalizeValue(filters.district),
      sector: normalizeValue(filters.sector),
      sale_status: filters.sale_status || undefined,
    };
    const currentKey = JSON.stringify(activeServerFilters || {});
    const nextKey = JSON.stringify(normalized || {});
    if (currentKey === nextKey) return;

    const requestId = ++latestFilterRequestRef.current;
    setIsFiltering(true);
    setActiveServerFilters(normalized);
    try {
      const page = await fetchAllParcels(normalized, { batchPage: 0 });
      if (requestId !== latestFilterRequestRef.current) return;
      setParcels(page.items);
      setLoadedFromDbCount(page.items.length);
      setTotalParcelsCount(page.total || page.items.length);
      setDbForSaleCount(page.forSaleCount || 0);
      setDbOverlapCount(page.overlapCount || 0);
      setBatchPage(0);
      setHasMoreBatchedParcels(page.hasMore && page.items.length > 0);
    } finally {
      if (requestId === latestFilterRequestRef.current) {
        setIsFiltering(false);
      }
    }
  }, [activeServerFilters, fetchAllParcels]);

  const handleLoadMoreParcels = useCallback(async () => {
    if (loadingMoreParcels || !hasMoreBatchedParcels) return;

    const nextBatchPage = batchPage + 1;
    setLoadingMoreParcels(true);
    try {
      const page = await fetchAllParcels(activeServerFilters, { batchPage: nextBatchPage });
      const existing = parcels;
      const seen = new Set(existing.map((p) => p.upi));
      const incomingUnique = page.items.filter((p) => !seen.has(p.upi));
      const merged = [...existing, ...incomingUnique];

      setParcels(merged);
      setLoadedFromDbCount(merged.length);
      setTotalParcelsCount(page.total || merged.length);
      setDbForSaleCount(merged.filter((p) => p.forSale === true).length);
      setDbOverlapCount(merged.filter((p) => p.hasOverlap).length);
      setBatchPage(nextBatchPage);
      setHasMoreBatchedParcels(page.hasMore && page.items.length > 0);
    } finally {
      setLoadingMoreParcels(false);
    }
  }, [activeServerFilters, batchPage, fetchAllParcels, hasMoreBatchedParcels, loadingMoreParcels, parcels]);

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
        let externalPlannedUses: Array<{ landUseName: string; area: number }> = [];
        let externalStatuses: {
          under_mortgage?: boolean;
          has_caveat?: boolean;
          in_transaction?: boolean;
          land_use_type?: string;
          tenure_type?: string;
          remaining_lease_term?: number;
          area?: number;
        } = {};

        try {
          const externalResponse = await api.get('/api/external/title_data', {
            params: { upi: verifiedUpi, language: 'english' },
          });
          if (externalResponse.data?.success && externalResponse.data?.found) {
            const ext = externalResponse.data.data;
            externalPlannedUses = extractPlannedLandUses(ext);
            const parcelDetails = ext?.parcelDetails || {};
            externalStatuses = {
              under_mortgage: Boolean(parcelDetails.underMortgage ?? ext?.underMortgage),
              has_caveat: Boolean(parcelDetails.hasCaveat ?? ext?.hasCaveat),
              in_transaction: Boolean(parcelDetails.inTransaction ?? ext?.inTransaction),
              land_use_type: parcelDetails.landUseTypeNameEnglish || ext?.landUse?.landUseTypeNameEnglish,
              tenure_type: parcelDetails.rightTypeName || ext?.rightTypeName,
              remaining_lease_term: Number(parcelDetails.remainingLeaseTerm ?? ext?.remainingLeaseTerm),
              area: Number(parcelDetails.area ?? ext?.area),
            };
          }
        } catch (err) {
          console.warn('External title_data enrichment failed:', err);
        }

        // Always fetch full unfiltered dataset by default
        const page = await fetchAllParcels({});
        let allParcels: ParcelData[] = page.items;
        setActiveServerFilters({});
        setFilterAvailable(false);
        setLoadedFromDbCount(page.items.length);
        setTotalParcelsCount(page.total || page.items.length);
        setDbForSaleCount(page.forSaleCount || page.items.filter((p) => p.forSale === true).length);
        setDbOverlapCount(page.overlapCount || page.items.filter((p) => p.hasOverlap).length);
        setBatchPage(0);
        setHasMoreBatchedParcels(page.hasMore && page.items.length > 0);

        // Mark the verified parcel in the fetched list
        const updatedParcels: ParcelData[] = allParcels.map((p: ParcelData) => {
          if (p.upi === verifiedUpi) {
            return {
              ...p,
              color: '#395d91', // Primary blue
              isVerified: true,
              forSale: result.for_sale || false,
              price: result.price || null,
              area: result.parcel_area_sqm || externalStatuses.area || p.area,
              land_use_type: result.land_use_type || externalStatuses.land_use_type || p.land_use_type,
              tenure_type: result.tenure_type || externalStatuses.tenure_type || p.tenure_type,
              remaining_lease_term: result.remaining_lease_term || externalStatuses.remaining_lease_term || p.remaining_lease_term,
              under_mortgage: result.under_mortgage ?? externalStatuses.under_mortgage ?? p.under_mortgage,
              has_caveat: result.has_caveat ?? externalStatuses.has_caveat ?? p.has_caveat,
              in_transaction: result.in_transaction ?? externalStatuses.in_transaction ?? p.in_transaction,
              planned_land_uses: externalPlannedUses.length > 0 ? externalPlannedUses : p.planned_land_uses,
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

        // If the verified parcel was NOT found in the DB list (mapping not yet stored,
        // or the DB is completely empty), build a ParcelData entry from the
        // official_registry_polygon the verify-pdf endpoint already returned.
        const verifiedAlreadyInList = updatedParcels.some((p) => p.upi === verifiedUpi);
        if (!verifiedAlreadyInList && result.official_registry_polygon) {
          try {
            const parcel = toParcelFromMapping(result, true);
            if (parcel) {
              updatedParcels.push({
                ...parcel,
                isVerified: true,
                color: getParcelColor(parcel, true),
                under_mortgage: result.under_mortgage ?? externalStatuses.under_mortgage ?? parcel.under_mortgage,
                has_caveat: result.has_caveat ?? externalStatuses.has_caveat ?? parcel.has_caveat,
                in_transaction: result.in_transaction ?? externalStatuses.in_transaction ?? parcel.in_transaction,
                planned_land_uses: externalPlannedUses.length > 0 ? externalPlannedUses : parcel.planned_land_uses,
                land_use_type: result.land_use_type || externalStatuses.land_use_type || parcel.land_use_type,
                tenure_type: result.tenure_type || externalStatuses.tenure_type || parcel.tenure_type,
                remaining_lease_term: result.remaining_lease_term || externalStatuses.remaining_lease_term || parcel.remaining_lease_term,
              });
            }
          } catch (e) {
            console.warn('[handleVerify] Could not build parcel from result polygon:', e);
          }
        }

        setDbForSaleCount(updatedParcels.filter((p) => p.forSale === true).length);
        setDbOverlapCount(updatedParcels.filter((p) => p.hasOverlap).length);

        const currentVerifiedParcel = updatedParcels.find((p) => p.upi === verifiedUpi);
        if (currentVerifiedParcel) {
          const records: StoredVerifiedParcel[] = JSON.parse(sessionStorage.getItem('verifiedParcelRecords') || '[]');
          const nextRecord: StoredVerifiedParcel = {
            upi: verifiedUpi,
            parcel: { ...currentVerifiedParcel, isVerified: true, color: getParcelColor(currentVerifiedParcel, true) },
            timestamp: Date.now(),
          };
          const filtered = records.filter((r) => r.upi !== verifiedUpi);
          filtered.push(nextRecord);
          sessionStorage.setItem('verifiedParcelRecords', JSON.stringify(filtered));
        }

        setParcels(updatedParcels);
        setVerifiedUPI(verifiedUpi);
        setViewMode('all');

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
      const backendDetail = error?.response?.data?.detail;
      const backendMessage =
        (typeof backendDetail === 'object' ? backendDetail?.message : undefined) ||
        (typeof backendDetail === 'string' ? backendDetail : undefined) ||
        error?.response?.data?.message;
      setVerificationResult({
        success: false,
        error: backendMessage || error.message || 'Verification failed',
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

  const handleViewMapWithoutUpload = () => {
    setVerificationResult(null);
    setActiveServerFilters({});
    setViewMode('all');
    fetchAllParcelsAndUpdate({});
    setStep('map');
  };

  const handleRefreshParcels = async () => {
    await fetchAllParcelsAndUpdate(activeServerFilters);
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
          onViewMap={handleViewMapWithoutUpload}
          isVerifying={isVerifying}
          verificationResult={verificationResult}
          onReset={handleReset}
        />
      ) : (
        <>
          <div>
            {/* Your other content with lower z-index */}
            <div className="relative" style={{ zIndex: 10 }}>
              {/* Your page content */}
            </div>

            {/* Chatbot with maximum z-index */}
            <SimpleAiChatbot
              position="bottom-right"
              verifiedUPI={verifiedUPI}
              title="Land Assistant"
              zIndex={9999}
              onParcelsUpdate={(parcels) => {
                if (parcels.length > 0) {
                  setChatHighlightUPI(parcels[0].upi);
                }
              }}
              onParcelSelect={(upi) => {
                setChatHighlightUPI(upi);
                // Reset to null first so the useEffect inside StepTwo always
                // fires even when the same UPI chip is clicked again.
                setChatDetailUPI(null);
                setTimeout(() => setChatDetailUPI(upi), 0);
              }}
              onUpiChange={(upi) => {
                setVerifiedUPI(upi);
              }}
            />
          </div>
          <StepTwo
            parcels={parcels}
            verifiedUPI={verifiedUPI}
            onSelectedParcelChange={setVerifiedUPI}
            onBack={handleBack}
            onVerifyAnother={handleVerifyAnother}
            filterAvailable={filterAvailable}
            setFilterAvailable={setFilterAvailable}
            viewMode={viewMode}
            setViewMode={setViewMode}
            onRefreshParcels={handleRefreshParcels}
            chatHighlightUPI={chatHighlightUPI}
            chatDetailUPI={chatDetailUPI}
            onAddOrUpdateParcel={upsertParcel}
            onApplyServerFilters={applyServerFilters}
            activeServerFilters={activeServerFilters}
            loadedFromDbCount={loadedFromDbCount}
            totalParcelsCount={totalParcelsCount}
            dbForSaleCount={dbForSaleCount}
            dbOverlapCount={dbOverlapCount}
            isFiltering={isFiltering}
            onLoadMoreParcels={handleLoadMoreParcels}
            canLoadMoreParcels={hasMoreBatchedParcels}
            loadingMoreParcels={loadingMoreParcels}
          />
        </>
      )}
    </>
  );
}