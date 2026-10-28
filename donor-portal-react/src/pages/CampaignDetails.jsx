import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import salesforceService from '../services/salesforceService';
import './CampaignDetails.css';

export default function CampaignDetails({ onOpenDonate, onOpenInquiry, isLoggedIn }) {
  const { campaignId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  useEffect(() => {
    async function loadDetails() {
      setLoading(true);
      try {
        const res = await salesforceService.getCampaignDetails(campaignId);
        setData(res);
      } catch (err) {
        console.error('Error fetching campaign details:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDetails();
  }, [campaignId]);

  const handleOpenInquiryClick = (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
      e.stopPropagation();
    }
    const camp = campaign || data?.campaign;
    if (onOpenInquiry) {
      onOpenInquiry(camp);
    }
  };

  if (loading) {
    return (
      <div className="container loading-state">
        <div className="spinner-large"></div>
        <p>Loading campaign details...</p>
      </div>
    );
  }

  const campaign = data?.campaign;
  const recentDonations = data?.recentDonations || [];

  if (!campaign) {
    return (
      <div className="container empty-state" style={{ marginTop: '4rem' }}>
        <h3>Campaign Not Found</h3>
        <p>The campaign you are looking for may have concluded or is inactive.</p>
        <Link to="/campaigns" className="btn btn-primary">
          Back to Campaigns
        </Link>
      </div>
    );
  }

  const percent = Math.min(100, Math.round(campaign.progressPercent || 0));

  return (
    <div className="campaign-details-page animate-fade-in">
      {/* Top Banner */}
      <div className="details-hero">
        <div className="container">
          <Link to="/campaigns" className="back-link">
            ← Back to all campaigns
          </Link>
          <div className="details-hero-head">
            <span className="badge badge-primary">{campaign.programType || campaign.type || 'Grant Initiative'}</span>
            <span className="badge badge-success">Accepting Donations</span>
          </div>
          <h1 className="details-title">{campaign.name}</h1>
          <p className="details-meta">
            Initiative Beneficiary: <strong>{campaign.programName}</strong> • Target: ${(campaign.goalAmount || 0).toLocaleString()} USD
          </p>
        </div>
      </div>

      <div className="container details-layout">
        {/* Left Column: Story & Donor Wall */}
        <div className="details-main">
          {/* Overview Section */}
          <div className="content-card">
            <h2>About This Initiative</h2>
            <p className="story-paragraph">
              {campaign.description || 'This campaign provides essential grant capital to vetted applicants and projects across the globe.'}
            </p>
            {campaign.programOverview && (
              <div className="program-overview-box">
                <h4>Parent Grant Program Focus</h4>
                <div
                  className="program-overview-html"
                  dangerouslySetInnerHTML={{ __html: campaign.programOverview }}
                />
              </div>
            )}
          </div>

          {/* Allocation Transparency */}
          <div className="content-card">
            <h2>Financial Accountability & Fund Inflow</h2>
            <p className="story-paragraph">
              Unlike generic crowdfunding platforms, donations received on this site are directly credited to the parent program's audited treasury, expanding the disbursement budget for vetted grantees.
            </p>
            <div className="audit-points">
              <div className="audit-point">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Direct Program Credit: 100% of gift added to Program Fund Pool</span>
              </div>
              <div className="audit-point">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Automated IRS Tax Receipt with unique serial tracking</span>
              </div>
              <div className="audit-point">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Milestone Audited Disbursements to Verified Grantees</span>
              </div>
            </div>
          </div>

          {/* Supporter Wall */}
          <div className="content-card">
            <div className="wall-header">
              <h2>Supporter Wall & Recent Gifts</h2>
              <span className="badge badge-success">{recentDonations.length} Recent Gifts</span>
            </div>

            {recentDonations.length === 0 ? (
              <p className="empty-wall-text">Be the first to donate and lead the way for this campaign!</p>
            ) : (
              <div className="supporter-list">
                {recentDonations.map((d, idx) => (
                  <div key={idx} className="supporter-item">
                    <div className="supporter-avatar">
                      {d.donorName ? d.donorName.charAt(0).toUpperCase() : 'S'}
                    </div>
                    <div className="supporter-info">
                      <div className="supporter-top">
                        <span className="supporter-name">{d.donorName || 'Generous Supporter'}</span>
                        <span className="supporter-amount">${(d.amount || 0).toLocaleString()}</span>
                      </div>
                      {d.message && <p className="supporter-message">“{d.message}”</p>}
                      <span className="supporter-time">
                        {d.date ? new Date(d.date).toLocaleDateString() : 'Recently'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Sticky Column: Action Box */}
        <div className="details-sidebar">
          <div className="sticky-action-card">
            <div className="thermometer-header">
              <span className="raised-hero">${(campaign.raisedAmount || 0).toLocaleString()}</span>
              <span className="goal-sub">raised of ${(campaign.goalAmount || 0).toLocaleString()} goal</span>
            </div>

            <div className="progress-container sidebar-progress">
              <div className="progress-bar-fill" style={{ width: `${percent}%` }}></div>
            </div>

            <div className="stats-row">
              <div className="stat-pill">
                <strong>{percent}%</strong>
                <span>Goal Met</span>
              </div>
              <div className="stat-pill">
                <strong>{campaign.donorCount || 0}</strong>
                <span>Supporters</span>
              </div>
              <div className="stat-pill">
                <strong>Active</strong>
                <span>Status</span>
              </div>
            </div>

            {(() => {
              const uStatus = data?.userStatus || campaign?.userStatus || (!isLoggedIn ? 'GUEST' : 'NOT_REQUESTED');

              return (
                <>
                  {actionFeedback && (
                    <div style={{ margin: '1rem 0', padding: '0.8rem 1rem', borderRadius: '8px', fontSize: '0.9rem', background: actionFeedback.type === 'success' ? '#ecfdf5' : '#fef2f2', border: `1px solid ${actionFeedback.type === 'success' ? '#a7f3d0' : '#fecaca'}`, color: actionFeedback.type === 'success' ? '#065f46' : '#991b1b' }}>
                      {actionFeedback.text}
                    </div>
                  )}

                  {uStatus === 'COMPLETED' ? (
                    <>
                      <div style={{ margin: '1rem 0', padding: '0.9rem 1rem', borderRadius: '8px', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', fontSize: '0.9rem', textAlign: 'center' }}>
                        <strong>✓ Donation Completed</strong>
                        <p style={{ margin: '0.3rem 0 0', fontSize: '0.82rem' }}>You have actively contributed to this initiative.</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleOpenInquiryClick}
                        className="btn btn-outline-success btn-lg donate-sidebar-btn"
                      >
                        Request to Donate Again
                      </button>
                    </>
                  ) : uStatus === 'AUTHORIZED' ? (
                    <button
                      type="button"
                      onClick={() => onOpenDonate(campaign)}
                      className="btn btn-accent btn-lg donate-sidebar-btn"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                      Support This Cause Now
                    </button>
                  ) : uStatus === 'PENDING' ? (
                    <div
                      onClick={handleOpenInquiryClick}
                      style={{ margin: '1rem 0', padding: '1rem', borderRadius: '8px', background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', textAlign: 'center', cursor: 'pointer' }}
                      title="Click to view or edit your inquiry"
                    >
                      <strong style={{ display: 'block', marginBottom: '0.3rem' }}>⏳ Authorization Pending Review</strong>
                      <span style={{ fontSize: '0.85rem' }}>Your request to contribute to this campaign is under compliance verification. Click to view inquiry details.</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleOpenInquiryClick}
                      className="btn btn-primary btn-lg donate-sidebar-btn"
                    >
                      Request to Donate
                    </button>
                  )}
                </>
              );
            })()}

            <div className="tax-guarantee">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
              <span>Instant Tax Receipt Generated Immediately Upon Payment</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
