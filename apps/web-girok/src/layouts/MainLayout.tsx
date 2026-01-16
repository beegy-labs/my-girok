import { Outlet, useLocation } from 'react-router';
import Navbar from '../components/Navbar';
import ErrorBoundary from '../components/ErrorBoundary';
import { useAuthStore } from '../stores/authStore';

/**
 * MainLayout - Standard layout with Navbar
 *
 * Used for most pages. Each page handles its own <main> and <footer> elements
 * for proper HTML5 semantic structure.
 */
export default function MainLayout() {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  // Hide navbar on unauthenticated main page
  const isMainPage = location.pathname === '/';
  const showNavbar = isAuthenticated || !isMainPage;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-theme-bg-page transition-colors duration-200">
        {showNavbar && <Navbar />}
        {/* Outlet renders page components that have their own <main> and <footer> */}
        <Outlet />
      </div>
    </ErrorBoundary>
  );
}
