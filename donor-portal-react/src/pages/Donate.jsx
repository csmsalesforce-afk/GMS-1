import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import salesforceService from '../services/salesforceService';
import './Donate.css';

const PRESET_AMOUNTS = [25, 50, 100, 250, 500];

export default function Donate({
  campaigns = [],
  userAuth,
  profileStatus,
  onOpenProfile,
  onDonationSuccess
}) {
  const location = useLocation();
  const navigate = useNavigate();

  // Retrieve incoming campaign, amount, and lock settings from navigation state
  const stateCampaign = location.state?.campaign;
  const stateAmount = location.state?.amount;
  const stateLocked = location.state?.isLocked;

  const isLoggedIn = userAuth?.isLoggedIn ?? salesforceService.isLoggedIn;
  const userName = userAuth?.userName || salesforceService.userName || '';

  const hasExistingDonor = Boolean(profileStatus?.donorId || profileStatus?.donorCode || (profileStatus?.donorName && profileStatus?.donorName !== userName));
  const currentStatus = profileStatus?.status || profileStatus?.complianceStatus || (hasExistingDonor ? 'Approved' : (isLoggedIn ? 'NO_PROFILE' : 'GUEST'));
  const isApproved = hasExistingDonor || (currentStatus === 'Approved' && profileStatus?.kycVerified === true);
  const isPending = !isApproved && (currentStatus === 'Pending' || (currentStatus === 'Approved' && !profileStatus?.kycVerified));
  const isNoProfile = !hasExistingDonor && currentStatus === 'NO_PROFILE';

  const defaultCampaign = stateCampaign || campaigns[0] || null;
  const [selectedCampaignId, setSelectedCampaignId] = useState(defaultCampaign?.id || '');
  const [designation, setDesignation] = useState(defaultCampaign?.programName || 'Direct Grant Allocation');
  const [isLocked, setIsLocked] = useState(Boolean(stateLocked));

  const [amount, setAmount] = useState(stateAmount || 100);
  const [customAmount, setCustomAmount] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  const [frequency, setFrequency] = useState('one-time'); // 'one-time' | 'recurring'
  const [recurringInterval, setRecurringInterval] = useState('monthly'); // 'monthly' | 'yearly'
  const [duration, setDuration] = useState('Ongoing (Until Cancelled)');

  // Donor fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [donorMessage, setDonorMessage] = useState('');

  // Consent
  const [consentTaxReceipt, setConsentTaxReceipt] = useState(true);
  const [consentAnonymous, setConsentAnonymous] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Autofill donor information accurately
  useEffect(() => {
    if (profileStatus?.firstName && (!firstName || firstName === 'Donor')) {
      setFirstName(profileStatus.firstName);
    }
    if (profileStatus?.lastName && !lastName) {
      setLastName(profileStatus.lastName);
    }

    const resolvedEmail = profileStatus?.donorEmail || profileStatus?.email || profileStatus?.userEmail || '';
    if (resolvedEmail && (!donorEmail || donorEmail === 'donor@example.com')) {
      setDonorEmail(resolvedEmail);
    }

    const resolvedPhone = profileStatus?.donorPhone || profileStatus?.phone || profileStatus?.userPhone || '';
    if (resolvedPhone && !donorPhone) {
      setDonorPhone(resolvedPhone);
    }

    if (!profileStatus?.firstName && !profileStatus?.lastName) {
      const full = profileStatus?.userName || userName;
      if (full && full !== 'Donor' && (!firstName && !lastName)) {
        const parts = full.trim().split(/\s+/);
        if (parts.length > 1) {
          setFirstName(parts.slice(0, -1).join(' '));
          setLastName(parts[parts.length - 1]);
        } else if (parts.length === 1 && parts[0] !== 'Donor') {
          setFirstName(parts[0]);
        }
      }
    }
  }, [profileStatus, userName]);

  // Sync selected campaign if incoming state changes
  useEffect(() => {
    if (stateCampaign?.id) {
      setSelectedCampaignId(stateCampaign.id);
      setDesignation(stateCampaign.programName || stateCampaign.programType || 'Direct Grant Allocation');
      setIsLocked(Boolean(stateLocked));
    } else if (campaigns.length > 0 && !selectedCampaignId) {
      setSelectedCampaignId(campaigns[0].id);
      setDesignation(campaigns[0].programName || 'Direct Grant Allocation');
    }
  }, [stateCampaign, stateLocked, campaigns]);

  const currentCampaign = campaigns.find(c => c.id === selectedCampaignId) || defaultCampaign || campaigns[0];
  const finalAmount = isCustom ? parseFloat(customAmount) || 0 : amount;
  const resolvedFrequency = frequency === 'one-time'
    ? 'One-Time'
    : (recurringInterval === 'yearly' ? 'Recurring (Yearly)' : 'Recurring (Monthly)');
  const frequencyUnit = frequency === 'one-time' ? '' : (recurringInterval === 'yearly' ? ' / yr' : ' / mo');

  const handleCampaignChange = (campaignId) => {
    setSelectedCampaignId(campaignId);
    const c = campaigns.find(item => item.id === campaignId);
    if (c) {
      setDesignation(c.programName || c.programType || 'Direct Grant Allocation');
    }
  };

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

    if (!finalAmount || finalAmount < 5) {
      setErrorMsg('Please specify a valid donation amount ($5 minimum).');
      return;
    }
    if (!donorEmail || !donorEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address to receive your official tax receipt.');
      return;
    }
    if (!donorPhone || donorPhone.trim().length < 6) {
      setErrorMsg('Please enter a valid phone number.');
      return;
    }

    setLoading(true);

    try {
      const origin = window.location.origin;
      const path = window.location.pathname;
      const successUrl = `${origin}${path}?stripe_session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${origin}${path}#campaigns`;

      const resolvedDonorName = consentAnonymous 
        ? 'Anonymous Donor' 
        : `${firstName} ${lastName}`.trim() || 'Generous Supporter';

      const payload = {
        campaignId: currentCampaign?.id,
        campaignName: currentCampaign?.name,
        designation: designation || currentCampaign?.programName || 'Education & STEM',
        frequency: resolvedFrequency,
        duration: frequency !== 'one-time' ? duration : 'Ongoing',
        amount: finalAmount,
        donorName: resolvedDonorName,
        donorEmail: donorEmail.trim(),
        donorPhone: donorPhone.trim(),
        donorMessage: donorMessage.trim(),
        isAnonymous: consentAnonymous,
        consentTaxReceipt: consentTaxReceipt,
        successUrl,
        cancelUrl
      };

      const stripeRes = await salesforceService.createStripeCheckoutSession(payload);

      if (stripeRes && stripeRes.success && stripeRes.checkoutUrl) {
        window.location.href = stripeRes.checkoutUrl;
        return;
      }

      // Standalone/Mock fallback
      if (stripeRes && stripeRes.success && !stripeRes.checkoutUrl) {
        const simulatedSessionId = 'cs_demo_' + Math.random().toString(36).substring(2, 15);
        const res = await salesforceService.submitDonation({
          ...payload,
          stripeSessionId: simulatedSessionId
        });
        if (res && res.success) {
          if (onDonationSuccess) {
            onDonationSuccess({
              ...res,
              donorName: payload.donorName,
              donorEmail: payload.donorEmail,
              campaignName: currentCampaign?.name,
              programName: payload.designation || currentCampaign?.programName,
              frequency: payload.frequency,
              designation: payload.designation,
              amount: payload.amount,
              date: new Date().toISOString()
            });
          }
          navigate('/campaigns');
        }
      } else {
        setErrorMsg(stripeRes?.error || 'Unable to initiate Stripe checkout. Please try again.');
      }
    } catch (err) {
      console.error('Donation checkout error:', err);
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="donate-page animate-fade-in">
      {/* Header Banner */}
      <div className="donate-page-header">
        <div className="container">
          <div className="header-breadcrumbs">
            <Link to="/campaigns" className="back-link">
              ← Back to All Campaigns
            </Link>
          </div>
          <div className="header-title-row">
            <div>
              <span className="donate-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Verified Philanthropic Checkout
              </span>
              <h1 className="donate-title">Make Your Impact</h1>
              <p className="donate-subtitle">
                100% of your tax-deductible gift directly funds audited milestone disbursements for beneficiary grant initiatives.
              </p>
            </div>
            <div className="header-trust-pills">
              <span className="trust-pill">🔒 256-Bit SSL Encrypted</span>
              <span className="trust-pill">🏛️ IRS 501(c)(3) Eligible</span>
              <span className="trust-pill">✓ Instant Tax Receipt</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container donate-content-layout">
        {/* Left Column: Initiative Spotlight & Impact Overview */}
        <div className="donate-sidebar-column">
          <div className="initiative-spotlight-card">
            <div className="spotlight-card-header">
              <span className="spotlight-badge">Designated Initiative</span>
              {currentCampaign?.programName && (
                <span className="spotlight-fund-tag">{currentCampaign.programName}</span>
              )}
            </div>

            <h3 className="spotlight-title">{currentCampaign?.name || 'Philanthropic Grant Fund'}</h3>
            <p className="spotlight-description">
              {currentCampaign?.description || 'Your generous support accelerates pioneering research and community infrastructure projects.'}
            </p>

            {currentCampaign && (
              <div className="spotlight-progress-wrap">
                <div className="spotlight-progress-labels">
                  <span>Raised: <strong>${(currentCampaign.raisedAmount || 0).toLocaleString()}</strong></span>
                  <span>Goal: <strong>${(currentCampaign.goalAmount || 0).toLocaleString()}</strong></span>
                </div>
                <div className="spotlight-progress-bar">
                  <div
                    className="spotlight-progress-fill"
                    style={{ width: `${Math.min(100, Math.round(((currentCampaign.raisedAmount || 0) / (currentCampaign.goalAmount || 1)) * 100))}%` }}
                  ></div>
                </div>
              </div>
            )}

            <div className="spotlight-guarantee-list">
              <div className="guarantee-item">
                <div className="guarantee-check">✓</div>
                <div>
                  <strong>Direct Beneficiary Disbursement</strong>
                  <span>Gifts replenish dedicated Grant Program escrow funds without middleman fees.</span>
                </div>
              </div>
              <div className="guarantee-item">
                <div className="guarantee-check">✓</div>
                <div>
                  <strong>Official IRS Recordkeeping</strong>
                  <span>You will immediately receive a certified 501(c)(3) tax receipt upon checkout.</span>
                </div>
              </div>
              <div className="guarantee-item">
                <div className="guarantee-check">✓</div>
                <div>
                  <strong>Full Auto-Pay Control</strong>
                  <span>Recurring gifts can be paused, modified, or cancelled anytime in your donor dashboard.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Giving Summary Preview Card */}
          <div className="live-summary-card">
            <div className="live-summary-header">
              <span>Contribution Breakdown</span>
              <span className="live-pill">Live Preview</span>
            </div>
            <div className="summary-list">
              <div className="summary-item">
                <span className="summary-label">Giving Frequency</span>
                <span className="summary-value font-bold" style={{ color: '#047857' }}>
                  {resolvedFrequency}
                </span>
              </div>
              {frequency !== 'one-time' && (
                <div className="summary-item">
                  <span className="summary-label">Commitment Duration</span>
                  <span className="summary-value font-bold" style={{ color: '#1e40af' }}>
                    {duration}
                  </span>
                </div>
              )}
              <div className="summary-item">
                <span className="summary-label">Designated Fund</span>
                <span className="summary-value" title={designation}>
                  {designation}
                </span>
              </div>
              <div className="summary-total-divider"></div>
              <div className="summary-total-row">
                <span>Total Contribution:</span>
                <strong className="summary-total-amount">
                  ${finalAmount.toFixed(2)} USD{frequencyUnit}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Checkout Form */}
        <div className="donate-form-column">
          <form onSubmit={handleSubmit} className="checkout-card" noValidate>
            {/* Step 1: Campaign & Designation */}
            <div className="form-section">
              <div className="section-title-row">
                <span className="step-circle">1</span>
                <div>
                  <h4 className="section-title">Designate Your Gift</h4>
                  <p className="section-subtitle">Select the specific grant campaign or beneficiary initiative.</p>
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="campaignSelect">
                    <span>Campaign</span>
                    {isLocked && <span className="locked-pill">🔒 Locked to Initiative</span>}
                  </label>
                  <select
                    id="campaignSelect"
                    className="form-select"
                    value={selectedCampaignId}
                    onChange={e => handleCampaignChange(e.target.value)}
                    disabled={isLocked}
                  >
                    {campaigns.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="programSelect">
                    <span>Beneficiary Grant Program</span>
                  </label>
                  <select
                    id="programSelect"
                    className="form-select"
                    value={designation}
                    onChange={e => setDesignation(e.target.value)}
                    disabled={isLocked}
                  >
                    {currentCampaign?.programName && (
                      <option value={currentCampaign.programName}>
                        {currentCampaign.programName}
                      </option>
                    )}
                    {campaigns
                      .filter(c => c.programName && c.programName !== currentCampaign?.programName)
                      .map(c => (
                        <option key={c.id} value={c.programName}>
                          {c.programName}
                        </option>
                      ))}
                    <option value="General Philanthropic Fund">General Philanthropic Fund</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Step 2: Frequency & Cadence */}
            <div className="form-section">
              <div className="section-title-row">
                <span className="step-circle">2</span>
                <div>
                  <h4 className="section-title">Giving Option &amp; Schedule</h4>
                  <p className="section-subtitle">Choose between a single gift or an ongoing sustainer pledge.</p>
                </div>
              </div>

              <div className="frequency-toggle-row">
                <button
                  type="button"
                  className={`freq-toggle-btn ${frequency === 'one-time' ? 'active' : ''}`}
                  onClick={() => setFrequency('one-time')}
                >
                  <div className="freq-radio-dot">
                    {frequency === 'one-time' && <div className="freq-radio-inner" />}
                  </div>
                  <div className="freq-content">
                    <div className="freq-header-line">
                      <span className="freq-icon">⚡</span>
                      <strong className="freq-title">One-Time Gift</strong>
                    </div>
                    <span className="freq-desc">Single instant contribution</span>
                  </div>
                </button>
                <button
                  type="button"
                  className={`freq-toggle-btn ${frequency !== 'one-time' ? 'active' : ''}`}
                  onClick={() => setFrequency('recurring')}
                >
                  <div className="freq-radio-dot">
                    {frequency !== 'one-time' && <div className="freq-radio-inner" />}
                  </div>
                  <div className="freq-content">
                    <div className="freq-header-line">
                      <span className="freq-icon">🔁</span>
                      <strong className="freq-title">Recurring Sustainer</strong>
                      <span className="freq-popular-badge">Continuous Impact</span>
                    </div>
                    <span className="freq-desc">Automated monthly or annual funding</span>
                  </div>
                </button>
              </div>

              {frequency !== 'one-time' && (
                <div className="recurring-config-panel">
                  <div className="config-row">
                    <span className="config-label">Billing Cadence:</span>
                    <div className="config-pills">
                      <button
                        type="button"
                        className={`config-pill ${recurringInterval === 'monthly' ? 'active' : ''}`}
                        onClick={() => setRecurringInterval('monthly')}
                      >
                        🗓️ Monthly
                      </button>
                      <button
                        type="button"
                        className={`config-pill ${recurringInterval === 'yearly' ? 'active' : ''}`}
                        onClick={() => setRecurringInterval('yearly')}
                      >
                        📅 Annual / Yearly
                      </button>
                    </div>
                  </div>

                  <div className="config-row">
                    <span className="config-label">Commitment Duration:</span>
                    <div className="config-pills">
                      {(recurringInterval === 'yearly' 
                        ? ['Ongoing (Until Cancelled)', '2 Years', '3 Years', '5 Years'] 
                        : ['Ongoing (Until Cancelled)', '3 Months', '6 Months', '12 Months']
                      ).map(d => (
                        <button
                          type="button"
                          key={d}
                          className={`config-pill ${duration === d ? 'active' : ''}`}
                          onClick={() => setDuration(d)}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="recurring-info-box">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#047857" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <span>
                      <strong>Automated Auto-Pay via Stripe:</strong> Billed {recurringInterval === 'yearly' ? 'once per year' : 'monthly'} ({duration}). You can track or cancel your recurring auto-pay anytime under <strong>My Giving</strong>.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Select Donation Amount */}
            <div className="form-section">
              <div className="section-title-row">
                <span className="step-circle">3</span>
                <div>
                  <h4 className="section-title">Select Donation Amount (USD)</h4>
                  <p className="section-subtitle">Every dollar directly advances field milestones.</p>
                </div>
              </div>

              <div className="amount-pills-grid">
                {PRESET_AMOUNTS.map(val => (
                  <button
                    type="button"
                    key={val}
                    className={`amount-pill-btn ${!isCustom && amount === val ? 'active' : ''}`}
                    onClick={() => handlePresetClick(val)}
                  >
                    ${val}
                  </button>
                ))}
                <div className={`custom-amount-box ${isCustom ? 'active' : ''}`}>
                  <span className="currency-mark">$</span>
                  <input
                    type="number"
                    placeholder="Other Amount"
                    min="5"
                    step="any"
                    value={customAmount}
                    onChange={handleCustomChange}
                    onFocus={() => setIsCustom(true)}
                  />
                </div>
              </div>
            </div>

            {/* Step 4: Donor Information */}
            <div className="form-section">
              <div className="section-title-row">
                <span className="step-circle">4</span>
                <div>
                  <h4 className="section-title">Donor Information (For Tax Receipt)</h4>
                  <p className="section-subtitle">Official details required for IRS 501(c)(3) certification.</p>
                </div>
              </div>

              {errorMsg && (
                <div className="donate-error-alert">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="donorFirstName">
                    <span>First Name <span className="req-mark">*</span></span>
                  </label>
                  <input
                    id="donorFirstName"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Ram"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    autoComplete="given-name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="donorLastName">
                    <span>Last Name <span className="req-mark">*</span></span>
                  </label>
                  <input
                    id="donorLastName"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Kanungo"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    autoComplete="family-name"
                    required
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="donorEmail">
                    <span>Email Address <span className="req-mark">*</span></span>
                    <span className="label-hint">For Official Receipt</span>
                  </label>
                  <input
                    id="donorEmail"
                    type="email"
                    className="form-input"
                    placeholder="donor@example.com"
                    value={donorEmail}
                    onChange={e => setDonorEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="donorPhone">
                    <span>Phone Number <span className="req-mark">*</span></span>
                  </label>
                  <input
                    id="donorPhone"
                    type="tel"
                    className="form-input"
                    placeholder="+1 (555) 000-0000"
                    value={donorPhone}
                    onChange={e => setDonorPhone(e.target.value)}
                    autoComplete="tel"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="donorMessage">
                  <span>Dedication / Gift Message</span>
                  <span className="label-hint">Optional</span>
                </label>
                <input
                  id="donorMessage"
                  type="text"
                  className="form-input"
                  placeholder="In honor of... or words of encouragement"
                  value={donorMessage}
                  onChange={e => setDonorMessage(e.target.value)}
                />
              </div>

              <div className="consent-checkboxes">
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={consentTaxReceipt}
                    onChange={e => setConsentTaxReceipt(e.target.checked)}
                  />
                  <span>I consent to receive official 501(c)(3) tax receipts and verified milestone updates by email.</span>
                </label>

                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={consentAnonymous}
                    onChange={e => setConsentAnonymous(e.target.checked)}
                  />
                  <span>Keep my gift anonymous on public donor walls and campaign supporter lists.</span>
                </label>
              </div>
            </div>

            {/* Submit / Proceed to Stripe */}
            <div className="checkout-action-section">
              <div className="checkout-summary-bar">
                <div>
                  <span className="summary-caption">Total Charitable Gift:</span>
                  <strong className="summary-main-price">
                    ${finalAmount.toFixed(2)} USD{frequencyUnit}
                  </strong>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-accent btn-lg checkout-submit-btn"
                >
                  {loading ? (
                    <span className="btn-spinner-row">
                      <span className="spinner-small"></span>
                      Connecting to Secure Gateway...
                    </span>
                  ) : (
                    <span className="btn-content-row">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                      Proceed to Stripe Checkout (${finalAmount.toFixed(2)}{frequencyUnit})
                    </span>
                  )}
                </button>
              </div>
              <div className="checkout-footer-assurance">
                <span>🔒 Secured by Stripe 256-Bit SSL Encryption • PCI Level-1 Compliant • Instant IRS Tax Receipt</span>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
