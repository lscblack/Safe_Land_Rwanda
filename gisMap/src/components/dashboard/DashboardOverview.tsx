// DashboardOverview.tsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    MapPin, AlertTriangle, CheckCircle2, Clock, DollarSign,
    TrendingUp, TrendingDown, Shield,
    Layers, Database, Sparkles, Target,Plus,Map,Activity, Zap,Home,
    MessageCircle,
    Upload
} from 'lucide-react';
import { clsx } from 'clsx';
import api from '../../instance/mainAxios';


interface UploaderStatsResponse {
    uploader_id: string;
    summary: {
        total_mappings: number;
        for_sale: number;
        not_for_sale: number;
        with_issues: number;
        clean: number;
        under_mortgage: number;
        has_caveat: number;
        in_transaction: number;
        overlaps: number;
        total_listed_value: number;
    };
    breakdown: {
        by_district: Record<string, number>;
        by_land_use: Record<string, number>;
    };
    parcels: Array<{
        upi: string;
        for_sale: boolean;
        has_issue: boolean;
        district: string;
        land_use_type: string;
        parcel_area_sqm: number;
        price: number | null;
        under_mortgage: boolean;
        has_caveat: boolean;
        in_transaction: boolean;
        overlaps: boolean;
        created_at: string;
    }>;
}

interface UserProfile {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    avatar?: string;
    role: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PRIMARY_COLOR = '#395d91';
const SUCCESS_COLOR = '#10b981';
const WARNING_COLOR = '#f59e0b';
const DANGER_COLOR = '#ef4444';
const INFO_COLOR = '#3b82f6';
const PURPLE_COLOR = '#8b5cf6';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-RW', {
        style: 'currency',
        currency: 'RWF',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
};

const formatArea = (area: number): string => {
    if (area >= 10000) {
        return `${(area / 10000).toFixed(2)} ha`;
    }
    return `${area.toFixed(0)} m²`;
};

const getTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60,
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
        }
    }
    return 'Just now';
};

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ElementType;
    trend?: {
        value: number;
        positive?: boolean;
    };
    subtitle?: string;
    color?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
    onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    icon: Icon,
    trend,
    subtitle,
    color = 'primary',
    onClick,
}) => {
    const colorClasses = {
        primary: 'bg-[#395d91]/10 text-[#395d91] border-[#395d91]/20',
        success: 'bg-green-100 text-green-600 border-green-200',
        warning: 'bg-orange-100 text-orange-600 border-orange-200',
        danger: 'bg-red-100 text-red-600 border-red-200',
        info: 'bg-blue-100 text-blue-600 border-blue-200',
        purple: 'bg-purple-100 text-purple-600 border-purple-200',
    };

    return (
        <motion.div
            whileHover={{ y: -4 }}
            className={clsx(
                'bg-white rounded-xl border border-gray-200 p-6 cursor-pointer transition-all hover:shadow-lg',
                onClick && 'cursor-pointer'
            )}
            onClick={onClick}
        >
            <div className="flex justify-between items-start mb-4">
                <div className={clsx('p-3 rounded-lg', colorClasses[color])}>
                    <Icon size={20} />
                </div>
                {trend && (
                    <div className={clsx(
                        'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
                        trend.positive ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
                    )}>
                        {trend.positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {trend.value}%
                    </div>
                )}
            </div>
            <div>
                <p className="text-sm text-gray-500 mb-1">{title}</p>
                <p className="text-2xl font-bold text-gray-800">{value}</p>
                {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
            </div>
        </motion.div>
    );
};

// ============================================================================
// PROGRESS BAR COMPONENT
// ============================================================================

interface ProgressBarProps {
    label: string;
    value: number;
    max?: number;
    color?: string;
    showPercentage?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
    label,
    value,
    max = 100,
    color = PRIMARY_COLOR,
    showPercentage = true,
}) => {
    const percentage = Math.min((value / max) * 100, 100);

    return (
        <div className="space-y-1">
            <div className="flex justify-between text-sm">
                <span className="text-gray-600">{label}</span>
                {showPercentage && (
                    <span className="text-gray-900 font-medium">{percentage.toFixed(0)}%</span>
                )}
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: color }}
                />
            </div>
        </div>
    );
};

