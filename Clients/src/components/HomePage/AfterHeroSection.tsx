
import { motion } from 'framer-motion';
import { ShieldCheck, Fingerprint, Zap, ArrowRight, FileCheck, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../contexts/language-context';


const FeaturesSection = () => {
  const { t } = useLanguage();

  const features = [
    {
      icon: ShieldCheck,
      title: t('features.card1.title'),
      desc: t('features.card1.desc'),
      color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900",
    },
    {
      icon: Fingerprint,
      title: t('features.card2.title'),
      desc: t('features.card2.desc'),
      color: "text-purple-600 bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-900",
    },
    {
      icon: Zap,
      title: t('features.card3.title'),
      desc: t('features.card3.desc'),
      color: "text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900",
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <section className="py-24 bg-white dark:bg-[#050c1a] overflow-hidden">
      <div className="w-11/12 mx-auto">
        
        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* --- LEFT COLUMN: CARDS --- */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="space-y-6"
          >
            <motion.div variants={itemVariants} className="mb-8">
               <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
                 {t('features.title')}
               </h2>
               <p className="text-lg text-gray-500 dark:text-gray-400">
                 {t('features.subtitle')}
               </p>
            </motion.div>

            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="group flex gap-5 p-6 rounded-2xl bg-white dark:bg-[#0a162e] border border-gray-100 dark:border-gray-800 hover:border-primary/30 dark:hover:border-primary/50 transition-all duration-300"
              >
                {/* Icon Box */}
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 border ${feature.color}`}>
                  <feature.icon size={26} />
                </div>
                
                {/* Text Content */}
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              </motion.div>
            ))}

            <motion.div variants={itemVariants} className="pt-4">
               <button className="flex items-center gap-2 text-primary font-bold hover:gap-3 transition-all">
                  Learn more about our technology <ArrowRight size={20} />
               </button>
            </motion.div>
          </motion.div>


          {/* --- RIGHT COLUMN: IMAGE WITH DESCRIPTION --- */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative h-[600px] rounded-3xl overflow-hidden bg-gray-100 dark:bg-[#0a162e]"
          >
            {/* Main Image */}
            <img 
               src="https://images.unsplash.com/photo-1573167243872-43c6433b9d40?q=80&w=2069&auto=format&fit=crop" 
               alt="SafeLand Technology" 
               className="w-full h-full object-cover"
            />
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#050c1a] via-transparent to-transparent opacity-80" />

            {/* Floating Glass Card (Description) */}
            <div className="absolute bottom-8 left-8 right-8">
               <div className="bg-white/10 dark:bg-[#0a162e]/60 backdrop-blur-md border border-white/20 p-6 rounded-2xl text-white">
                  <div className="flex items-start gap-4">
                     <div className="p-3 bg-primary rounded-xl text-white shadow-lg shadow-primary/30">
                        <FileCheck size={24} />
                     </div>
                     <div>
                        <h4 className="text-lg font-bold mb-1">{t('features.imageCaption.title')}</h4>
                        <p className="text-sm text-blue-100 leading-relaxed opacity-90">
                           {t('features.imageCaption.desc')}
                        </p>
                        
                        {/* Trust Indicators inside card */}
                        <div className="flex gap-4 mt-4 pt-4 border-t border-white/10">
                           <div className="flex items-center gap-1.5 text-xs font-semibold text-green-300">
                              <CheckCircle2 size={14} />
                              <span>Encrypted</span>
                           </div>
                           <div onClick={() => window.location.href="https://amakuru.lands.rw/"} className="flex items-center gap-1.5 text-xs font-semibold text-blue-200">
                              <ShieldCheck size={14} />
                              <span>Official Data</span>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

          </motion.div>

        </div>
      </div>
    </section>
  );
};
export default FeaturesSection;