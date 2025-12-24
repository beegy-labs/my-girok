import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { HelmetProvider } from 'react-helmet-async';
import { router } from './router';
import { ThemeProvider } from './contexts/ThemeContext';
import './index.css';
import './i18n/config';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </HelmetProvider>
  </React.StrictMode>,
);
