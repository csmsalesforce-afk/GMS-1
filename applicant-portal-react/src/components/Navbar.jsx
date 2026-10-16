import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import salesforceService from '../services/salesforceService';
import './Navbar.css';

// Inline Donor Login / Register Panel (shown as overlay without page redirect)
const DonorAuthPanel = ({ onClose }) => {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleLogin = (e) => {
    e.preventDefault();
    // Redirect to Salesforce login (opens on same page via redirect)
    window.location.href = salesforceService.loginUrl;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      alert('Passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    try {
      // Redirect to Salesforce login/register page
      window.location.href = salesforceService.loginUrl;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="donor-auth-overlay" onClick={onClose}>
      <div className="donor-auth-panel" onClick={e => e.stopPropagation()}>
        <button className="auth-panel-close" onClick={onClose} aria-label="Close">✕</button>

        {mode === 'login' ? (
          <>
            <h2 className="auth-panel-title">Donor Login</h2>
            <p className="auth-panel-subtitle">Sign in to donate and manage your giving.</p>
            <form onSubmit={handleLogin} className="auth-panel-form">
              <div className="auth-field-group">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="donor@example.com"
                  value={form.email}
                  onChange={e => handleChange('email', e.target.value)}
                  className="auth-input"
                  required
                />
              </div>
              <div className="auth-field-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Enter Password"
                  value={form.password}
                  onChange={e => handleChange('password', e.target.value)}
                  className="auth-input"
                  required
                />
              </div>
              <a href={salesforceService.loginUrl + '?forgotPassword=1'} className="auth-forgot-link">
                Forgot Password?
              </a>
              <button type="submit" className="auth-submit-btn">
                Sign in as Donor
              </button>
            </form>
            <div className="auth-panel-divider">
              <span>or</span>
            </div>
            <div className="auth-panel-switch">
              <span>Don&apos;t have an account? </span>
              <button type="button" className="auth-switch-btn" onClick={() => setMode('register')}>
                Register as Donor
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="auth-panel-title">Create Account</h2>
            <p className="auth-panel-subtitle">Register as a donor to start giving.</p>
            <form onSubmit={handleRegister} className="auth-panel-form">
              <div className="auth-row-two">
                <div className="auth-field-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    placeholder="eg: Rahul"
                    value={form.firstName}
                    onChange={e => handleChange('firstName', e.target.value)}
                    className="auth-input"
                    required
                  />
                </div>
                <div className="auth-field-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    placeholder="eg: Sharma"
                    value={form.lastName}
                    onChange={e => handleChange('lastName', e.target.value)}
                    className="auth-input"
                    required
                  />
                </div>
              </div>
              <div className="auth-field-group">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="eg: rahulsharma@gmail.com"
                  value={form.email}
                  onChange={e => handleChange('email', e.target.value)}
                  className="auth-input"
                  required
                />
              </div>
              <div className="auth-field-group">
                <label>New Password</label>
                <input
                  type="password"
                  placeholder="Enter Password"
                  value={form.password}
                  onChange={e => handleChange('password', e.target.value)}
                  className="auth-input"
                  required
                />
              </div>
              <div className="auth-field-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={form.confirmPassword}
                  onChange={e => handleChange('confirmPassword', e.target.value)}
                  className="auth-input"
                  required
                />
              </div>
              <button type="submit" disabled={isSubmitting} className="auth-submit-btn">
                {isSubmitting ? 'Creating...' : 'Create Account'}
              </button>
            </form>
            <div className="auth-panel-switch" style={{ marginTop: '12px' }}>
              <span>Already have an account? </span>
              <button type="button" className="auth-switch-btn" onClick={() => setMode('login')}>
                Login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const Navbar = () => {
  const { isLoggedIn, userName } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showDonorAuth, setShowDonorAuth] = useState(false);
  const dropdownRef = useRef(null);

  const logoLight = salesforceService.getAsset('logoLightUrl');
  const logoDark = salesforceService.getAsset('logoDarkUrl');
  const profileStatus = salesforceService.profileStatus;
  const isVerified = profileStatus === 'Approved';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    salesforceService.logout();
  };

  const handleDonateClick = () => {
    if (isLoggedIn) {
      // If already logged in, navigate to the donor portal donate tab
      window.location.href = '/donor#donate';
    } else {
      // Show inline login/register panel
      setShowDonorAuth(true);
    }
  };

  const userInitial = (userName || 'U')
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <>
      <nav className={`navbar ${isScrolled ? 'navbar-scrolled' : ''}`}>
        <div className={`navbar-wrapper ${isScrolled ? 'navbar-wrapper-scrolled' : ''}`}>
          <div className="navbar-container">
            <Link to="/" className="navbar-logo">
              <img
                src={isScrolled ? (logoDark || logoLight) : (logoLight || logoDark)}
                alt="Logo"
                className="logo-img"
              />
            </Link>

            <div className="navbar-center">
              <Link to="/" className="navbar-link">Home</Link>
              <Link to="/programs" className="navbar-link">Grant Programs</Link>
              <Link to="/donor" className="navbar-link">Donor Portal</Link>
              {isLoggedIn && (
                <>
                  <Link to="/my-applications" className="navbar-link">My Applications</Link>
                  <Link to="/profile" className="navbar-link">Profile</Link>
                </>
              )}
            </div>

            <div className="navbar-actions">
              {/* Donate Now — always visible; opens inline auth if not logged in */}
              <button
                type="button"
                className="navbar-donate-btn"
                onClick={handleDonateClick}
              >
                Donate Now
              </button>

              {isLoggedIn ? (
                <div className="nav-profile-wrapper" ref={dropdownRef}>
                  <div
                    className="nav-user-circle"
                    onClick={() => setShowDropdown(prev => !prev)}
                    title={userName}
                  >
                    {userInitial}
                    {isVerified && <span className="nav-verified-dot">✔</span>}
                  </div>

                  {showDropdown && (
                    <div className="nav-profile-dropdown">
                      <div className="dropdown-identity">
                        <div className="dropdown-name">{userName}</div>
                        <div className={`dropdown-status-badge ${isVerified ? 'verified' : 'pending'}`}>
                          {isVerified ? '● Verified' : '● Pending Review'}
                        </div>
                      </div>

                      <div className="dropdown-divider-line"></div>

                      <Link
                        to="/profile"
                        className="dropdown-nav-row"
                        onClick={() => setShowDropdown(false)}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                          <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        My Profile
                      </Link>

                      <Link
                        to="/my-applications"
                        className="dropdown-nav-row"
                        onClick={() => setShowDropdown(false)}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                        </svg>
                        My Applications
                      </Link>

                      <Link
                        to="/"
                        className="dropdown-nav-row"
                        onClick={() => setShowDropdown(false)}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="7" height="7"></rect>
                          <rect x="14" y="3" width="7" height="7"></rect>
                          <rect x="14" y="14" width="7" height="7"></rect>
                          <rect x="3" y="14" width="7" height="7"></rect>
                        </svg>
                        Dashboard
                      </Link>

                      <div className="dropdown-divider-line"></div>

                      <button
                        type="button"
                        className="dropdown-nav-row logout-row"
                        onClick={handleLogout}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                          <polyline points="16 17 21 12 16 7"></polyline>
                          <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <a href={salesforceService.loginUrl} className="navbar-btn">
                  Login
                </a>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Inline Donor Auth Panel (modal overlay, no page redirect) */}
      {showDonorAuth && (
        <DonorAuthPanel onClose={() => setShowDonorAuth(false)} />
      )}
    </>
  );
};

export default Navbar;
