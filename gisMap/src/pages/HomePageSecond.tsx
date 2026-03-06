import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion, } from 'framer-motion';
import {
    ShieldCheck, Map, ScanLine,
    Lock, CheckCircle2, AlertTriangle,
    Building2, Briefcase, UserCheck, Layers,
    ChevronRight, Cpu,
    Sparkles,
    Shield, Satellite,
    Brain, Cloud, Radar, Menu, X,
    Sun,
    Moon
} from 'lucide-react';
import { clsx } from 'clsx';
import { Footer } from '../components/navigation/FooterAll';
import { useTheme } from '../contexts/theme-context';

// ================= CUSTOM NAVBAR =================
const SafeLandNavbar = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (id: string) => {
        setMobileMenuOpen(false);
        const element = document.getElementById(id);
        if (element) {
            const offset = 80; // Navbar height offset
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = element.getBoundingClientRect().top;
            const elementPosition = elementRect - bodyRect;
            const offsetPosition = elementPosition - offset;

            window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }
    };

    const navLinks = [
        { name: 'Protocol', id: 'protocol' },
        { name: 'Challenge', id: 'challenge' },
        { name: 'Ecosystem', id: 'ecosystem' },
        { name: 'Technology', id: 'technology' },
    ];

    return (
        <nav className={clsx(
            "fixed top-0 left-0 right-0 z-[5000] transition-all duration-300",
            isScrolled ? "bg-white/90 dark:bg-[#0a162e]/90 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 py-3" : "bg-transparent py-5"
        )}>
            <div className="w-11/12 mx-auto flex items-center justify-between">

                {/* Logo */}
                <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                    <img src="/logo_words.png" alt="SafeLand Logo" className="w-18 h-12 scale-200 object-contain" />
                </div>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <button
                            key={link.name}
                            onClick={() => scrollToSection(link.id)}
                            className="text-sm font-bold text-slate-600 dark:text-gray-300 hover:text-[#395d91] dark:hover:text-[#5b85c7] transition-colors"
                        >
                            {link.name}
                        </button>
                    ))}
                </div>
                <DarkModeOnboardingPage />
                {/* Desktop Auth Buttons */}
                <div className="hidden md:flex items-center gap-3">
                    <a href="/login" className="px-5 py-2.5 text-sm font-bold text-slate-700 dark:text-gray-200 hover:text-[#395d91] dark:hover:text-white transition-colors">
                        Sign In
                    </a>
                    <a href="/register" className="px-5 py-2.5 bg-[#395d91] hover:bg-[#2d4a75] text-white text-sm font-bold rounded-xl transition-all shadow-sm active:scale-95">
                        Get Started
                    </a>
                </div>

                {/* Mobile Menu Toggle */}
                <button
                    className="md:hidden p-2 text-slate-900 dark:text-white"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Dropdown Menu */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-white dark:bg-[#0a162e] border-b border-gray-200 dark:border-gray-800 overflow-hidden"
                    >
                        <div className="flex flex-col p-4 space-y-2">
                            {navLinks.map((link) => (
                                <button
                                    key={link.name}
                                    onClick={() => scrollToSection(link.id)}
                                    className="p-4 text-left font-bold text-slate-900 dark:text-white rounded-xl hover:bg-gray-50 dark:hover:bg-white/5"
                                >
                                    {link.name}
                                </button>
                            ))}
                            <div className="h-px bg-gray-200 dark:bg-gray-800 my-2" />
                            <a href="/login" className="p-4 text-center font-bold text-slate-900 dark:text-white rounded-xl hover:bg-gray-50 dark:hover:bg-white/5">
                                Sign In
                            </a>
                            <a href="/register" className="p-4 text-center font-bold text-white bg-[#395d91] rounded-xl">
                                Get Started
                            </a>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

// --- Particle Background Component ---
const ParticleBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles: Array<{ x: number; y: number; size: number; speedX: number; speedY: number }> = [];
        const particleCount = window.innerWidth < 768 ? 20 : 40;

        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2 + 0.5,
                speedX: (Math.random() - 0.5) * 0.5,
                speedY: (Math.random() - 0.5) * 0.5
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#395d91';
            ctx.globalAlpha = 0.15;

            particles.forEach(p => {
                p.x += p.speedX;
                p.y += p.speedY;
                if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
                if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            });
            requestAnimationFrame(animate);
        };
        animate();

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />;
};

