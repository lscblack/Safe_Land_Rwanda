
import { 
  Facebook, Twitter, Instagram, Linkedin, 
  MapPin, Phone, Mail, Send, ShieldCheck 
} from 'lucide-react';

import { useLanguage } from '../../contexts/language-context';
// --- YOUR CONTEXTS ---


export const Footer = () => {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gray-50 dark:bg-[#0a162e] border-t border-gray-200 dark:border-gray-800 transition-colors duration-300 font-sans mt-auto">
      
      {/* ================= 1. NEWSLETTER STRIP ================= */}
      <div className="border-b border-gray-200 dark:border-gray-800">
         <div className="w-11/12 mx-auto py-12 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-xl">
               <h3 className="text-2xl font-bold text-secondary dark:text-white mb-2 flex items-center gap-2">
                 {t('footer.newsletter.title')}
               </h3>
               <p className="text-gray-500 dark:text-gray-400">
                 {t('footer.newsletter.subtitle')}
               </p>
            </div>

            <div className="w-full md:w-auto flex-1 max-w-md">
               <form className="relative flex items-center">
                  <Mail className="absolute left-4 text-gray-400" size={20} />
                  <input 
                    type="email" 
                    placeholder={t('footer.newsletter.placeholder')} 
                    className="w-full bg-white dark:bg-[#112240] border border-gray-200 dark:border-gray-700 rounded-xl py-4 pl-12 pr-32 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 outline-none shadow-sm transition-all"
                  />
                  <button className="absolute right-2 bg-primary hover:bg-[#2d4a75] text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2">
                     {t('footer.newsletter.button')}
                     <Send size={14} />
                  </button>
               </form>
            </div>
         </div>
      </div>

      {/* ================= 2. MAIN GRID ================= */}
      <div className="w-11/12 mx-auto py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
         
         {/* Column 1: Brand & Mission */}
         <div className="space-y-6">
            <div className="flex items-center gap-2">
                <div className="bg-primary/10 dark:bg-white/10 p-2 rounded-lg">
                   {/* Logo: Invert brightness for dark mode to make it white */}
                   <img src="/logo_icon.png" alt="SafeLand" className="w-8 h-8 object-contain dark:brightness-0 dark:invert" />
                </div>
                <span className="text-xl font-bold text-secondary dark:text-white tracking-tight">SafeLand</span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm">
               {t('footer.mission')}
            </p>
            <div className="flex items-center gap-2 text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full w-fit">
               <ShieldCheck size={14} />
               <span>Official NLA Partner</span>
            </div>
         </div>

         {/* Column 2: Quick Links */}
         <div>
            <h4 className="font-bold text-secondary dark:text-white mb-6">{t('footer.links.marketplace')}</h4>
            <ul className="space-y-4 text-sm text-gray-500 dark:text-gray-400">
               <li><a href="#" className="hover:text-primary transition-colors">Residential Houses</a></li>
               <li><a href="#" className="hover:text-primary transition-colors">Commercial & Offices</a></li>
               <li><a href="#" className="hover:text-primary transition-colors">Land & Plots</a></li>
               <li><a href="#" className="hover:text-primary transition-colors">New Developments</a></li>
            </ul>
         </div>

         {/* Column 3: Company */}
         <div>
            <h4 className="font-bold text-secondary dark:text-white mb-6">{t('footer.links.company')}</h4>
            <ul className="space-y-4 text-sm text-gray-500 dark:text-gray-400">
               <li><a href="#" className="hover:text-primary transition-colors">About Us</a></li>
               <li><a href="#" className="hover:text-primary transition-colors">How Verification Works</a></li>
               <li><a href="#" className="hover:text-primary transition-colors">Our Agents</a></li>
               <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
            </ul>
         </div>

         {/* Column 4: Contact */}
         <div>
            <h4 className="font-bold text-secondary dark:text-white mb-6">{t('footer.contact.title')}</h4>
            <ul className="space-y-4 text-sm text-gray-500 dark:text-gray-400">
               <li className="flex items-start gap-3">
                  <MapPin size={18} className="flex-shrink-0 text-primary mt-0.5" />
                  <span>Kigali City Tower, Floor 5<br/>Avenue du Commerce, Kigali</span>
               </li>
               <li className="flex items-center gap-3">
                  <Phone size={18} className="flex-shrink-0 text-primary" />
                  <span>+250 788 123 456</span>
               </li>
               <li className="flex items-center gap-3">
                  <Mail size={18} className="flex-shrink-0 text-primary" />
                  <span>support@safeland.rw</span>
               </li>
            </ul>
         </div>
      </div>

      {/* ================= 3. COPYRIGHT BAR ================= */}
      <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#050c1a]">
         <div className="w-11/12 mx-auto py-8 flex flex-col md:flex-row justify-between items-center gap-4">
            
            <p className="text-sm text-gray-400">
               © {year} SafeLand Rwanda Ltd. {t('footer.rights')}
            </p>

            <div className="flex gap-6 text-sm text-gray-500 dark:text-gray-400">
               <a href="#" className="hover:text-primary transition-colors">{t('footer.privacy')}</a>
               <a href="#" className="hover:text-primary transition-colors">{t('footer.terms')}</a>
               <a href="#" className="hover:text-primary transition-colors">Sitemap</a>
            </div>

            <div className="flex gap-4">
               <SocialIcon icon={Facebook} />
               <SocialIcon icon={Twitter} />
               <SocialIcon icon={Instagram} />
               <SocialIcon icon={Linkedin} />
            </div>

         </div>
      </div>
    </footer>
  );
};

// --- Helper Component for Social Icons ---
const SocialIcon = ({ icon: Icon }: { icon: any }) => (
  <a 
    href="#" 
    className="p-2 rounded-full bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-primary hover:text-white dark:hover:bg-primary transition-all duration-300"
  >
    <Icon size={18} />
  </a>
);