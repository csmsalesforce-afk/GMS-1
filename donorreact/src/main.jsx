import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

let root = null;
let currentMountNode = null;

// Expose render function for Salesforce LWC
window.__DONOR_PORTAL_RENDER__ = (data, explicitMountNode) => {
  const mountNode = explicitMountNode || window.__DONOR_PORTAL_MOUNT__ || (
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? document.getElementById('root')
      : null
  );

  if (mountNode) {
    try {
      if (!root || currentMountNode !== mountNode) {
        root = createRoot(mountNode);
        currentMountNode = mountNode;
      }
      root.render(
        <StrictMode>
          <App />
        </StrictMode>
      );
    } catch (err) {
      console.error('[DonorPortal] FAILED TO RENDER:', err);
    }
  }
};

// Also support legacy window hook if called by applicantPortalReactNew
window.__APPLICANT_PORTAL_RENDER__ = window.__DONOR_PORTAL_RENDER__;

// Automatically mount ONLY in local browser development (localhost / 127.0.0.1)
if ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && document.getElementById('root')) {
  window.__DONOR_PORTAL_RENDER__({}, document.getElementById('root'));
}
