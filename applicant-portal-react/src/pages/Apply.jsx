import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import salesforceService from '../services/salesforceService';
import './Apply.css';

const EXPENSE_CATEGORIES = [
  'Personnel & Staffing',
  'Equipment & Infrastructure',
  'Materials & Supplies',
  'Travel & Fieldwork',
  'Training & Workshops',
  'Consultancy & Subcontracting',
  'Administrative & Overheads',
  'Other Direct Costs'
];

const Apply = () => {
  const { programId } = useParams();
  const [searchParams] = useSearchParams();
  const urlAppId = searchParams.get('appId');
  const navigate = useNavigate();
  const { isLoggedIn, profileStatus, refreshProfileStatus } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [programInfo, setProgramInfo] = useState(null);
  const [applicantInfo, setApplicantInfo] = useState(null);
  const [applicationId, setApplicationId] = useState(urlAppId || null);
  const [formErrors, setFormErrors] = useState({});
  const [toast, setToast] = useState(null);
  
  const [programDocuments, setProgramDocuments] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState({}); // { documentId: { versionId, title, ... } }
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Project Budget Line Items
  const [budgetItems, setBudgetItems] = useState([
    {
      id: 'budget-init-1',
      Expense_Category__c: '',
      Other_Category__c: '',
      Description__c: '',
      Estimated_Amount__c: ''
    }
  ]);

  const [formData, setFormData] = useState({
    projectTitle: '',
    requestedAmount: '',
    projectDescription: '',
    budgetDetails: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    taxId: '',
    startDate: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [progData, appInfo] = await Promise.all([
          salesforceService.getProgramById(programId),
          salesforceService.getApplicantInfo ? salesforceService.getApplicantInfo() : null
        ]);
        
        if (progData && progData.program) {
          setProgramInfo(progData.program);
        }
        
        const docs = await salesforceService.getProgramDocuments(programId);
        if (docs) {
          setProgramDocuments(docs);
        }
        
        if (appInfo) {
          setApplicantInfo(appInfo);
        } else {
          setApplicantInfo({ Name: salesforceService.userName || 'Salesforce - CSM' });
        }

        // If resuming a draft, load existing application fields & files
        if (urlAppId) {
          const existingApp = await salesforceService.getApplication(urlAppId);
          if (existingApp) {
            setFormData({
              projectTitle: existingApp.Project_Title__c || '',
              requestedAmount: existingApp.Requested_Amount__c ? String(existingApp.Requested_Amount__c) : '',
              projectDescription: existingApp.Project_Description__c || '',
              budgetDetails: existingApp.Budget_Details__c || '',
              bankName: existingApp.Bank_Name_applicant__c || '',
              accountNumber: existingApp.Bank_Account_Number_applicant__c || '',
              ifscCode: existingApp.IFSC_SWIFT_Code_applicant__c || '',
              taxId: existingApp.Tax_ID_applicant__c || '',
              startDate: existingApp.Start_Date__c || ''
            });
            await fetchApplicationFiles(urlAppId);

            // Fetch and populate project budget breakdown
            try {
              const existingBudgets = existingApp.projectBudgets || await salesforceService.getProjectBudgets(urlAppId);
              if (existingBudgets && existingBudgets.length > 0) {
                setBudgetItems(existingBudgets.map((b, idx) => ({
                  id: b.Id || `budget-${idx}`,
                  Id: b.Id || null,
                  Expense_Category__c: b.Expense_Category__c || '',
                  Other_Category__c: b.Other_Category__c || '',
                  Description__c: b.Description__c || '',
                  Estimated_Amount__c: b.Estimated_Amount__c != null ? String(b.Estimated_Amount__c) : ''
                })));
              }
            } catch (bErr) {
              console.error('Failed to load project budgets:', bErr);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load application data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [programId, urlAppId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user types (kept for compatibility if needed later)
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: false }));
    }
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const mapFormDataToSalesforce = () => {
    // Requested Amount is automatically calculated from the budget items sum
    const calculatedRequestedAmount = totalBudgetAmount > 0 
      ? totalBudgetAmount 
      : (formData.requestedAmount ? parseFloat(formData.requestedAmount) : null);

    return {
      sobjectType: 'Grant_Applicant__c',
      Id: applicationId || null,
      Program__c: programId,
      Applicant_Name__c: applicantInfo?.Name || 'Salesforce - CSM',
      Project_Title__c: formData.projectTitle,
      Requested_Amount__c: calculatedRequestedAmount,
      Project_Description__c: formData.projectDescription,
      Budget_Details__c: formData.budgetDetails,
      Bank_Name_applicant__c: formData.bankName,
      Bank_Account_Number_applicant__c: formData.accountNumber,
      IFSC_SWIFT_Code_applicant__c: formData.ifscCode,
      Tax_ID_applicant__c: formData.taxId,
      Start_Date__c: formData.startDate || null,
    };
  };

  const extractErrorMessage = (err) => {
    if (!err) return 'An error occurred while saving to Salesforce.';
    if (err?.body?.message) return err.body.message;
    if (Array.isArray(err?.body?.pageErrors) && err.body.pageErrors.length > 0) {
      return err.body.pageErrors.map(e => e.message).join(' | ');
    }
    if (err?.body?.fieldErrors && typeof err.body.fieldErrors === 'object') {
      const fieldMsgs = [];
      Object.keys(err.body.fieldErrors).forEach(field => {
        const errors = err.body.fieldErrors[field];
        if (Array.isArray(errors)) {
          errors.forEach(e => fieldMsgs.push(e.message));
        }
      });
      if (fieldMsgs.length > 0) return fieldMsgs.join(' | ');
    }
    if (err?.message) return err.message;
    if (typeof err === 'string') return err;
    return 'Validation failed in Salesforce. Please check required fields.';
  };

  // Budget row actions
  const handleAddBudgetRow = () => {
    setBudgetItems(prev => [
      ...prev,
      {
        id: `budget-${Date.now()}-${Math.random()}`,
        Expense_Category__c: '',
        Other_Category__c: '',
        Description__c: '',
        Estimated_Amount__c: ''
      }
    ]);
  };

  const handleRemoveBudgetRow = (index) => {
    setBudgetItems(prev => {
      if (prev.length <= 1) {
        return [{
          id: `budget-${Date.now()}`,
          Expense_Category__c: '',
          Other_Category__c: '',
          Description__c: '',
          Estimated_Amount__c: ''
        }];
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleBudgetFieldChange = (index, field, value) => {
    setBudgetItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (field === 'Expense_Category__c' && value !== 'Other Direct Costs') {
        next[index].Other_Category__c = '';
      }
      return next;
    });
  };

  const totalBudgetAmount = budgetItems.reduce((sum, item) => {
    const val = parseFloat(item.Estimated_Amount__c);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const saveCurrentBudgets = async (appId) => {
    try {
      const validBudgets = budgetItems
        .filter(b => b.Expense_Category__c || b.Estimated_Amount__c || b.Description__c)
        .map(b => ({
          Id: b.Id && !String(b.Id).startsWith('budget-') ? b.Id : null,
          Expense_Category__c: b.Expense_Category__c || null,
          Other_Category__c: b.Expense_Category__c === 'Other Direct Costs' ? (b.Other_Category__c || null) : null,
          Description__c: b.Description__c || null,
          Estimated_Amount__c: b.Estimated_Amount__c ? parseFloat(b.Estimated_Amount__c) : 0
        }));

      if (validBudgets.length > 0) {
        const saved = await salesforceService.saveProjectBudgets(appId, validBudgets);
        if (saved && saved.length > 0) {
          setBudgetItems(saved.map((b, idx) => ({
            id: b.Id || `budget-${idx}`,
            Id: b.Id || null,
            Expense_Category__c: b.Expense_Category__c || '',
            Other_Category__c: b.Other_Category__c || '',
            Description__c: b.Description__c || '',
            Estimated_Amount__c: b.Estimated_Amount__c != null ? String(b.Estimated_Amount__c) : ''
          })));
        }
      }
    } catch (bErr) {
      console.error('Error saving budget items:', bErr);
    }
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      try {
        const appRecord = mapFormDataToSalesforce();
        const newId = await salesforceService.saveApplication(appRecord);
        if (!newId) {
          showToast('error', 'Unable to proceed: Salesforce did not create or save the record.');
          return;
        }
        setApplicationId(newId);
        await saveCurrentBudgets(newId);
        setCurrentStep(2);
      } catch (err) {
        console.error('Salesforce validation error:', err);
        showToast('error', extractErrorMessage(err));
      }
    } else if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSaveDraft = async () => {
    try {
      const appRecord = mapFormDataToSalesforce();
      const newId = await salesforceService.saveApplication(appRecord);
      if (newId) {
        setApplicationId(newId);
        await saveCurrentBudgets(newId);
        showToast('success', 'Draft and budget items saved successfully!');
      } else {
        showToast('error', 'Salesforce did not return a valid record ID for draft.');
      }
    } catch (err) {
      console.error('Salesforce draft save error:', err);
      showToast('error', extractErrorMessage(err));
    }
  };

  const handleSubmitApplication = async () => {
    if (!consentGiven) {
      showToast('error', 'Please check the consent checkbox before submitting.');
      return;
    }
    if (!applicationId) {
      showToast('error', 'Application record not found. Please complete Step 1 first.');
      return;
    }

    try {
      setIsSubmitting(true);
      await salesforceService.submitApplication(applicationId);
      showToast('success', 'Application submitted successfully to Salesforce!');
      setTimeout(() => {
        navigate('/my-applications');
      }, 1500);
    } catch (err) {
      console.error('Submission error:', err);
      showToast('error', extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchApplicationFiles = async (appId) => {
    try {
      const files = await salesforceService.getApplicationFiles(appId);
      if (files) {
        const fileMap = {};
        // Map files by their title to match required documents, or by documentId
        // Wait, how do we match uploaded file to program document requirement?
        // We can match by title if we name the file after the document requirement name
        files.forEach(f => {
          fileMap[f.title] = f;
        });
        setUploadedFiles(fileMap);
      }
    } catch (err) {
      console.error("Error fetching files:", err);
    }
  };

  const handleFileUpload = async (e, docName) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!applicationId) {
      showToast('error', 'Please complete Step 1 and save draft before uploading documents.');
      return;
    }

    setUploadingDoc(docName);
    
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result.split(',')[1];
        // Name the file exactly as the required document name to map it
        await salesforceService.uploadFile(docName, base64, applicationId);
        await fetchApplicationFiles(applicationId);
        showToast('success', `${docName} uploaded successfully!`);
      } catch (err) {
        showToast('error', `Failed to upload ${docName}.`);
        console.error(err);
      } finally {
        setUploadingDoc(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteFile = async (docName, documentId) => {
    try {
      await salesforceService.deleteFile(documentId);
      const newFiles = { ...uploadedFiles };
      delete newFiles[docName];
      setUploadedFiles(newFiles);
      showToast('success', `${docName} deleted successfully!`);
    } catch (err) {
      showToast('error', `Failed to delete ${docName}.`);
      console.error(err);
    }
  };

  if (loading) {
    return <div className="apply-loading">Loading application form...</div>;
  }

  // Profile Verification Security Gate
  if (!loading && (!profileStatus || profileStatus === 'NO_PROFILE' || profileStatus !== 'Approved')) {
    return (
      <div className="apply-page">
        <div className="apply-locked-container">
          <div className="apply-locked-card">
            <div className="apply-locked-icon-wrap">🔒</div>
            <h2 className="apply-locked-title">
              {!profileStatus || profileStatus === 'NO_PROFILE' 
                ? 'Profile Setup Required' 
                : 'Profile Verification Required'}
            </h2>
            <p className="apply-locked-desc">
              {!profileStatus || profileStatus === 'NO_PROFILE'
                ? 'You must set up and submit your organizational profile before applying for this grant program.'
                : `Your profile is currently in "${profileStatus}" status. Grant applications remain locked until your profile is verified and approved by the grant committee.`}
            </p>
            <div className="apply-locked-actions">
              <button 
                type="button" 
                onClick={() => navigate('/profile')} 
                className="btn-locked-go-profile"
              >
                {!profileStatus || profileStatus === 'NO_PROFILE' ? 'Set Up Profile Now' : 'Check Profile Status'}
              </button>
              <button 
                type="button" 
                onClick={() => navigate(`/program/${programId}`)} 
                className="btn-locked-back-program"
              >
                Back to Program Details
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="apply-page">
      <div className="apply-hero">
        <h1>Grant Application</h1>
        <p>Complete the steps below to submit your application</p>
      </div>

      <div className="stepper-container">
        <div className="stepper">
          <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>
            <div className="step-circle">1</div>
            <div className="step-label">Project Details</div>
          </div>
          <div className={`step-line ${currentStep >= 2 ? 'active' : ''}`}></div>
          
          <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>
            <div className="step-circle">2</div>
            <div className="step-label">Documents</div>
          </div>
          <div className={`step-line ${currentStep >= 3 ? 'active' : ''}`}></div>
          
          <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>
            <div className="step-circle">3</div>
            <div className="step-label">Review & Submit</div>
          </div>
        </div>
      </div>

      <div className="apply-form-container">
        {currentStep === 1 && (
          <div className="form-card">
            <h2 className="form-section-title">Applicant & Project Details</h2>
            
            <div className="form-row">
              <div className="form-group">
                <label>Applicant Name</label>
                <input 
                  type="text" 
                  value={applicantInfo?.Name || ''} 
                  disabled 
                  className="input-disabled"
                />
              </div>
              <div className="form-group">
                <label>Program</label>
                <input 
                  type="text" 
                  value={programInfo?.Name || ''} 
                  disabled 
                  className="input-disabled"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Project Title <span className="required">*</span></label>
                <input 
                  type="text" 
                  name="projectTitle"
                  value={formData.projectTitle}
                  onChange={handleInputChange}
                  placeholder="Enter your project title" 
                  className={formErrors.projectTitle ? 'input-error' : ''}
                />
              </div>
              <div className="form-group">
                <label>Project Start Date</label>
                <input 
                  type="date" 
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Project Description <span className="required">*</span></label>
              <textarea 
                name="projectDescription"
                value={formData.projectDescription}
                onChange={handleInputChange}
                placeholder="Describe your project objectives and expected impact..."
                rows="4"
                className={formErrors.projectDescription ? 'input-error' : ''}
              ></textarea>
            </div>

            {/* Dynamic Project Budget Breakdown Section */}
            <div className="budget-section-card">
              <div className="budget-section-header">
                <div>
                  <h3 className="budget-section-title">
                    Project Budget Breakdown
                  </h3>
                  <p className="budget-section-subtitle">
                    Add estimated line items. Click <strong>+ Add Line Item</strong> to add more expense items.
                  </p>
                </div>
                <button 
                  type="button" 
                  className="btn-add-budget-row"
                  onClick={handleAddBudgetRow}
                >
                  <span className="plus-symbol">+</span> Add Line Item
                </button>
              </div>

              <div className="budget-items-list">
                {budgetItems.map((item, index) => {
                  const isOther = item.Expense_Category__c === 'Other Direct Costs';
                  return (
                    <div key={item.id || index} className="budget-item-card">
                      <div className="budget-item-header">
                        <span className="budget-item-num">Item #{index + 1}</span>
                        <button
                          type="button"
                          className="btn-remove-row"
                          onClick={() => handleRemoveBudgetRow(index)}
                          title="Remove item"
                        >
                          ✕ Remove
                        </button>
                      </div>

                      <div className="budget-item-grid">
                        <div className="form-group mb-0">
                          <label>Expense Category <span className="required">*</span></label>
                          <select
                            value={item.Expense_Category__c}
                            onChange={(e) => handleBudgetFieldChange(index, 'Expense_Category__c', e.target.value)}
                            className="budget-select-input"
                          >
                            <option value="">-- Select Expense Category --</option>
                            {EXPENSE_CATEGORIES.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group mb-0">
                          <label>Estimated Amount ($) <span className="required">*</span></label>
                          <div className="budget-currency-wrapper">
                            <span className="budget-currency-prefix">$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.Estimated_Amount__c}
                              onChange={(e) => handleBudgetFieldChange(index, 'Estimated_Amount__c', e.target.value)}
                              placeholder="0.00"
                              className="budget-amount-input"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Dynamic textbox if 'Other Direct Costs' is selected */}
                      {isOther && (
                        <div className="other-category-field animate-fade-in">
                          <label>
                            Specify Other Category <span className="required">*</span>
                          </label>
                          <input
                            type="text"
                            value={item.Other_Category__c || ''}
                            onChange={(e) => handleBudgetFieldChange(index, 'Other_Category__c', e.target.value)}
                            placeholder="e.g. Audit Fees, IP Protection, Environmental Clearance..."
                            className="other-category-textbox"
                          />
                        </div>
                      )}

                      <div className="form-group mb-0 mt-2">
                        <label>Description & Justification</label>
                        <textarea
                          rows="2"
                          value={item.Description__c}
                          onChange={(e) => handleBudgetFieldChange(index, 'Description__c', e.target.value)}
                          placeholder="Provide details on how this amount will be utilized..."
                          className="budget-desc-textarea"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Budget Total Bar */}
              <div className="budget-total-bar">
                <div className="budget-total-info">
                  <span className="budget-total-label">Total Estimated Budget:</span>
                  <span className="budget-total-figure">
                    ${totalBudgetAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            <div className="sub-section">
              <h3 className="sub-section-title">BANK INFORMATION</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Bank Name</label>
                  <input 
                    type="text" 
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleInputChange}
                    placeholder="Name of your bank" 
                  />
                </div>
                <div className="form-group">
                  <label>Account Number</label>
                  <input 
                    type="text" 
                    name="accountNumber"
                    value={formData.accountNumber}
                    onChange={handleInputChange}
                    placeholder="Bank account number" 
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>IFSC / SWIFT Code</label>
                  <input 
                    type="text" 
                    name="ifscCode"
                    value={formData.ifscCode}
                    onChange={handleInputChange}
                    placeholder="IFSC or SWIFT code" 
                  />
                </div>
                <div className="form-group">
                  <label>Tax ID</label>
                  <input 
                    type="text" 
                    name="taxId"
                    value={formData.taxId}
                    onChange={handleInputChange}
                    placeholder="Tax identification number" 
                  />
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button className="btn-save-draft" onClick={handleSaveDraft}>
                Save Draft
              </button>
              <button className="btn-next" onClick={handleNext}>
                Next →
              </button>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="form-card">
            <h2 className="form-section-title">Documents</h2>
            <p className="docs-subtitle">Please upload the required documents for your application.</p>
            
            <div className="documents-list">
              {programDocuments && programDocuments.length > 0 ? (
                programDocuments.map((doc, idx) => {
                  const uploaded = uploadedFiles[doc.Name];
                  const isUploading = uploadingDoc === doc.Name;

                  return (
                    <div key={idx} className="document-upload-row">
                      <div className="doc-info">
                        <h4>{doc.Name}</h4>
                        {doc.Description__c && <p>{doc.Description__c}</p>}
                        {doc.Is_Required__c && <span className="doc-required-badge">Required</span>}
                      </div>
                      
                      <div className="doc-action">
                        {isUploading ? (
                          <div className="doc-uploading">Uploading...</div>
                        ) : uploaded ? (
                          <div className="doc-uploaded">
                            <span className="doc-filename">✓ Uploaded</span>
                            <button 
                              className="btn-doc-delete"
                              onClick={() => handleDeleteFile(doc.Name, uploaded.documentId)}
                              title="Delete file"
                            >
                              ✕ Remove
                            </button>
                          </div>
                        ) : (
                          <label className="btn-doc-upload">
                            ↑ Upload
                            <input 
                              type="file" 
                              onChange={(e) => handleFileUpload(e, doc.Name)} 
                              style={{ display: 'none' }}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="no-docs-message">
                  No specific documents required for this program.
                </div>
              )}
            </div>
            
            <div className="form-actions">
              <button className="btn-save-draft" onClick={() => setCurrentStep(1)}>
                ← Back
              </button>
              <button className="btn-next" onClick={handleNext}>
                Next →
              </button>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="form-card">
            <h2 className="form-section-title">Review & Submit</h2>
            <p style={{ color: '#64748b', marginTop: '-1rem', marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
              Please review all the details and uploaded documents carefully before submitting your grant application.
            </p>

            <div className="review-container">
              {/* Project & Applicant Summary */}
              <div className="review-card">
                <h3 className="review-card-title">
                  Project & Applicant Details
                </h3>
                <div className="review-grid">
                  <div className="review-item">
                    <span className="review-label">Applicant Name</span>
                    <span className="review-value">{applicantInfo?.Name || 'Salesforce - CSM'}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Target Program</span>
                    <span className="review-value">{programInfo?.Name || 'General Grant'}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Project Title</span>
                    <span className="review-value">{formData.projectTitle || '-'}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Total Requested Amount</span>
                    <span className="review-value" style={{ color: '#2563eb' }}>
                      ${(totalBudgetAmount > 0 ? totalBudgetAmount : (parseFloat(formData.requestedAmount) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Project Start Date</span>
                    <span className="review-value">{formData.startDate || '-'}</span>
                  </div>
                  
                  {formData.projectDescription && (
                    <div className="review-desc-item">
                      <span className="review-label">Project Description</span>
                      <div className="review-desc-box">{formData.projectDescription}</div>
                    </div>
                  )}

                  {formData.budgetDetails && (
                    <div className="review-desc-item">
                      <span className="review-label">General Budget Notes</span>
                      <div className="review-desc-box">{formData.budgetDetails}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Project Budget Breakdown Summary Card */}
              <div className="review-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                  <h3 className="review-card-title" style={{ margin: 0, border: 'none', padding: 0 }}>
                    Project Budget Breakdown
                  </h3>
                  <span className="review-budget-total-badge">
                    Total: ${totalBudgetAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {budgetItems.filter(b => b.Expense_Category__c || b.Estimated_Amount__c).length > 0 ? (
                  <div className="review-budget-table-wrap">
                    <table className="review-budget-table">
                      <thead>
                        <tr>
                          <th>Expense Category</th>
                          <th>Description</th>
                          <th style={{ textAlign: 'right' }}>Amount ($)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {budgetItems
                          .filter(b => b.Expense_Category__c || b.Estimated_Amount__c)
                          .map((item, bIdx) => (
                            <tr key={bIdx}>
                              <td>
                                <strong style={{ color: '#1e293b' }}>
                                  {item.Expense_Category__c || 'Uncategorized'}
                                </strong>
                                {item.Expense_Category__c === 'Other Direct Costs' && item.Other_Category__c && (
                                  <div className="review-other-pill">
                                    Specified: <em>{item.Other_Category__c}</em>
                                  </div>
                                )}
                              </td>
                              <td style={{ color: '#475569', fontSize: '0.875rem' }}>
                                {item.Description__c || '-'}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 600, color: '#2563eb' }}>
                                ${parseFloat(item.Estimated_Amount__c || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>
                    No specific budget line items provided.
                  </p>
                )}
              </div>

              {/* Bank Information Summary */}
              <div className="review-card">
                <h3 className="review-card-title">
                  Bank Information
                </h3>
                <div className="review-grid">
                  <div className="review-item">
                    <span className="review-label">Bank Name</span>
                    <span className="review-value">{formData.bankName || '-'}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Account Number</span>
                    <span className="review-value">{formData.accountNumber || '-'}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">IFSC / SWIFT Code</span>
                    <span className="review-value">{formData.ifscCode || '-'}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Tax ID</span>
                    <span className="review-value">{formData.taxId || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Uploaded Documents Summary */}
              <div className="review-card">
                <h3 className="review-card-title">
                  Uploaded Documents
                </h3>
                <div className="review-docs-list">
                  {programDocuments && programDocuments.length > 0 ? (
                    programDocuments.map((doc) => {
                      const docName = doc.Name || doc.Document_Name__c || 'Document';
                      const isUploaded = !!uploadedFiles[docName];
                      return (
                        <div key={doc.Id || docName} className="review-doc-item">
                          <span className="review-doc-name">
                            {docName}
                          </span>
                          <span className={`review-doc-status ${isUploaded ? 'uploaded' : 'missing'}`}>
                            {isUploaded ? '✓ Uploaded' : 'Not Uploaded'}
                          </span>
                        </div>
                      );
                    })
                  ) : Object.keys(uploadedFiles).length > 0 ? (
                    Object.keys(uploadedFiles).map((docName) => (
                      <div key={docName} className="review-doc-item">
                        <span className="review-doc-name">
                          <span>📄</span> {docName}
                        </span>
                        <span className="review-doc-status uploaded">
                          ✓ Uploaded
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="review-desc-box" style={{ color: '#64748b' }}>
                      No documents have been uploaded.
                    </div>
                  )}
                </div>
              </div>

              {/* Consent Checkbox */}
              <div className="consent-container">
                <label className="consent-label">
                  <input
                    type="checkbox"
                    className="consent-checkbox"
                    checked={consentGiven}
                    onChange={(e) => setConsentGiven(e.target.checked)}
                  />
                  <div className="consent-text">
                    I hereby declare and certify that all details provided in this application and all attached documents are true, complete, and accurate.
                    <span className="consent-subtext">
                      By checking this box, I confirm authorization to submit this grant application for formal review and approval.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="form-actions">
              <button className="btn-save-draft" onClick={() => setCurrentStep(2)}>
                ← Back
              </button>
              <button 
                className="btn-submit"
                disabled={!consentGiven || isSubmitting}
                onClick={handleSubmitApplication}
              >
                {isSubmitting ? 'Submitting Application...' : 'Submit Application'}
              </button>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="hot-toast-container">
          <div className={`hot-toast ${toast.type}`}>
            {toast.type === 'error' ? (
              <div className="hot-toast-icon error-icon">✕</div>
            ) : (
              <div className="hot-toast-icon success-icon">✓</div>
            )}
            <div className="hot-toast-message">{toast.message}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Apply;
