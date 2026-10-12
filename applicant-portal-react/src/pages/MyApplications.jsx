import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import salesforceService from '../services/salesforceService';
import './MyApplications.css';

const MyApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [selectedApp, setSelectedApp] = useState(null);
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

  // Status Counts
  const counts = useMemo(() => {
    const res = {
      total: applications.length,
      draft: 0,
      underReview: 0,
      approved: 0,
      withdrawn: 0,
      rejected: 0,
    };

    applications.forEach((app) => {
      const s = (app.Application_Status__c || '').toLowerCase().trim();
      if (s === 'draft') res.draft++;
      else if (s === 'under review') res.underReview++;
      else if (s === 'approved') res.approved++;
      else if (s === 'withdrawn') res.withdrawn++;
      else if (s === 'rejected') res.rejected++;
    });

    return res;
  }, [applications]);

  // Filtered Applications
  const filteredApplications = useMemo(() => {
    if (selectedFilter === 'ALL') return applications;
    return applications.filter((app) => {
      const s = (app.Application_Status__c || '').toLowerCase().trim();
      if (selectedFilter === 'DRAFT') return s === 'draft';
      if (selectedFilter === 'UNDER_REVIEW') return s === 'under review';
      if (selectedFilter === 'APPROVED') return s === 'approved';
      if (selectedFilter === 'WITHDRAWN') return s === 'withdrawn';
      if (selectedFilter === 'REJECTED') return s === 'rejected';
      return true;
    });
  }, [applications, selectedFilter]);

  const handleActionClick = (app) => {
    const isDraft = (app.Application_Status__c || '').toLowerCase() === 'draft';
    if (isDraft && app.Program__c) {
      navigate(`/apply/${app.Program__c}?appId=${app.Id}`);
    } else {
      navigate(`/application/${app.Id}`);
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
    return 'draft';
  };

  if (loading) {
    return (
      <div className="my-applications-page">
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#64748b' }}>
          Loading your applications...
        </div>
      </div>
    );
  }

  return (
    <div className="my-applications-page">
      {/* Page Header */}
      <div className="my-apps-header">
        <h1>My Applications</h1>
        <p>Track and manage all your grant applications in one place.</p>
      </div>

      {/* Metrics Row */}
      <div className="metrics-grid">
        {/* TOTAL */}
        <div 
          className={`metric-card total ${selectedFilter === 'ALL' ? 'active' : ''}`}
          onClick={() => setSelectedFilter('ALL')}
        >
          <div className="metric-icon-wrap">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <div className="metric-count">{counts.total}</div>
          <div className="metric-label">TOTAL</div>
        </div>

        {/* DRAFT */}
        <div 
          className={`metric-card draft ${selectedFilter === 'DRAFT' ? 'active' : ''}`}
          onClick={() => setSelectedFilter(selectedFilter === 'DRAFT' ? 'ALL' : 'DRAFT')}
        >
          <div className="metric-icon-wrap">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          </div>
          <div className="metric-count">{counts.draft}</div>
          <div className="metric-label">DRAFT</div>
        </div>

        {/* UNDER REVIEW */}
        <div 
          className={`metric-card review ${selectedFilter === 'UNDER_REVIEW' ? 'active' : ''}`}
          onClick={() => setSelectedFilter(selectedFilter === 'UNDER_REVIEW' ? 'ALL' : 'UNDER_REVIEW')}
        >
          <div className="metric-icon-wrap">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <div className="metric-count">{counts.underReview}</div>
          <div className="metric-label">UNDER REVIEW</div>
        </div>

        {/* APPROVED */}
        <div 
          className={`metric-card approved ${selectedFilter === 'APPROVED' ? 'active' : ''}`}
          onClick={() => setSelectedFilter(selectedFilter === 'APPROVED' ? 'ALL' : 'APPROVED')}
        >
          <div className="metric-icon-wrap">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <div className="metric-count">{counts.approved}</div>
          <div className="metric-label">APPROVED</div>
        </div>

        {/* WITHDRAWN */}
        <div 
          className={`metric-card withdrawn ${selectedFilter === 'WITHDRAWN' ? 'active' : ''}`}
          onClick={() => setSelectedFilter(selectedFilter === 'WITHDRAWN' ? 'ALL' : 'WITHDRAWN')}
        >
          <div className="metric-icon-wrap">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10"></polyline>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
            </svg>
          </div>
          <div className="metric-count">{counts.withdrawn}</div>
          <div className="metric-label">WITHDRAWN</div>
        </div>

        {/* REJECTED */}
        <div 
          className={`metric-card rejected ${selectedFilter === 'REJECTED' ? 'active' : ''}`}
          onClick={() => setSelectedFilter(selectedFilter === 'REJECTED' ? 'ALL' : 'REJECTED')}
        >
          <div className="metric-icon-wrap">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </div>
          <div className="metric-count">{counts.rejected}</div>
          <div className="metric-label">REJECTED</div>
        </div>
      </div>

      {/* Applications Table Card */}
      <div className="apps-table-container">
        {selectedFilter !== 'ALL' && (
          <div className="apps-table-filter-bar">
            <span className="filter-badge">
              Filtering by: <strong>{selectedFilter.replace('_', ' ')}</strong>
            </span>
            <button className="filter-clear-btn" onClick={() => setSelectedFilter('ALL')}>
              Clear Filter
            </button>
          </div>
        )}

        <table className="apps-table">
          <thead>
            <tr>
              <th>PROGRAM</th>
              <th>PROJECT TITLE</th>
              <th>FUNDED UP TO</th>
              <th>AMOUNT REQUESTED</th>
              <th>STATUS</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {filteredApplications.length > 0 ? (
              filteredApplications.map((app) => (
                <tr key={app.Id}>
                  <td className="app-program-col">
                    <span className="app-program-name">
                      {app.Program__r?.Name || 'General Grant'}
                    </span>
                    <span className="app-id-tag">{app.Name}</span>
                  </td>
                  <td className="app-title-col">
                    {app.Project_Title__c || '-'}
                  </td>
                  <td className="app-amount-col">
                    {app.Program__r?.Max_Amount__c
                      ? `$${app.Program__r.Max_Amount__c.toLocaleString()}`
                      : app.Approved_Amount__c
                      ? `$${app.Approved_Amount__c.toLocaleString()}`
                      : '-'}
                  </td>
                  <td className="app-amount-col">
                    {app.Requested_Amount__c
                      ? `$${app.Requested_Amount__c.toLocaleString()}`
                      : '$0'}
                  </td>
                  <td>
                    <span className={`app-status-badge ${getStatusClass(app.Application_Status__c)}`}>
                      {app.Application_Status__c || 'Draft'}
                    </span>
                  </td>
                  <td>
                    {app.Application_Status__c === 'Draft' ? (
                      <button 
                        className="btn-action-continue"
                        onClick={() => handleActionClick(app)}
                      >
                        Continue →
                      </button>
                    ) : (
                      <button 
                        className="btn-action-view"
                        onClick={() => handleActionClick(app)}
                      >
                        View Details
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : null}
          </tbody>
        </table>

        {/* Empty State when 0 applications */}
        {filteredApplications.length === 0 && (
          <div className="apps-empty-state">
            <div className="mailbox-icon-container">
              {/* Stylized Mailbox SVG matching user's screenshot */}
              <svg width="84" height="84" viewBox="0 0 84 84" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Mailbox stand */}
                <path d="M42 56V74" stroke="#94A3B8" strokeWidth="5" strokeLinecap="round" />
                <path d="M34 74H50" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round" />
                
                {/* Mailbox Body */}
                <path d="M22 28C22 17.5 30.5 10 42 10C53.5 10 62 17.5 62 28V52C62 54.2 60.2 56 58 56H26C23.8 56 22 54.2 22 52V28Z" fill="#3B82F6" />
                <path d="M22 28C22 17.5 30.5 10 42 10C53.5 10 62 17.5 62 28V52C62 54.2 60.2 56 58 56H26C23.8 56 22 54.2 22 52V28Z" stroke="#1D4ED8" strokeWidth="2.5" />
                
                {/* Mailbox Interior / Opening */}
                <path d="M28 28C28 20.2 34.2 15 42 15C49.8 15 56 20.2 56 28V50H28V28Z" fill="#1E3A8A" />
                
                {/* Letter envelope sticking out */}
                <rect x="33" y="18" width="26" height="18" rx="2" transform="rotate(-10 33 18)" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" />
                <path d="M33 21L45 28L58 17" stroke="#3B82F6" strokeWidth="1.5" />
                
                {/* Mailbox Door Hinged Down */}
                <path d="M24 50C24 53.3 26.7 56 30 56H54C57.3 56 60 53.3 60 50H24Z" fill="#2563EB" />
                
                {/* Red Flag */}
                <path d="M62 44V26" stroke="#DC2626" strokeWidth="3" strokeLinecap="round" />
                <path d="M62 26H71C72 26 73 27 73 28V34C73 35 72 36 71 36H62V26Z" fill="#EF4444" stroke="#DC2626" strokeWidth="1.5" />
              </svg>
            </div>
            <h3>No Applications Yet</h3>
            <p>Start by exploring grant programs and submitting your first application.</p>
            <button className="btn-explore-programs" onClick={() => navigate('/programs')}>
              Browse Programs →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyApplications;
