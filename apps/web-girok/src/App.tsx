import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import { useAuthStore } from './stores/authStore';
import { initializeObservability } from './lib/otel';

function App() {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();

  // Initialize observability when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      initializeObservability();
    }
  }, [isAuthenticated]);

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

export default App;
