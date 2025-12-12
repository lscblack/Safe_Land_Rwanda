// TopBar.tsx
import React, { useState } from "react";
import { Moon, Sun, LogIn, ChevronDown } from "lucide-react";

import { useLanguage } from "../../contexts/language-context"; // Import language context
import { useTheme } from "../../contexts/theme-context";

export const TopBar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage(); // Use language context
  const [langOpen, setLangOpen] = useState(false);

  const languages = [
    { code: "EN", label: t('common.language.en'), flag: "🇬🇧" },
    { code: "FR", label: t('common.language.fr'), flag: "🇫🇷" },
    { code: "KIN", label: t('common.language.kin'), flag: "🇷🇼" },
  ];

  const currentLang = languages.find(lang => lang.code === language) || languages[0];

  const selectLang = (langCode: "EN" | "FR" | "KIN") => {
    setLanguage(langCode);
    setLangOpen(false);
  };

  return (
    <div className="w-full bg-secondary dark:bg-background/90 text-white py-2 px-4 text-xs md:text-sm">
      <div className="max-w-11/12 mx-auto flex justify-end items-center gap-6 relative">

        {/* LANGUAGE DROPDOWN */}
        <div className="relative">
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center gap-2 hover:text-primary transition-colors"
            aria-label="Select Language"
          >
            <span className="text-base">{currentLang.flag}</span>
            <span className="font-medium">{currentLang.code}</span>
            <ChevronDown size={14} className="opacity-70" />
          </button>

          {/* DROPDOWN MENU */}
          {langOpen && (
            <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-secondary shadow-lg rounded-md border border-gray-200 dark:border-gray-700 z-50">
              {languages.map((lang) => (
                <div
                  key={lang.code}
                  onClick={() => selectLang(lang.code as "EN" | "FR" | "KIN")}
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {lang.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* THEME TOGGLE */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 hover:text-primary transition-colors"
          aria-label={t('topbar.toggleTheme')}
        >
          {theme === "light" ? (
            <Sun size={14} />
          ) : (
            <Moon size={14} className="text-white" />
          )}
        </button>

        {/* AUTH BUTTONS */}
        <div className="flex items-center gap-4 border-l border-white/20 pl-4">
          <a
            href="/login"
            className="flex items-center gap-1 hover:text-primary transition-colors"
          >
            <LogIn size={14} />
            <span>{t('topbar.login')}</span>
          </a>

          <a
            href="/register"
            className="bg-primary hover:bg-blue-600 text-white px-3 py-1 rounded-sm font-semibold transition-colors"
          >
            {t('topbar.register')}
          </a>
        </div>
      </div>
    </div>
  );
};