import  { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  MapPin, Navigation, ShieldCheck, ArrowRight, 
  ChevronLeft, ChevronRight, Zap 
} from 'lucide-react';
import { useLanguage } from '../../contexts/language-context';

// --- MOCK DATA (In a real app, fetch based on lat/long) ---
const NEARBY_DEALS = [
  {
    id: 1,
    title: "Rebero Horizon Plot",
    location: "Rebero, Kigali",
    price: "45M RWF",
    oldPrice: "55M RWF",
    distance: "1.2 km away",
    img: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2032&auto=format&fit=crop",
    verified: true,
    tag: "Hot Deal"
  },
  {
    id: 2,
    title: "Kagarama Modern Home",
    location: "Kagarama, Kicukiro",
    price: "120M RWF",
    oldPrice: "140M RWF",
    distance: "3.5 km away",
    img: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=2032&auto=format&fit=crop",
    verified: true,
    tag: "Price Drop"
  },
  {
    id: 3,
    title: "City Center Commercial",
    location: "CBD, Kigali",
    price: "350M RWF",
    oldPrice: "380M RWF",
    distance: "5.0 km away",
    img: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop",
    verified: true,
    tag: "Exclusive"
  },
  {
    id: 4,
    title: "Gacuriro View Apt",
    location: "Gacuriro, Kigali",
    price: "85M RWF",
    oldPrice: "95M RWF",
    distance: "6.2 km away",
    img: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=735&auto=format&fit=crop",
    verified: true,
    tag: "Trending"
  }
,  {
    id: 4,
    title: "Gacuriro View Apt",
    location: "Gacuriro, Kigali",
    price: "85M RWF",
    oldPrice: "95M RWF",
    distance: "6.2 km away",
    img: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=735&auto=format&fit=crop",
    verified: true,
    tag: "Trending"
  }
,  {
    id: 4,
    title: "Gacuriro View Apt",
    location: "Gacuriro, Kigali",
    price: "85M RWF",
    oldPrice: "95M RWF",
    distance: "6.2 km away",
    img: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=735&auto=format&fit=crop",
    verified: true,
    tag: "Trending"
  }
];

