import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import salesforceService from '../services/salesforceService';
import './Programs.css';

const Programs = () => {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadPrograms();
  }, []);

  const loadPrograms = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await salesforceService.getPrograms();
      setPrograms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Could not fetch programs:', err);
      setPrograms([]);
    } finally {
      setLoading(false);
    }
  };

  const cleanCategoryName = (cat) => {
    if (!cat) return 'General';
    return cat.replace(/\s+Program$/i, '').trim();
  };

  // Build dynamic categories from actual program records
  const categories = useMemo(() => {
    const dynamicSet = new Set();
    programs.forEach(p => {
      if (p.Program_Type__c) {
        dynamicSet.add(cleanCategoryName(p.Program_Type__c));
      }
    });

    const priority = [
      'Social Welfare',
      'Education',
      'Healthcare',
      'Community Development',
      'Capacity Building',
      'Livelihood Support',
      'Emergency Assistance',
      'Research'
    ];

    const ordered = [];
    priority.forEach(cat => {
      if (dynamicSet.has(cat)) {
        ordered.push(cat);
        dynamicSet.delete(cat);
      }
    });

    Array.from(dynamicSet).sort().forEach(cat => ordered.push(cat));
    return ['All', ...ordered];
  }, [programs]);

  const matchesCategory = (program, catFilter) => {
    if (catFilter === 'All') return true;
    const pCat = cleanCategoryName(program.Program_Type__c).toLowerCase();
    const fCat = catFilter.toLowerCase();
    return pCat === fCat || (program.Program_Type__c || '').toLowerCase() === fCat;
  };

  const getCategoryCount = (cat) => {
    if (cat === 'All') return programs.length;
    return programs.filter(p => matchesCategory(p, cat)).length;
  };

  const stripHtml = (html) => {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };

  const matchesSearch = (program, query) => {
    if (!query || !query.trim()) return true;
    const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    
    const name = (program.Name || '').toLowerCase();
    const type = (program.Program_Type__c || '').toLowerCase();
    const descText = stripHtml(program.Overview__c || '').toLowerCase();
    const descWords = descText.split(/[^a-zA-Z0-9]+/).filter(Boolean);

    return terms.every(term => {
      // 1. Direct match anywhere in Program Title
      if (name.includes(term)) return true;

      // 2. Direct match in Category / Sector
      if (type.includes(term)) return true;

      // 3. Word match in description (prevents false positives like 'organ' matching 'organizations')
      return descWords.some(w => {
        if (w === term) return true;
        if (w === term + 's' || w === term + 'es') return true;
        if (term.length >= 6 && w.startsWith(term)) return true;
        return false;
      });
    });
  };

  const filteredPrograms = useMemo(() => {
    return programs.filter(program => {
      const matchesCat = matchesCategory(program, filter);
      if (!matchesCat) return false;
      return matchesSearch(program, searchQuery);
    });
  }, [programs, filter, searchQuery]);

  const handleProgramClick = (programId) => {
    navigate(`/program/${programId}`);
  };

  const formatCurrency = (val) => {
    if (!val && val !== 0) return 'N/A';
    const num = Number(val);
    if (isNaN(num)) return `$${val}`;
    return '$' + num.toLocaleString();
  };

  const getSectorStyle = (cat) => {
    const clean = cleanCategoryName(cat).toLowerCase();
    if (clean.includes('health')) return { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
    if (clean.includes('educat')) return { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
    if (clean.includes('communit')) return { bg: '#eef2ff', color: '#4f46e5', border: '#c7d2fe' };
    if (clean.includes('research')) return { bg: '#faf5ff', color: '#9333ea', border: '#e9d5ff' };
    if (clean.includes('livelihood')) return { bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
    if (clean.includes('emergency')) return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
    if (clean.includes('welfare')) return { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' };
    if (clean.includes('capacity')) return { bg: '#f0fdfa', color: '#0d9488', border: '#99f6e4' };
    return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
  };

  if (loading) {
    return (
      <div className="programs-state-container">
        <div className="modern-spinner"></div>
        <p>Loading available grant programs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="programs-state-container">
        <p className="error-text">{error}</p>
        <button onClick={loadPrograms} className="btn-retry">Try Again</button>
      </div>
    );
  }

  return (
    <div className="programs-page">
      <div className="programs-container">
        
        {/* Header Section */}
        <div className="programs-header-block">
          <div className="programs-badge">GRANT DIRECTORY</div>
          <h1 className="programs-title">Explore Funding Opportunities</h1>
          <p className="programs-subtitle">
            Browse verified funding opportunities, check award ceilings, and apply directly to programs in your sector.
          </p>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="programs-toolbar">
          {/* Search Input */}
          <div className="programs-search-wrapper">
            <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input 
              type="text" 
              placeholder="Search by program name, keyword, or sector..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="programs-search-input"
            />
            {searchQuery && (
              <button className="search-clear-btn" onClick={() => setSearchQuery('')} title="Clear search">✕</button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="categories-tab-bar">
            {categories.map(category => {
              const count = getCategoryCount(category);
              const isActive = filter === category;
              return (
                <button 
                  key={category}
                  className={`category-chip ${isActive ? 'active' : ''}`}
                  onClick={() => setFilter(category)}
                >
                  <span className="chip-name">{category}</span>
                  <span className={`chip-count ${isActive ? 'active' : ''}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Filter Summary Bar */}
        <div className="programs-status-bar">
          <span className="status-count-label">
            Showing <b>{filteredPrograms.length}</b> {filteredPrograms.length === 1 ? 'program' : 'programs'}
            {filter !== 'All' && <span> in <b className="highlight-tag">{filter}</b></span>}
            {searchQuery && <span> matching "<b>{searchQuery}</b>"</span>}
          </span>
          {(filter !== 'All' || searchQuery) && (
            <button 
              className="btn-clear-filters" 
              onClick={() => { setFilter('All'); setSearchQuery(''); }}
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Programs Grid */}
        <div className="programs-grid">
          {filteredPrograms.length === 0 ? (
            <div className="empty-programs-card">
              <div className="empty-icon">📁</div>
              <h3 className="empty-title">No Programs Found</h3>
              <p className="empty-desc">We couldn't find any grant programs matching your current filter criteria.</p>
              <button 
                className="btn-reset-large" 
                onClick={() => { setFilter('All'); setSearchQuery(''); }}
              >
                View All {programs.length} Programs
              </button>
            </div>
          ) : (
            filteredPrograms.map(program => {
              const categoryTitle = cleanCategoryName(program.Program_Type__c);
              const sectorStyle = getSectorStyle(program.Program_Type__c);

              return (
                <div 
                  key={program.Id} 
                  className="program-card"
                  onClick={() => handleProgramClick(program.Id)}
                >
                  {/* Top Row: Sector Pill & Status */}
                  <div className="card-top-row">
                    <span 
                      className="sector-pill" 
                      style={{ 
                        backgroundColor: sectorStyle.bg, 
                        color: sectorStyle.color,
                        borderColor: sectorStyle.border 
                      }}
                    >
                      {categoryTitle}
                    </span>
                    <span className="status-pill status-open">
                      <span className="status-pulse-dot"></span>
                      {program.Status__c || 'Open'}
                    </span>
                  </div>

                  {/* Title & Overview */}
                  <h3 className="card-program-title">{program.Name}</h3>
                  <p className="card-program-desc">{stripHtml(program.Overview__c)}</p>

                  {/* Funding Figures */}
                  <div className="card-funding-box">
                    <div className="funding-col">
                      <span className="funding-label">MAX ALLOCATION</span>
                      <span className="funding-val">
                        {formatCurrency(program.Max_Amount__c)}
                      </span>
                    </div>
                    <div className="funding-sep"></div>
                    <div className="funding-col">
                      <span className="funding-label">TOTAL FUNDED</span>
                      <span className="funding-val font-green">
                        {formatCurrency(program.Total_Funded__c)}
                      </span>
                    </div>
                  </div>

                  {/* Card Action Button */}
                  <div className="card-action-wrap">
                    <button className="btn-view-details">
                      View Details & Requirements
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};

export default Programs;