// --- 3D Card Effect Component ---
const Card3D = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
    const [rotate, setRotate] = useState({ x: 0, y: 0 });
    const cardRef = useRef<HTMLDivElement>(null);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = (y - centerY) / 50;
        const rotateY = (centerX - x) / 50;
        setRotate({ x: rotateX, y: rotateY });
    };

    const handleMouseLeave = () => setRotate({ x: 0, y: 0 });

    return (
        <motion.div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            animate={{ rotateX: rotate.x, rotateY: rotate.y }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={clsx("transform-gpu preserve-3d w-full", className)}
            style={{ transformStyle: 'preserve-3d' }}
        >
            {children}
        </motion.div>
    );
};

// --- Counter Component ---
const Counter = ({ value, duration = 2 }: { value: number; duration?: number }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let start = 0;
        const increment = value / (duration * 60);
        const timer = setInterval(() => {
            start += increment;
            if (start >= value) {
                setCount(value);
                clearInterval(timer);
            } else {
                setCount(Math.floor(start));
            }
        }, 16);
        return () => clearInterval(timer);
    }, [value, duration]);

    return <span>{count.toLocaleString()}+</span>;
};

// --- Typewriter Component ---
const TypewriterText = ({ texts, delay = 3000 }: { texts: string[]; delay?: number }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [displayText, setDisplayText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (!isDeleting && displayText === texts[currentIndex]) {
                setTimeout(() => setIsDeleting(true), delay);
            } else if (isDeleting && displayText === '') {
                setIsDeleting(false);
                setCurrentIndex((prev) => (prev + 1) % texts.length);
            } else {
                const nextText = isDeleting
                    ? texts[currentIndex].slice(0, displayText.length - 1)
                    : texts[currentIndex].slice(0, displayText.length + 1);
                setDisplayText(nextText);
            }
        }, isDeleting ? 30 : 60);
        return () => clearTimeout(timeout);
    }, [displayText, isDeleting, currentIndex, texts, delay]);

    return (
        <span className="text-[#395d91] dark:text-[#5b85c7]">
            {displayText}
            <span className="animate-pulse text-[#395d91]/50 dark:text-[#5b85c7]/50">|</span>
        </span>
    );
};

// --- Live Feed Component ---
// const LiveFeed = () => {
//     const [feed, setFeed] = useState([
//         { id: 1, text: 'Property verified in Kigali', time: '2s ago', type: 'verify' },
//         { id: 2, text: 'Boundary dispute resolved', time: '15s ago', type: 'resolve' },
//         { id: 3, text: 'Mortgage approved', time: '32s ago', type: 'approve' },
//     ]);

//     useEffect(() => {
//         const interval = setInterval(() => {
//             const types = ['verify', 'resolve', 'approve', 'scan'] as const;
//             const texts = ['Title deed verified', 'GIS coords confirmed', 'Registry updated', 'API query matched'];
//             const newFeed = {
//                 id: Date.now(),
//                 text: texts[Math.floor(Math.random() * texts.length)],
//                 time: 'just now',
//                 type: types[Math.floor(Math.random() * types.length)]
//             };
//             setFeed(prev => [newFeed, ...prev.slice(0, 2)]);
//         }, 5000);
//         return () => clearInterval(interval);
//     }, []);

//     return (
//         <div className="hidden xl:block absolute top-32 left-10 bg-white/90 dark:bg-[#0a162e]/90 backdrop-blur-md rounded-2xl p-4 border border-gray-200 dark:border-gray-800 w-64 z-20 shadow-sm">
//             <div className="flex items-center gap-2 mb-3">
//                 <Radio size={14} className="text-green-500 animate-pulse" />
//                 <span className="text-[10px] font-bold tracking-wider text-slate-500 dark:text-gray-400 uppercase">Live Network Feed</span>
//             </div>
//             <div className="space-y-3">
//                 <AnimatePresence>
//                     {feed.map(item => (
//                         <motion.div
//                             key={item.id}
//                             initial={{ opacity: 0, x: -20, height: 0 }}
//                             animate={{ opacity: 1, x: 0, height: 'auto' }}
//                             exit={{ opacity: 0, x: 20, height: 0 }}
//                             className="text-xs text-slate-700 dark:text-gray-300 flex items-start gap-2"
//                         >
//                             <span className={clsx("w-1.5 h-1.5 rounded-full mt-1 shrink-0", 
//                                 item.type === 'verify' && 'bg-green-500',
//                                 item.type === 'resolve' && 'bg-blue-500',
//                                 item.type === 'approve' && 'bg-purple-500',
//                                 item.type === 'scan' && 'bg-yellow-500'
//                             )} />
//                             <span className="flex-1 leading-tight">{item.text}</span>
//                         </motion.div>
//                     ))}
//                 </AnimatePresence>
//             </div>
//         </div>
//     );
// };

