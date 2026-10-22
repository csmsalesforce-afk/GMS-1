import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import salesforceService from '../services/salesforceService';
import './Home.css';

export default function Home({ onOpenDonate, onOpenInquiry, isLoggedIn }) {
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState({
    activeCampaigns: 2,
    totalRaised: 0,
    uniqueDonors: 0,
    programsCount: 9
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [cList, sData] = await Promise.all([
          salesforceService.getActiveCampaigns(),
          salesforceService.getDonorPlatformStats()
        ]);
        if (cList && cList.length > 0) setCampaigns(cList);
        if (sData) setStats(sData);
      } catch (e) {
        console.error('Error loading home data:', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const getCampaignTheme = (name = '', type = '', programName = '') => {
    const text = (name + ' ' + type + ' ' + programName).toLowerCase();
    if (text.includes('literacy') || text.includes('education') || text.includes('classroom')) {
      return {
        badgeClass: 'badge-primary',
        label: 'Education & Digital Literacy',
        headerBg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
        accentColor: '#2563eb',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10"/></svg>
        )
      };
    }
    if (text.includes('water') || text.includes('infrastructure') || text.includes('rural')) {
      return {
        badgeClass: 'badge-primary',
        label: 'Clean Water & Infrastructure',
        headerBg: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
        accentColor: '#0284c7',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2.5"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
        )
      };
    }
    if (text.includes('women') || text.includes('child') || text.includes('maternal') || text.includes('welfare')) {
      return {
        badgeClass: 'badge-rose',
        label: 'Women & Child Welfare',
        headerBg: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)',
        accentColor: '#db2777',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#db2777" strokeWidth="2.5"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
        )
      };
    }
    if (text.includes('skill') || text.includes('vocational') || text.includes('farming') || text.includes('livelihood') || text.includes('capacity')) {
      return {
        badgeClass: 'badge-amber',
        label: 'Skills & Livelihood',
        headerBg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
        accentColor: '#d97706',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
        )
      };
    }
    if (text.includes('disaster') || text.includes('relief') || text.includes('emergency')) {
      return {
        badgeClass: 'badge-amber',
        label: 'Emergency Relief',
        headerBg: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
        accentColor: '#dc2626',
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        )
      };
    }
    return {
      badgeClass: 'badge-success',
      label: 'Healthcare & Research',
      headerBg: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
      accentColor: '#059669',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
      )
    };
  };

  return (
    <div className="home-page animate-fade-in">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container hero-container">
          <div className="hero-content">
            <div className="hero-pill">
              <span className="live-dot"></span>
              Verified 501(c)(3) Giving Engine • Multi-Program Treasury
            </div>
            <h1 className="hero-title">
              Direct Philanthropy.<br />
              <span className="text-gradient">Verifiable Global Impact.</span>
            </h1>
            <p className="hero-subtitle">
              Empowering change across education, clean water, women's welfare, emergency relief, and healthcare. 100% of public gifts directly replenish verified Grant Program funds for audited, milestone-based disbursements.
            </p>
            <div className="hero-cta-group">
              <button onClick={() => onOpenDonate()} className="btn btn-accent btn-lg hero-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                Donate To A Cause
              </button>
              <Link to="/campaigns" className="btn btn-secondary btn-lg hero-btn">
                Browse All Campaigns
              </Link>
            </div>
          </div>

          {/* Impact Ledger Card */}
          <div className="hero-stats-card">
            <div className="stats-header">
              <div>
                <span className="ledger-subtitle">Philanthropic Transparency</span>
                <h3>Live Program Ledger</h3>
              </div>
              <span className="real-time-tag">
                <span className="tag-dot"></span> Real-Time Sync
              </span>
            </div>

            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-icon-wrap icon-green">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <div>
                  <span className="stat-num">${(stats.totalRaised || 0).toLocaleString()}</span>
                  <span className="stat-lbl">Funds Raised & Deployed</span>
                </div>
              </div>

              <div className="stat-box">
                <div className="stat-icon-wrap icon-blue">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                </div>
                <div>
                  <span className="stat-num">{stats.activeCampaigns || 0}</span>
                  <span className="stat-lbl">Active Campaigns</span>
                </div>
              </div>

              <div className="stat-box">
                <div className="stat-icon-wrap icon-purple">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div>
                  <span className="stat-num">{stats.uniqueDonors || 0}</span>
                  <span className="stat-lbl">Verified Donors</span>
                </div>
              </div>

              <div className="stat-box">
                <div className="stat-icon-wrap icon-amber">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <div>
                  <span className="stat-num">{stats.programsCount || 0}</span>
                  <span className="stat-lbl">Grant Programs Backed</span>
                </div>
              </div>
            </div>

            <div className="stats-footer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
              <span>100% of contributions replenish program disbursement pools</span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Active Campaigns */}
      <section className="featured-campaigns-section" id="campaigns">
        <div className="container">
          <div className="section-head-split">
            <div>
              <span className="badge badge-success">Active Philanthropy</span>
              <h2>Active Giving Campaigns</h2>
              <p>Explore verified causes below. Every dollar contributed feeds directly into grant allocations.</p>
            </div>
            <Link to="/campaigns" className="btn btn-outline">
              View All Campaigns →
            </Link>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner-large"></div>
              <p>Loading active initiatives from Salesforce...</p>
            </div>
          ) : (
            <div className="campaigns-grid">
              {campaigns.map(c => {
                const theme = getCampaignTheme(c.name, c.type || c.programType, c.programName);
                const percent = Math.min(100, Math.round(c.progressPercent || 0));

                return (
                  <div key={c.id} className="campaign-card">
                    {/* Visual Card Banner */}
                    <div className="campaign-visual-bar" style={{ background: theme.headerBg }}>
                      <div className="category-tag">
                        {theme.icon}
                        <span style={{ color: theme.accentColor }}>{theme.label}</span>
                      </div>
                      <span className="live-status-pill">Active</span>
                    </div>

                    <div className="campaign-body">
                      <h3 className="campaign-title">
                        <Link to={`/campaign/${c.id}`}>{c.name}</Link>
                      </h3>

                      <div className="campaign-program-tag">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        <span>Grant Fund: <strong>{c.programName}</strong></span>
                      </div>

                      <p className="campaign-desc">
                        {c.description ? (c.description.length > 140 ? c.description.slice(0, 140) + '...' : c.description) : 'Vital funding for vetted grant applicants.'}
                      </p>

                      <div className="progress-block">
                        <div className="progress-labels">
                          <span className="amount-raised">
                            <strong>${(c.raisedAmount || 0).toLocaleString()}</strong>
                          </span>
                          <span className="goal-amount">Goal: ${(c.goalAmount || 0).toLocaleString()}</span>
                        </div>
                        <div className="progress-container">
                          <div className="progress-bar-fill" style={{ width: `${Math.max(percent, 4)}%` }}></div>
                        </div>
                        <div className="progress-sub">
                          <span>{percent}% Funded</span>
                          <span>{c.donorCount || 0} Supporters</span>
                        </div>
                      </div>

                      {/* Quick Gift Row */}
                      <div className="quick-gift-row">
                        <span className="quick-gift-lbl">Quick Gift:</span>
                        {[25, 50, 100, 250].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => onOpenDonate(c, val)}
                            className="quick-chip"
                          >
                            ${val}
                          </button>
                        ))}
                      </div>

                      <div className="campaign-card-footer">
                        <button
                          onClick={() => onOpenDonate(c)}
                          className="btn btn-accent btn-sm card-donate-btn"
                        >
                          Donate Now
                        </button>
                        <Link to={`/campaign/${c.id}`} className="btn btn-secondary btn-sm">
                          Details & Wall
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <div className="container">
          <div className="section-head text-center">
            <span className="badge badge-primary">Audited Accountability</span>
            <h2>How Your Donation Reaches Recipients</h2>
            <p>A closed-loop philanthropic architecture ensuring funds are only released upon verified milestones.</p>
          </div>

          <div className="flow-steps-grid">
            <div className="flow-step-card">
              <div className="step-badge">01</div>
              <h4>Choose Cause</h4>
              <p>Select an active education, clean water, women's welfare, disaster relief, or healthcare campaign directly linked to a vetted Grant Program.</p>
            </div>
            <div className="flow-step-card">
              <div className="step-badge">02</div>
              <h4>Instant Receipt</h4>
              <p>Donate securely. An official IRS 501(c)(3) tax receipt with a unique serial number is generated on confirmation.</p>
            </div>
            <div className="flow-step-card">
              <div className="step-badge">03</div>
              <h4>Direct Allocation</h4>
              <p>100% of your gift is credited directly to the selected program treasury, expanding community grant capacity.</p>
            </div>
            <div className="flow-step-card">
              <div className="step-badge">04</div>
              <h4>Audited Milestones</h4>
              <p>Grant managers disburse installment tranches only upon verified project milestones, receipts, or authenticated care.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Corporate Partner Banner for Non-Logged-In Prospects */}
      {!isLoggedIn ? (
        <section className="partner-banner-section">
          <div className="container">
            <div className="partner-box">
              <div className="partner-text">
                <span className="badge badge-amber">Institutional &amp; Corporate Giving</span>
                <h2>Looking to Partner With Our Initiatives?</h2>
                <p>
                  Collaborate on corporate matching drives, co-sponsored programs, or named institutional endowments. Submit an inquiry to begin the onboarding and verification process.
                </p>
              </div>
              <button onClick={onOpenInquiry} className="btn btn-primary btn-lg partner-cta-btn">
                Partner With Us
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="partner-banner-section">
          <div className="container">
            <div className="partner-box">
              <div className="partner-text">
                <span className="badge badge-success">Direct Impact Donor Portal</span>
                <h2>Verified Philanthropic Allocation</h2>
                <p>
                  As an authenticated donor, your contributions directly fund audited community grant programs with instant IRS 501(c)(3) tax receipts and real-time project milestone tracking.
                </p>
              </div>
              <div className="hero-cta-group" style={{ margin: 0 }}>
                <button onClick={() => onOpenDonate()} className="btn btn-accent btn-lg partner-cta-btn">
                  Make Direct Contribution
                </button>
                <Link to="/campaigns" className="btn btn-secondary btn-lg">
                  Explore Active Causes
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
