import { memo } from 'react';
import { useFilteredMenu } from '../../hooks/useFilteredMenu';
import { MenuItem } from './MenuItem';

export const Sidebar = memo(function Sidebar() {
  const menuItems = useFilteredMenu();

  return (
    <nav className="flex-1 py-4 overflow-y-auto">
      {menuItems.map((item) => (
        <MenuItem key={item.id} item={item} />
      ))}
    </nav>
  );
});
