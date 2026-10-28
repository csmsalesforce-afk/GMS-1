import React from 'react';
import './LiveImpactTicker.css';

const TICKER_ITEMS = [
  { id: 1, icon: '💚', type: 'Gift', text: 'Sarah M. contributed $250', initiative: 'Clean Water & Infrastructure', time: '2m ago' },
  { id: 2, icon: '⚡', type: 'Milestone', text: 'Milestone Disbursed: $18,400', initiative: 'Digital STEM Classrooms', time: '8m ago' },
  { id: 3, icon: '💧', type: 'Impact', text: '3,800 Liters of potable water dispatched', initiative: 'Arid Zone Project', time: '14m ago' },
  { id: 4, icon: '🌟', type: 'Gift', text: 'Vanguard Partners matched $5,000', initiative: 'Women & Child Welfare', time: '22m ago' },
  { id: 5, icon: '🏥', type: 'Healthcare', text: '120 Maternal Care Kits funded', initiative: 'Rural Health Initiative', time: '31m ago' },
  { id: 6, icon: '🛡️', type: 'Audit', text: 'Q3 Independent Ledger Reconciled: 100% Efficiency', initiative: 'GMS Treasury', time: '45m ago' }
];

export default function LiveImpactTicker() {
  return (
    <div className="live-ticker-container" aria-label="Real-time philanthropic activity stream">
      <div className="ticker-badge-lead">
        <span className="live-indicator-ring">
          <span className="live-beacon-core"></span>
        </span>
        <span className="ticker-lead-text">LIVE ACTIVITY</span>
      </div>

      <div className="ticker-track-viewport">
        <div className="ticker-track">
          {/* Double items for continuous seamless loop */}
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, index) => (
            <div key={`${item.id}-${index}`} className="ticker-item">
              <span className="ticker-emoji">{item.icon}</span>
              <span className="ticker-type-tag">{item.type}</span>
              <span className="ticker-body-text">{item.text}</span>
              <span className="ticker-divider">•</span>
              <span className="ticker-init-text">{item.initiative}</span>
              <span className="ticker-time-text">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
