import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { AppProviders } from './providers/AppProviders';
import { router } from './router';
import { initOtel } from './lib/otel';
import './index.css';
import './i18n/config';

// Initialize OpenTelemetry
initOtel();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </React.StrictMode>,
);
