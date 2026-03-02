// types/index.ts
export interface ParcelStatus {
    inTransaction?: boolean;
    underMortgage?: boolean;
    hasCaveat?: boolean;
    isProvisional?: boolean;
    area?: number;
    status?: string;
    isPublished?: boolean;
}

export interface Owner {
    fullName: string;
    sharePercentage?: string;
    idNo?: string;
    partyId?: string;
    idTypeName?: string;
    countryName?: string;
    gender?: string;
    maritalStatus?: string;
}

export interface Representative {
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

export interface PlannedLandUse {
    upi: string;
    landUseName: string;
    area?: number;
}

export interface ParcelInfo {
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
            village?: any;
            cell?: any;
            sector?: any;
            district?: any;
            province?: any;
        };
    };
    overlapping?: boolean;
    coordinates?: any[];
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
    uploaderId?: number;
    uploaderName?: string;
    uploaderEmail?: string;
    uploaderRole?: string;
    isOwnedByUser?: boolean;
}

export interface NearbyPlace {
    id: string;
    name: string;
    category: string;
    type: string;
    subType?: string;
    distance: number;
    position: [number, number];
    address?: string;
    rating?: number;
    phone?: string;
    hours?: string;
    website?: string;
    road?: string;
}

export interface FilterState {
    status: "all" | "overlapping" | "underMortgage" | "inTransaction" | "available" | "myProperties";
    landUse: string[];
    area: [number, number];
    ownership: string;
    nearbyCategories: string[];
    nearbyTypes: string[];
    searchRadius: number;
    showAllProperties: boolean;
}

export interface ParcelData {
    upi: string;
    positions: [number, number][];
    center: [number, number];
    color: string;
    overlapping: boolean;
    isOwnedByUser: boolean;
    hasProperty: boolean;
    status_details?: ParcelStatus;
    parcel_area_sqm?: number;
    size?: number;
    property_id?: number;
    [key: string]: any;
}