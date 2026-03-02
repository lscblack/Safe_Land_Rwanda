
import { NAV_ITEMS } from './nav-config';
import { NavItem } from './NavItem';

export const MainNav = () => {
  return (
    <div className="hidden md:flex items-center gap-6 ">
      {NAV_ITEMS.map((item) => (
        <NavItem key={item.label} item={item} />
      ))}
    </div>
  );
};