import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Home, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';

// --- TYPES ---
type SearchTab = 'buy' | 'rent' | 'land';

export const HeroSection = () => {
  const [activeTab, setActiveTab] = useState<SearchTab>('buy');

  // Animation variants for staggered entry
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.3 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <section className="relative w-full min-h-[90vh] flex items-center pt-20 overflow-hidden bg-secondary">
      
      {/* 1. BACKGROUND IMAGE & OVERLAY */}
      <div className="absolute inset-0 z-0">
        {/* Replace with a high-quality image of Kigali or modern Rwandan housing */}
        <img 
          src="https://www.safarisrwandasafari.com/wp-content/uploads/2023/06/An_aerial_of_Kigali_Convention_Center_on_June_19_2019._Photo_by_Emmanuel_Kwizera-750x450.jpg" 
          alt="Modern Real Estate in Rwanda" 
          className="w-full h-full object-cover object-center"
        />
        {/* Gradient Overlay: Dark Navy fading to transparent for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a162e]/95 via-[#0a162e]/80 to-transparent" />
      </div>

      {/* 2. MAIN CONTENT CONTAINER */}
      <div className="relative z-10 max-w-11/12 mx-auto px-4 sm:px-6 lg:px-8 w-full grid lg:grid-cols-2 gap-12 items-center">
        
        {/* LEFT COLUMN: TEXT & VALUE PROP */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-white space-y-8"
        >
          {/* Badge */}
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/50 text-blue-200 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck size={14} className="text-primary" />
            <span>NLA Integrated Verification</span>
          </motion.div>

          {/* Headline */}
          <motion.div variants={itemVariants}>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              Buy Land & Homes in Rwanda <span className="text-primary">Without the Risk.</span>
            </h1>
          </motion.div>

          {/* Subheadline */}
          <motion.p variants={itemVariants} className="text-lg text-gray-300 max-w-xl leading-relaxed">
            The first decentralized marketplace powered by <strong>NLA verification</strong> and AI. 
            We ensure every title deed is real, every owner is verified, and every transaction is transparent.
          </motion.p>

          {/* Trust Indicators / Stats */}
          <motion.div variants={itemVariants} className="flex flex-wrap gap-6 pt-4">
            <div className="flex items-center gap-3">
              <div className="bg-green-500/20 p-2 rounded-full text-green-400">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="font-bold text-xl">100%</p>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Verified Titles</p>
              </div>
            </div>
            <div className="pl-6 border-l border-white/10">
              <p className="font-bold text-xl">Zero</p>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Fraud Tolerance</p>
            </div>
          </motion.div>

          {/* CTA Buttons (Mobile mostly, or secondary actions) */}
          <motion.div variants={itemVariants} className="flex gap-4 pt-4">
            <button className="bg-primary hover:bg-[#2d4a75] text-white px-8 py-3.5 rounded-lg font-semibold transition-all shadow-lg shadow-primary/25 flex items-center gap-2 group">
              Explore Map
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="px-8 py-3.5 rounded-lg font-semibold text-white border border-white/20 hover:bg-white/10 transition-all">
              List Property
            </button>
          </motion.div>
        </motion.div>

        {/* RIGHT COLUMN: SEARCH CARD */}
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="w-full max-w-md mx-auto lg:ml-auto"
        >
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl shadow-2xl">
            
            {/* TABS */}
            <div className="flex p-1 bg-black/20 rounded-lg mb-6">
              {(['buy', 'rent', 'land'] as SearchTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={clsx(
                    "flex-1 py-2 text-sm font-semibold rounded-md transition-all capitalize",
                    activeTab === tab 
                      ? "bg-white text-secondary shadow-sm" 
                      : "text-gray-300 hover:text-white"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* FORM */}
            <form className="space-y-4">
              
              {/* Location Input */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300 ml-1">Location</label>
                <div className="relative group">
                  <MapPin className="absolute left-3 top-3.5 text-gray-400 group-focus-within:text-primary" size={20} />
                  <input 
                    type="text" 
                    placeholder="Kigali, Gasabo, Kimironko..." 
                    className="w-full bg-white/5 border border-white/10 text-white placeholder-gray-400 pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Property Type Input */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300 ml-1">Property Type</label>
                <div className="relative group">
                  <Home className="absolute left-3 top-3.5 text-gray-400 group-focus-within:text-primary" size={20} />
                  <select className="w-full bg-white/5 border border-white/10 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none transition-all cursor-pointer">
                    <option className="bg-secondary text-gray-300">Residential House</option>
                    <option className="bg-secondary text-gray-300">Commercial Building</option>
                    <option className="bg-secondary text-gray-300">Empty Plot / Land</option>
                    <option className="bg-secondary text-gray-300">Apartment</option>
                  </select>
                </div>
              </div>

              {/* Price Range (Simple Grid) */}
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-300 ml-1">Min Price (RWF)</label>
                    <input type="number" placeholder="Min" className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary" />
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-300 ml-1">Max Price (RWF)</label>
                    <input type="number" placeholder="Max" className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary" />
                 </div>
              </div>

              {/* Search Button */}
              <button className="w-full bg-primary hover:bg-[#2d4a75] text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/25 transition-all flex justify-center items-center gap-2 mt-4">
                <Search size={20} />
                Find {activeTab === 'land' ? 'Land' : 'Properties'}
              </button>
            </form>
          </div>
        </motion.div>
      </div>

      {/* DECORATIVE BOTTOM FADE */}
      <div className="absolute bottom-0 w-full h-24 bg-gradient-to-t from-white dark:from-secondary to-transparent" />
    </section>
  );
};