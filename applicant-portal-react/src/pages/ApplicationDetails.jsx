import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import salesforceService from '../services/salesforceService';
import './ApplicationDetails.css';

const ApplicationDetails = () => {
  const { applicationId } = useParams();
  const navigate = useNavigate();

  // Primary Data State
  const [application, setApplication] = useState(null);
  const [files, setFiles] = useState([]);
  const [projectBudgets, setProjectBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active Tab: 'details' | 'files' | 'installments'
  const [activeTab, setActiveTab] = useState('details');

  // Installments & Milestones State
  const [installmentsData, setInstallmentsData] = useState({
    disbursements: [],
    installments: [],
    milestones: [],
    hasData: false
  });
  const [loadingInstallments, setLoadingInstallments] = useState(false);

  // Upload Utilization Certificate Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDisbursement, setSelectedDisbursement] = useState(null);
  const [certFile, setCertFile] = useState(null);
  const [certFileName, setCertFileName] = useState('');
  const [certBase64, setCertBase64] = useState('');
  const [certDescription, setCertDescription] = useState('');
  const [isSubmittingCert, setIsSubmittingCert] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState('');

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
      const [appData, filesData, budgetsData] = await Promise.all([
        salesforceService.getApplication(applicationId),
        salesforceService.getApplicationFiles(applicationId),
        salesforceService.getProjectBudgets ? salesforceService.getProjectBudgets(applicationId) : []
      ]);

      if (appData) {
        setApplication(appData);
        const bList = (budgetsData && budgetsData.length > 0)
          ? budgetsData
          : (appData.projectBudgets || appData.Project_Budgets__r?.records || []);
        setProjectBudgets(bList);
      } else {
        setError('Application record not found.');
      }

      setFiles(filesData || []);
      // Also fetch installments & milestones
      await fetchInstallmentsData();
    } catch (err) {
      console.error('Failed to load application details', err);
      setError('Unable to fetch application details from Salesforce.');
    } finally {
      setLoading(false);
    }
  };

  const fetchInstallmentsData = async () => {
    try {
      setLoadingInstallments(true);
      const data = await salesforceService.getInstallmentsAndDisbursements(applicationId);
      if (data) {
        setInstallmentsData({
          disbursements: data.disbursements || [],
          installments: data.installments || [],
          milestones: data.milestones || [],
          hasData: !!data.hasData
        });
      }
    } catch (err) {
      console.error('Failed to load installments data', err);
    } finally {
      setLoadingInstallments(false);
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit. Please select a smaller file.');
      return;
    }

    setCertFile(file);
    setCertFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      setCertBase64(base64);
    };
    reader.onerror = () => {
      alert('Failed to read file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleOpenUploadModal = (disb) => {
    setSelectedDisbursement(disb);
    setCertFile(null);
    setCertFileName('');
    setCertBase64('');
    setCertDescription('');
    setShowUploadModal(true);
  };

  const handleUploadUtilization = async () => {
    if (!selectedDisbursement) {
      alert('Please select a disbursement.');
      return;
    }
    if (!certBase64 || !certFileName) {
      alert('Please select a utilization certificate file to upload.');
      return;
    }

    try {
      setIsSubmittingCert(true);
      const res = await salesforceService.uploadUtilizationCertificate(
        applicationId,
        selectedDisbursement.Id,
        certFileName,
        certBase64,
        certDescription
      );

      setShowUploadModal(false);
      setCertFile(null);
      setCertFileName('');
      setCertBase64('');
      setCertDescription('');
      
      const milestoneNo = res?.name || 'Milestone';
      setUploadSuccessMsg(
        `Milestone "${milestoneNo}" created successfully with status "Pending"! Your utilization certificate has been submitted for review.`
      );

      // Refresh installments and milestones
      await fetchInstallmentsData();
    } catch (err) {
      console.error('Error uploading utilization certificate:', err);
      alert(err?.body?.message || err?.message || 'Failed to submit utilization certificate.');
    } finally {
      setIsSubmittingCert(false);
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

  const formatUserName = (userObj, fallbackName, defaultPlaceholder) => {
    if (fallbackName && !fallbackName.startsWith('User17')) {
      return fallbackName;
    }
    if (userObj?.Name && !userObj.Name.startsWith('User17')) {
      return userObj.Name;
    }
    if (fallbackName) return fallbackName;
    if (userObj?.Name) return userObj.Name;
    return defaultPlaceholder;
  };

  const isSubmittedOrReview = 
    application.Application_Status__c === 'Submitted' ||
    application.Application_Status__c === 'Under Review';

  const disbursementsList = installmentsData.disbursements || [];
  const milestonesList = installmentsData.milestones || [];
  const installmentsList = installmentsData.installments || [];

  const totalDisbursed = disbursementsList
    .filter(d => (d.Status__c || '').toLowerCase() === 'paid')
    .reduce((sum, d) => sum + (d.Total_Amount__c || 0), 0);

  const totalApproved = application.Approved_Amount__c || application.Requested_Amount__c || 0;

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

      {/* ================= MODERN TABS NAVIGATION ================= */}
      <div className="app-tabs-nav">
        <button 
          className={`app-tab-btn ${activeTab === 'details' ? 'active' : ''}`}
          onClick={() => setActiveTab('details')}
        >
          <span className="tab-icon">📋</span>
          <span>Application Details</span>
        </button>

        <button 
          className={`app-tab-btn ${activeTab === 'files' ? 'active' : ''}`}
          onClick={() => setActiveTab('files')}
        >
          <span className="tab-icon">📂</span>
          <span>Uploaded Files</span>
          <span className="tab-badge">{files.length}</span>
        </button>

        <button 
          className={`app-tab-btn ${activeTab === 'installments' ? 'active' : ''}`}
          onClick={() => setActiveTab('installments')}
        >
          <span className="tab-icon">💰</span>
          <span>Installments Received</span>
          {disbursementsList.length > 0 && (
            <span className="tab-badge highlight">{disbursementsList.length}</span>
          )}
        </button>
      </div>

      {/* ================= TAB 1: APPLICATION DETAILS ================= */}
      {activeTab === 'details' && (
        <div className="app-sections-grid">
          {/* 1. APPLICANT & PROJECT DETAILS */}
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

          {/* 1.1 PROJECT BUDGET BREAKDOWN */}
          <div className="section-card">
            <div className="section-header">
              <h2 className="section-title">
                Project Budget Breakdown
              </h2>
              {projectBudgets.length > 0 && (
                <span className="section-badge" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                  {projectBudgets.length} Line Item{projectBudgets.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="section-body">
              {projectBudgets && projectBudgets.length > 0 ? (
                <div className="budget-details-table-wrap">
                  <table className="budget-details-table">
                    <thead>
                      <tr>
                        <th style={{ width: '45px' }}>#</th>
                        <th style={{ width: '30%' }}>Expense Category</th>
                        <th>Description & Justification</th>
                        <th style={{ width: '22%', textAlign: 'right' }}>Estimated Amount ($)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectBudgets.map((pb, idx) => (
                        <tr key={pb.Id || idx}>
                          <td className="row-idx">{idx + 1}</td>
                          <td>
                            <div className="category-title">{pb.Expense_Category__c || 'Uncategorized'}</div>
                            {pb.Expense_Category__c === 'Other Direct Costs' && pb.Other_Category__c && (
                              <span className="other-spec-tag">
                                Specified: {pb.Other_Category__c}
                              </span>
                            )}
                          </td>
                          <td className="desc-cell">{pb.Description__c || '-'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: '#2563eb' }}>
                            ${(pb.Estimated_Amount__c != null ? Number(pb.Estimated_Amount__c) : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="budget-details-total-row">
                        <td colSpan="3" style={{ textAlign: 'right', fontWeight: 700 }}>
                          Total Estimated Budget:
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#1d4ed8', fontSize: '1.05rem' }}>
                          ${projectBudgets.reduce((sum, b) => sum + (Number(b.Estimated_Amount__c) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="empty-budget-notice">
                  <p style={{ margin: '0 0 0.5rem 0', color: '#64748b' }}>
                    No itemized project budget breakdown records found for this application.
                  </p>
                  {application.Budget_Details__c && (
                    <div className="general-budget-fallback">
                      <strong>General Budget Notes:</strong> {application.Budget_Details__c}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 2. REVIEWER SECTION */}
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
                  <span className="detail-value">
                    {formatUserName(application.Reviewer_Assigned__r, application.reviewerName, 'Pending Assignment')}
                  </span>
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

          {/* 3. PROGRAM OFFICER SECTION */}
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
                  <span className="detail-value">
                    {formatUserName(application.Program_Officer__r, application.programOfficerName, 'Assigned Officer')}
                  </span>
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

          {/* 4. FINANCE & DISBURSEMENT SECTION */}
          <div className="section-card">
            <div className="section-header">
              <h2 className="section-title">
                <span>💳</span> Finance & Allocation Overview
              </h2>
              <span className="section-badge" style={{ background: '#dcfce7', color: '#166534' }}>
                Filled by Financer
              </span>
            </div>
            <div className="section-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Financer Assigned</span>
                  <span className="detail-value">
                    {formatUserName(application.Financer__r, application.financerName, 'Finance Team')}
                  </span>
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
                  <span className="detail-label">Total Funding Request</span>
                  <span className="detail-value">{application.Total_Funding_Request__c ? `$${application.Total_Funding_Request__c.toLocaleString()}` : '-'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: FILES & DOCUMENTS ================= */}
      {activeTab === 'files' && (
        <div className="tab-pane-content">
          <div className="section-card">
            <div className="section-header">
              <h2 className="section-title">
                <span>📂</span> Uploaded Files & Official Documents
              </h2>
              <span className="section-badge">Attachments ({files.length})</span>
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
                  <div className="empty-files-box">
                    <span className="empty-files-icon">📁</span>
                    <h4>No Attached Files Found</h4>
                    <p>There are no uploaded supporting documents or files associated with this application.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: INSTALLMENTS RECEIVED ================= */}
      {activeTab === 'installments' && (
        <div className="tab-pane-content">
          {/* Success Banner if uploaded */}
          {uploadSuccessMsg && (
            <div className="alert-success-banner">
              <div className="alert-success-icon">✓</div>
              <div className="alert-success-text">{uploadSuccessMsg}</div>
              <button 
                className="alert-close-btn" 
                onClick={() => setUploadSuccessMsg('')}
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          )}

          {loadingInstallments ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
              Loading installment & disbursement records...
            </div>
          ) : !installmentsData.hasData && disbursementsList.length === 0 && installmentsList.length === 0 ? (
            /* ===== GENEROUS MESSAGE WHEN NOT GENERATED ===== */
            <div className="generous-empty-state">
              <div className="empty-state-visual">
                <span className="empty-bank-icon">🏦</span>
              </div>
              <h3 className="empty-state-title">No Installments Generated Yet</h3>
              <p className="empty-state-desc">
                No disbursements or installment schedules have been issued yet for this grant application. 
                Once your proposal completes review and approval, and funding milestones are configured by the 
                Grant Committee and Finance Department, your payment schedule and disbursed installments will appear right here.
              </p>

              <div className="empty-guidance-grid">
                <div className="guidance-card">
                  <div className="guidance-badge">Step 1</div>
                  <h4>Committee Review</h4>
                  <p>Your application is assessed for technical feasibility, budget accuracy, and project alignment.</p>
                </div>
                <div className="guidance-card">
                  <div className="guidance-badge">Step 2</div>
                  <h4>Award & Allocation</h4>
                  <p>Finance team schedules installments according to defined project deliverables and grant timelines.</p>
                </div>
                <div className="guidance-card">
                  <div className="guidance-badge">Step 3</div>
                  <h4>Disbursement & Milestones</h4>
                  <p>Received funds appear here with an easy upload button for your Utilization Certificates.</p>
                </div>
              </div>

              <div className="empty-state-footer">
                <span className="status-indicator">
                  Current Application Status: <strong>{application.Application_Status__c || 'In Review'}</strong>
                </span>
                <p className="help-text">Have questions regarding funding? Please consult your assigned Program Officer.</p>
              </div>
            </div>
          ) : (
            /* ===== INSTALLMENTS & DISBURSEMENTS EXIST ===== */
            <div className="installments-container">
              {/* Summary KPIs */}
              <div className="installments-kpi-grid">
                <div className="kpi-card">
                  <span className="kpi-label">Approved Grant Amount</span>
                  <span className="kpi-val highlight">${totalApproved.toLocaleString()}</span>
                  <span className="kpi-sub">Total Grant Allocation</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Total Disbursed Funds</span>
                  <span className="kpi-val success">${totalDisbursed.toLocaleString()}</span>
                  <span className="kpi-sub">Paid out to applicant account</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Disbursements Issued</span>
                  <span className="kpi-val">{disbursementsList.length}</span>
                  <span className="kpi-sub">Processed payment records</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Milestones Tracked</span>
                  <span className="kpi-val warning">{milestonesList.length}</span>
                  <span className="kpi-sub">Fund Utilization records</span>
                </div>
              </div>

              {/* 1. DISBURSEMENTS LIST */}
              <div className="section-card" style={{ marginBottom: '2rem' }}>
                <div className="section-header">
                  <div>
                    <h2 className="section-title">
                      <span>💳</span> Received Installments & Disbursements
                    </h2>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                      Track disbursed grant payments and submit your Fund Utilization Certificate for each received installment.
                    </p>
                  </div>
                  <span className="section-badge" style={{ background: '#dbeafe', color: '#1e40af' }}>
                    {disbursementsList.length} Records
                  </span>
                </div>

                <div className="section-body" style={{ padding: '0' }}>
                  {disbursementsList.length > 0 ? (
                    <div className="table-responsive">
                      <table className="custom-app-table">
                        <thead>
                          <tr>
                            <th>Disbursement Ref</th>
                            <th>Installment</th>
                            <th>Disbursed Date</th>
                            <th>Amount</th>
                            <th>Payment Method</th>
                            <th>Disbursement Status</th>
                            <th style={{ textAlign: 'right' }}>Utilization Proof (Milestone)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {disbursementsList.map((disb) => {
                            const isPaid = (disb.Status__c || '').toLowerCase() === 'paid';
                            // Check if a milestone is already linked to this disbursement
                            const existingMilestone = milestonesList.find(m => m.disbursementId === disb.Id);

                            return (
                              <tr key={disb.Id}>
                                <td className="bold-cell">
                                  <span className="disb-tag">{disb.Name}</span>
                                </td>
                                <td>{disb.Installment__r?.Name || 'Scheduled Installment'}</td>
                                <td>{disb.Disbursement_Date__c ? new Date(disb.Disbursement_Date__c).toLocaleDateString() : '-'}</td>
                                <td className="amount-cell">
                                  ${(disb.Total_Amount__c || 0).toLocaleString()}
                                </td>
                                <td>{disb.Payment_Type__c || 'Direct Transfer'}</td>
                                <td>
                                  <span className={`disb-status-pill ${(disb.Status__c || 'pending').toLowerCase()}`}>
                                    ● {disb.Status__c || 'Pending'}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  {isPaid ? (
                                    existingMilestone ? (
                                      <div className="milestone-status-inline">
                                        <span className={`ms-pill ${(existingMilestone.status || 'pending').toLowerCase()}`}>
                                          {existingMilestone.name}: {existingMilestone.status}
                                        </span>
                                        <button 
                                          className="btn-upload-cert secondary"
                                          onClick={() => handleOpenUploadModal(disb)}
                                          title="Upload additional milestone documentation"
                                        >
                                          + Add Proof
                                        </button>
                                      </div>
                                    ) : (
                                      <button 
                                        className="btn-upload-cert glow"
                                        onClick={() => handleOpenUploadModal(disb)}
                                      >
                                        📤 Upload Utilization Certificate
                                      </button>
                                    )
                                  ) : (
                                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                      Awaiting Fund Release
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                      No direct disbursement transactions recorded yet.
                    </div>
                  )}
                </div>
              </div>

              {/* 2. SUBMITTED MILESTONES (FUND UTILIZATION RECORDS) */}
              <div className="section-card">
                <div className="section-header">
                  <div>
                    <h2 className="section-title">
                      <span>🎯</span> Project Milestones & Fund Utilization Certificates
                    </h2>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                      Verified expenditure records created from your uploaded certificates. Status is set to "Pending" upon submission.
                    </p>
                  </div>
                  <span className="section-badge" style={{ background: '#fef3c7', color: '#92400e' }}>
                    {milestonesList.length} Milestones
                  </span>
                </div>

                <div className="section-body">
                  {milestonesList.length > 0 ? (
                    <div className="milestone-cards-grid">
                      {milestonesList.map((m) => (
                        <div key={m.id} className="milestone-card">
                          <div className="milestone-card-top">
                            <div>
                              <span className="milestone-badge-code">{m.name}</span>
                              <h4 className="milestone-title">Fund Utilization Milestone</h4>
                              <p className="milestone-sub">
                                Linked Disbursement: <strong>{m.disbursementName || 'General Disbursement'}</strong>
                              </p>
                            </div>
                            <span className={`milestone-status-badge ${(m.status || 'pending').toLowerCase()}`}>
                              ● {m.status || 'Pending'}
                            </span>
                          </div>

                          <div className="milestone-card-meta">
                            <div className="meta-col">
                              <span className="meta-lbl">Submitted On</span>
                              <span className="meta-val">
                                {m.createdDate ? new Date(m.createdDate).toLocaleDateString() : '-'}
                              </span>
                            </div>
                            <div className="meta-col">
                              <span className="meta-lbl">Disbursement Amount</span>
                              <span className="meta-val highlight">
                                ${((m.disbursementAmount) || 0).toLocaleString()}
                              </span>
                            </div>
                          </div>

                          {/* Files linked to Milestone */}
                          <div className="milestone-files-box">
                            <span className="files-box-title">Attached Utilization Certificate:</span>
                            {m.files && m.files.length > 0 ? (
                              <div className="ms-files-list">
                                {m.files.map(f => (
                                  <div key={f.documentId} className="ms-file-chip">
                                    <span className="ms-file-icon">📄</span>
                                    <span className="ms-file-name" title={f.title}>{f.title}</span>
                                    <a 
                                      href={getDownloadUrl(f)} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      className="ms-file-dl"
                                    >
                                      Download
                                    </a>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="no-file-text">Document attached directly to Milestone record.</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-milestones-notice">
                      <span className="notice-icon">📋</span>
                      <div>
                        <h4>No Milestones Submitted Yet</h4>
                        <p>
                          When funds for an installment are disbursed, click 
                          <strong> "Upload Utilization Certificate"</strong> above to submit documentation 
                          of where and how the grant funds were spent. A Milestone will be generated automatically.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= UPLOAD UTILIZATION CERTIFICATE MODAL ================= */}
      {showUploadModal && selectedDisbursement && (
        <div className="upload-modal-overlay" onClick={() => !isSubmittingCert && setShowUploadModal(false)}>
          <div className="upload-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="upload-modal-header">
              <div>
                <h3>Upload Utilization Certificate</h3>
                <p>Submit proof showing where and how the disbursed grant funds were utilized.</p>
              </div>
              <button 
                className="modal-close-icon"
                onClick={() => !isSubmittingCert && setShowUploadModal(false)}
                disabled={isSubmittingCert}
              >
                ✕
              </button>
            </div>

            <div className="upload-modal-body">
              {/* Linked Disbursement Info Box */}
              <div className="disb-summary-box">
                <div className="disb-summary-item">
                  <span className="ds-lbl">Disbursement Ref</span>
                  <span className="ds-val">{selectedDisbursement.Name}</span>
                </div>
                <div className="disb-summary-item">
                  <span className="ds-lbl">Installment</span>
                  <span className="ds-val">{selectedDisbursement.Installment__r?.Name || 'Scheduled Payment'}</span>
                </div>
                <div className="disb-summary-item">
                  <span className="ds-lbl">Disbursed Amount</span>
                  <span className="ds-val highlight">${(selectedDisbursement.Total_Amount__c || 0).toLocaleString()}</span>
                </div>
              </div>

              {/* Fund Utilization Description */}
              <div className="form-group">
                <label className="form-label">
                  Fund Utilization Summary / Remarks <span className="optional-tag">(Optional)</span>
                </label>
                <textarea
                  className="form-textarea"
                  rows="3"
                  placeholder="Summarize how the funds were spent (e.g., Procurement of lab supplies, personnel stipends, event venue fees)..."
                  value={certDescription}
                  onChange={(e) => setCertDescription(e.target.value)}
                  disabled={isSubmittingCert}
                />
              </div>

              {/* File Upload Box */}
              <div className="form-group">
                <label className="form-label">
                  Utilization Certificate / Proof Document <span className="req-star">*</span>
                </label>
                <div className="file-dropzone">
                  <input 
                    type="file" 
                    id="utilizationCertInput"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                    onChange={handleFileChange}
                    disabled={isSubmittingCert}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="utilizationCertInput" className="dropzone-label">
                    <span className="dropzone-icon">📁</span>
                    {certFileName ? (
                      <div className="selected-file-info">
                        <strong className="file-name-text">{certFileName}</strong>
                        <span className="file-size-text">
                          {(certFile?.size / 1024).toFixed(1)} KB — Click to change file
                        </span>
                      </div>
                    ) : (
                      <div className="dropzone-prompt">
                        <strong>Click to select Utilization Certificate</strong>
                        <span>Supports PDF, Word (DOCX), or image formats (up to 5MB)</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Explanation Note */}
              <div className="modal-info-alert">
                <span className="alert-bulb">💡</span>
                <p>
                  Upon uploading, a <strong>Milestone record</strong> will be created in Salesforce with status 
                  set to <strong>"Pending"</strong> for administrator and reviewer verification.
                </p>
              </div>
            </div>

            <div className="upload-modal-actions">
              <button 
                type="button"
                className="btn-secondary" 
                onClick={() => setShowUploadModal(false)}
                disabled={isSubmittingCert}
              >
                Cancel
              </button>
              <button 
                type="button"
                className="btn-primary" 
                onClick={handleUploadUtilization}
                disabled={isSubmittingCert || !certBase64}
              >
                {isSubmittingCert ? 'Uploading & Creating Milestone...' : 'Upload & Create Milestone'}
              </button>
            </div>
          </div>
        </div>
      )}

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
