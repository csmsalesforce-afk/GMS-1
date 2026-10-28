import React, { useState, useEffect } from 'react';
import salesforceService from '../services/salesforceService';
import './MyGivingModal.css';

export default function MyGivingModal({ isOpen, onClose, onOpenDonate, onViewReceipt }) {
  const [loading, setLoading] = useState(true);
  const [givingData, setGivingData] = useState(null);
  const [activeTab, setActiveTab] = useState('recurring'); // 'recurring' | 'history'
  const [errorMsg, setErrorMsg] = useState('');
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelConfirmItem, setCancelConfirmItem] = useState(null);
  const [cancelError, setCancelError] = useState('');
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState('');

  const fetchGivingHistory = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await salesforceService.getDonorGivingHistory();
      if (res && res.error) {
        setErrorMsg(res.error);
      } else {
        setGivingData(res);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to retrieve giving history.');
    } finally {
      setLoading(false);
    }
  };

  const handlePromptCancel = (item) => {
    setCancelConfirmItem(item);
    setCancelError('');
    setCancelSuccessMsg('');
  };

  const handleConfirmCancel = async (item) => {
    if (!item?.id) return;
    setCancellingId(item.id);
    setCancelError('');
    try {
      const res = await salesforceService.cancelRecurringDonation(item.id);
      if (res && res.success) {
        setCancelSuccessMsg('Auto-pay has been successfully cancelled. Future deductions have been stopped.');
        setCancelConfirmItem(null);
        await fetchGivingHistory();
      } else {
        setCancelError(res?.error || 'Failed to cancel auto-pay.');
      }
    } catch (err) {
      setCancelError(err.message || 'Error stopping auto-pay.');
    } finally {
      setCancellingId(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchGivingHistory();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const recurringList = givingData?.recurringDonations || [];
  const oneTimeList = givingData?.oneTimeDonations || [];
  const totalDonated = Number(givingData?.totalDonated) || 0;
  const activeRecurringCount = Number(givingData?.activeRecurringCount) || 0;
  const initiativesCount = Number(givingData?.initiativesCount) || 0;

  const formatAmount = (amt) => {
    const num = typeof amt === 'number' ? amt : parseFloat(amt) || 0;
    return num.toFixed(2);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return String(dateStr);
    }
  };

  const handleOpenReceipt = (item) => {
    if (onViewReceipt) {
      onViewReceipt({
        donationId: item.id,
        receiptNumber: item.receiptNumber,
        amount: typeof item.amount === 'number' ? item.amount : parseFloat(item.amount) || 0,
        campaignName: item.campaignName,
        programName: item.programName,
        donorName: item.donorName,
        donorEmail: item.donorEmail,
        frequency: item.frequency,
        designation: item.designation,
        date: item.date,
        transactionRef: item.transactionRef
      });
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="giving-modal-card" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="giving-modal-header">
          <div>
            <span className="badge badge-emerald giving-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              Donor Portfolio
            </span>
            <h2 className="giving-modal-title">My Giving &amp; Recurring Pledges</h2>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close modal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Body */}
        <div className="giving-modal-body">
          {/* KPI Summary Cards */}
          <div className="giving-kpi-grid">
            <div className="giving-kpi-card">
              <span className="kpi-label">Total Impact Contributed</span>
              <span className="kpi-value">${totalDonated.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="kpi-subtext">Verified 501(c)(3) tax gifts</span>
            </div>

            <div className="giving-kpi-card highlight-card">
              <span className="kpi-label">Active Recurring Pledges</span>
              <div className="kpi-value-row">
                <span className="kpi-value">{activeRecurringCount}</span>
                {activeRecurringCount > 0 && <span className="active-pulse-pill">🟢 Active</span>}
              </div>
              <span className="kpi-subtext">Monthly &amp; Annual commitments</span>
            </div>

            <div className="giving-kpi-card">
              <span className="kpi-label">Initiatives Supported</span>
              <span className="kpi-value">{initiativesCount}</span>
              <span className="kpi-subtext">Community grant campaigns</span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="giving-tab-bar">
            <button
              type="button"
              className={`giving-tab-btn ${activeTab === 'recurring' ? 'active' : ''}`}
              onClick={() => setActiveTab('recurring')}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
              <span>Active Recurring Pledges ({recurringList.length})</span>
            </button>
            <button
              type="button"
              className={`giving-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              <span>All Contribution Receipts ({oneTimeList.length})</span>
            </button>
          </div>

          {/* Content Area */}
          {loading ? (
            <div className="giving-loading-state">
              <div className="spinner"></div>
              <span>Loading your giving portfolio from Salesforce...</span>
            </div>
          ) : errorMsg ? (
            <div className="giving-error-box">
              <span>{errorMsg}</span>
              <button type="button" onClick={fetchGivingHistory} className="btn btn-sm btn-secondary">
                Retry
              </button>
            </div>
          ) : activeTab === 'recurring' ? (
            /* Recurring Commitments Tab */
            <div className="giving-tab-content">
              {recurringList.length === 0 ? (
                <div className="giving-empty-state">
                  <div className="empty-icon-wrap">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                    </svg>
                  </div>
                  <h3>No Active Recurring Pledges</h3>
                  <p>
                    You currently have no recurring commitments. Setting up a monthly or annual pledge provides sustainable, dependable funding for urgent grant initiatives.
                  </p>
                  <button
                    type="button"
                    onClick={() => { onClose(); if (onOpenDonate) onOpenDonate(); }}
                    className="btn btn-accent btn-sm"
                  >
                    Start a Recurring Gift
                  </button>
                </div>
              ) : (
                <div className="recurring-pledges-list">
                  {cancelSuccessMsg && (
                    <div className="cancel-success-alert">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      <span>{cancelSuccessMsg}</span>
                    </div>
                  )}

                  {recurringList.map((item) => {
                    const freqStr = String(item.frequency || '');
                    const isYearly = freqStr.toLowerCase().includes('year') || freqStr.toLowerCase().includes('annual');
                    const isStopped = item.isCancelled || item.autoPayStatus === 'Cancelled';
                    return (
                      <div key={item.id} className={`recurring-pledge-card ${isStopped ? 'card-cancelled' : ''}`}>
                        <div className="pledge-card-top">
                          <div className="pledge-campaign-info">
                            <div className="pledge-pill-row">
                              <span className="pledge-cadence-pill">
                                {isYearly ? '📅 Annual Recurring' : '🗓️ Monthly Sustainer'}
                              </span>
                              <span className="pledge-duration-badge">
                                ⏱️ {item.duration || 'Ongoing'}
                              </span>
                            </div>
                            <h4 className="pledge-title">{item.campaignName}</h4>
                            <span className="pledge-program">Grant Fund: <strong>{item.programName || item.designation}</strong></span>
                          </div>

                          <div className="pledge-amount-col">
                            <span className="pledge-amount">${formatAmount(item.amount)}</span>
                            <span className="pledge-frequency-sub">{isYearly ? 'USD / Year' : 'USD / Month'}</span>
                          </div>
                        </div>

                        <div className="pledge-card-bottom">
                          <div className="pledge-meta-row">
                            {isStopped ? (
                              <span className="status-badge-cancelled">🔴 Auto-Pay Stopped</span>
                            ) : (
                              <span className="status-badge-active">🟢 Active Sustainer</span>
                            )}
                            <span className="meta-text">Started: <strong>{formatDate(item.date)}</strong></span>
                            {isStopped && (
                              <span className="meta-text" style={{ color: '#dc2626', fontWeight: 600 }}>• No Future Charges</span>
                            )}
                            {item.receiptNumber && (
                              <span className="meta-text">Receipt: <strong>{item.receiptNumber}</strong></span>
                            )}
                          </div>

                          <div className="pledge-action-buttons">
                            {!isStopped && (
                              <button
                                type="button"
                                onClick={() => handlePromptCancel(item)}
                                className="btn btn-outline-danger btn-xs stop-autopay-btn"
                                title="Cancel automatic renewal deductions"
                              >
                                Stop Auto-Pay
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleOpenReceipt(item)}
                              className="btn btn-outline btn-xs view-receipt-btn"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                              Tax Receipt
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* One-Time Giving & Receipts Tab */
            <div className="giving-tab-content">
              {oneTimeList.length === 0 ? (
                <div className="giving-empty-state">
                  <div className="empty-icon-wrap">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                      <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </div>
                  <h3>No One-Time Gifts Recorded</h3>
                  <p>When you make single contributions, your official IRS tax receipts and transaction references will be stored here.</p>
                  <button
                    type="button"
                    onClick={() => { onClose(); if (onOpenDonate) onOpenDonate(); }}
                    className="btn btn-primary btn-sm"
                  >
                    Donate to a Campaign
                  </button>
                </div>
              ) : (
                <div className="history-table-container">
                  <table className="giving-history-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Receipt #</th>
                        <th>Campaign &amp; Earmark</th>
                        <th>Type</th>
                        <th>Amount</th>
                        <th style={{ textAlign: 'right' }}>Receipt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {oneTimeList.map((item) => (
                        <tr key={item.id}>
                          <td className="table-date">{formatDate(item.date)}</td>
                          <td className="table-receipt-code">{item.receiptNumber || 'REC-VERIFIED'}</td>
                          <td>
                            <div className="table-campaign-name">{item.campaignName}</div>
                            <div className="table-program-name">{item.programName || item.designation}</div>
                          </td>
                          <td>
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              background: item.isRecurring ? '#ecfdf5' : '#f1f5f9',
                              color: item.isRecurring ? '#065f46' : '#475569',
                              border: `1px solid ${item.isRecurring ? '#a7f3d0' : '#cbd5e1'}`
                            }}>
                              {item.isRecurring ? 'Recurring' : 'One-Time'}
                            </span>
                          </td>
                          <td className="table-amount">${formatAmount(item.amount)}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenReceipt(item)}
                              className="btn btn-secondary btn-xs"
                              title="View & Print Official 501(c)(3) Receipt"
                            >
                              View Receipt
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="giving-modal-footer">
          <div className="footer-compliance-note">
            <span>🔒 Protected under IRS 501(c)(3) Nonprofit Philanthropy &amp; AML Regulations</span>
          </div>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>

        {/* Stop Auto-Pay Confirmation Modal Overlay */}
        {cancelConfirmItem && (
          <div className="cancel-confirm-backdrop">
            <div className="cancel-confirm-card">
              <div className="cancel-warn-icon">⚠️</div>
              <h4 className="cancel-confirm-title">Stop Automatic Renewal?</h4>
              <p className="cancel-confirm-desc">
                Are you sure you want to cancel the recurring auto-pay for <strong>{cancelConfirmItem.campaignName}</strong>?
              </p>
              <div className="cancel-warning-box">
                <div>• Automatic deductions of <strong>${formatAmount(cancelConfirmItem.amount)} USD</strong> will be cancelled immediately on Stripe.</div>
                <div>• No further charges will be made to your payment card.</div>
                <div>• All previous payments and official 501(c)(3) receipts remain fully valid and accessible in your history.</div>
              </div>
              {cancelError && <div className="cancel-error-alert">{cancelError}</div>}
              <div className="cancel-action-row">
                <button
                  type="button"
                  onClick={() => { setCancelConfirmItem(null); setCancelError(''); }}
                  className="btn btn-secondary btn-sm"
                  disabled={cancellingId === cancelConfirmItem.id}
                >
                  Keep Auto-Pay Active
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmCancel(cancelConfirmItem)}
                  className="btn btn-danger btn-sm"
                  disabled={cancellingId === cancelConfirmItem.id}
                >
                  {cancellingId === cancelConfirmItem.id ? 'Cancelling on Stripe...' : 'Yes, Cancel Auto-Pay'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
