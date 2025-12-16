import { Outlet } from 'react-router';
import Navbar from '../components/Navbar';
import ErrorBoundary from '../components/ErrorBoundary';

/**
 * MainLayout - Standard layout with Navbar and centered content container
 *
 * Used for most pages that need standard padding and max-width constraints.
 */
export default function MainLayout() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-theme-bg-page transition-colors duration-200">
        <Navbar />
        <main className="container mx-auto px-4 py-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </ErrorBoundary>
  );
}
