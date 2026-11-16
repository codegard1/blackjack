import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

import { registerServiceWorker } from './registerServiceWorker';

registerServiceWorker();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');
// Strict mode runs reducers, renders and effects twice in development, which shows up
// anything that is not safe to repeat. It changes nothing in a production build.
createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
