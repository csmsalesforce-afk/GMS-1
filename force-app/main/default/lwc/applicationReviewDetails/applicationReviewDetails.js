import { LightningElement, wire, track } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getApplicationDetails from '@salesforce/apex/ApplicationReviewController.getApplicationDetails';
import getFiles from '@salesforce/apex/ApplicationReviewController.getFiles';
import saveReviewerData from '@salesforce/apex/ApplicationReviewController.saveReviewerData'; 
import saveProgramOfficerData from '@salesforce/apex/ApplicationReviewController.saveProgramOfficerData'; 

export default class ApplicationReviewDetails extends LightningElement {
    applicationId;
    @track application;
    @track files = [];
    @track approvalHistory = [];
    
    userProfileName = '';
    decision;

    @track remarks = '';
    @track remarksRemainingChars = 50; 
    
    @track hasReviewerFinished = false; 
    @track hasPOFinished = false;

    // Reviewer Fields
    overallScore;

    // Program Officer Fields
    eligibilityScore;
    alignmentScore;
    budgetScore;
    fundingPriority = ''; // Fixed default value
    
    @track calculatedApprovalType = ''; 

    decisionOptions = [
        { label: 'Approve', value: 'Approve' },
        { label: 'Reject', value: 'Reject' }
    ];

    priorityOptions = [
        { label: 'High', value: 'High' },
        { label: 'Medium', value: 'Medium' },
        { label: 'Low', value: 'Low' }
    ];

    // =========================
    // 🔥 ROLE CHECKS
    // =========================
    get isReviewer() {
        return this.userProfileName === 'Reviewer';
    }

    get isProgramOfficer() {
        return this.userProfileName === 'Program Officer';
    }

    get isFinance() {
        return this.userProfileName === 'Financer' || this.userProfileName === 'Finance';
    }

    get showActionSection() {
        return this.isReviewer || this.isProgramOfficer || this.isFinance;
    }

    // =========================
    // UI STATE
    // =========================
    get showReviewerForm() {
        return this.isReviewer && !this.hasReviewerFinished;
    }

    get showReviewerReadOnly() {
        return this.isReviewer && this.hasReviewerFinished;
    }

    get showPOForm() {
        return this.isProgramOfficer && !this.hasPOFinished;
    }

    get showPOReadOnly() {
        return this.isProgramOfficer && this.hasPOFinished;
    }

    get inferredDecision() {
        return this.application?.Application_Status__c === 'Rejected' ? 'Reject' : 'Approve';
    }

