import { LightningElement, wire, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import USER_ID from '@salesforce/user/Id';
import getUserName from '@salesforce/apex/NavbarController.getUserName';
import getCurrentUserProfile from '@salesforce/apex/ProfileFieldSetController.getCurrentUserProfile';
import InvoiceLogo from '@salesforce/resourceUrl/CSMLogo';

export default class NavbarComponent extends NavigationMixin(LightningElement) {

    logoUrl = InvoiceLogo;

    @track showDropdown = false;
    @track profileStatus;

    userId = USER_ID;
    userName;

    // ===== GET USER NAME =====
    @wire(getUserName)
    wiredUser({ data }) {
        if (data) {
            this.userName = data;
        }
    }

    // ===== GET PROFILE STATUS =====
    @wire(getCurrentUserProfile)
    wiredProfile({ data }) {
        if (data) {
            this.profileStatus = data.Profile_Status__c;
        }
    }

    get isLoggedIn() {
    return this.userId !== undefined && this.userId !== null;
}

    get userInitials() {
        if (!this.userName) return '';
        return this.userName
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase();
    }

    // ✔ Verified only if profile approved
    get isVerified() {
        return this.profileStatus === 'Approved';
    }

    toggleDropdown(event) {
        event.stopPropagation();
        this.showDropdown = !this.showDropdown;
    }

    connectedCallback() {
        this.handleClick = this.handleOutsideClick.bind(this);
        document.addEventListener('click', this.handleClick);
    }

    disconnectedCallback() {
        document.removeEventListener('click', this.handleClick);
    }

    handleOutsideClick() {
        this.showDropdown = false;
    }

    navigateHome() {
    if (this.isLoggedIn) {
        this.navigate('/landingpage');   // Dashboard page
    } else {
        this.navigate('/');              // Public home page
    }
}

    navigatePrograms() {
        this.navigate('/program-list');
    }

    navigateApplications() {
        this.navigate('/my-applications');
    }

    navigateProfile() {
        this.navigate('/profile-details');
    }

    navigateLogin() {
        this.navigate('/LoginCustom');
    }

    navigate(url) {
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: { url }
        });
    }

    handleLogout() {
    // 1. The clean URL of your custom login page (Error codes removed)
    const customLoginUrl = 'https://orgfarm-4e9caeff63-dev-ed.develop.my.site.com/gmsa/LoginCustom';
 
    // 2. The logout URL relative to your site path (/gmsa)
    // We encode the login URL to ensure special characters don't break the redirect
    window.location.href = '/gmsa/secur/logout.jsp?retUrl=' + encodeURIComponent(customLoginUrl);
}
get homeLabel() {
    return this.isLoggedIn ? 'Dashboard' : 'Home';
}
}