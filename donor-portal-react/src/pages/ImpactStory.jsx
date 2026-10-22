import React from 'react';
import { Link } from 'react-router-dom';
import './ImpactStory.css';

export default function ImpactStory({ campaigns = [], onOpenDonate, onOpenInquiry, isLoggedIn }) {
  return (
    <div className="impact-page animate-fade-in">
      {/* Hero Banner */}
      <section className="impact-hero">
        <div className="container impact-hero-container">
          <span className="badge badge-primary">Philanthropic Transparency & Governance</span>
          <h1 className="impact-title">
            Verifiable Impact. <span className="text-gradient">Zero Overhead Leakage.</span>
          </h1>
          <p className="impact-subtitle">
            We operate on a 100% model: every dollar of your public donation directly replenishes verified grant programs—funding life-saving medical care, emergency disaster response, and essential community relief.
          </p>

          <div className="hero-metrics-pill-row">
            <div className="metric-pill">
              <strong>100%</strong>
              <span>Public Funds to Grants</span>
            </div>
            <div className="metric-pill-divider"></div>
            <div className="metric-pill">
              <strong>$0</strong>
              <span>Admin Fee Deduction</span>
            </div>
            <div className="metric-pill-divider"></div>
            <div className="metric-pill">
              <strong>4-Stage</strong>
              <span>Milestone Verification</span>
            </div>
            <div className="metric-pill-divider"></div>
            <div className="metric-pill">
              <strong>Instant</strong>
              <span>Tax-Deductible Receipts</span>
            </div>
          </div>
        </div>
      </section>

      <div className="container impact-body-container">
        {/* Core Pillars: How Your Gift Is Protected */}
        <section className="impact-pillars-section">
          <div className="section-head text-center">
            <span className="badge badge-success">The 100% Governance Model</span>
            <h2>How Your Donation Reaches Verified Beneficiaries</h2>
            <p>
              Traditional charities often consume 20% to 35% of donations in administrative overhead. GMS eliminates intermediaries through automated grant reconciliation and strict milestone approvals.
            </p>
          </div>

          <div className="pillars-grid">
            {/* Pillar 1 */}
            <div className="pillar-card">
              <div className="pillar-icon bg-blue-subtle">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <span className="pillar-step">Stage 01</span>
              <h3>Direct Program Treasury Allocation</h3>
              <p>
                When you make a donation, 100% of your gift is credited directly to the designated Grant Program treasury. Platform operational costs are privately underwritten by our philanthropic board, ensuring zero deduction from public gifts.
              </p>
              <ul className="pillar-features">
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Instant allocation to chosen cause
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Zero platform or administrative fees deducted
                </li>
              </ul>
            </div>

            {/* Pillar 2 */}
            <div className="pillar-card">
              <div className="pillar-icon bg-emerald-subtle">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </div>
              <span className="pillar-step">Stage 02</span>
              <h3>Rigorous Due Diligence & Vetting</h3>
              <p>
                Every grant applicant undergoes thorough vetting. Community proposals, educational credentials, contractor estimates, and medical diagnoses are independently validated by specialist review committees before any award is committed.
              </p>
              <ul className="pillar-features">
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Institutional & legal verification
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Multi-member review board approval
                </li>
              </ul>
            </div>

            {/* Pillar 3 */}
            <div className="pillar-card">
              <div className="pillar-icon bg-amber-subtle">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <polyline points="9 12 11 14 15 10"/>
                </svg>
              </div>
              <span className="pillar-step">Stage 03</span>
              <h3>Milestone-Gated Disbursements</h3>
              <p>
                Funds are not disbursed blindly upfront. Grants are released in controlled tranches strictly upon verified deliverables—such as borehole construction audits, classroom tech delivery logs, or accredited medical receipts.
              </p>
              <ul className="pillar-features">
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Tranches released against verified deliverables
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Direct settlement to accredited institutions
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Fund Allocation Visual Breakdown */}
        <section className="allocation-section">
          <div className="allocation-card">
            <div className="allocation-info">
              <span className="badge badge-primary">Financial Transparency</span>
              <h2>Where Every Dollar Goes</h2>
              <p>
                Unlike conventional charitable platforms that deduct payment processing fees and overhead from gifts, GMS guarantees that 100% of your public donation reaches the designated program treasury.
              </p>

              <div className="breakdown-list">
                <div className="breakdown-item">
                  <div className="breakdown-bar-head">
                    <span className="label-title">Direct Educational, Welfare & Medical Grants</span>
                    <strong className="label-val text-emerald">42%</strong>
                  </div>
                  <div className="breakdown-progress">
                    <div className="breakdown-fill" style={{ width: '42%', background: '#059669' }}></div>
                  </div>
                  <span className="breakdown-caption">Digital classrooms, maternal aid, girl child scholarships, and specialized treatments.</span>
                </div>

                <div className="breakdown-item">
                  <div className="breakdown-bar-head">
                    <span className="label-title">Clean Water, Rural Infrastructure & Livelihood</span>
                    <strong className="label-val text-blue">30%</strong>
                  </div>
                  <div className="breakdown-progress">
                    <div className="breakdown-fill" style={{ width: '30%', background: '#2563eb' }}></div>
                  </div>
                  <span className="breakdown-caption">Solar-powered boreholes, vocational training hubs, and sustainable farming seed grants.</span>
                </div>

                <div className="breakdown-item">
                  <div className="breakdown-bar-head">
                    <span className="label-title">Emergency Disaster Relief & Rapid Aid</span>
                    <strong className="label-val text-amber">20%</strong>
                  </div>
                  <div className="breakdown-progress">
                    <div className="breakdown-fill" style={{ width: '20%', background: '#d97706' }}></div>
                  </div>
                  <span className="breakdown-caption">Immediate community shelters, emergency food distribution, and urgent medical kits.</span>
                </div>

                <div className="breakdown-item">
                  <div className="breakdown-bar-head">
                    <span className="label-title">Audited Field Logistics & Milestone Monitoring</span>
                    <strong className="label-val text-slate">8%</strong>
                  </div>
                  <div className="breakdown-progress">
                    <div className="breakdown-fill" style={{ width: '8%', background: '#64748b' }}></div>
                  </div>
                  <span className="breakdown-caption">Independent third-party milestone verification and secure pharmaceutical transport.</span>
                </div>

                <div className="breakdown-item zero-overhead-item">
                  <div className="breakdown-bar-head">
                    <span className="label-title">Administrative & Platform Overhead</span>
                    <strong className="label-val text-muted">0% (Covered by Private Endowments)</strong>
                  </div>
                  <div className="breakdown-progress">
                    <div className="breakdown-fill" style={{ width: '0%', background: '#94a3b8' }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="allocation-callout">
              <div className="callout-seal">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="9 12 11 14 15 10"/>
                </svg>
                <h3>100% Giving Promise</h3>
              </div>
              <p>
                Every tax-deductible receipt generated includes a unique tracking number linked to the program treasury balance.
              </p>
              <div className="tax-badge-row">
                <span className="tax-chip">501(c)(3) Eligible</span>
                <span className="tax-chip">Audit Verified</span>
                <span className="tax-chip">Instant PDF Receipt</span>
              </div>
            </div>
          </div>
        </section>

        {/* Active Programs Receiving Grant Replenishment */}
        {campaigns && campaigns.length > 0 && (
          <section className="programs-directory-section">
            <div className="section-head text-center">
              <span className="badge badge-primary">Active Treasury Ledgers</span>
              <h2>Initiatives Currently Receiving Grant Allocations</h2>
              <p>
                Browse verified campaigns whose program funds are actively accepting donations from generous supporters like you.
              </p>
            </div>

            <div className="impact-campaigns-grid">
              {campaigns.map(c => {
                const percent = Math.min(100, Math.round(c.progressPercent || 0));
                return (
                  <div key={c.id} className="impact-program-card">
                    <div className="program-card-head">
                      <div>
                        <span className="program-type-tag">Active Grant Pool</span>
                        <h3>{c.name}</h3>
                        <span className="program-name-sub">Beneficiary: <strong>{c.programName}</strong></span>
                      </div>
                      <span className="badge badge-success">Verified</span>
                    </div>

                    <p className="program-desc">
                      {c.description ? (c.description.length > 130 ? c.description.slice(0, 130) + '...' : c.description) : 'Vital philanthropic funding for vetted grant applicants.'}
                    </p>

                    <div className="program-funding-row">
                      <div className="funding-stat">
                        <span className="stat-lbl">Total Disbursed & Raised</span>
                        <strong className="stat-num text-emerald">${(c.raisedAmount || 0).toLocaleString()}</strong>
                      </div>
                      <div className="funding-stat text-right">
                        <span className="stat-lbl">Target Treasury</span>
                        <strong className="stat-num text-slate">${(c.goalAmount || 0).toLocaleString()}</strong>
                      </div>
                    </div>

                    <div className="progress-container">
                      <div className="progress-bar-fill" style={{ width: `${Math.max(percent, 4)}%` }}></div>
                    </div>
                    <div className="progress-sub">
                      <span>{percent}% Funded</span>
                      <span>{c.donorCount || 0} Generous Supporters</span>
                    </div>

                    <div className="program-action-row">
                      <button onClick={() => onOpenDonate(c)} className="btn btn-accent btn-sm btn-block">
                        Donate to this Initiative
                      </button>
                      <Link to={`/campaign/${c.id}`} className="btn btn-secondary btn-sm">
                        View Wall
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Corporate Matching & Endowments CTA */}
        <section className="corporate-matching-banner">
          <div className="matching-content">
            <span className="badge badge-amber">Institutional Philanthropy</span>
            <h2>Corporate Matching & Grant Partnerships</h2>
            <p>
              Does your company match charitable donations? Double the impact of your support. We partner with corporate foundations to deliver audited, co-branded CSR grant programs with verifiable social ROI.
            </p>
            <div className="matching-btn-group">
              <button onClick={() => onOpenDonate()} className="btn btn-accent btn-lg">
                Make A Direct Gift
              </button>
              {!isLoggedIn ? (
                <button onClick={onOpenInquiry} className="btn btn-primary btn-lg">
                  Submit Institutional Inquiry
                </button>
              ) : (
                <Link to="/campaigns" className="btn btn-secondary btn-lg">
                  Explore Active Campaigns
                </Link>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
