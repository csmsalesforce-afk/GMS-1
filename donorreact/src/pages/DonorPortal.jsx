import { useState, useEffect, useRef } from 'react';
import salesforceService from '../services/salesforceService';
import './DonorPortal.css';

// ─────────────────────────────────────────────────────
// Inline Donor Auth Panel (login / register modal)
// Shown instead of redirecting when user clicks Donate
// ─────────────────────────────────────────────────────
const DonorAuthPanel = ({ onClose, initialMode = 'login' }) => {
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: ''
  });

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleLogin = (e) => {
    e.preventDefault();
    window.location.href = salesforceService.loginUrl;
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      alert('Passwords do not match.');
      return;
    }
    window.location.href = salesforceService.loginUrl;
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
                <input type="email" placeholder="donor@example.com" value={form.email}
                  onChange={e => handleChange('email', e.target.value)} className="auth-input" required />
              </div>
              <div className="auth-field-group">
                <label>Password</label>
                <input type="password" placeholder="Enter Password" value={form.password}
                  onChange={e => handleChange('password', e.target.value)} className="auth-input" required />
              </div>
              <a href={salesforceService.loginUrl + '?forgotPassword=1'} className="auth-forgot-link">Forgot Password?</a>
              <button type="submit" className="auth-submit-btn">Sign in as Donor</button>
            </form>
            <div className="auth-panel-divider"><span>or</span></div>
            <div className="auth-panel-switch">
              <span>Don&apos;t have an account? </span>
              <button type="button" className="auth-switch-btn" onClick={() => setMode('register')}>Register as Donor</button>
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
                  <input type="text" placeholder="eg: Rahul" value={form.firstName}
                    onChange={e => handleChange('firstName', e.target.value)} className="auth-input" required />
                </div>
                <div className="auth-field-group">
                  <label>Last Name</label>
                  <input type="text" placeholder="eg: Sharma" value={form.lastName}
                    onChange={e => handleChange('lastName', e.target.value)} className="auth-input" required />
                </div>
              </div>
              <div className="auth-field-group">
                <label>Email</label>
                <input type="email" placeholder="eg: rahulsharma@gmail.com" value={form.email}
                  onChange={e => handleChange('email', e.target.value)} className="auth-input" required />
              </div>
              <div className="auth-field-group">
                <label>New Password</label>
                <input type="password" placeholder="Enter Password" value={form.password}
                  onChange={e => handleChange('password', e.target.value)} className="auth-input" required />
              </div>
              <div className="auth-field-group">
                <label>Confirm Password</label>
                <input type="password" placeholder="Confirm Password" value={form.confirmPassword}
                  onChange={e => handleChange('confirmPassword', e.target.value)} className="auth-input" required />
              </div>
              <button type="submit" className="auth-submit-btn">Create Account</button>
            </form>
            <div className="auth-panel-switch" style={{ marginTop: '12px' }}>
              <span>Already have an account? </span>
              <button type="button" className="auth-switch-btn" onClick={() => setMode('login')}>Login</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const PRESET_AMOUNTS = [
  { amount: 18, label: '$18', desc: 'Lunch for a parent of a hospitalized child.' },
  { amount: 36, label: '$36', desc: 'A ride to a doctor\'s appointment.' },
  { amount: 72, label: '$72', desc: 'One-night stay in our emergency care condo.' },
  { amount: 144, label: '$144', desc: 'A meal pack for a family in medical crisis.' },
  { amount: 180, label: '$180', desc: 'Food & medical supplies for 1 week.' },
  { amount: 360, label: '$360', desc: 'Purchase for specialized diagnostic equipment.' }
];

