import { LightningElement, track } from 'lwc';
import getDonorAgreements from '@salesforce/apex/DonorDashboardController.getDonorAgreements';
import getFundingRequests from '@salesforce/apex/DonorDashboardController.getFundingRequests';
import updateAgreementStatus from '@salesforce/apex/DonorDashboardController.updateAgreementStatus';
import updateFundingRequest from '@salesforce/apex/DonorDashboardController.updateFundingRequest';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class DonorDashboard extends LightningElement {

    @track agreements = [];
    @track fundingRequests = [];
    @track selectedAgreement = null;
    @track selectedFundingRequest = null;
    @track isLoading = false;
    
    @track currentMainTab = 'agreements';
    @track currentSubTab = 'pending';
    @track currentFRSubTab = 'pending';

    connectedCallback() {
        this.loadData();
    }

    async loadData() {
        this.isLoading = true;
        try {
            const [agreementsResult, fundingResult] = await Promise.all([
                getDonorAgreements(),
                getFundingRequests()
            ]);
            this.agreements = agreementsResult || [];
            this.fundingRequests = fundingResult || [];
        } catch (error) {
            this.showToast('Error', this.getError(error), 'error');
        } finally {
            this.isLoading = false;
        }
    }

    // 🔷 MAIN TAB
    get showAgreements() {
        return this.currentMainTab === 'agreements';
    }

    get showFundingRequests() {
        return this.currentMainTab === 'fundingRequests';
    }

    get agreementsTabClass() {
        return this.currentMainTab === 'agreements' ? 'active' : '';
    }

    get fundingRequestsTabClass() {
        return this.currentMainTab === 'fundingRequests' ? 'active' : '';
    }

    handleAgreementsTab() {
        this.currentMainTab = 'agreements';
        this.selectedAgreement = null;
        this.selectedFundingRequest = null;
    }

    handleFundingRequestsTab() {
        this.currentMainTab = 'fundingRequests';
        this.selectedAgreement = null;
        this.selectedFundingRequest = null;
    }

    // 🔷 SUB TAB
    get showPendingAgreements() {
        return this.currentSubTab === 'pending';
    }

    get showActiveAgreements() {
        return this.currentSubTab === 'active';
    }

    handlePendingSubTab() {
        this.currentSubTab = 'pending';
    }

    handleActiveSubTab() {
        this.currentSubTab = 'active';
    }

    // 🔷 FUNDING REQUEST SUB TAB NAVIGATION
    get showPendingFundingRequests() {
        return this.currentFRSubTab === 'pending';
    }

    get showReviewedFundingRequests() {
        return this.currentFRSubTab === 'reviewed';
    }

    get pendingFRSubTabClass() {
        return this.currentFRSubTab === 'pending' ? 'active' : '';
    }

    get reviewedFRSubTabClass() {
        return this.currentFRSubTab === 'reviewed' ? 'active' : '';
    }

    handlePendingFRSubTab() {
        this.currentFRSubTab = 'pending';
    }

    handleReviewedFRSubTab() {
        this.currentFRSubTab = 'reviewed';
    }

    // 🔷 LOGOUT
    handleLogout() {
        // Redirect to logout URL for Experience Cloud
        const logoutUrl = window.location.origin + '/secur/logout.jsp';
        window.location.href = logoutUrl;
    }

    // 🔷 FILTERS
    get pendingAgreements() {
        return this.agreements.filter(a =>
            ['Draft', 'Pending'].includes(a.Status__c)
        );
    }

    get respondedAgreements() {
        return this.agreements.filter(a =>
            ['Active', 'Approved', 'Rejected'].includes(a.Status__c)
        );
    }

    get pendingFundingRequests() {
        return this.fundingRequests.filter(fr =>
            fr.Status__c === 'Pending'
        );
    }

    get reviewedFundingRequests() {
        return this.fundingRequests.filter(fr =>
            ['Approved', 'Rejected'].includes(fr.Status__c)
        );
    }

    // 🔷 SELECT
    handleAgreementClick(event) {
        const id = event.currentTarget.dataset.id;
        this.selectedAgreement = this.agreements.find(a => a.Id === id);
    }

    handleBack() {
        this.selectedAgreement = null;
    }

    handleFundingRequestClick(event) {
        const id = event.currentTarget.dataset.id;
        this.selectedFundingRequest = this.fundingRequests.find(fr => fr.Id === id);
    }

    handleBackFromFundingRequest() {
        this.selectedFundingRequest = null;
    }

    get isSelectedPending() {
        return ['Draft', 'Pending'].includes(this.selectedAgreement?.Status__c);
    }

    get isFundingRequestPending() {
        return this.selectedFundingRequest?.Status__c === 'Pending';
    }

    // 🔷 AGREEMENT ACTIONS
    async updateStatus(id, action) {
        this.isLoading = true;
        try {
            const result = await updateAgreementStatus({ agreementId: id, action });

            if (result === 'SUCCESS') {
                this.showToast('Success', `Agreement ${action} successfully`, 'success');
                await this.loadData();
                this.selectedAgreement = null;
            } else if (result === 'NOT_IN_APPROVAL') {
                this.showToast('Error', 'This agreement is not in an approval process', 'error');
            } else if (result === 'NOT_ASSIGNED') {
                this.showToast('Error', 'You are not assigned to approve this agreement', 'error');
            } else {
                this.showToast('Error', 'Unable to process approval', 'error');
            }

        } catch (error) {
            this.showToast('Error', this.getError(error), 'error');
        } finally {
            this.isLoading = false;
        }
    }

    handleApprove(e) {
        this.updateStatus(e.currentTarget.dataset.id, 'Approved');
    }

    handleReject(e) {
        this.updateStatus(e.currentTarget.dataset.id, 'Rejected');
    }

    // 🔷 FUNDING REQUEST ACTIONS (FIXED 🚀)
    async handleApproveFundingRequest(e) {
        const id = e.currentTarget.dataset.id;
        await this.updateFundingRequestStatus(id, 'approve');
    }

    async handleRejectFundingRequest(e) {
        const id = e.currentTarget.dataset.id;
        await this.updateFundingRequestStatus(id, 'reject');
    }

    async updateFundingRequestStatus(id, action) {
        this.isLoading = true;
        try {
            await updateFundingRequest({ requestId: id, action: action });
            this.showToast('Success', `Funding request ${action}d successfully`, 'success');
            await this.loadData();
            this.selectedFundingRequest = null;
        } catch (error) {
            this.showToast('Error', this.getError(error), 'error');
        } finally {
            this.isLoading = false;
        }
    }

    // 🔷 UTILS
    getError(error) {
        return error?.body?.message || error?.message || 'Something went wrong';
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}