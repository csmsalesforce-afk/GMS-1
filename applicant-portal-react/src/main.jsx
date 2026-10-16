import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import App from './App.jsx';
import './index.css';

// Expose render function for LWC to call
let root = null;
window.__APPLICANT_PORTAL_RENDER__ = (data) => {
  console.log('Rendering with data:', data);
  const mountNode = window.__APPLICANT_PORTAL_MOUNT__ || document.getElementById('root');
  
  if (mountNode) {
    try {
      if (!root) {
        console.log('Creating React root on:', mountNode);
        root = createRoot(mountNode);
      }
      console.log('Calling root.render...');
      root.render(
        <StrictMode>
          <MemoryRouter>
            <AuthProvider>
              <App />
            </AuthProvider>
          </MemoryRouter>
        </StrictMode>
      );
      console.log('root.render called successfully');
    } catch (err) {
      console.error('FAILED TO RENDER REACT APP:', err);
    }
  } else {
    console.error('MOUNT NODE IS NULL');
  }
};

// Automatically auto-mount in standalone local browser development (Vite dev server)
if (document.getElementById('root') && !window.__APPLICANT_PORTAL_MOUNT__) {
  window.__APPLICANT_PORTAL_RENDER__({
    isLoggedIn: false,
    userName: '',
    profileStatus: null
  });
}
