import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import salesforceService from '../services/salesforceService';
import './Navbar.css';

export default function Navbar({ onOpenDonate, onOpenInquiry, userAuth, profileStatus, onOpenProfile, onOpenGiving }) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isLoggedIn = userAuth?.isLoggedIn ?? salesforceService.isLoggedIn;
  const userName = userAuth?.userName || salesforceService.userName;
  const loginUrl = salesforceService.loginUrl;

  const hasExistingDonor = Boolean(profileStatus?.donorId || profileStatus?.donorCode || (profileStatus?.donorName && profileStatus?.donorName !== userName));
  const currentStatus = profileStatus?.status || profileStatus?.complianceStatus || (hasExistingDonor ? 'Approved' : (isLoggedIn ? 'NO_PROFILE' : 'GUEST'));
  const isApproved = hasExistingDonor || (currentStatus === 'Approved' && profileStatus?.kycVerified === true);
  const isPending = !isApproved && (currentStatus === 'Pending' || (currentStatus === 'Approved' && !profileStatus?.kycVerified));

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = (e) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    salesforceService.logout();
  };

  const handleDonateClick = () => {
    setMobileMenuOpen(false);
    onOpenDonate();
  };

  const handleInquiryClick = () => {
    setMobileMenuOpen(false);
    onOpenInquiry();
  };

  const handleProfileClick = () => {
    setMobileMenuOpen(false);
    onOpenProfile();
  };

  return (
    <header className="donor-navbar">
      <div className="container nav-content">
        {/* Brand Logo */}
        <Link to="/" className="brand-logo" onClick={() => setMobileMenuOpen(false)}>
          <div className="logo-badge">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
          </div>
          <div className="brand-text">
            <span className="brand-title">GMS Impact</span>
            <span className="brand-tag">Donor Giving Portal</span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="nav-links desktop-only" aria-label="Main Navigation">
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
            Explore Causes
          </Link>
          <Link to="/campaigns" className={`nav-link ${location.pathname === '/campaigns' ? 'active' : ''}`}>
            Campaigns
          </Link>
          <Link to="/impact" className={`nav-link ${location.pathname === '/impact' ? 'active' : ''}`}>
            Program Impact
          </Link>
          {!isLoggedIn && (
            <button type="button" onClick={handleInquiryClick} className="nav-link text-btn">
              Corporate Partners
            </button>
          )}
        </nav>

        {/* Right Actions */}
        <div className="nav-actions">
          {isLoggedIn ? (
            <div className="user-profile-menu">
              <button 
                type="button"
                onClick={handleProfileClick}
                className="donor-user-chip clickable"
                title="Click to view Donor KYC Profile & Compliance Status"
              >
                <div className="donor-avatar">
                  {userName ? userName.charAt(0).toUpperCase() : 'D'}
                </div>
                <span className="donor-user-name" title={userName || 'Donor'}>
                  {userName || 'Donor'}
                </span>
                {isApproved ? (
                  <span className="donor-status-pill approved" title="Compliance Approved">✓ Verified</span>
                ) : isPending ? (
                  <span className="donor-status-pill pending" title="Verification Under Review">⏳ In Review</span>
                ) : (
                  <span className="donor-status-pill needed" title="KYC Verification Required">⚠️ Verify</span>
                )}
              </button>

              <button 
                type="button"
                onClick={() => { if (onOpenGiving) onOpenGiving(); }}
                className="btn btn-secondary btn-sm nav-giving-btn desktop-only"
                title="View your active recurring gifts & official tax receipts"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
                  <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
                  <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
                </svg>
                <span>My Giving</span>
              </button>

              <button 
                type="button"
                onClick={handleLogout} 
                className="btn btn-secondary btn-sm nav-logout-btn desktop-only"
                title="Sign Out"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                <span className="logout-text">Sign Out</span>
              </button>
            </div>
          ) : (
            <a href={loginUrl} className="btn btn-secondary btn-sm nav-login-btn desktop-only">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                <polyline points="10 17 15 12 10 7"></polyline>
                <line x1="15" y1="12" x2="3" y2="12"></line>
              </svg>
              <span>Sign In</span>
            </a>
          )}

          {/* Give Now Button */}
          <button 
            type="button" 
            onClick={handleDonateClick} 
            className="btn btn-accent btn-sm nav-give-btn"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="give-icon">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
            <span className="give-text">Give Now</span>
          </button>

          {/* Mobile Hamburger Toggle Button */}
          <button 
            type="button" 
            className={`mobile-menu-toggle ${mobileMenuOpen ? 'open' : ''}`}
            onClick={() => setMobileMenuOpen(prev => !prev)}
            aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Menu'}
            aria-expanded={mobileMenuOpen}
          >
            <span className="hamburger-bar"></span>
            <span className="hamburger-bar"></span>
            <span className="hamburger-bar"></span>
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Backdrop Overlay */}
      {mobileMenuOpen && (
        <div 
          className="mobile-backdrop-overlay" 
          onClick={() => setMobileMenuOpen(false)} 
        />
      )}

      {/* Mobile Dropdown Content (Absolute, Attached to Header) */}
      {mobileMenuOpen && (
        <div className="mobile-nav-dropdown" onClick={e => e.stopPropagation()}>
          <div className="mobile-dropdown-inner">
            {/* User Profile Card in Mobile */}
            {isLoggedIn ? (
              <div className="mobile-user-card" onClick={handleProfileClick}>
                <div className="mobile-user-avatar">
                  {userName ? userName.charAt(0).toUpperCase() : 'D'}
                </div>
                <div className="mobile-user-info">
                  <span className="mobile-user-name">{userName || 'Donor'}</span>
                  <div className="mobile-status-row">
                    {isApproved ? (
                      <span className="donor-status-pill approved">✓ Compliance Approved</span>
                    ) : isPending ? (
                      <span className="donor-status-pill pending">⏳ Review In Progress</span>
                    ) : (
                      <span className="donor-status-pill needed">⚠️ KYC Verification Required</span>
                    )}
                  </div>
                </div>
                <button type="button" className="mobile-profile-arrow-btn" aria-label="Open profile">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </div>
            ) : (
              <div className="mobile-guest-card">
                <p>Sign in to contribute and download 501(c)(3) tax receipts.</p>
                <a href={loginUrl} className="btn btn-secondary btn-sm mobile-auth-btn">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                    <polyline points="10 17 15 12 10 7"></polyline>
                    <line x1="15" y1="12" x2="3" y2="12"></line>
                  </svg>
                  <span>Sign In as Donor</span>
                </a>
              </div>
            )}

            {/* Nav Links */}
            <nav className="mobile-nav-links">
              <Link 
                to="/" 
                className={`mobile-nav-link ${location.pathname === '/' ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  <polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                <span>Explore Causes</span>
              </Link>
              <Link 
                to="/campaigns" 
                className={`mobile-nav-link ${location.pathname === '/campaigns' ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="18" height="18" x="3" y="3" rx="2"/>
                  <path d="M7 7h10M7 12h10M7 17h6"/>
                </svg>
                <span>Giving Campaigns</span>
              </Link>
              <Link 
                to="/impact" 
                className={`mobile-nav-link ${location.pathname === '/impact' ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
                <span>Program Impact Ledger</span>
              </Link>
              {isLoggedIn && (
                <button
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); if (onOpenGiving) onOpenGiving(); }}
                  className="mobile-nav-link text-btn"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
                    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
                    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
                  </svg>
                  <span>My Giving &amp; Recurring Pledges</span>
                </button>
              )}
              {!isLoggedIn && (
                <button 
                  type="button" 
                  onClick={handleInquiryClick} 
                  className="mobile-nav-link text-btn"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  <span>Corporate Giving &amp; Partners</span>
                </button>
              )}
            </nav>

            {/* Mobile Footer Actions */}
            <div className="mobile-drawer-footer">
              <button 
                type="button" 
                onClick={handleDonateClick} 
                className="btn btn-accent btn-lg mobile-give-btn"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
                <span>Donate to Active Campaign</span>
              </button>

              {isLoggedIn && (
                <div className="mobile-secondary-actions">
                  <button 
                    type="button" 
                    onClick={handleProfileClick} 
                    className="btn btn-secondary mobile-profile-btn"
                  >
                    <span>Donor Profile &amp; KYC</span>
                  </button>
                  <button 
                    type="button" 
                    onClick={handleLogout} 
                    className="btn btn-secondary mobile-logout-btn"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
