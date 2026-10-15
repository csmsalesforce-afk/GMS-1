
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import salesforceService from '../services/salesforceService';
import './ProgramDetails.css';

const ProgramDetails = () => {
  const { programId } = useParams();
  const { isLoggedIn, profileStatus, refreshProfileStatus, isVerified } = useAuth();
  const navigate = useNavigate();
  const [programData, setProgramData] = useState(null);
  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading] = useState(true);

  const tabs = ['Overview', 'Eligibility', 'Funding', 'Required Documents'];

  useEffect(() => {
    loadProgramDetails();
    if (isLoggedIn) {
      refreshProfileStatus();
    }
  }, [programId, isLoggedIn]);

  const loadProgramDetails = async () => {
    try {
      setLoading(true);
      const data = await salesforceService.getProgramById(programId);
      
      if (data && data.program) {
         setProgramData(data);
      } else {
         // Fallback if structure is different
         const docsData = await salesforceService.getProgramDocuments(programId);
         setProgramData({
           program: data,
           eligibilities: [],
           documents: docsData || []
         });
      }
    } catch (err) {
      console.error('Failed to load program details', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!isLoggedIn) {
      window.location.href = salesforceService.loginUrl;
      return;
    }
    if (!profileStatus || profileStatus === 'NO_PROFILE' || profileStatus !== 'Approved') {
      navigate('/profile');
      return;
    }
    navigate(`/apply/${programId}`);
  };

  if (loading) {
    return <div className="loading">Loading program details...</div>;
  }

  if (!programData || !programData.program) {
    return <div className="error">Program not found</div>;
  }

  const { program, eligibilities, documents } = programData;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Overview':
        return (
          <div className="tab-section">
            <h2 className="program-section-title"><span className="title-marker">|</span> Overview</h2>
            <div className="section-content text-content">
              {program.Overview__c ? (
                <div dangerouslySetInnerHTML={{ __html: program.Overview__c }} />
              ) : program.Description__c ? (
                <div dangerouslySetInnerHTML={{ __html: program.Description__c }} />
              ) : (
                <p>No overview available for this program.</p>
              )}
            </div>
          </div>
        );
      case 'Eligibility':
        return (
          <div className="tab-section">
            <h2 className="program-section-title"><span className="title-marker">|</span> Eligibility</h2>
            <div className="section-content">
              <p className="eligibility-intro">Organizations must meet the following requirements to be eligible:</p>
              {eligibilities && eligibilities.length > 0 ? (
                <ul className="check-list">
                  {eligibilities.map((elig, idx) => (
                    <li key={idx}><span className="check-icon">✓</span> {elig.Name}</li>
                  ))}
                </ul>
              ) : (
                <p className="fallback-text">General eligibility criteria apply.</p>
              )}
            </div>
          </div>
        );
      case 'Funding':
        return (
          <div className="tab-section">
            <h2 className="program-section-title"><span className="title-marker">|</span> Funding</h2>
            <div className="section-content funding-grid">
              <div className="funding-box">
                <span className="funding-label">FUNDING UP TO</span>
                <span className="funding-value">${program.Max_Amount__c?.toLocaleString() || '0'}</span>
              </div>
              <div className="funding-box">
                <span className="funding-label">TOTAL PROGRAM BUDGET</span>
                <span className="funding-value">${program.Program_Fund__c?.toLocaleString() || '0'}</span>
              </div>
            </div>
          </div>
        );
      case 'Required Documents':
        return (
          <div className="tab-section">
            <h2 className="program-section-title"><span className="title-marker">|</span> Required Documents</h2>
            <div className="section-content">
              {documents && documents.length > 0 ? (
                <div className="documents-list">
                  {documents.map((doc, idx) => (
                    <div key={idx} className="document-item">
                      <span className="doc-icon">📄</span> {doc.Name || doc.ContentDocument?.Title}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="fallback-text">No mandatory documents specified.</p>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="program-details-page">
      {/* Hero Header */}
      <div className="program-hero">
        <div className="program-hero-container">
          <button onClick={() => navigate('/programs')} className="btn-back">
            ← Back to Programs
          </button>
          <div className="program-hero-content">
            <h1>{program.Name}</h1>
            <span className="program-badge">
              {program.Program_Type__c || program.Category__c || 'General'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="program-tabs-container">
        <div className="program-tabs">
          {tabs.map(tab => (
            <button 
              key={tab}
              className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="program-content-wrapper">
        <div className="program-main-content">
          {renderTabContent()}
        </div>

        {/* Sidebar */}
        <div className="program-sidebar">
          <div className="apply-card">
            <h3>Apply for Funding</h3>
            <div className="funding-highlight">
               <span className="highlight-label">MAXIMUM FUNDING</span>
               <span className="highlight-amount">${program.Max_Amount__c?.toLocaleString() || '0'}</span>
               <span className="highlight-sub">Per Project</span>
            </div>
            
            {program.Status__c !== 'Active' && program.Status__c !== 'Open' ? (
              <button disabled className="btn-apply-disabled">
                {program.Status__c || 'Closed'}
              </button>
            ) : !isLoggedIn ? (
              <>
                <button onClick={handleApply} className="btn-apply-primary">
                  Apply Now
                </button>
                <div className="time-estimate">⏱ Login required to start application</div>
              </>
            ) : (!profileStatus || profileStatus === 'NO_PROFILE') ? (
              <>
                <button 
                  onClick={() => navigate('/profile')} 
                  className="btn-apply-locked"
                  title="Create your organizational profile to apply"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <span>Complete Profile to Apply</span>
                </button>
                
                <div className="profile-lock-callout callout-warning">
                  <div className="lock-callout-header">
                    <span className="lock-callout-icon">🔒</span>
                    <span className="lock-callout-title">Profile Required</span>
                  </div>
                  <p className="lock-callout-text">
                    You must set up and verify your organizational profile before you can apply for this grant.
                  </p>
                  <button 
                    type="button" 
                    onClick={() => navigate('/profile')} 
                    className="lock-callout-link"
                  >
                    Set Up Profile Now →
                  </button>
                </div>
              </>
            ) : (profileStatus !== 'Approved') ? (
              <>
                <button 
                  disabled 
                  className="btn-apply-locked"
                  title="Profile verification required before applying"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <span>Verification Pending</span>
                </button>

                <div className="profile-lock-callout callout-pending">
                  <div className="lock-callout-header">
                    <span className="lock-callout-icon">⏳</span>
                    <span className="lock-callout-title">Verification Pending ({profileStatus})</span>
                  </div>
                  <p className="lock-callout-text">
                    Your profile is currently under review. The Apply button unlocks automatically once your profile is verified and approved.
                  </p>
                  <button 
                    type="button" 
                    onClick={() => navigate('/profile')} 
                    className="lock-callout-link"
                  >
                    View Profile Status →
                  </button>
                </div>
              </>
            ) : (
              <>
                <button onClick={handleApply} className="btn-apply-primary">
                  Apply Now
                </button>
                <div className="time-estimate">⏱ Takes 10-15 minutes to complete</div>
                <div className="verified-applicant-pill">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>Verified Applicant Profile</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgramDetails;
