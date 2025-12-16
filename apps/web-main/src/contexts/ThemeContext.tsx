import React, { createContext, useEffect, useState } from 'react';
import { mapPreferenceToTheme, type Theme, type ThemeName } from '../types/theme';

interface ThemeContextType {
  theme: Theme;
  effectiveTheme: 'light' | 'dark';
  themeName: ThemeName;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * Apply theme to the document root
 * Sets data-theme attribute for CSS variable switching
 */
function applyTheme(effectiveTheme: 'light' | 'dark') {
  const themeName = mapPreferenceToTheme(effectiveTheme);

  // Set data-theme attribute for CSS variable switching
  document.documentElement.setAttribute('data-theme', themeName);

  return themeName;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    return stored || 'system';
  });

  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light');
  const [themeName, setThemeName] = useState<ThemeName>('vintage');

  // Determine effective theme based on user preference and system preference
  useEffect(() => {
    const determineEffectiveTheme = () => {
      if (theme === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return systemPrefersDark ? 'dark' : 'light';
      }
      return theme;
    };

    const newEffectiveTheme = determineEffectiveTheme();
    setEffectiveTheme(newEffectiveTheme);

    const newThemeName = applyTheme(newEffectiveTheme);
    setThemeName(newThemeName);
  }, [theme]);

  // Listen for system theme changes when using 'system' mode
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const newEffectiveTheme = e.matches ? 'dark' : 'light';
      setEffectiveTheme(newEffectiveTheme);

      const newThemeName = applyTheme(newEffectiveTheme);
      setThemeName(newThemeName);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('light');
    } else {
      // If system, toggle to the opposite of current effective theme
      setTheme(effectiveTheme === 'light' ? 'dark' : 'light');
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, themeName, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
