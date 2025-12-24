import { useMemo } from 'react';
import { useAdminAuthStore } from '../stores/adminAuthStore';
import { MENU_CONFIG, type MenuItem } from '../config/menu.config';

/**
 * Filter menu items based on user permissions
 * Parent items are visible if any child is visible
 */
export function useFilteredMenu(): MenuItem[] {
  const { hasPermission } = useAdminAuthStore();

  return useMemo(() => {
    function filterItems(items: MenuItem[]): MenuItem[] {
      return items
        .map((item) => {
          // If has children, filter them first
          if (item.children && item.children.length > 0) {
            const filteredChildren = filterItems(item.children);

            // Parent visible if any child is visible
            if (filteredChildren.length > 0) {
              return { ...item, children: filteredChildren };
            }

            // Check if parent itself has permission
            if (item.permission && !hasPermission(item.permission)) {
              return null;
            }

            // No visible children and no direct path
            if (!item.path) {
              return null;
            }

            return { ...item, children: undefined };
          }

          // Leaf node: check permission
          if (item.permission && !hasPermission(item.permission)) {
            return null;
          }

          return item;
        })
        .filter((item): item is MenuItem => item !== null);
    }

    return filterItems(MENU_CONFIG);
  }, [hasPermission]);
}

/**
 * Check if a path or any of its children is active
 */
export function isMenuItemActive(item: MenuItem, currentPath: string): boolean {
  // Direct match
  if (item.path === currentPath) {
    return true;
  }

  // Check children
  if (item.children) {
    return item.children.some((child) => isMenuItemActive(child, currentPath));
  }

  // Partial match for nested routes (e.g., /legal/documents/new)
  if (item.path && currentPath.startsWith(item.path + '/')) {
    return true;
  }

  return false;
}
