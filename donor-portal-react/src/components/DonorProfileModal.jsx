import React, { useState, useEffect } from 'react';
import salesforceService from '../services/salesforceService';
import './DonorProfileModal.css';

export default function DonorProfileModal({ isOpen, onClose, profileStatus, onProfileUpdated }) {
  const [donorName, setDonorName] = useState('');
  const [donorType, setDonorType] = useState('Individual');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [preferredFundingType, setPreferredFundingType] = useState('Earmarked');
  const [fundingCapacity, setFundingCapacity] = useState('5000');
  const [declaration, setDeclaration] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const currentStatus = profileStatus?.status || profileStatus?.complianceStatus || 'NO_PROFILE';
  const isApproved = currentStatus === 'Approved' && profileStatus?.kycVerified === true;
  const isPending = currentStatus === 'Pending' || (currentStatus === 'Approved' && !profileStatus?.kycVerified);

  useEffect(() => {
    if (profileStatus) {
      if (profileStatus.donorName) setDonorName(profileStatus.donorName);
      else if (profileStatus.userName) setDonorName(profileStatus.userName);

      if (profileStatus.donorType) setDonorType(profileStatus.donorType);
      if (profileStatus.email) setEmail(profileStatus.email);
      else if (profileStatus.userEmail) setEmail(profileStatus.userEmail);

      if (profileStatus.phone) setPhone(profileStatus.phone);
      if (profileStatus.address) setAddress(profileStatus.address);
      if (profileStatus.preferredFundingType) setPreferredFundingType(profileStatus.preferredFundingType);
      if (profileStatus.fundingCapacity) setFundingCapacity(String(profileStatus.fundingCapacity));
    }
  }, [profileStatus, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!donorName.trim()) {
      setErrorMsg('Please enter your full legal or institutional name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please provide a valid official email address.');
      return;
    }
    if (!address.trim()) {
      setErrorMsg('Please enter your registered residential or organization address.');
      return;
    }
    if (!declaration && !isApproved) {
      setErrorMsg('Please check the compliance and KYC certification statement to continue.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        donorName: donorName.trim(),
        donorType,
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        preferredFundingType,
        fundingCapacity: parseFloat(fundingCapacity) || 0
      };

      const res = await salesforceService.submitDonorProfile(payload);

      if (res && res.success) {
        setSuccessMsg('Your donor profile has been submitted successfully for compliance verification.');
        if (onProfileUpdated) {
          onProfileUpdated({
            ...profileStatus,
            ...payload,
            status: 'Pending',
            complianceStatus: 'Pending',
            donorId: res.donorId,
            kycVerified: false
          });
        }
      } else {
        setErrorMsg(res?.error || 'Failed to submit profile. Please try again.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'An unexpected error occurred while saving your profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="profile-modal-card" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="profile-modal-header">
          <div className="header-status-box">
            {isApproved ? (
              <span className="badge badge-success status-pill">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
                Compliance Approved & KYC Verified
              </span>
            ) : isPending ? (
              <span className="badge badge-amber status-pill">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Verification Under Compliance Review
              </span>
            ) : (
              <span className="badge badge-blue status-pill">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Donor KYC Verification Required
              </span>
            )}
            <h2 className="profile-title">Donor Profile & Compliance</h2>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close modal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="profile-modal-body">
          {/* Status Banners */}
          {isApproved && (
            <div className="approved-notice">
              <div className="notice-icon">✓</div>
              <div className="notice-text">
                <strong>Your Donor Profile is Verified & Approved</strong>
                <p>You have full philanthropic authorization to contribute to any active foundation campaign. Official 501(c)(3) tax receipts will be generated under <strong>{donorName || 'your verified profile'}</strong>.</p>
              </div>
            </div>
          )}

          {isPending && (
            <div className="pending-notice">
              <div className="notice-icon">⏳</div>
              <div className="notice-text">
                <strong>Verification in Progress (Turnaround: ~24 Hours)</strong>
                <p>Your donor KYC details are currently being reviewed by our foundation compliance desk. Once approved, donation privileges will activate immediately.</p>
              </div>
            </div>
          )}

          {!isApproved && !isPending && (
            <div className="info-notice">
              <div className="notice-icon">🛡️</div>
              <div className="notice-text">
                <strong>Mandatory Philanthropic Compliance</strong>
                <p>Under foundation governance and AML/charitable regulations, every donor must register a verified profile prior to funding grant initiatives.</p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="error-banner">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="success-banner">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Legal Name / Institutional Entity *</label>
                <input
                  type="text"
                  required
                  className="profile-input"
                  placeholder="e.g. Eleanor Vance or Sterling Philanthropic Trust"
                  value={donorName}
                  onChange={e => setDonorName(e.target.value)}
                  disabled={isApproved}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Donor Classification *</label>
                <select
                  className="profile-select"
                  value={donorType}
                  onChange={e => setDonorType(e.target.value)}
                  disabled={isApproved}
                >
                  <option value="Individual">Individual Donor</option>
                  <option value="Organization">Non-Profit Organization / Foundation</option>
                  <option value="Corporate">Corporate Giving / CSR Partner</option>
                  <option value="NGO">International NGO</option>
                </select>
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Official Email for Tax Receipts *</label>
                <input
                  type="email"
                  required
                  className="profile-input"
                  placeholder="donor@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={isApproved}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact Phone Number</label>
                <input
                  type="tel"
                  className="profile-input"
                  placeholder="+1 (555) 019-2834"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  disabled={isApproved}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Registered Residential / Corporate Address *</label>
              <textarea
                rows="2"
                required
                className="profile-textarea"
                placeholder="Street address, Suite/Apt, City, State/Province, Country, Postal Code"
                value={address}
                onChange={e => setAddress(e.target.value)}
                disabled={isApproved}
              ></textarea>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Preferred Funding Allocation</label>
                <select
                  className="profile-select"
                  value={preferredFundingType}
                  onChange={e => setPreferredFundingType(e.target.value)}
                  disabled={isApproved}
                >
                  <option value="Earmarked">Earmarked (Directly to Selected Campaign)</option>
                  <option value="Non-Earmarked">Non-Earmarked (General Program Relief)</option>
                  <option value="Mixed">Mixed (Co-Funding & Matching Grants)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Annual Giving Capacity (USD)</label>
                <select
                  className="profile-select"
                  value={fundingCapacity}
                  onChange={e => setFundingCapacity(e.target.value)}
                  disabled={isApproved}
                >
                  <option value="1000">Up to $1,000</option>
                  <option value="5000">$1,000 – $5,000</option>
                  <option value="25000">$5,000 – $25,000</option>
                  <option value="100000">$25,000 – $100,000</option>
                  <option value="500000">$100,000+ (Major Donor / Endowment)</option>
                </select>
              </div>
            </div>

            {!isApproved && (
              <div className="declaration-check">
                <input
                  type="checkbox"
                  id="donorDeclaration"
                  checked={declaration}
                  onChange={e => setDeclaration(e.target.checked)}
                />
                <label htmlFor="donorDeclaration">
                  I certify that all provided details are legally authentic. I understand that all contributions are subject to foundation anti-money laundering (AML) verification and tax compliance audits.
                </label>
              </div>
            )}

            <div className="modal-actions-footer">
              <button type="button" onClick={onClose} className="btn btn-secondary profile-cancel-btn">
                Close
              </button>

              {!isApproved && (
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-accent profile-submit-btn"
                >
                  {loading ? 'Submitting to Compliance...' : isPending ? 'Update Submitted Profile' : 'Submit Profile for Verification'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
