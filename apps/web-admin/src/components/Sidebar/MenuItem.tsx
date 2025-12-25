import { memo, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { type MenuItem as MenuItemType, MAX_MENU_DEPTH } from '../../config/menu.config';
import { useMenuStore } from '../../stores/menuStore';
import { isMenuItemActive } from '../../hooks/useFilteredMenu';

interface MenuItemProps {
  item: MenuItemType;
  depth?: number;
}

export const MenuItem = memo(function MenuItem({ item, depth = 0 }: MenuItemProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const { isExpanded, toggleItem } = useMenuStore();

  const hasChildren = item.children && item.children.length > 0;
  const expanded = isExpanded(item.id);
  const isActive = isMenuItemActive(item, location.pathname);

  // Indent padding based on depth (base 16px + 16px per level)
  const paddingLeft = 24 + depth * 16;

  const handleToggle = useCallback(() => {
    toggleItem(item.id);
  }, [item.id, toggleItem]);

  // Render group with children
  if (hasChildren && depth < MAX_MENU_DEPTH) {
    return (
      <div>
        <button
          onClick={handleToggle}
          className={`flex items-center justify-between w-full py-3 text-sm transition-colors ${
            isActive
              ? 'text-theme-primary'
              : 'text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-bg-secondary'
          }`}
          style={{ paddingLeft, paddingRight: 16 }}
        >
          <div className="flex items-center gap-3">
            {item.icon && <item.icon size={18} />}
            <span>{t(item.labelKey)}</span>
            {item.badge && (
              <span
                className={`px-1.5 py-0.5 text-xs rounded ${
                  item.badge === 'new'
                    ? 'bg-theme-status-success-bg text-theme-status-success-text'
                    : 'bg-theme-status-warning-bg text-theme-status-warning-text'
                }`}
              >
                {item.badge}
              </span>
            )}
          </div>
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Animated collapse */}
        <div
          className={`overflow-hidden transition-all duration-200 ease-in-out ${
            expanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          {item.children!.map((child) => (
            <MenuItem key={child.id} item={child} depth={depth + 1} />
          ))}
        </div>
      </div>
    );
  }

  // Render leaf node (direct link)
  if (!item.path) {
    return null;
  }

  return (
    <NavLink
      to={item.path}
      className={({ isActive: linkActive }) =>
        `flex items-center gap-3 py-3 text-sm transition-colors ${
          linkActive
            ? 'bg-theme-primary/10 text-theme-primary border-r-2 border-theme-primary'
            : 'text-theme-text-secondary hover:bg-theme-bg-secondary hover:text-theme-text-primary'
        }`
      }
      style={{ paddingLeft, paddingRight: 16 }}
    >
      {item.icon && <item.icon size={18} />}
      <span>{t(item.labelKey)}</span>
      {item.badge && (
        <span
          className={`px-1.5 py-0.5 text-xs rounded ${
            item.badge === 'new'
              ? 'bg-theme-status-success-bg text-theme-status-success-text'
              : 'bg-theme-status-warning-bg text-theme-status-warning-text'
          }`}
        >
          {item.badge}
        </span>
      )}
    </NavLink>
  );
});
