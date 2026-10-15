import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import salesforceService from '../services/salesforceService';
import './Home.css';

export default function Home({ forceLanding = false, forceDashboard = false }) {
  const { isLoggedIn, userName, profileStatus, refreshProfileStatus } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isLandingRoute = forceLanding || location.pathname === '/landing' || location.pathname === '/';
  const isDashboardRoute = forceDashboard || location.pathname === '/dashboard';
  const showDashboard = isLoggedIn && isDashboardRoute && !forceLanding;

  const [stats, setStats] = useState({
    applications: 0,
    programs: 0,
    distributed: '$0'
  });
  const [profile, setProfile] = useState(null);
  const [myApplications, setMyApplications] = useState([]);
  const [recentPrograms, setRecentPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [isLoggedIn]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch home stats
      try {
        const statsData = await salesforceService.getHomeStats();
        if (statsData) {
          setStats({
            applications: statsData.totalApplications || 0,
            programs: statsData.activePrograms || 0,
            distributed: statsData.totalFunded || '$0'
          });
        }
      } catch (err) {
        console.warn('Could not load home stats:', err);
      }

      // If user is logged in, fetch their profile, applications, and programs
      if (isLoggedIn) {
        const [profileData, appsData, progsData] = await Promise.allSettled([
          salesforceService.getCurrentUserProfile(),
          salesforceService.getMyApplications(),
          salesforceService.getPrograms()
        ]);

        if (profileData.status === 'fulfilled' && profileData.value) {
          setProfile(profileData.value);
        } else {
          setProfile(null);
        }

        if (appsData.status === 'fulfilled' && Array.isArray(appsData.value)) {
          setMyApplications(appsData.value);
        }

        if (progsData.status === 'fulfilled' && Array.isArray(progsData.value)) {
          setRecentPrograms(progsData.value.slice(0, 3));
        }

        if (refreshProfileStatus) {
          await refreshProfileStatus();
        }
      }
    } catch (e) {
      console.error('Error loading dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Profile status helpers
  const currentStatus = profile?.Profile_Status__c || profileStatus;
  const hasProfile = Boolean(profile && (profile.Id || profile.Name || profile.Organization_Type__c));
  const isApproved = currentStatus === 'Approved';
  const isInReview = currentStatus === 'In Approval';
  const isPending = currentStatus === 'Pending' || currentStatus === 'Draft';
  const isRejected = currentStatus === 'Not Eligible';

  // -------------------------------------------------------------
  // LOGGED-IN APPLICANT DASHBOARD
  // -------------------------------------------------------------
  if (showDashboard) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-container">
          
          {/* Welcome Header */}
          <div className="dashboard-welcome-banner">
            <div className="welcome-text-col">
              <span className="welcome-badge">APPLICANT PORTAL</span>
              <h1 className="welcome-title">
                Welcome back, <span className="highlight-name">{userName || 'Applicant'}</span>!
              </h1>
              <p className="welcome-subtitle">
                Track your verification status, explore active funding opportunities, and manage grant applications.
              </p>
            </div>

            <div className="welcome-status-card">
              <div className="status-label-small">YOUR PROFILE STATUS</div>
              <div className="status-indicator-row">
                {!hasProfile ? (
                  <span className="status-tag status-tag-missing">
                    <span className="status-dot-pulse dot-missing"></span> Profile Required
                  </span>
                ) : isApproved ? (
                  <span className="status-tag status-tag-approved">
                    <span className="status-dot-pulse dot-approved"></span> Verified Profile
                  </span>
                ) : isInReview ? (
                  <span className="status-tag status-tag-review">
                    <span className="status-dot-pulse dot-review"></span> Under Admin Review
                  </span>
                ) : isRejected ? (
                  <span className="status-tag status-tag-rejected">
                    <span className="status-dot-pulse dot-rejected"></span> Not Eligible
                  </span>
                ) : (
                  <span className="status-tag status-tag-pending">
                    <span className="status-dot-pulse dot-pending"></span> Pending Submission
                  </span>
                )}
              </div>
              <button 
                className="btn-profile-shortcut" 
                onClick={() => navigate('/profile')}
              >
                {hasProfile ? 'View Profile Details →' : 'Complete Profile Now →'}
              </button>
            </div>
          </div>

          {/* CRITICAL PROFILE ALERTS */}
          {!hasProfile && (
            <div className="dashboard-alert-banner alert-warning">
              <div className="alert-icon-box">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <line x1="19" y1="8" x2="19" y2="14"/>
                  <line x1="22" y1="11" x2="16" y2="11"/>
                </svg>
              </div>
              <div className="alert-content">
                <h3>Action Required: Create Your Profile First</h3>
                <p>
                  You must create and verify your applicant profile before applying for any grant programs.
                  Select your organization type and fill in your details to get verified.
                </p>
              </div>
              <button 
                className="btn-alert-cta" 
                onClick={() => navigate('/profile')}
              >
                Create Profile Now →
              </button>
            </div>
          )}

          {hasProfile && isPending && (
            <div className="dashboard-alert-banner alert-info">
              <div className="alert-icon-box">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"/>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
              </div>
              <div className="alert-content">
                <h3>Action Required: Submit Profile for Approval</h3>
                <p>
                  Your profile details have been saved, but they have not been submitted for administrator verification.
                  Submit your profile to start applying for grant opportunities.
                </p>
              </div>
              <button 
                className="btn-alert-cta" 
                onClick={() => navigate('/profile')}
              >
                Submit for Approval →
              </button>
            </div>
          )}

          {hasProfile && isInReview && (
            <div className="dashboard-alert-banner alert-review">
              <div className="alert-icon-box">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div className="alert-content">
                <h3>Profile Under Verification</h3>
                <p>
                  Your profile is currently undergoing administrative review. Once approved, your account will be fully unlocked to apply for grants.
                </p>
              </div>
              <button 
                className="btn-alert-cta-secondary" 
                onClick={() => navigate('/profile')}
              >
                View Status →
              </button>
            </div>
          )}

          {/* 4-STEP APPLICATION PROCESS GUIDE */}
          <div className="guide-section-card">
            <div className="section-header-row">
              <div>
                <span className="guide-pre-title">APPLICATION ROADMAP</span>
                <h2 className="guide-section-title">Grant Application Process Guide</h2>
                <p className="guide-section-subtitle">
                  Follow these 4 essential milestones to register, verify, and secure grant funding:
                </p>
              </div>
              <div className="guide-header-progress">
                <span className="progress-pill-label">
                  {myApplications.length > 0 ? 'Step 4 of 4: In Progress' : isApproved ? 'Step 3 of 4: Ready to Apply' : hasProfile ? 'Step 2 of 4: Verification' : 'Step 1 of 4: Getting Started'}
                </span>
              </div>
            </div>

            {/* Visual Stepper Tracker Bar */}
            <div className="stepper-tracker-container">
              <div className={`stepper-node ${hasProfile ? 'completed' : 'current'}`}>
                <div className="stepper-circle">
                  {hasProfile ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : '1'}
                </div>
                <span className="stepper-label">Create Profile</span>
              </div>
              <div className={`stepper-line ${hasProfile ? 'filled' : ''}`} />

              <div className={`stepper-node ${isApproved ? 'completed' : (hasProfile ? 'current' : 'pending')}`}>
                <div className="stepper-circle">
                  {isApproved ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : '2'}
                </div>
                <span className="stepper-label">Verification</span>
              </div>
              <div className={`stepper-line ${isApproved ? 'filled' : ''}`} />

              <div className={`stepper-node ${myApplications.length > 0 ? 'completed' : (isApproved ? 'current' : 'pending')}`}>
                <div className="stepper-circle">
                  {myApplications.length > 0 ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : '3'}
                </div>
                <span className="stepper-label">Browse Programs</span>
              </div>
              <div className={`stepper-line ${myApplications.length > 0 ? 'filled' : ''}`} />

              <div className={`stepper-node ${myApplications.length > 0 ? 'current' : 'pending'}`}>
                <div className="stepper-circle">4</div>
                <span className="stepper-label">Apply & Track</span>
              </div>
            </div>

            <div className="guide-steps-grid">
              {/* Step 1: Create Profile */}
              <div className={`guide-step-card ${hasProfile ? 'step-completed' : 'step-active'}`}>
                <div className="step-card-top">
                  <div className="step-icon-wrap icon-blue">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>
                  <span className="step-indicator-pill">Step 01</span>
                </div>
                <div className="step-card-status-badge">
                  {hasProfile ? (
                    <span className="step-badge-done">Profile Created</span>
                  ) : (
                    <span className="step-badge-current">Start Here</span>
                  )}
                </div>
                <h3 className="step-title">Create Profile</h3>
                <p className="step-desc">
                  Select your applicant category (Academic, Individual, NGO, or Private) and submit mandatory profile details.
                </p>
                <div className="step-action-wrapper">
                  {hasProfile ? (
                    <Link to="/profile" className="btn-step-action secondary">
                      {profile.Organization_Type__c || 'View Profile'} →
                    </Link>
                  ) : (
                    <Link to="/profile" className="btn-step-action highlight">
                      Create Profile →
                    </Link>
                  )}
                </div>
              </div>

              {/* Step 2: Get Verified */}
              <div className={`guide-step-card ${isApproved ? 'step-completed' : (hasProfile ? 'step-active' : 'step-locked')}`}>
                <div className="step-card-top">
                  <div className="step-icon-wrap icon-emerald">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      <polyline points="9 12 11 14 15 10"/>
                    </svg>
                  </div>
                  <span className="step-indicator-pill">Step 02</span>
                </div>
                <div className="step-card-status-badge">
                  {isApproved ? (
                    <span className="step-badge-done">Verified & Eligible</span>
                  ) : isInReview ? (
                    <span className="step-badge-review">In Review</span>
                  ) : hasProfile ? (
                    <span className="step-badge-current">Action Needed</span>
                  ) : (
                    <span className="step-badge-locked">Locked</span>
                  )}
                </div>
                <h3 className="step-title">Get Verified</h3>
                <p className="step-desc">
                  Your profile undergoes administrator review to verify grant eligibility across open funding programs.
                </p>
                <div className="step-action-wrapper">
                  {isApproved ? (
                    <span className="btn-step-action verified-static">Verified</span>
                  ) : isInReview ? (
                    <Link to="/profile" className="btn-step-action secondary">Review Pending →</Link>
                  ) : hasProfile ? (
                    <Link to="/profile" className="btn-step-action highlight">Submit for Review →</Link>
                  ) : (
                    <span className="step-locked-text">Complete Step 1 first</span>
                  )}
                </div>
              </div>

              {/* Step 3: Browse Programs */}
              <div className={`guide-step-card ${isApproved ? 'step-active' : 'step-locked'}`}>
                <div className="step-card-top">
                  <div className="step-icon-wrap icon-indigo">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
                    </svg>
                  </div>
                  <span className="step-indicator-pill">Step 03</span>
                </div>
                <div className="step-card-status-badge">
                  {isApproved ? (
                    <span className="step-badge-current">Ready to Apply</span>
                  ) : (
                    <span className="step-badge-locked">Locked</span>
                  )}
                </div>
                <h3 className="step-title">Browse Programs</h3>
                <p className="step-desc">
                  Explore tailored grant opportunities matching your sector, view award caps, and check document criteria.
                </p>
                <div className="step-action-wrapper">
                  {isApproved ? (
                    <Link to="/programs" className="btn-step-action highlight">
                      Explore Programs →
                    </Link>
                  ) : (
                    <Link to="/programs" className="btn-step-action secondary">
                      Preview Programs ({stats.programs || 'Open'}) →
                    </Link>
                  )}
                </div>
              </div>

              {/* Step 4: Apply & Track */}
              <div className={`guide-step-card ${myApplications.length > 0 ? 'step-completed' : (isApproved ? 'step-active' : 'step-locked')}`}>
                <div className="step-card-top">
                  <div className="step-icon-wrap icon-purple">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <path d="m9 15 2 2 4-4"/>
                    </svg>
                  </div>
                  <span className="step-indicator-pill">Step 04</span>
                </div>
                <div className="step-card-status-badge">
                  {myApplications.length > 0 ? (
                    <span className="step-badge-done">{myApplications.length} Active</span>
                  ) : (
                    <span className="step-badge-pending">Final Step</span>
                  )}
                </div>
                <h3 className="step-title">Apply & Track</h3>
                <p className="step-desc">
                  Submit proposals, upload verification files, and monitor application review and fund disbursements.
                </p>
                <div className="step-action-wrapper">
                  <Link to="/my-applications" className="btn-step-action secondary">
                    My Applications ({myApplications.length}) →
                  </Link>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // PUBLIC / GUEST HOME PAGE (FOR UNAUTHENTICATED VISITORS)
  // -------------------------------------------------------------
  const eligibilityCategories = [
    {
      title: 'Academic & Research',
      icon: '🎓',
      image: salesforceService.getAsset('eligibleAcademic'),
      description: 'Universities and research centers seeking innovation and impact-based grants.'
    },
    {
      title: 'NGOs & Non-Profits',
      icon: '🌍',
      image: salesforceService.getAsset('eligibleNgo'),
      description: 'Registered organizations working on social, community, and development initiatives.'
    },
    {
      title: 'Startups & Enterprises',
      icon: '🏢',
      image: salesforceService.getAsset('eligibleStartup'),
      description: 'Innovation-driven companies developing impactful solutions.'
    },
    {
      title: 'Independent Researchers',
      icon: '👤',
      image: salesforceService.getAsset('eligibleResearcher'),
      description: 'Researchers working on eligible research or innovation projects.'
    }
  ];

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="badge-pulse"></span>
              GRANT MANAGEMENT PLATFORM
            </div>
            
            <h1 className="hero-title">
              Find the Right <span className="hero-gradient">Grants</span>
              <br />to Fuel Your Initiatives
            </h1>
            
            <p className="hero-subtitle">
              Discover funding opportunities tailored to your sector. Apply seamlessly, get verified, and track every stage of your grant journey — all in one place.
            </p>
            
            <div className="hero-actions">
              {isLoggedIn ? (
                <div className="hero-btn-group">
                  <Link to="/dashboard" className="hero-btn hero-btn-primary">
                    <span>Go to Dashboard</span>
                    <svg className="btn-arrow-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </Link>
                  <Link to="/programs" className="hero-btn hero-btn-secondary">
                    <span>Explore Programs</span>
                    <svg className="btn-arrow-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </Link>
                </div>
              ) : (
                <div className="hero-btn-group">
                  <a href={salesforceService.loginUrl} className="hero-btn hero-btn-primary">
                    <span>Login to Apply</span>
                    <svg className="btn-arrow-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </a>
                  <Link to="/programs" className="hero-btn hero-btn-secondary">
                    <span>Explore Programs</span>
                    <svg className="btn-arrow-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="hero-stats-card">
            <div className="stats-card-item">
              <div className="stats-icon stats-icon-green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="stats-content">
                <div className="stats-label">Applications Submitted</div>
                <div className="stats-value">{loading ? '...' : stats.applications}</div>
              </div>
            </div>

            <div className="stats-card-item">
              <div className="stats-icon stats-icon-purple">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="stats-content">
                <div className="stats-label">Active Programs</div>
                <div className="stats-value">{loading ? '...' : stats.programs}</div>
              </div>
            </div>

            <div className="stats-card-item">
              <div className="stats-icon stats-icon-orange">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="stats-content">
                <div className="stats-label">Total Distributed</div>
                <div className="stats-value">{loading ? '...' : stats.distributed}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Eligibility Section */}
      <section className="eligibility-section">
        <div className="container">
          <div className="landing-section-header">
            <span className="landing-section-badge">ELIGIBILITY CRITERIA</span>
            <h2 className="landing-section-title">Who Can Apply</h2>
            <p className="landing-section-subtitle">
              Our grant programs support a diverse ecosystem of researchers, innovators, institutions, and community organizations.
            </p>
          </div>
          <div className="eligibility-grid">
            {eligibilityCategories.map((cat, idx) => (
              <div key={idx} className="eligibility-card" onClick={() => navigate(isLoggedIn ? '/profile' : '/programs')}>
                {cat.image ? (
                  <div className="eligibility-image">
                    <img src={cat.image} alt={cat.title} />
                  </div>
                ) : (
                  <div className="eligibility-image-fallback">
                    <span>{cat.icon}</span>
                  </div>
                )}
                <div className="eligibility-info">
                  <h3 className="eligibility-title">{cat.title}</h3>
                  <p className="eligibility-description">{cat.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <div className="landing-section-header">
            <span className="landing-section-badge">PLATFORM CAPABILITIES</span>
            <h2 className="landing-section-title">End-to-End Grant Management</h2>
            <p className="landing-section-subtitle">
              From profile verification to proposal submission, evaluation, and funds disbursement.
            </p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3 className="feature-title">Streamlined Applications</h3>
              <p className="feature-description">
                Dynamic fieldsets tailored specifically to your organization profile. Fill, save, and submit with ease.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🛡️</div>
              <h3 className="feature-title">Verified Transparency</h3>
              <p className="feature-description">
                Rigorous administrative review guarantees authenticity, compliance, and equitable evaluation for all applicants.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📈</div>
              <h3 className="feature-title">Real-time Progress Tracking</h3>
              <p className="feature-description">
                Monitor every milestone, reviewer feedback, disbursement invoices, and award announcements in real time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-container">
          <h2 className="cta-title">Ready to Fuel Your Initiative?</h2>
          <p className="cta-subtitle">
            Explore open grant opportunities today and submit your proposal through our secure portal.
          </p>
          {isLoggedIn ? (
            <Link to="/" className="hero-btn hero-btn-primary">
              Access Applicant Dashboard →
            </Link>
          ) : (
            <a href={salesforceService.loginUrl} className="hero-btn hero-btn-primary">
              Get Started Now →
            </a>
          )}
        </div>
      </section>
    </div>
  );
}
