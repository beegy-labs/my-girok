import { Outlet } from 'react-router';
import Navbar from '../components/Navbar';
import ErrorBoundary from '../components/ErrorBoundary';

/**
 * FullWidthLayout - Layout with Navbar but no content container constraints
 *
 * Used for pages that need full-width content without padding/max-width:
 * - Resume preview pages
 * - Public resume pages
 * - Shared resume pages
 *
 * Pages using this layout should handle their own background and spacing.
 */
export default function FullWidthLayout() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-primary transition-colors duration-200">
        <Navbar />
        <Outlet />
      </div>
    </ErrorBoundary>
  );
}
