import React, { useState } from 'react';
import salesforceService from '../services/salesforceService';
import './DonationModal.css';

const PRESET_AMOUNTS = [25, 50, 100, 250, 500];

export default function DonationModal({ 
  isOpen, 
  onClose, 
  defaultCampaign, 
  initialAmount = 100, 
  campaigns = [], 
  onDonationSuccess, 
  userAuth,
  profileStatus,
  onOpenProfile
}) {
  const isLoggedIn = userAuth?.isLoggedIn ?? salesforceService.isLoggedIn;
  const userName = userAuth?.userName || salesforceService.userName || '';

  const currentStatus = profileStatus?.status || profileStatus?.complianceStatus || (isLoggedIn ? 'NO_PROFILE' : 'GUEST');
  const isApproved = currentStatus === 'Approved' && profileStatus?.kycVerified === true;
  const isPending = currentStatus === 'Pending' || (currentStatus === 'Approved' && !profileStatus?.kycVerified);
  const isNoProfile = currentStatus === 'NO_PROFILE';

  const [selectedCampaignId, setSelectedCampaignId] = useState(defaultCampaign?.id || campaigns[0]?.id || '');
  const [amount, setAmount] = useState(initialAmount);
  const [customAmount, setCustomAmount] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [frequency, setFrequency] = useState('one-time');
  
  // Donor details
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [donorMessage, setDonorMessage] = useState('');
  
  // Card mock state
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [zipCode, setZipCode] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  React.useEffect(() => {
    if (profileStatus) {
      if (profileStatus.donorName) setDonorName(profileStatus.donorName);
      else if (userName && !donorName) setDonorName(userName);

      if (profileStatus.email) setDonorEmail(profileStatus.email);
      else if (profileStatus.userEmail && !donorEmail) setDonorEmail(profileStatus.userEmail);

      if (profileStatus.phone && !donorPhone) setDonorPhone(profileStatus.phone);
    } else if (userName && !donorName) {
      setDonorName(userName);
    }
  }, [profileStatus, userName]);

  React.useEffect(() => {
    if (initialAmount) {
      setAmount(initialAmount);
      setIsCustom(false);
    }
  }, [initialAmount, isOpen]);

  React.useEffect(() => {
    if (defaultCampaign?.id) {
      setSelectedCampaignId(defaultCampaign.id);
    } else if (campaigns.length > 0 && !selectedCampaignId) {
      setSelectedCampaignId(campaigns[0].id);
    }
  }, [defaultCampaign, campaigns, isOpen]);

  if (!isOpen) return null;

  const currentCampaign = campaigns.find(c => c.id === selectedCampaignId) || defaultCampaign || campaigns[0];
  const finalAmount = isCustom ? parseFloat(customAmount) || 0 : amount;

  const handlePresetClick = (val) => {
    setIsCustom(false);
    setAmount(val);
  };

  const handleCustomChange = (e) => {
    setIsCustom(true);
    setCustomAmount(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isApproved) {
      setErrorMsg('Your donor profile must be verified and approved by compliance before donating.');
      return;
    }

    if (!finalAmount || finalAmount < 5) {
      setErrorMsg('Please specify a valid donation amount ($5 minimum).');
      return;
    }
    if (!donorEmail || !donorEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address to receive your official tax receipt.');
      return;
    }

    setLoading(true);

    try {
      const origin = window.location.origin;
      const path = window.location.pathname;
      const successUrl = `${origin}${path}?stripe_session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${origin}${path}#campaigns`;

      const payload = {
        campaignId: currentCampaign?.id,
        campaignName: currentCampaign?.name,
        amount: finalAmount,
        donorName: donorName.trim() || 'Anonymous Supporter',
        donorEmail: donorEmail.trim(),
        donorPhone: donorPhone.trim(),
        donorMessage: donorMessage.trim(),
        successUrl,
        cancelUrl
      };

      const stripeRes = await salesforceService.createStripeCheckoutSession(payload);

      if (stripeRes && stripeRes.success && stripeRes.checkoutUrl) {
        // Redirect directly to real Stripe Hosted Checkout
        window.location.href = stripeRes.checkoutUrl;
        return;
      }

      // Fallback for standalone/mock demo if checkoutUrl is not available in demo environment
      if (stripeRes && stripeRes.success && !stripeRes.checkoutUrl) {
        const simulatedSessionId = 'cs_demo_' + Math.random().toString(36).substring(2, 15);
        const res = await salesforceService.submitDonation({
          ...payload,
          stripeSessionId: simulatedSessionId
        });
        if (res && res.success) {
          onDonationSuccess({
            ...res,
            donorName: payload.donorName,
            donorEmail: payload.donorEmail,
            campaignName: currentCampaign?.name,
            programName: currentCampaign?.programName
          });
          onClose();
          return;
        }
      }

      setErrorMsg(stripeRes?.error || 'Failed to initialize Stripe checkout. Please try again.');
    } catch (err) {
      setErrorMsg(err.message || 'An unexpected error occurred while communicating with Stripe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="donation-modal-card" onClick={e => e.stopPropagation()}>
        {/* Fixed Header */}
        <div className="modal-header">
          <div>
            {!isLoggedIn ? (
              <span className="badge badge-amber modal-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Authentication Required
              </span>
            ) : isNoProfile ? (
              <span className="badge badge-blue modal-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                KYC Profile Required
              </span>
            ) : isPending ? (
              <span className="badge badge-amber modal-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Verification Under Review
              </span>
            ) : (
              <span className="badge badge-success modal-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
                Verified Donor Checkout
              </span>
            )}
            <h2 className="modal-title">
              {!isLoggedIn ? 'Sign In to Donate' : !isApproved ? 'Verification Required' : 'Make Your Impact'}
            </h2>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close modal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {!isLoggedIn ? (
          <div className="auth-required-view">
            <div className="auth-lock-icon">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            
            <h3 className="auth-required-title">Donor Sign In Required</h3>
            <p className="auth-required-desc">
              To contribute to <strong>{currentCampaign?.name || 'our causes'}</strong> and receive an official tax-deductible receipt, you must be signed in to your donor account.
            </p>

            <div className="auth-benefit-list">
              <div className="auth-benefit-item">
                <div className="benefit-check">✓</div>
                <div>
                  <strong>Official 501(c)(3) Tax Receipts</strong>
                  <span>Instant, deductible PDF receipts issued directly in your legal name</span>
                </div>
              </div>
              <div className="auth-benefit-item">
                <div className="benefit-check">✓</div>
                <div>
                  <strong>Giving History & Impact Portfolio</strong>
                  <span>Track your personal contribution milestones and recipient updates</span>
                </div>
              </div>
              <div className="auth-benefit-item">
                <div className="benefit-check">✓</div>
                <div>
                  <strong>Bank-Grade Transaction Security</strong>
                  <span>Encrypted processing, PCI compliance, and fraud protection</span>
                </div>
              </div>
            </div>

            <div className="auth-action-buttons">
              <a href={salesforceService.loginUrl} className="btn btn-accent btn-lg auth-login-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                  <polyline points="10 17 15 12 10 7"/>
                  <line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
                Sign In to Continue & Donate
              </a>
              <button type="button" onClick={onClose} className="btn btn-secondary auth-cancel-btn">
                Cancel & Return
              </button>
            </div>
          </div>
        ) : isNoProfile ? (
          <div className="auth-required-view">
            <div className="auth-lock-icon profile-req-icon">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            
            <h3 className="auth-required-title">KYC Verification Profile Required</h3>
            <p className="auth-required-desc">
              Under philanthropic foundation bylaws and anti-money laundering (AML) regulations, every donor must have a verified profile before contributing funds to grant campaigns.
            </p>

            <div className="auth-benefit-list">
              <div className="auth-benefit-item">
                <div className="benefit-check">✓</div>
                <div>
                  <strong>Regulatory & Tax Compliance</strong>
                  <span>Enables issuance of certified tax-deductible receipts under your legal name</span>
                </div>
              </div>
              <div className="auth-benefit-item">
                <div className="benefit-check">✓</div>
                <div>
                  <strong>One-Time Verification</strong>
                  <span>Once your profile is reviewed, you will be authorized for instant giving across all campaigns</span>
                </div>
              </div>
              <div className="auth-benefit-item">
                <div className="benefit-check">✓</div>
                <div>
                  <strong>Philanthropic Governance</strong>
                  <span>Protects recipient programs and establishes a verified donor portfolio</span>
                </div>
              </div>
            </div>

            <div className="auth-action-buttons">
              <button 
                type="button" 
                onClick={() => { onClose(); if (onOpenProfile) onOpenProfile(); }} 
                className="btn btn-accent btn-lg auth-login-btn"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"/>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
                Complete Donor Profile & KYC
              </button>
              <button type="button" onClick={onClose} className="btn btn-secondary auth-cancel-btn">
                Cancel & Return
              </button>
            </div>
          </div>
        ) : isPending ? (
          <div className="auth-required-view">
            <div className="auth-lock-icon pending-req-icon">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            
            <h3 className="auth-required-title">Verification Under Review</h3>
            <p className="auth-required-desc">
              Your donor profile (Legal Name: <strong>{profileStatus?.donorName || userName}</strong>) has been submitted and is currently being audited by our foundation compliance desk.
            </p>

            <div className="auth-benefit-list">
              <div className="auth-benefit-item">
                <div className="benefit-check pending-dot">⏳</div>
                <div>
                  <strong>Review In Progress (~24 Hours)</strong>
                  <span>Our staff verifies donor identity and AML compliance. Once approved, checkout unlocks automatically.</span>
                </div>
              </div>
              <div className="auth-benefit-item">
                <div className="benefit-check pending-dot">📋</div>
                <div>
                  <strong>Profile Status: Pending Compliance</strong>
                  <span>Donor ID: {profileStatus?.donorCode || 'Pending Assignment'}</span>
                </div>
              </div>
            </div>

            <div className="auth-action-buttons">
              <button 
                type="button" 
                onClick={() => { onClose(); if (onOpenProfile) onOpenProfile(); }} 
                className="btn btn-secondary btn-lg"
              >
                View Submitted Profile Details
              </button>
              <button type="button" onClick={onClose} className="btn btn-outline auth-cancel-btn">
                Return to Campaigns
              </button>
            </div>
          </div>
        ) : (
          /* Form Container */
          <form onSubmit={handleSubmit} className="modal-form-wrapper">
            {/* Scrollable Body */}
            <div className="modal-scrollable-body">
              {errorMsg && (
                <div className="error-banner">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span>{errorMsg}</span>
                </div>
              )}

            {/* Campaign Designation */}
            <div className="form-group">
              <label className="form-label">Designate Contribution To Campaign</label>
              <select
                className="form-select"
                value={selectedCampaignId}
                onChange={e => setSelectedCampaignId(e.target.value)}
              >
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.programName ? `(${c.programName})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Frequency Toggle */}
            <div className="frequency-toggle">
              <button
                type="button"
                className={`freq-btn ${frequency === 'one-time' ? 'active' : ''}`}
                onClick={() => setFrequency('one-time')}
              >
                One-Time Gift
              </button>
              <button
                type="button"
                className={`freq-btn ${frequency === 'monthly' ? 'active' : ''}`}
                onClick={() => setFrequency('monthly')}
              >
                ✨ Monthly Sustainer
              </button>
            </div>

            {/* Amount Selection */}
            <div className="amount-section">
              <label className="form-label">Select Donation Amount (USD)</label>
              <div className="presets-grid">
                {PRESET_AMOUNTS.map(val => (
                  <button
                    type="button"
                    key={val}
                    className={`preset-btn ${!isCustom && amount === val ? 'active' : ''}`}
                    onClick={() => handlePresetClick(val)}
                  >
                    ${val}
                  </button>
                ))}
                <div className={`custom-amount-input ${isCustom ? 'active' : ''}`}>
                  <span className="currency-prefix">$</span>
                  <input
                    type="number"
                    placeholder="Custom"
                    min="5"
                    value={customAmount}
                    onChange={handleCustomChange}
                    onFocus={() => setIsCustom(true)}
                  />
                </div>
              </div>
            </div>

            {/* Donor Information Divider */}
            <div className="section-divider">
              <span>Donor Information (For Tax Receipt)</span>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Sarah Jenkins"
                  value={donorName}
                  onChange={e => setDonorName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  required
                  className="form-input"
                  placeholder="sarah@example.com"
                  value={donorEmail}
                  onChange={e => setDonorEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Phone Number (Optional)</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="+1 (555) 000-0000"
                  value={donorPhone}
                  onChange={e => setDonorPhone(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Dedication / Message</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="In honor of... or words of hope"
                  value={donorMessage}
                  onChange={e => setDonorMessage(e.target.value)}
                />
              </div>
            </div>

            {/* Stripe Card Section Divider */}
            <div className="section-divider">
              <span>Payment Details (Stripe 256-Bit SSL)</span>
            </div>

            <div className="stripe-box">
              <div className="card-input-row">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                <input
                  type="text"
                  className="card-field"
                  placeholder="4242 •••• •••• 4242"
                  maxLength="19"
                  value={cardNumber}
                  onChange={e => setCardNumber(e.target.value)}
                />
                <span className="card-brand">VISA / MC</span>
              </div>
              <div className="card-details-subrow">
                <input
                  type="text"
                  className="sub-field"
                  placeholder="MM / YY"
                  maxLength="5"
                  value={cardExpiry}
                  onChange={e => setCardExpiry(e.target.value)}
                />
                <input
                  type="password"
                  className="sub-field"
                  placeholder="CVC"
                  maxLength="4"
                  value={cardCvc}
                  onChange={e => setCardCvc(e.target.value)}
                />
                <input
                  type="text"
                  className="sub-field"
                  placeholder="Zip"
                  maxLength="8"
                  value={zipCode}
                  onChange={e => setZipCode(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="modal-fixed-footer">
            <div className="summary-text">
              <span>Total Gift:</span>
              <strong className="summary-amount">${finalAmount.toFixed(2)} USD</strong>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-accent btn-lg submit-donation-btn"
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Processing with Stripe...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                  Proceed to Stripe Checkout (${finalAmount.toFixed(2)})
                </>
              )}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
