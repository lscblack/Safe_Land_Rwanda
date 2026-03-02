// utils/mapStyling.ts
export interface ParcelStatus {
    inTransaction?: boolean;
    underMortgage?: boolean;
    hasCaveat?: boolean;
    isProvisional?: boolean;
    area?: number;
    status?: string;
    isPublished?: boolean;
}

export function getParcelColor(
    status: ParcelStatus, 
    overlapping: boolean, 
    isOwnedByUser: boolean,
    hasProperty: boolean
): string {
    // Red for mortgage or overlap (highest priority)
    if (overlapping) return "#EF4444";
    if (status.underMortgage) return "#EF4444";
    
    // User's parcels
    if (isOwnedByUser) {
        // Green if has property, blue if no property
        return hasProperty ? "#10B981" : "#3B82F6";
    }
    
    // Other parcels - grey
    return "#9CA3AF";
}