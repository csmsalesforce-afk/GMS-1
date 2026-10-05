import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import salesforceService from '../services/salesforceService';
import './MyApplications.css';

const MyApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const data = await salesforceService.getMyApplications();
      setApplications(data || []);
    } catch (err) {
      console.error('Failed to load applications', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewApplication = (appId) => {
    navigate(`/application/${appId}`);
  };

  const getStatusColor = (status) => {
    const statusColors = {
      'Draft': 'draft',
      'Submitted': 'submitted',
      'Under Review': 'review',
      'Approved': 'approved',
      'Rejected': 'rejected',
      'Withdrawn': 'withdrawn'
    };
    return statusColors[status] || 'default';
  };

  if (loading) {
    return <div className="loading">Loading applications...</div>;
  }

  return (
    <div className="my-applications-page">
      <div className="page-header">
        <h1>My Applications</h1>
        <p>Track and manage your grant applications</p>
      </div>

      {applications.length === 0 ? (
        <div className="no-applications">
          <p>You haven't submitted any applications yet</p>
          <button onClick={() => navigate('/programs')} className="btn-primary">
            Browse Programs
          </button>
        </div>
      ) : (
        <div className="applications-list">
          {applications.map(app => (
            <div key={app.Id} className="application-card">
              <div className="card-header">
                <h3>{app.Grant_Program__r?.Name || 'Untitled Application'}</h3>
                <span className={`status-badge ${getStatusColor(app.Status__c)}`}>
                  {app.Status__c}
                </span>
              </div>
              <div className="card-body">
                <div className="detail-row">
                  <label>Application ID:</label>
                  <span>{app.Name}</span>
                </div>
                <div className="detail-row">
                  <label>Submitted Date:</label>
                  <span>{app.CreatedDate ? new Date(app.CreatedDate).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <label>Requested Amount:</label>
                  <span>${app.Requested_Amount__c?.toLocaleString() || '0'}</span>
                </div>
                {app.Reviewer_Comments__c && (
                  <div className="detail-row">
                    <label>Comments:</label>
                    <span>{app.Reviewer_Comments__c}</span>
                  </div>
                )}
              </div>
              <div className="card-footer">
                <button 
                  onClick={() => handleViewApplication(app.Id)} 
                  className="btn-view"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyApplications;
