import React, { useState } from 'react';
import TiltCard from './TiltCard';
import './ImpactCalculator.css';

const CAUSES = [
  {
    id: 'water',
    name: 'Clean Water & Wells',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
    ),
    headline: 'Providing Verified Safe Drinking Water to Communities in Need',
    milestoneNote: 'Milestone escrow: Funds released upon independent water flow audits, bio-sand filter deployment, and authenticated GPS telemetry.',
    calculateMetrics: (amt, isMonthly) => {
      const annual = isMonthly ? amt * 12 : amt;
      const liters = Math.round(annual * 65);
      const families = Math.max(1, Math.round(annual / 25));
      const filters = Math.max(1, Math.round(annual / 80));
      return [
        { label: 'Potable Drinking Water', value: `${liters.toLocaleString()} L`, icon: '💧' },
        { label: 'Families Supplied', value: `${families} Families`, icon: '👨‍👩‍👧' },
        { label: 'Community Water Filters', value: `${filters} Units`, icon: '🚰' },
        { label: 'Milestone Release', value: '100% Audited', icon: '🛡️' }
      ];
    }
  },
  {
    id: 'education',
    name: 'Education & STEM',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10M6 10h10"/></svg>
    ),
    headline: 'Equipping Underserved Classrooms with STEM Curriculum and Tools',
    milestoneNote: 'Disbursement tranches are issued upon verified student attendance logs, device serial reconciliation, and accredited teacher reports.',
    calculateMetrics: (amt, isMonthly) => {
      const annual = isMonthly ? amt * 12 : amt;
      const students = Math.max(1, Math.round(annual / 20));
      const hours = Math.round(annual * 1.5);
      const kits = Math.max(1, Math.round(annual / 50));
      return [
        { label: 'Students Equipped', value: `${students} Students`, icon: '🎓' },
        { label: 'STEM Training Hours', value: `${hours} Hours`, icon: '⏱️' },
        { label: 'Learning Lab Kits', value: `${kits} Kits`, icon: '💻' },
        { label: 'Verified Attendance', value: '100% Tracked', icon: '📝' }
      ];
    }
  },
  {
    id: 'health',
    name: 'Healthcare & Medicine',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
    ),
    headline: 'Supplying Maternal Care, Specialized Surgery & Critical Clinics',
    milestoneNote: 'Grants disbursed directly to accredited regional healthcare facilities following validated patient treatment records.',
    calculateMetrics: (amt, isMonthly) => {
      const annual = isMonthly ? amt * 12 : amt;
      const visits = Math.max(1, Math.round(annual / 15));
      const bundles = Math.max(1, Math.round(annual / 40));
      const vaccines = Math.round(annual * 2.2);
      return [
        { label: 'Clinical Checkups', value: `${visits} Consultations`, icon: '🩺' },
        { label: 'Maternal Care Bundles', value: `${bundles} Kits`, icon: '👶' },
        { label: 'Essential Vaccines/Meds', value: `${vaccines} Doses`, icon: '💊' },
        { label: 'Hospital Settlement', value: 'Direct Verified', icon: '🏥' }
      ];
    }
  },
  {
    id: 'emergency',
    name: 'Emergency & Food Relief',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    ),
    headline: 'Rapid Deployment of Warm Meals, Medical Aid & Emergency Shelter',
    milestoneNote: 'Mobilized within 24 hours of declared disasters through vetted frontline relief partners with receipted delivery.',
    calculateMetrics: (amt, isMonthly) => {
      const annual = isMonthly ? amt * 12 : amt;
      const meals = Math.round(annual * 3.5);
      const shelterDays = Math.max(1, Math.round(annual / 25));
      const emergencyPacks = Math.max(1, Math.round(annual / 60));
      return [
        { label: 'Emergency Warm Meals', value: `${meals.toLocaleString()} Meals`, icon: '🍲' },
        { label: 'Shelter Protection Days', value: `${shelterDays} Days`, icon: '⛺' },
        { label: 'Rapid Crisis Packs', value: `${emergencyPacks} Packs`, icon: '📦' },
        { label: 'Rapid Dispatch Speed', value: '< 24 Hours', icon: '⚡' }
      ];
    }
  },
  {
    id: 'general',
    name: 'General Grant Pool',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
    ),
    headline: 'Directly Expanding Grant Capacity for the Most Urgent Vetted Causes',
    milestoneNote: '100% of capital replenishes the central grant disbursement pool, funding the highest-ranked milestone proposals.',
    calculateMetrics: (amt, isMonthly) => {
      const annual = isMonthly ? amt * 12 : amt;
      return [
        { label: 'Grant Pool Addition', value: `$${annual.toLocaleString()} USD`, icon: '💵' },
        { label: 'Administrative Deduction', value: '$0.00 (Zero)', icon: '🛡️' },
        { label: 'Milestone Oversight', value: '4-Stage Review', icon: '🔍' },
        { label: 'IRS Tax Deduction', value: 'Instant Receipt', icon: '📜' }
      ];
    }
  }
];

