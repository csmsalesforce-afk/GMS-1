import { LightningElement, wire, track } from 'lwc';
import { CurrentPageReference, NavigationMixin } from 'lightning/navigation';
import getProgramById from '@salesforce/apex/GrantProgramsController.getProgramById';
import getProfileStatus from '@salesforce/apex/GrantApplicationController1.getProfileStatus';

export default class GrantProgramDetails extends NavigationMixin(LightningElement) {

    programId;
    program = {};
    eligibilities = [];
    documents = [];   // 👈 ADD THIS
    error;

    @track isApplyDisabled = true;
    @track applyMessage = '';
    @track showProfileButton = false;
    @track profileButtonLabel = '';

    // ================= GET PROGRAM ID FROM URL =================
    @wire(CurrentPageReference)
    setCurrentPageReference(pageRef) {
        if (pageRef && pageRef.state) {
            this.programId = pageRef.state.programId;
        }
    }

    // ================= LOAD PROGRAM + ELIGIBILITY =================
    @wire(getProgramById, { programId: '$programId' })
    wiredProgram({ data, error }) {
        if (data) {
    this.program = data.program;
    this.eligibilities = data.eligibilities || [];
    this.documents = data.documents || [];
} else if (error) {
            this.error = error;
            console.error('Error fetching program:', error);
        }
    }

    // ================= CHECK PROFILE STATUS =================
    async connectedCallback() {
        try {

            const status = await getProfileStatus();

            switch(status) {

                case 'NO_PROFILE':
                    this.isApplyDisabled = true;
                    this.applyMessage = 'Please create your profile before applying.';
                    this.showProfileButton = true;
                    this.profileButtonLabel = 'Create Profile';
                    break;

                case 'Pending':
                    this.isApplyDisabled = true;
                    this.applyMessage = 'Please submit your profile for approval before applying.';
                    this.showProfileButton = true;
                    this.profileButtonLabel = 'Complete Profile';
                    break;

                case 'Submitted':
                case 'In Approval':
                    this.isApplyDisabled = true;
                    this.applyMessage = 'Your profile is under review. You can apply once approved.';
                    this.showProfileButton = false;
                    break;

                case 'Not Eligible':
                    this.isApplyDisabled = true;
                    this.applyMessage = 'Your profile was rejected. Please update and resubmit.';
                    this.showProfileButton = true;
                    this.profileButtonLabel = 'Update Profile';
                    break;

                case 'Approved':
                    this.isApplyDisabled = false;
                    this.applyMessage = '';
                    this.showProfileButton = false;
                    break;

                default:
                    this.isApplyDisabled = true;
                    this.applyMessage = 'Profile verification required.';
            }

        } catch (error) {
            console.error('Profile status error:', error);
        }
    }

    // ================= TAB SWITCH =================
    handleTabClick(event) {
        const tabs = this.template.querySelectorAll('.tab');
        tabs.forEach(tab => tab.classList.remove('active'));
        event.currentTarget.classList.add('active');
    }

    // ================= NAVIGATION =================
    goBack() {
        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: {
                name: 'programlist__c'
            }
        });
    }

    openApplication() {

        if (this.isApplyDisabled) {
            return;
        }

        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: {
                name: 'Grant_Application__c'
            },
            state: {
                programId: this.programId
            }
        });
    }

    navigateToProfile() {
        this[NavigationMixin.Navigate]({
            type: 'comm__namedPage',
            attributes: {
                name: 'profile_details__c'
            }
        });
    }
}