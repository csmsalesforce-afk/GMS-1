import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import salesforceService from '../services/salesforceService';
import './ProgramDetails.css';

const ProgramDetails = () => {
  const { programId } = useParams();
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [program, setProgram] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgramDetails();
  }, [programId]);

  const loadProgramDetails = async () => {
    try {
      setLoading(true);
      const [programData, docsData] = await Promise.all([
        salesforceService.getProgramById(programId),
        salesforceService.getProgramDocuments(programId)
      ]);
      setProgram(programData);
      setDocuments(docsData || []);
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
    navigate(`/apply/${programId}`);
  };

  if (loading) {
    return <div className="loading">Loading program details...</div>;
  }

  if (!program) {
    return <div className="error">Program not found</div>;
  }

  return (
    <div className="program-details-page">
      <div className="program-header">
        <button onClick={() => navigate('/programs')} className="btn-back">
          ← Back to Programs
        </button>
        <div className="header-content">
          <h1>{program.Name}</h1>
          <span className={`status-badge ${program.Status__c?.toLowerCase()}`}>
            {program.Status__c}
          </span>
        </div>
      </div>

      <div className="program-content">
        <div className="program-main">
          <section className="program-section">
            <h2>Description</h2>
            <p>{program.Description__c || 'No description available'}</p>
          </section>

          <section className="program-section">
            <h2>Program Details</h2>
            <div className="details-grid">
              <div className="detail-item">
                <label>Total Budget</label>
                <span>${program.Total_Budget__c?.toLocaleString() || '0'}</span>
              </div>
              <div className="detail-item">
                <label>Available Budget</label>
                <span>${program.Available_Budget__c?.toLocaleString() || '0'}</span>
              </div>
              <div className="detail-item">
                <label>Start Date</label>
                <span>{program.Start_Date__c || 'TBD'}</span>
              </div>
              <div className="detail-item">
                <label>End Date</label>
                <span>{program.End_Date__c || 'TBD'}</span>
              </div>
              <div className="detail-item">
                <label>Application Deadline</label>
                <span>{program.Application_Deadline__c || 'TBD'}</span>
              </div>
            </div>
          </section>

          {program.Eligibility_Criteria__c && (
            <section className="program-section">
              <h2>Eligibility Criteria</h2>
              <p>{program.Eligibility_Criteria__c}</p>
            </section>
          )}

          {program.Terms_and_Conditions__c && (
            <section className="program-section">
              <h2>Terms and Conditions</h2>
              <p>{program.Terms_and_Conditions__c}</p>
            </section>
          )}

          {documents.length > 0 && (
            <section className="program-section">
              <h2>Program Documents</h2>
              <div className="documents-list">
                {documents.map(doc => (
                  <a 
                    key={doc.Id} 
                    href={doc.ContentDocument?.LatestPublishedVersion?.VersionData || '#'} 
                    className="document-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    📄 {doc.ContentDocument?.Title || 'Document'}
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="program-sidebar">
          <div className="apply-card">
            <h3>Ready to Apply?</h3>
            {program.Status__c === 'Active' ? (
              <>
                <p>Submit your application today</p>
                <button onClick={handleApply} className="btn-apply-primary">
                  {isLoggedIn ? 'Start Application' : 'Login to Apply'}
                </button>
              </>
            ) : (
              <p className="closed-message">
                This program is {program.Status__c?.toLowerCase()}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgramDetails;