const PRESETS = [25, 50, 100, 250, 500, 1000];

export default function ImpactCalculator({ onDonateAmount, campaigns = [] }) {
  const [selectedCauseId, setSelectedCauseId] = useState('water');
  const [frequency, setFrequency] = useState('one-time'); // 'one-time' | 'monthly'
  const [amount, setAmount] = useState(100);
  const [customInput, setCustomInput] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [isDedicated, setIsDedicated] = useState(false);
  const [dedicationName, setDedicationName] = useState('');

  const activeCause = CAUSES.find(c => c.id === selectedCauseId) || CAUSES[0];
  const isMonthly = frequency === 'monthly';
  const effectiveAmount = isCustom ? (Number(customInput) || 0) : amount;
  const metrics = activeCause.calculateMetrics(effectiveAmount, isMonthly);

  const handlePresetClick = (preset) => {
    setIsCustom(false);
    setCustomInput('');
    setAmount(preset);
  };

  const handleCustomChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setCustomInput(val);
    setIsCustom(true);
    setAmount(Number(val) || 0);
  };

  const handleDonateClick = () => {
    // Locate campaign corresponding to chosen cause if available
    let targetCampaign = null;
    if (campaigns && campaigns.length > 0) {
      if (selectedCauseId === 'water') {
        targetCampaign = campaigns.find(c => (c.name + ' ' + (c.programType || '')).toLowerCase().includes('water'));
      } else if (selectedCauseId === 'education') {
        targetCampaign = campaigns.find(c => (c.name + ' ' + (c.programType || '')).toLowerCase().includes('education') || (c.name + '').toLowerCase().includes('stem') || (c.name + '').toLowerCase().includes('class'));
      } else if (selectedCauseId === 'health') {
        targetCampaign = campaigns.find(c => (c.name + ' ' + (c.programType || '')).toLowerCase().includes('health') || (c.name + '').toLowerCase().includes('medical'));
      } else if (selectedCauseId === 'emergency') {
        targetCampaign = campaigns.find(c => (c.name + ' ' + (c.programType || '')).toLowerCase().includes('relief') || (c.name + '').toLowerCase().includes('emergency'));
      }
      if (!targetCampaign) targetCampaign = campaigns[0];
    }

    if (onDonateAmount) {
      onDonateAmount(effectiveAmount || 100, targetCampaign, frequency);
    }
  };

  return (
    <section className="impact-calculator-section" aria-label="Philanthropic Impact Calculator">
      <div className="container">
        {/* Section Header */}
        <div className="calc-header text-center">
          <div className="calc-badge-wrap">
            <span className="calc-pill">
              <span className="pulse-dot-green"></span>
              Verifiable Giving Calculator
            </span>
          </div>
          <h2>Calculate Your Direct Real-World Impact</h2>
          <p>
            Choose a philanthropic cause and donation frequency to see exactly how your contribution is deployed into verified, milestone-backed program grant pools.
          </p>
        </div>

        {/* Cause Track Selector Tabs */}
        <div className="cause-selector-tabs" role="tablist" aria-label="Select Giving Cause">
          {CAUSES.map((cause) => {
            const isSelected = cause.id === selectedCauseId;
            return (
              <button
                key={cause.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedCauseId(cause.id)}
                className={`cause-tab-btn ${isSelected ? 'active' : ''}`}
              >
                <span className="cause-tab-icon">{cause.icon}</span>
                <span className="cause-tab-name">{cause.name}</span>
                {isSelected && <span className="cause-tab-indicator"></span>}
              </button>
            );
          })}
        </div>

        {/* Main Interactive Grid */}
        <div className="calc-interactive-grid">
          {/* Left Column: Giving Configuration Card */}
          <TiltCard className="calc-config-card-tilt" maxTilt={5}>
            <div className="calc-config-card">
              <div className="config-card-header">
                <div>
                  <span className="config-kicker">STEP 1: CHOOSE FREQUENCY & AMOUNT</span>
                  <h3>Configure Your Gift</h3>
                </div>
                <div className="tax-501c3-badge">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>501(c)(3) Deductible</span>
                </div>
              </div>

              {/* Giving Frequency Switcher */}
              <div className="frequency-toggle-wrapper">
                <button
                  type="button"
                  onClick={() => setFrequency('one-time')}
                  className={`freq-btn ${frequency === 'one-time' ? 'active' : ''}`}
                >
                  One-Time Gift
                </button>
                <button
                  type="button"
                  onClick={() => setFrequency('monthly')}
                  className={`freq-btn ${frequency === 'monthly' ? 'active' : ''}`}
                >
                  <span>Monthly Giving</span>
                  <span className="freq-popular-tag">Sustained Impact</span>
                </button>
              </div>

              {isMonthly && (
                <div className="monthly-multiplier-banner">
                  <span className="multiplier-icon">⚡</span>
                  <div>
                    <strong>Sustaining Impact Member:</strong>
                    <span> Your monthly pledge guarantees consistent funding for ongoing recipient milestones over 12 months.</span>
                  </div>
                </div>
              )}

              {/* Amount Preset Chips */}
              <div className="amount-selection-area">
                <label className="amount-label">Select Amount:</label>
                <div className="preset-chips-grid">
                  {PRESETS.map((p) => {
                    const isSelected = !isCustom && amount === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handlePresetClick(p)}
                        className={`preset-chip ${isSelected ? 'active' : ''}`}
                      >
                        ${p}
                        {isMonthly && <span className="per-month-sub">/mo</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Amount Field */}
                <div className={`custom-amount-wrap ${isCustom ? 'active' : ''}`}>
                  <span className="currency-prefix">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter custom gift amount..."
                    value={customInput}
                    onChange={handleCustomChange}
                    className="custom-amount-input"
                  />
                  {isMonthly && <span className="custom-suffix">USD / month</span>}
                </div>
              </div>

              {/* Dedication Option */}
              <div className="dedication-toggle-block">
                <label className="dedication-checkbox-label">
                  <input
                    type="checkbox"
                    checked={isDedicated}
                    onChange={(e) => setIsDedicated(e.target.checked)}
                  />
                  <span>Dedicate this gift in honor or memory of someone</span>
                </label>
                {isDedicated && (
                  <input
                    type="text"
                    placeholder="Honoree full name (e.g., In Memory of Eleanor Vance)"
                    value={dedicationName}
                    onChange={(e) => setDedicationName(e.target.value)}
                    className="dedication-text-input"
                  />
                )}
              </div>

              {/* CTA Button */}
              <div className="config-cta-block">
                <button
                  type="button"
                  onClick={handleDonateClick}
                  className="btn btn-accent btn-lg calc-proceed-btn"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                  {isMonthly
                    ? `Give $${effectiveAmount || 100}/mo to ${activeCause.name}`
                    : `Donate $${effectiveAmount || 100} to ${activeCause.name}`}
                </button>
                <div className="guarantee-row">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  <span>100% of gift added to Treasury • $0 Platform Fees Deducted</span>
                </div>
              </div>
            </div>
          </TiltCard>

          {/* Right Column: Tangible Cause-Specific Impact Output */}
          <TiltCard className="calc-impact-card-tilt" maxTilt={5}>
            <div className="calc-impact-card">
              <div className="impact-card-header">
                <div className="cause-icon-pill">
                  {activeCause.icon}
                  <span>{activeCause.name}</span>
                </div>
                <div className="amount-recap-badge">
                  <span>Target: </span>
                  <strong>${effectiveAmount || 100}</strong>
                  {isMonthly && <span className="mo-tag">/mo</span>}
                </div>
              </div>

              <h4 className="cause-headline">{activeCause.headline}</h4>
              <p className="cause-milestone-text">{activeCause.milestoneNote}</p>

              {/* Tangible Metrics Grid */}
              <div className="cause-metrics-grid">
                {metrics.map((m, idx) => (
                  <div key={idx} className="cause-metric-box">
                    <span className="metric-emoji">{m.icon}</span>
                    <div className="metric-text-wrap">
                      <strong className="metric-primary-val">{m.value}</strong>
                      <span className="metric-primary-lbl">{m.label}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Milestone Assurance Seal */}
              <div className="milestone-assurance-box">
                <div className="assurance-check-icon">✓</div>
                <div className="assurance-text">
                  <strong>Milestone-Gated Disbursement Assurance</strong>
                  <p>
                    Unlike standard crowdfunding, funds remain locked in escrow until our grant evaluation committee verifies receipts and implementation milestones.
                  </p>
                </div>
              </div>

              <div className="tax-receipt-assurance">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                <span>Automated IRS 501(c)(3) tax receipt with serial verification sent instantly.</span>
              </div>
            </div>
          </TiltCard>
        </div>
      </div>
    </section>
  );
}
