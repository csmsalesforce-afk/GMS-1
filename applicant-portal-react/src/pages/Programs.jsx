import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import salesforceService from '../services/salesforceService';
import './Programs.css';

const Programs = () => {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('All');
  const navigate = useNavigate();

  const categories = ['All', 'Social Welfare', 'Education', 'Healthcare', 'Community Development', 'Livelihood Support', 'Emergency Assistance', 'Research'];

  useEffect(() => {
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    try {
      setLoading(true);
      const data = await salesforceService.getPrograms();
      setPrograms(data || []);
    } catch (err) {
      setError('Failed to load programs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPrograms = programs.filter(program => {
    if (filter === 'All') return true;
    return program.Program_Type__c === filter;
  });

  const handleProgramClick = (programId) => {
    navigate(`/program/${programId}`);
  };

  const getProgramIcon = (category) => {
    const icons = {
      'Social Welfare': '🏥',
      'Education': '📚',
      'Healthcare': '💊',
      'Community Development': '🏘️',
      'Livelihood Support': '🌾',
      'Emergency Assistance': '🚨',
      'Research': '🔬'
    };
    return icons[category] || '📄';
  };

  const getProgramIconClass = (category) => {
    const classes = {
      'Healthcare': 'health',
      'Education': 'education',
      'Community Development': 'community',
      'Livelihood Support': 'livelihood',
      'Research': 'research',
      'Social Welfare': 'welfare'
    };
    return classes[category] || '';
  };

  const stripHtml = (html) => {
    if (!html) return 'No description available';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };

  if (loading) {
    return <div className="loading">Loading programs...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="programs-page">
      <div className="programs-header">
        <span className="programs-badge">GRANT PROGRAMS</span>
        <h1>Explore Funding Opportunities</h1>
        <p>Browse programs across sectors and find the perfect match for your initiative.</p>
      </div>

      <div className="programs-filters">
        {categories.map(category => (
          <button 
            key={category}
            className={`filter-btn ${filter === category ? 'active' : ''}`} 
            onClick={() => setFilter(category)}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="programs-grid">
        {filteredPrograms.length === 0 ? (
          <div className="no-programs">No programs available</div>
        ) : (
          filteredPrograms.map(program => (
            <div 
              key={program.Id} 
              className="program-card"
              onClick={() => handleProgramClick(program.Id)}
            >
              <div className="program-header-row">
                <div className={`program-icon ${getProgramIconClass(program.Program_Type__c)}`}>
                  {getProgramIcon(program.Program_Type__c)}
                </div>
                <span className={`status-badge ${program.Status__c?.toLowerCase()}`}>
                  {program.Status__c || 'Open'}
                </span>
              </div>
              
              <h3>{program.Name}</h3>
              <p className="program-category">{program.Program_Type__c || 'General'} Program</p>
              
              <div className="program-details">
                <div className="detail-item">
                  <span className="detail-label">MAX AMOUNT</span>
                  <span className="detail-value amount">
                    ${program.Max_Amount__c?.toLocaleString() || program.Program_Fund__c?.toLocaleString() || '0'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">PROGRAM FUND</span>
                  <span className="detail-value amount">
                    ${program.Program_Fund__c?.toLocaleString() || '0'}
                  </span>
                </div>
              </div>

              <p className="program-description">{stripHtml(program.Overview__c)}</p>
              
              <button className="btn-view-program">View Details →</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Programs;
