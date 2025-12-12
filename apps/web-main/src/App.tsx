import { Outlet } from 'react-router';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-vintage-bg-page dark:bg-dark-bg-primary transition-colors duration-200">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Outlet />
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;
