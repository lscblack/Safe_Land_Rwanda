
import { motion } from 'framer-motion';
import { 
  Trophy, Users, Building, TrendingUp, Star, 
  ArrowRight, UserPlus, CheckCircle2 
} from 'lucide-react';
import { useLanguage } from '../../contexts/language-context';

// --- MOCK DATA ---
const STATS = [
  { label: 'community.stats.volume', value: '12.5B', suffix: 'RWF', icon: TrendingUp, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
  { label: 'community.stats.sold', value: '850', suffix: '+', icon: CheckCircle2, color: 'text-green-600 bg-green-50 dark:bg-green-900/20' },
  { label: 'community.stats.agents', value: '1,200', suffix: '', icon: Users, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
];

const TOP_AGENTS = [
  { id: 1, name: "Sarah M.", role: "Senior Broker", sales: "45 Sales", rating: 4.9, img: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1976&auto=format&fit=crop" },
  { id: 2, name: "David K.", role: "Land Specialist", sales: "32 Sales", rating: 4.8, img: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=1974&auto=format&fit=crop" },
  { id: 3, name: "Alice U.", role: "Luxury Agent", sales: "28 Sales", rating: 5.0, img: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=1961&auto=format&fit=crop" },
  { id: 4, name: "Jean Paul", role: "Commercial", sales: "19 Sales", rating: 4.7, img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1976&auto=format&fit=crop" },
];

const AGENCIES = [
  { name: "Kigali Homes", logo: "KH" },
  { name: "Prime Estates", logo: "PE" },
  { name: "Rwanda Realty", logo: "RR" },
  { name: "Urban City", logo: "UC" },
  { name: "Blue Sky", logo: "BS" },
];

export const CommunitySection = () => {
  const { t } = useLanguage();

  return (
    <section className="py-20 bg-white dark:bg-[#050c1a] border-t border-gray-100 dark:border-gray-800">
      <div className="w-11/12 mx-auto space-y-20">

        {/* ================= 1. HEADER & STATS (OUTPUT) ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex items-center gap-2 text-primary font-bold mb-2">
               <Trophy size={18} />
               <span className="uppercase tracking-wider text-sm">Performance</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
               {t('community.title')}
            </h2>
            <p className="text-lg text-gray-500 dark:text-gray-400 max-w-md">
               {t('community.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
             {STATS.map((stat, idx) => (
               <motion.div 
                 key={idx}
                 initial={{ opacity: 0, y: 20 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 transition={{ delay: idx * 0.1 }}
                 className="p-6 rounded-2xl bg-gray-50 dark:bg-[#0a162e] border border-gray-100 dark:border-gray-800 text-center hover:border-primary/30 transition-colors"
               >
                  <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-4 ${stat.color}`}>
                     <stat.icon size={20} />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                     {stat.value}<span className="text-lg text-gray-400">{stat.suffix}</span>
                  </h3>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                     {t(stat.label)}
                  </p>
               </motion.div>
             ))}
          </div>
        </div>


        {/* ================= 2. PERFORMING AGENTS ================= */}
        <div>
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{t('community.agents.title')}</h3>
              <button className="text-primary font-bold hover:underline flex items-center gap-1">View All <ArrowRight size={16}/></button>
           </div>
           
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {TOP_AGENTS.map((agent, idx) => (
                 <motion.div 
                   key={agent.id}
                   whileHover={{ y: -5 }}
                   className="group bg-white dark:bg-[#0a162e] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden p-4 text-center hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-none transition-all"
                 >
                    <div className="w-24 h-24 mx-auto rounded-full p-1 border-2 border-dashed border-gray-200 dark:border-gray-700 group-hover:border-primary transition-colors mb-4">
                       <img src={agent.img} alt={agent.name} className="w-full h-full rounded-full object-cover" />
                    </div>
                    
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">{agent.name}</h4>
                    <p className="text-sm text-primary font-medium mb-3">{agent.role}</p>
                    
                    <div className="flex items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-3">
                       <div className="flex items-center gap-1">
                          <Building size={14} />
                          <span>{agent.sales}</span>
                       </div>
                       <div className="flex items-center gap-1 text-yellow-500">
                          <Star size={14} fill="currentColor" />
                          <span className="text-slate-700 dark:text-gray-300 font-bold">{agent.rating}</span>
                       </div>
                    </div>
                 </motion.div>
              ))}
           </div>
        </div>


        {/* ================= 3. AGENCIES / BLOCKERS & CTA ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           
           {/* Agencies List */}
           <div className="lg:col-span-2 bg-gray-50 dark:bg-[#0a162e] rounded-3xl p-8 border border-gray-100 dark:border-gray-800">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">{t('community.agencies.title')}</h3>
              <div className="flex flex-wrap gap-4">
                 {AGENCIES.map((agency, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-white dark:bg-[#112240] px-5 py-3 rounded-xl border border-gray-100 dark:border-gray-700 ">
                       <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center font-bold text-xs text-gray-600 dark:text-gray-300">
                          {agency.logo}
                       </div>
                       <span className="font-semibold text-slate-700 dark:text-gray-200">{agency.name}</span>
                    </div>
                 ))}
                 <button className="px-5 py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 font-bold hover:border-primary hover:text-primary transition-all">
                    + 20 More
                 </button>
              </div>
           </div>

           {/* Call To Action Card */}
           <div className="lg:col-span-1 bg-primary text-white rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-700"></div>
              
              <div>
                 <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center mb-6">
                    <UserPlus size={24} />
                 </div>
                 <h3 className="text-2xl font-bold mb-2">{t('community.cta.title')}</h3>
                 <p className="text-blue-100 text-sm leading-relaxed mb-8">
                    {t('community.cta.subtitle')}
                 </p>
              </div>

              <button className="w-full py-4 bg-white text-primary font-bold rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-2">
                 {t('community.cta.button')}
                 <ArrowRight size={18} />
              </button>
           </div>

        </div>

      </div>
    </section>
  );
};