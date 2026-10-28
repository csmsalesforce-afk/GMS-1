import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import salesforceService from '../services/salesforceService';
import TiltCard from '../components/TiltCard';
import './Campaigns.css';

const CAUSE_FILTERS = [
  { id: 'all', label: 'All Causes' },
  { id: 'education', label: 'Education & STEM' },
  { id: 'water', label: 'Clean Water & Infrastructure' },
  { id: 'welfare', label: 'Women & Child Welfare' },
  { id: 'skills', label: 'Skills & Livelihood' },
  { id: 'emergency', label: 'Emergency & Disaster Aid' },
  { id: 'health', label: 'Healthcare & Medical Research' }
];

export default function Campaigns({ onOpenDonate, onOpenInquiry, isLoggedIn }) {
  const [campaigns, setCampaigns] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [requestingMap, setRequestingMap] = useState({});
  const [actionFeedback, setActionFeedback] = useState(null);

  useEffect(() => {
    async function loadCampaigns() {
      setLoading(true);
      try {
        const list = await salesforceService.getActiveCampaigns();
        setCampaigns(list || []);
      } catch (err) {
        console.error('Error fetching campaigns:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCampaigns();
  }, []);

  const handleRequestAccess = async (c) => {
    if (!isLoggedIn) {
      if (onOpenInquiry) onOpenInquiry(c);
      return;
    }
    setRequestingMap(prev => ({ ...prev, [c.id]: true }));
    try {
      const res = await salesforceService.requestCampaignAccess(c.id);
      if (res && res.success) {
        setCampaigns(prev => prev.map(item => item.id === c.id ? { ...item, userStatus: res.status || 'PENDING' } : item));
        setActionFeedback({ type: 'success', text: `Authorization request submitted for "${c.name}". It is pending compliance review.` });
      } else {
        setActionFeedback({ type: 'error', text: res?.error || 'Failed to submit request.' });
      }
    } catch (err) {
      setActionFeedback({ type: 'error', text: err.message || 'Error communicating with Salesforce.' });
    } finally {
      setRequestingMap(prev => ({ ...prev, [c.id]: false }));
      setTimeout(() => setActionFeedback(null), 6000);
    }
  };

  const renderActionButton = (c) => {
    const isRequesting = requestingMap[c.id];
    const uStatus = c.userStatus || (!isLoggedIn ? 'GUEST' : 'NOT_REQUESTED');

    if (uStatus === 'COMPLETED') {
      return (
        <button
          onClick={() => handleRequestAccess(c)}
          disabled={isRequesting}
          className="btn btn-outline-success btn-sm card-donate-btn"
          title="Donation completed. Click to request authorization to contribute again."
        >
          {isRequesting ? 'Requesting...' : '✓ Donated • Request Again'}
        </button>
      );
    }

    if (uStatus === 'AUTHORIZED') {
      return (
        <button
          onClick={() => onOpenDonate(c)}
          className="btn btn-accent btn-sm card-donate-btn"
        >
          Donate Now
        </button>
      );
    }

    if (uStatus === 'COMPLETED') {
      return (
        <button
          onClick={() => onOpenInquiry && onOpenInquiry(c)}
          className="btn btn-outline-success btn-sm card-donate-btn"
          title="Donation completed. Click to submit inquiry or request to donate again."
        >
          ✓ Donated • Request Again
        </button>
      );
    }

    if (uStatus === 'PENDING') {
      return (
        <button
          onClick={() => onOpenInquiry && onOpenInquiry(c)}
          className="btn btn-secondary btn-sm card-donate-btn"
          style={{ background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' }}
          title="Inquiry / authorization pending review. Click to view or edit request."
        >
          ⏳ Pending Review
        </button>
      );
    }

    // Default NOT_REQUESTED or GUEST -> opens the lead generation form for that campaign
    return (
      <button
        onClick={() => onOpenInquiry && onOpenInquiry(c)}
        className="btn btn-primary btn-sm card-donate-btn"
      >
        Request to Donate
      </button>
    );
  };

  const getCampaignCategory = (c) => {
    const text = ((c.name || '') + ' ' + (c.programType || '') + ' ' + (c.programName || '') + ' ' + (c.description || '')).toLowerCase();
    if (text.includes('literacy') || text.includes('education') || text.includes('classroom')) return 'education';
    if (text.includes('water') || text.includes('infrastructure') || text.includes('rural')) return 'water';
    if (text.includes('women') || text.includes('child') || text.includes('maternal') || text.includes('welfare')) return 'welfare';
    if (text.includes('skill') || text.includes('vocational') || text.includes('farming') || text.includes('livelihood') || text.includes('capacity')) return 'skills';
    if (text.includes('disaster') || text.includes('emergency') || text.includes('relief')) return 'emergency';
    if (text.includes('cancer') || text.includes('vaccine') || text.includes('research') || text.includes('transplant') || text.includes('health') || text.includes('medical')) return 'health';
    return 'education';
  };

  const getCampaignTheme = (c) => {
    const cat = getCampaignCategory(c);
    switch (cat) {
      case 'education':
        return {
          badgeClass: 'badge-primary',
          label: 'Education & Digital Literacy',
          headerBg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
          accentColor: '#2563eb',
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10"/></svg>
          )
        };
      case 'water':
        return {
          badgeClass: 'badge-primary',
          label: 'Clean Water & Infrastructure',
          headerBg: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
          accentColor: '#0284c7',
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2.5"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
          )
        };
      case 'welfare':
        return {
          badgeClass: 'badge-rose',
          label: 'Women & Child Welfare',
          headerBg: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)',
          accentColor: '#db2777',
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#db2777" strokeWidth="2.5"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
          )
        };
      case 'skills':
        return {
          badgeClass: 'badge-amber',
          label: 'Skills & Livelihood',
          headerBg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
          accentColor: '#d97706',
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
          )
        };
      case 'emergency':
        return {
          badgeClass: 'badge-amber',
          label: 'Emergency Relief',
          headerBg: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
          accentColor: '#dc2626',
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          )
        };
      case 'health':
      default:
        return {
          badgeClass: 'badge-success',
          label: 'Healthcare & Research',
          headerBg: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
          accentColor: '#059669',
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          )
        };
    }
  };

  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.programName?.toLowerCase().includes(searchTerm.toLowerCase());
    const cat = getCampaignCategory(c);
    const matchesCategory = selectedFilter === 'all' || cat === selectedFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="campaigns-page animate-fade-in">
      {/* Top Banner Header */}
      <div className="campaigns-header">
        <div className="container header-container-inner">
          <span className="badge badge-primary">Philanthropic Initiatives</span>
          <h1>Explore Active Grant Campaigns</h1>
          <p>
            Choose a verified initiative to support today. 100% of public gifts directly replenish the beneficiary Grant Program fund, fueling audited disbursements.
          </p>

          {/* Controls Bar: Search & Meaningful Cause Categories */}
          <div className="controls-bar">
            <div className="search-wrap">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input
                type="text"
                placeholder="Search causes, healthcare initiatives, disaster funds..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="filter-chips">
              {CAUSE_FILTERS.map(f => (
                <button
                  key={f.id}
                  className={`chip ${selectedFilter === f.id ? 'active' : ''}`}
                  onClick={() => setSelectedFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Campaign Cards Grid */}
      <div className="container campaigns-content">
        <div className="results-meta-row">
          <span>Showing <strong>{filteredCampaigns.length}</strong> active initiatives</span>
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="clear-search-btn">
              Clear search "{searchTerm}"
            </button>
          )}
        </div>

        {actionFeedback && (
          <div style={{ marginBottom: '1.5rem', padding: '1rem 1.4rem', borderRadius: '10px', background: actionFeedback.type === 'success' ? '#ecfdf5' : '#fef2f2', border: `1px solid ${actionFeedback.type === 'success' ? '#a7f3d0' : '#fecaca'}`, color: actionFeedback.type === 'success' ? '#065f46' : '#991b1b', display: 'flex', alignItems: 'center', gap: '0.8rem', fontWeight: 500 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <span>{actionFeedback.text}</span>
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <div className="spinner-large"></div>
            <p>Fetching active initiatives from Salesforce...</p>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="empty-state">
            <h3>No matching campaigns found</h3>
            <p>Try clearing your search term or select "All Causes" to see all available initiatives.</p>
            <button onClick={() => { setSearchTerm(''); setSelectedFilter('all'); }} className="btn btn-secondary">
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="campaigns-grid">
            {filteredCampaigns.map(c => {
              const theme = getCampaignTheme(c);
              const percent = Math.min(100, Math.round(c.progressPercent || 0));

              return (
                <TiltCard key={c.id} className="campaign-card-tilt" maxTilt={6}>
                  <div className="campaign-card-inner">
                    {/* Colored Header Banner */}
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

                      {/* Quick Gift Row (Only for authorized campaigns) */}
                      {c.userStatus === 'AUTHORIZED' && (
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
                      )}

                      <div className="campaign-card-footer">
                        {renderActionButton(c)}
                        <Link to={`/campaign/${c.id}`} className="btn btn-secondary btn-sm">
                          Details & Wall
                        </Link>
                      </div>
                    </div>
                  </div>
                </TiltCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
