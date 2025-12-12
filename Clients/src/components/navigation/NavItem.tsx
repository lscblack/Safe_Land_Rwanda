// NavItem.tsx
import React, { useState } from "react";
import { type NavItemType } from "./nav-config";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { useLanguage } from "../../contexts/language-context"; // Adjust path as needed

interface NavItemProps {
    item: NavItemType;
}

export const NavItem: React.FC<NavItemProps> = ({ item }) => {
    const [hovered, setHovered] = useState(false);
    const { t } = useLanguage(); // Get translation function
    const Icon = item.icon as React.ElementType | undefined;
    
    return (
        <div
            className="relative group"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <a
                href={item.href}
                className={clsx(
                    "flex items-center gap-1.5 text-sm font-medium transition-colors py-2",
                    item.isHot
                        ? "text-red-600 dark:text-red-400 font-bold"
                        : "text-gray-700 dark:text-gray-200 hover:text-primary dark:hover:text-primary"
                )}
            >
                {item.isHot && Icon && <Icon size={16} className="animate-pulse" />}
                {t(item.translationKey || item.label)} {/* Use translation */}
                {item.children && (
                    <ChevronDown
                        size={14}
                        className={clsx("transition-transform", hovered ? "rotate-180" : "")}
                    />
                )}
            </a>

            {/* Dropdown Menu */}
            {item.children && (
                <AnimatePresence>
                    {hovered && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.2 }}
                            className="absolute left-0 top-full pt-2 w-56"
                        >
                            <div className="bg-white dark:bg-[#0f1f3a] rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                                {item.children.map((child) => (
                                    <a
                                        key={child.translationKey || child.label}
                                        href={child.href}
                                        className="block px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-primary transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0"
                                    >
                                        {t(child.translationKey || child.label)} {/* Use translation */}
                                    </a>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            )}
        </div>
    );
};