const DonorPortal = () => {
  // Navigation: 'home' | 'profile' | 'donate' | 'dashboard'
  const getInitialTab = () => {
    const hash = (window.location.hash || '').toLowerCase();
    const search = (window.location.search || '').toLowerCase();
    if (hash === '#donate' || search.includes('tab=donate')) return 'donate';
    if (hash === '#profile' || hash === '#register' || search.includes('tab=profile') || search.includes('tab=register')) return 'profile';
    if (hash === '#campaigns' || search.includes('tab=campaigns')) return 'campaigns';
    if (hash === '#dashboard' || search.includes('tab=dashboard')) return 'dashboard';
    if (hash === '#home' || search.includes('tab=home')) return 'home';
    return salesforceService.isLoggedIn ? 'dashboard' : 'home';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);

  // Authentication & Profile State (fetched from Salesforce)
  const [isLoggedIn, setIsLoggedIn] = useState(salesforceService.isLoggedIn);
  const [userName, setUserName] = useState(salesforceService.userName);
  const [profileStatus, setProfileStatus] = useState(salesforceService.profileStatus);
  const [isApproved, setIsApproved] = useState(salesforceService.isApproved);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);

  // Inline auth panel state
  const [showDonorAuth, setShowDonorAuth] = useState(false);
  const [authPanelMode, setAuthPanelMode] = useState('login');

  // Campaigns State
  const [campaigns, setCampaigns] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);

  // Registration Form State
  const [fieldSet, setFieldSet] = useState([]);
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [isSubmittingReg, setIsSubmittingReg] = useState(false);
  const [registrationResult, setRegistrationResult] = useState(null);

  // Donation Flow State (Bikur Cholim Style)
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [selectedPreset, setSelectedPreset] = useState(36);
  const [customAmount, setCustomAmount] = useState('');
  const [isDedicated, setIsDedicated] = useState(false);
  const [dedicationNote, setDedicationNote] = useState('');
  const [donorName, setDonorName] = useState(userName || '');
  const [donorEmail, setDonorEmail] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [isSubmittingDonation, setIsSubmittingDonation] = useState(false);
  const [donationSuccess, setDonationSuccess] = useState(null);

  // Dashboard State
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  // Close profile menu when clicking outside (Shadow-DOM aware)
  useEffect(() => {
    const handleClickOutside = (e) => {
      const path = e.composedPath ? e.composedPath() : [];
      if (profileMenuRef.current) {
        if (path.length > 0) {
          if (!path.includes(profileMenuRef.current)) {
            setShowProfileMenu(false);
          }
        } else if (!profileMenuRef.current.contains(e.target)) {
          setShowProfileMenu(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Guard: Unauthenticated guests must never see dashboard or profile
  useEffect(() => {
    if (!isLoggedIn && (activeTab === 'dashboard' || activeTab === 'profile')) {
      setActiveTab('home');
    }
  }, [isLoggedIn, activeTab]);

  useEffect(() => {
    salesforceService.initialize();

    // Sync auth state
    setIsLoggedIn(salesforceService.isLoggedIn);
    setUserName(salesforceService.userName);
    setProfileStatus(salesforceService.profileStatus);
    setIsApproved(salesforceService.isApproved);
    if (salesforceService.userName) {
      setDonorName(salesforceService.userName);
    }

    loadCampaigns();
    loadFieldSet();
    loadDashboard();

    const handleHashChange = () => {
      const hash = (window.location.hash || '').toLowerCase();
      if (hash === '#donate') {
        setActiveTab('donate');
        setDonationSuccess(null);
      } else if (hash === '#profile' || hash === '#register') {
        setActiveTab('profile');
      } else if (hash === '#dashboard') {
        setActiveTab('dashboard');
        loadDashboard();
      } else if (hash === '#campaigns') {
        setActiveTab('campaigns');
      } else if (hash === '#home' || !hash || hash === '#') {
        setActiveTab(salesforceService.isLoggedIn ? 'dashboard' : 'home');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const switchTab = (tab) => {
    setActiveTab(tab);
    window.location.hash = tab;
    if (tab === 'donate') {
      setDonationSuccess(null);
    } else if (tab === 'dashboard') {
      loadDashboard();
    } else if (tab === 'profile') {
      loadFieldSet();
    }
  };

  const loadCampaigns = async () => {
    try {
      setLoadingCampaigns(true);
      const res = await salesforceService.getDonorCampaigns();
      setCampaigns(res || []);
      if (res && res.length > 0 && !selectedCampaignId) {
        setSelectedCampaignId(res[0].Id);
      }
    } catch (err) {
      console.error('Failed to load campaigns:', err);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const loadDashboard = async () => {
    try {
      setLoadingDashboard(true);
      const res = await salesforceService.getDonorDashboardSummary();
      setDashboardData(res);
      if (res?.profileStatus) {
        setProfileStatus(res.profileStatus);
        setIsApproved(res.isApproved || res.profileStatus === 'Approved');
      }
      if (res?.userName && res.userName !== 'Verified Donor' && res.userName !== 'Guest User') {
        setUserName(res.userName);
        setDonorName(res.userName);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoadingDashboard(false);
    }
  };

  const loadFieldSet = async () => {
    try {
      const [fields, existingProfile] = await Promise.all([
        salesforceService.getFieldSetMetadata('Donor'),
        salesforceService.getCurrentUserProfile()
      ]);
      if (fields && fields.length > 0) {
        const fillableFields = fields.filter(
          f => f.name !== 'Profile_Status__c' && f.name !== 'Name' && f.name !== 'Id'
        );
        setFieldSet(fillableFields);
        const initial = {};
        fillableFields.forEach(f => {
          let val = (existingProfile && existingProfile[f.name] !== undefined && existingProfile[f.name] !== null)
            ? existingProfile[f.name]
            : '';

          // If select option, match by either opt.value or opt.label to prevent desync
          if (f.type === 'select' && val && f.options && f.options.length > 0) {
            const matched = f.options.find(
              o => o.value === val || (o.label && String(o.label).toLowerCase() === String(val).toLowerCase())
            );
            if (matched) {
              val = matched.value;
            }
          }

          if (val !== '') {
            initial[f.name] = val;
          } else {
            // Pre-fill user names/email if available for fresh registration
            if (f.name === 'First_Name__c' && !initial.First_Name__c) {
              const parts = (salesforceService.userName || '').split(' ');
              initial.First_Name__c = parts[0] || '';
            } else if (f.name === 'Last_Name__c' && !initial.Last_Name__c) {
              const parts = (salesforceService.userName || '').split(' ');
              initial.Last_Name__c = parts.slice(1).join(' ') || '';
            } else if (f.name === 'Email_Address__c' && !initial.Email_Address__c && salesforceService.userEmail) {
              initial.Email_Address__c = salesforceService.userEmail || '';
            } else {
              initial[f.name] = f.type === 'checkbox' ? false : '';
            }
          }
        });
        if (existingProfile?.Id) {
          initial.Id = existingProfile.Id;
        }
        if (existingProfile?.Profile_Status__c) {
          const status = existingProfile.Profile_Status__c;
          setProfileStatus(status);
          setIsApproved(status === 'Approved');
        } else if (existingProfile?.Id) {
          setProfileStatus('In Approval');
          setIsApproved(false);
        } else if (!existingProfile) {
          setProfileStatus('Not Created');
          setIsApproved(false);
        }
        if (existingProfile) {
          const profileFullName = `${existingProfile.First_Name__c || ''} ${existingProfile.Last_Name__c || ''}`.trim() || existingProfile.Name;
          if (profileFullName && profileFullName !== 'Verified Donor') {
            setUserName(profileFullName);
            setDonorName(profileFullName);
          }
        }
        setFormData(initial);
      }
    } catch (err) {
      console.error('Failed to load donor field set:', err);
    }
  };

  const handleInputChange = (fieldName, value) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    if (formErrors[fieldName]) {
      setFormErrors(prev => ({ ...prev, [fieldName]: null }));
    }
  };

  const validateRegistration = () => {
    const errors = {};
    fieldSet.forEach(f => {
      const val = formData[f.name];
      if (f.required && (!val || (typeof val === 'string' && val.trim() === ''))) {
        errors[f.name] = `${f.label} is required.`;
      }
      if (f.type === 'email' && val) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(val)) {
          errors[f.name] = 'Please enter a valid email address.';
        }
      }
      if (f.type === 'tel' && val) {
        const phoneRegex = /^[0-9+\s\-().]{7,}$/;
        if (!phoneRegex.test(val)) {
          errors[f.name] = 'Please enter a valid phone number.';
        }
      }
    });
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!validateRegistration()) return;

    try {
      setIsSubmittingReg(true);
      const res = await salesforceService.saveDonorProfile(formData);
      if (res && res.success) {
        setRegistrationResult(res);
        if (res.status) {
          setProfileStatus(res.status);
          setIsApproved(res.status === 'Approved');
        }
        alert('Donor profile updated successfully and submitted for Administrator review!');
      } else {
        alert(res?.error || 'Saving profile failed. Please try again.');
      }
    } catch (err) {
      console.error('Registration/profile error:', err);
      alert('An unexpected error occurred during profile save.');
    } finally {
      setIsSubmittingReg(false);
    }
  };

  // Donation Submission
  const handleDonationSubmit = async (e) => {
    e.preventDefault();
    const finalAmount = customAmount ? parseFloat(customAmount) : selectedPreset;
    if (!finalAmount || finalAmount <= 0) {
      alert('Please select or enter a valid donation amount.');
      return;
    }
    if (!donorName.trim()) {
      alert('Please enter your full name.');
      return;
    }
    if (!donorEmail.trim()) {
      alert('Please enter your email address.');
      return;
    }

    try {
      setIsSubmittingDonation(true);
      const payload = {
        campaignId: selectedCampaignId || (campaigns[0] ? campaigns[0].Id : null),
        amount: finalAmount,
        donorName: donorName.trim(),
        donorEmail: donorEmail.trim(),
        donorPhone: donorPhone.trim(),
        donorMessage: isDedicated ? dedicationNote.trim() : ''
      };

      const result = await salesforceService.createDonation(payload);
      setDonationSuccess({
        amount: finalAmount,
        campaignName: campaigns.find(c => c.Id === selectedCampaignId)?.Name || 'General Giving Campaign',
        receiptNumber: result?.Receipt_Number__c || ('REC-' + Math.floor(10000000 + Math.random() * 90000000)),
        date: new Date().toLocaleDateString()
      });
      loadDashboard();
    } catch (err) {
      console.error('Donation failed:', err);
      alert('Donation processing failed: ' + (err.message || 'Please check details and try again.'));
    } finally {
      setIsSubmittingDonation(false);
    }
  };

  const openDonationForCampaign = (campaignId) => {
    if (!isLoggedIn) {
      window.location.href = salesforceService.loginUrl;
      return;
    }
    if (!isApproved) {
      switchTab('donate');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setSelectedCampaignId(campaignId);
    switchTab('donate');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    setShowProfileMenu(false);
    setIsLoggedIn(false);
    setActiveTab('home');
    try {
      localStorage.setItem('gms_donor_logged_in', 'false');
      localStorage.removeItem('gms_donor_user_name');
      localStorage.removeItem('gms_donor_profile_status');
    } catch (e) {
      console.warn('Could not clear local storage on logout:', e);
    }
    salesforceService.logout();
  };

  const userInitials = (userName || 'Donor')
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase();

  // Local simulated toggle helper for testing
  const toggleLocalAuthForTesting = (status) => {
    if (status === 'guest') {
      localStorage.setItem('gms_donor_logged_in', 'false');
      setIsLoggedIn(false);
      setIsApproved(false);
      setProfileStatus(null);
    } else if (status === 'pending') {
      localStorage.setItem('gms_donor_logged_in', 'true');
      localStorage.setItem('gms_donor_profile_status', 'Pending');
      setIsLoggedIn(true);
      setIsApproved(false);
      setProfileStatus('Pending');
    } else {
      localStorage.setItem('gms_donor_logged_in', 'true');
      localStorage.setItem('gms_donor_profile_status', 'Approved');
      setIsLoggedIn(true);
      setIsApproved(true);
      setProfileStatus('Approved');
    }
  };

  return (
    <div className="donor-portal-page">

      {/* Localhost quick simulation switcher */}
      {(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
        <div className="dev-auth-bar">
          <span className="dev-auth-title">Testing Role Preview:</span>
          <button
            className={`dev-btn ${isApproved ? 'active' : ''}`}
            onClick={() => toggleLocalAuthForTesting('approved')}
          >
            ✔ Verified Donor (Approved)
          </button>
          <button
            className={`dev-btn ${isLoggedIn && !isApproved ? 'active' : ''}`}
            onClick={() => toggleLocalAuthForTesting('pending')}
          >
            ⏳ Registered Donor (Pending Approval)
          </button>
          <button
            className={`dev-btn ${!isLoggedIn ? 'active' : ''}`}
            onClick={() => toggleLocalAuthForTesting('guest')}
          >
            🔒 Guest / Logged Out
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOP NAVIGATION BAR (WITH APPLICANT NAVBAR PARITY: LOGOUT & AVATAR DROPDOWN) */}
      {/* ========================================================================= */}
      <header className="donor-top-nav">
        <div className="nav-container">
          
          {/* BRAND LOGO */}
          <div className="nav-brand" onClick={() => switchTab('home')} style={{ cursor: 'pointer' }}>
            <div className="nav-brand-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </div>
            <div>
              <span className="brand-title">Donor Connect</span>
              <span className="brand-subtitle">Philanthropic Giving Portal</span>
            </div>
          </div>

          {/* CENTER NAVIGATION */}
          <nav className="nav-tabs">
            {isLoggedIn ? (
              <>
                <button
                  className={`nav-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                  onClick={() => switchTab('dashboard')}
                >
                  My Dashboard
                </button>
                <button
                  className={`nav-tab-btn ${activeTab === 'campaigns' ? 'active' : ''}`}
                  onClick={() => switchTab('campaigns')}
                >
                  Campaigns
                </button>
                <button
                  className={`nav-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
                  onClick={() => switchTab('profile')}
                >
                  My Profile
                </button>
                <button
                  className={`nav-tab-btn ${activeTab === 'home' ? 'active' : ''}`}
                  onClick={() => switchTab('home')}
                >
                  Home
                </button>
              </>
            ) : (
              <>
                <button
                  className={`nav-tab-btn ${activeTab === 'home' ? 'active' : ''}`}
                  onClick={() => switchTab('home')}
                >
                  Home
                </button>
                <button
                  className={`nav-tab-btn ${activeTab === 'campaigns' ? 'active' : ''}`}
                  onClick={() => switchTab('campaigns')}
                >
                  Campaigns
                </button>
              </>
            )}
          </nav>

          {/* RIGHT ACTION CONTROLS */}
          <div className="nav-actions">
            
            {/* Quick Donate Button:
                - If guest: redirects to login
                - If logged in & approved: opens donate tab */}
            {(!isLoggedIn || isApproved) && (
              <button
                className="quick-donate-btn"
                onClick={() => {
                  if (!isLoggedIn) {
                    window.location.href = salesforceService.loginUrl;
                  } else {
                    switchTab('donate');
                  }
                }}
              >
                Donate
              </button>
            )}

            {!isLoggedIn ? (
              <a href={salesforceService.loginUrl} className="navbar-login-btn">
                Login
              </a>
            ) : (
              <div className="profile-container" ref={profileMenuRef}>
                <div
                  className="profile-circle"
                  onClick={() => setShowProfileMenu(prev => !prev)}
                  title={userName}
                >
                  {userInitials}
                  {isApproved && (
                    <span className="verified-badge-pill" title="Verified Donor">✔</span>
                  )}
                </div>

                {showProfileMenu && (
                  <div
                    className="dropdown-menu-card"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <div className="dropdown-user-header">
                      <div className="dropdown-user-name">{userName}</div>
                      <div className={`dropdown-status-pill ${isApproved ? 'verified' : 'pending'}`}>
                        {isApproved ? '● Verified' : '● Under Review'}
                      </div>
                    </div>

                    <div className="dropdown-divider"></div>

                    <div
                      className="dropdown-item"
                      onClick={() => {
                        setShowProfileMenu(false);
                        switchTab('profile');
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                      My Profile
                    </div>

                    <div
                      className="dropdown-item"
                      onClick={() => {
                        setShowProfileMenu(false);
                        switchTab('dashboard');
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="7"></rect>
                        <rect x="14" y="3" width="7" height="7"></rect>
                        <rect x="14" y="14" width="7" height="7"></rect>
                        <rect x="3" y="14" width="7" height="7"></rect>
                      </svg>
                      Dashboard
                    </div>

                    <div
                      className="dropdown-item"
                      onClick={() => {
                        setShowProfileMenu(false);
                        switchTab('campaigns');
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                      </svg>
                      Active Campaigns
                    </div>

                    <div className="dropdown-divider"></div>

                    {/* LOGOUT BUTTON - EXACTLY MATCHING APPLICANT NAVBAR */}
                    <div
                      className="dropdown-item logout-item"
                      onClick={handleLogout}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        handleLogout();
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                      </svg>
                      Logout
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </header>

      {/* MAIN CONTENT CONTAINER */}
      <main className="donor-main-container">

        {/* ========================================================================= */}
        {/* 1. HOME LANDING VIEW (HERO + PLATFORM CAPABILITIES + MIDDLE CAMPAIGNS)     */}
        {/* ========================================================================= */}
        {activeTab === 'home' && (
          <div className="home-landing-view">

            {/* HERO SECTION (MATCHING IMAGE 2 EXACTLY) */}
            <section className="portal-hero-section">
              <div className="hero-content-wrapper">

                {/* Hero Left Text & Actions */}
                <div className="hero-text-col">
                  <div className="hero-tag-pill">
                    <span className="hero-tag-dot"></span>
                    <span>DONOR GIVING PLATFORM</span>
                  </div>

                  <h1 className="hero-main-title">
                    Empower Meaningful Causes with <span className="gradient-text">Direct Impact</span>
                  </h1>

                  <p className="hero-main-subtitle">
                    Discover verified philanthropic campaigns tailored to your giving mission. Support causes, track milestones,
                    and verify impact disbursements — all in one place.
                  </p>

                  <div className="hero-cta-buttons">
                    {!isLoggedIn ? (
                      <a href={salesforceService.loginUrl} className="hero-btn-primary">
                        Login to Contribute <span className="arrow-icon">→</span>
                      </a>
                    ) : (
                      <button
                        type="button"
                        className="hero-btn-primary"
                        onClick={() => switchTab('dashboard')}
                      >
                        Go to Dashboard <span className="arrow-icon">→</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="hero-btn-secondary"
                      onClick={() => {
                        document.getElementById('campaigns-section')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      Explore Campaigns <span className="arrow-icon">→</span>
                    </button>
                  </div>
                </div>

                {/* Hero Right Floating Stats Stack (Image 2) */}
                <div className="hero-stats-col">

                  {/* Stat Card 1: Donations Distributed */}
                  <div className="hero-stat-card">
                    <div className="stat-card-icon blue-bg">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                      </svg>
                    </div>
                    <div className="stat-card-info">
                      <span className="stat-card-title">Donations Distributed</span>
                      <span className="stat-card-value">40+</span>
                    </div>
                  </div>

                  {/* Stat Card 2: Active Programs */}
                  <div className="hero-stat-card">
                    <div className="stat-card-icon purple-bg">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 21h18"></path>
                        <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"></path>
                        <path d="M9 9h1"></path>
                        <path d="M9 13h1"></path>
                        <path d="M9 17h1"></path>
                        <path d="M14 9h1"></path>
                        <path d="M14 13h1"></path>
                        <path d="M14 17h1"></path>
                      </svg>
                    </div>
                    <div className="stat-card-info">
                      <span className="stat-card-title">Active Campaigns</span>
                      <span className="stat-card-value">9</span>
                    </div>
                  </div>

                  {/* Stat Card 3: Total Distributed */}
                  <div className="hero-stat-card">
                    <div className="stat-card-icon orange-bg">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path>
                        <path d="M12 18V6"></path>
                      </svg>
                    </div>
                    <div className="stat-card-info">
                      <span className="stat-card-title">Total Distributed</span>
                      <span className="stat-card-value">$9.4K</span>
                    </div>
                  </div>

                </div>

              </div>
            </section>

            {/* PLATFORM CAPABILITIES SECTION (MATCHING IMAGE 3 EXACTLY) */}
            <section className="capabilities-section">
              <div className="capabilities-container">
                <div className="capabilities-header">
                  <span className="capabilities-tag">PLATFORM CAPABILITIES</span>
                  <h2 className="capabilities-title">End-to-End Philanthropic Giving</h2>
                  <p className="capabilities-subtitle">
                    From donor verification to campaign contributions, milestone auditing, and real-time impact reporting.
                  </p>
                </div>

                <div className="capabilities-grid">

                  {/* Capability 1: Streamlined Giving */}
                  <div className="capability-card">
                    <div className="capability-icon-wrap orange-glow">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="#f97316" stroke="#ea580c" strokeWidth="1">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                      </svg>
                    </div>
                    <h3 className="capability-card-title">Streamlined Giving</h3>
                    <p className="capability-card-text">
                      Intuitive donor portal tailored specifically to your philanthropic entity. Complete verification, pledge funds, and support causes with ease.
                    </p>
                  </div>

                  {/* Capability 2: Verified Transparency */}
                  <div className="capability-card">
                    <div className="capability-icon-wrap blue-glow">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="#38bdf8" stroke="#0284c7" strokeWidth="1.5">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                      </svg>
                    </div>
                    <h3 className="capability-card-title">Verified Transparency</h3>
                    <p className="capability-card-text">
                      Rigorous administrative review guarantees authenticity, compliance, and transparent governance for all donors.
                    </p>
                  </div>

                  {/* Capability 3: Real-time Progress Tracking */}
                  <div className="capability-card">
                    <div className="capability-icon-wrap purple-glow">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7e22ce" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" fill="#ede9fe"></rect>
                        <polyline points="7 14 11 10 14 13 17 8"></polyline>
                      </svg>
                    </div>
                    <h3 className="capability-card-title">Real-time Progress Tracking</h3>
                    <p className="capability-card-text">
                      Monitor every milestone, donation receipt, disbursement audit, and project achievement in real time.
                    </p>
                  </div>

                </div>
              </div>
            </section>

            {/* MIDDLE SECTION: EXPLORE CAMPAIGNS (MATCHING IMAGE 4 EXACTLY) */}
            <section id="campaigns-section" className="middle-campaigns-section">
              <div className="campaigns-container">
                <div className="campaigns-section-header">
                  <span className="hero-badge">ACTIVE PHILANTHROPY INITIATIVES</span>
                  <h2 className="section-title">Explore Active Campaigns</h2>
                  <p className="section-subtitle">
                    Browse verified campaigns that empower communities, provide emergency medical support,
                    and drive sustainable development. Every contribution creates measurable impact.
                  </p>
                </div>

                {loadingCampaigns ? (
                  <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading active campaigns...</p>
                  </div>
                ) : campaigns.length === 0 ? (
                  <div className="empty-state">
                    <p>No active campaigns available at this moment.</p>
                  </div>
                ) : (
                  <div className="campaigns-grid">
                    {campaigns.map(camp => (
                      <div key={camp.Id} className="campaign-card">
                        <div className="campaign-card-header">
                          <span className="campaign-tag">{camp.Program__r?.Name || 'PHILANTHROPY FUND'}</span>
                          <span className="campaign-status">Active</span>
                        </div>

                        <h3 className="campaign-title">{camp.Name}</h3>
                        <p className="campaign-desc">
                          {camp.Description__c || camp.Overview__c || 'Support this vital community initiative to provide ongoing medical, educational, and livelihood assistance.'}
                        </p>

                        <div className="campaign-metrics">
                          <div className="metric-row">
                            <span className="metric-label">Target Revenue</span>
                            <span className="metric-value">
                              ${(camp.Expected_Revenue_in_Campaign__c || camp.Funding_Goal__c || 250000).toLocaleString()}
                            </span>
                          </div>
                          <div className="progress-bar-bg">
                            <div className="progress-bar-fill" style={{ width: '64%' }}></div>
                          </div>
                        </div>

                        <div className="campaign-card-footer">
                          <button
                            className="donor-btn-primary"
                            onClick={() => openDonationForCampaign(camp.Id)}
                          >
                            Donate to this Campaign
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

          </div>
        )}

        {/* ========================================================================= */}
        {/* DEDICATED CAMPAIGNS TAB (DOES NOT REDIRECT TO HOME)                       */}
        {/* ========================================================================= */}
        {activeTab === 'campaigns' && (
          <div className="campaigns-tab-view">
            <div className="campaigns-tab-header">
              <span className="campaigns-tab-tag">ACTIVE PHILANTHROPY INITIATIVES</span>
              <h1 className="campaigns-tab-title">Active Philanthropy Campaigns</h1>
              <p className="campaigns-tab-desc">
                Browse verified campaigns that empower communities, provide emergency medical support,
                and drive sustainable development. Every contribution creates measurable impact.
              </p>
            </div>

            {loadingCampaigns ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading active campaigns...</p>
              </div>
            ) : campaigns.length === 0 ? (
              <div className="empty-state">
                <p>No active campaigns available at this moment.</p>
              </div>
            ) : (
              <div className="campaigns-grid">
                {campaigns.map(camp => (
                  <div key={camp.Id} className="campaign-card">
                    <div className="campaign-card-header">
                      <span className="campaign-tag">{camp.Program__r?.Name || 'PHILANTHROPY FUND'}</span>
                      <span className="campaign-status">Active</span>
                    </div>

                    <h3 className="campaign-title">{camp.Name}</h3>
                    <p className="campaign-desc">
                      {camp.Description__c || camp.Overview__c || 'Support this vital community initiative to provide ongoing medical, educational, and livelihood assistance.'}
                    </p>

                    <div className="campaign-metrics">
                      <div className="metric-row">
                        <span className="metric-label">Target Revenue</span>
                        <span className="metric-value">
                          ${(camp.Expected_Revenue_in_Campaign__c || camp.Funding_Goal__c || 250000).toLocaleString()}
                        </span>
                      </div>
                      <div className="progress-bar-bg">
                        <div className="progress-bar-fill" style={{ width: '64%' }}></div>
                      </div>
                    </div>

                    <div className="campaign-card-footer">
                      <button
                        className="donor-btn-primary"
                        onClick={() => openDonationForCampaign(camp.Id)}
                      >
                        Donate to this Campaign
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. DONATE NOW TAB (IMAGE 2) - GATED BY ADMIN APPROVAL ACCESS CONTROL       */}
        {/* ========================================================================= */}
        {activeTab === 'donate' && (
          <div className="donate-tab-view">
            
            {/* ACCESS CHECK 1: NOT LOGGED IN -> PROMPT LOGIN */}
            {!isLoggedIn ? (
              <div className="donor-card approval-locked-card">
                <div className="lock-icon-container">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </div>
                <h2>Donor Sign In Required</h2>
                <p>
                  To donate directly to verified campaigns, please log in with your donor account or complete donor registration.
                </p>
                <div className="locked-actions">
                  <a href={salesforceService.loginUrl} className="donor-btn-primary">
                    Sign In to Donor Portal
                  </a>
                  <a href={salesforceService.loginUrl} className="donor-btn-outline">
                    Register as a Donor
                  </a>
                </div>
              </div>
            ) : !isApproved ? (
              /* ACCESS CHECK 2: LOGGED IN BUT WAITING FOR ADMIN APPROVAL */
              <div className="donor-card approval-locked-card">
                <div className="clock-icon-container">
                  <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                </div>
                <h2>Admin Approval Required to Unlock Donations</h2>
                <div className="status-pill-warning">
                  <span>● Status: Under Administrator Review</span>
                </div>
                <p>
                  Welcome, <strong>{userName}</strong>! Your donor account has been created and submitted for verification.
                  In accordance with regulatory compliance and institutional governance, campaign donation and payment features (Image 2)
                  will be unlocked automatically once the administrator verifies and approves your donor profile.
                </p>
                <div className="locked-actions">
                  <button
                    type="button"
                    className="donor-btn-primary"
                    onClick={() => switchTab('dashboard')}
                  >
                    View Verification Roadmap on Dashboard
                  </button>
                  <button
                    type="button"
                    className="donor-btn-outline"
                    onClick={() => switchTab('campaigns')}
                  >
                    Preview Open Campaigns
                  </button>
                </div>
              </div>
            ) : !donationSuccess ? (
              /* ACCESS CHECK 3: APPROVED DONOR -> RENDER IMAGE 2 DONATION FORM */
              <div className="bikur-giving-card">
                <div className="giving-header">
                  <h2>Donate Today</h2>
                  <p>
                    We provide crucial support to those facing illness and hardship. Your contributions
                    empower us to make a difference by providing resources to our community.
                  </p>
                </div>

                <form onSubmit={handleDonationSubmit} className="giving-form">
                  {/* Preset Amount Grid - EXACT MATCH TO IMAGE 2 */}
                  <label className="giving-section-label">SELECT DONATION AMOUNT</label>
                  <div className="preset-grid">
                    {PRESET_AMOUNTS.map(preset => {
                      const isSelected = selectedPreset === preset.amount && !customAmount;
                      return (
                        <div
                          key={preset.amount}
                          className={`preset-card ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedPreset(preset.amount);
                            setCustomAmount('');
                          }}
                        >
                          <div className="preset-checkbox">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                            />
                            <span className="preset-amount">{preset.label}</span>
                          </div>
                          <span className="preset-desc">{preset.desc}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Custom Amount Field */}
                  <div className="custom-amount-wrapper">
                    <label className="donor-form-label">Or Custom Amount ($)</label>
                    <div className="custom-input-group">
                      <span className="currency-symbol">$</span>
                      <input
                        type="number"
                        min="1"
                        placeholder="Enter other amount"
                        value={customAmount}
                        onChange={(e) => {
                          setCustomAmount(e.target.value);
                          setSelectedPreset(null);
                        }}
                        className="donor-input"
                      />
                    </div>
                  </div>

                  {/* Campaign Designation */}
                  <div className="giving-field-group">
                    <label className="donor-form-label">Designate Campaign / Program</label>
                    <select
                      value={selectedCampaignId}
                      onChange={(e) => setSelectedCampaignId(e.target.value)}
                      className="donor-input"
                    >
                      {campaigns.map(c => (
                        <option key={c.Id} value={c.Id}>
                          {c.Name} {c.Program__r?.Name ? `(${c.Program__r.Name})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dedication Checkbox */}
                  <div className="giving-field-group">
                    <label className="donor-checkbox-label">
                      <input
                        type="checkbox"
                        checked={isDedicated}
                        onChange={(e) => setIsDedicated(e.target.checked)}
                      />
                      <span>Dedicate my donation in honor or memory of someone</span>
                    </label>

                    {isDedicated && (
                      <textarea
                        rows={2}
                        placeholder="e.g. In loving memory of Jane Doe / In honor of our community healthcare workers"
                        value={dedicationNote}
                        onChange={(e) => setDedicationNote(e.target.value)}
                        className="donor-input dedication-textarea"
                      />
                    )}
                  </div>

                  {/* Donor Info Inputs */}
                  <div className="donor-info-grid">
                    <div className="donor-form-group">
                      <label className="donor-form-label">
                        Full Name <span className="req-star">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Rachel Green"
                        value={donorName}
                        onChange={(e) => setDonorName(e.target.value)}
                        className="donor-input"
                        required
                      />
                    </div>

                    <div className="donor-form-group">
                      <label className="donor-form-label">
                        Email Address <span className="req-star">*</span>
                      </label>
                      <input
                        type="email"
                        placeholder="rachel@example.com"
                        value={donorEmail}
                        onChange={(e) => setDonorEmail(e.target.value)}
                        className="donor-input"
                        required
                      />
                    </div>

                    <div className="donor-form-group span-full">
                      <label className="donor-form-label">Phone Number (Optional)</label>
                      <input
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        value={donorPhone}
                        onChange={(e) => setDonorPhone(e.target.value)}
                        className="donor-input"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="giving-actions">
                    <button
                      type="submit"
                      disabled={isSubmittingDonation}
                      className="giving-submit-btn"
                    >
                      {isSubmittingDonation ? 'Processing Donation...' : 'Donate Now'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* Success Confirmation Card */
              <div className="donor-card giving-success-card">
                <div className="success-icon-badge">✓</div>
                <h2>Thank You for Your Generous Donation!</h2>
                <p>
                  Your contribution of <strong>${donationSuccess.amount.toLocaleString()}</strong> towards{' '}
                  <strong>{donationSuccess.campaignName}</strong> has been successfully processed.
                </p>

                <div className="receipt-summary-box">
                  <div className="receipt-row">
                    <span>Receipt Number:</span>
                    <strong>{donationSuccess.receiptNumber}</strong>
                  </div>
                  <div className="receipt-row">
                    <span>Date:</span>
                    <strong>{donationSuccess.date}</strong>
                  </div>
                  <div className="receipt-row">
                    <span>Status:</span>
                    <strong className="status-badge-paid">Payment Successful</strong>
                  </div>
                </div>

                <div className="success-actions">
                  <button
                    className="donor-btn-primary"
                    onClick={() => window.print()}
                  >
                    Print / Download Receipt
                  </button>
                  <button
                    className="donor-btn-outline"
                    onClick={() => {
                      setDonationSuccess(null);
                      setCustomAmount('');
                    }}
                  >
                    Make Another Donation
                  </button>
                  <button
                    className="donor-btn-outline"
                    onClick={() => switchTab('dashboard')}
                  >
                    Go to My Dashboard
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. DONOR REGISTRATION TAB                                                 */}
        {/* ========================================================================= */}
        {/* ========================================================================= */}
        {/* 3. DONOR PROFILE TAB (IMAGE 3)                                             */}
        {/* ========================================================================= */}
        {activeTab === 'profile' && (() => {
          const effectiveApproved = isApproved || profileStatus === 'Approved';
          return (
          <div className="profile-page-wrapper">
            <div className="profile-card-container">
              <div className="profile-header-card">
                <div className="profile-header-top">
                  <div>
                    <h1 className="profile-header-title">Donor Profile &amp; Verification</h1>
                    <p className="profile-header-subtitle">
                      {effectiveApproved
                        ? 'Your donor profile has been verified and approved by the Administrator. Details are locked for compliance and security.'
                        : 'Please provide your philanthropic or institutional details below. Submissions undergo administrator review prior to unlocking campaign donation features.'
                      }
                    </p>
                  </div>
                  <div>
                    {effectiveApproved ? (
                      <span className="profile-status-badge approved">
                        ✔ Profile Status: <strong>Approved by Administrator (Locked)</strong>
                      </span>
                    ) : (profileStatus === 'Pending' || profileStatus === 'In Approval') ? (
                      <span className="profile-status-badge pending">
                        ⏳ Profile Status: <strong>Under Administrator Review (Pending Approval)</strong>
                      </span>
                    ) : (
                      <span className="profile-status-badge incomplete">
                        📝 Profile Status: <strong>Not Submitted (Action Required)</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* LOCKED PROFILE BANNER */}
              {effectiveApproved && (
                <div className="profile-locked-notice">
                  <div className="locked-notice-main">
                    <span className="locked-notice-icon">🔒</span>
                    <div className="locked-notice-text">
                      <h3>Profile Verified &amp; Locked</h3>
                      <p>
                        Your donor credentials are officially approved by the Administrator.
                        Profile details are permanently locked to maintain audit compliance and cannot be re-submitted.
                      </p>
                    </div>
                  </div>
                  <div className="locked-notice-actions">
                    <button
                      type="button"
                      className="locked-notice-btn"
                      onClick={() => switchTab('campaigns')}
                    >
                      Browse Campaigns →
                    </button>
                    <button
                      type="button"
                      className="locked-notice-btn secondary"
                      onClick={() => switchTab('dashboard')}
                    >
                      My Dashboard →
                    </button>
                  </div>
                </div>
              )}

              {!registrationResult ? (
                <form onSubmit={handleRegisterSubmit} className="donor-form" noValidate>
                  <div className="donor-form-grid">
                    {fieldSet.map(field => {
                      const value = formData[field.name] || '';
                      const error = formErrors[field.name];

                      return (
                        <div
                          key={field.name}
                          className={`donor-form-group ${
                            field.type === 'textarea' || field.name === 'Mailing_Street__c' ? 'span-full' : ''
                          }`}
                        >
                          <label className="donor-form-label">
                            {field.label}
                            {field.required && !effectiveApproved && <span className="req-star"> *</span>}
                          </label>

                          {field.type === 'select' ? (
                            <select
                              value={value}
                              disabled={effectiveApproved}
                              onChange={e => handleInputChange(field.name, e.target.value)}
                              className={`donor-input ${effectiveApproved ? 'input-locked' : ''} ${error ? 'input-error' : ''}`}
                            >
                              <option value="">-- Select {field.label} --</option>
                              {(field.options || []).map(opt => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          ) : field.type === 'textarea' || field.name === 'Mailing_Street__c' ? (
                            <textarea
                              rows={3}
                              value={value}
                              disabled={effectiveApproved}
                              onChange={e => handleInputChange(field.name, e.target.value)}
                              placeholder={effectiveApproved ? '' : `Enter ${field.label}...`}
                              className={`donor-input ${effectiveApproved ? 'input-locked' : ''} ${error ? 'input-error' : ''}`}
                            />
                          ) : field.type === 'checkbox' ? (
                            <label className="donor-checkbox-label">
                              <input
                                type="checkbox"
                                checked={Boolean(value)}
                                disabled={effectiveApproved}
                                onChange={e => handleInputChange(field.name, e.target.checked)}
                              />
                              <span>Yes, I confirm</span>
                            </label>
                          ) : (
                            <input
                              type={field.type || 'text'}
                              value={value}
                              disabled={effectiveApproved}
                              onChange={e => handleInputChange(field.name, e.target.value)}
                              placeholder={effectiveApproved ? '' : `Enter ${field.label}...`}
                              className={`donor-input ${effectiveApproved ? 'input-locked' : ''} ${error ? 'input-error' : ''}`}
                            />
                          )}

                          {error && <span className="field-error-msg">{error}</span>}
                        </div>
                      );
                    })}
                  </div>

                  <div className="donor-form-actions">
                    {!effectiveApproved ? (
                      <button
                        type="submit"
                        disabled={isSubmittingReg}
                        className="submit-profile-btn"
                      >
                        {isSubmittingReg ? 'Submitting for Review...' : 'Submit Donor Registration'}
                      </button>
                    ) : (
                      <div className="profile-locked-badge-btn">
                        <span>🔒 Profile Verified &amp; Approved — Submissions Locked</span>
                      </div>
                    )}
                  </div>
                </form>
              ) : (
                <div className="registration-success-card">
                  <div className="success-icon-badge">✓</div>
                  <h2>Profile Submitted Successfully!</h2>
                  <p>
                    Your donor profile details have been saved and submitted to the{' '}
                    <strong>Administrator Verification Review</strong>. You will receive access to campaign donations
                    once approved by the administrator.
                  </p>
                  <div className="success-actions">
                    <button
                      type="button"
                      className="donor-btn-primary"
                      onClick={() => switchTab('dashboard')}
                    >
                      View on Dashboard →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          );
        })()}

        {/* ========================================================================= */}
        {/* 4. DONOR DASHBOARD WITH ROADMAP FLOW (MATCHING IMAGE 4 EXACTLY)          */}
        {/* ========================================================================= */}
        {activeTab === 'dashboard' && isLoggedIn && (
          <div className="dashboard-tab-view">

            {/* TOP CARD: WELCOME & PROFILE STATUS (IMAGE 4 TOP PURPLE CARD) */}
            <div className="dashboard-welcome-banner">
              <div className="banner-left-info">
                <span className="banner-tag">DONOR PORTAL</span>
                <h1 className="banner-greeting">Welcome back, {userName || 'Philanthropic Partner'}!</h1>
                <p className="banner-subtext">
                  Track your verification status, explore active funding opportunities, and manage charitable donations.
                </p>
              </div>

              <div className="banner-right-status">
                <div className="profile-status-box">
                  <span className="profile-status-label">YOUR PROFILE STATUS</span>
                  <div className={`profile-status-pill ${isApproved ? 'verified' : 'pending'}`}>
                    <span className="status-dot">●</span>
                    <span>{isApproved ? 'Verified Profile' : 'Under Admin Review'}</span>
                  </div>
                  <button
                    className="view-profile-btn"
                    onClick={() => switchTab('profile')}
                  >
                    View Profile Details →
                  </button>
                </div>
              </div>
            </div>

            {/* ROADMAP SECTION: PROCESS GUIDE (IMAGE 4 STEPPER & 4 MILESTONE CARDS) */}
            <div className="donor-card roadmap-container-card">
              
              {/* Header with Title and Step Counter */}
              <div className="roadmap-header">
                <div>
                  <span className="roadmap-eyebrow">DONOR ROADMAP</span>
                  <h2 className="roadmap-title">Donor Application Process</h2>
                  <p className="roadmap-subtitle">
                    Follow these 4 essential milestones to complete your donor registration, verification, and support impactful causes:
                  </p>
                </div>

                <div className="roadmap-step-indicator">
                  <span className="step-indicator-badge">
                    {!isApproved
                      ? 'Step 2 of 4: In Progress'
                      : (dashboardData?.totalTransactions || 0) > 0
                        ? 'Step 4 of 4: Completed'
                        : 'Step 3 of 4: In Progress'
                    }
                  </span>
                </div>
              </div>

              {/* HORIZONTAL STEPPER WITH CONNECTING LINES */}
              <div className="stepper-horizontal-bar">
                {/* Step 1: Create Profile */}
                <div className="stepper-milestone completed">
                  <div className="stepper-icon-circle">✓</div>
                  <span className="stepper-label">Create Profile</span>
                </div>

                <div className={`stepper-connector ${isApproved ? 'completed' : 'in-progress'}`}></div>

                {/* Step 2: Verification */}
                <div className={`stepper-milestone ${isApproved ? 'completed' : 'active'}`}>
                  <div className="stepper-icon-circle">
                    {isApproved ? '✓' : '2'}
                  </div>
                  <span className="stepper-label">Verification</span>
                </div>

                <div className={`stepper-connector ${isApproved ? 'completed' : ''}`}></div>

                {/* Step 3: Browse Campaigns */}
                <div className={`stepper-milestone ${isApproved ? ((dashboardData?.totalTransactions || 0) > 0 ? 'completed' : 'active') : 'locked'}`}>
                  <div className="stepper-icon-circle">
                    {(dashboardData?.totalTransactions || 0) > 0 ? '✓' : '3'}
                  </div>
                  <span className="stepper-label">Browse Campaigns</span>
                </div>

                <div className={`stepper-connector ${(dashboardData?.totalTransactions || 0) > 0 ? 'completed' : ''}`}></div>

                {/* Step 4: Contribute & Track */}
                <div className={`stepper-milestone ${(dashboardData?.totalTransactions || 0) > 0 ? 'completed' : (isApproved ? 'active' : 'locked')}`}>
                  <div className="stepper-icon-circle">
                    {(dashboardData?.totalTransactions || 0) > 0 ? '✓' : '4'}
                  </div>
                  <span className="stepper-label">Contribute &amp; Track</span>
                </div>
              </div>

              {/* 4 CARDS BELOW STEPPER */}
              <div className="roadmap-cards-grid">
                
                {/* CARD 1: STEP 01 */}
                <div className="roadmap-step-card">
                  <div className="step-card-top">
                    <div className="step-card-icon user-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                    </div>
                    <span className="step-card-num">STEP 01</span>
                  </div>

                  <div className="step-card-badge created">
                    Profile Created
                  </div>

                  <h3 className="step-card-heading">Create Profile</h3>
                  <p className="step-card-text">
                    Select your donor category (Individual, Corporate, Foundation, or Trust) and submit mandatory profile details.
                  </p>

                  <div className="step-card-footer">
                    <button
                      className="step-card-link-btn"
                      onClick={() => switchTab('profile')}
                    >
                      Donor Profile →
                    </button>
                  </div>
                </div>

                {/* CARD 2: STEP 02 */}
                <div className={`roadmap-step-card ${isApproved ? 'card-verified' : 'card-pending'}`}>
                  <div className="step-card-top">
                    <div className="step-card-icon shield-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        {isApproved && <path d="M9 12l2 2 4-4"></path>}
                      </svg>
                    </div>
                    <span className="step-card-num">STEP 02</span>
                  </div>

                  <div className={`step-card-badge ${isApproved ? 'verified' : 'pending'}`}>
                    {isApproved ? 'Verified & Eligible' : 'Under Admin Review'}
                  </div>

                  <h3 className="step-card-heading">Get Verified</h3>
                  <p className="step-card-text">
                    Your profile undergoes administrator review to verify donor credentials and compliance for philanthropic giving.
                  </p>

                  <div className="step-card-footer">
                    <button
                      className={`step-card-action-btn ${isApproved ? 'btn-green' : 'btn-amber'}`}
                      disabled={!isApproved}
                      onClick={() => switchTab('dashboard')}
                    >
                      {isApproved ? 'Verified' : 'In Review'}
                    </button>
                  </div>
                </div>

                {/* CARD 3: STEP 03 */}
                <div className={`roadmap-step-card ${!isApproved ? 'card-locked' : ''}`}>
                  <div className="step-card-top">
                    <div className="step-card-icon compass-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
                      </svg>
                    </div>
                    <span className="step-card-num">STEP 03</span>
                  </div>

                  <div className={`step-card-badge ${isApproved ? 'ready' : 'locked'}`}>
                    {isApproved ? 'Ready to Give' : 'Locked'}
                  </div>

                  <h3 className="step-card-heading">Browse Campaigns</h3>
                  <p className="step-card-text">
                    Explore verified campaigns matching your philanthropic focus, view fundraising goals, and inspect impact milestones.
                  </p>

                  <div className="step-card-footer">
                    <button
                      className="step-card-action-btn btn-blue"
                      disabled={!isApproved}
                      onClick={() => switchTab('campaigns')}
                    >
                      {isApproved ? 'Explore Campaigns →' : 'Requires Approval'}
                    </button>
                  </div>
                </div>

                {/* CARD 4: STEP 04 */}
                <div className={`roadmap-step-card ${!isApproved ? 'card-locked' : ''}`}>
                  <div className="step-card-top">
                    <div className="step-card-icon doc-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                      </svg>
                    </div>
                    <span className="step-card-num">STEP 04</span>
                  </div>

                  <div className={`step-card-badge ${(dashboardData?.totalTransactions || 0) > 0 ? 'active-green' : (isApproved ? 'ready' : 'locked')}`}>
                    {(dashboardData?.totalTransactions || 0) > 0
                      ? `${dashboardData.totalTransactions} Contributions`
                      : (isApproved ? 'Ready to Fund' : 'Locked')
                    }
                  </div>

                  <h3 className="step-card-heading">Contribute &amp; Track</h3>
                  <p className="step-card-text">
                    Make charitable contributions, sponsor verified milestones, and track real-time impact and disbursement reports.
                  </p>

                  <div className="step-card-footer">
                    <button
                      className="step-card-link-btn"
                      disabled={!isApproved}
                      onClick={() => switchTab('campaigns')}
                    >
                      {isApproved
                        ? `My Contributions (${dashboardData?.totalTransactions || 0}) →`
                        : 'Locked until Approved'
                      }
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* METRIC STAT CARDS */}
            <div className="stat-grid">
              <div className="stat-card">
                <span className="stat-label">Total Donations Given</span>
                <span className="stat-number">
                  ${(dashboardData?.totalDonations || 0).toLocaleString()}
                </span>
                <span className="stat-desc">Currency: USD</span>
              </div>

              <div className="stat-card">
                <span className="stat-label">Campaigns Supported</span>
                <span className="stat-number">
                  {dashboardData?.campaignsSupported || 0}
                </span>
                <span className="stat-desc">Active Programs</span>
              </div>

              <div className="stat-card">
                <span className="stat-label">Total Transactions</span>
                <span className="stat-number">
                  {dashboardData?.totalTransactions || 0}
                </span>
                <span className="stat-desc">Completed</span>
              </div>

              <div className="stat-card">
                <span className="stat-label">Donor Verification Status</span>
                <span className={`stat-badge ${isApproved ? 'approved' : 'pending-status'}`}>
                  {isApproved ? 'Approved' : 'Under Review'}
                </span>
                <span className="stat-desc">
                  {isApproved ? 'Verified by Admin' : 'Review in Progress'}
                </span>
              </div>
            </div>

            {/* DONATION HISTORY TABLE */}
            <div className="donor-card table-section">
              <div className="section-header">
                <h2>My Donations and Payment History</h2>
                <p>Comprehensive transaction record with verifiable receipts and allocation tracking.</p>
              </div>

              {loadingDashboard ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Loading donation history...</p>
                </div>
              ) : !dashboardData?.recentDonations || dashboardData.recentDonations.length === 0 ? (
                <div className="empty-state">
                  <p>No donation records found yet.</p>
                  {isApproved ? (
                    <button
                      className="donor-btn-primary"
                      onClick={() => switchTab('donate')}
                      style={{ marginTop: '1rem' }}
                    >
                      Make Your First Donation
                    </button>
                  ) : (
                    <p style={{ marginTop: '0.5rem', color: '#b45309', fontSize: '0.9rem' }}>
                      Donations will become available once your profile is verified and approved by the admin.
                    </p>
                  )}
                </div>
              ) : (
                <div className="table-wrapper">
                  <table className="donor-table">
                    <thead>
                      <tr>
                        <th>Receipt #</th>
                        <th>Campaign</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.recentDonations.map(don => (
                        <tr key={don.Id}>
                          <td className="receipt-cell">{don.Receipt_Number__c || don.Name}</td>
                          <td>{don.Donor_Campaign__r?.Name || 'General Giving Fund'}</td>
                          <td className="amount-cell">${(don.Donation_Amount__c || 0).toLocaleString()}</td>
                          <td>
                            <span className="status-badge-paid">
                              {don.Payment_Status__c || 'Successful'}
                            </span>
                          </td>
                          <td>
                            {don.Payment_Date__c
                              ? new Date(don.Payment_Date__c).toLocaleDateString()
                              : 'Recent'}
                          </td>
                          <td>
                            <button
                              className="table-action-btn"
                              onClick={() => window.print()}
                            >
                              Receipt PDF
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

      </main>

      {/* ========================================================================= */}
      {/* MODERN FOOTER (RENDERED ONLY ON HOME PAGE)                                */}
      {/* ========================================================================= */}
      {activeTab === 'home' && (
        <footer className="portal-footer">
          <div className="footer-container">
            <div className="footer-main-row">
              
              {/* Footer Brand */}
              <div className="footer-brand-col">
                <div className="footer-logo">
                  <span className="footer-brand-title">Grant Management System</span>
                  <span className="footer-brand-sub">Philanthropic Giving &amp; Impact</span>
                </div>
                <p className="footer-desc">
                  Enabling transparent, auditable, and impactful grant distribution and charitable giving for communities worldwide.
                </p>
              </div>

              {/* Quick Links */}
              <div className="footer-links-col">
                <span className="footer-col-title">Platform</span>
                <a href="#home" onClick={(e) => { e.preventDefault(); switchTab('home'); }}>Home</a>
                <a href="#campaigns" onClick={(e) => { e.preventDefault(); switchTab('campaigns'); }}>Campaigns</a>
                {isLoggedIn && <a href="#dashboard" onClick={(e) => { e.preventDefault(); switchTab('dashboard'); }}>Dashboard</a>}
                {isLoggedIn && <a href="#profile" onClick={(e) => { e.preventDefault(); switchTab('profile'); }}>Donor Profile</a>}
                {!isLoggedIn && <a href={salesforceService.loginUrl}>Donor Login</a>}
              </div>

              <div className="footer-links-col">
                <span className="footer-col-title">Security &amp; Compliance</span>
                <span>Audited 501(c)(3) Giving</span>
                <span>Real-Time Milestone Verification</span>
                <span>Encrypted Payment Processing</span>
              </div>

            </div>

            <div className="footer-bottom-row">
              <span>&copy; {new Date().getFullYear()} Grant Management Platform. All rights reserved.</span>
              <div className="footer-legal-links">
                <span>Privacy Policy</span>
                <span>Terms of Service</span>
                <span>Security Standards</span>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default DonorPortal;