export const HotDealsLocation = () => {
  const { t } = useLanguage();
  const [userLocation, setUserLocation] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Simulate Geolocation Logic
  useEffect(() => {
    // In real app: navigator.geolocation.getCurrentPosition(...)
    const timer = setTimeout(() => {
      setUserLocation("Kigali, Rwanda"); // Mock result
      setIsLocating(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Scroll Handlers
  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { current } = scrollRef;
      const scrollAmount = direction === 'left' ? -350 : 350;
      current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section className="py-16 bg-slate-50 dark:bg-background overflow-hidden">
      <div className="w-11/12 mx-auto">
        
        {/* ================= HEADER SECTION ================= */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold mb-2">
               <Zap className="fill-yellow-400 text-yellow-400" size={20} />
               <span className="uppercase tracking-wider text-sm">{t('hotDeals.exclusive')}</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-secondary dark:text-white">
              {t('hotDeals.title')}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">
              {t('hotDeals.subtitle')}
            </p>
          </div>

          {/* Location Badge */}
          <div className="flex items-center gap-3 bg-gray-50 dark:bg-[#0a162e] border border-gray-200 dark:border-gray-800 rounded-full px-5 py-2.5 shadow-sm">
             <div className="relative flex h-3 w-3">
               {isLocating && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>}
               <span className={`relative inline-flex rounded-full h-3 w-3 ${isLocating ? 'bg-blue-500' : 'bg-green-500'}`}></span>
             </div>
             <div>
                <p className="text-xs text-gray-400 font-bold uppercase">
                  {isLocating ? t('hotDeals.locating') : t('hotDeals.locationFound')}
                </p>
                <p className="text-sm font-bold text-secondary dark:text-white leading-none">
                  {userLocation || "Detecting..."}
                </p>
             </div>
             {!isLocating && (
                <button className="ml-2 text-xs font-semibold text-primary hover:underline">
                   {t('hotDeals.updateLocation')}
                </button>
             )}
          </div>
        </div>


        {/* ================= MAP + SLIDER CONTAINER ================= */}
        <div className="relative rounded-3xl overflow-hidden bg-gray-100 dark:bg-[#0f1f3a] h-[550px] group">
           
           {/* 1. BACKGROUND MAP (Static Placeholder) */}
           <div className="absolute inset-0 opacity-40 dark:opacity-20 transition-opacity duration-500">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/e/ec/Kigali_OpenStreetMap.png" 
                alt="Map Background" 
                className="w-full h-full object-cover grayscale"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-white dark:from-[#050c1a] dark:to-[#050c1a]" />
           </div>

           {/* 2. RADAR PULSE (Visualizing User Location) */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none">
              <motion.div 
                 animate={{ scale: [1, 3], opacity: [0.3, 0] }}
                 transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }}
                 className="w-64 h-64 bg-primary/20 rounded-full blur-3xl"
              />
              <div className="w-4 h-4 bg-primary rounded-full shadow-[0_0_20px_rgba(57,93,145,0.6)] relative z-10">
                 <div className="absolute -top-8 -left-12 bg-black/80 text-white text-[10px] px-2 py-1 rounded backdrop-blur-md whitespace-nowrap">
                    You are here
                 </div>
              </div>
           </div>


           {/* 3. CAROUSEL OVERLAY */}
           <div className="absolute bottom-0 left-0 w-full h-auto p-8 z-10">
              
              {/* Controls */}
              <div className="flex justify-end gap-3 mb-4">
                 <button onClick={() => scroll('left')} className="p-3 rounded-full bg-white/80 dark:bg-black/50 backdrop-blur-md text-secondary dark:text-white hover:bg-white dark:hover:bg-black transition-all shadow-lg border border-white/20">
                    <ChevronLeft size={20} />
                 </button>
                 <button onClick={() => scroll('right')} className="p-3 rounded-full bg-white/80 dark:bg-black/50 backdrop-blur-md text-secondary dark:text-white hover:bg-white dark:hover:bg-black transition-all shadow-lg border border-white/20">
                    <ChevronRight size={20} />
                 </button>
              </div>

              {/* Slider Track */}
              <div 
                ref={scrollRef}
                className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
              >
                 {NEARBY_DEALS.map((deal) => (
                    <motion.div 
                       key={deal.id}
                       initial={{ opacity: 0, y: 20 }}
                       whileInView={{ opacity: 1, y: 0 }}
                       viewport={{ once: true }}
                       className="min-w-[320px] md:min-w-[360px] snap-center bg-white/90 dark:bg-[#0a162e]/90 backdrop-blur-xl border border-white/20 dark:border-gray-700 rounded-2xl p-4 shadow-2xl hover:shadow-primary/10 transition-all duration-300 group/card cursor-pointer"
                    >
                       <div className="h-48 rounded-xl overflow-hidden relative mb-4">
                          <img src={deal.img} alt={deal.title} className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-700" />
                          <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow-sm">
                             {deal.tag}
                          </div>
                          {deal.verified && (
                             <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-white/90 dark:bg-black/70 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold uppercase text-secondary dark:text-white">
                                <ShieldCheck size={12} className="text-green-500" /> Verified
                             </div>
                          )}
                       </div>

                       <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-lg text-secondary dark:text-white truncate w-2/3">{deal.title}</h3>
                          <div className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                             <Navigation size={12} fill="currentColor" /> {deal.distance}
                          </div>
                       </div>

                       <p className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-1 mb-4">
                          <MapPin size={14} /> {deal.location}
                       </p>

                       <div className="flex items-end justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
                          <div>
                             <p className="text-xs text-gray-400 line-through">{deal.oldPrice}</p>
                             <p className="text-xl font-bold text-primary">{deal.price}</p>
                          </div>
                          <button className="flex items-center gap-2 bg-secondary dark:bg-primary text-white dark:text-secondary px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary dark:hover:bg-gray-200 transition-colors">
                             {t('hotDeals.viewDeal')} <ArrowRight size={16} />
                          </button>
                       </div>
                    </motion.div>
                 ))}
              </div>
           </div>

        </div>
      </div>
    </section>
  );
};