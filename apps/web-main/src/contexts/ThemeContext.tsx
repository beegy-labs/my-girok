import React, { createContext, useEffect, useState, useCallback } from 'react';
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

// Cookie helpers for theme storage (SSR-compatible)
const THEME_COOKIE_NAME = 'theme';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

function getThemeFromCookie(): Theme | null {
  const match = document.cookie.match(new RegExp(`(^| )${THEME_COOKIE_NAME}=([^;]+)`));
  const value = match?.[2];
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value;
  }
  return null;
}

function setThemeCookie(theme: Theme): void {
  document.cookie = `${THEME_COOKIE_NAME}=${theme}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
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
    // Try cookie first (SSR-compatible), fallback to localStorage for migration
    const cookieTheme = getThemeFromCookie();
    if (cookieTheme) return cookieTheme;

    // Migration: check localStorage and migrate to cookie
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored && (stored === 'light' || stored === 'dark' || stored === 'system')) {
      setThemeCookie(stored);
      localStorage.removeItem('theme'); // Clean up old storage
      return stored;
    }

    return 'system';
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

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    setThemeCookie(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('light');
    } else {
      // If system, toggle to the opposite of current effective theme
      setTheme(effectiveTheme === 'light' ? 'dark' : 'light');
    }
  }, [theme, effectiveTheme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, themeName, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
