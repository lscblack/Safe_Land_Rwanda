import  { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {  Map as MapIcon, ChevronDown, 
    Search, Activity,  FileText, X, ScanLine, 
    MapPin, AlertCircle, CheckCircle2,
    Zap, Target, ArrowUpRight, Cpu, Download, Globe
} from 'lucide-react';
import { clsx } from 'clsx';
import { Navbar } from '../components/navigation/Navbar';
import { Footer } from '../components/navigation/FooterAll';

// --- TYPES ---
interface InvestmentZone {
    id: number;
    rank: number;
    name: string;
    location: string;
    district: string;
    province: string;
    type: 'Residential' | 'Commercial' | 'Industrial' | 'Mixed' | 'Agricultural';
    roi: number;
    risk: 'Low' | 'Medium' | 'High';
    price_avg: number;
    price_min: number;
    price_max: number;
    growth_yoy: number;
    growth_5y: number;
    ai_score: number;
    confidence: number;
    listing_count: number;
    demand_index: number;
    supply_index: number;
    infrastructure_score: number;
    tags: string[];
}

interface HistoricalDataPoint {
    year: number;
    quarter: number;
    value: number;
    volume: number;
}

interface ValuationResult {
    min: number;
    max: number;
    confidence: number;
    trends: {
        yoy: number;
        qoq: number;
    };
}

// --- MOCK DATA ---
const TOP_10_ZONES: InvestmentZone[] = [
    { 
        id: 1, rank: 1, name: "Nyamata Aero-City", location: "Nyamata", district: "Bugesera", province: "Eastern", 
        type: "Mixed", roi: 18.5, risk: "Low", price_avg: 15000, price_min: 12000, price_max: 45000,
        growth_yoy: 22.4, growth_5y: 89.2, ai_score: 98, confidence: 96, listing_count: 124,
        demand_index: 94, supply_index: 32, infrastructure_score: 87,
        tags: ["Airport Proximity", "SEZ", "High Growth"]
    },
    { 
        id: 2, rank: 2, name: "Rebero Hillside", location: "Rebero", district: "Kicukiro", province: "Kigali City",
        type: "Residential", roi: 14.2, risk: "Medium", price_avg: 65000, price_min: 45000, price_max: 250000,
        growth_yoy: 15.1, growth_5y: 62.4, ai_score: 94, confidence: 92, listing_count: 87,
        demand_index: 88, supply_index: 45, infrastructure_score: 95,
        tags: ["Premium Views", "Diplomatic Zone", "Secure"]
    },
    { 
        id: 3, rank: 3, name: "Masoro SEZ", location: "Masoro", district: "Gasabo", province: "Kigali City",
        type: "Industrial", roi: 12.8, risk: "Low", price_avg: 45000, price_min: 35000, price_max: 85000,
        growth_yoy: 10.5, growth_5y: 45.2, ai_score: 91, confidence: 94, listing_count: 56,
        demand_index: 82, supply_index: 28, infrastructure_score: 92,
        tags: ["Special Economic Zone", "Tax Incentives", "Industrial"]
    },
    { 
        id: 4, rank: 4, name: "Kinyinya Green City", location: "Kinyinya", district: "Gasabo", province: "Kigali City",
        type: "Residential", roi: 11.5, risk: "Medium", price_avg: 55000, price_min: 40000, price_max: 180000,
        growth_yoy: 12.0, growth_5y: 48.5, ai_score: 89, confidence: 90, listing_count: 112,
        demand_index: 85, supply_index: 52, infrastructure_score: 88,
        tags: ["Eco-City", "Sustainable", "New Development"]
    },
    { 
        id: 5, rank: 5, name: "Kanombe Expansion", location: "Kanombe", district: "Kicukiro", province: "Kigali City",
        type: "Residential", roi: 9.8, risk: "Low", price_avg: 32000, price_min: 25000, price_max: 95000,
        growth_yoy: 8.5, growth_5y: 34.2, ai_score: 87, confidence: 91, listing_count: 203,
        demand_index: 79, supply_index: 48, infrastructure_score: 85,
        tags: ["Airport Zone", "Affordable", "Growing"]
    },
    { 
        id: 6, rank: 6, name: "Musanze Hub", location: "Musanze", district: "Musanze", province: "Northern",
        type: "Commercial", roi: 8.5, risk: "Medium", price_avg: 40000, price_min: 28000, price_max: 120000,
        growth_yoy: 7.2, growth_5y: 28.5, ai_score: 85, confidence: 87, listing_count: 67,
        demand_index: 73, supply_index: 55, infrastructure_score: 79,
        tags: ["Tourism Gateway", "Commercial Hub"]
    },
    { 
        id: 7, rank: 7, name: "Rubavu Waterfront", location: "Rubavu", district: "Rubavu", province: "Western",
        type: "Commercial", roi: 7.9, risk: "High", price_avg: 90000, price_min: 65000, price_max: 350000,
        growth_yoy: 6.5, growth_5y: 22.8, ai_score: 82, confidence: 78, listing_count: 34,
        demand_index: 68, supply_index: 72, infrastructure_score: 71,
        tags: ["Lake View", "Tourism", "Premium"]
    },
    { 
        id: 8, rank: 8, name: "Rwamagana Center", location: "Rwamagana", district: "Rwamagana", province: "Eastern",
        type: "Mixed", roi: 10.2, risk: "Low", price_avg: 12000, price_min: 8000, price_max: 35000,
        growth_yoy: 14.2, growth_5y: 52.1, ai_score: 80, confidence: 89, listing_count: 156,
        demand_index: 77, supply_index: 41, infrastructure_score: 74,
        tags: ["Regional Hub", "Affordable", "Growth"]
    },
    { 
        id: 9, rank: 9, name: "Huye University Node", location: "Huye", district: "Huye", province: "Southern",
        type: "Residential", roi: 6.5, risk: "Low", price_avg: 18000, price_min: 12000, price_max: 55000,
        growth_yoy: 5.1, growth_5y: 18.4, ai_score: 78, confidence: 92, listing_count: 98,
        demand_index: 69, supply_index: 38, infrastructure_score: 82,
        tags: ["University Town", "Student Housing", "Stable"]
    },
    { 
        id: 10, rank: 10, name: "Rusororo East", location: "Rusororo", district: "Gasabo", province: "Kigali City",
        type: "Residential", roi: 13.5, risk: "Medium", price_avg: 38000, price_min: 28000, price_max: 110000,
        growth_yoy: 11.8, growth_5y: 45.5, ai_score: 76, confidence: 83, listing_count: 145,
        demand_index: 81, supply_index: 57, infrastructure_score: 69,
        tags: ["Expansion Zone", "New Roads", "Value"]
    },
];

// Generate historical data (last 5 years, quarterly)
const generateHistoricalData = (baseValue: number, volatility: number): HistoricalDataPoint[] => {
    const data: HistoricalDataPoint[] = [];
    let currentValue = baseValue;
    
    for (let year = 2019; year <= 2024; year++) {
        for (let quarter = 1; quarter <= 4; quarter++) {
            if (year === 2024 && quarter > 2) continue;
            
            const change = (Math.random() - 0.3) * volatility;
            currentValue = Math.max(currentValue * (1 + change/100), baseValue * 0.5);
            
            data.push({
                year,
                quarter,
                value: Math.round(currentValue),
                volume: Math.floor(Math.random() * 50) + 20
            });
        }
    }
    return data;
};

// Prediction data (next 2 years)
const generatePredictions = (lastValue: number, trend: number): HistoricalDataPoint[] => {
    const predictions: HistoricalDataPoint[] = [];
    let currentValue = lastValue;
    
    for (let year = 2024; year <= 2025; year++) {
        for (let quarter = year === 2024 ? 3 : 1; quarter <= 4; quarter++) {
            if (year === 2025 && quarter > 2) continue;
            
            currentValue = currentValue * (1 + trend/100);
            
            predictions.push({
                year,
                quarter,
                value: Math.round(currentValue),
                volume: Math.floor(Math.random() * 60) + 30
            });
        }
    }
    return predictions;
};

const HISTORICAL_DATA = generateHistoricalData(100, 8);
const PREDICTION_DATA = generatePredictions(HISTORICAL_DATA[HISTORICAL_DATA.length - 1].value, 4.5);

// All zones for the modal (expanded)
const ALL_ZONES = [
    ...TOP_10_ZONES,
    { 
        id: 11, rank: 11, name: "Gishushu Central", location: "Gishushu", district: "Gasabo", province: "Kigali City",
        type: "Commercial", roi: 11.2, risk: "Medium", price_avg: 85000, price_min: 60000, price_max: 280000,
        growth_yoy: 9.8, growth_5y: 42.5, ai_score: 75, confidence: 82, listing_count: 89,
        demand_index: 84, supply_index: 62, infrastructure_score: 96,
        tags: ["CBD", "Commercial", "High Traffic"]
    },
    { 
        id: 12, rank: 12, name: "Kimironko Market", location: "Kimironko", district: "Gasabo", province: "Kigali City",
        type: "Commercial", roi: 10.5, risk: "Medium", price_avg: 72000, price_min: 50000, price_max: 190000,
        growth_yoy: 8.5, growth_5y: 35.2, ai_score: 73, confidence: 79, listing_count: 112,
        demand_index: 91, supply_index: 78, infrastructure_score: 85,
        tags: ["Retail", "High Traffic", "Market"]
    },
    { 
        id: 13, rank: 13, name: "Nyarutarama Golf", location: "Nyarutarama", district: "Gasabo", province: "Kigali City",
        type: "Residential", roi: 8.2, risk: "Low", price_avg: 180000, price_min: 120000, price_max: 550000,
        growth_yoy: 6.5, growth_5y: 28.1, ai_score: 88, confidence: 94, listing_count: 42,
        demand_index: 72, supply_index: 18, infrastructure_score: 98,
        tags: ["Luxury", "Golf Estate", "Exclusive"]
    },
    { 
        id: 14, rank: 14, name: "Bugesera Logistics", location: "Bugesera", district: "Bugesera", province: "Eastern",
        type: "Industrial", roi: 15.5, risk: "Medium", price_avg: 22000, price_min: 15000, price_max: 65000,
        growth_yoy: 18.2, growth_5y: 72.4, ai_score: 82, confidence: 80, listing_count: 67,
        demand_index: 88, supply_index: 45, infrastructure_score: 72,
        tags: ["Logistics", "Airport", "Warehousing"]
    },
    { 
        id: 15, rank: 15, name: "Muhazi Lakeside", location: "Muhazi", district: "Rwamagana", province: "Eastern",
        type: "Mixed", roi: 12.8, risk: "High", price_avg: 45000, price_min: 30000, price_max: 120000,
        growth_yoy: 14.5, growth_5y: 58.2, ai_score: 71, confidence: 68, listing_count: 53,
        demand_index: 79, supply_index: 71, infrastructure_score: 54,
        tags: ["Lake View", "Tourism", "Vacation"]
    },
];

// --- MAIN COMPONENT ---
export const MarketTrendsPage = () => {
    // State
    const [viewMode, setViewMode] = useState<'map' | 'analytics'>('analytics');
    const [selectedZone, setSelectedZone] = useState<InvestmentZone>(TOP_10_ZONES[0]);
    const [valuationParams, setValuationParams] = useState({
        location: "Kigali",
        size: 500,
        type: "Residential"
    });
    const [valuationResult, setValuationResult] = useState<ValuationResult | null>(null);
    const [isValuating, setIsValuating] = useState(false);
    const [showInvestModal, setShowInvestModal] = useState(false);
    const [showReportDrawer, setShowReportDrawer] = useState(false);
    const [searchZone, setSearchZone] = useState('');
    const [filterRisk, setFilterRisk] = useState('All');
    const [filterType, setFilterType] = useState('All');
    const [filterProvince, setFilterProvince] = useState('All');
    const [sortBy, setSortBy] = useState('rank');

    // Simulate valuation
    const runValuation = () => {
        setIsValuating(true);
        setTimeout(() => {
            const basePrice = selectedZone.price_avg * (valuationParams.size / 500);
            setValuationResult({
                min: Math.round(basePrice * 0.85),
                max: Math.round(basePrice * 1.15),
                confidence: selectedZone.confidence,
                trends: {
                    yoy: selectedZone.growth_yoy,
                    qoq: selectedZone.growth_yoy * 0.25
                }
            });
            setIsValuating(false);
        }, 1500);
    };

    // Filter Logic for Modal
    const filteredZones = ALL_ZONES.filter(z => 
        z.name.toLowerCase().includes(searchZone.toLowerCase()) &&
        (filterRisk === 'All' || z.risk === filterRisk) &&
        (filterType === 'All' || z.type === filterType) &&
        (filterProvince === 'All' || z.province === filterProvince)
    ).sort((a, b) => {
        if (sortBy === 'rank') return a.rank - b.rank;
        if (sortBy === 'roi') return b.roi - a.roi;
        if (sortBy === 'score') return b.ai_score - a.ai_score;
        if (sortBy === 'price') return a.price_avg - b.price_avg;
        return 0;
    });

    return (
        <>
            <Navbar isFixed={true} />
            <div className="min-h-screen bg-gray-50 dark:bg-[#050c1a] text-gray-900 dark:text-white font-sans flex flex-col transition-colors duration-300">
                
                {/* ================= HEADER ================= */}
                <header className="pt-28 pb-6 bg-white dark:bg-[#0a162e] border-b border-gray-200 dark:border-white/10 z-20">
                    <div className="w-11/12 mx-auto">
                        <div className="flex flex-col xl:flex-row justify-between items-end gap-8 mb-8">
                            <div>
                                <div className="flex items-center gap-3 text-primary font-bold mb-2">
                                    <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded text-[10px] font-mono border border-primary/30 text-primary">
                                        <Cpu size={12} />
                                        <span>AI_MODEL_V4.2</span>
                                    </div>
                                    <span className="uppercase tracking-widest text-xs font-bold text-gray-500 dark:text-blue-200/70">Predictive Analytics</span>
                                </div>
                                <h1 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white">
                                    AI Property <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">Valuation</span>
                                </h1>
                                <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-2xl">
                                    Machine learning models analyze historical data, market trends, and infrastructure projects to predict property values with 94% accuracy.
                                </p>
                            </div>
                            
                            {/* View Toggle */}
                            <div className="flex bg-gray-100 dark:bg-[#0f1f3a] p-1 rounded-xl border border-gray-200 dark:border-white/10">
                                <button 
                                    onClick={() => setViewMode('map')} 
                                    className={clsx(
                                        "px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all",
                                        viewMode === 'map' 
                                            ? "bg-primary text-white" 
                                            : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                    )}
                                >
                                    <MapIcon size={16}/> GIS Map
                                </button>
                                <button 
                                    onClick={() => setViewMode('analytics')} 
                                    className={clsx(
                                        "px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all",
                                        viewMode === 'analytics' 
                                            ? "bg-primary text-white" 
                                            : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                                    )}
                                >
                                    <Activity size={16}/> AI Valuation
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* ================= MAIN CONTENT ================= */}
                <div className="flex-1 overflow-auto">
                    <div className="w-11/12 mx-auto py-8">
                        
                        <AnimatePresence mode="wait">
                            {viewMode === 'map' ? (
                                <motion.div 
                                    key="map" 
                                    initial={{ opacity: 0 }} 
                                    animate={{ opacity: 1 }} 
                                    exit={{ opacity: 0 }} 
                                    className="grid grid-cols-1 lg:grid-cols-12 gap-6"
                                >
                                    {/* GIS Map Placeholder */}
                                    <div className="lg:col-span-8 bg-white dark:bg-[#0a162e] border border-gray-200 dark:border-white/10 rounded-2xl h-[600px] relative overflow-hidden">
                                        {/* Grid Background */}
                                        <div 
                                            className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
                                            style={{ 
                                                backgroundImage: 'linear-gradient(#395d91 1px, transparent 1px), linear-gradient(90deg, #395d91 1px, transparent 1px)',
                                                backgroundSize: '40px 40px'
                                            }}
                                        />
                                        
                                        {/* Center Message */}
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="text-center">
                                                <Globe size={48} className="text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                                                <p className="text-gray-500 dark:text-gray-400">Interactive GIS Map Loading...</p>
                                                <p className="text-xs text-gray-400 dark:text-gray-600 mt-2">Showing {ALL_ZONES.length} tracked zones</p>
                                            </div>
                                        </div>
                                        
                                        {/* Location Filter */}
                                        <div className="absolute top-4 left-4 bg-white dark:bg-[#0f1f3a] border border-gray-200 dark:border-white/10 rounded-xl p-4">
                                            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                                                <MapPin size={14} className="text-primary" />
                                                Current View
                                            </h3>
                                            <div className="space-y-2">
                                                <FilterSelect 
                                                    value="Kigali City" 
                                                    options={["Kigali City", "Eastern", "Northern", "Western", "Southern"]}
                                                    onChange={() => {}}
                                                />
                                                <FilterSelect 
                                                    value="Gasabo" 
                                                    options={["Gasabo", "Kicukiro", "Nyarugenge"]}
                                                    onChange={() => {}}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Panel - Zone List */}
                                    <div className="lg:col-span-4 bg-white dark:bg-[#0a162e] border border-gray-200 dark:border-white/10 rounded-2xl flex flex-col h-[600px]">
                                        <div className="p-4 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
                                            <h3 className="font-bold flex items-center gap-2">
                                                <Target size={16} className="text-primary" />
                                                Top Zones
                                            </h3>
                                            <button 
                                                onClick={() => setShowInvestModal(true)}
                                                className="text-xs text-primary font-bold hover:underline"
                                            >
                                                View All
                                            </button>
                                        </div>
                                        
                                        <div className="flex-1 overflow-y-auto">
                                            {TOP_10_ZONES.map((zone) => (
                                                <button
                                                    key={zone.id}
                                                    onClick={() => setSelectedZone(zone as InvestmentZone)}
                                                    className={clsx(
                                                        "w-full p-4 text-left border-b border-gray-100 dark:border-white/5 last:border-0 transition-colors",
                                                        selectedZone.id === zone.id 
                                                            ? "bg-primary/5" 
                                                            : "hover:bg-gray-50 dark:hover:bg-white/5"
                                                    )}
                                                >
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="text-xs text-gray-500">#{zone.rank}</span>
                                                        <span className={clsx(
                                                            "text-[10px] px-1.5 py-0.5 rounded",
                                                            zone.risk === 'Low' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                                                            zone.risk === 'Medium' ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' :
                                                            'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                                                        )}>
                                                            {zone.risk} Risk
                                                        </span>
                                                    </div>
                                                    <h4 className="font-bold text-sm mb-0.5">{zone.name}</h4>
                                                    <p className="text-xs text-gray-500 mb-2">{zone.location}, {zone.district}</p>
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="text-gray-500">ROI</span>
                                                        <span className="font-bold text-green-600 dark:text-green-400">+{zone.roi}%</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs mt-1">
                                                        <span className="text-gray-500">AI Score</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold">{zone.ai_score}</span>
                                                            <div className="w-16 h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                                                                <div className="h-full bg-primary" style={{ width: `${zone.ai_score}%` }} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="analytics" 
                                    initial={{ opacity: 0 }} 
                                    animate={{ opacity: 1 }} 
                                    exit={{ opacity: 0 }}
                                    className="space-y-8"
                                >
                                    {/* AI Valuation Engine */}
                                    <section>
                                        <div className="flex items-center justify-between mb-6">
                                            <div>
                                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                                    <BrainIcon className="text-primary" /> AI Valuation Engine
                                                </h2>
                                                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                                                    Neural network analysis of {HISTORICAL_DATA.length} historical data points | Confidence: {selectedZone.confidence}%
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                            {/* Chart */}
                                            <div className="lg:col-span-2 bg-white dark:bg-[#0a162e] border border-gray-200 dark:border-white/10 rounded-2xl p-6">
                                                <div className="h-[300px] relative flex items-end gap-1">
                                                    {/* Historical Data */}
                                                    {HISTORICAL_DATA.map((point, i) => {
                                                        const maxValue = Math.max(...HISTORICAL_DATA.map(d => d.value), ...PREDICTION_DATA.map(d => d.value));
                                                        const height = (point.value / maxValue) * 200;
                                                        return (
                                                            <div key={`hist-${i}`} className="flex-1 min-w-[8px] group relative">
                                                                <motion.div 
                                                                    initial={{ height: 0 }}
                                                                    animate={{ height }}
                                                                    transition={{ delay: i * 0.02 }}
                                                                    className="w-full bg-primary/30 hover:bg-primary/50 transition-colors"
                                                                />
                                                                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap z-10">
                                                                    Q{point.quarter} {point.year}: {point.value.toLocaleString()} RWF
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    
                                                    {/* Prediction Data */}
                                                    {PREDICTION_DATA.map((point, i) => {
                                                        const maxValue = Math.max(...HISTORICAL_DATA.map(d => d.value), ...PREDICTION_DATA.map(d => d.value));
                                                        const height = (point.value / maxValue) * 200;
                                                        return (
                                                            <div key={`pred-${i}`} className="flex-1 min-w-[8px] group relative">
                                                                <motion.div 
                                                                    initial={{ height: 0 }}
                                                                    animate={{ height }}
                                                                    transition={{ delay: 0.5 + (i * 0.05) }}
                                                                    className="w-full bg-green-500/50 border-t-2 border-green-500 border-dashed hover:bg-green-500/70 transition-colors"
                                                                />
                                                                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap z-10">
                                                                    Forecast: {point.value.toLocaleString()} RWF
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    
                                                    {/* X-Axis Labels */}
                                                    <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-[8px] text-gray-400">
                                                        <span>2019</span>
                                                        <span>2020</span>
                                                        <span>2021</span>
                                                        <span>2022</span>
                                                        <span>2023</span>
                                                        <span>2024</span>
                                                        <span className="text-green-500 font-bold">2025</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="mt-8 flex items-center justify-center gap-6 text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 bg-primary/30" />
                                                        <span className="text-gray-500 dark:text-gray-400">Historical</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-3 h-3 bg-green-500/50 border-t-2 border-green-500 border-dashed" />
                                                        <span className="text-gray-500 dark:text-gray-400">AI Prediction</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Valuation Form */}
                                            <div className="bg-white dark:bg-[#0a162e] border border-gray-200 dark:border-white/10 rounded-2xl p-6">
                                                <h3 className="font-bold mb-4">Property Valuation</h3>
                                                
                                                <div className="space-y-4 mb-6">
                                                    <div>
                                                        <label className="text-xs text-gray-500 mb-1 block">Location</label>
                                                        <select 
                                                            value={selectedZone.id}
                                                            onChange={(e) => {
                                                                const zone = ALL_ZONES.find(z => z.id === parseInt(e.target.value));
                                                                if (zone) setSelectedZone(zone as InvestmentZone);
                                                            }}
                                                            className="w-full bg-gray-50 dark:bg-[#0f1f3a] border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary outline-none"
                                                        >
                                                            {ALL_ZONES.map(zone => (
                                                                <option key={zone.id} value={zone.id}>{zone.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    
                                                    <div>
                                                        <label className="text-xs text-gray-500 mb-1 block">Land Size (m²)</label>
                                                        <input 
                                                            type="number"
                                                            value={valuationParams.size}
                                                            onChange={(e) => setValuationParams({...valuationParams, size: parseInt(e.target.value) || 0})}
                                                            className="w-full bg-gray-50 dark:bg-[#0f1f3a] border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary outline-none"
                                                        />
                                                    </div>
                                                    
                                                    <div>
                                                        <label className="text-xs text-gray-500 mb-1 block">Property Type</label>
                                                        <select 
                                                            value={valuationParams.type}
                                                            onChange={(e) => setValuationParams({...valuationParams, type: e.target.value})}
                                                            className="w-full bg-gray-50 dark:bg-[#0f1f3a] border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm focus:border-primary outline-none"
                                                        >
                                                            <option>Residential</option>
                                                            <option>Commercial</option>
                                                            <option>Industrial</option>
                                                            <option>Agricultural</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={runValuation}
                                                    disabled={isValuating}
                                                    className="w-full bg-primary text-white rounded-lg py-3 font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                >
                                                    {isValuating ? (
                                                        <>
                                                            <ScanLine size={16} className="animate-spin" />
                                                            Analyzing...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Zap size={16} />
                                                            Run AI Valuation
                                                        </>
                                                    )}
                                                </button>

                                                {valuationResult && (
                                                    <motion.div 
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="mt-6 pt-6 border-t border-gray-200 dark:border-white/10"
                                                    >
                                                        <h4 className="text-sm font-bold mb-3">Valuation Result</h4>
                                                        <div className="bg-gray-50 dark:bg-[#0f1f3a] rounded-lg p-4 space-y-3">
                                                            <div className="flex justify-between">
                                                                <span className="text-xs text-gray-500">Estimated Range</span>
                                                                <span className="text-sm font-bold">
                                                                    {valuationResult.min.toLocaleString()} - {valuationResult.max.toLocaleString()} RWF
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-xs text-gray-500">Confidence</span>
                                                                <span className="text-sm font-bold text-green-600 dark:text-green-400">
                                                                    {valuationResult.confidence}%
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-xs text-gray-500">YoY Growth</span>
                                                                <span className="text-sm font-bold text-primary">
                                                                    +{valuationResult.trends.yoy}%
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </div>
                                        </div>
                                    </section>

                                    {/* Market Sentiment & Key Metrics */}
                                    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Sentiment Analysis */}
                                        <div className="bg-white dark:bg-[#0a162e] border border-gray-200 dark:border-white/10 rounded-2xl p-6">
                                            <h3 className="font-bold mb-6 flex items-center gap-2">
                                                <Activity size={18} className="text-primary" />
                                                Market Sentiment - {selectedZone.name}
                                            </h3>
                                            
                                            <div className="space-y-4">
                                                <SentimentBar 
                                                    label="Demand Index" 
                                                    value={selectedZone.demand_index} 
                                                    color="bg-green-500"
                                                />
                                                <SentimentBar 
                                                    label="Supply Index" 
                                                    value={selectedZone.supply_index} 
                                                    color="bg-amber-500"
                                                />
                                                <SentimentBar 
                                                    label="Infrastructure Score" 
                                                    value={selectedZone.infrastructure_score} 
                                                    color="bg-primary"
                                                />
                                            </div>
                                            
                                            <div className="mt-6 grid grid-cols-3 gap-2 text-center">
                                                <div className="bg-gray-50 dark:bg-[#0f1f3a] p-3 rounded-lg">
                                                    <p className="text-[10px] text-gray-500 mb-1">Listings</p>
                                                    <p className="font-bold">{selectedZone.listing_count}</p>
                                                </div>
                                                <div className="bg-gray-50 dark:bg-[#0f1f3a] p-3 rounded-lg">
                                                    <p className="text-[10px] text-gray-500 mb-1">Avg Price</p>
                                                    <p className="font-bold">{selectedZone.price_avg.toLocaleString()}</p>
                                                </div>
                                                <div className="bg-gray-50 dark:bg-[#0f1f3a] p-3 rounded-lg">
                                                    <p className="text-[10px] text-gray-500 mb-1">5Y Growth</p>
                                                    <p className="font-bold text-green-600 dark:text-green-400">+{selectedZone.growth_5y}%</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Key Tags & Investment Thesis */}
                                        <div className="bg-white dark:bg-[#0a162e] border border-gray-200 dark:border-white/10 rounded-2xl p-6">
                                            <h3 className="font-bold mb-4 flex items-center gap-2">
                                                <Target size={18} className="text-primary" />
                                                Investment Thesis
                                            </h3>
                                            
                                            <div className="flex flex-wrap gap-2 mb-6">
                                                {selectedZone.tags.map((tag, i) => (
                                                    <span key={i} className="px-2 py-1 bg-gray-100 dark:bg-white/5 rounded text-[10px] font-bold">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                            
                                            <div className="space-y-3">
                                                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-white/5">
                                                    <span className="text-xs text-gray-500">Price Range</span>
                                                    <span className="text-sm font-mono">
                                                        {selectedZone.price_min.toLocaleString()} - {selectedZone.price_max.toLocaleString()} RWF
                                                    </span>
                                                </div>
                                                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-white/5">
                                                    <span className="text-xs text-gray-500">Projected ROI</span>
                                                    <span className="text-sm font-bold text-green-600 dark:text-green-400">+{selectedZone.roi}%</span>
                                                </div>
                                                <div className="flex justify-between py-2">
                                                    <span className="text-xs text-gray-500">Risk Level</span>
                                                    <span className={clsx(
                                                        "text-sm font-bold",
                                                        selectedZone.risk === 'Low' ? 'text-green-600 dark:text-green-400' :
                                                        selectedZone.risk === 'Medium' ? 'text-amber-600 dark:text-amber-400' :
                                                        'text-red-600 dark:text-red-400'
                                                    )}>
                                                        {selectedZone.risk}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <button className="w-full mt-6 py-3 border border-gray-200 dark:border-white/10 rounded-lg text-sm font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
                                                <Download size={16} />
                                                Download Full Report
                                            </button>
                                        </div>
                                    </section>

                                    {/* Top 10 List Preview */}
                                    <section>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-xl font-bold">Top Investment Zones</h3>
                                            <button 
                                                onClick={() => setShowInvestModal(true)}
                                                className="text-primary font-bold text-sm hover:underline flex items-center gap-1"
                                            >
                                                View All <ArrowUpRight size={14} />
                                            </button>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                            {TOP_10_ZONES.slice(0, 5).map((zone) => (
                                                <div 
                                                    key={zone.id}
                                                    onClick={() => setSelectedZone(zone)}
                                                    className="bg-white dark:bg-[#0a162e] border border-gray-200 dark:border-white/10 rounded-xl p-4 cursor-pointer hover:border-primary transition-colors"
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-xs text-gray-500">#{zone.rank}</span>
                                                        <span className={clsx(
                                                            "text-[8px] px-1.5 py-0.5 rounded",
                                                            zone.risk === 'Low' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                                                            zone.risk === 'Medium' ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' :
                                                            'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                                                        )}>
                                                            {zone.risk}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-bold text-sm mb-1">{zone.name}</h4>
                                                    <p className="text-xs text-gray-500 mb-3">{zone.location}</p>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs text-gray-500">ROI</span>
                                                        <span className="text-sm font-bold text-green-600 dark:text-green-400">+{zone.roi}%</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* ================= MODAL: ALL INVESTMENT ZONES ================= */}
                <AnimatePresence>
                    {showInvestModal && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                            <motion.div 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                exit={{ opacity: 0 }}
                                onClick={() => setShowInvestModal(false)}
                                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            />
                            <motion.div 
                                initial={{ scale: 0.95, opacity: 0 }} 
                                animate={{ scale: 1, opacity: 1 }} 
                                exit={{ scale: 0.95, opacity: 0 }}
                                className="relative w-full max-w-6xl bg-white dark:bg-[#0f1f3a] rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[85vh]"
                            >
                                {/* Modal Header */}
                                <div className="p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
                                    <div>
                                        <h2 className="text-2xl font-bold flex items-center gap-2">
                                            <Target className="text-primary" /> Investment Hotspots
                                        </h2>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            AI-ranked zones by projected ROI and development indicators
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => setShowInvestModal(false)}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* Modal Filters */}
                                <div className="p-4 border-b border-gray-200 dark:border-white/10 flex flex-wrap gap-3">
                                    <div className="relative flex-1 min-w-[200px]">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input 
                                            type="text" 
                                            placeholder="Search by name or location..."
                                            value={searchZone}
                                            onChange={(e) => setSearchZone(e.target.value)}
                                            className="w-full bg-gray-50 dark:bg-[#0a162e] border border-gray-200 dark:border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm focus:border-primary outline-none"
                                        />
                                    </div>
                                    
                                    <FilterSelect 
                                        value={filterRisk}
                                        options={["All", "Low", "Medium", "High"]}
                                        onChange={setFilterRisk}
                                    />
                                    
                                    <FilterSelect 
                                        value={filterType}
                                        options={["All", "Residential", "Commercial", "Industrial", "Mixed", "Agricultural"]}
                                        onChange={setFilterType}
                                    />
                                    
                                    <FilterSelect 
                                        value={filterProvince}
                                        options={["All", "Kigali City", "Eastern", "Northern", "Western", "Southern"]}
                                        onChange={setFilterProvince}
                                    />
                                    
                                    <FilterSelect 
                                        value={sortBy}
                                        options={[
                                            { value: 'rank', label: 'Rank' },
                                            { value: 'roi', label: 'ROI' },
                                            { value: 'score', label: 'AI Score' },
                                            { value: 'price', label: 'Price' }
                                        ]}
                                        onChange={setSortBy}
                                    />
                                </div>

                                {/* Modal Table */}
                                <div className="flex-1 overflow-y-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50 dark:bg-[#0a162e] text-xs font-bold text-gray-500 uppercase sticky top-0 z-10">
                                            <tr>
                                                <th className="p-4">Rank</th>
                                                <th className="p-4">Zone</th>
                                                <th className="p-4">Location</th>
                                                <th className="p-4">Type</th>
                                                <th className="p-4">Avg Price</th>
                                                <th className="p-4">ROI</th>
                                                <th className="p-4">YoY Growth</th>
                                                <th className="p-4">Risk</th>
                                                <th className="p-4">AI Score</th>
                                                <th className="p-4"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                            {filteredZones.map((zone) => (
                                                <tr key={zone.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                    <td className="p-4 font-bold">#{zone.rank}</td>
                                                    <td className="p-4">
                                                        <div className="font-bold">{zone.name}</div>
                                                        <div className="text-xs text-gray-500">{zone.tags.slice(0, 2).join(' • ')}</div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div>{zone.location}</div>
                                                        <div className="text-xs text-gray-500">{zone.district}</div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="px-2 py-1 bg-gray-100 dark:bg-white/5 rounded text-xs">
                                                            {zone.type}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 font-mono">{zone.price_avg.toLocaleString()} RWF</td>
                                                    <td className="p-4 text-green-600 dark:text-green-400 font-bold">+{zone.roi}%</td>
                                                    <td className="p-4 text-primary font-bold">+{zone.growth_yoy}%</td>
                                                    <td className="p-4">
                                                        <span className={clsx(
                                                            "text-xs font-bold px-2 py-1 rounded",
                                                            zone.risk === 'Low' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                                                            zone.risk === 'Medium' ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' :
                                                            'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                                                        )}>
                                                            {zone.risk}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold">{zone.ai_score}</span>
                                                            <div className="w-12 h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                                                                <div className="h-full bg-primary" style={{ width: `${zone.ai_score}%` }} />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <button 
                                                            onClick={() => {
                                                                setSelectedZone(zone as InvestmentZone);
                                                                setShowInvestModal(false);
                                                            }}
                                                            className="p-1 hover:bg-primary/10 text-primary rounded transition-colors"
                                                        >
                                                            <ArrowUpRight size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    
                                    {filteredZones.length === 0 && (
                                        <div className="p-8 text-center text-gray-500">
                                            No zones match your filters
                                        </div>
                                    )}
                                </div>
                                
                                {/* Modal Footer */}
                                <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0a162e] flex justify-between items-center text-xs text-gray-500">
                                    <span>Showing {filteredZones.length} of {ALL_ZONES.length} zones</span>
                                    <button className="flex items-center gap-2 hover:text-primary transition-colors">
                                        <Download size={14} />
                                        Export CSV
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* ================= REPORT DRAWER ================= */}
                <AnimatePresence>
                    {showReportDrawer && (
                        <>
                            <motion.div 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                exit={{ opacity: 0 }} 
                                onClick={() => setShowReportDrawer(false)} 
                                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70]"
                            />
                            <motion.div 
                                initial={{ y: "100%" }} 
                                animate={{ y: 0 }} 
                                exit={{ y: "100%" }} 
                                transition={{ type: "spring", damping: 25, stiffness: 200 }} 
                                className="fixed bottom-0 left-0 right-0 h-[70vh] bg-white dark:bg-[#0f1f3a] rounded-t-[24px] border-t border-gray-200 dark:border-white/10 z-[80] p-6 flex flex-col"
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold flex items-center gap-2">
                                        <FileText className="text-primary" /> Live Intelligence Report
                                    </h2>
                                    <button onClick={() => setShowReportDrawer(false)}>
                                        <X className="text-gray-400 hover:text-gray-600 dark:hover:text-white" />
                                    </button>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto space-y-6">
                                    <div className="p-6 bg-gray-50 dark:bg-[#0a162e] rounded-xl border-l-4 border-primary">
                                        <h3 className="font-bold mb-2">Executive Summary</h3>
                                        <p className="text-gray-600 dark:text-gray-400">
                                            The {selectedZone.name} area in {selectedZone.district} shows strong growth potential 
                                            with {selectedZone.growth_yoy}% YoY increase. AI models predict continued appreciation 
                                            driven by infrastructure projects and demand-supply dynamics.
                                        </p>
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="bg-gray-50 dark:bg-[#0a162e] p-4 rounded-xl text-center">
                                            <p className="text-xs text-gray-500 mb-1">Market Cap</p>
                                            <p className="text-xl font-bold">{(selectedZone.price_avg * selectedZone.listing_count).toLocaleString()} RWF</p>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-[#0a162e] p-4 rounded-xl text-center">
                                            <p className="text-xs text-gray-500 mb-1">Active Listings</p>
                                            <p className="text-xl font-bold">{selectedZone.listing_count}</p>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-[#0a162e] p-4 rounded-xl text-center">
                                            <p className="text-xs text-gray-500 mb-1">Confidence</p>
                                            <p className="text-xl font-bold text-green-600 dark:text-green-400">{selectedZone.confidence}%</p>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <h4 className="font-bold mb-2">Strengths</h4>
                                            <ul className="space-y-2">
                                                <li className="flex items-center gap-2 text-sm">
                                                    <CheckCircle2 size={14} className="text-green-500" />
                                                    High infrastructure investment
                                                </li>
                                                <li className="flex items-center gap-2 text-sm">
                                                    <CheckCircle2 size={14} className="text-green-500" />
                                                    Strong demand growth
                                                </li>
                                                <li className="flex items-center gap-2 text-sm">
                                                    <CheckCircle2 size={14} className="text-green-500" />
                                                    Government development zone
                                                </li>
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="font-bold mb-2">Risks</h4>
                                            <ul className="space-y-2">
                                                <li className="flex items-center gap-2 text-sm">
                                                    <AlertCircle size={14} className="text-amber-500" />
                                                    Supply constraints
                                                </li>
                                                <li className="flex items-center gap-2 text-sm">
                                                    <AlertCircle size={14} className="text-amber-500" />
                                                    Infrastructure timeline
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
            <Footer />
        </>
    );
};

// ================= SUB-COMPONENTS =================

interface FilterSelectProps {
    value: string;
    options: Array<string | { value: string; label: string }>;
    onChange: (value: string) => void;
}

const FilterSelect = ({ value, options, onChange }: FilterSelectProps) => (
    <div className="relative">
        <select 
            value={value} 
            onChange={(e) => onChange(e.target.value)}
            className="appearance-none bg-gray-50 dark:bg-[#0a162e] text-sm border border-gray-200 dark:border-white/10 rounded-lg pl-3 pr-8 py-2 focus:border-primary outline-none cursor-pointer min-w-[120px]"
        >
            {options.map((opt: any) => {
                if (typeof opt === 'string') {
                    return <option key={opt} value={opt}>{opt}</option>;
                }
                return <option key={opt.value} value={opt.value}>{opt.label}</option>;
            })}
        </select>
        <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
);

interface SentimentBarProps {
    label: string;
    value: number;
    color: string;
}

const SentimentBar = ({ label, value, color }: SentimentBarProps) => (
    <div>
        <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">{label}</span>
            <span className="font-bold">{value}%</span>
        </div>
        <div className="h-1.5 w-full bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
            <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${value}%` }}
                transition={{ duration: 1 }}
                className={`h-full ${color}`}
            />
        </div>
    </div>
);

const BrainIcon = ({ className }: { className?: string }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
        <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
    </svg>
);