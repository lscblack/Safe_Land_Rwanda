import  { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, MapPin, ArrowRight, Home,
    Building2, Trees, Briefcase, ShieldCheck, Heart,
    Zap, Star, ChevronLeft, ChevronRight, LayoutGrid
} from 'lucide-react';
import { clsx } from 'clsx';
// import { useLanguage } from '../contexts/language-context';
import { Navbar } from '../components/navigation/Navbar';
import { Footer } from '../components/navigation/FooterAll';

// --- MOCK DATA ---
const HERO_SLIDES = [
    { id: 1, title: "Kigali Heights Penthouse", loc: "Kimihurura", price: "450M RWF", img: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2053&auto=format&fit=crop", tag: "Exclusive" },
    { id: 2, title: "Lake Kivu Resort Plot", loc: "Rubavu", price: "120M RWF", img: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2032&auto=format&fit=crop", tag: "Investment" },
    { id: 3, title: "Rebero Hillside Estate", loc: "Rebero", price: "380M RWF", img: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2053&auto=format&fit=crop", tag: "Hot Deal" },
];

const PROPERTIES = {
    land: Array(6).fill(null).map((_, i) => ({ id: `l-${i}`, title: `Residential Plot Block ${i + 1}`, loc: "Gacuriro, Kigali", price: `${50 + i * 5}M RWF`, img: `https://www.karmod.com/media/blog/98/prefab-house-in-rwanda-cover.jpg`, verified: i % 2 === 0 })),
    houses: Array(8).fill(null).map((_, i) => ({ id: `h-${i}`, title: `Modern Villa ${i + 1}`, loc: "Nyarutarama", price: `${200 + i * 20}M RWF`, img: `https://www.karmod.com/media/blog/98/prefab-house-in-rwanda-cover.jpg`, verified: true })),
    commercial: Array(4).fill(null).map((_, i) => ({ id: `c-${i}`, title: `Office Space ${i + 1}`, loc: "CBD", price: `${150 + i * 10}M RWF`, img: `https://www.karmod.com/media/blog/98/prefab-house-in-rwanda-cover.jpg`, verified: true })),
};

export const MarketplaceIndex = () => {
    // const { t } = useLanguage();
    const [activeCategory, setActiveCategory] = useState('All');

    return (
        <>
            <div className="min-h-screen bg-white dark:bg-[#050c1a] text-slate-900 dark:text-white font-sans transition-colors duration-300">

                {/* 1. NAVBAR PLACEHOLDER */}
                <Navbar isFixed={true} />

                {/* ================= 2. HERO SLIDER SECTION ================= */}
                <section className="w-full mx-auto overflow-hidden relative h-[500px] group">
                    <HeroCarousel slides={HERO_SLIDES} />
                </section>


                {/* ================= 3. STICKY FILTER BAR ================= */}
                <div className="sticky top-30 z-40 bg-white/90 dark:bg-[#050c1a]/90 backdrop-blur-lg border-b border-gray-100 dark:border-gray-800 py-4 mb-8">
                    <div className="w-11/12 mx-auto flex flex-col md:flex-row gap-4 justify-between items-center">

                        {/* Quick Categories */}
                        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1 scrollbar-hide">
                            {['All', 'Land', 'Residential', 'Commercial', 'Industrial'].map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={clsx(
                                        "px-5 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap border",
                                        activeCategory === cat
                                            ? "bg-primary text-white border-primary"
                                            : "bg-gray-50 dark:bg-[#112240] border-transparent text-gray-500 hover:border-gray-300"
                                    )}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* Search Input */}
                        <div className="relative w-full md:w-96 group">
                            <Search className="absolute left-3 top-2.5 text-gray-400 group-focus-within:text-primary transition-colors" size={20} />
                            <input
                                type="text"
                                placeholder="Search by location, price, or ID..."
                                className="w-full bg-gray-100 dark:bg-[#112240] border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary/50 text-gray-900 dark:text-white transition-all"
                            />
                        </div>
                    </div>
                </div>


                {/* ================= 4. CONTENT SECTIONS ================= */}
                <main className="w-11/12 mx-auto space-y-20 pb-20">

                    {/* --- SECTION A: LAND (Horizontal Slider / Netflix Style) --- */}
                    <section>
                        <SectionHeader title="Prime Land & Plots" subtitle="Verified titles ready for development" icon={Trees} />

                        {/* Horizontal Scroll Container */}
                        <div className="relative group">
                            <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide snap-x snap-mandatory">
                                {PROPERTIES.land.map((item) => (
                                    <div key={item.id} className="min-w-[300px] md:min-w-[350px] snap-center">
                                        <PropertyCard item={item} />
                                    </div>
                                ))}
                            </div>
                            {/* Fade edges for scroll indication */}
                            <div className="absolute top-0 right-0 h-full w-20 bg-gradient-to-l from-white dark:from-[#050c1a] to-transparent pointer-events-none" />
                        </div>
                    </section>


                    {/* --- SECTION B: PREMIUM DARK SECTION (Visual Break) --- */}
                    <section className="bg-[#0a162e] rounded-3xl p-8 md:p-12 relative overflow-hidden text-white">
                        {/* Background Decor */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />

                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between mb-8">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Star className="fill-yellow-400 text-yellow-400" size={16} />
                                    <span className="text-yellow-400 font-bold uppercase tracking-widest text-xs">Premium Collection</span>
                                </div>
                                <h2 className="text-3xl md:text-4xl font-bold">SafeLand Exclusive</h2>
                                <p className="text-blue-200 mt-2 max-w-lg">Handpicked luxury properties vetted by our senior agents for quality and value.</p>
                            </div>
                            <button className="mt-4 md:mt-0 px-6 py-3 bg-white text-[#0a162e] font-bold rounded-xl hover:bg-gray-100 transition-colors">
                                View Collection
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {PROPERTIES.houses.slice(0, 3).map((item) => (
                                <div key={item.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-colors cursor-pointer group">
                                    <div className="h-48 rounded-xl overflow-hidden bg-black/20 mb-4 relative">
                                        <img src={item.img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-xs font-bold">
                                            {item.price}
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-lg truncate">{item.title}</h3>
                                    <p className="text-gray-400 text-sm flex items-center gap-1 mt-1"><MapPin size={12} /> {item.loc}</p>
                                </div>
                            ))}
                        </div>
                    </section>


                    {/* --- SECTION C: EXPLORE BY TYPE (Colored Cards) --- */}
                    <section>
                        <SectionHeader title="Browse by Category" subtitle="Find exactly what you need" icon={LayoutGrid} />
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <CategoryCard title="Residential" count="1,240" color="bg-blue-50 dark:bg-blue-900/20" textColor="text-blue-600 dark:text-blue-300" icon={Home} />
                            <CategoryCard title="Commercial" count="85" color="bg-purple-50 dark:bg-purple-900/20" textColor="text-purple-600 dark:text-purple-300" icon={Building2} />
                            <CategoryCard title="Land & Plots" count="432" color="bg-green-50 dark:bg-green-900/20" textColor="text-green-600 dark:text-green-300" icon={Trees} />
                            <CategoryCard title="Industrial" count="12" color="bg-orange-50 dark:bg-orange-900/20" textColor="text-orange-600 dark:text-orange-300" icon={Briefcase} />
                        </div>
                    </section>


                    {/* --- SECTION D: NEW LISTINGS (Standard Grid) --- */}
                    <section>
                        <SectionHeader title="Fresh on Market" subtitle="Latest verified listings added today" icon={Zap} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {PROPERTIES.houses.slice(3, 7).map((item) => (
                                <PropertyCard key={item.id} item={item} />
                            ))}
                        </div>
                        <div className="mt-8 text-center">
                            <button className="px-8 py-3 border border-gray-200 dark:border-gray-700 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                Load More Properties
                            </button>
                        </div>
                    </section>

                </main>
            </div>
            <Footer />
        </>
    );
};


// ===============================================
// HELPER COMPONENTS
// ===============================================

// 1. HERO CAROUSEL COMPONENT
const HeroCarousel = ({ slides }: { slides: any[] }) => {
    const [current, setCurrent] = useState(0);

    const next = () => setCurrent((prev) => (prev + 1) % slides.length);
    const prev = () => setCurrent((prev) => (prev - 1 + slides.length) % slides.length);

    // Auto-advance
    useEffect(() => {
        const timer = setInterval(next, 5000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="w-full h-full relative bg-gray-900">
            <AnimatePresence mode="wait">
                <motion.div
                    key={current}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.7 }}
                    className="absolute inset-0"
                >
                    <img src={slides[current].img} alt="" className="w-full h-full object-cover opacity-60" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050c1a] via-transparent to-transparent" />

                    {/* Content */}
                    <div className="absolute bottom-0 left-0 p-8 md:p-16 w-full md:w-2/3">
                        <motion.span
                            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                            className="px-3 py-1 bg-primary text-white text-xs font-bold uppercase tracking-wider rounded-md mb-4 inline-block"
                        >
                            {slides[current].tag}
                        </motion.span>
                        <motion.h2
                            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
                            className="text-4xl md:text-6xl font-bold text-white mb-4 leading-tight"
                        >
                            {slides[current].title}
                        </motion.h2>
                        <motion.div
                            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
                            className="flex items-center gap-6"
                        >
                            <span className="text-2xl md:text-3xl text-white font-bold">{slides[current].price}</span>
                            <button className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-2">
                                View Details <ArrowRight size={18} />
                            </button>
                        </motion.div>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Controls */}
            <div className="absolute bottom-8 right-8 flex gap-2">
                <button onClick={prev} className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"><ChevronLeft size={24} /></button>
                <button onClick={next} className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"><ChevronRight size={24} /></button>
            </div>
        </div>
    );
};


// 2. SECTION HEADER
const SectionHeader = ({ title, subtitle, icon: Icon }: any) => (
    <div className="flex items-end justify-between mb-8 border-b border-gray-100 dark:border-gray-800 pb-4">
        <div>
            <div className="flex items-center gap-2 text-primary font-bold mb-1">
                <Icon size={18} />
                <span className="text-xs uppercase tracking-wider">Marketplace</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
        </div>
        <button className="hidden md:flex items-center gap-1 text-sm font-bold text-primary hover:text-blue-500 transition-colors">
            See All <ArrowRight size={16} />
        </button>
    </div>
);


// 3. PROPERTY CARD (Flat Design)
const PropertyCard = ({ item }: any) => (
    <div className="group bg-white dark:bg-[#0a162e] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden hover:border-primary/50 transition-all cursor-pointer h-full flex flex-col">
        <div className="relative h-56 bg-gray-200 dark:bg-[#112240] overflow-hidden">
            <img src={item.img} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />

            <div className="absolute top-3 right-3">
                <button className="p-2 bg-black/20 hover:bg-black/50 backdrop-blur-md rounded-full text-white transition-colors">
                    <Heart size={18} />
                </button>
            </div>

            {item.verified && (
                <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-1 bg-white/95 dark:bg-[#0a162e]/95 backdrop-blur-sm rounded-lg border border-gray-100 dark:border-gray-700">
                    <ShieldCheck size={14} className="text-green-500" />
                    <span className="text-[10px] font-bold uppercase text-gray-900 dark:text-white">Verified</span>
                </div>
            )}
        </div>

        <div className="p-5 flex flex-col flex-1">
            <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-gray-900 dark:text-white text-lg truncate pr-2 group-hover:text-primary transition-colors">
                    {item.title}
                </h3>
            </div>
            <div className="flex items-center gap-1.5 text-gray-500 text-sm mb-4">
                <MapPin size={14} />
                <span>{item.loc}</span>
            </div>

            <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div>
                    <p className="text-xs text-gray-400 font-medium uppercase">Price</p>
                    <p className="text-xl font-bold text-primary">{item.price}</p>
                </div>
                <div className="p-2 bg-gray-50 dark:bg-white/5 rounded-lg text-gray-400 group-hover:text-primary transition-colors">
                    <ArrowRight size={20} />
                </div>
            </div>
        </div>
    </div>
);


// 4. CATEGORY CARD (Visual Tiles)
const CategoryCard = ({ title, count, color, textColor, icon: Icon }: any) => (
    <div className={clsx("p-6 rounded-2xl flex flex-col justify-between h-40 cursor-pointer hover:scale-[1.02] transition-transform", color)}>
        <div className="flex justify-between items-start">
            <div className={clsx("p-3 rounded-xl bg-white/50 dark:bg-black/10 backdrop-blur-sm", textColor)}>
                <Icon size={24} />
            </div>
            <span className={clsx("font-bold text-2xl", textColor)}>{count}</span>
        </div>
        <div>
            <h3 className={clsx("font-bold text-lg", textColor)}>{title}</h3>
            <p className={clsx("text-xs font-medium opacity-70", textColor)}>Active Listings</p>
        </div>
    </div>
);
