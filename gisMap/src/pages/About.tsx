import { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, type Variants, AnimatePresence } from 'framer-motion';
import {
    ShieldCheck, Users, Building2, Landmark,
    TrendingUp, Lock, Search, ArrowRight, CheckCircle2,
    Briefcase, FileCheck, Globe, Maximize, AlertCircle
} from 'lucide-react';

// import { useTheme } from '../contexts/theme-context';
// import { useLanguage } from '../contexts/language-context';
import { Navbar } from '../components/navigation/Navbar';
import { Footer } from '../components/navigation/FooterAll';

// --- Animation Variants ---
const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { type: "spring", stiffness: 50, damping: 20 }
    }
};

const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.15 }
    }
};

export const AboutPage = () => {
    // const { theme } = useTheme();
    // const { t } = useLanguage();
    const targetRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: targetRef,
        offset: ["start end", "end start"]
    });

    const yParallax = useTransform(scrollYProgress, [0, 1], [0, -100]);
    const opacityParallax = useTransform(scrollYProgress, [0, 0.5], [0, 1]);

    return (
        <>
            <Navbar />
            <div className="min-h-screen bg-gray-50 dark:bg-[#050c1a] text-slate-900 dark:text-white font-sans transition-colors duration-300 overflow-hidden">

                {/* ================= 1. HERO SECTION (PROFESSIONAL MAP) ================= */}
                <section className="relative pt-32 pb-24 lg:pt-48 lg:pb-32 overflow-hidden bg-[#050c1a]">
                    
                    {/* Background Tech Grid */}
                    <div className="absolute inset-0 z-0 opacity-10"
                        style={{ backgroundImage: 'linear-gradient(#395d91 1px, transparent 1px), linear-gradient(90deg, #395d91 1px, transparent 1px)', backgroundSize: '40px 40px' }}
                    />
                    
                    <div className="w-11/12 mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        
                        {/* LEFT: Text Content */}
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={staggerContainer}
                            className="max-w-2xl"
                        >
                            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-6 backdrop-blur-md">
                                <Globe size={14} />
                                <span>Digital Land Registry</span>
                            </motion.div>

                            <motion.h1 variants={fadeInUp} className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-8 leading-tight tracking-tight">
                                Every Parcel <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
                                    Verified & Analyzed.
                                </span>
                            </motion.h1>

                            <motion.p variants={fadeInUp} className="text-xl text-gray-400 leading-relaxed font-light border-l-4 border-primary pl-6 mb-10">
                                Experience the future of Rwandan real estate. Our AI instantly analyzes <strong>market trends</strong>, <strong>historical prices</strong>, and <strong>growth hotspots</strong> to help you identify the best places to invest securely.
                            </motion.p>

                            <motion.div variants={fadeInUp} className="flex gap-4">
                                <div className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm flex items-center gap-3">
                                    <TrendingUp className="text-primary" />
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-bold">Market Trends</p>
                                        <p className="text-lg font-bold text-white">Live Data</p>
                                    </div>
                                </div>
                                <div className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm flex items-center gap-3">
                                    <Maximize className="text-green-400" />
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-bold">Accuracy</p>
                                        <p className="text-lg font-bold text-white">100%</p>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>

                        {/* RIGHT: The Professional Map Animation */}
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 1 }}
                            className="relative h-[500px] w-full flex items-center justify-center"
                        >
                            <RwandaMapVisual />
                        </motion.div>

                    </div>
                </section>


                {/* ================= 2. THE PROBLEM (Why We Exist) ================= */}
                <section className="py-24 bg-white dark:bg-[#0b1221] relative">
                    <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent"></div>
                    
                    <div className="w-11/12 mx-auto">
                        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
                            <div className="max-w-2xl">
                                <motion.div 
                                    initial={{ opacity: 0, x: -20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    className="inline-flex items-center gap-2 text-red-500 font-bold uppercase tracking-wider text-xs mb-4"
                                >
                                    <AlertCircle size={14} /> Why We Exist
                                </motion.div>
                                <h2 className="text-3xl md:text-5xl font-bold mb-6 text-slate-900 dark:text-white">The Challenge</h2>
                                <p className="text-lg text-gray-500 dark:text-gray-400 leading-relaxed">
                                    The property market faces three critical threats. We built SafeLand to solve exactly these issues, replacing uncertainty with guaranteed data.
                                </p>
                            </div>
                        </div>

                        <motion.div
                            variants={staggerContainer}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            className="grid grid-cols-1 md:grid-cols-3 gap-8"
                        >
                            <ProblemCard
                                icon={Lock}
                                title="Double Selling"
                                desc="The nightmare of paying for land only to find it was sold to someone else yesterday."
                                solution="Blockchain Locking"
                            />
                            <ProblemCard
                                icon={Search}
                                title="Misinformation"
                                desc="Fake titles, hidden mortgages, and false zoning info that ruin life savings."
                                solution="Direct NLA Sync"
                            />
                            <ProblemCard
                                icon={TrendingUp}
                                title="Value Ambiguity"
                                desc="Guessing property prices based on rumors rather than market data."
                                solution="AI Valuation"
                            />
                        </motion.div>
                    </div>
                </section>


                {/* ================= 3. OUR MISSION & VISION ================= */}
                <section ref={targetRef} className="py-32 relative overflow-hidden bg-gray-50 dark:bg-[#050c1a]">
                    <div className="w-11/12 mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                        {/* Visual Side */}
                        <motion.div style={{ y: yParallax, opacity: opacityParallax }} className="relative h-[600px] w-full rounded-[2rem] overflow-hidden border border-gray-200 dark:border-gray-800 shadow-2xl dark:shadow-none">
                            <img
                                src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=2070&auto=format&fit=crop"
                                alt="Team working"
                                className="absolute inset-0 w-full h-full object-cover opacity-90 grayscale hover:grayscale-0 transition-all duration-700"
                            />
                            <div className="absolute inset-0 bg-primary/20 mix-blend-multiply" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>

                            <div className="absolute bottom-10 left-10 bg-white dark:bg-[#0a162e] p-6 border border-gray-100 dark:border-gray-700 rounded-xl max-w-xs ">
                                <p className="text-xs font-bold uppercase text-gray-400 mb-1">Goal</p>
                                <p className="text-2xl font-bold text-primary">Zero Fraud</p>
                                <p className="text-sm text-gray-500 mt-2">Creating a standard where verification is automatic.</p>
                            </div>
                        </motion.div>

                        {/* Content Side */}
                        <div className="space-y-16">
                            <motion.div
                                initial={{ opacity: 0, x: 50 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.8 }}
                            >
                                <div className="w-12 h-12 bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-center text-primary mb-6 ">
                                    <ShieldCheck size={24} />
                                </div>
                                <h3 className="text-3xl font-bold mb-4 text-slate-900 dark:text-white">Our Mission</h3>
                                <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                                    To revolutionize Rwanda’s real estate sector by establishing a <strong>verification-first marketplace</strong>. We eliminate fraud through direct National Land Authority integration and blockchain-backed transaction locking.
                                </p>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, x: 50 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.8, delay: 0.2 }}
                            >
                                <div className="w-12 h-12 bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-center text-primary mb-6 ">
                                    <TrendingUp size={24} />
                                </div>
                                <h3 className="text-3xl font-bold mb-4 text-slate-900 dark:text-white">Our Vision</h3>
                                <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                                    To become the digital standard for real estate trust across Africa. We envision a future where property transfer is instant, secure, and accessible to everyone.
                                </p>
                            </motion.div>
                        </div>
                    </div>
                </section>


                {/* ================= 4. WHAT DRIVES US ================= */}
                <section className="py-24 bg-[#0a162e] text-white">
                    <div className="w-11/12 mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                            <div>
                                <h2 className="text-4xl font-bold mb-6">What Drives Us</h2>
                                <p className="text-blue-100/80 text-lg leading-relaxed mb-6">
                                    We are driven by the stories of families who lost their life savings to scammers. We believe that <strong>property ownership is the foundation of wealth</strong>, and when that process is unsafe, the entire economy suffers.
                                </p>
                                <p className="text-blue-100/80 text-lg leading-relaxed">
                                    We are not just building software; we are building <strong>peace of mind</strong>.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                                    <h4 className="text-3xl font-bold text-primary mb-1">100%</h4>
                                    <p className="text-sm text-gray-400">Verification Rate</p>
                                </div>
                                <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                                    <h4 className="text-3xl font-bold text-green-400 mb-1">0%</h4>
                                    <p className="text-sm text-gray-400">Fraud Tolerance</p>
                                </div>
                                <div className="p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm col-span-2">
                                    <h4 className="text-xl font-bold text-white mb-2">Know Value</h4>
                                    <p className="text-sm text-gray-400">
                                        We empower you to know exactly what you own and what it's worth.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>


                {/* ================= 5. PARTNERS & USERS ================= */}
                <section className="py-24 bg-white dark:bg-[#050c1a]">
                    <div className="w-11/12 mx-auto">
                        <div className="mb-24 text-center">
                            <span className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6 block">Our Data Authority</span>
                            <div className="inline-flex items-center gap-6 px-10 py-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0a162e] hover:shadow-lg transition-all">
                                <div className="flex items-center gap-4">
                                    <Landmark size={40} className="text-slate-900 dark:text-white" />
                                    <div className="text-left">
                                        <h4 className="text-lg font-bold leading-none text-slate-900 dark:text-white">National Land Authority</h4>
                                        <span className="text-xs text-primary font-bold">Official Integration Partner</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center gap-4 mb-10">
                                <div className="h-px bg-gray-200 dark:bg-gray-800 flex-1"></div>
                                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Who We Serve</h3>
                                <div className="h-px bg-gray-200 dark:bg-gray-800 flex-1"></div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <UserCard title="Buyers" icon={Users} desc="Invest securely without fear of fake titles." />
                                <UserCard title="Sellers" icon={FileCheck} desc="Prove ownership instantly and sell faster." />
                                <UserCard title="Brokers" icon={Briefcase} desc="Build credibility with verified listings." />
                                <UserCard title="Agencies" icon={Building2} desc="Manage portfolios with clean data." />
                            </div>
                        </div>
                    </div>
                </section>


                {/* ================= 6. CTA ================= */}
                <section className="py-24 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#050c1a]">
                    <div className="w-11/12 mx-auto text-center">
                        <h2 className="text-4xl font-bold mb-6 text-slate-900 dark:text-white">
                            Ready to Secure Your Future?
                        </h2>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
                            <a
                                href="/register"
                                className="px-8 py-4 bg-primary hover:bg-[#2d4a75] text-white font-bold rounded-xl flex items-center gap-2 transition-all w-full sm:w-auto justify-center"
                            >
                                Get Started <ArrowRight size={20} />
                            </a>
                        </div>
                    </div>
                </section>

            </div>
            <Footer />
        </>
    );
};


