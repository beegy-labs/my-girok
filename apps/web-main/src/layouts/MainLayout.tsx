import { Outlet } from 'react-router';
import Navbar from '../components/Navbar';
import ErrorBoundary from '../components/ErrorBoundary';

/**
 * MainLayout - Standard layout with Navbar
 *
 * Used for most pages. Each page handles its own <main> and <footer> elements
 * for proper HTML5 semantic structure.
 */
export default function MainLayout() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-theme-bg-page transition-colors duration-200">
        <Navbar />
        {/* Outlet renders page components that have their own <main> and <footer> */}
        <Outlet />
      </div>
    </ErrorBoundary>
  );
}
