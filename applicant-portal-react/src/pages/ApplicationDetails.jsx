import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import salesforceService from '../services/salesforceService';
import './ApplicationDetails.css';

const ApplicationDetails = () => {
  const { applicationId } = useParams();
  const navigate = useNavigate();

  const [application, setApplication] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Withdraw state
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    loadData();
  }, [applicationId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [appData, filesData] = await Promise.all([
        salesforceService.getApplication(applicationId),
        salesforceService.getApplicationFiles(applicationId)
      ]);

      if (appData) {
        setApplication(appData);
      } else {
        setError('Application record not found.');
      }

      setFiles(filesData || []);
    } catch (err) {
      console.error('Failed to load application details', err);
      setError('Unable to fetch application details from Salesforce.');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawReason.trim()) {
      alert('Please enter a reason for withdrawal.');
      return;
    }

    try {
      setIsWithdrawing(true);
      await salesforceService.withdrawApplication(applicationId, withdrawReason);
      setShowWithdrawModal(false);
      await loadData();
    } catch (err) {
      console.error('Error withdrawing application:', err);
      alert(err?.body?.message || err?.message || 'Failed to withdraw application.');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleGeneratePdf = async () => {
    try {
      setIsGeneratingPdf(true);
      await salesforceService.generatePdfAndSubmit(applicationId);
      await loadData();
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert(err?.body?.message || err?.message || 'Failed to generate PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const getStatusClass = (status) => {
    const s = (status || '').toLowerCase().trim();
    if (s === 'draft') return 'draft';
    if (s === 'submitted') return 'submitted';
    if (s === 'under review') return 'under-review';
    if (s === 'approved') return 'approved';
    if (s === 'withdrawn') return 'withdrawn';
    if (s === 'rejected') return 'rejected';
    return 'submitted';
  };

  // Find generated PDF file if any
  const generatedPdfFile = files.find(f => 
    (f.title && f.title.toLowerCase().includes('grant_application')) ||
    (f.title && f.title.toLowerCase().endsWith('.pdf'))
  );

  const getDownloadUrl = (file) => {
    const sitePrefix = salesforceService.sitePrefix || '';
    if (file.versionId) {
      return `${sitePrefix}/sfc/servlet.shepherd/version/download/${file.versionId}`;
    }
    return `${sitePrefix}/sfc/servlet.shepherd/document/download/${file.documentId}`;
  };

  if (loading) {
    return (
      <div className="app-details-page">
        <div style={{ textAlign: 'center', padding: '5rem', color: '#64748b' }}>
          Loading application details...
        </div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="app-details-page">
        <div style={{ textAlign: 'center', padding: '5rem' }}>
          <h2 style={{ color: '#dc2626' }}>{error || 'Application not found'}</h2>
          <button className="btn-back-link" onClick={() => navigate('/my-applications')}>
            ← Back to My Applications
          </button>
        </div>
      </div>
    );
  }

  const isSubmittedOrReview = 
    application.Application_Status__c === 'Submitted' ||
    application.Application_Status__c === 'Under Review';

  return (
    <div className="app-details-page">
      {/* Top Navigation */}
      <div className="app-details-top-bar">
        <button className="btn-back-link" onClick={() => navigate('/my-applications')}>
          ← Back to My Applications
        </button>
        <span className={`status-pill ${getStatusClass(application.Application_Status__c)}`}>
          ● {application.Application_Status__c || 'Draft'}
        </span>
      </div>

      {/* Hero Overview Card */}
      <div className="app-hero-card">
        <div className="app-hero-main">
          <div className="app-hero-badge-row">
            <span className="app-hero-prog-tag">{application.Program__r?.Name || 'Grant Program'}</span>
            <span className="app-hero-id">{application.Name}</span>
          </div>
          <h1 className="app-hero-title">
            {application.Project_Title__c || 'Untitled Grant Application'}
          </h1>
          <div className="app-hero-meta">
            <div className="app-hero-meta-item">
              <strong>Applicant:</strong> {application.Applicant_Name__c || 'Salesforce - CSM'}
            </div>
            {application.Submission_Date__c && (
              <div className="app-hero-meta-item">
                <strong>Submitted:</strong> {new Date(application.Submission_Date__c).toLocaleDateString()}
              </div>
            )}
            {application.End_Date__c && (
              <div className="app-hero-meta-item">
                <strong>End Date:</strong> {new Date(application.End_Date__c).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        <div className="app-hero-actions">
          {generatedPdfFile ? (
            <a 
              href={getDownloadUrl(generatedPdfFile)} 
              target="_blank" 
              rel="noreferrer"
              className="btn-pdf-action"
            >
              📄 Download Official Application PDF
            </a>
          ) : (
            <button 
              className="btn-pdf-action" 
              onClick={handleGeneratePdf}
              disabled={isGeneratingPdf}
            >
              {isGeneratingPdf ? 'Generating PDF...' : '📄 Generate Application PDF'}
            </button>
          )}

          {isSubmittedOrReview && (
            <button className="btn-withdraw-action" onClick={() => setShowWithdrawModal(true)}>
              Withdraw Application
            </button>
          )}
        </div>
      </div>

      {/* Grid of Dedicated Field Sections */}
      <div className="app-sections-grid">
        
        {/* ================= 1. APPLICANT & PROJECT DETAILS ================= */}
        <div className="section-card">
          <div className="section-header">
            <h2 className="section-title">
              <span>👤</span> Applicant & Project Information
            </h2>
            <span className="section-badge">Filled by Applicant</span>
          </div>
          <div className="section-body">
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Applicant Name</span>
                <span className="detail-value">{application.Applicant_Name__c || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Country</span>
                <span className="detail-value">{application.Country__c || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Region</span>
                <span className="detail-value">{application.Region__c || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Requested Amount</span>
                <span className="detail-value highlight-amount">
                  ${application.Requested_Amount__c?.toLocaleString() || '0'}
                </span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Project Start Date</span>
                <span className="detail-value">{application.Start_Date__c || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Project End Date</span>
                <span className="detail-value">{application.End_Date__c || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Submission Date</span>
                <span className="detail-value">{application.Submission_Date__c || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Version</span>
                <span className="detail-value">{application.Application_Version__c || '1.0'}</span>
              </div>

              {/* Project Description */}
              <div className="detail-item full-width">
                <span className="detail-label">Project Description</span>
                <div className="detail-textbox">
                  {application.Project_Description__c || 'No project description provided.'}
                </div>
              </div>

              {/* Budget Details */}
              <div className="detail-item full-width">
                <span className="detail-label">Budget Breakdown Details</span>
                <div className="detail-textbox">
                  {application.Budget_Details__c || 'No budget breakdown provided.'}
                </div>
              </div>

              {/* Bank Details */}
              <div className="detail-item">
                <span className="detail-label">Bank Name</span>
                <span className="detail-value">{application.Bank_Name_applicant__c || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Account Number</span>
                <span className="detail-value">{application.Bank_Account_Number_applicant__c || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">IFSC / SWIFT Code</span>
                <span className="detail-value">{application.IFSC_SWIFT_Code_applicant__c || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Tax ID</span>
                <span className="detail-value">{application.Tax_ID_applicant__c || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= 2. REVIEWER SECTION ================= */}
        <div className="section-card">
          <div className="section-header">
            <h2 className="section-title">
              <span>🔍</span> Reviewer Assessment
            </h2>
            <span className="section-badge" style={{ background: '#e0f2fe', color: '#0369a1' }}>
              Filled by Reviewer
            </span>
          </div>
          <div className="section-body">
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Reviewer Assigned</span>
                <span className="detail-value">{application.Reviewer_Assigned__r?.Name || 'Pending Assignment'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Reviewer Recommendation</span>
                <span className="detail-value" style={{ color: application.Reviewer_Recommendation__c ? '#2563eb' : '#64748b' }}>
                  {application.Reviewer_Recommendation__c || 'Pending Review'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Reviewer Score</span>
                <span className="detail-value">{application.Reviewer_Score__c != null ? `${application.Reviewer_Score__c} / 100` : 'Not Scored'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Risk Level</span>
                <span className="detail-value">{application.Risk_Level__c || 'Not Assessed'}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Technical Feasibility</span>
                <span className="detail-value">{application.Technical_Feasibility__c || 'Pending'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">External Reviewer Score</span>
                <span className="detail-value">{application.External_Reviewer_Score__c != null ? `${application.External_Reviewer_Score__c} / 100` : 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">SLA Duration</span>
                <span className="detail-value">{application.Reviewer_SLA_Duration_Hours__c ? `${application.Reviewer_SLA_Duration_Hours__c} hrs` : '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">SLA Status</span>
                <span className="detail-value" style={{ color: application.SLA_Breached__c ? '#dc2626' : '#16a34a' }}>
                  {application.SLA_Breached__c ? 'Breached' : 'Within SLA'}
                </span>
              </div>

              {/* Reviewer Comments */}
              <div className="detail-item full-width">
                <span className="detail-label">Reviewer Comments & Feedback</span>
                <div className="detail-textbox">
                  {application.Reviewer_Comments__c || 'No internal reviewer comments recorded yet.'}
                </div>
              </div>

              {/* External Reviewer Comments */}
              {application.External_Reviewer_Comments__c && (
                <div className="detail-item full-width">
                  <span className="detail-label">External Reviewer Remarks</span>
                  <div className="detail-textbox">
                    {application.External_Reviewer_Comments__c}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================= 3. PROGRAM OFFICER SECTION ================= */}
        <div className="section-card">
          <div className="section-header">
            <h2 className="section-title">
              <span>🎯</span> Program Officer Evaluation
            </h2>
            <span className="section-badge" style={{ background: '#fef3c7', color: '#92400e' }}>
              Filled by Program Officer
            </span>
          </div>
          <div className="section-body">
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Program Officer</span>
                <span className="detail-value">{application.Program_Officer__r?.Name || 'Assigned Officer'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Program Alignment Score</span>
                <span className="detail-value">
                  {application.Program_Alignment_Score__c != null ? `${application.Program_Alignment_Score__c} / 5` : 'Pending'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Funding Priority</span>
                <span className="detail-value">{application.Funding_Priority__c || 'Standard'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Approval Type</span>
                <span className="detail-value">{application.Approval_Type__c || 'Standard'}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Eligibility Score</span>
                <span className="detail-value">{application.Eligibility_Score__c != null ? application.Eligibility_Score__c : '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Budget Compliance Score</span>
                <span className="detail-value">{application.Budget_Compliance_Score__c != null ? application.Budget_Compliance_Score__c : '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Resubmission Count</span>
                <span className="detail-value">{application.Resubmission_Count__c || '0'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= 4. FINANCE & DISBURSEMENT SECTION ================= */}
        <div className="section-card">
          <div className="section-header">
            <h2 className="section-title">
              <span>💳</span> Finance & Disbursement Details
            </h2>
            <span className="section-badge" style={{ background: '#dcfce7', color: '#166534' }}>
              Filled by Financer
            </span>
          </div>
          <div className="section-body">
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Financer Assigned</span>
                <span className="detail-value">{application.Financer__r?.Name || 'Finance Team'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Approved Grant Amount</span>
                <span className="detail-value approved-amount">
                  {application.Approved_Amount__c ? `$${application.Approved_Amount__c.toLocaleString()}` : 'Pending Approval'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Invoice Created?</span>
                <span className="detail-value">{application.Invoice_Created__c ? '✓ Yes' : 'No'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Awards Created?</span>
                <span className="detail-value">{application.Awards_Created__c ? '✓ Yes' : 'No'}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Installment Percentage</span>
                <span className="detail-value">{application.Installment_Percentage__c ? `${application.Installment_Percentage__c}%` : '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Number of Installments</span>
                <span className="detail-value">{application.Number_of_Installments__c || '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Total Contribution</span>
                <span className="detail-value">{application.Total_Contribution__c ? `${application.Total_Contribution__c}%` : '-'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Total Funding Request</span>
                <span className="detail-value">{application.Total_Funding_Request__c ? `$${application.Total_Funding_Request__c.toLocaleString()}` : '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ================= 5. UPLOADED DOCUMENTS & GENERATED PDF ================= */}
        <div className="section-card">
          <div className="section-header">
            <h2 className="section-title">
              <span>📂</span> Applicant Uploaded Files & Generated PDF
            </h2>
            <span className="section-badge">Attachments & Files</span>
          </div>
          <div className="section-body">
            {/* Generated PDF Banner if ready */}
            {generatedPdfFile && (
              <div className="generated-pdf-banner">
                <div className="pdf-banner-content">
                  <h4>
                    <span>📄</span> Official Grant Application PDF
                  </h4>
                  <p>Generated automatically upon submitting application for approval.</p>
                </div>
                <a
                  href={getDownloadUrl(generatedPdfFile)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-pdf-action"
                >
                  Download Application PDF →
                </a>
              </div>
            )}

            <div className="files-list">
              {files.length > 0 ? (
                files.map((file) => (
                  <div key={file.documentId || file.versionId} className="file-item-card">
                    <div className="file-info">
                      <span className="file-icon">
                        {file.extension === 'pdf' ? '📕' : file.extension === 'doc' || file.extension === 'docx' ? '📘' : '📄'}
                      </span>
                      <div className="file-name-wrap">
                        <p className="file-title" title={file.title}>
                          {file.title}
                        </p>
                        <p className="file-date">
                          {file.createdDate ? new Date(file.createdDate).toLocaleDateString() : 'Uploaded Document'}
                        </p>
                      </div>
                    </div>
                    <a
                      href={getDownloadUrl(file)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-file-download"
                    >
                      Download
                    </a>
                  </div>
                ))
              ) : (
                <div style={{ color: '#64748b', padding: '1rem', gridColumn: '1 / -1' }}>
                  No applicant files found for this application.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="withdraw-modal-overlay" onClick={() => setShowWithdrawModal(false)}>
          <div className="withdraw-modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Withdraw Application</h3>
            <p>
              Are you sure you want to withdraw this application ({application.Name})? 
              This will recall any active approval process.
            </p>
            <textarea
              className="withdraw-textarea"
              rows="4"
              placeholder="Please provide the reason for withdrawal..."
              value={withdrawReason}
              onChange={(e) => setWithdrawReason(e.target.value)}
            />
            <div className="withdraw-actions">
              <button 
                className="btn-back-link" 
                onClick={() => setShowWithdrawModal(false)}
                disabled={isWithdrawing}
              >
                Cancel
              </button>
              <button 
                className="btn-withdraw-action" 
                onClick={handleWithdraw}
                disabled={isWithdrawing}
              >
                {isWithdrawing ? 'Withdrawing...' : 'Confirm Withdrawal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationDetails;
