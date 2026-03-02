// Updated ParcelSidebar.tsx - Fix area display
import { motion, AnimatePresence } from "framer-motion";
import {
    Filter,
    Eye,
    EyeOff,
    UserCheck,
    Loader2,
} from "lucide-react";
import { type FilterState, type ParcelData } from "./";

interface ParcelSidebarProps {
    parcels: ParcelData[];
    selectedUPI: string | null;
    loadingInfo: boolean;
    clickedParcel: string | null;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    filter: FilterState;
    onFilterChange: (filter: FilterState) => void;
    showFilters: boolean;
    onShowFiltersChange: (show: boolean) => void;
    viewMode: 'all' | 'my';
    onViewMyParcels: () => void;
    onViewAllParcels: () => void;
    onParcelClick: (upi: string) => void;
    loggedUser: any;
    formatDistance: (meters: number) => string;
    parcelInfo: any;
    showNearby: boolean;
}

export function ParcelSidebar({
    parcels,
    selectedUPI,
    loadingInfo,
    clickedParcel,
    searchQuery,
    onSearchChange,
    filter,
    onFilterChange,
    showFilters,
    onShowFiltersChange,
    viewMode,
    onViewMyParcels,
    onViewAllParcels,
    onParcelClick,
    loggedUser,
    formatDistance,
    parcelInfo,
    showNearby,
}: ParcelSidebarProps) {
    
    // Helper function to get area from parcel
    const getParcelArea = (parcel: ParcelData): string => {
        // Check multiple possible area fields
        const area = parcel.parcel_area_sqm || 
                    parcel.size || 
                    parcel.status_details?.area || 
                    parcel.area;
        
        if (!area) return 'N/A';
        
        // Format area nicely
        if (area >= 10000) {
            return `${(area / 10000).toFixed(2)} ha`;
        }
        return `${Math.round(area).toLocaleString()} m²`;
    };

    return (
        <div style={{
            width: 340,
            backgroundColor: '#ffffff',
            borderRight: '1px solid #E5E7EB',
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            overflow: 'hidden',
            flexShrink: 0,
        }}>
            {/* Header */}
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
                    {parcels.length} parcels • {viewMode === 'my' ? 'My properties' : 'All properties'}
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
                    onChange={(e) => onSearchChange(e.target.value)}
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
                    onClick={() => onShowFiltersChange(!showFilters)}
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
                    onClick={viewMode === 'my' ? onViewAllParcels : onViewMyParcels}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 12px',
                        backgroundColor: viewMode === 'my' ? 'var(--color-primary)' : '#F3F4F6',
                        color: viewMode === 'my' ? 'white' : '#374151',
                        border: 'none',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: 'pointer',
                    }}
                >
                    {viewMode === 'my' ? <Eye size={14} /> : <EyeOff size={14} />}
                    {viewMode === 'my' ? 'My Properties' : 'All Properties'}
                </button>
            </div>

            {/* Scrollable Content */}
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
                                        onChange={(e) => onFilterChange({ ...filter, status: e.target.value as any })}
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
                                            onChange={(e) => onFilterChange({ ...filter, area: [Number(e.target.value), filter.area[1]] })}
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
                                            onChange={(e) => onFilterChange({ ...filter, area: [filter.area[0], Number(e.target.value)] })}
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
                                    onClick={() => onFilterChange({
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

                {/* Parcel List */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '0 12px 12px',
                    minHeight: '200px',
                }}>
                    {parcels.length === 0 ? (
                        <div style={{
                            padding: '32px 16px',
                            textAlign: 'center',
                            color: '#6B7280',
                            fontSize: 13,
                        }}>
                            No parcels match your filters
                        </div>
                    ) : (
                        parcels.map((parcel) => {
                            const area = getParcelArea(parcel);
                            
                            return (
                                <motion.div
                                    key={parcel.upi}
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                    onClick={() => onParcelClick(parcel.upi)}
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
                                            {/* Area Display - Fixed */}
                                            <div style={{ 
                                                fontSize: 12, 
                                                color: '#6B7280',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 4,
                                            }}>
                                                <span>📍 Area:</span>
                                                <span style={{ fontWeight: 500, color: '#374151' }}>
                                                    {area}
                                                </span>
                                            </div>
                                            {/* Additional Info */}
                                            {parcel.location?.village && (
                                                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                                                    {parcel.location.village}, {parcel.location.cell || ''}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{
                                            width: 12,
                                            height: 12,
                                            borderRadius: '50%',
                                            backgroundColor: parcel.color,
                                            flexShrink: 0,
                                            border: selectedUPI === parcel.upi ? '2px solid white' : 'none',
                                            boxShadow: selectedUPI === parcel.upi ? '0 0 0 2px var(--color-primary)' : 'none',
                                        }} />
                                    </div>
                                    {/* Status Badges */}
                                    <div style={{
                                        display: 'flex',
                                        gap: 6,
                                        marginTop: 8,
                                        fontSize: 11,
                                        flexWrap: 'wrap',
                                    }}>
                                        {parcel.overlapping && (
                                            <span style={{ 
                                                padding: '2px 6px',
                                                backgroundColor: '#FEF2F2', 
                                                color: '#EF4444',
                                                borderRadius: 12,
                                                fontSize: 10,
                                            }}>
                                                🔴 Overlap
                                            </span>
                                        )}
                                        {parcel.status_details?.underMortgage && (
                                            <span style={{ 
                                                padding: '2px 6px',
                                                backgroundColor: '#FFFBEB', 
                                                color: '#F59E0B',
                                                borderRadius: 12,
                                                fontSize: 10,
                                            }}>
                                                🏦 Mortgage
                                            </span>
                                        )}
                                        {parcel.status_details?.inTransaction && (
                                            <span style={{ 
                                                padding: '2px 6px',
                                                backgroundColor: '#FEF2F2', 
                                                color: '#EF4444',
                                                borderRadius: 12,
                                                fontSize: 10,
                                            }}>
                                                🔄 Active
                                            </span>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}