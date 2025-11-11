import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PrivateRoute from './components/PrivateRoute';
import ResumeEditPage from './pages/resume/ResumeEditPage';
import ResumePreviewPage from './pages/resume/ResumePreviewPage';
import PublicResumePage from './pages/resume/PublicResumePage';
import SharedResumePage from './pages/resume/SharedResumePage';
import MyResumePage from './pages/resume/MyResumePage';

function App() {

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Resume routes with /resume prefix */}
          <Route
            path="/resume/my"
            element={
              <PrivateRoute>
                <MyResumePage />
              </PrivateRoute>
            }
          />
          {/* New resume creation - no resumeId */}
          <Route
            path="/resume/edit"
            element={
              <PrivateRoute>
                <ResumeEditPage />
              </PrivateRoute>
            }
          />
          {/* Edit existing resume - with resumeId */}
          <Route
            path="/resume/edit/:resumeId"
            element={
              <PrivateRoute>
                <ResumeEditPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/resume/preview/:resumeId"
            element={
              <PrivateRoute>
                <ResumePreviewPage />
              </PrivateRoute>
            }
          />
          {/* Public resume view by username */}
          <Route path="/resume/:username" element={<PublicResumePage />} />
          {/* Shared resume view by token */}
          <Route path="/shared/:token" element={<SharedResumePage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
