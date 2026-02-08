import  { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, Star, Building2, User, MapPin, 
  ArrowRight, BadgeCheck, Briefcase, CheckCircle2,
  TrendingUp, LayoutGrid, ShieldCheck
} from 'lucide-react';
import { clsx } from 'clsx';
import { Navbar } from '../components/navigation/Navbar';
import { Footer } from '../components/navigation/FooterAll';

// --- MOCK DATA ---
const TOP_AGENCIES = [
  {
    id: 1,
    name: "Kigali Prime Estates",
    logo: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=200&auto=format&fit=crop",
    rating: 4.9,
    deals: 342,
    specialty: "Luxury Residential",
    location: "Nyarutarama"
  },
  {
    id: 2,
    name: "Vision City Realty",
    logo: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=200&auto=format&fit=crop",
    rating: 4.8,
    deals: 510,
    specialty: "Urban Development",
    location: "Gacuriro"
  }
];

const TOP_BROKERS = [
  {
    id: 3,
    name: "Jean Paul M.",
    photo: "https://images.unsplash.com/photo-1556157382-97eda2d62296?q=80&w=200&auto=format&fit=crop",
    rating: 5.0,
    deals: 128,
    specialty: "Commercial Land",
    location: "Musanze"
  },
  {
    id: 4,
    name: "Sarah K.",
    photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop",
    rating: 4.9,
    deals: 89,
    specialty: "Residential Plots",
    location: "Rubavu"
  }
];

const ALL_PROFESSIONALS = [
  { id: 5, type: 'Agency', name: "Swift Homes", rating: 4.7, listings: 45, location: "Kigali" },
  { id: 6, type: 'Broker', name: "David N.", rating: 4.6, listings: 8, location: "Kigali" },
  { id: 7, type: 'Agency', name: "EcoLand Rwanda", rating: 4.5, listings: 23, location: "Bugesera" },
  { id: 8, type: 'Broker', name: "Alice U.", rating: 4.8, listings: 15, location: "Huye" },
  { id: 9, type: 'Agency', name: "Urban Connect", rating: 4.4, listings: 30, location: "Kigali" },
  { id: 10, type: 'Broker', name: "Eric G.", rating: 4.3, listings: 5, location: "Rusizi" },
];