// ============================================================================
// PIE CHART COMPONENT
// ============================================================================

interface PieChartProps {
    data: Array<{ label: string; value: number; color: string }>;
    size?: number;
}

const PieChart: React.FC<PieChartProps> = ({ data, size = 120 }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let cumulativeAngle = 0;

    const getPath = (value: number) => {
        const angle = (value / total) * 360;
        const startAngle = cumulativeAngle;
        const endAngle = cumulativeAngle + angle;
        cumulativeAngle += angle;

        const startRad = (startAngle - 90) * (Math.PI / 180);
        const endRad = (endAngle - 90) * (Math.PI / 180);

        const x1 = size / 2 + (size / 2) * Math.cos(startRad);
        const y1 = size / 2 + (size / 2) * Math.sin(startRad);
        const x2 = size / 2 + (size / 2) * Math.cos(endRad);
        const y2 = size / 2 + (size / 2) * Math.sin(endRad);

        const largeArcFlag = angle > 180 ? 1 : 0;

        return `M ${size / 2} ${size / 2} L ${x1} ${y1} A ${size / 2} ${size / 2} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
    };

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {data.map((item, index) => (
                <path
                    key={index}
                    d={getPath(item.value)}
                    fill={item.color}
                    stroke="white"
                    strokeWidth="2"
                />
            ))}
            <circle cx={size / 2} cy={size / 2} r={size / 4} fill="white" />
        </svg>
    );
};

// ============================================================================
// ACTIVITY TIMELINE COMPONENT
// ============================================================================

interface Activity {
    id: string;
    type: 'upload' | 'sale' | 'issue' | 'chat' | 'property';
    title: string;
    description: string;
    timestamp: string;
    upi?: string;
}

interface ActivityTimelineProps {
    activities: Activity[];
}

const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ activities }) => {
    const getIcon = (type: string) => {
        switch (type) {
            case 'upload': return <Upload size={14} className="text-blue-600" />;
            case 'sale': return <DollarSign size={14} className="text-green-600" />;
            case 'issue': return <AlertTriangle size={14} className="text-orange-600" />;
            case 'chat': return <MessageCircle size={14} className="text-purple-600" />;
            case 'property': return <Home size={14} className="text-[#395d91]" />;
            default: return <Activity size={14} className="text-gray-600" />;
        }
    };

    const getBgColor = (type: string) => {
        switch (type) {
            case 'upload': return 'bg-blue-100';
            case 'sale': return 'bg-green-100';
            case 'issue': return 'bg-orange-100';
            case 'chat': return 'bg-purple-100';
            case 'property': return 'bg-[#395d91]/10';
            default: return 'bg-gray-100';
        }
    };

    return (
        <div className="space-y-4">
            {activities.map((activity, index) => (
                <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex gap-3"
                >
                    <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', getBgColor(activity.type))}>
                        {getIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-gray-800">{activity.title}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{activity.description}</p>
                                {activity.upi && (
                                    <p className="text-xs font-mono text-[#395d91] mt-1">{activity.upi}</p>
                                )}
                            </div>
                            <span className="text-xs text-gray-400">{getTimeAgo(activity.timestamp)}</span>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

// ============================================================================
// PARCEL TABLE COMPONENT
// ============================================================================

interface ParcelTableProps {
    parcels: Array<{
        upi: string;
        district: string;
        land_use_type: string;
        parcel_area_sqm: number;
        for_sale: boolean;
        has_issue: boolean;
        price: number | null;
        created_at: string;
    }>;
    onViewParcel?: (upi: string) => void;
}

const ParcelTable: React.FC<ParcelTableProps> = ({ parcels, onViewParcel }) => {
    onViewParcel ? "" : ""
    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-gray-200">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">UPI</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Land Use</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Area</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>

                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {parcels.map((parcel, index) => (
                        <motion.tr
                            key={parcel.upi}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={clsx(
                                'hover:bg-gray-50 transition-colors',
                                parcel.has_issue && 'bg-red-200/30'
                            )}
                        >
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                    {parcel.has_issue && (
                                        <AlertTriangle size={14} className="text-orange-500" />
                                    )}
                                    <span className="font-mono text-sm">{parcel.upi}</span>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-sm">{parcel.district}</td>
                            <td className="px-4 py-3">
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                                    {parcel.land_use_type}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-sm">{formatArea(parcel.parcel_area_sqm)}</td>
                            <td className="px-4 py-3">
                                {parcel.for_sale ? (
                                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                                        For Sale
                                    </span>
                                ) : (
                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                                        Not Listed
                                    </span>
                                )}
                            </td>

                        </motion.tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

interface DashboardOverviewProps {
    userId?: string | number;
    onViewParcel?: (upi: string) => void;
    // activeView: string;
    setActiveView: (view: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
    userId,
    onViewParcel,
    // activeView,
    setActiveView
}) => {
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [stats, setStats] = useState<UploaderStatsResponse | null>(null);
    const [recentParcels, setRecentParcels] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
    const [activities, setActivities] = useState<Activity[]>([]);

    // Fetch user profile and stats
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Get current user if no userId provided
                let currentUserId = userId;
                if (!currentUserId) {
                    const profileRes = await api.get('/api/user/profile');
                    setUserProfile(profileRes.data);
                    currentUserId = profileRes.data.id;
                }

                // Fetch stats for this user
                const statsRes = await api.get(`/api/mappings/stats/by-uploader/${currentUserId}`);
                setStats(statsRes.data);

                // Generate activities from parcels
                const activitiesList: Activity[] = [];
                statsRes.data.parcels.forEach((parcel: any, index: number) => {
                    if (index < 5) {
                        activitiesList.push({
                            id: `upload-${parcel.upi}`,
                            type: 'upload',
                            title: 'Parcel Uploaded',
                            description: `New parcel added to your portfolio`,
                            timestamp: parcel.created_at,
                            upi: parcel.upi,
                        });
                    }
                    if (parcel.for_sale) {
                        activitiesList.push({
                            id: `sale-${parcel.upi}`,
                            type: 'sale',
                            title: 'Listed for Sale',
                            description: `Parcel listed with price ${formatCurrency(parcel.price || 0)}`,
                            timestamp: parcel.created_at,
                            upi: parcel.upi,
                        });
                    }
                    if (parcel.has_issue) {
                        activitiesList.push({
                            id: `issue-${parcel.upi}`,
                            type: 'issue',
                            title: 'Issue Detected',
                            description: 'Legal issue detected on parcel',
                            timestamp: parcel.created_at,
                            upi: parcel.upi,
                        });
                    }
                });

                // Add chat activities
                activitiesList.push({
                    id: 'chat-1',
                    type: 'chat',
                    title: 'Chat Session',
                    description: 'A user had a conversation with the AI assistant',
                    timestamp: new Date().toISOString(),
                });

                setActivities(activitiesList.sort((a, b) =>
                    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                ));

                // Set recent parcels (sorted by date)
                setRecentParcels(statsRes.data.parcels.slice(0, 5));

            } catch (err: any) {
                console.error('Failed to fetch dashboard data:', err);
                setError(err.response?.data?.message || 'Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [userId]);

    // Calculate health score
    const healthScore = stats ? Math.round((stats.summary.clean / stats.summary.total_mappings) * 100) : 0;

    // Prepare chart data
    const landUseData = stats ? Object.entries(stats.breakdown.by_land_use).map(([label, value], index) => ({
        label,
        value: value as number,
        color: index === 0 ? PRIMARY_COLOR : index === 1 ? INFO_COLOR : PURPLE_COLOR,
    })) : [];

    const districtData = stats ? Object.entries(stats.breakdown.by_district).map(([label, value], index) => ({
        label,
        value: value as number,
        color: index === 0 ? SUCCESS_COLOR : index === 1 ? WARNING_COLOR : DANGER_COLOR,
    })) : [];

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[#395d91] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    if (error || !stats) {
        return (
            <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
                <div className="bg-white rounded-xl p-8 text-center max-w-md">
                    <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-bold mb-2">Failed to Load Dashboard</h3>
                    <p className="text-gray-600 mb-4">{error || 'No data available'}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-[#395d91] text-white rounded-lg hover:bg-[#2d4a75] transition-colors"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }
    // handelview fucniton
    const handleView = (view: string) => {
        setActiveView("gis_pdf_user");
        localStorage.setItem("activeView_tab", view);
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
            <div className="max-w-full mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <Sparkles size={24} className="text-[#395d91]" />
                            Welcome back, {userProfile?.first_name || 'User'}!
                        </h1>
                        <p className="text-gray-500 mt-1">
                            Here's what's happening with your properties
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => handleView("map")}
                            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
                        >
                            <Map size={16} className="text-[#395d91]" />
                            View Map
                        </button>
                        <button
                            onClick={() => handleView("upload")}
                            className="px-4 py-2 bg-[#395d91] text-white rounded-lg text-sm font-medium hover:bg-[#2d4a75] transition-colors flex items-center gap-2"
                        >
                            <Plus size={16} />
                            Upload New Parcel
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                    <StatCard
                        title="Total Parcels"
                        value={formatNumber(stats.summary.total_mappings)}
                        icon={Database}
                        color="primary"
                        subtitle={`${stats.summary.for_sale} listed for sale`}
                    />
                    <StatCard
                        title="Clean Parcels"
                        value={formatNumber(stats.summary.clean)}
                        icon={CheckCircle2}
                        color="success"
                        subtitle={`${healthScore}% health score`}
                        trend={{ value: healthScore, positive: healthScore > 70 }}
                    />
                    <StatCard
                        title="Issues Found"
                        value={formatNumber(stats.summary.with_issues)}
                        icon={AlertTriangle}
                        color="warning"
                        subtitle={`${stats.summary.under_mortgage} mortgage · ${stats.summary.has_caveat} caveat · ${stats.summary.in_transaction} txn`}
                    />
                    <StatCard
                        title="Overlapping Parcels"
                        value={formatNumber(stats.summary.overlaps)}
                        icon={Layers}
                        color={stats.summary.overlaps > 0 ? 'danger' : 'success'}
                        subtitle={stats.summary.overlaps > 0 ? 'Interior area conflicts detected' : 'No area conflicts'}
                    />
                    <StatCard
                        title="Total Value"
                        value={formatCurrency(stats.summary.total_listed_value)}
                        icon={DollarSign}
                        color="info"
                        subtitle="Listed properties only"
                    />
                </div>

                {/* Health Score and Quick Actions */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Health Score Card */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-800">Portfolio Health</h3>
                            <Shield size={20} className="text-[#395d91]" />
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <svg className="w-24 h-24">
                                    <circle
                                        className="text-gray-200"
                                        strokeWidth="8"
                                        stroke="currentColor"
                                        fill="transparent"
                                        r="40"
                                        cx="48"
                                        cy="48"
                                    />
                                    <circle
                                        className="text-[#395d91]"
                                        strokeWidth="8"
                                        strokeLinecap="round"
                                        stroke="currentColor"
                                        fill="transparent"
                                        r="40"
                                        cx="48"
                                        cy="48"
                                        strokeDasharray={`${2 * Math.PI * 40}`}
                                        strokeDashoffset={`${2 * Math.PI * 40 * (1 - healthScore / 100)}`}
                                        transform="rotate(-90 48 48)"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-xl font-bold text-[#395d91]">{healthScore}%</span>
                                </div>
                            </div>
                            <div className="flex-1 space-y-2">
                                <ProgressBar
                                    label="Clean"
                                    value={stats.summary.clean}
                                    max={stats.summary.total_mappings}
                                    color={SUCCESS_COLOR}
                                />
                                <ProgressBar
                                    label="Issues"
                                    value={stats.summary.with_issues}
                                    max={stats.summary.total_mappings}
                                    color={WARNING_COLOR}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 lg:col-span-2">
                        <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <button onClick={() => handleView("upload")} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-center">
                                <Upload size={20} className="mx-auto mb-2 text-[#395d91]" />
                                <span className="text-xs font-medium">Upload PDF</span>
                            </button>
                            <button onClick={() => handleView("map")} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-center">
                                <Map size={20} className="mx-auto mb-2 text-[#395d91]" />
                                <span className="text-xs font-medium">View Map</span>
                            </button>
                            <button onClick={() => handleView("mappings")} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-center">
                                <DollarSign size={20} className="mx-auto mb-2 text-[#395d91]" />
                                <span className="text-xs font-medium">List for Sale</span>
                            </button>
                            <button onClick={() => window.location.href = "/map"} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-center">
                                <MessageCircle size={20} className="mx-auto mb-2 text-[#395d91]" />
                                <span className="text-xs font-medium">View As User</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Charts and Activities */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Land Use Distribution */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-gray-800">Land Use Distribution</h3>
                            <Layers size={16} className="text-gray-400" />
                        </div>
                        {landUseData.length > 0 ? (
                            <div className="flex flex-col items-center">
                                <PieChart data={landUseData} size={150} />
                                <div className="w-full mt-4 space-y-2">
                                    {landUseData.map((item, index) => (
                                        <div key={index} className="flex justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                                <span className="text-gray-600">{item.label}</span>
                                            </div>
                                            <span className="font-medium">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="h-40 flex items-center justify-center text-gray-400">
                                No data available
                            </div>
                        )}
                    </div>

                    {/* District Distribution */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-gray-800">District Distribution</h3>
                            <MapPin size={16} className="text-gray-400" />
                        </div>
                        {districtData.length > 0 ? (
                            <div className="space-y-3">
                                {districtData.map((item, index) => (
                                    <div key={index} className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">{item.label}</span>
                                            <span className="font-medium">{item.value}</span>
                                        </div>
                                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(item.value / stats.summary.total_mappings) * 100}%` }}
                                                className="h-full rounded-full"
                                                style={{ backgroundColor: item.color }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-40 flex items-center justify-center text-gray-400">
                                No data available
                            </div>
                        )}
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-gray-800">Recent Activity</h3>
                            <Activity size={16} className="text-gray-400" />
                        </div>
                        <ActivityTimeline activities={activities.slice(0, 5)} />
                    </div>
                </div>

                {/* Recent Parcels Table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                        <div>
                            <h3 className="font-semibold text-gray-800">Recent Parcels</h3>
                            <p className="text-xs text-gray-500 mt-1">
                                Sorted by issues first - problem parcels shown at the top
                            </p>
                        </div>
                        <button onClick={() => handleView("mappings")} className="text-sm text-[#395d91] hover:underline">
                            View All
                        </button>
                    </div>
                    <ParcelTable parcels={recentParcels} onViewParcel={onViewParcel} />
                </div>

                {/* Footer Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Clock size={16} className="text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Last Upload</p>
                                <p className="text-sm font-medium">
                                    {recentParcels[0] ? getTimeAgo(recentParcels[0].created_at) : 'Never'}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <Target size={16} className="text-green-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Active Listings</p>
                                <p className="text-sm font-medium">{stats.summary.for_sale}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${stats.summary.overlaps > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                                <Layers size={16} className={stats.summary.overlaps > 0 ? 'text-red-600' : 'text-green-600'} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Overlap Conflicts</p>
                                <p className="text-sm font-medium">
                                    {stats.summary.overlaps > 0
                                        ? `${stats.summary.overlaps} parcel${stats.summary.overlaps === 1 ? '' : 's'}`
                                        : 'None detected'
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <Zap size={16} className="text-orange-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Completion Rate</p>
                                <p className="text-sm font-medium">{healthScore}%</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardOverview;