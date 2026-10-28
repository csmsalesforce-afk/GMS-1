import React, { useState, useEffect, useRef } from 'react';
import salesforceService from '../services/salesforceService';
import './DonorProfileModal.css';

export default function DonorProfileModal({ isOpen, onClose, profileStatus, onProfileUpdated }) {
  const [activeTab, setActiveTab] = useState('documents'); // Default to documents to emphasize verification

  // Profile Form States
  const [donorName, setDonorName] = useState('');
  const [donorType, setDonorType] = useState('Individual');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [preferredFundingType, setPreferredFundingType] = useState('Earmarked');
  const [fundingCapacity, setFundingCapacity] = useState('5000');
  const [declaration, setDeclaration] = useState(false);

  // Document Verification States
  const [docLoading, setDocLoading] = useState(false);
  const [docData, setDocData] = useState(null);
  const [uploadingDocId, setUploadingDocId] = useState(null);
  const [deletingDocId, setDeletingDocId] = useState(null);
  const [submittingReview, setSubmittingReview] = useState(false);

  // General Notification States
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Hidden file input refs for each doc requirement
  const fileInputRefs = useRef({});

  const hasExistingDonor = Boolean(
    profileStatus?.donorId || 
    profileStatus?.donorCode || 
    (profileStatus?.donorName && profileStatus?.donorName !== profileStatus?.userName)
  );
  
  const complianceStatus = docData?.complianceStatus || profileStatus?.complianceStatus || (hasExistingDonor ? 'Approved' : 'Pending');
  const isKycVerified = docData?.kycVerified !== undefined ? docData.kycVerified : (profileStatus?.kycVerified === true);
  const isApproved = Boolean(
    (complianceStatus === 'Approved' && isKycVerified) ||
    (profileStatus?.complianceStatus === 'Approved' && profileStatus?.kycVerified === true) ||
    (profileStatus?.status === 'Approved' && profileStatus?.kycVerified === true)
  );
  const isPending = !isApproved && (complianceStatus === 'Pending' || (!isKycVerified && complianceStatus !== 'Rejected'));
  const isRejected = complianceStatus === 'Rejected';
  const rejectionReason = docData?.rejectionReason || profileStatus?.rejectionReason;

  // Initialize or reload document requirements
  const fetchDocuments = async () => {
    setDocLoading(true);
    try {
      const res = await salesforceService.getRequiredDonorDocuments();
      if (res) {
        setDocData(res);
      }
    } catch (err) {
      console.error('Failed to load required documents:', err);
    } finally {
      setDocLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSuccessMsg('');
      fetchDocuments();
    }
  }, [isOpen, profileStatus?.donorId]);

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

  // Handle Profile Form Submission
  const handleProfileSubmit = async (e) => {
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
      setErrorMsg('Please enter your registered address.');
      return;
    }
    if (!declaration && !isApproved) {
      setErrorMsg('Please accept the compliance certification statement.');
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
        setSuccessMsg('Your donor profile has been updated successfully.');
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
        // Refresh documents list to reflect any donor type changes
        await fetchDocuments();
      } else {
        setErrorMsg(res?.error || 'Failed to submit profile. Please try again.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'An unexpected error occurred while saving your profile.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Document File Selection & Base64 Upload
  const handleFileChange = async (e, docId) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be re-selected if needed
    e.target.value = '';

    // File validation (max 5MB, PDF/JPG/PNG)
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg(`Invalid file type for ${file.name}. Please upload PDF, JPG, or PNG files.`);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg(`File size exceeds 5MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose a smaller file.`);
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setUploadingDocId(docId);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result.split(',')[1];
        const res = await salesforceService.uploadDonorKYCDocument(docId, file.name, base64Data);
        if (res && res.success) {
          setSuccessMsg(`"${file.name}" uploaded successfully.`);
          await fetchDocuments();
        } else {
          setErrorMsg(res?.error || `Failed to upload ${file.name}.`);
        }
      } catch (err) {
        setErrorMsg(err.message || 'Error occurred while processing file upload.');
      } finally {
        setUploadingDocId(null);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read selected file.');
      setUploadingDocId(null);
    };
    reader.readAsDataURL(file);
  };

  // Handle Document Deletion
  const handleDeleteDoc = async (contentDocId, docName) => {
    if (!window.confirm(`Are you sure you want to remove the uploaded document for "${docName}"?`)) {
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setDeletingDocId(contentDocId);

    try {
      const res = await salesforceService.deleteDonorKYCDocument(contentDocId);
      if (res && res.success) {
        setSuccessMsg(`Document removed.`);
        await fetchDocuments();
      } else {
        setErrorMsg(res?.error || 'Failed to remove document.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error occurred while deleting document.');
    } finally {
      setDeletingDocId(null);
    }
  };

  // Submit All Documents for Admin Compliance Review
  const handleSubmitForReview = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setSubmittingReview(true);

    try {
      const res = await salesforceService.submitDonorDocumentsForReview();
      if (res && res.success) {
        setSuccessMsg('Your documents have been submitted for review! Foundation administration will verify them shortly.');
        await fetchDocuments();
        if (onProfileUpdated) {
          onProfileUpdated({
            ...profileStatus,
            complianceStatus: 'Pending',
            status: 'Pending',
            kycVerified: false
          });
        }
      } else {
        setErrorMsg(res?.error || 'Failed to submit documents for review.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error submitting documents.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const docs = docData?.documents || [];
  const uploadedCount = docData?.uploadedCount || docs.filter(d => d.isUploaded).length;
  const mandatoryDocs = docs.filter(d => d.isMandatory);
  const mandatoryUploaded = mandatoryDocs.filter(d => d.isUploaded).length;
  const allMandatoryDone = mandatoryDocs.length > 0 ? (mandatoryUploaded >= mandatoryDocs.length) : (docs.length > 0 && uploadedCount > 0);
  const programName = docData?.programName || profileStatus?.programName || 'All Foundation Programs';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="profile-modal-card enhanced-modal" onClick={e => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="profile-modal-header">
          <div className="header-status-box">
            <div className="header-badge-row">
              {isApproved ? (
                <span className="badge badge-success status-pill">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  Verified & Approved
                </span>
              ) : isRejected ? (
                <span className="badge badge-danger status-pill">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  Action Required: Re-upload Documents
                </span>
              ) : isPending ? (
                <span className="badge badge-amber status-pill">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  Under Compliance Review
                </span>
              ) : (
                <span className="badge badge-blue status-pill">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  Pending Document Upload
                </span>
              )}

              {profileStatus?.donorCode && (
                <span className="donor-code-chip">ID: {profileStatus.donorCode}</span>
              )}
            </div>

            <h2 className="profile-title">
              {profileStatus?.donorCode ? `Donor Portal: ${profileStatus.donorCode}` : 'Donor Profile & Verification'}
            </h2>
          </div>

          <button className="close-btn" onClick={onClose} aria-label="Close modal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="profile-modal-tabs">
          <button
            type="button"
            className={`profile-tab-btn ${activeTab === 'documents' ? 'active' : ''}`}
            onClick={() => setActiveTab('documents')}
          >
            <span className="tab-icon">📄</span>
            <span>Required Documents</span>
            <span className={`tab-counter ${allMandatoryDone ? 'counter-done' : ''}`}>
              {uploadedCount}/{docs.length}
            </span>
          </button>

          <button
            type="button"
            className={`profile-tab-btn ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            <span className="tab-icon">👤</span>
            <span>Account Details</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="profile-modal-body">
          {/* Notifications */}
          {errorMsg && (
            <div className="error-banner">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="success-banner">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: REQUIRED DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="documents-tab-content">
              {/* Context Summary Card */}
              <div className="program-context-card">
                <div className="context-left">
                  <div className="context-label">Program Allocation</div>
                  <div className="context-value">{programName}</div>
                  <div className="context-meta">
                    <span>Classification: <strong>{donorType}</strong></span>
                    <span>•</span>
                    <span>Verification: <strong>{complianceStatus}</strong></span>
                  </div>
                </div>

                <div className="context-right">
                  <div className="progress-radial-info">
                    <span className="progress-number">{uploadedCount}/{mandatoryDocs.length || docs.length}</span>
                    <span className="progress-label">Uploaded</span>
                  </div>
                </div>
              </div>

              {/* Status Alert Banners */}
              {isApproved && (
                <div className="approved-notice">
                  <div className="notice-icon">✓</div>
                  <div className="notice-text">
                    <strong>KYC & Compliance Verified</strong>
                    <p>Your donor account is fully verified and authorized for direct grant distributions and charitable tax receipts.</p>
                  </div>
                </div>
              )}

              {isRejected && (
                <div className="rejected-notice">
                  <div className="notice-icon">⚠️</div>
                  <div className="notice-text">
                    <strong>Verification Needs Revision</strong>
                    <p>{rejectionReason || 'One or more submitted documents did not meet compliance criteria. Please review the requirements below and upload updated copies.'}</p>
                  </div>
                </div>
              )}

              {isPending && !isApproved && (
                <div className="pending-notice">
                  <div className="notice-icon">⏳</div>
                  <div className="notice-text">
                    <strong>Admin Verification in Progress</strong>
                    <p>Our compliance officers are reviewing your submitted documentation. You may still update or replace any document if needed.</p>
                  </div>
                </div>
              )}

              {/* Documents List */}
              <div className="documents-list-section">
                <div className="section-header-row">
                  <h3 className="section-title">Required Verification Documents</h3>
                  <span className="section-subtitle">
                    Supported formats: PDF, JPG, PNG (Max 5MB each)
                  </span>
                </div>

                {docLoading ? (
                  <div className="doc-loading-skeleton">
                    <div className="spinner-sm"></div>
                    <span>Loading required documents list...</span>
                  </div>
                ) : docs.length === 0 ? (
                  <div className="no-docs-box">
                    <p>No specific documents are currently required for your donor classification.</p>
                  </div>
                ) : (
                  <div className="doc-cards-container">
                    {docs.map(doc => {
                      const isUploading = uploadingDocId === doc.id;
                      const isDeleting = deletingDocId === doc.contentDocumentId;

                      return (
                        <div
                          key={doc.id}
                          className={`doc-card ${doc.isUploaded ? 'doc-card-uploaded' : 'doc-card-missing'} ${doc.isMandatory ? 'doc-mandatory' : ''}`}
                        >
                          <div className="doc-card-header">
                            <div className="doc-card-title-group">
                              <span className="doc-type-icon">{doc.isUploaded ? '📄' : '📁'}</span>
                              <div>
                                <h4 className="doc-name">{doc.name}</h4>
                                <div className="doc-badges">
                                  {doc.isMandatory ? (
                                    <span className="badge badge-mandatory">Mandatory</span>
                                  ) : (
                                    <span className="badge badge-optional">Optional</span>
                                  )}
                                  <span className="badge badge-doc-type">{doc.donorType || 'All Types'}</span>
                                </div>
                              </div>
                            </div>

                            <div className="doc-status-indicator">
                              {doc.isUploaded ? (
                                <span className="status-tag status-uploaded">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                                  Uploaded
                                </span>
                              ) : (
                                <span className="status-tag status-missing">
                                  Pending Upload
                                </span>
                              )}
                            </div>
                          </div>

                          {doc.description && (
                            <p className="doc-instructions">{doc.description}</p>
                          )}

                          {/* Uploaded File Information Card */}
                          {doc.isUploaded ? (
                            <div className="uploaded-file-details">
                              <div className="file-info-left">
                                <div className="file-icon-badge">
                                  {(doc.fileExtension || 'PDF').toUpperCase()}
                                </div>
                                <div className="file-meta">
                                  <span className="file-name" title={doc.fileName}>{doc.fileName}</span>
                                  {doc.uploadDate && (
                                    <span className="file-date">
                                      Uploaded on {new Date(doc.uploadDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="file-actions">
                                {isApproved ? (
                                  <span className="file-locked-pill">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                    Verified & Locked
                                  </span>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      className="btn-replace-doc"
                                      disabled={isUploading || isDeleting}
                                      onClick={() => fileInputRefs.current[doc.id]?.click()}
                                      title="Replace with new file"
                                    >
                                      {isUploading ? 'Uploading...' : 'Replace'}
                                    </button>

                                    <button
                                      type="button"
                                      className="btn-remove-doc"
                                      disabled={isUploading || isDeleting}
                                      onClick={() => handleDeleteDoc(doc.contentDocumentId, doc.name)}
                                      title="Delete document"
                                    >
                                      {isDeleting ? 'Removing...' : 'Remove'}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          ) : (
                            /* Empty Upload Zone - Always open so donors can fulfill requirements */
                            <div
                              className="upload-dropzone"
                              onClick={() => !isUploading && fileInputRefs.current[doc.id]?.click()}
                            >
                              {isUploading ? (
                                <div className="upload-loading-state">
                                  <div className="spinner-sm"></div>
                                  <span>Encoding and attaching to Salesforce...</span>
                                </div>
                              ) : (
                                <div className="upload-prompt">
                                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                  <div>
                                    <span className="upload-primary-text">Click to choose file</span> or drag & drop here
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Hidden File Input */}
                          <input
                            type="file"
                            accept=".pdf,image/png,image/jpeg,image/jpg"
                            style={{ display: 'none' }}
                            ref={el => fileInputRefs.current[doc.id] = el}
                            onChange={e => handleFileChange(e, doc.id)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Document Review Submission Action */}
              <div className="document-submit-footer">
                <div className="footer-status-summary">
                  {allMandatoryDone ? (
                    <span className="summary-ready">✓ All mandatory documents are ready for submission.</span>
                  ) : (
                    <span className="summary-pending">⚠️ Please upload all required mandatory documents to submit for verification.</span>
                  )}
                </div>

                <div className="footer-button-group">
                  <button type="button" onClick={onClose} className="btn btn-secondary profile-cancel-btn">
                    Close
                  </button>

                  <button
                    type="button"
                    disabled={!allMandatoryDone || submittingReview || isApproved}
                    onClick={handleSubmitForReview}
                    className="btn btn-accent doc-submit-btn"
                  >
                    {submittingReview ? 'Submitting to Admin...' : isApproved ? 'Documents Verified ✓' : 'Submit Documents for Verification'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROFILE DETAILS */}
          {activeTab === 'details' && (
            <form onSubmit={handleProfileSubmit} className="profile-form">
              {isApproved && (
                <div className="locked-profile-notice">
                  <div className="locked-icon-badge">🔒</div>
                  <div className="locked-notice-text">
                    <strong>Profile Verified & Officially Locked</strong>
                    <p>Your donor account is verified and approved by the Foundation Administration. For regulatory audit compliance and 501(c)(3) tax receipt integrity, profile details are locked from direct online modification.</p>
                  </div>
                </div>
              )}

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Legal Name / Institutional Entity *</label>
                  <input
                    type="text"
                    required
                    className={`profile-input ${isApproved ? 'input-locked' : ''}`}
                    placeholder="e.g. Eleanor Vance or Sterling Philanthropic Trust"
                    value={donorName}
                    onChange={e => setDonorName(e.target.value)}
                    disabled={isApproved}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Donor Classification *</label>
                  <select
                    className={`profile-select ${isApproved ? 'input-locked' : ''}`}
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
                    className={`profile-input ${isApproved ? 'input-locked' : ''}`}
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
                    className={`profile-input ${isApproved ? 'input-locked' : ''}`}
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
                  className={`profile-textarea ${isApproved ? 'input-locked' : ''}`}
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
                    className={`profile-select ${isApproved ? 'input-locked' : ''}`}
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
                    className={`profile-select ${isApproved ? 'input-locked' : ''}`}
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
                    I certify that all provided details and uploaded documents are legally authentic. I understand that all contributions are subject to foundation anti-money laundering (AML) verification and tax compliance audits.
                  </label>
                </div>
              )}

              <div className="modal-actions-footer">
                {isApproved ? (
                  <div className="locked-badge-pill">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    <span>Profile Details Locked (Approved by Admin)</span>
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-accent profile-submit-btn"
                  >
                    {loading ? 'Saving Profile...' : isPending ? 'Update Submitted Profile' : 'Save & Submit Profile'}
                  </button>
                )}

                <button type="button" onClick={onClose} className="btn btn-secondary profile-cancel-btn">
                  Close
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
