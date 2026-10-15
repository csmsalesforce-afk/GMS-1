import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import salesforceService from '../services/salesforceService';
import './Navbar.css';

const Navbar = () => {
  const { isLoggedIn, userName, profileStatus, userInitials, isVerified } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const logoLight = salesforceService.getAsset('logoLightUrl');
  const logoDark = salesforceService.getAsset('logoDarkUrl');
  const brandLogo = logoLight || logoDark;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!showDropdown) return;
    const handleClickOutside = (e) => {
      const path = e.composedPath ? e.composedPath() : [];
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) && !path.includes(dropdownRef.current)) {
        setShowDropdown(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowDropdown(false);
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }, 20);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showDropdown]);

  const handleLogout = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShowDropdown(false);
    salesforceService.logout();
  };

  const getStatusBadge = () => {
    if (!profileStatus || profileStatus === 'NO_PROFILE') {
      return { label: 'No Profile', className: 'status-none' };
    }
    if (profileStatus === 'Approved') {
      return { label: 'Verified', className: 'status-approved' };
    }
    if (profileStatus === 'In Approval') {
      return { label: 'Under Review', className: 'status-review' };
    }
    if (profileStatus === 'Not Eligible') {
      return { label: 'Not Eligible', className: 'status-rejected' };
    }
    return { label: 'Pending Submission', className: 'status-pending' };
  };

  const statusBadge = getStatusBadge();

  return (
    <header className={`navbar-wrapper-outer ${isScrolled ? 'navbar-scrolled' : ''}`}>
      <nav className="navbar">
        <div className="navbar-container">
          <Link to="/" className="navbar-logo" title="Go to Home">
            {brandLogo ? (
              <img 
                src={brandLogo} 
                alt="CSM Logo" 
                className="logo-img" 
              />
            ) : (
              <span className="navbar-logo-text">CSM GMS</span>
            )}
          </Link>
          
          <div className="navbar-center">
            <Link to="/" className={`navbar-link ${location.pathname === '/' || location.pathname === '/landing' ? 'active' : ''}`}>
              Home
            </Link>
            {isLoggedIn && (
              <>
                <Link to="/dashboard" className={`navbar-link ${location.pathname === '/dashboard' ? 'active' : ''}`}>
                  Dashboard
                </Link>
                <Link to="/programs" className={`navbar-link ${location.pathname.startsWith('/programs') ? 'active' : ''}`}>
                  Grant Programs
                </Link>
                <Link to="/my-applications" className={`navbar-link ${location.pathname.startsWith('/my-applications') ? 'active' : ''}`}>
                  My Applications
                </Link>
                <Link to="/profile" className={`navbar-link ${location.pathname === '/profile' ? 'active' : ''}`}>
                  Profile
                </Link>
              </>
            )}
          </div>

          <div className="navbar-actions">
            <span className="theme-toggle-icon" title="Theme mode">
              🌙
            </span>

            {isLoggedIn ? (
              <div className="profile-menu-container" ref={dropdownRef}>
                <button 
                  type="button"
                  className="profile-circle-btn" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowDropdown(prev => !prev);
                  }}
                  aria-label="User Profile Menu"
                  aria-expanded={showDropdown}
                >
                  <div className={`avatar-circle ${isVerified ? 'avatar-verified' : ''}`}>
                    <span className="avatar-text">{userInitials || 'SC'}</span>
                  </div>
                </button>

                {showDropdown && (
                  <div 
                    className="profile-dropdown-menu"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="dropdown-header">
                      <div className="dropdown-username">{userName}</div>
                      <div className={`dropdown-status-tag ${statusBadge.className}`}>
                        <span className="status-dot-indicator"></span>
                        {statusBadge.label}
                      </div>
                    </div>
                    <div className="dropdown-divider"></div>
                    <button 
                      type="button"
                      className="dropdown-link-btn" 
                      onClick={() => { setShowDropdown(false); navigate('/profile'); }}
                    >
                      <svg className="dropdown-link-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                      <span>My Profile</span>
                    </button>
                    <button 
                      type="button"
                      className="dropdown-link-btn" 
                      onClick={() => { setShowDropdown(false); navigate('/my-applications'); }}
                    >
                      <svg className="dropdown-link-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                      </svg>
                      <span>My Applications</span>
                    </button>
                    <button 
                      type="button"
                      className="dropdown-link-btn" 
                      onClick={() => { setShowDropdown(false); navigate('/dashboard'); }}
                    >
                      <svg className="dropdown-link-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="9"></rect>
                        <rect x="14" y="3" width="7" height="5"></rect>
                        <rect x="14" y="12" width="7" height="9"></rect>
                        <rect x="3" y="16" width="7" height="5"></rect>
                      </svg>
                      <span>Dashboard</span>
                    </button>
                    <div className="dropdown-divider"></div>
                    <button 
                      type="button" 
                      className="dropdown-link-btn logout-link" 
                      onClick={handleLogout}
                    >
                      <svg className="dropdown-link-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                      </svg>
                      <span>Logout</span>
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
      </nav>
    </header>
  );
};

export default Navbar;
