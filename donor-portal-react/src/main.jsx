import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import App from './App.jsx';
import salesforceService from './services/salesforceService';
import './index.css';

let root = null;

// Expose render function for Salesforce LWC
window.__DONOR_PORTAL_RENDER__ = (payload) => {
  salesforceService.initialize();
  const mountNode = window.__DONOR_PORTAL_MOUNT__ || document.getElementById('root');

  if (mountNode) {
    try {
      if (!root) {
        root = createRoot(mountNode);
      }
      root.render(
        <StrictMode>
          <MemoryRouter>
            <App userAuth={payload} />
          </MemoryRouter>
        </StrictMode>
      );
    } catch (err) {
      console.error('[donorPortalReact] Failed to render React app:', err);
    }
  } else {
    console.error('[donorPortalReact] Mount node is null.');
  }
};

// Automatic standalone mount when running outside LWC (e.g. npm run dev / preview)
const standaloneRoot = document.getElementById('root');
if (standaloneRoot && !window.__DONOR_PORTAL_ACTIONS__) {
  root = createRoot(standaloneRoot);
  root.render(
    <StrictMode>
      <MemoryRouter>
        <App />
      </MemoryRouter>
    </StrictMode>
  );
}