// --- Main Component ---
export const GeoGuardLanding = () => {
    const [activeStakeholder, setActiveStakeholder] = useState<'bank' | 'buyer' | 'owner'>('owner');

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#050c1a] text-slate-900 dark:text-white font-sans overflow-x-hidden transition-colors duration-300 scroll-smooth">

            <SafeLandNavbar />

            {/* Global Particle Background */}
            <ParticleBackground />

            {/* ================= 1. HERO SECTION ================= */}
            <section id="hero" className="relative min-h-[90vh] flex items-center justify-center pt-24 pb-16 z-10 border-b border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-[#0a162e]/50 backdrop-blur-3xl">

                {/* Grid Overlay */}
                <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#395d91 1px, transparent 1px), linear-gradient(90deg, #395d91 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

                {/* <LiveFeed /> */}

                <div className="w-11/12 mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

                    {/* Hero Text */}
                    <div className="order-2 lg:order-1  relative z-20">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 shadow-sm mb-6"
                        >
                            <Sparkles size={14} className="text-[#395d91] dark:text-[#5b85c7]" />
                            <span className="text-[10px] md:text-xs font-bold tracking-widest text-slate-600 dark:text-gray-300 uppercase">SafeLand Rwanda</span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-5 leading-tight text-slate-900 dark:text-white"
                        >
                            The Digital <br />
                            <TypewriterText texts={['Source of Truth.', 'Guardian of Land.', 'Future of Trust.']} />
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-sm md:text-base text-slate-600 dark:text-gray-400 max-w-lg leading-relaxed mb-8"
                        >
                            AI-Powered Land Boundary Verification & Urban Intelligence System.
                            Achieve <span className="font-bold text-slate-900 dark:text-white">99.97% accuracy</span> in detecting Boundary overlapping and resolving disputes instantly.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto"
                        >
                            <button onClick={() => window.location.href = "/map"} className="px-6 py-3.5 bg-[#395d91] hover:bg-[#2d4a75] text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-sm active:scale-95">
                                <ScanLine size={16} /> Verify Document
                            </button>
                            <button onClick={() => window.location.href = "/map"} className="px-6 py-3.5 bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5 text-slate-900 dark:text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm active:scale-95">
                                <Map size={16} /> Explore GIS Map
                            </button>
                        </motion.div>

                        {/* Quick Stats */}
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                            className="grid grid-cols-3 gap-4 mt-10 pt-6 border-t border-gray-200 dark:border-gray-800"
                        >
                            <div>
                                <h4 className="text-xl font-bold text-slate-900 dark:text-white"><Counter value={25} /></h4>
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mt-1">Parcels Verified</p>
                            </div>
                            <div>
                                <h4 className="text-xl font-bold text-slate-900 dark:text-white"><Counter value={99.9} />%</h4>
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mt-1">Accuracy Rate</p>
                            </div>
                            <div>
                                <h4 className="text-xl font-bold text-slate-900 dark:text-white">03s-0.5s</h4>
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mt-1">Query Latency</p>
                            </div>
                        </motion.div>
                    </div>

                    {/* Hero Visual (3D Card) */}
                    <div className="order-1 lg:order-2 flex justify-center relative z-20">
                        <Card3D>
                            <div className="relative w-full h-[350px] md:h-[450px] bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 rounded-[24px] overflow-hidden shadow-sm">
                                <img src="https://cdn.dribbble.com/userupload/21486249/file/original-24db15814a6b5a9109f8df238c402bf0.gif" alt="GIS Map" className="w-full h-full object-cover" />
                            </div>
                            <div className="relative hidden w-full h-[350px] md:h-[450px] bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 rounded-[24px] overflow-hidden shadow-sm">
                                <img src="hero.gif" alt="GIS Map" className="w-full h-full object-cover" />
                            </div>
                        </Card3D>
                    </div>
                </div>
            </section>

            {/* ================= 2. TRIPLE CHECK METHOD (PROTOCOL) ================= */}
            <section id="protocol" className="py-20 lg:py-24 relative z-10 bg-white dark:bg-[#0a162e] border-b border-gray-200 dark:border-gray-800 scroll-mt-20">
                <div className="w-11/12 mx-auto">
                    <div className="text-center mb-14 max-w-2xl mx-auto">
                        <span className="text-xs font-bold text-[#395d91] uppercase tracking-widest mb-2 block">Core Protocol</span>
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-3">The "Triple-Check" Process</h2>
                        <p className="text-slate-600 dark:text-gray-400 text-sm">We cross-reference every land asset across three distinct data dimensions to guarantee absolute authenticity.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                        {/* Connecting Line (Desktop) */}
                        <div className="hidden md:block absolute top-[25%] left-[15%] right-[15%] h-px bg-gray-200 dark:bg-gray-800" />

                        <ProcessCard
                            number="01" title="Computer Vision (OCR)" icon={ScanLine}
                            desc="AI extracts data from physical titles with 99.97% accuracy, converting analog text to structured digital records."
                            features={['Deep Learning OCR', 'Instant Forgery Detection']}
                        />
                        <ProcessCard
                            number="02" title="Real-Time API Sync" icon={Cpu}
                            desc="Extracted data is instantly queried against the National Land Registry to ensure the document hasn't been altered."
                            features={['Gov API Integration', 'Zero-Knowledge Proofs']}
                        />
                        <ProcessCard
                            number="03" title="Geospatial Intel (GIS)" icon={Layers}
                            desc="We map the verified coordinates onto satellite grids to visually confirm physical boundaries down to 1cm precision."
                            features={['3D Terrain Mapping', 'Satellite Data Sync']}
                        />
                    </div>
                </div>
            </section>

            {/* ================= 3. PROBLEM VS SOLUTION (CHALLENGE) ================= */}
            <section id="challenge" className="py-20 lg:py-24 relative z-10 bg-slate-50 dark:bg-[#050c1a] border-b border-gray-200 dark:border-gray-800 scroll-mt-20">
                <div className="w-11/12 mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                        {/* Problem */}
                        <div className="p-8 bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 rounded-2xl">
                            <div className="w-10 h-10 bg-red-50 dark:bg-red-500/10 rounded-lg flex items-center justify-center mb-5 border border-red-100 dark:border-red-500/20">
                                <AlertTriangle size={20} className="text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">The Critical Challenge</h3>
                            <p className="text-slate-600 dark:text-gray-400 mb-6 text-sm leading-relaxed">
                                Conflicting paperwork, sophisticated document forgery, and unclear physical boundaries cause disputes that take years and millions in legal fees to settle.
                            </p>
                            <div className="space-y-4">
                                <StatBar label="Document Forgery Risk" value={78} color="red" />
                                <StatBar label="Boundary Disputes" value={63} color="red" />
                                <StatBar label="Manual Approval Delays" value={92} color="red" />
                            </div>
                        </div>

                        {/* Solution */}
                        <div className="p-8 bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 rounded-2xl">
                            <div className="w-10 h-10 bg-green-50 dark:bg-green-500/10 rounded-lg flex items-center justify-center mb-5 border border-green-100 dark:border-green-500/20">
                                <ShieldCheck size={20} className="text-green-500" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">The SafeLand Solution</h3>
                            <p className="text-slate-600 dark:text-gray-400 mb-6 text-sm leading-relaxed">
                                SafeLand acts as an immutable arbiter. We validate the paperwork, confirm with the government, and map the physics—all in a matter of seconds.
                            </p>
                            <div className="space-y-4">
                                <StatBar label="Verification Speed" value={100} color="green" suffix="%" />
                                <StatBar label="Accuracy Rate" value={99.9} color="green" suffix="%" />
                                <StatBar label="Cost Reduction" value={94} color="green" suffix="%" />
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* ================= 4. STAKEHOLDER BENEFITS (ECOSYSTEM) ================= */}
            <section id="ecosystem" className="py-20 lg:py-24 relative z-10 bg-white dark:bg-[#0a162e] border-b border-gray-200 dark:border-gray-800 scroll-mt-20">
                <div className="w-11/12 mx-auto">
                    <div className="text-center mb-12">
                        <span className="text-xs font-bold text-[#395d91] uppercase tracking-widest mb-2 block">Ecosystem</span>
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">Built for All Stakeholders</h2>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Tabs */}
                        <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 lg:w-1/4 shrink-0 no-scrollbar">
                            <StakeholderTab
                                id="owner" active={activeStakeholder} onClick={setActiveStakeholder}
                                icon={UserCheck} label="Landowners"
                            />
                            <StakeholderTab
                                id="bank" active={activeStakeholder} onClick={setActiveStakeholder}
                                icon={Building2} label="Indivudal"
                            />
                            <StakeholderTab
                                id="buyer" active={activeStakeholder} onClick={setActiveStakeholder}
                                icon={Briefcase} label="Investors & Buyers"
                            />
                        </div>

                        {/* Content */}
                        <div className="flex-1 bg-slate-50 dark:bg-[#112240] border border-gray-200 dark:border-gray-700 rounded-2xl p-6 md:p-8">
                            <AnimatePresence mode="wait">
                                {activeStakeholder === 'bank' && (
                                    <StakeholderContent
                                        key="bank"
                                        title="De-risk Mortgage Lending"
                                        desc="Indivudal using SafeLand have reduced collateral fraud by 94% and cut loan approval times from weeks to mere seconds."
                                        features={['Real-time collateral verification', 'Automated compliance checks', 'Immutable audit trails']}
                                    />
                                )}
                                {activeStakeholder === 'buyer' && (
                                    <StakeholderContent
                                        key="buyer"
                                        title="Invest with Total Confidence"
                                        desc="Verify land assets before acquisition. Eliminate the risk of buying disputed parcels or overlapping boundaries."
                                        features={['Independent verification', 'Historical zoning data', 'Market analysis AI']}
                                    />
                                )}
                                {activeStakeholder === 'owner' && (
                                    <StakeholderContent
                                        key="owner"
                                        title="Protect Your Greatest Asset"
                                        desc="Secure your property against illegal transfers. Register digital boundaries to create a permanent, undisputed record."
                                        features={['Digital boundary registry', 'Encroachment alerts', 'Instant dispute resolution']}
                                    />
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </section>

            {/* ================= 5. TECH STACK (TECHNOLOGY) ================= */}
            <section id="technology" className="py-20 lg:py-24 relative z-10 bg-slate-50 dark:bg-[#050c1a] border-b border-gray-200 dark:border-gray-800 scroll-mt-20">
                <div className="w-11/12 mx-auto">
                    <div className="text-center mb-10">
                        <span className="text-xs font-bold text-[#395d91] uppercase tracking-widest mb-2 block">Architecture</span>
                        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Powered by Advanced AI</h2>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        <TechBadge icon={Brain} label="Deep Learning" />
                        <TechBadge icon={Shield} label="Zero-Knowledge" />
                        <TechBadge icon={Cloud} label="Document Reading" />
                        <TechBadge icon={Satellite} label="Satellite Map" />
                        <TechBadge icon={Radar} label="LIDAR Analysis" />
                    </div>
                </div>
            </section>

            {/* ================= 6. CTA ================= */}
            <section className="py-20 bg-white dark:bg-[#0a162e] relative overflow-hidden">
                <div className="w-11/12 max-w-3xl mx-auto text-center relative z-10">
                    <div className="w-12 h-12 mx-auto mb-5 bg-slate-50 dark:bg-[#112240] border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-center">
                        <Lock size={24} className="text-[#395d91]" />
                    </div>

                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                        Secure Your Land Assets Today.
                    </h2>
                    <p className="text-sm md:text-base text-slate-600 dark:text-gray-400 mb-8">
                        Join organizations already using SafeLand to protect over 5+ parcels with absolute certainty.
                    </p>

                    <div className="flex flex-col sm:flex-row justify-center gap-3">
                        <button onClick={() => window.location.href = "/register"} className="px-6 py-3 bg-[#395d91] hover:bg-[#2d4a75] text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm">
                            Join Us Now
                        </button>
                        <button onClick={() => window.open("mailto:lscblack@nexventures.com")} className="px-6 py-3 bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5 text-slate-900 dark:text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
                            Request Demo
                        </button>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

// ================= SUB-COMPONENTS =================

const ProcessCard = ({ number, title, desc, icon: Icon, features }: any) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 rounded-2xl p-6 h-full flex flex-col hover:border-[#395d91] dark:hover:border-[#395d91] transition-colors shadow-sm"
    >
        <div className="flex justify-between items-start mb-5 z-10 relative">
            <div className="w-10 h-10 bg-slate-50 dark:bg-[#0a162e] border border-gray-200 dark:border-gray-600 rounded-lg flex items-center justify-center">
                <Icon size={18} className="text-[#395d91]" />
            </div>
            <span className="text-2xl font-black text-slate-200 dark:text-gray-800">{number}</span>
        </div>
        <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2 z-10 relative">{title}</h4>
        <p className="text-slate-600 dark:text-gray-400 text-sm leading-relaxed mb-5 z-10 relative flex-1">{desc}</p>

        <div className="space-y-2 mt-auto z-10 relative">
            {features.map((feature: string, i: number) => (
                <div key={i} className="flex items-center gap-2 text-[11px] font-medium text-slate-700 dark:text-gray-300 uppercase tracking-wide">
                    <CheckCircle2 size={12} className="text-green-500" />
                    {feature}
                </div>
            ))}
        </div>
    </motion.div>
);

const StatBar = ({ label, value, color, suffix = '' }: { label: string; value: number; color: string; suffix?: string }) => (
    <div>
        <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-1.5">
            <span className="text-slate-500 dark:text-gray-400">{label}</span>
            <span className="text-slate-900 dark:text-white">{value}{suffix}</span>
        </div>
        <div className="h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
            <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${value}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.2 }}
                className={clsx(
                    "h-full rounded-full",
                    color === 'red' ? 'bg-red-500' : 'bg-green-500',
                )}
            />
        </div>
    </div>
);

