import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import salesforceService from '../services/salesforceService';
import './Home.css';

export default function Home() {
  const { isLoggedIn } = useAuth();
  const [stats, setStats] = useState({
    applications: 0,
    programs: 0,
    distributed: '$0'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch real statistics from Salesforce (ALL users, not just current user)
        const statsData = await salesforceService.getHomeStats();
        
        if (statsData) {
          setStats({
            applications: statsData.totalApplications || 0,
            programs: statsData.activePrograms || 0,
            distributed: statsData.totalFunded || '$0'
          });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [isLoggedIn]);

  const eligibilityCategories = [
    {
      title: 'Academic & Research',
      image: salesforceService.getAsset('eligibleAcademic'),
      description: 'Universities and research centers seeking innovation and impact-based grants.'
    },
    {
      title: 'NGOs & Non-Profits',
      image: salesforceService.getAsset('eligibleNgo'),
      description: 'Registered organizations working on social, community, and development initiatives.'
    },
    {
      title: 'Startups & Enterprises',
      image: salesforceService.getAsset('eligibleStartup'),
      description: 'Innovation-driven companies developing impactful solutions.'
    },
    {
      title: 'Independent Researchers',
      image: salesforceService.getAsset('eligibleResearcher'),
      description: 'Researchers working on eligible research or innovation projects.'
    }
  ];

  const features = [
    {
      icon: '🔍',
      title: 'Transparent Process',
      description: 'Clear evaluation criteria and visible progress at every stage of review.'
    },
    {
      icon: '🔒',
      title: 'Secure & Compliant',
      description: 'Enterprise-grade security for all documents and financial information.'
    },
    {
      icon: '⚡',
      title: 'Real-Time Tracking',
      description: 'Live status updates and instant notifications on your application.'
    },
    {
      icon: '🎯',
      title: 'Centralized Hub',
      description: 'All grants, applications, documents, and reports in one place.'
    },
    {
      icon: '📊',
      title: 'Smart Matching',
      description: 'Get matched with programs based on your profile and objectives.'
    },
    {
      icon: '📱',
      title: 'Mobile Friendly',
      description: 'Apply, track, and manage grants from any device, anywhere.'
    }
  ];

  const processSteps = [
    {
      number: '1',
      title: 'Create Profile',
      description: 'Register and complete your organization profile for verification.'
    },
    {
      number: '2',
      title: 'Get Verified',
      description: 'Submit your profile and pass the eligibility review process.'
    },
    {
      number: '3',
      title: 'Browse & Apply',
      description: 'Find programs matching your area and submit your grant application.'
    },
    {
      number: '4',
      title: 'Review & Approval',
      description: 'Expert teams evaluate your application and approve funding.'
    },
    {
      number: '5',
      title: 'Receive Funds',
      description: 'Sign the agreement, receive disbursement, and report progress.'
    }
  ];

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="badge-icon">🚀</span>
              GRANT MANAGEMENT PLATFORM
            </div>
            
            <h1 className="hero-title">
              Find the Right <span className="hero-gradient">Grants</span>
              <br />to Fuel Your Initiatives
            </h1>
            
            <p className="hero-subtitle">
              Discover funding opportunities tailored to your sector. Apply seamlessly, get verified, and track every stage of your grant journey — all in one place.
            </p>
            
            <div className="hero-actions">
              {isLoggedIn ? (
                <Link to="/programs" className="hero-btn hero-btn-primary">
                  Explore Programs →
                </Link>
              ) : (
                <a href={salesforceService.loginUrl} className="hero-btn hero-btn-primary">
                  Explore Programs →
                </a>
              )}
            </div>

            <div className="hero-metrics">
              <div className="metric-item">
                <div className="metric-value">{stats.applications}+</div>
                <div className="metric-label">APPLICATIONS</div>
              </div>
              <div className="metric-item">
                <div className="metric-value">{stats.distributed}+</div>
                <div className="metric-label">FUNDED AMOUNT</div>
              </div>
              <div className="metric-item">
                <div className="metric-value">{stats.programs}+</div>
                <div className="metric-label">PROGRAMS</div>
              </div>
            </div>
          </div>

          <div className="hero-stats-card">
            <div className="stats-card-item">
              <div className="stats-icon stats-icon-green">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="stats-content">
                <div className="stats-label">Applications Submitted</div>
                <div className="stats-value">{loading ? '...' : stats.applications}</div>
              </div>
            </div>

            <div className="stats-card-item">
              <div className="stats-icon stats-icon-purple">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="stats-content">
                <div className="stats-label">Active Programs</div>
                <div className="stats-value">{loading ? '...' : stats.programs}</div>
              </div>
            </div>

            <div className="stats-card-item">
              <div className="stats-icon stats-icon-orange">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="stats-content">
                <div className="stats-label">Total Distributed</div>
                <div className="stats-value">{loading ? '...' : stats.distributed}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Eligibility Section */}
      <section className="eligibility-section">
        <div className="container">
          <div className="section-header">
            <div className="section-badge">WHO CAN APPLY</div>
            <h2 className="section-title">Eligibility Categories</h2>
            <p className="section-subtitle">
              Identify your category and explore grants tailored to your organization type.
            </p>
          </div>

          <div className="eligibility-grid">
            {eligibilityCategories.map((category, index) => (
              <div key={index} className="eligibility-card">
                <div className="eligibility-image">
                  <img src={category.image} alt={category.title} />
                </div>
                <div className="eligibility-info">
                  <h3 className="eligibility-title">{category.title}</h3>
                  <p className="eligibility-description">{category.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <div className="section-header">
            <div className="section-badge">WHY GEMS</div>
            <h2 className="section-title">Built for Modern Grant Management</h2>
            <p className="section-subtitle">
              Everything you need — clearly, quickly, and securely.
            </p>
          </div>

          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="process-section">
        <div className="container">
          <div className="section-header">
            <div className="section-badge">PROCESS</div>
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle">
              From discovery to fund utilization — a simple, transparent journey.
            </p>
          </div>

          <div className="process-timeline">
            {processSteps.map((step, index) => (
              <div key={index} className="process-step">
                <div className="process-circle">{step.number}</div>
                <div className="process-details">
                  <h3 className="process-step-title">{step.title}</h3>
                  <p className="process-step-description">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-container">
          <h2 className="cta-title">Ready to Secure Your Grant?</h2>
          <p className="cta-subtitle">
            Join thousands of organizations that have successfully received funding through GEMS. Start your journey today.
          </p>
          {isLoggedIn ? (
            <Link to="/programs" className="cta-btn">
              Browse Programs →
            </Link>
          ) : (
            <a href={salesforceService.loginUrl} className="cta-btn">
              Browse Programs →
            </a>
          )}
        </div>
      </section>
    </div>
  );
}
