// src/components/navigation/nav-config.ts
import { Flame, Home, Info, ShieldAlert, Building2 } from "lucide-react";

export interface NavItemType {
  label: string; // Keep as string for translation key
  translationKey: string; // Add this for translation
  href: string;
  icon?: React.ElementType;
  isHot?: boolean;
  children?: {
    label: string;
    translationKey: string; // Add for child translations
    href: string
  }[];
}

export const NAV_ITEMS: NavItemType[] = [
  {
    label: "Home",
    translationKey: "nav.home",
    href: "/",
    icon: Home
  },
  {
    label: "About",
    translationKey: "nav.about",
    href: "/about",
    icon: Info
  },
  // {
  //   label: "Services",
  //   translationKey: "nav.services",
  //   href: "/services",
  //   icon: Briefcase
  // },
  {
    label: "Properties",
    translationKey: "nav.properties",
    href: "/properties",
    icon: Building2,
    children: [
      {
        label: "Buy Property",
        translationKey: "nav.properties.buy",
        href: "/properties/buy"
      },
      {
        label: "Sell Property",
        translationKey: "nav.properties.sell",
        href: "/properties/sell"
      },
      {
        label: "Commercial Buildings",
        translationKey: "nav.properties.commercial",
        href: "/properties/commercial"
      },
      {
        label: "Houses & Apartments",
        translationKey: "nav.properties.houses",
        href: "/properties/houses"
      },
      {
        label: "Land & Plots",
        translationKey: "nav.properties.land",
        href: "/properties/land"
      },
    ]
  },
  {
    label: "Our Agents",
    translationKey: "nav.blockers",
    href: "/our-agents",
    icon: ShieldAlert,
    children: [
      {
        label: "Blockers",
        translationKey: "nav.properties.buy",
        href: "/our-agents/blockers"
      },
      {
        label: "Agencies",
        translationKey: "nav.properties.sell",
        href: "/our-agents/agencies"
      }
    ]
  },
  {
    label: "Hot Deals",
    translationKey: "nav.hotDeals",
    href: "/deals",
    icon: Flame,
    isHot: true
  },
  {
    label: "Market Trends",
    translationKey: "nav.marketTrends",
    href: "/market-trends",
    icon: Flame,
    isHot: true
  },
];