const StakeholderTab = ({ id, active, onClick, icon: Icon, label }: any) => (
    <button
        onClick={() => onClick(id)}
        className={clsx(
            "flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-left transition-all whitespace-nowrap border text-sm flex-1 lg:flex-none",
            active === id
                ? "bg-[#395d91] text-white border-[#395d91]"
                : "bg-white dark:bg-[#112240] text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-white/5 border-gray-200 dark:border-gray-700"
        )}
    >
        <Icon size={16} className={clsx(active === id ? "text-white" : "text-[#395d91]")} />
        <span className="truncate">{label}</span>
        {active === id && <ChevronRight size={14} className="ml-auto hidden lg:block" />}
    </button>
);

const StakeholderContent = ({ title, desc, features }: any) => (
    <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
    >
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-600 dark:text-gray-400 mb-5 leading-relaxed max-w-2xl">{desc}</p>
        <div className="grid sm:grid-cols-1 gap-2">
            {features.map((feature: string, i: number) => (
                <div key={i} className="flex items-center gap-2 p-2.5 bg-white dark:bg-[#0a162e] rounded-lg border border-gray-200 dark:border-gray-700">
                    <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                    <span className="text-xs font-medium text-slate-800 dark:text-gray-200">{feature}</span>
                </div>
            ))}
        </div>
    </motion.div>
);

const TechBadge = ({ icon: Icon, label }: any) => (
    <div className="flex flex-col items-center justify-center gap-2 p-3 bg-white dark:bg-[#112240] rounded-xl border border-gray-200 dark:border-gray-700">
        <Icon size={18} className="text-[#395d91]" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-gray-300">{label}</span>
    </div>
);

export const DarkModeOnboardingPage = () => {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';
    return (<>

        {/* --- THEME TOGGLE (Top Right) --- */}
        {/* <div className="absolute top-6 right-6 z-50"> */}
        <button
            onClick={toggleTheme}
            className="p-3 rounded-full bg-white dark:bg-white/10 shadow-lg border border-gray-100 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/20 transition-all text-slate-600 dark:text-white backdrop-blur-md"
        >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        {/* </div> */}
    </>
    )
}