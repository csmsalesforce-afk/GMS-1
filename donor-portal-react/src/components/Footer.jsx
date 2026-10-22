import React from 'react';
import './Footer.css';

export default function Footer({ onOpenInquiry, isLoggedIn }) {
  return (
    <footer className="donor-footer">
      <div className="container footer-content">
        <div className="footer-col brand-col">
          <div className="footer-brand">
            <div className="footer-logo-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
              </svg>
            </div>
            <span className="footer-brand-title">GMS Impact Giving</span>
          </div>
          <p className="footer-desc">
            A transparent philanthropy platform ensuring 100% of public donations flow directly into vetted grant initiatives, replenishing program budgets and delivering verifiable real-world impact.
          </p>
          <div className="trust-badges">
            <span className="trust-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Encrypted Stripe Security
            </span>
            <span className="trust-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Tax-Deductible 501(c)(3)
            </span>
          </div>
        </div>

        <div className="footer-col">
          <h4>Giving Tracks</h4>
          <ul>
            <li><a href="#campaigns">Active Disaster Relief</a></li>
            <li><a href="#campaigns">Medical & Healthcare Grants</a></li>
            <li><a href="#campaigns">Education & STEM Fellowships</a></li>
            <li><a href="#campaigns">Clean Water Initiatives</a></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>{isLoggedIn ? 'Philanthropic Programs' : 'Partner & Corporate'}</h4>
          <ul>
            {!isLoggedIn ? (
              <>
                <li><button onClick={onOpenInquiry} className="footer-link-btn">Corporate Matching</button></li>
                <li><button onClick={onOpenInquiry} className="footer-link-btn">Major Gifts & Endowments</button></li>
                <li><button onClick={onOpenInquiry} className="footer-link-btn">Institutional Grant Agreements</button></li>
              </>
            ) : (
              <>
                <li><a href="#campaigns" className="footer-link-btn">Active Giving Campaigns</a></li>
                <li><a href="#impact" className="footer-link-btn">Impact Transparency Ledger</a></li>
                <li><a href="#campaigns" className="footer-link-btn">Direct Milestone Grants</a></li>
              </>
            )}
            <li><a href="#impact">Audited Fund Reports</a></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4>Accountability</h4>
          <p className="footer-note">
            All donations are automatically attributed to their respective Salesforce Grant Program fund, where audited disbursements are tracked through milestone verification.
          </p>
          <div className="support-email">
            <span>Questions?</span>
            <strong>giving@gms-initiative.org</strong>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container bottom-content">
          <p>© {new Date().getFullYear()} GMS Philanthropy Platform. All rights reserved.</p>
          <div className="bottom-links">
            <span>Official Instant Tax Receipts Issued upon Confirmation</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
