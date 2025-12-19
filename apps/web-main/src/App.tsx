import { Outlet } from 'react-router';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
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

export default App;
