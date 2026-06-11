import { LightningElement, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import USER_ID from '@salesforce/user/Id';
import getUserName from '@salesforce/apex/NavbarController.getUserName';
import getProfileStatus from '@salesforce/apex/DashboardController.getProfileStatus';

export default class GemsDashboard extends NavigationMixin(LightningElement) {

    userId = USER_ID;
    userName;

    // =============================
    // UI State Variables
    // =============================
    @track profileCompletion = 0;
    @track bannerTitle = '';
    @track bannerMessage = '';
    @track showCreateButton = false;
    @track showExploreButton = false;
    @track showBanner = true;
    @track showPrograms = false;
    @track currentStatus = '';

    // =============================
    // Fetch Logged-In User Name
    // =============================
    @wire(getUserName)
    wiredUser({ data, error }) {
        if (data) {
            this.userName = data;
        } else if (error) {
            console.error('Error fetching username:', error);
        }
    }

    // =============================
    // Fetch Profile Status
    // =============================
    @wire(getProfileStatus)
    wiredProfile({ data, error }) {

        if (error) {
            console.error('Error fetching profile status:', error);
            return;
        }

        if (data === undefined) {
            return;
        }

        // Normalize status safely
        const status = data ? data.toLowerCase().trim() : null;
        this.currentStatus = status;

        // Reset UI first
        this.resetUI();

        // =============================
        // NO PROFILE CREATED
        // =============================
        if (!status) {

            this.profileCompletion = 0;

            this.bannerTitle =
                'Complete Your Profile to Unlock Grant Opportunities';

            this.bannerMessage =
                'Create your applicant profile to begin the grant application process.';

            this.showCreateButton = true;
            this.showBanner = true;
        }

        // =============================
        // PROFILE CREATED (Draft / Pending Submission)
        // =============================
        else if (status === 'pending') {

            this.profileCompletion = 50;

            this.bannerTitle =
                'Profile Created – Submission Required';

            this.bannerMessage =
                'Your profile has been saved successfully. Please click the “Submit for Approval” button in your profile to enter the verification process and become eligible to apply for grant programs.';

            this.showBanner = true;
        }

        // =============================
        // PROFILE IN APPROVAL
        // =============================
        else if (status === 'in approval') {

            this.profileCompletion = 100;

            this.bannerTitle =
                'Profile Under Verification';

            this.bannerMessage =
                'Your profile is currently under administrative review. You will be notified once verification is complete.';

            this.showBanner = true;
        }

        // =============================
        // PROFILE APPROVED
        // =============================
        else if (status === 'approved') {

            this.profileCompletion = 100;

            this.bannerTitle =
                '🎉 Profile Approved – You’re Ready to Apply!';

            this.bannerMessage =
                'Your profile has been successfully verified. You can now explore available grant programs and submit applications.';

            this.showExploreButton = true;
            this.showPrograms = true;
            this.showBanner = true;
        }

        // =============================
        // PROFILE NOT ELIGIBLE
        // =============================
        else if (status === 'not eligible') {

            this.profileCompletion = 100;

            this.bannerTitle =
                'Profile Not Eligible';

            this.bannerMessage =
                'After review, your profile does not meet the eligibility criteria required to apply for available grant programs at this time. Please contact the administrator for further clarification.';

            this.showBanner = true;
        }

        // =============================
        // Fallback Safety
        // =============================
        else {

            this.profileCompletion = 0;

            this.bannerTitle =
                'Complete Your Profile to Continue';

            this.bannerMessage =
                'Please complete and submit your profile to proceed.';

            this.showCreateButton = true;
            this.showBanner = true;
        }
    }

    // =============================
    // Reset UI Before Applying State
    // =============================
    resetUI() {
        this.profileCompletion = 0;
        this.bannerTitle = '';
        this.bannerMessage = '';
        this.showCreateButton = false;
        this.showExploreButton = false;
        this.showPrograms = false;
        this.showBanner = false;
    }

    // =============================
    // Dynamic Banner Styling
    // =============================
    get bannerClass() {

        if (this.currentStatus === 'not eligible') {
            return 'profile-banner error';
        }

        if (this.currentStatus === 'approved') {
            return 'profile-banner success';
        }

        if (this.profileCompletion === 50) {
            return 'profile-banner warning';
        }

        if (this.profileCompletion === 100) {
            return 'profile-banner success';
        }

        return 'profile-banner';
    }

    // =============================
    // Verified Badge Control
    // =============================
    get isApproved() {
        return this.currentStatus === 'approved';
    }

    // =============================
    // Progress Styling (CSS Variable)
    // =============================
    get progressStyle() {
        return `--progress: ${this.profileCompletion}`;
    }

    // =============================
    // Navigation Methods
    // =============================

    // Go to Create Profile Wizard
    handleCreateProfile() {
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: '/profile'
            }
        });
    }

    // Go to Program Listing Page
    handleExplorePrograms() {
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: '/program-list'
            }
        });
    }
    // =============================
// Show Important Note (Hide when Approved)
// =============================
get showImportantNote() {
    return this.currentStatus !== 'approved';
}
}