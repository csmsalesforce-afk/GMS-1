import React, { useState } from 'react';
import salesforceService from '../services/salesforceService';
import './PartnerInquiryModal.css';

export default function PartnerInquiryModal({ isOpen, onClose, campaigns = [] }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [estimatedPledge, setEstimatedPledge] = useState('$10,000 - $25,000');
  const [campaignName, setCampaignName] = useState(campaigns[0]?.name || 'General Grant Reserve');
  const [message, setMessage] = useState('');

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim() || 'Partner Inquiry',
        company: company.trim() || 'Philanthropic Partner',
        email: email.trim(),
        phone: phone.trim(),
        campaignName,
        estimatedPledge,
        message: message.trim()
      };

      const res = await salesforceService.submitLeadInquiry(payload);
      if (res && res.success) {
        setSubmitted(true);
      } else {
        setErrorMsg(res?.error || 'Unable to submit partnership request.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error communicating with CRM.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="partner-modal-card animate-fade-in" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="partner-modal-header">
          <div>
            <span className="badge badge-primary partner-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Corporate & Foundation Giving
            </span>
            <h2 className="partner-modal-title">Partner With Our Initiatives</h2>
            <p className="partner-modal-sub">
              Collaborate on institutional endowments, matching drives, or co-sponsored grant initiatives. Once our development officers review your proposal, an official Donor account is created and your portal activation link is emailed to you.
            </p>
          </div>
          <button className="partner-close-btn" onClick={onClose} aria-label="Close dialog">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {submitted ? (
          <div className="submitted-view">
            <div className="success-badge-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h3>Partnership Inquiry Received</h3>
            <p>
              Thank you for initiating a philanthropic partnership. Our development team has received your proposal in Salesforce CRM. Once converted and verified, your official Donor Profile will be activated and a secure portal password link will be emailed to <strong>{email}</strong>.
            </p>
            <button onClick={onClose} className="btn btn-primary btn-lg">
              Return to Giving Portal
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="partner-modal-body">
            {errorMsg && (
              <div className="error-banner">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="partner-form-grid">
              <div className="partner-field">
                <label className="partner-label">First Name *</label>
                <input
                  type="text"
                  required
                  className="partner-input"
                  placeholder="e.g. David"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                />
              </div>
              <div className="partner-field">
                <label className="partner-label">Last Name *</label>
                <input
                  type="text"
                  required
                  className="partner-input"
                  placeholder="e.g. Robinson"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="partner-form-grid">
              <div className="partner-field">
                <label className="partner-label">Organization / Company *</label>
                <input
                  type="text"
                  required
                  className="partner-input"
                  placeholder="Acme Foundation / Corp"
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                />
              </div>
              <div className="partner-field">
                <label className="partner-label">Work Email *</label>
                <input
                  type="email"
                  required
                  className="partner-input"
                  placeholder="david@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="partner-form-grid">
              <div className="partner-field">
                <label className="partner-label">Phone Number</label>
                <input
                  type="tel"
                  className="partner-input"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
              <div className="partner-field">
                <label className="partner-label">Estimated Pledge Range</label>
                <select
                  className="partner-select"
                  value={estimatedPledge}
                  onChange={e => setEstimatedPledge(e.target.value)}
                >
                  <option value="$5,000 - $10,000">$5,000 – $10,000</option>
                  <option value="$10,000 - $25,000">$10,000 – $25,000</option>
                  <option value="$25,000 - $100,000">$25,000 – $100,000</option>
                  <option value="$100,000+">$100,000+ (Major Endowment)</option>
                </select>
              </div>
            </div>

            <div className="partner-field">
              <label className="partner-label">Designated Initiative / Sector of Interest</label>
              <select
                className="partner-select"
                value={campaignName}
                onChange={e => setCampaignName(e.target.value)}
              >
                <option value="General Grant Reserve">General Grant Reserve (Unrestricted Treasury)</option>
                {campaigns.map(c => (
                  <option key={c.id} value={c.name}>
                    {c.name} {c.programName ? `(${c.programName})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="partner-field">
              <label className="partner-label">Partnership Goals & Reporting Expectations</label>
              <textarea
                className="partner-textarea"
                rows="3"
                placeholder="Share your objectives for matching gifts, co-sponsored programs, tax considerations, or governance requirements..."
                value={message}
                onChange={e => setMessage(e.target.value)}
              ></textarea>
            </div>

            <div className="partner-action-row">
              <button type="submit" disabled={loading} className="btn btn-primary btn-lg partner-submit-btn">
                {loading ? (
                  <>
                    <span className="spinner-sm"></span> Submitting to Salesforce...
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="22" y1="2" x2="11" y2="13"/>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                    Submit Partnership Request
                  </>
                )}
              </button>

              <div className="partner-trust-sub">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <polyline points="9 12 11 14 15 10"/>
                </svg>
                <span>Directly routed to Chief Development Officer in Salesforce. 100% Confidential.</span>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
