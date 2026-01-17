import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { ThemeProvider } from '../contexts/ThemeContext';
import { AuthProvider } from '../contexts/AuthContext';
import { ToastProvider } from '../components/ToastProvider';

/**
 * QueryClient configuration
 * Centralized configuration for TanStack Query
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * AppProviders Component
 *
 * Centralized provider composition for the application.
 * Keeps main.tsx clean and maintains a single source of truth for all providers.
 *
 * Provider order (outer to inner):
 * 1. QueryClientProvider - Data fetching and caching
 * 2. HelmetProvider - Document head management
 * 3. ThemeProvider - Theme and color scheme
 * 4. ToastProvider - Toast notifications
 * 5. AuthProvider - Authentication and authorization
 *
 * @example
 * ```tsx
 * <AppProviders>
 *   <RouterProvider router={router} />
 * </AppProviders>
 * ```
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>{children}</AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
}
