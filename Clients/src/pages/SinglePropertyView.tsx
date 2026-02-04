import  { useState } from 'react';

import { 
  MapPin, Bed, Bath, Maximize, ShieldCheck, Share2, Heart, 
  CheckCircle, Mail, Calendar, ArrowRight
} from 'lucide-react';
import { clsx } from 'clsx';
// --- YOUR CONTEXTS ---
import { useLanguage } from '../contexts/language-context';
import { Navbar } from '../components/navigation/Navbar';
// import { Navbar } from '../components/Navbar'; // Assuming you have a navbar

export const PropertyListingPage = () => {
  const { t } = useLanguage();
  const [isSaved, setIsSaved] = useState(false);

  // Mock Property Data
  const property = {
    title: "Luxury Hilltop Villa with City View",
    address: "KG 123 St, Rebero, Kigali City",
    price: "350,000,000 RWF",
    priceUsd: "$275,000",
    description: "Experience the pinnacle of Kigali living in this stunning Rebero villa. Featuring panoramic views of the city center, this NLA-verified property offers modern architecture blended with local materials. The property includes a large garden, staff quarters, and high-end security systems. Perfect for diplomatic residence or a luxury family home.",
    specs: {
      beds: 5,
      baths: 4.5,
      size: "600 sqm",
      lot: "1,200 sqm",
      zoning: "R1A"
    },
    images: [
      "https://images.unsplash.com/photo-1600596542815-2a429b08b6b9?q=80&w=2069&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=2053&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?q=80&w=2070&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=1974&auto=format&fit=crop",
    ],
    features: ["Swimming Pool", "Garden", "Solar Power", "Security System", "Water Tank", "Paved Access", "Fiber Internet"],
    agent: {
      name: "Jean Paul N.",
      role: "Senior Broker",
      image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&q=80",
      phone: "+250 788 123 456"
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#050c1a] text-slate-900 dark:text-white font-sans">
      <Navbar isFixed={true} />
      <main className="max-w-11/12 mx-auto px-4  sm:px-6 lg:px-8 py-8">
        
        {/* ================= HEADER SECTION ================= */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-primary font-bold uppercase tracking-wide">
              <span className="bg-primary/10 px-2 py-1 rounded">For Sale</span>
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded border border-green-200 dark:border-green-900">
                <ShieldCheck size={14} />
                {t('listing.verified')}
              </span>
            </div>
            <h1 className="text-2xl md:text-4xl font-bold text-secondary dark:text-white leading-tight">
              {property.title}
            </h1>
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <MapPin size={18} />
              <span>{property.address}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button className="p-3 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-white/5 transition-colors">
              <Share2 size={20} className="text-gray-600 dark:text-gray-300" />
            </button>
            <button 
              onClick={() => setIsSaved(!isSaved)}
              className={clsx("p-3 rounded-full border transition-colors", isSaved ? "bg-red-50 border-red-200 text-red-500" : "border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-white/5 text-gray-600 dark:text-gray-300")}
            >
              <Heart size={20} fill={isSaved ? "currentColor" : "none"} />
            </button>
          </div>
        </div>

        {/* ================= IMAGE GALLERY (BENTO GRID) ================= */}
        <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-3 h-[400px] md:h-[500px] rounded-2xl overflow-hidden mb-8">
           {/* Main Image */}
           <div className="col-span-1 md:col-span-2 row-span-2 relative group cursor-pointer">
              <img src={property.images[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
           </div>
           {/* Side Images */}
           {property.images.slice(1, 5).map((img, idx) => (
             <div key={idx} className="relative group cursor-pointer overflow-hidden">
                <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                {idx === 3 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-lg hover:bg-black/40 transition-colors">
                    +5 Photos
                  </div>
                )}
             </div>
           ))}
        </div>

        {/* ================= MAIN CONTENT SPLIT ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* --- LEFT COLUMN: DETAILS --- */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Quick Specs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6 border-y border-gray-200 dark:border-gray-800">
               <div className="flex items-center gap-3">
                 <div className="p-2.5 bg-gray-100 dark:bg-white/5 rounded-lg text-gray-500"><Bed size={24} /></div>
                 <div>
                   <p className="font-bold text-lg dark:text-white">{property.specs.beds}</p>
                   <p className="text-xs text-gray-500 uppercase">Beds</p>
                 </div>
               </div>
               <div className="flex items-center gap-3">
                 <div className="p-2.5 bg-gray-100 dark:bg-white/5 rounded-lg text-gray-500"><Bath size={24} /></div>
                 <div>
                   <p className="font-bold text-lg dark:text-white">{property.specs.baths}</p>
                   <p className="text-xs text-gray-500 uppercase">Baths</p>
                 </div>
               </div>
               <div className="flex items-center gap-3">
                 <div className="p-2.5 bg-gray-100 dark:bg-white/5 rounded-lg text-gray-500"><Maximize size={24} /></div>
                 <div>
                   <p className="font-bold text-lg dark:text-white">{property.specs.size}</p>
                   <p className="text-xs text-gray-500 uppercase">Area</p>
                 </div>
               </div>
               <div className="flex items-center gap-3">
                 <div className="p-2.5 bg-gray-100 dark:bg-white/5 rounded-lg text-gray-500"><ShieldCheck size={24} /></div>
                 <div>
                   <p className="font-bold text-lg dark:text-white">{property.specs.zoning}</p>
                   <p className="text-xs text-gray-500 uppercase">Zoning</p>
                 </div>
               </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-xl font-bold text-secondary dark:text-white mb-3">{t('listing.description')}</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-base">
                {property.description}
              </p>
            </div>

            {/* Features/Amenities */}
            <div>
              <h3 className="text-xl font-bold text-secondary dark:text-white mb-4">{t('listing.features')}</h3>
              <div className="flex flex-wrap gap-3">
                {property.features.map(feat => (
                  <span key={feat} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-[#112240] text-gray-700 dark:text-gray-200 text-sm font-medium flex items-center gap-2">
                    <CheckCircle size={16} className="text-primary" />
                    {feat}
                  </span>
                ))}
              </div>
            </div>

            {/* Location Placeholder */}
            <div>
               <h3 className="text-xl font-bold text-secondary dark:text-white mb-4">{t('listing.location')}</h3>
               <div className="h-64 w-full bg-gray-200 dark:bg-[#112240] rounded-2xl flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 relative overflow-hidden group">
                  {/* Fake Map visual */}
                  <div className="absolute inset-0 opacity-20 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/Kigali_OpenStreetMap.png')] bg-cover bg-center grayscale" />
                  <div className="z-10 bg-white dark:bg-[#0a162e] px-6 py-3 rounded-full shadow-lg flex items-center gap-2">
                    <MapPin className="text-primary" />
                    <span className="font-bold">Map View Disabled</span>
                  </div>
               </div>
            </div>

          </div>


          {/* --- RIGHT COLUMN: STICKY SIDEBAR --- */}
          <div className="lg:col-span-1">
             <div className="sticky top-24 space-y-6">
                
                {/* Price Card */}
                <div className="bg-white dark:bg-[#0a162e] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl shadow-gray-200/50 dark:shadow-none">
                   <div className="mb-6">
                      <p className="text-sm text-gray-500 mb-1">{t('listing.price')}</p>
                      <h2 className="text-3xl font-bold text-primary">{property.price}</h2>
                      <p className="text-sm text-gray-400 font-medium">approx. {property.priceUsd}</p>
                   </div>
                   
                   <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 dark:bg-[#112240] rounded-xl">
                      <img src={property.agent.image} alt="" className="w-12 h-12 rounded-full object-cover" />
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">{property.agent.name}</p>
                        <p className="text-xs text-primary font-semibold">{property.agent.role}</p>
                      </div>
                   </div>

                   <form className="space-y-3">
                      <input type="text" placeholder="Your Name" className="w-full px-4 py-3 bg-white dark:bg-[#0a162e] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none" />
                      <input type="tel" placeholder="Phone Number" className="w-full px-4 py-3 bg-white dark:bg-[#0a162e] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none" />
                      <textarea rows={3} placeholder="I am interested in this property..." className="w-full px-4 py-3 bg-white dark:bg-[#0a162e] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none resize-none"></textarea>
                      
                      <button className="w-full bg-primary hover:bg-[#2d4a75] text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                        <Mail size={18} />
                        {t('listing.contact')}
                      </button>
                      
                      <button type="button" className="w-full bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 hover:border-primary text-gray-700 dark:text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2">
                        <Calendar size={18} />
                        {t('listing.book')}
                      </button>
                   </form>
                </div>

                {/* Safety Warning */}
                <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl flex items-start gap-3">
                   <ShieldCheck className="text-primary flex-shrink-0 mt-0.5" size={20} />
                   <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                     <strong>Safety Tip:</strong> Always verify documents at the NLA office or using SafeLand's online checker before making any payments.
                   </p>
                </div>

             </div>
          </div>

        </div>

        {/* ================= SIMILAR PROPERTIES ================= */}
        <div className="mt-16 pt-10 border-t border-gray-200 dark:border-gray-800">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-secondary dark:text-white">{t('listing.similar')}</h3>
              <a href="#" className="text-primary font-bold text-sm hover:underline flex items-center gap-1">
                View All <ArrowRight size={16} />
              </a>
           </div>
           
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white dark:bg-[#0a162e] border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden group hover:shadow-lg transition-all">
                   <div className="h-48 bg-gray-200 relative overflow-hidden">
                     <img src={`https://source.unsplash.com/random/400x300?house,${i}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                   </div>
                   <div className="p-4">
                     <p className="text-primary font-bold mb-1">280M RWF</p>
                     <h4 className="font-bold text-gray-900 dark:text-white truncate">Modern Family Home</h4>
                     <p className="text-xs text-gray-500 mt-1">Kibagabaga, Kigali</p>
                   </div>
                </div>
              ))}
           </div>
        </div>

      </main>
    </div>
  );
};