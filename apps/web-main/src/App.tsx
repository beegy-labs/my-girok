import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PublicPage from './pages/PublicPage';
import ProtectedPage from './pages/ProtectedPage';
import PrivateRoute from './components/PrivateRoute';
import ResumeEditPage from './pages/resume/ResumeEditPage';
import ResumePreviewPage from './pages/resume/ResumePreviewPage';
import PublicResumePage from './pages/resume/PublicResumePage';

function App() {

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/public" element={<PublicPage />} />
          <Route
            path="/protected"
            element={
              <PrivateRoute>
                <ProtectedPage />
              </PrivateRoute>
            }
          />
          {/* Resume Routes */}
          <Route
            path="/resume/edit"
            element={
              <PrivateRoute>
                <ResumeEditPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/resume/preview"
            element={
              <PrivateRoute>
                <ResumePreviewPage />
              </PrivateRoute>
            }
          />
          <Route path="/resume/:token" element={<PublicResumePage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
