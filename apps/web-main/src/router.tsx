import { createBrowserRouter } from 'react-router';
import App from './App';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import NotFoundPage from './pages/NotFoundPage';
import PrivateRoute from './components/PrivateRoute';
import ResumeEditPage from './pages/resume/ResumeEditPage';
import ResumePreviewPage from './pages/resume/ResumePreviewPage';
import PublicResumePage from './pages/resume/PublicResumePage';
import SharedResumePage from './pages/resume/SharedResumePage';
import MyResumePage from './pages/resume/MyResumePage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'register',
        element: <RegisterPage />,
      },
      {
        path: 'change-password',
        element: (
          <PrivateRoute>
            <ChangePasswordPage />
          </PrivateRoute>
        ),
      },
      {
        path: 'resume/my',
        element: (
          <PrivateRoute>
            <MyResumePage />
          </PrivateRoute>
        ),
      },
      {
        path: 'resume/edit',
        element: (
          <PrivateRoute>
            <ResumeEditPage />
          </PrivateRoute>
        ),
      },
      {
        path: 'resume/edit/:resumeId',
        element: (
          <PrivateRoute>
            <ResumeEditPage />
          </PrivateRoute>
        ),
      },
      {
        path: 'resume/preview/:resumeId',
        element: (
          <PrivateRoute>
            <ResumePreviewPage />
          </PrivateRoute>
        ),
      },
      {
        path: 'resume/:username',
        element: <PublicResumePage />,
      },
      {
        path: 'shared/:token',
        element: <SharedResumePage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);
