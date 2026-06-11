import { LightningElement, wire, track } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import getApplication from '@salesforce/apex/GrantApplicationController1.getApplication';
import getApplicationFiles from '@salesforce/apex/GrantApplicationController1.getApplicationFiles';
import generatePdfAndSubmit from '@salesforce/apex/GrantApplicationController1.generatePdfAndSubmit';
import withdrawApplicationWithReason from '@salesforce/apex/GrantApplicationController1.withdrawApplicationWithReason';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class GrantApplicationDetails extends LightningElement {

    @track application;
    @track files = [];
    @track isLoading = true;
    @track showWithdrawModal = false;
    @track withdrawReason = '';

    recordId;

    /* =========================================================
       GET RECORD ID FROM URL
    ========================================================= */
    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference) {
            this.recordId = currentPageReference.state?.recordId;
            if (this.recordId) {
                this.loadApplication();
            }
        }
    }

    /* =========================================================
       LOAD APPLICATION + FILES
    ========================================================= */
    loadApplication() {
    this.isLoading = true;

    Promise.all([
        getApplication({ recordId: this.recordId }),
        getApplicationFiles({ recordId: this.recordId })
    ])
    .then(([applicationResult, filesResult]) => {

        this.application = applicationResult;

        this.files = filesResult.map(file => {
            return {
                ...file,
                formattedDate: this.formatDate(file.createdDate)
            };
        });

    })
    .catch(error => {
        console.error(error);
        this.showToast('Error', 'Error loading application details', 'error');
    })
    .finally(() => {
        this.isLoading = false;
    });
}

    /* =========================================================
       DATE FORMATTER
    ========================================================= */
    formatDate(dateStr) {
        if (!dateStr) return '';

        return new Intl.DateTimeFormat('en-IN', {
            year: 'numeric',
            month: 'short',
            day: '2-digit'
        }).format(new Date(dateStr));
    }

    /* =========================================================
       STATUS LOGIC
    ========================================================= */

    get showSubmitButton() {
        return this.application?.Application_Status__c === 'Submitted';
    }

    get showWithdrawButton() {
        const status = this.application?.Application_Status__c;

        return status === 'Under Internal Review'
            || status === 'Under External Review'
            || status === 'Revision Requested';
    }

    get isInApproval() {
        return this.showWithdrawButton;
    }

    get showReviewSection() {
        const status = this.application?.Application_Status__c;

        return status === 'Approved'
            || status === 'Rejected'
            || status === 'Under Internal Review'
            || status === 'Under External Review';
    }

    get isApproved() {
        return this.application?.Application_Status__c === 'Approved';
    }

    get statusClass() {
        const status = this.application?.Application_Status__c;

        const statusMap = {
            'Draft': 'status-badge draft',
            'Submitted': 'status-badge submitted',
            'Under Internal Review': 'status-badge internal-review',
            'Under External Review': 'status-badge external-review',
            'Revision Requested': 'status-badge revision',
            'Withdrawn': 'status-badge withdrawn',
            'Approved': 'status-badge approved',
            'Rejected': 'status-badge rejected'
        };

        return statusMap[status] || 'status-badge';
    }

    /* =========================================================
       FILE HELPERS
    ========================================================= */

    get hasFiles() {
        return this.files && this.files.length > 0;
    }

    handleDownload(event) {
    const documentId = event.currentTarget.dataset.id;

    window.open(
        `/sfc/servlet.shepherd/document/download/${documentId}`,
        '_blank'
    );
}

    /* =========================================================
       SUBMIT FOR APPROVAL
    ========================================================= */
    handleGenerateAndSubmit() {

        this.isLoading = true;

        generatePdfAndSubmit({ recordId: this.recordId })
            .then(() => {
                this.showToast('Success', 'Application submitted successfully', 'success');
                this.loadApplication();
            })
            .catch(error => {
                console.error(error);
                this.showToast(
                    'Error',
                    error?.body?.message || 'Submission failed',
                    'error'
                );
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    /* =========================================================
       WITHDRAW FLOW
    ========================================================= */

    openWithdrawModal() {
        this.showWithdrawModal = true;
    }

    closeWithdrawModal() {
        this.showWithdrawModal = false;
        this.withdrawReason = '';
    }

    handleReasonChange(event) {
        this.withdrawReason = event.target.value;
    }

    confirmWithdraw() {

        if (!this.withdrawReason) {
            this.showToast('Error', 'Please enter withdrawal reason', 'error');
            return;
        }

        this.isLoading = true;

        withdrawApplicationWithReason({
            recordId: this.recordId,
            reason: this.withdrawReason
        })
        .then(() => {
            this.showToast('Success', 'Application withdrawn successfully', 'success');
            this.closeWithdrawModal();
            this.loadApplication();
        })
        .catch(error => {
            console.error(error);
            this.showToast(
                'Error',
                error?.body?.message || 'Withdraw failed',
                'error'
            );
        })
        .finally(() => {
            this.isLoading = false;
        });
    }

    /* =========================================================
       TOAST HELPER
    ========================================================= */
    showToast(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({
                title,
                message,
                variant
            })
        );
    }
}