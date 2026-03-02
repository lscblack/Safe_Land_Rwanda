import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
    ShieldCheck, Map, ScanLine, Database, 
    ArrowRight, Lock, CheckCircle2, AlertTriangle, 
    Building2, Briefcase, UserCheck, Layers, 
    ChevronRight, ChevronDown, Cpu, Crosshair,
    X
} from 'lucide-react';
import { clsx } from 'clsx';
import { Navbar } from '../components/navigation/Navbar';
import { Footer } from '../components/navigation/FooterAll';

export const GeoGuardLanding = () => {
    const [activeStakeholder, setActiveStakeholder] = useState<'bank' | 'buyer' | 'owner'>('bank');

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#050c1a] text-slate-900 dark:text-white font-sans transition-colors duration-300">
            <Navbar isFixed={true} />

            {/* ================= 1. HERO SECTION ================= */}
            <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 bg-white dark:bg-[#0a162e] border-b border-gray-200 dark:border-white/10 overflow-hidden">
                {/* Tech Grid Background */}
                <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" 
                    style={{ backgroundImage: 'linear-gradient(#395d91 1px, transparent 1px), linear-gradient(90deg, #395d91 1px, transparent 1px)', backgroundSize: '50px 50px' }} 
                />

                <div className="w-11/12 max-w-[1400px] mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div>
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#395d91]/30 bg-[#395d91]/10 text-[#395d91] dark:text-blue-300 text-xs font-bold uppercase tracking-widest mb-6"
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#395d91] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#395d91]"></span>
                            </span>
                            GeoGuard System Online
                        </motion.div>
                        
                        <motion.h1 
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                            className="text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 dark:text-white mb-6 leading-[1.1]"
                        >
                            The Digital <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#395d91] to-blue-400">Source of Truth.</span>
                        </motion.h1>
                        
                        <motion.p 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                            className="text-lg text-gray-600 dark:text-gray-400 max-w-xl font-light leading-relaxed mb-8"
                        >
                            AI-Powered Land Boundary Verification & Urban Intelligence System. We combine OCR, Real-time APIs, and GIS to eliminate document forgery and resolve boundary disputes in seconds.
                        </motion.p>

                        <motion.div 
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                            className="flex flex-col sm:flex-row gap-4"
                        >
                            <button className="px-8 py-4 bg-[#395d91] hover:bg-[#2d4a75] text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 group border border-transparent">
                                <ScanLine size={20} /> Verify Document
                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/>
                            </button>
                            <button className="px-8 py-4 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/10 text-slate-900 dark:text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2">
                                <Map size={20} /> Explore GIS Map
                            </button>
                        </motion.div>
                    </div>

                    {/* Hero Visual Abstract */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
                        className="relative h-[500px] bg-gray-50 dark:bg-[#050c1a] border border-gray-200 dark:border-white/10 rounded-[32px] overflow-hidden flex items-center justify-center"
                    >
                        <div className="absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/Kigali_OpenStreetMap.png')] bg-cover bg-center opacity-20 dark:opacity-30 filter grayscale"></div>
                        
                        {/* Scanning Animation Element */}
                        <div className="relative z-10 w-64 h-80 border-2 border-[#395d91] bg-white/80 dark:bg-[#0a162e]/80 backdrop-blur-md rounded-xl p-4 flex flex-col justify-between">
                            <div className="w-full h-1 bg-[#395d91]/30 rounded-full mb-4 overflow-hidden">
                                <motion.div 
                                    animate={{ x: ["-100%", "200%"] }} 
                                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                    className="w-1/2 h-full bg-[#395d91]"
                                />
                            </div>
                            <div className="space-y-3">
                                <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-3/4"></div>
                                <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-1/2"></div>
                                <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-5/6"></div>
                            </div>
                            <div className="mt-auto pt-4 border-t border-gray-200 dark:border-white/10 flex items-center justify-between">
                                <span className="text-[10px] font-mono text-gray-500 uppercase">Status</span>
                                <span className="text-xs font-bold text-green-500 flex items-center gap-1"><CheckCircle2 size={12}/> Verified</span>
                            </div>
                        </div>

                        {/* Floating Badges */}
                        <div className="absolute top-12 right-12 bg-white dark:bg-[#0a162e] border border-gray-200 dark:border-white/10 px-4 py-2 rounded-lg flex items-center gap-2">
                            <Database size={16} className="text-[#395d91]"/>
                            <span className="text-xs font-bold text-slate-900 dark:text-white">Registry Sync</span>
                        </div>
                        <div className="absolute bottom-20 left-8 bg-white dark:bg-[#0a162e] border border-gray-200 dark:border-white/10 px-4 py-2 rounded-lg flex items-center gap-2">
                            <Crosshair size={16} className="text-green-500"/>
                            <span className="text-xs font-bold text-slate-900 dark:text-white">Boundary Match</span>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ================= 2. THE TRIPLE-CHECK METHOD ================= */}
            <section className="py-24 bg-gray-50 dark:bg-[#050c1a]">
                <div className="w-11/12 max-w-[1400px] mx-auto">
                    <div className="text-center mb-16 max-w-3xl mx-auto">
                        <h2 className="text-sm font-bold text-[#395d91] uppercase tracking-widest mb-2">Core Technology</h2>
                        <h3 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">The "Triple-Check" Process</h3>
                        <p className="text-gray-600 dark:text-gray-400">We cross-reference every land asset across three distinct data dimensions to guarantee absolute authenticity and physical accuracy.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <ProcessCard 
                            number="01"
                            title="Computer Vision (OCR)"
                            desc="Upload physical paper titles. Our AI instantly extracts UPIs, owner details, and dimensions, converting analog data into structured digital formats."
                            icon={ScanLine}
                        />
                        <ProcessCard 
                            number="02"
                            title="Real-Time API Sync"
                            desc="Extracted data is instantly queried against the National Land Registry to ensure the paper document hasn't been forged, altered, or revoked."
                            icon={Cpu}
                        />
                        <ProcessCard 
                            number="03"
                            title="Geospatial Intel (GIS)"
                            desc="We map the verified coordinates onto satellite grids to visually confirm that the legal boundaries match the physical reality on the ground."
                            icon={Layers}
                        />
                    </div>
                </div>
            </section>

            {/* ================= 3. PROBLEM VS SOLUTION ================= */}
            <section className="py-24 bg-white dark:bg-[#0a162e] border-y border-gray-200 dark:border-white/10">
                <div className="w-11/12 max-w-[1400px] mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        
                        {/* The Problem */}
                        <div className="p-8 md:p-12 bg-red-50 dark:bg-red-900/5 border border-red-200 dark:border-red-900/30 rounded-3xl">
                            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-xl flex items-center justify-center mb-6">
                                <AlertTriangle size={24} />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">The Critical Challenge</h3>
                            <p className="text-gray-700 dark:text-gray-300 mb-8 leading-relaxed">
                                In many regions, land administration is plagued by manual processes. Conflicting paperwork, sophisticated document forgery, and unclear physical boundaries cause disputes that take years and millions in legal fees to settle.
                            </p>
                            <ul className="space-y-4">
                                <ListItem icon={X} color="text-red-500" text="Fraudulent land sales using fake physical titles." />
                                <ListItem icon={X} color="text-red-500" text="Boundary overlaps causing neighbor disputes." />
                                <ListItem icon={X} color="text-red-500" text="Months-long delays in bank mortgage approvals." />
                            </ul>
                        </div>

                        {/* The Solution */}
                        <div className="p-8 md:p-12 bg-green-50 dark:bg-green-900/5 border border-green-200 dark:border-green-900/30 rounded-3xl">
                            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 text-green-600 rounded-xl flex items-center justify-center mb-6">
                                <ShieldCheck size={24} />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">The GeoGuard Solution</h3>
                            <p className="text-gray-700 dark:text-gray-300 mb-8 leading-relaxed">
                                By digitizing the verification process, GeoGuard acts as an immutable arbiter. We validate the paperwork, confirm with the government, and map the physics—all in a matter of seconds.
                            </p>
                            <ul className="space-y-4">
                                <ListItem icon={CheckCircle2} color="text-green-500" text="Instant verification of physical title deeds via AI." />
                                <ListItem icon={CheckCircle2} color="text-green-500" text="Visual GIS confirmation of exact land borders." />
                                <ListItem icon={CheckCircle2} color="text-green-500" text="Reduction of legal costs and elimination of fraud." />
                            </ul>
                        </div>

                    </div>
                </div>
            </section>

            {/* ================= 4. STAKEHOLDER BENEFITS ================= */}
            <section className="py-24 bg-gray-50 dark:bg-[#050c1a]">
                <div className="w-11/12 max-w-[1400px] mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Built for the Entire Ecosystem</h2>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Vertical Tabs */}
                        <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 lg:w-1/4 shrink-0">
                            <StakeholderTab 
                                id="bank" active={activeStakeholder} onClick={setActiveStakeholder}
                                icon={Building2} label="Banks & Lenders"
                            />
                            <StakeholderTab 
                                id="buyer" active={activeStakeholder} onClick={setActiveStakeholder}
                                icon={Briefcase} label="Investors & Buyers"
                            />
                            <StakeholderTab 
                                id="owner" active={activeStakeholder} onClick={setActiveStakeholder}
                                icon={UserCheck} label="Landowners"
                            />
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 bg-white dark:bg-[#0a162e] border border-gray-200 dark:border-white/10 rounded-3xl p-8 md:p-12">
                            <AnimatePresence mode="wait">
                                {activeStakeholder === 'bank' && (
                                    <StakeholderContent 
                                        key="bank"
                                        title="De-risk Mortgage Lending"
                                        desc="Banks require absolute certainty before issuing land-backed loans. GeoGuard allows loan officers to instantly verify that the collateral exists, is unencumbered, and matches the valuation documents perfectly."
                                        points={["Zero collateral fraud", "Reduce approval time from weeks to minutes", "Automated compliance checks"]}
                                    />
                                )}
                                {activeStakeholder === 'buyer' && (
                                    <StakeholderContent 
                                        key="buyer"
                                        title="Invest with Total Confidence"
                                        desc="Never buy disputed land again. Buyers and foreign investors can independently verify the exact boundaries and legal status of a parcel before transferring any funds."
                                        points={["Prevent buying 'air' or overlap parcels", "Independent verification without middlemen", "Access historical zoning data"]}
                                    />
                                )}
                                {activeStakeholder === 'owner' && (
                                    <StakeholderContent 
                                        key="owner"
                                        title="Protect Your Greatest Asset"
                                        desc="Landowners can secure their property against illegal transfers and encroachments. Register your boundaries digitally to create a permanent, undisputed record."
                                        points={["Proof of authentic ownership", "Resolve neighbor disputes easily", "Increase property liquidity and value"]}
                                    />
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </section>

            {/* ================= 5. CTA SECTION ================= */}
            <section className="py-24 bg-[#0a162e] relative overflow-hidden">
                <div className="absolute inset-0 opacity-20 pointer-events-none" 
                    style={{ backgroundImage: 'radial-gradient(#395d91 2px, transparent 2px)', backgroundSize: '30px 30px' }} 
                />
                <div className="w-11/12 max-w-[800px] mx-auto text-center relative z-10">
                    <Lock size={48} className="text-[#395d91] mx-auto mb-6" />
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Secure Your Land Assets Today.</h2>
                    <p className="text-xl text-gray-400 mb-10 font-light">
                        Join the future of secure, transparent, and instant land administration. Experience the power of the Triple-Check verification system.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <button className="px-8 py-4 bg-[#395d91] hover:bg-[#2d4a75] text-white font-bold rounded-xl transition-colors">
                            Launch GeoGuard App
                        </button>
                        <button className="px-8 py-4 bg-transparent border border-white/20 hover:bg-white/5 text-white font-bold rounded-xl transition-colors">
                            Request API Access
                        </button>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

// --- SUB-COMPONENTS ---

const ProcessCard = ({ number, title, desc, icon: Icon }: any) => (
    <div className="bg-white dark:bg-[#0a162e] border border-gray-200 dark:border-white/10 p-8 rounded-3xl flex flex-col h-full hover:border-[#395d91] dark:hover:border-[#395d91] transition-colors">
        <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 bg-blue-50 dark:bg-white/5 text-[#395d91] dark:text-white rounded-xl flex items-center justify-center">
                <Icon size={24} />
            </div>
            <span className="text-4xl font-black text-gray-100 dark:text-white/5">{number}</span>
        </div>
        <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{title}</h4>
        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{desc}</p>
    </div>
);

const ListItem = ({ icon: Icon, color, text }: any) => (
    <li className="flex items-start gap-3">
        <Icon size={20} className={clsx("shrink-0 mt-0.5", color)} />
        <span className="text-gray-800 dark:text-gray-200">{text}</span>
    </li>
);

const StakeholderTab = ({ id, active, onClick, icon: Icon, label }: any) => (
    <button 
        onClick={() => onClick(id)}
        className={clsx(
            "flex items-center gap-3 px-6 py-4 rounded-xl font-bold text-left transition-colors whitespace-nowrap border",
            active === id 
                ? "bg-[#395d91] text-white border-[#395d91]" 
                : "bg-white dark:bg-[#0a162e] text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 border-gray-200 dark:border-white/10"
        )}
    >
        <Icon size={20} />
        {label}
    </button>
);

const StakeholderContent = ({ title, desc, points }: any) => (
    <motion.div 
        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
        className="flex flex-col h-full justify-center"
    >
        <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">{title}</h3>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">{desc}</p>
        <div className="space-y-4">
            {points.map((point: string, i: number) => (
                <div key={i} className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                    <CheckCircle2 size={20} className="text-[#395d91] shrink-0" />
                    <span className="font-medium text-slate-800 dark:text-gray-200">{point}</span>
                </div>
            ))}
        </div>
    </motion.div>
);