import { useEffect, useState, useId } from 'react';
import salesforceService from '../services/salesforceService';
import { useAuth } from '../contexts/AuthContext';
import './Profile.css';

const FIELD_SET_MAPPING = {
  'Academic Institution': 'Academic_Institution',
  'Individual Applicant': 'Individual',
  'NGO': 'NGO',
  'Private Organisation': 'Private_Organisation',
  'Private Organization': 'Private_Organisation'
};

const PROFILE_TYPES = [
  {
    id: 'Academic Institution',
    fieldSetName: 'Academic_Institution',
    icon: '🎓',
    title: 'Academic Institution',
    badge: 'Higher Ed & Research',
    description: 'Universities, academic faculties, and accredited educational or research institutes.'
  },
  {
    id: 'Individual Applicant',
    fieldSetName: 'Individual',
    icon: '👤',
    title: 'Individual Applicant',
    badge: 'Individual Researcher',
    description: 'Independent researchers, individual innovators, scholars, and scientists.'
  },
  {
    id: 'NGO',
    fieldSetName: 'NGO',
    icon: '🌍',
    title: 'NGO',
    badge: 'Non-Profit Entity',
    description: 'Non-governmental, charitable trusts, and non-profit community organizations.'
  },
  {
    id: 'Private Organisation',
    fieldSetName: 'Private_Organisation',
    icon: '🏢',
    title: 'Private Organisation',
    badge: 'Enterprise & Startups',
    description: 'Private limited corporations, registered enterprises, startups, and industry firms.'
  }
];

