import  { useRef } from 'react';
import { motion, useScroll, useTransform, type Variants } from 'framer-motion';
import {
    Target, Telescope, CheckCircle2,
    ShieldCheck, Link as LinkIcon, BrainCircuit,
    ArrowRight
} from 'lucide-react';
import { useLanguage } from '../../contexts/language-context';

// --- Animation Variants ---
const containerStagger: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2
        }
    }
};

const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { type: "spring", stiffness: 50, damping: 20 }
    }
};

const scaleIn: Variants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.5 }
    }
};

export const MissionVisionSection = () => {
    const { t, language } = useLanguage();
    const containerRef = useRef<HTMLDivElement>(null);

    // Scroll Parallax Hooks
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start end", "end start"]
    });

    const yMove = useTransform(scrollYProgress, [0, 1], [0, -50]);
    const imageScale = useTransform(scrollYProgress, [0, 1], [1.1, 1]);

    // Specific Mission Text
    const missionText = language === 'EN'
        ? "To revolutionize Rwanda’s real estate sector by establishing a verification-first marketplace that eliminates fraud through direct National Land Authority integration and blockchain-backed transaction locking, while empowering stakeholders with transparent, AI-driven valuation and real-time market trends analysis."
        : t('mission.desc');

    return (
        <section ref={containerRef} className="py-32 bg-gray-50 dark:bg-[#050c1a] overflow-hidden relative">

            {/* Global Background Grid (Low Opacity) */}
            <div className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
                style={{ backgroundImage: 'linear-gradient(#395d91 1px, transparent 1px), linear-gradient(90deg, #395d91 1px, transparent 1px)', backgroundSize: '40px 40px' }}
            />

            <div className="w-11/12 mx-auto relative z-10 space-y-32">

                {/* ================= 1. MISSION SECTION (Image Left, Text Right) ================= */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

                    {/* --- VISUAL: THE SCANNING CITY --- */}
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={scaleIn}
                        className="relative group"
                    >
                        <div className="relative h-[500px] w-full rounded-[2.5rem] overflow-hidden ">
                            {/* Parallax Image */}
                            <motion.div style={{ scale: imageScale }} className="absolute inset-0 w-full h-full">
                                <img
                                    src="https://upload.wikimedia.org/wikipedia/commons/2/2d/High_Angle_View_Of_Kigali_City_Street_on_November_29%2C_2018._Emmanuel_Kwizera.jpg"
                                    alt="Modern Rwanda Real Estate"
                                    className="w-full h-full object-cover"
                                />
                            </motion.div>

                            {/* Overlays */}
                            <div className="absolute inset-0 bg-primary/20 mix-blend-multiply" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0a162e] via-transparent to-transparent opacity-80" />

                            {/* ANIMATION: Scanning Line (Verification Concept) */}
                            <motion.div
                                animate={{ top: ['0%', '100%', '0%'] }}
                                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                className="absolute left-0 right-0 h-1 bg-green-400 shadow-[0_0_40px_rgba(74,222,128,0.8)] z-20 opacity-80"
                            />

                            {/* Floating Badge with Continuous Bobbing */}
                            <motion.div
                                style={{ y: yMove }}
                                className="absolute bottom-8 left-8 bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-2xl shadow-xl max-w-xs"
                            >
                                <motion.div
                                    animate={{ y: [0, -5, 0] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                    className="flex items-center gap-3 mb-2"
                                >
                                    <div className="p-2 bg-green-500 rounded-lg text-white">
                                        <ShieldCheck size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-green-300 tracking-wider">Status</p>
                                        <p className="text-sm font-bold text-white">100% Verified Zone</p>
                                    </div>
                                </motion.div>
                            </motion.div>
                        </div>

                        {/* Background Decoration */}
                        <div className="absolute -z-10 top-10 -left-10 w-full h-full border-2 border-primary/10 rounded-[2.5rem]" />
                    </motion.div>

                    {/* --- CONTENT: THE MISSION --- */}
                    <div className="relative">
                        <motion.div
                            variants={containerStagger}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                        >
                            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-primary font-bold text-xs uppercase tracking-widest mb-6">
                                <Target size={14} />
                                <span>Our Mission</span>
                            </motion.div>

                            <motion.h2 variants={fadeInUp} className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
                                Revolutionizing Trust in <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">Rwandan Real Estate</span>
                            </motion.h2>

                            <motion.p variants={fadeInUp} className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
                                {missionText}
                            </motion.p>


                            {/* Tech Pillars Grid - Staggered Entry */}
                            <motion.div
                                variants={containerStagger}
                                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                            >
                                <TechPill icon={ShieldCheck} title="NLA Integration" desc="Direct Gov Database Sync" />
                                <TechPill icon={LinkIcon} title="Blockchain" desc="Immutable Ledger Locking" />
                                <TechPill icon={BrainCircuit} title="AI Valuation" desc="Real-time Market Data" />
                                <TechPill icon={CheckCircle2} title="Zero Fraud" desc="Everything is Verified" />
                            </motion.div>
                        </motion.div>
                    </div>

                </div>


                {/* ================= 2. VISION SECTION (Text Left, Image Right) ================= */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

                    {/* --- CONTENT: THE VISION --- */}
                    <div className="order-2 lg:order-1">
                        <motion.div
                            variants={containerStagger}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                        >
                            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 font-bold text-xs uppercase tracking-widest mb-6">
                                <Telescope size={14} />
                                <span>Our Vision</span>
                            </motion.div>

                            <motion.h2 variants={fadeInUp} className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6 leading-tight">
                                Building the <span className="text-primary">Digital Standard</span> for African Property
                            </motion.h2>

                            <motion.p variants={fadeInUp} className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
                                {t('vision.desc')}
                            </motion.p>

                            {/* Values Strip - Staggered Chips */}
                            <motion.div variants={fadeInUp} className="space-y-6">
                                <h4 className="text-sm font-bold uppercase text-gray-400 tracking-wider">Core Values</h4>
                                <motion.div variants={containerStagger} className="flex flex-wrap gap-3">
                                    {[t('values.integrity'), t('values.innovation'), t('values.access')].map((val, i) => (
                                        <motion.span
                                            key={i}
                                            variants={fadeInUp}
                                            whileHover={{ y: -5, scale: 1.05 }}
                                            className="px-6 py-3 rounded-xl bg-white dark:bg-[#0a162e] border border-gray-200 dark:border-gray-800 font-bold text-slate-700 dark:text-gray-300 hover:shadow-md transition-all cursor-default"
                                        >
                                            {val}
                                        </motion.span>
                                    ))}
                                </motion.div>
                            </motion.div>

                            <motion.div variants={fadeInUp} className="mt-10">
                                <button className="flex items-center gap-2 text-primary font-bold border-b-2 border-primary/20 hover:border-primary pb-1 transition-all group">
                                    Read our 2030 Roadmap <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </motion.div>
                        </motion.div>
                    </div>

                    {/* --- VISUAL: FUTURE HORIZON --- */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        viewport={{ once: true }}
                        className="order-1 lg:order-2 relative group"
                    >
                        <div className="relative h-[500px] w-full rounded-[2.5rem] overflow-hidden shadow-2xl bg-slate-900">
                            {/* Parallax Image */}
                            <motion.div style={{ scale: imageScale }} className="absolute inset-0 w-full h-full">
                                <img
                                    src="https://www.rmkrealtygh.com/wp-content/uploads/2023/10/image.png"
                                    alt="Future Office Architecture"
                                    className="w-full h-full object-cover opacity-80"
                                />
                            </motion.div>

                            {/* Tech Overlay Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-[#0a162e] via-primary/20 to-transparent" />

                            {/* Animated Abstract Nodes */}
                            <div className="absolute inset-0 z-10 opacity-30">
                                <svg width="100%" height="100%">
                                    <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                                        <circle cx="2" cy="2" r="1" className="text-white" fill="currentColor" />
                                    </pattern>
                                    <rect width="100%" height="100%" fill="url(#dots)" />
                                </svg>
                            </div>

                            {/* Floating Card with Bobbing Animation */}
                            <motion.div
                                style={{ y: yMove }}
                                className="absolute top-12 right-8 bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl shadow-2xl max-w-xs text-white"
                            >
                                <motion.div
                                    animate={{ y: [0, 8, 0] }}
                                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="text-xs text-blue-200 uppercase font-bold">Goal</p>
                                            <p className="text-2xl font-bold">Pan-African</p>
                                        </div>
                                        <div className="bg-white/20 p-2 rounded-lg">
                                            <ArrowRight className="-rotate-45" />
                                        </div>
                                    </div>
                                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            whileInView={{ width: "66%" }}
                                            transition={{ duration: 1.5, delay: 0.5 }}
                                            className="h-full bg-blue-400"
                                        />
                                    </div>
                                </motion.div>
                            </motion.div>
                        </div>

                        {/* Background Decoration */}
                        <div className="absolute -z-10 bottom-10 -right-10 w-full h-full border-2 border-primary/10 rounded-[2.5rem]" />
                    </motion.div>

                </div>

            </div>
        </section>
    );
};

// Helper Component for the Tech Pillars Grid (Now Animated)
const TechPill = ({ icon: Icon, title, desc }: any) => (
    <motion.div
        variants={fadeInUp}
        whileHover={{ scale: 1.02, backgroundColor: "rgba(57, 93, 145, 0.05)" }}
        className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-[#0a162e] border border-gray-100 dark:border-gray-800 hover:border-primary/30 transition-colors  cursor-default"
    >
        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-primary rounded-lg flex-shrink-0">
            <Icon size={18} />
        </div>
        <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">{title}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
        </div>
    </motion.div>
);