export const AgenciesPage = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'agencies' | 'brokers'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <>
      <Navbar isFixed={true} />
      <div className="min-h-screen bg-gray-50 dark:bg-[#050c1a] text-slate-900 dark:text-white font-sans transition-colors duration-300">

        {/* ================= 1. HERO SECTION ================= */}
        <section className="relative pt-32 pb-20 bg-[#0a162e] overflow-hidden">
           {/* Background Tech Grid */}
           <div className="absolute inset-0 opacity-[0.05]" 
              style={{ backgroundImage: 'linear-gradient(#395d91 1px, transparent 1px), linear-gradient(90deg, #395d91 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
           />
           
           <div className="w-11/12 mx-auto relative z-10 text-center max-w-4xl">
              <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-6"
              >
                 <ShieldCheck size={14} />
                 <span>SafeLand Verified Network</span>
              </motion.div>

              <motion.h1 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.1 }}
                 className="text-4xl md:text-6xl font-bold text-white mb-6"
              >
                 Find Trusted <br/>
                 <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">Agencies & Brokers.</span>
              </motion.h1>

              <motion.p 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 transition={{ delay: 0.2 }}
                 className="text-lg text-blue-100/70 mb-10 max-w-2xl mx-auto"
              >
                 Connect with Rwanda's top-rated real estate professionals. Every broker listed here is verified against National ID and RDB records.
              </motion.p>

              {/* SEARCH BAR */}
              <motion.div 
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 transition={{ delay: 0.3 }}
                 className="bg-white dark:bg-[#112240]/90 backdrop-blur-md p-2 rounded-2xl flex items-center border border-gray-200 dark:border-gray-700 max-w-2xl mx-auto shadow-xl"
              >
                 <Search className="text-gray-400 ml-4" size={20} />
                 <input 
                   type="text" 
                   placeholder="Search for an agency, broker, or location..." 
                   className="flex-1 bg-transparent border-none outline-none px-4 py-3 text-slate-900 dark:text-white placeholder-gray-500"
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                 />
                 <button className="bg-primary hover:bg-[#2d4a75] text-white px-6 py-3 rounded-xl font-bold transition-colors">
                    Search
                 </button>
              </motion.div>
           </div>
        </section>


        {/* ================= 2. HALL OF FAME (Split Section) ================= */}
        <section className="py-20 w-11/12 mx-auto">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              
              {/* --- LEFT: TOP AGENCIES --- */}
              <div>
                 <div className="flex items-center justify-between mb-8">
                    <div>
                       <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                          <Building2 className="text-primary" /> Top Agencies
                       </h2>
                       <p className="text-gray-500 text-sm">Leading firms with highest volume</p>
                    </div>
                    <a href="#" className="text-sm font-bold text-primary hover:underline">View All</a>
                 </div>

                 <div className="space-y-4">
                    {TOP_AGENCIES.map((agency, idx) => (
                       <motion.div 
                         key={agency.id}
                         initial={{ opacity: 0, x: -20 }}
                         whileInView={{ opacity: 1, x: 0 }}
                         transition={{ delay: idx * 0.1 }}
                         className="flex flex-col sm:flex-row gap-4 p-5 rounded-2xl bg-white dark:bg-[#0a162e] border border-gray-200 dark:border-gray-800 hover:border-primary/50 hover:shadow-lg transition-all"
                       >
                          <img src={agency.logo} alt={agency.name} className="w-20 h-20 rounded-xl object-cover" />
                          <div className="flex-1">
                             <div className="flex justify-between items-start">
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white">{agency.name}</h3>
                                <div className="flex items-center gap-1 text-amber-500 font-bold text-sm bg-amber-500/10 px-2 py-0.5 rounded-lg">
                                   <Star size={12} fill="currentColor" /> {agency.rating}
                                </div>
                             </div>
                             <p className="text-xs text-gray-500 mb-3 flex items-center gap-1"><MapPin size={10} /> {agency.location}</p>
                             
                             <div className="flex items-center gap-4 mt-2">
                                <button className="flex-1 sm:flex-none px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-[#2d4a75] transition-colors flex items-center gap-2 justify-center">
                                   <LayoutGrid size={14} /> View Collections
                                </button>
                                <span className="text-xs font-medium text-gray-500">{agency.deals} Properties Sold</span>
                             </div>
                          </div>
                       </motion.div>
                    ))}
                 </div>
              </div>

              {/* --- RIGHT: TOP BROKERS --- */}
              <div>
                 <div className="flex items-center justify-between mb-8">
                    <div>
                       <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                          <User className="text-green-500" /> Top Brokers
                       </h2>
                       <p className="text-gray-500 text-sm">Highest rated individual agents</p>
                    </div>
                    <a href="#" className="text-sm font-bold text-green-500 hover:underline">View All</a>
                 </div>

                 <div className="space-y-4">
                    {TOP_BROKERS.map((broker, idx) => (
                       <motion.div 
                         key={broker.id}
                         initial={{ opacity: 0, x: 20 }}
                         whileInView={{ opacity: 1, x: 0 }}
                         transition={{ delay: idx * 0.1 }}
                         className="flex flex-col sm:flex-row gap-4 p-5 rounded-2xl bg-white dark:bg-[#0a162e] border border-gray-200 dark:border-gray-800 hover:border-green-500/50 hover:shadow-lg transition-all"
                       >
                          <img src={broker.photo} alt={broker.name} className="w-20 h-20 rounded-full object-cover border-2 border-green-500/20" />
                          <div className="flex-1">
                             <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                   <h3 className="font-bold text-lg text-slate-900 dark:text-white">{broker.name}</h3>
                                   <BadgeCheck size={16} className="text-green-500" />
                                </div>
                                <div className="flex items-center gap-1 text-amber-500 font-bold text-sm bg-amber-500/10 px-2 py-0.5 rounded-lg">
                                   <Star size={12} fill="currentColor" /> {broker.rating}
                                </div>
                             </div>
                             <p className="text-xs text-gray-500 mb-3 flex items-center gap-1"><MapPin size={10} /> {broker.location}</p>
                             
                             <div className="flex items-center gap-4 mt-2">
                                <button className="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 justify-center">
                                   <TrendingUp size={14} /> See Best Deals
                                </button>
                                <span className="text-xs font-medium text-gray-500">{broker.deals} Deals Closed</span>
                             </div>
                          </div>
                       </motion.div>
                    ))}
                 </div>
              </div>

           </div>
        </section>


        {/* ================= 3. MARKETPLACE DIRECTORY ================= */}
        <section className="py-20 bg-white dark:bg-[#0b1221] border-t border-gray-200 dark:border-gray-800">
           <div className="w-11/12 mx-auto">
              
              {/* HEADER & FILTERS */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-10">
                 <div>
                    <h2 className="text-2xl font-bold mb-1 text-slate-900 dark:text-white">Browse All Professionals</h2>
                    <p className="text-gray-500 text-sm">Showing {ALL_PROFESSIONALS.length} verified results</p>
                 </div>

                 <div className="flex gap-4">
                    <div className="flex p-1 bg-gray-100 dark:bg-[#112240] rounded-xl">
                       {['all', 'agencies', 'brokers'].map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={clsx(
                               "px-6 py-2 rounded-lg text-sm font-bold capitalize transition-all",
                               activeTab === tab 
                                  ? "bg-white dark:bg-primary text-slate-900 dark:text-white shadow-sm" 
                                  : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
                            )}
                          >
                             {tab}
                          </button>
                       ))}
                    </div>
                 </div>
              </div>

              {/* GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 {ALL_PROFESSIONALS
                    .filter(p => activeTab === 'all' || p.type.toLowerCase() === activeTab.slice(0, -1))
                    .map((pro) => (
                    <motion.div 
                       key={pro.id}
                       initial={{ opacity: 0, scale: 0.98 }}
                       whileInView={{ opacity: 1, scale: 1 }}
                       viewport={{ once: true }}
                       className="bg-gray-50 dark:bg-[#0a162e] border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:border-primary/50 transition-colors group flex flex-col"
                    >
                       <div className="flex justify-between items-start mb-4">
                          <div className="w-12 h-12 rounded-full bg-white dark:bg-white/5 flex items-center justify-center border border-gray-200 dark:border-gray-700 text-gray-400 group-hover:text-primary transition-colors">
                             {pro.type === 'Agency' ? <Building2 size={20} /> : <User size={20} />}
                          </div>
                          <div className="bg-blue-500/10 text-blue-500 p-1.5 rounded-full" title="Verified">
                             <BadgeCheck size={16} />
                          </div>
                       </div>

                       <h4 className="font-bold text-lg mb-1 text-slate-900 dark:text-white">{pro.name}</h4>
                       <p className="text-xs text-gray-500 mb-4 flex items-center gap-1">
                          <MapPin size={12} /> {pro.location}
                       </p>

                       <div className="flex items-center justify-between text-sm mb-6 bg-white dark:bg-white/5 p-3 rounded-lg border border-gray-100 dark:border-white/5 mt-auto">
                          <div className="flex flex-col">
                             <span className="text-gray-400 text-xs">Rating</span>
                             <span className="font-bold flex items-center gap-1 text-slate-900 dark:text-white">
                                <Star size={12} className="text-amber-500 fill-current" /> {pro.rating}
                             </span>
                          </div>
                          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700"></div>
                          <div className="flex flex-col text-right">
                             <span className="text-gray-400 text-xs">Active Listings</span>
                             <span className="font-bold text-slate-900 dark:text-white">{pro.listings}</span>
                          </div>
                       </div>

                       {/* Call to Action Button */}
                       <button className="w-full py-2.5 rounded-lg border border-primary/20 bg-primary/5 text-primary font-bold text-sm hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2">
                          View Collections <ArrowRight size={14} />
                       </button>
                    </motion.div>
                 ))}
              </div>
              
              <div className="mt-12 text-center">
                 <button className="px-8 py-3 bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-slate-900 dark:text-white">
                    Load More Professionals
                 </button>
              </div>

           </div>
        </section>


        {/* ================= 4. HOW TO CHOOSE GUIDE ================= */}
        <section className="py-20 bg-gray-50 dark:bg-[#0a162e] border-t border-gray-200 dark:border-gray-800">
           <div className="w-11/12 mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              <div>
                 <div className="inline-flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-xs mb-4">
                    <ShieldCheck size={14} /> Buyer's Guide
                 </div>
                 <h2 className="text-3xl font-bold mb-6 text-slate-900 dark:text-white">How to Choose the Right Partner</h2>
                 <p className="text-gray-600 dark:text-gray-400 text-lg mb-8 leading-relaxed">
                    Not sure who to work with? Here are three things we check for every professional on SafeLand, and you should too.
                 </p>
                 
                 <div className="space-y-6">
                    <TrustPoint 
                       icon={BadgeCheck} 
                       title="RDB & NLA Verification" 
                       desc="Ensure they have a valid business license and National ID registration." 
                    />
                    <TrustPoint 
                       icon={Briefcase} 
                       title="Track Record" 
                       desc="Look for brokers with at least 10+ verified closings in your target area." 
                    />
                    <TrustPoint 
                       icon={Star} 
                       title="Client Reviews" 
                       desc="Read feedback from previous buyers about their communication and honesty." 
                    />
                 </div>
              </div>

              {/* Visual Card */}
              <div className="relative flex justify-center">
                 <div className="absolute inset-0 bg-primary/10 blur-[80px] rounded-full"></div>
                 <div className="relative bg-white dark:bg-[#112240] p-8 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl max-w-sm w-full">
                    <div className="flex items-center gap-4 mb-6">
                       <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-primary">
                          <CheckCircle2 size={28} />
                       </div>
                       <div>
                          <h4 className="font-bold text-lg text-slate-900 dark:text-white">SafeLand Certified</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Trust Badge</p>
                       </div>
                    </div>
                    <div className="space-y-3">
                       <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full w-full"></div>
                       <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full w-5/6"></div>
                       <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full w-4/6"></div>
                    </div>
                    <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                       <p className="text-sm text-center text-gray-500">
                          Look for this badge on every profile to ensure your funds are safe.
                       </p>
                    </div>
                 </div>
              </div>
           </div>
        </section>


        {/* ================= 5. CTA: JOIN THE NETWORK ================= */}
        <section className="py-24 bg-primary text-white relative overflow-hidden">
           {/* Abstract Shapes */}
           <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
           
           <div className="w-11/12 mx-auto relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="max-w-2xl">
                 <h2 className="text-3xl md:text-5xl font-bold mb-6">Are you a Real Estate Pro?</h2>
                 <p className="text-blue-100 text-lg mb-8 leading-relaxed">
                    Join the SafeLand network today. Get verified, list properties on the blockchain, and access thousands of trusted buyers instantly.
                 </p>
                 <div className="flex flex-wrap gap-6 mb-8">
                    <div className="flex items-center gap-2 text-sm font-bold bg-white/10 px-4 py-2 rounded-lg">
                       <CheckCircle2 size={16} /> Free Verification
                    </div>
                    <div className="flex items-center gap-2 text-sm font-bold bg-white/10 px-4 py-2 rounded-lg">
                       <CheckCircle2 size={16} /> Direct NLA Access
                    </div>
                    <div className="flex items-center gap-2 text-sm font-bold bg-white/10 px-4 py-2 rounded-lg">
                       <CheckCircle2 size={16} /> Lead Dashboard
                    </div>
                 </div>
                 <button className="px-8 py-4 bg-white text-primary font-bold rounded-xl shadow-lg hover:bg-blue-50 transition-colors flex items-center gap-2">
                    Register as Broker/Agency <ArrowRight size={20} />
                 </button>
              </div>

              {/* Stats Visual */}
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-2xl max-w-sm w-full">
                 <div className="text-center">
                    <p className="font-bold text-4xl mb-1">850+</p>
                    <p className="text-xs text-blue-200 uppercase tracking-widest">Active Partners</p>
                 </div>
              </div>
           </div>
        </section>

      </div>
      <Footer />
    </>
  );
};

// --- SUB COMPONENTS ---
const TrustPoint = ({ icon: Icon, title, desc }: any) => (
   <div className="flex gap-4">
      <div className="w-10 h-10 bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center text-primary flex-shrink-0">
         <Icon size={20} />
      </div>
      <div>
         <h4 className="font-bold text-slate-900 dark:text-white mb-1">{title}</h4>
         <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
      </div>
   </div>
);