const Profile = () => {
  const { profileStatus, refreshProfileStatus, setProfileStatus } = useAuth();
  
  // UI views: 'loading' | 'no-profile' | 'wizard-select-type' | 'wizard-fill-form' | 'view-profile'
  const [viewState, setViewState] = useState('loading');
  const [profile, setProfile] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [fieldsMetadata, setFieldsMetadata] = useState([]);
  const [formData, setFormData] = useState({});
  const [loadingFields, setLoadingFields] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittingApproval, setSubmittingApproval] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [checkingStripe, setCheckingStripe] = useState(false);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setViewState('loading');
      setErrorMessage('');
      
      const userProfile = await salesforceService.getCurrentUserProfile();
      
      if (userProfile && (userProfile.Id || userProfile.Name || userProfile.Organization_Type__c)) {
        setProfile(userProfile);
        setViewState('view-profile');
        
        // Also fetch field metadata so we have clean labels for read-only view
        const fieldSetName = FIELD_SET_MAPPING[userProfile.Organization_Type__c] || 'Academic_Institution';
        try {
          const meta = await salesforceService.getFieldSetMetadata(fieldSetName);
          if (meta && meta.length > 0) {
            setFieldsMetadata(meta);
          }
        } catch (e) {
          console.warn('Could not load field metadata for view', e);
        }
      } else {
        setProfile(null);
        setViewState('no-profile');
      }
    } catch (err) {
      console.error('Failed to load user profile:', err);
      setProfile(null);
      setViewState('no-profile');
    }
  };

  // Start creation wizard
  const handleStartCreation = () => {
    setErrorMessage('');
    setSelectedType(null);
    setFormData({});
    setViewState('wizard-select-type');
  };

  // Select one of the 4 profile types (Loads REAL Salesforce fields from Field Set)
  const handleSelectType = async (typeItem) => {
    try {
      setSelectedType(typeItem);
      setLoadingFields(true);
      setErrorMessage('');
      
      const meta = await salesforceService.getFieldSetMetadata(typeItem.fieldSetName);
      console.log('Real Salesforce fields loaded for ' + typeItem.fieldSetName + ':', meta);
      
      if (!meta || meta.length === 0) {
        throw new Error('No fields configured for ' + typeItem.title + ' in Salesforce Field Set.');
      }
      
      setFieldsMetadata(meta);
      
      // Initialize form data with organization type
      setFormData({
        Organization_Type__c: typeItem.id
      });
      
      setViewState('wizard-fill-form');
    } catch (err) {
      console.error('Error fetching field set metadata:', err);
      setErrorMessage(err?.message || ('Failed to load form fields for ' + typeItem.title));
    } finally {
      setLoadingFields(false);
    }
  };

  // Form input changes
  const handleInputChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  // Submit and create profile
  const handleCreateProfileSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    
    // Check required fields
    for (const field of fieldsMetadata) {
      if (field.required && !formData[field.name]) {
        setErrorMessage(`Please fill out the required field: ${field.label}`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        Organization_Type__c: selectedType.id,
        Profile_Status__c: 'Pending'
      };

      const result = await salesforceService.createProfile(payload);
      const createdId = result?.Id || result;
      
      setSuccessMessage('Profile created successfully! Please review your details and submit for approval.');
      
      // Refresh Auth Context
      await refreshProfileStatus();
      
      // Load saved profile
      await loadProfileData();
    } catch (err) {
      console.error('Failed to create profile:', err);
      setErrorMessage(err?.message || 'Failed to create profile. Please check all fields.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit for Approval process
  const handleSubmitForApproval = async () => {
    if (!profile?.Id) {
      setErrorMessage('Cannot submit for approval: Missing profile record.');
      return;
    }

    try {
      setSubmittingApproval(true);
      setErrorMessage('');
      
      await salesforceService.submitProfileForApproval(profile.Id);
      
      setSuccessMessage('Profile successfully submitted for internal approval!');
      
      // Update local profile status
      setProfile(prev => ({
        ...prev,
        Profile_Status__c: 'In Approval'
      }));
      
      if (setProfileStatus) {
        setProfileStatus('In Approval');
      }
      await refreshProfileStatus();
    } catch (err) {
      console.error('Failed to submit for approval:', err);
      setErrorMessage(err?.message || 'Failed to submit profile for approval.');
    } finally {
      setSubmittingApproval(false);
    }
  };

  // Check URL query parameters for return from Stripe onboarding
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('stripe_return') === 'true' && profile?.Id) {
      handleCheckStripeStatus();
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [profile?.Id]);

  const handleConnectStripe = async () => {
    if (!profile?.Id) {
      setErrorMessage('Profile record not loaded.');
      return;
    }

    try {
      setConnectingStripe(true);
      setErrorMessage('');
      setSuccessMessage('');

      // 1. Create Connected Account if not yet created
      await salesforceService.createStripeAccount(profile.Id);

      // 2. Generate Stripe Onboarding Link
      const onboardingUrl = await salesforceService.createStripeOnboardingLink(profile.Id);

      if (!onboardingUrl) {
        throw new Error('Stripe did not return an onboarding URL. Please ensure Stripe API is configured in the org.');
      }

      // 3. Redirect to Stripe Onboarding Portal
      window.location.href = onboardingUrl;
    } catch (err) {
      console.error('Failed to initiate Stripe onboarding:', err);
      const msg = err?.body?.message || err?.message || 'Failed to initiate Stripe connection. Please try again.';
      setErrorMessage(msg);
      setConnectingStripe(false);
    }
  };

  const handleCheckStripeStatus = async () => {
    if (!profile?.Id) return;

    if (!profile?.Stripe_Connected_Account_ID__c) {
      setErrorMessage('No Stripe account has been created for this profile yet. Click "Connect Stripe Account" to begin onboarding.');
      return;
    }

    try {
      setCheckingStripe(true);
      setErrorMessage('');
      const status = await salesforceService.checkStripeOnboarding(profile.Id);
      setSuccessMessage(`Stripe account status verified: ${status || 'Completed'}`);
      
      const updatedProfile = await salesforceService.getCurrentUserProfile();
      if (updatedProfile) {
        setProfile(updatedProfile);
      }
    } catch (err) {
      console.error('Failed to verify Stripe status:', err);
      const msg = err?.body?.message || err?.message || 'Failed to verify Stripe status.';
      setErrorMessage(msg);
    } finally {
      setCheckingStripe(false);
    }
  };

  // Current status helper
  const currentStatus = profile?.Profile_Status__c || profileStatus || 'Pending';
  const isDraftOrPending = currentStatus === 'Pending' || currentStatus === 'Draft';
  const isInApproval = currentStatus === 'In Approval';
  const isApproved = currentStatus === 'Approved';
  const isRejected = currentStatus === 'Not Eligible' || currentStatus === 'Rejected';

  // -------------------------------------------------------------
  // VIEW: LOADING
  // -------------------------------------------------------------
  if (viewState === 'loading') {
    return (
      <div className="profile-container">
        <div className="profile-loading-card">
          <div className="loading-spinner"></div>
          <h2>Checking Profile Information...</h2>
          <p>Connecting to grant management records</p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 1: NO PROFILE FOUND
  // -------------------------------------------------------------
  if (viewState === 'no-profile') {
    return (
      <div className="profile-container">
        <div className="no-profile-wrapper">
          <div className="no-profile-icon-box">
            <span className="no-profile-icon">📋</span>
          </div>
          <h1 className="no-profile-title">No Profile Found</h1>
          <p className="no-profile-desc">
            You have not created an applicant profile yet. Before applying for available grant programs, 
            you need to create your profile and have it verified by our administration team.
          </p>

          <div className="no-profile-steps-hint">
            <div className="hint-item">
              <span className="hint-num">1</span>
              <span>Select your Organization Type</span>
            </div>
            <div className="hint-divider"></div>
            <div className="hint-item">
              <span className="hint-num">2</span>
              <span>Fill category-specific field details</span>
            </div>
            <div className="hint-divider"></div>
            <div className="hint-item">
              <span className="hint-num">3</span>
              <span>Submit for Admin Approval</span>
            </div>
          </div>

          <button 
            type="button" 
            className="btn-create-profile"
            onClick={handleStartCreation}
          >
            Create Profile →
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: STEP 1 - SELECT PROFILE TYPE (4 TYPES)
  // -------------------------------------------------------------
  if (viewState === 'wizard-select-type') {
    return (
      <div className="profile-container">
        <div className="wizard-card">
          <div className="wizard-nav-top">
            <button 
              type="button" 
              className="btn-secondary-back"
              onClick={() => setViewState(profile ? 'view-profile' : 'no-profile')}
            >
              ← Cancel
            </button>
            <div className="wizard-step-tag">Step 1 of 2</div>
          </div>

          <div className="wizard-header">
            <h1 className="wizard-title">Create Your Profile</h1>
            <p className="wizard-subtitle">
              Select your organization type to load the required profile fields.
            </p>
          </div>

          {errorMessage && <div className="alert-box error">{errorMessage}</div>}

          {loadingFields ? (
            <div className="fields-loading-state">
              <div className="loading-spinner"></div>
              <p>Loading field sets for {selectedType?.title}...</p>
            </div>
          ) : (
            <div className="profile-types-grid">
              {PROFILE_TYPES.map(typeItem => (
                <div 
                  key={typeItem.id} 
                  className="type-card-interactive"
                  onClick={() => handleSelectType(typeItem)}
                >
                  <div className="type-icon-wrapper">{typeItem.icon}</div>
                  <div className="type-meta">
                    <span className="type-badge">{typeItem.badge}</span>
                    <h3 className="type-card-title">{typeItem.title}</h3>
                    <p className="type-card-desc">{typeItem.description}</p>
                  </div>
                  <div className="type-select-cta">
                    Select Category →
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 3: STEP 2 - DYNAMIC FIELDS FORM ACCORDING TO TYPE
  // -------------------------------------------------------------
  if (viewState === 'wizard-fill-form') {
    const visibleFields = fieldsMetadata.filter(
      f => f.name !== 'Profile_Status__c' &&
           f.name !== 'OwnerId' &&
           f.name !== 'Id' &&
           f.name !== 'Name' &&
           !f.name.toLowerCase().includes('stripe') &&
           !(f.label && f.label.toLowerCase().includes('stripe'))
    );

    const isContactOrLocation = (fieldName) => {
      const n = fieldName.toLowerCase();
      return n.includes('contact') || n.includes('email') || n.includes('country') || n.includes('region');
    };

    const isMainNameField = (fieldName) => {
      const n = fieldName.toLowerCase();
      return n === 'institution_name__c' || n === 'ngo_name__c' || n === 'company_name__c';
    };

    // Sort identity fields so primary name field is first
    const identityFields = visibleFields
      .filter(f => !isContactOrLocation(f.name))
      .sort((a, b) => {
        if (isMainNameField(a.name)) return -1;
        if (isMainNameField(b.name)) return 1;
        return 0;
      });

    const contactFields = visibleFields.filter(f => isContactOrLocation(f.name));

    const getFieldPlaceholder = (field) => {
      const n = field.name.toLowerCase();
      if (n.includes('email')) return 'e.g. contact@domain.org';
      if (n.includes('year')) return 'e.g. 2012';
      if (n.includes('registration_number')) return 'e.g. REG-882910';
      if (n.includes('institution_id')) return 'e.g. INST-0042';
      if (n.includes('company_registration')) return 'e.g. CRN-90218';
      if (n.includes('government_id_number')) return 'e.g. ID-4910284';
      if (n.includes('occupation')) return 'e.g. Independent Researcher';
      if (n.includes('name')) return `Official ${field.label}`;
      return `Enter ${field.label}`;
    };

    const renderFormField = (field) => {
      const isOrgType = field.name === 'Organization_Type__c';
      const val = isOrgType ? selectedType.id : (formData[field.name] || '');
      const isWide = isMainNameField(field.name) || field.name.includes('Statement') || field.name.includes('Address');

      return (
        <div 
          key={field.name} 
          className={`form-field-group ${isWide ? 'field-span-2' : ''}`}
        >
          <label className="field-label" htmlFor={field.name}>
            <span className="field-label-text">{field.label}</span>
            {field.required && (
              <span className="field-required-star" title="Required field">*</span>
            )}
          </label>

          <div className="input-wrapper">
            {isOrgType ? (
              <div className="readonly-input-box">
                <input
                  id={field.name}
                  type="text"
                  value={selectedType.id}
                  disabled
                  className="form-input readonly-input"
                />
                <span className="readonly-lock-badge" title="Selected Organization Type">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </span>
              </div>
            ) : field.type === 'select' ? (
              <div className="select-container">
                <select
                  id={field.name}
                  className="form-select"
                  value={val}
                  required={field.required}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                >
                  <option value="">Select {field.label}...</option>
                  {(field.options || []).map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="select-chevron">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
              </div>
            ) : field.type === 'date' ? (
              <input
                id={field.name}
                type="date"
                className="form-input"
                value={val}
                required={field.required}
                onChange={(e) => handleInputChange(field.name, e.target.value)}
              />
            ) : field.type === 'number' ? (
              <input
                id={field.name}
                type="number"
                className="form-input"
                value={val}
                required={field.required}
                placeholder={getFieldPlaceholder(field)}
                onChange={(e) => handleInputChange(field.name, e.target.value)}
              />
            ) : field.type === 'email' ? (
              <input
                id={field.name}
                type="email"
                className="form-input"
                value={val}
                required={field.required}
                placeholder={getFieldPlaceholder(field)}
                onChange={(e) => handleInputChange(field.name, e.target.value)}
              />
            ) : (
              <input
                id={field.name}
                type="text"
                className="form-input"
                value={val}
                required={field.required}
                placeholder={getFieldPlaceholder(field)}
                onChange={(e) => handleInputChange(field.name, e.target.value)}
              />
            )}
          </div>
        </div>
      );
    };

    return (
      <div className="profile-container">
        <div className="wizard-form-card">
          {/* Top Navigation */}
          <div className="wizard-top-nav">
            <button 
              type="button" 
              className="btn-back-nav"
              onClick={() => setViewState('wizard-select-type')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              <span>Back to Categories</span>
            </button>
            <div className="wizard-step-indicator">
              <span className="step-dot"></span>
              <span>Step 2 of 2: Profile Details</span>
            </div>
          </div>

          {/* Form Header */}
          <div className="wizard-form-header">
            <div className="header-type-icon-box">
              <span className="header-type-emoji">{selectedType?.icon}</span>
            </div>
            <div className="header-type-meta">
              <div className="header-tags-line">
                <span className="category-badge-chip">{selectedType?.title}</span>
                <span className="locked-badge-chip">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  Permanent Record
                </span>
              </div>
              <h2 className="header-main-title">{selectedType?.title} Profile Details</h2>
              <p className="header-main-desc">Complete the required institutional information. Once saved, this official profile will be linked to all your grant applications.</p>
            </div>
          </div>

          {errorMessage && <div className="alert-box error">{errorMessage}</div>}

          <form onSubmit={handleCreateProfileSubmit} className="modern-profile-form">
            {identityFields.length > 0 && (
              <div className="profile-form-section">
                <div className="section-title-bar">
                  <div className="section-icon-badge">🪪</div>
                  <div className="section-text-group">
                    <h3 className="section-heading">Identity & Registration</h3>
                    <p className="section-subheading">Official institutional credentials and organization classification</p>
                  </div>
                </div>
                <div className="fields-grid-2col">
                  {identityFields.map(renderFormField)}
                </div>
              </div>
            )}

            {contactFields.length > 0 && (
              <div className="profile-form-section">
                <div className="section-title-bar">
                  <div className="section-icon-badge">📍</div>
                  <div className="section-text-group">
                    <h3 className="section-heading">Contact & Location</h3>
                    <p className="section-subheading">Primary administrative contact and geographic jurisdiction</p>
                  </div>
                </div>
                <div className="fields-grid-2col">
                  {contactFields.map(renderFormField)}
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="modern-form-footer">
              <button 
                type="button" 
                className="btn-footer-back"
                onClick={() => setViewState('wizard-select-type')}
                disabled={submitting}
              >
                Cancel & Back
              </button>
              
              <button 
                type="submit" 
                className="btn-footer-submit"
                disabled={submitting}
              >
                {submitting ? (
                  <span className="btn-loading-flex">
                    <span className="btn-mini-spinner"></span>
                    <span>Creating Profile...</span>
                  </span>
                ) : (
                  <span className="btn-submit-flex">
                    <span>Complete Profile</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                      <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 4: SAVED PROFILE (READ-ONLY / NOT EDITABLE ONCE SAVED)
  // -------------------------------------------------------------
  // Helper to get formatted field label
  const getFieldLabel = (fieldName) => {
    const found = fieldsMetadata.find(f => f.name === fieldName);
    if (found) return found.label;
    return fieldName.replace(/__c$/, '').replace(/_/g, ' ');
  };

  // Helper to format values
  const renderValue = (val) => {
    if (val === null || val === undefined || val === '') return <span className="empty-val">—</span>;
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    return String(val);
  };

  return (
    <div className="profile-container">
      <div className="profile-saved-card">
        {/* Header */}
        <div className="saved-profile-top-header">
          <div>
            <div className="profile-subtitle-label">Applicant Profile Overview</div>
            <h1 className="saved-profile-title">
              {profile.Institution_Name__c || profile.NGO_Name__c || profile.Company_Name__c || profile.Name || 'My Profile'}
            </h1>
          </div>
          <div className="profile-type-badge-pill">
            {profile.Organization_Type__c || 'Registered Applicant'}
          </div>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="alert-box alert-success">
            <span>{successMessage}</span>
            <button type="button" className="alert-close-btn" onClick={() => setSuccessMessage('')}>✕</button>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="alert-box alert-error">
            <span>{errorMessage}</span>
            <button type="button" className="alert-close-btn" onClick={() => setErrorMessage('')}>✕</button>
          </div>
        )}

        {/* STATUS BANNER */}
        <div className="profile-status-section">
          {isDraftOrPending && (
            <div className="status-banner banner-pending">
              <div className="status-banner-content">
                <div className="status-icon">📝</div>
                <div>
                  <h3 className="status-banner-title">Profile Not Submitted</h3>
                  <p className="status-banner-desc">
                    Your profile details are saved, but not yet submitted for verification. 
                    Please click <b>Submit for Approval</b> below to trigger the internal review process.
                  </p>
                </div>
              </div>
              <div className="status-banner-action">
                <button 
                  type="button" 
                  className="btn-submit-approval"
                  onClick={handleSubmitForApproval}
                  disabled={submittingApproval}
                >
                  {submittingApproval ? 'Submitting...' : 'Submit for Approval'}
                </button>
              </div>
            </div>
          )}

          {isInApproval && (
            <div className="status-banner banner-in-review">
              <div className="status-banner-content">
                <div className="status-icon">⏳</div>
                <div>
                  <h3 className="status-banner-title">Profile Under Review</h3>
                  <p className="status-banner-desc">
                    Your profile has been submitted and is currently undergoing internal administrator verification. 
                    Once approved, your account will be verified and you can apply for grants.
                  </p>
                </div>
              </div>
              <div className="status-badge-capsule review-capsule">
                In Approval
              </div>
            </div>
          )}

          {isApproved && (
            <div className="status-banner banner-approved">
              <div className="status-banner-content">
                <div className="status-icon-svg">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="status-banner-title">Profile Status: Verified & Approved</h3>
                  <p className="status-banner-desc">
                    Your profile has been officially verified by administrators. You are eligible to apply for all active grant programs.
                  </p>
                </div>
              </div>
              <div className="status-badge-capsule approved-capsule">
                Verified
              </div>
            </div>
          )}

          {isRejected && (
            <div className="status-banner banner-rejected">
              <div className="status-banner-content">
                <div className="status-icon">❌</div>
                <div>
                  <h3 className="status-banner-title">Profile Not Eligible</h3>
                  <p className="status-banner-desc">
                    Your profile verification could not be approved at this time. Please contact support.
                  </p>
                </div>
              </div>
              <div className="status-badge-capsule rejected-capsule">
                Not Eligible
              </div>
            </div>
          )}
        </div>

        {/* STRIPE PAYOUTS & INTEGRATION CARD */}
        <div className="stripe-integration-card">
          <div className="stripe-card-header">
            <div className="stripe-brand-cluster">
              <div className="stripe-brand-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                </svg>
              </div>
              <div className="stripe-title-meta">
                <h3 className="stripe-section-title">Stripe Payouts & Financial Integration</h3>
                <p className="stripe-section-desc">Connect your official organization Stripe account to receive direct grant disbursements and installment payouts.</p>
              </div>
            </div>

            <div className="stripe-status-capsule-wrap">
              {profile.Stripe_Onboarding_Status__c === 'Completed' ? (
                <span className="stripe-status-capsule completed">
                  <span className="capsule-pulse-green"></span>
                  Connected & Verified
                </span>
              ) : profile.Stripe_Onboarding_Status__c === 'Onboarding' ? (
                <span className="stripe-status-capsule onboarding">
                  <span className="capsule-pulse-amber"></span>
                  Onboarding in Progress
                </span>
              ) : (
                <span className="stripe-status-capsule not-connected">
                  Not Connected
                </span>
              )}
            </div>
          </div>

          <div className="stripe-card-content">
            {profile.Stripe_Connected_Account_ID__c && (
              <div className="stripe-meta-details">
                <div className="stripe-meta-item">
                  <span className="meta-item-label">Connected Stripe Account ID</span>
                  <code className="meta-item-code">{profile.Stripe_Connected_Account_ID__c}</code>
                </div>
                <div className="stripe-meta-item">
                  <span className="meta-item-label">Onboarding Status</span>
                  <span className="meta-item-status-pill">{profile.Stripe_Onboarding_Status__c || 'Onboarding'}</span>
                </div>
              </div>
            )}

            <div className="stripe-action-bar">
              {profile.Stripe_Onboarding_Status__c === 'Completed' ? (
                <div className="stripe-connected-actions">
                  <button 
                    type="button" 
                    className="btn-stripe-sync" 
                    onClick={handleCheckStripeStatus}
                    disabled={checkingStripe}
                  >
                    {checkingStripe ? 'Checking Stripe...' : 'Sync Stripe Status'}
                  </button>
                  <span className="stripe-payout-ready-tag">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Direct Grant Transfers Enabled
                  </span>
                </div>
              ) : (
                <div className="stripe-connect-action-flex">
                  <button 
                    type="button" 
                    className="btn-stripe-main-action" 
                    onClick={handleConnectStripe}
                    disabled={connectingStripe}
                  >
                    {connectingStripe ? (
                      <span className="btn-stripe-loading">
                        <span className="btn-mini-spinner"></span>
                        <span>Redirecting to Stripe...</span>
                      </span>
                    ) : (
                      <span className="btn-stripe-text">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                        </svg>
                        <span>{profile.Stripe_Connected_Account_ID__c ? 'Complete Stripe Onboarding →' : 'Connect Stripe Account'}</span>
                      </span>
                    )}
                  </button>
                  <p className="stripe-security-hint">
                    Secure Stripe Connect setup. You will be redirected to complete identity and bank verification directly on Stripe's encrypted portal.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* READ ONLY NOTICE */}
        <div className="locked-profile-notice">
          <span className="lock-icon">🔒</span>
          <span>
            <b>Locked Records:</b> Profile fields are non-editable once saved as per policy. 
            All submissions are strictly tracked for compliance.
          </span>
        </div>

        {/* FIELD DETAILS GRID - READ ONLY */}
        <div className="profile-details-grid-wrapper">
          {/* Section 1: Basic Information */}
          <div className="details-section">
            <h2 className="section-title">Basic Information</h2>
            <div className="details-grid">
              <div className="detail-item">
                <span className="detail-label">Organization / Applicant Name</span>
                <span className="detail-value highlight-value">
                  {renderValue(profile.Institution_Name__c || profile.NGO_Name__c || profile.Company_Name__c || profile.Name)}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Organization Type</span>
                <span className="detail-value">
                  {renderValue(profile.Organization_Type__c)}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Registration Number</span>
                <span className="detail-value">
                  {renderValue(profile.Registration_Number__c || profile.NGO_Registration_Number__c || profile.Company_Registration_Number__c || profile.Institution_Id__c)}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Established / Incorporation Year</span>
                <span className="detail-value">
                  {renderValue(profile.Year_of_Establishment__c || profile.Year_of_Registration__c || profile.Year_of_Incorporation__c || profile.Established_Date__c)}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Contact Information */}
          <div className="details-section">
            <h2 className="section-title">Contact Information</h2>
            <div className="details-grid">
              <div className="detail-item">
                <span className="detail-label">Primary Contact Name</span>
                <span className="detail-value">
                  {renderValue(profile.Primary_Contact_Name__c || profile.Contact_Name__c)}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Primary Contact Email</span>
                <span className="detail-value">
                  {renderValue(profile.Primary_Contact_Email__c || profile.Email__c)}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Country</span>
                <span className="detail-value">
                  {renderValue(profile.Country__r?.Name || profile.Country__c)}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Region / State</span>
                <span className="detail-value">
                  {renderValue(profile.Region__r?.Name || profile.Region__c)}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Classification & Sector Details */}
          <div className="details-section">
            <h2 className="section-title">Classification & Entity Details</h2>
            <div className="details-grid">
              {profile.Institution_Category__c && (
                <div className="detail-item">
                  <span className="detail-label">Institution Category</span>
                  <span className="detail-value">{renderValue(profile.Institution_Category__c)}</span>
                </div>
              )}
              {profile.Accreditation_Status__c && (
                <div className="detail-item">
                  <span className="detail-label">Accreditation Status</span>
                  <span className="detail-value">{renderValue(profile.Accreditation_Status__c)}</span>
                </div>
              )}
              {profile.Government_ID_Type__c && (
                <div className="detail-item">
                  <span className="detail-label">Government ID Type</span>
                  <span className="detail-value">{renderValue(profile.Government_ID_Type__c)}</span>
                </div>
              )}
              {profile.Government_ID_Number__c && (
                <div className="detail-item">
                  <span className="detail-label">Government ID Number</span>
                  <span className="detail-value">{renderValue(profile.Government_ID_Number__c)}</span>
                </div>
              )}
              {profile.Current_Occupation__c && (
                <div className="detail-item">
                  <span className="detail-label">Current Occupation</span>
                  <span className="detail-value">{renderValue(profile.Current_Occupation__c)}</span>
                </div>
              )}
              {profile.Legal_Entity_Type__c && (
                <div className="detail-item">
                  <span className="detail-label">Legal Entity Type</span>
                  <span className="detail-value">{renderValue(profile.Legal_Entity_Type__c)}</span>
                </div>
              )}
              {profile.Operational_Status__c && (
                <div className="detail-item">
                  <span className="detail-label">Operational Status</span>
                  <span className="detail-value">{renderValue(profile.Operational_Status__c)}</span>
                </div>
              )}
              <div className="detail-item">
                <span className="detail-label">Approval Record Status</span>
                <span className="detail-value">
                  <span className={`status-pill status-${(profile.Profile_Status__c || 'pending').toLowerCase().replace(/\s+/g, '-')}`}>
                    {profile.Profile_Status__c || 'Pending'}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Profile;