    // =========================
    // PAGE LOAD
    // =========================
    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference) {
            this.applicationId = currentPageReference.state.appId;
            if (this.applicationId) {
                this.loadData();
            }
        }
    }

    loadData() {
        getApplicationDetails({ appId: this.applicationId })
            .then(result => {
                if (result && result.appRecord) {
                    this.application = result.appRecord;
                    this.userProfileName = result.currentUserProfile;

                    this.hasReviewerFinished = !!this.application.Reviewer_Score__c;
                    this.hasPOFinished = !!this.application.Eligibility_Score__c;

                    this.generateTimeline();
                } else {
                    this.showToast('Error', 'Application record not found.', 'error');
                }
            })
            .catch(error => {
                console.error('Application load error', error);
                let errorMsg = error.body ? error.body.message : error.message;
                this.showToast('Error Loading Data', errorMsg, 'error');
            });

        getFiles({ recordId: this.applicationId })
            .then(result => {
                this.files = result.map(file => ({
                    ...file,
                    downloadUrl: '/sfc/servlet.shepherd/version/download/' + file.ContentDocument.LatestPublishedVersionId
                }));
            })
            .catch(error => {
                console.error('File load error', error);
            });
    }

    // =========================
    // HANDLERS
    // =========================
    handleDecision(event) {
        this.decision = event.detail.value;
    }

    handleOverallScore(event) {
        this.overallScore = event.target.value;
    }

    handleEligibilityScore(event) {
        this.eligibilityScore = event.target.value;
    }

    handleAlignmentScore(event) {
        this.alignmentScore = parseInt(event.target.value, 10);

        if (this.alignmentScore === 5) this.calculatedApprovalType = 'Full Approval';
        else if (this.alignmentScore >= 3) this.calculatedApprovalType = 'Conditional Approval';
        else if (this.alignmentScore >= 1) this.calculatedApprovalType = 'Deferred';
        else this.calculatedApprovalType = '';
    }

    handleBudgetScore(event) {
        this.budgetScore = event.target.value;
    }

    handlePriority(event) {
        this.fundingPriority = event.detail.value;
    }

    handleRemarks(event) {
        this.remarks = event.target.value;
        this.remarksRemainingChars = 50 - this.remarks.length;
    }

    // =========================
    // REVIEWER SUBMIT
    // =========================
    handleReviewerSubmit() {
        if (!this.decision || !this.overallScore || !this.remarks) {
            return this.showToast('Error', 'Please fill all required fields.', 'error');
        }

        if (this.overallScore < 0 || this.overallScore > 100) {
            return this.showToast('Error', 'Score must be 0-100.', 'error');
        }

        saveReviewerData({
            appId: this.applicationId,
            decision: this.decision,
            score: parseFloat(this.overallScore),
            remarks: this.remarks
        })
        .then(() => {
            this.showToast('Success', 'Review submitted successfully.', 'success');

            this.application = {
                ...this.application,
                Application_Status__c: this.decision === 'Approve' ? 'Under External Review' : 'Rejected',
                Reviewer_Score__c: this.overallScore,
                Reviewer_Comments__c: this.remarks
            };

            this.hasReviewerFinished = true;
            this.generateTimeline();
        })
        .catch(err => {
            console.error(err);
            this.showToast('Error', err.body ? err.body.message : 'Failed to save data.', 'error');
        });
    }

    // =========================
    // PROGRAM OFFICER SUBMIT
    // =========================
    handlePOSubmit() {
        if (!this.decision || !this.eligibilityScore || !this.alignmentScore || !this.budgetScore || !this.fundingPriority || !this.remarks) {
            return this.showToast('Error', 'Please fill all required fields.', 'error');
        }

        saveProgramOfficerData({
            appId: this.applicationId,
            decision: this.decision,
            eligScore: parseFloat(this.eligibilityScore),
            alignScore: parseFloat(this.alignmentScore),
            budgetScore: parseFloat(this.budgetScore),
            priority: this.fundingPriority,
            approvalType: this.calculatedApprovalType,
            remarks: this.remarks
        })
        .then(() => {
            this.showToast('Success', 'Submission successful.', 'success');

            this.application = {
                ...this.application,
                Application_Status__c: 'Revision Requested',
                Eligibility_Score__c: this.eligibilityScore,
                Program_Alignment_Score__c: this.alignmentScore,
                Approval_Type__c: this.calculatedApprovalType,
                Funding_Priority__c: this.fundingPriority,
                External_Reviewer_Comments__c: this.remarks
            };

            this.hasPOFinished = true;
            this.generateTimeline();
        })
        .catch(error => {
            console.error(error);
            this.showToast('Error', error?.body?.message || error.message, 'error');
        });
    }

    // =========================
    // TIMELINE
    // =========================
    generateTimeline() {
        let history = [];

        history.push({
            id: '3',
            status: 'Pending',
            roleName: 'Level 3 Approval – Finance',
            icon: 'utility:clock',
            iconVariant: 'warning',
            date: ''
        });

        // Program Officer
        if (this.hasPOFinished) {
            let isReject = this.application.Application_Status__c === 'Rejected';
            history.push({
                id: '2',
                status: isReject ? 'Reject' : 'Approve',
                roleName: 'Level 2 Approval – Program Officer',
                icon: isReject ? 'utility:error' : 'utility:success',
                iconVariant: isReject ? 'error' : 'success',
                
                isPO: true, // Specific flag for the HTML
                eligibilityScore: this.application.Eligibility_Score__c,
                alignmentScore: this.application.Program_Alignment_Score__c,
                approvalType: this.application.Approval_Type__c,
                fundingPriority: this.application.Funding_Priority__c,
                remarks: this.application.External_Reviewer_Comments__c,
                
                date: 'Completed'
            });
        } else {
            history.push({
                id: '2',
                status: 'Pending',
                roleName: 'Level 2 Approval – Program Officer',
                icon: 'utility:clock',
                iconVariant: 'warning',
                date: this.isProgramOfficer ? '⏳ Action Required' : ''
            });
        }

        // Reviewer
        if (this.hasReviewerFinished) {
            let revDecision = (this.application.Application_Status__c === 'Rejected' && !this.hasPOFinished) ? 'Reject' : 'Approve';
            history.push({
                id: '1',
                status: revDecision,
                roleName: 'Level 1 Approval – Reviewer',
                icon: revDecision === 'Reject' ? 'utility:error' : 'utility:success',
                iconVariant: revDecision === 'Reject' ? 'error' : 'success',
                
                isReviewerStep: true, // Specific flag for HTML
                score: this.application.Reviewer_Score__c,
                remarks: this.application.Reviewer_Comments__c,
                
                date: 'Completed'
            });
        } else {
            history.push({
                id: '1',
                status: 'Pending',
                roleName: 'Level 1 Approval – Reviewer',
                icon: 'utility:clock',
                iconVariant: 'warning',
                date: this.isReviewer ? '⏳ Action Required' : ''
            });
        }

        // Submitted
        history.push({
            id: '0',
            status: 'Submitted',
            roleName: 'Application – ' + (this.application?.Account__r?.Name || 'Applicant'),
            icon: 'utility:edit',
            iconVariant: 'info',
            date: this.formatDate(this.application?.Submission_Date__c)
        });

        this.approvalHistory = history;
    }

    formatDate(dateString) {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).replace(',', '');
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}