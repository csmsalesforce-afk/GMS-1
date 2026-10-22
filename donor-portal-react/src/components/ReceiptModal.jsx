import React from 'react';
import './ReceiptModal.css';

export default function ReceiptModal({ isOpen, onClose, receiptData }) {
  if (!isOpen || !receiptData) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = receiptData.date
    ? new Date(receiptData.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : new Date().toLocaleDateString();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="receipt-modal-card" onClick={e => e.stopPropagation()}>
        <div className="receipt-header-banner">
          <div className="success-icon-wrap">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <h2>Thank You For Your Generosity!</h2>
          <p>Your contribution has been successfully recorded and allocated to the grant program fund.</p>
        </div>

        {/* Printable Tax Receipt Paper */}
        <div className="receipt-paper" id="printable-tax-receipt">
          <div className="receipt-top-row">
            <div>
              <span className="receipt-org">GMS GLOBAL PHILANTHROPY</span>
              <span className="receipt-title">OFFICIAL DONATION RECEIPT</span>
              <span className="receipt-tax-id">IRS 501(c)(3) EIN: 84-2940182</span>
            </div>
            <div className="receipt-stamp">
              <span>PAID & VERIFIED</span>
            </div>
          </div>

          <div className="receipt-number-badge">
            <span>Receipt #:</span>
            <strong>{receiptData.receiptNumber || 'REC-8921-120'}</strong>
          </div>

          <div className="receipt-grid">
            <div className="receipt-field">
              <span className="field-label">Date & Time</span>
              <span className="field-value">{formattedDate}</span>
            </div>
            <div className="receipt-field">
              <span className="field-label">Payment Status</span>
              <span className="field-value status-paid">Completed / Settled</span>
            </div>
            <div className="receipt-field">
              <span className="field-label">Donor Name</span>
              <span className="field-value">{receiptData.donorName || 'Generous Donor'}</span>
            </div>
            <div className="receipt-field">
              <span className="field-label">Donor Email</span>
              <span className="field-value">{receiptData.donorEmail || 'receipt@donor.org'}</span>
            </div>
            <div className="receipt-field full-width">
              <span className="field-label">Designated Campaign</span>
              <span className="field-value font-medium">{receiptData.campaignName || 'General Giving'}</span>
            </div>
            {receiptData.programName && (
              <div className="receipt-field full-width">
                <span className="field-label">Beneficiary Grant Program</span>
                <span className="field-value">{receiptData.programName}</span>
              </div>
            )}
          </div>

          <div className="receipt-amount-box">
            <span>Total Charitable Contribution:</span>
            <span className="total-amount">${parseFloat(receiptData.amount || 0).toFixed(2)} USD</span>
          </div>

          <p className="tax-exemption-note">
            No goods or services were provided in exchange for this contribution other than intangible religious or charitable benefits. This official receipt satisfies IRS recordkeeping requirements for tax deductions.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="receipt-actions">
          <button onClick={handlePrint} className="btn btn-secondary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
            Print Tax Receipt
          </button>
          <button onClick={onClose} className="btn btn-primary">
            Done & Return
          </button>
        </div>
      </div>
    </div>
  );
}
