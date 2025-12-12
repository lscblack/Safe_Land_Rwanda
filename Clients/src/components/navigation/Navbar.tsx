import { useState, useEffect } from "react";
import { TopBar } from "./TopBar";
import { MainNav } from "./MainNav";
import { MobileMenu } from "./MobileMenu";
import { Menu, X } from "lucide-react";
import { clsx } from "clsx";

export const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <header className="fixed w-full top-0 z-50 font-sans">
            <TopBar />

            <nav
                className={clsx(
                    "w-full transition-all duration-300 border-b text-primary dark:text-white",
                    scrolled
                        ? "bg-white/95 dark:bg-secondary backdrop-blur-md py-2 shadow-md border-gray-200 dark:border-gray-700"
                        : "bg-slate-50 dark:bg-background py-4 border-transparent"
                )}
            >
                <div className="max-w-11/12 mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">

                    {/* LOGO */}
                    <div className="flex items-center gap-2 h-16 px-2 rounded-md">
                        <img
                            src="/logo_words.png"
                            alt="SafeLand Rwanda Logo"
                            className="h-full scale-100 dark:filter dark:invert dark:brightness-0 dark:hue-rotate-180"
                        />
                    </div>

                    {/* DESKTOP NAV */}
                    <MainNav />

                    {/* MOBILE TOGGLE */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="md:hidden p-2 text-secondary dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition"
                    >
                        {isOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </nav>

            {/* MOBILE MENU */}
            <MobileMenu isOpen={isOpen} />
        </header>
    );
};
