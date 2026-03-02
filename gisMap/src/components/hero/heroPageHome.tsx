import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Home, ShieldCheck, CheckCircle2, ArrowRight, Sparkles, SlidersHorizontal } from 'lucide-react';
import { clsx } from 'clsx';
import { useLanguage } from '../../contexts/language-context'; // Adjust path based on your structure

// --- TYPES ---
type SearchTab = 'buy' | 'land';

export const HeroSection = () => {
    const [activeTab, setActiveTab] = useState<SearchTab>('buy');
    // Inside your component...
    const [isAiMode, setIsAiMode] = useState(false);
    const { t } = useLanguage(); // Get translation function

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

    // Translation keys for tabs
    const tabTranslations = {
        buy: t('hero.tabs.buy'),
        land: t('hero.tabs.land')
    };

    // Property type options based on language
    const propertyTypes = [
        { value: 'residential', label: t('hero.propertyTypes.residential') },
        { value: 'commercial', label: t('hero.propertyTypes.commercial') },
        { value: 'land', label: t('hero.propertyTypes.land') },
        { value: 'apartment', label: t('hero.propertyTypes.apartment') }
    ];

    return (
        <section className="relative w-full 2xl:min-h-[90vh] flex items-center pt-20 overflow-hidden bg-secondary">

            {/* 1. BACKGROUND IMAGE & OVERLAY */}
            <div className="absolute inset-0 z-0">
                {/* Replace with a high-quality image of Kigali or modern Rwandan housing */}
                <img
                    src="https://www.safarisrwandasafari.com/wp-content/uploads/2023/06/An_aerial_of_Kigali_Convention_Center_on_June_19_2019._Photo_by_Emmanuel_Kwizera-750x450.jpg"
                    alt={t('hero.backgroundAlt')}
                    className="w-full h-full object-cover object-center"
                />
                {/* Gradient Overlay: Dark Navy fading to transparent for text readability */}
                <div className="absolute inset-0 bg-gradient-to-r from-secondary/90 dark:from-background/90 via-secondary/70 dark:via-background/80 to-transparent" />
            </div>

            {/* 2. MAIN CONTENT CONTAINER */}
            <div className="relative mt-20 2xl:mt-3 z-10 max-w-11/12 mx-auto px-4 sm:px-6 lg:px-8 w-full grid lg:grid-cols-2 gap-12 items-center">

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
                        <span>{t('hero.badge')}</span>
                    </motion.div>

                    {/* Headline */}
                    <motion.div variants={itemVariants}>
                        <h1 className="text-4xl md:text-5xl lg:text-5xl 2xl:text-6xl font-bold leading-tight">
                            {t('hero.headline.part1')} <span className="text-primary">{t('hero.headline.part2')}</span>
                        </h1>
                    </motion.div>

                    {/* Subheadline */}
                    <motion.p variants={itemVariants} className="text-lg text-gray-300 max-w-xl leading-relaxed">
                        {t('hero.subheadline.part1')} <strong>{t('hero.subheadline.part2')}</strong> {t('hero.subheadline.part3')}
                    </motion.p>

                    {/* Trust Indicators / Stats */}
                    <motion.div variants={itemVariants} className="flex flex-wrap gap-6 pt-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-green-500/20 p-2 rounded-full text-green-400">
                                <CheckCircle2 size={24} />
                            </div>
                            <div>
                                <p className="font-bold text-xl">100%</p>
                                <p className="text-xs text-gray-400 uppercase tracking-wide">{t('hero.stats.verifiedTitles')}</p>
                            </div>
                        </div>
                        <div className="pl-6 border-l border-white/10">
                            <p className="font-bold text-xl">{t('hero.stats.zero')}</p>
                            <p className="text-xs text-gray-400 uppercase tracking-wide">{t('hero.stats.fraudTolerance')}</p>
                        </div>
                    </motion.div>

                    {/* CTA Buttons */}
                    <motion.div variants={itemVariants} className="flex gap-4 pt-4">
                        <button className="bg-primary hover:bg-[#2d4a75] text-white px-8 py-3.5 rounded-lg font-semibold transition-all shadow-lg shadow-primary/25 flex items-center gap-2 group">
                            {t('hero.cta.exploreMap')}
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button className="px-8 py-3.5 rounded-lg font-semibold text-white border border-white/20 hover:bg-white/10 transition-all">
                            {t('hero.cta.listProperty')}
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
                            {(['buy', 'land'] as SearchTab[]).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={clsx(
                                        "flex-1 py-2 text-sm font-semibold rounded-md transition-all",
                                        activeTab === tab
                                            ? "bg-white dark:bg-background dark:text-white shadow-sm"
                                            : "text-gray-300 hover:text-white"
                                    )}
                                >
                                    {tabTranslations[tab]}
                                </button>
                            ))}
                        </div>

                        {/* FORM */}
                        <form className="space-y-4 relative">

                            {/* SEARCH MODE TOGGLE */}
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                    {isAiMode ? t('hero.form.modeAI') : t('hero.form.modeManual')}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setIsAiMode(!isAiMode)}
                                    className={clsx(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                                        isAiMode
                                            ? "bg-primary/20 border-primary text-blue-200 shadow-[0_0_10px_rgba(57,93,145,0.3)]"
                                            : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10"
                                    )}
                                >
                                    {isAiMode ? (
                                        <>
                                            <SlidersHorizontal size={14} />
                                            {t('hero.form.switchToFilters')}
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={14} className="text-yellow-400" />
                                            {t('hero.form.switchToAI')}
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* CONDITIONAL INPUTS */}
                            {isAiMode ? (
                                // --- AI NLP SEARCH MODE ---
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="relative group">
                                        <div className="relative">
                                            <Sparkles className="absolute left-3 top-3.5 text-blue-200 animate-pulse" size={20} />
                                            <textarea
                                                rows={4}
                                                placeholder={t('hero.form.aiPlaceholder')}
                                                className="w-full border border-white/20 text-white placeholder-gray-300 pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-0 resize-none leading-relaxed"
                                            />
                                        </div>
                                    </div>
                                    {/* Quick Suggestions / Chips */}
                                    <div className="flex flex-wrap gap-2">
                                        {['Verified Plots', 'Kigali Masterplan', 'Commercial Rent'].map(tag => (
                                            <span key={tag} className="text-[10px] bg-white/5 hover:bg-white/10 text-gray-400 px-2 py-1 rounded-md cursor-pointer transition-colors border border-white/5">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                // --- CLASSIC FILTER MODE (Your Existing Code) ---
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    {/* Location Input */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-300 ml-1">{t('hero.form.location')}</label>
                                        <div className="relative group">
                                            <MapPin className="absolute left-3 top-3.5 text-gray-400 group-focus-within:text-primary" size={20} />
                                            <input
                                                type="text"
                                                placeholder={t('hero.form.locationPlaceholder')}
                                                className="w-full bg-white/5 border border-white/10 text-white placeholder-gray-400 pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Property Type Input */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-300 ml-1">{t('hero.form.propertyType')}</label>
                                        <div className="relative group">
                                            <Home className="absolute left-3 top-3.5 text-gray-400 group-focus-within:text-primary" size={20} />
                                            <select className="w-full bg-white/5 border border-white/10 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none transition-all cursor-pointer">
                                                {propertyTypes.map((type) => (
                                                    <option key={type.value} value={type.value} className="bg-secondary text-gray-300">
                                                        {type.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Price Range */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-gray-300 ml-1">{t('hero.form.minPrice')}</label>
                                            <input
                                                type="number"
                                                placeholder={t('hero.form.minPricePlaceholder')}
                                                className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-gray-300 ml-1">{t('hero.form.maxPrice')}</label>
                                            <input
                                                type="number"
                                                placeholder={t('hero.form.maxPricePlaceholder')}
                                                className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* SUBMIT BUTTON (Dynamic based on mode) */}
                            <button className={clsx(
                                "w-full font-bold py-4 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 mt-4",
                                isAiMode
                                    ? "bg-gradient-to-r from-primary to-primary hover:brightness-110 text-white shadow-primary/20"
                                    : "bg-primary hover:bg-[#2d4a75] text-white shadow-primary/25"
                            )}>
                                {isAiMode ? <Sparkles size={20} /> : <Search size={20} />}
                                {isAiMode
                                    ? t('hero.form.searchAI')
                                    : t('hero.form.searchButton', { propertyType: t(`hero.tabs.${activeTab}`) })
                                }
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