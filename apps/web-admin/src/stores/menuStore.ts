import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MenuState {
  expandedItems: string[];
  isMobileOpen: boolean;
  toggleItem: (id: string) => void;
  expandItem: (id: string) => void;
  collapseItem: (id: string) => void;
  collapseAll: () => void;
  setMobileOpen: (open: boolean) => void;
  isExpanded: (id: string) => boolean;
}

export const useMenuStore = create<MenuState>()(
  persist(
    (set, get) => ({
      expandedItems: [],
      isMobileOpen: false,

      toggleItem: (id: string) =>
        set((state) => {
          const isCurrentlyExpanded = state.expandedItems.includes(id);
          return {
            expandedItems: isCurrentlyExpanded
              ? state.expandedItems.filter((item) => item !== id)
              : [...state.expandedItems, id],
          };
        }),

      expandItem: (id: string) =>
        set((state) => {
          if (state.expandedItems.includes(id)) {
            return state;
          }
          return { expandedItems: [...state.expandedItems, id] };
        }),

      collapseItem: (id: string) =>
        set((state) => ({
          expandedItems: state.expandedItems.filter((item) => item !== id),
        })),

      collapseAll: () => set({ expandedItems: [] }),

      setMobileOpen: (open: boolean) => set({ isMobileOpen: open }),

      isExpanded: (id: string) => get().expandedItems.includes(id),
    }),
    {
      name: 'admin-menu-storage',
      partialize: (state) => ({
        expandedItems: state.expandedItems,
      }),
    },
  ),
);
