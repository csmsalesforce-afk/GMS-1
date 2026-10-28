import React, { useState } from 'react';
import salesforceService from '../services/salesforceService';
import './PartnerInquiryModal.css';

export default function PartnerInquiryModal({ isOpen, onClose, campaigns = [], initialCampaign = null, profileStatus = null }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [estimatedPledge, setEstimatedPledge] = useState('$10,000 - $25,000');
  const [campaignName, setCampaignName] = useState(initialCampaign?.name || campaigns[0]?.name || 'General Grant Reserve');
  const [message, setMessage] = useState('');

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [reqDocs, setReqDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [filesMap, setFilesMap] = useState({});
  const fileInputRefs = React.useRef({});

  const isCampaignLocked = Boolean(initialCampaign?.name || initialCampaign?.id);
  const hasExistingDonor = Boolean(
    profileStatus?.donorId ||
    profileStatus?.donorCode ||
    (salesforceService.isLoggedIn && (profileStatus?.donorName || profileStatus?.userEmail))
  );

  // Keep campaignName and fields synced when modal opens or initialCampaign changes
  React.useEffect(() => {
    if (isOpen) {
      setSubmitted(false);
      setErrorMsg('');
      setFilesMap({});

      // Lock to designated campaign if opened from a specific campaign card
      if (initialCampaign?.name) {
        setCampaignName(initialCampaign.name);
      } else if (!campaignName) {
        setCampaignName(campaigns[0]?.name || 'General Grant Reserve');
      }

      // Autofill ONLY if an existing donor profile exists, otherwise BLANK for first time / new donor
      if (hasExistingDonor) {
        const p = profileStatus || {};
        const u = salesforceService.currentUser || {};

        let fName = p.firstName || u.firstName || '';
        let lName = p.lastName || u.lastName || '';
        if (!fName && !lName && p.donorName) {
          const parts = p.donorName.trim().split(' ');
          fName = parts[0] || '';
          lName = parts.slice(1).join(' ') || '';
        }
        setFirstName(fName);
        setLastName(lName);
        setCompany(p.company || u.company || (p.donorType !== 'Individual' ? p.donorName : '') || '');
        setEmail(p.donorEmail || p.email || p.userEmail || u.email || '');
        setPhone(p.donorPhone || p.phone || p.userPhone || u.phone || '');
      } else {
        // First-time / new donor: keep all fields completely blank
        setFirstName('');
        setLastName('');
        setCompany('');
        setEmail('');
        setPhone('');
        setMessage('');
      }
    }
  }, [isOpen, initialCampaign, profileStatus]);

  // Load campaign/program specific document requirements dynamically from Salesforce Program_Document__c
  React.useEffect(() => {
    if (isOpen) {
      const matchedCamp = (initialCampaign?.name || initialCampaign?.id ? initialCampaign : null) || campaigns.find(c => c.name === campaignName || c.id === campaignName) || null;
      const campId = matchedCamp?.id || null;
      const progId = matchedCamp?.programId || null;

      setDocsLoading(true);
      salesforceService.getDonorRequirementsForCampaign(campId, progId)
        .then(docs => {
          setReqDocs(Array.isArray(docs) ? docs : []);
        })
        .catch(err => {
          console.error('Error fetching campaign donor requirements:', err);
          setReqDocs([]);
        })
        .finally(() => {
          setDocsLoading(false);
        });
    }
  }, [isOpen, campaignName, campaigns, initialCampaign]);

  if (!isOpen) return null;

  const handleSlotFileSelected = (e, doc) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg(`File "${file.name}" exceeds 10MB limit.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      setFilesMap(prev => ({
        ...prev,
        [doc.id]: {
          name: file.name,
          size: file.size,
          type: file.type,
          base64: base64,
          docKey: doc.id,
          docType: doc.name
        }
      }));
      setErrorMsg('');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveSlotFile = (docId) => {
    setFilesMap(prev => {
      const updated = { ...prev };
      delete updated[docId];
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Check mandatory documents
    const missingMandatory = reqDocs.filter(d => d.isMandatory && !filesMap[d.id]);
    if (missingMandatory.length > 0) {
      setErrorMsg(`Please upload the required mandatory document: "${missingMandatory[0].name}".`);
      return;
    }

    setLoading(true);

    try {
      const matchedCamp = campaigns.find(c => c.name === campaignName || c.id === campaignName) || (initialCampaign?.name === campaignName ? initialCampaign : null);

      const filesList = Object.values(filesMap).map(f => ({
        name: f.name,
        base64: f.base64,
        docKey: f.docKey,
        docType: f.docType
      }));

      const payload = {
        firstName: firstName.trim(),
        lastName: lastName.trim() || 'Partner Inquiry',
        company: company.trim() || 'Individual Philanthropist',
        email: email.trim(),
        phone: phone.trim(),
        campaignName,
        campaignId: matchedCamp?.id || null,
        programId: matchedCamp?.programId || null,
        estimatedPledge,
        message: message.trim(),
        files: filesList
      };

      const res = await salesforceService.submitLeadInquiry(payload);
      if (res && res.success) {
        setSubmitted(true);
        if (payload.campaignId && salesforceService.isLoggedIn) {
          salesforceService.requestCampaignAccess(payload.campaignId, payload.message).catch(() => {});
        }
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
              <div className="partner-label-row">
                <label className="partner-label">Designated Initiative / Sector of Interest</label>
                {isCampaignLocked && (
                  <span className="partner-locked-badge">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    Locked to Initiative
                  </span>
                )}
              </div>
              <select
                className={`partner-select ${isCampaignLocked ? 'partner-select-locked' : ''}`}
                value={isCampaignLocked && initialCampaign?.name ? initialCampaign.name : campaignName}
                onChange={e => !isCampaignLocked && setCampaignName(e.target.value)}
                disabled={isCampaignLocked}
                title={isCampaignLocked ? "Campaign selection is locked for this initiative" : "Select an initiative"}
              >
                {isCampaignLocked && initialCampaign?.name && !campaigns.some(c => c.name === initialCampaign.name) && (
                  <option value={initialCampaign.name}>
                    {initialCampaign.name} {initialCampaign.programName ? `(${initialCampaign.programName})` : ''}
                  </option>
                )}
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

            {/* Verification Documents Upload Section - One Upload Slot for Each Program Required Document */}
            <div className="partner-field partner-doc-upload-section">
              <div className="partner-doc-header">
                <div className="partner-doc-title-row">
                  <label className="partner-label">Program Required Verification Documents</label>
                  {reqDocs.length > 0 && (
                    <span className="partner-doc-counter">
                      {Object.keys(filesMap).length} of {reqDocs.length} Attached
                    </span>
                  )}
                </div>
                <span className="partner-doc-sub">
                  Documents required by this program's administrators for donor eligibility:
                </span>
              </div>

              {docsLoading ? (
                <div className="partner-docs-loading">
                  <span className="spinner-sm"></span>
                  <span>Loading program document requirements from Salesforce...</span>
                </div>
              ) : reqDocs.length === 0 ? (
                <div className="partner-no-docs-box">
                  <div className="partner-no-docs-icon">📄</div>
                  <div className="partner-no-docs-content">
                    <strong>No Specific Documents Required</strong>
                    <p>This program currently does not have specific verification documents required for donors in Salesforce. You may proceed directly with your request.</p>
                  </div>
                </div>
              ) : (
                <div className="partner-req-docs-list">
                  {reqDocs.map((doc) => {
                    const uploadedFile = filesMap[doc.id];

                    return (
                      <div
                        key={doc.id}
                        className={`partner-req-doc-card ${uploadedFile ? 'has-file' : ''} ${doc.isMandatory ? 'is-mandatory' : ''}`}
                      >
                        <div className="partner-req-doc-top">
                          <div className="partner-req-doc-info">
                            <span className="partner-req-doc-icon">{uploadedFile ? '📄' : '📁'}</span>
                            <div className="partner-req-doc-text">
                              <div className="partner-req-doc-name-row">
                                <h4 className="partner-req-doc-name">{doc.name}</h4>
                                {doc.isMandatory ? (
                                  <span className="partner-badge-mandatory">Mandatory</span>
                                ) : (
                                  <span className="partner-badge-optional">Optional</span>
                                )}
                              </div>
                              <p className="partner-req-doc-desc">{doc.description}</p>
                            </div>
                          </div>

                          <div className="partner-req-doc-status">
                            {uploadedFile ? (
                              <span className="partner-status-tag status-uploaded">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                                Attached
                              </span>
                            ) : (
                              <span className={`partner-status-tag ${doc.isMandatory ? 'status-required' : 'status-pending'}`}>
                                {doc.isMandatory ? 'Required' : 'Optional'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Individual Upload Slot for this document */}
                        <div className="partner-req-doc-slot">
                          <input
                            ref={el => (fileInputRefs.current[doc.id] = el)}
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                            style={{ display: 'none' }}
                            onChange={e => handleSlotFileSelected(e, doc)}
                          />

                          {uploadedFile ? (
                            <div className="partner-slot-file-row">
                              <div className="partner-slot-file-meta">
                                <span className="partner-file-badge">PDF/IMG</span>
                                <span className="partner-slot-file-name" title={uploadedFile.name}>
                                  {uploadedFile.name}
                                </span>
                                <span className="partner-slot-file-size">
                                  ({(uploadedFile.size / 1024).toFixed(1)} KB)
                                </span>
                              </div>
                              <div className="partner-slot-actions">
                                <button
                                  type="button"
                                  className="partner-slot-replace-btn"
                                  onClick={() => fileInputRefs.current[doc.id]?.click()}
                                >
                                  Replace
                                </button>
                                <button
                                  type="button"
                                  className="partner-slot-remove-btn"
                                  onClick={() => handleRemoveSlotFile(doc.id)}
                                  title="Remove file"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="partner-slot-upload-btn"
                              onClick={() => fileInputRefs.current[doc.id]?.click()}
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                              </svg>
                              <span>Click to upload {doc.name} (PDF, JPG, PNG)</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
                    Submit Request to Donate
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
