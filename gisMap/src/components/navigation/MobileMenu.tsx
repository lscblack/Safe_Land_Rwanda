import React, { useState } from 'react';
import { NAV_ITEMS, type NavItemType } from './nav-config';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { useLanguage } from '../../contexts/language-context'; // Adjust path

interface MobileMenuProps {
  isOpen: boolean;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden bg-white dark:bg-secondary border-b border-gray-200 dark:border-gray-800 overflow-hidden"
        >
          <div className="flex flex-col p-4 space-y-4">
            {NAV_ITEMS.map((item) => (
              <MobileNavItem key={item.label} item={item} />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};



const MobileNavItem = ({ item }: { item: NavItemType }) => {
  const [expanded, setExpanded] = useState(false);
  const { t } = useLanguage(); // Get translation function
  const Icon = item.icon;

  return (
    <div className="border-b border-gray-100 dark:border-gray-800 pb-2 last:border-0">
      <div 
        className="flex justify-between items-center py-2 cursor-pointer"
        onClick={() => item.children && setExpanded(!expanded)}
      >
        <a 
          href={item.children ? "#" : item.href}
          className={clsx(
            "flex items-center gap-3 text-base font-medium",
             item.isHot ? "text-red-600 dark:text-red-400" : "text-gray-800 dark:text-white"
          )}
        >
           {item.isHot && Icon && <Icon size={18} />}
           {t(item.translationKey || item.label)} {/* Use translation */}
        </a>
        {item.children && (
          <ChevronDown 
            size={18} 
            className={clsx("text-gray-400 transition-transform", expanded ? "rotate-180" : "")} 
          />
        )}
      </div>

      <AnimatePresence>
        {item.children && expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden pl-4 space-y-2"
          >
            {item.children.map((child) => (
              <a
                key={child.translationKey || child.label}
                href={child.href}
                className="block py-2 text-sm text-gray-500 dark:text-gray-400"
              >
                {t(child.translationKey || child.label)} {/* Use translation */}
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};