// --- HELPER COMPONENT: Rwanda Map Visual (Accurate Shape & Zoning) ---
const RwandaMapVisual = () => {
    // Simulated parcels scanning logic
    const [scannedParcels, setScannedParcels] = useState<number[]>([]);

    useEffect(() => {
        // Randomly "scan" parcels
        const interval = setInterval(() => {
            const newParcel = Math.floor(Math.random() * 6);
            setScannedParcels(prev => {
                if (prev.includes(newParcel)) return prev;
                return [...prev, newParcel];
            });
        }, 800);
        return () => clearInterval(interval);
    }, []);

    // Accurate SVG Path for Rwanda
    const rwandaPath = "M289.4,124.9c-2.3-2.3-7.5-3.3-8.9-6.6c-0.9-2.3,0-5.6-1.4-8c-1.9-3.3-6.6-4.7-8-8.5c-1.4-3.3,0.5-8,0-11.7 c-0.5-3.3-3.3-6.1-5.6-8.5c-3.8-3.8-8-7.5-12.7-10.3c-2.8-1.9-6.1-3.3-9.4-4.2c-3.3-0.9-7-0.9-10.3-1.9c-3.3-0.9-6.1-3.3-8.9-5.2 c-2.8-1.9-5.2-4.2-8.5-5.6c-3.3-1.4-7-1.4-10.3-0.9c-3.3,0.5-6.1,2.3-8.9,4.2c-2.8,1.9-5.2,4.2-8,5.2c-2.8,0.9-6.1,0.5-8.9,0 c-2.8-0.5-5.2-2.3-8-3.3c-2.8-0.9-6.1-0.9-8.9-0.5c-2.8,0.5-5.2,1.9-8,2.8c-2.8,0.9-6.1,0.9-8.9,0.5c-2.8-0.5-5.2-2.3-8-3.8 c-2.8-1.4-6.1-2.3-9.4-2.3c-3.3,0-6.6,1.4-9.4,3.3c-2.8,1.9-5.2,4.7-7.5,7.5c-2.3,2.8-4.2,6.1-5.6,9.4c-1.4,3.3-2.3,7-3.3,10.3 c-0.9,3.3-2.3,6.6-4.2,9.4c-1.9,2.8-4.7,5.2-7.5,7c-2.8,1.9-6.1,3.3-9.4,4.2c-3.3,0.9-7,1.4-10.3,2.3c-3.3,0.9-6.6,2.3-9.4,4.2 c-2.8,1.9-5.2,4.7-7,8c-1.9,3.3-2.8,7-3.8,10.8c-0.9,3.8-1.9,7.5-3.3,10.8c-1.4,3.3-3.3,6.6-5.6,9.4c-2.3,2.8-5.2,5.2-8.5,7 c-3.3,1.9-7,3.3-10.8,4.2c-3.8,0.9-7.5,1.4-11.3,2.3c-3.8,0.9-7.5,2.3-10.8,4.7c-3.3,2.3-6.1,5.6-8.5,8.9c-2.3,3.3-4.2,7-5.6,10.8 c-1.4,3.8-2.3,8-2.8,12.2c-0.5,4.2-0.5,8.5,0.5,12.7c0.9,4.2,2.8,8,5.2,11.3c2.3,3.3,5.6,6.1,8.9,8c3.3,1.9,7,3.3,10.8,3.8 c3.8,0.5,8-0.5,11.7-1.9c3.8-1.4,7-3.8,10.3-6.1c3.3-2.3,6.1-5.2,9.4-7.5c3.3-2.3,7-4.2,10.8-5.6c3.8-1.4,8-2.3,12.2-2.3 c4.2,0,8.5,0.9,12.2,2.8c3.8,1.9,7,4.7,9.9,7.5c2.8,2.8,5.2,6.1,7.5,9.4c2.3,3.3,4.2,7,5.6,10.8c1.4,3.8,2.3,8,3.3,12.2 c0.9,4.2,1.9,8,3.3,11.7c1.4,3.8,3.3,7,5.6,9.9c2.3,2.8,5.2,5.2,8.5,7c3.3,1.9,7,3.3,10.8,4.2c3.8,0.9,8,1.4,12.2,1.4 c4.2,0,8.5-0.9,12.2-2.8c3.8-1.9,7-4.7,9.9-7.5c2.8-2.8,5.2-6.1,7-9.4c1.9-3.3,3.3-7,4.2-10.8c0.9-3.8,1.4-8,2.3-11.7 c0.9-3.8,2.3-7.5,4.2-10.8c1.9-3.3,4.7-6.1,7.5-8.5c2.8-2.3,6.1-4.2,9.4-5.6c3.3-1.4,7-2.3,10.8-2.8c3.8-0.5,8-0.5,11.7,0.5 c3.8,0.9,7,2.8,10.3,5.2c3.3,2.3,6.1,5.2,8.5,8.5c2.3,3.3,4.2,7,5.6,10.8c1.4,3.8,2.3,8,2.8,12.2c0.5,4.2,0.5,8.5,0,12.7 c-0.5,4.2-1.9,8-3.8,11.7c-1.9,3.8-4.7,7-7.5,9.9c-2.8,2.8-6.1,5.2-9.4,7c-3.3,1.9-7,3.3-10.8,4.2c-3.8,0.9-8,1.4-12.2,1.4 c-4.2,0-8.5-0.9-12.2-2.8c-3.8-1.9-7-4.7-9.9-7.5c-2.8-2.8-5.2-6.1-7-9.4c-1.9-3.3-3.3-7-4.2-10.8c-0.9-3.8-1.4-8-1.4-12.2 c0-4.2,0.9-8.5,2.8-12.2c1.9-3.8,4.7-7,7.5-9.9c2.8-2.8,6.1-5.2,9.4-7c3.3-1.9,7-3.3,10.8-4.2c3.8-0.9,8-1.4,12.2-1.4 c4.2,0,8.5,0.9,12.2,2.8c3.8,1.9,7,4.7,9.9,7.5c2.8,2.8,5.2,6.1,7.5,9.4c2.3,3.3,4.2,7,5.6,10.8c1.4,3.8,2.3,8,3.3,12.2 c0.9,4.2,1.9,8,3.3,11.7c1.4,3.8,3.3,7,5.6,9.9c2.3,2.8,5.2,5.2,8.5,7c3.3,1.9,7,3.3,10.8,4.2c3.8,0.9,8,1.4,12.2,1.4 c4.2,0,8.5-0.9,12.2-2.8c3.8-1.9,7-4.7,9.9-7.5c2.8-2.8,5.2-6.1,7.5-9.4c2.3-3.3,4.2,7,5.6,10.8c1.4,3.8,2.3,8,3.3,12.2 c0.9,4.2,1.9,8,3.3,11.7";

    // Strategic Data Points (Approximate Real Coordinates on this SVG ViewBox 0 0 320 250)
    // Kigali is roughly central-east. Musanze North. Rubavu West. Bugesera South.
    const parcels = [
        // KIGALI (Center) - High Value
        { id: 0, x: 160, y: 110, code: "C3", type: "Commercial", status: "Prime", color: "bg-green-500", dot: "bg-green-400" }, 
        { id: 1, x: 170, y: 115, code: "R1A", type: "Residential", status: "Good", color: "bg-blue-500", dot: "bg-blue-400" },
        
        // MUSANZE (North) - Tourism/Agri
        { id: 2, x: 140, y: 60, code: "T1", type: "Tourism", status: "Good", color: "bg-blue-500", dot: "bg-cyan-400" },
        
        // RUBAVU (West) - Border Trade
        { id: 3, x: 80, y: 90, code: "C1", type: "Mixed Use", status: "Medium", color: "bg-yellow-500", dot: "bg-yellow-400" },
        
        // BUGESERA (South) - Airport/Industrial
        { id: 4, x: 180, y: 160, code: "I1", type: "Industrial", status: "Emerging", color: "bg-purple-500", dot: "bg-purple-400" },
        
        // NYUNGWE/AKAGERA (Protected) - Risk/Restricted
        { id: 5, x: 100, y: 180, code: "P3", type: "Protected", status: "Risk", color: "bg-red-500", dot: "bg-red-500" },
    ];

    return (
        <div className="relative w-[340px] h-[280px] md:w-[450px] md:h-[350px]">
            <svg viewBox="0 0 320 250" className="w-full h-full drop-shadow-[0_0_20px_rgba(57,93,145,0.4)]">
                {/* Base Map Shape */}
                <motion.path
                    d={rwandaPath}
                    fill="#0f1f3a"
                    stroke="#395d91"
                    strokeWidth="1.5"
                    initial={{ pathLength: 0, fillOpacity: 0 }}
                    animate={{ pathLength: 1, fillOpacity: 0.9 }}
                    transition={{ duration: 2.5, ease: "easeInOut" }}
                />
                
                {/* Internal Grid Lines (Simulating Zones) */}
                <defs>
                    <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#395d91" strokeWidth="0.2" strokeOpacity="0.3"/>
                    </pattern>
                </defs>
                <path d={rwandaPath} fill="url(#grid)" stroke="none" opacity="0.5" />
            </svg>

            {/* SCANNING LASER BEAM */}
            <motion.div 
                className="absolute top-0 left-0 w-full h-[2px] bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)] z-20"
                animate={{ top: ["0%", "100%", "0%"] }}
                transition={{ duration: 6, ease: "linear", repeat: Infinity }}
            />

            {/* POPPING PARCELS */}
            <AnimatePresence>
                {parcels.map((parcel) => (
                    scannedParcels.includes(parcel.id) && (
                        <motion.div
                            key={parcel.id}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute z-30 flex flex-col items-center group cursor-pointer"
                            style={{ left: `${(parcel.x / 320) * 100}%`, top: `${(parcel.y / 250) * 100}%` }}
                        >
                            {/* The Dot with Ring Animation */}
                            <div className="relative">
                                <div className={`w-3 h-3 ${parcel.dot} rounded-full shadow-[0_0_10px_currentColor] animate-pulse`} />
                                <div className={`absolute -inset-1 rounded-full ${parcel.dot} opacity-30 animate-ping`} />
                            </div>
                            
                            {/* The Info Card (Hover or Auto-show) */}
                            <motion.div 
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: -8, opacity: 1 }}
                                className="absolute bottom-full mb-2 bg-[#0a162e]/95 backdrop-blur-md border border-gray-700 px-3 py-2 rounded-lg whitespace-nowrap shadow-xl z-40 min-w-[100px]"
                            >
                                <div className="flex items-center justify-between gap-3 mb-1">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{parcel.code}</span>
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded ${parcel.color} text-white font-bold`}>{parcel.status}</span>
                                </div>
                                <div className="text-xs font-bold text-white">{parcel.type}</div>
                            </motion.div>
                        </motion.div>
                    )
                ))}
            </AnimatePresence>
        </div>
    );
};

// --- Sub-Components (Unchanged) ---
const ProblemCard = ({ icon: Icon, title, desc, solution }: any) => (
    <motion.div
        variants={fadeInUp}
        className="bg-gray-50 dark:bg-[#0a162e] p-8 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col h-full hover:border-primary/50 transition-colors "
    >
        <div className="w-12 h-12 bg-white dark:bg-white/5 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center text-slate-900 dark:text-white mb-6">
            <Icon size={24} />
        </div>
        <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6 flex-grow">
            {desc}
        </p>
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700 mt-auto">
            <p className="text-xs font-bold text-primary flex items-center gap-2 uppercase tracking-wide">
                <CheckCircle2 size={14} /> {solution}
            </p>
        </div>
    </motion.div>
);

const UserCard = ({ title, icon: Icon, desc }: any) => (
    <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0a162e] hover:border-primary/50 transition-colors group ">
        <div className="mb-4 text-gray-400 group-hover:text-primary transition-colors">
            <Icon size={28} />
        </div>
        <h4 className="text-lg font-bold mb-1 text-slate-900 dark:text-white">{title}</h4>
        <p className="text-sm text-gray-500 dark:text-gray-400">{desc}</p>
    </div>
);