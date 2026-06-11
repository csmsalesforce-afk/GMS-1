import { LightningElement, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { CurrentPageReference, NavigationMixin } from 'lightning/navigation';

import getCurrentUserProfile from '@salesforce/apex/ProfileFieldSetController.getCurrentUserProfile';
import getFieldSetFields from '@salesforce/apex/ProfileFieldSetController.getFieldSetFields';
import submitProfileForApproval from '@salesforce/apex/ProfileFieldSetController.submitProfileForApproval';

export default class ProfileDetails extends NavigationMixin(LightningElement) {

    @track profileRec;
    @track fieldPaths = [];
    @track errorMessage;
    @track isSubmitting = false;

    recordId;

    fieldSetMap = {
        'Academic Institution': 'Academic_Institution',
        'Individual Applicant': 'Individual',
        'NGO': 'NGO',
        'Private Organisation': 'Private_Organisation'
    };

    // 🔹 Read recordId from URL
    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference) {
            this.recordId = currentPageReference.state?.recordId;
        }
    }

    connectedCallback() {
        this.loadProfile();
    }

    // ===============================
    // LOAD PROFILE
    // ===============================

    loadProfile() {

        getCurrentUserProfile({ recordId: this.recordId })
            .then(result => {

                if (!result) {
                    // No profile found → show empty state
                    this.profileRec = null;
                    return;
                }

                this.profileRec = result;

                if (result.Organization_Type__c) {

                    let fieldSetName = this.fieldSetMap[result.Organization_Type__c];

                    if (!fieldSetName) {
                        console.error('No fieldset mapping found.');
                        return;
                    }

                    return getFieldSetFields({ fieldSetName });
                }

            })
            .then(fields => {

                if (fields && fields.length > 0) {
                    this.fieldPaths = fields;
                } else {
                    this.fieldPaths = [];
                }

            })
            .catch(error => {
                console.error(error);
                this.errorMessage = 'Unexpected error occurred.';
            });
    }

    // ===============================
    // SUBMIT FOR APPROVAL
    // ===============================

    handleSubmitForApproval() {

        if (!this.profileRec?.Id) return;

        this.isSubmitting = true;

        submitProfileForApproval({ recordId: this.profileRec.Id })
            .then(() => {

                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Profile submitted for approval.',
                        variant: 'success'
                    })
                );

                this.loadProfile();

            })
            .catch(error => {

                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error',
                        message: error.body?.message || 'Submission failed.',
                        variant: 'error'
                    })
                );

            })
            .finally(() => {
                this.isSubmitting = false;
            });
    }

    // ===============================
    // NAVIGATE TO CREATE PROFILE
    // ===============================

    handleCreateProfile() {
        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: {
                name: 'profile__c'   // ⚠ Ensure this matches wizard page API name
            }
        });
    }

    // ===============================
    // UI STATE GETTERS
    // ===============================

    get hasProfile() {
        return this.profileRec != null;
    }

    get noProfile() {
        return !this.profileRec;
    }

    get isDraft() {
        return this.profileRec?.Profile_Status__c === 'Draft'
            || this.profileRec?.Profile_Status__c === 'Pending';
    }

    get isInApproval() {
        return this.profileRec?.Profile_Status__c === 'In Approval';
    }

    get isApproved() {
        return this.profileRec?.Profile_Status__c === 'Approved';
    }

    get isRejected() {
        return this.profileRec?.Profile_Status__c === 'Not Eligible';
    }
}