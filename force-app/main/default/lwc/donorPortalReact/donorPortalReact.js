import { LightningElement, wire } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import isGuest from '@salesforce/user/isGuest';
import DONOR_PORTAL from '@salesforce/resourceUrl/donorPortalApp';
import CSM_LOGO from '@salesforce/resourceUrl/CSMLogo';
import INVOICE_LOGO from '@salesforce/resourceUrl/InvoiceLogo';
import getUserName from '@salesforce/apex/NavbarController.getUserName';
import getCurrentUserProfile from '@salesforce/apex/ProfileFieldSetController.getCurrentUserProfile';
import getFieldSetMetadata from '@salesforce/apex/ProfileFieldSetController.getFieldSetMetadata';
import createProfileApex from '@salesforce/apex/CreateProfileController.createProfile';
import submitProfileForApprovalApex from '@salesforce/apex/ProfileFieldSetController.submitProfileForApproval';
import getActiveDonorCampaigns from '@salesforce/apex/ProfileFieldSetController.getActiveDonorCampaigns';
import createDonation from '@salesforce/apex/ProfileFieldSetController.createDonation';
import getDonorDashboardSummary from '@salesforce/apex/ProfileFieldSetController.getDonorDashboardSummary';

export default class DonorPortalReact extends LightningElement {

    _scriptLoaded = false;
    _userName = undefined;
    _profileStatus = undefined;

    @wire(getUserName)
    wiredUserName({ data, error }) {
        if (data && data !== 'Guest User') {
            this._userName = data;
        } else if (error) {
            console.warn('[donorPortalReact] getUserName error:', error);
        }
        this._pushData();
    }

    @wire(getCurrentUserProfile)
    wiredUserProfile({ data, error }) {
        if (data) {
            this._profileStatus = data.Profile_Status__c;
            if (!this._userName) {
                if (data.First_Name__c || data.Last_Name__c) {
                    this._userName = ((data.First_Name__c || '') + ' ' + (data.Last_Name__c || '')).trim();
                } else if (data.Name) {
                    this._userName = data.Name;
                }
            }
        } else if (error) {
            this._profileStatus = null;
        } else if (data === null) {
            this._profileStatus = 'Not Created';
        }
        this._pushData();
    }

    renderedCallback() {
        const mountNode = this.template.querySelector('.react-root');
        if (!mountNode) return;

        window.__DONOR_PORTAL_MOUNT__    = mountNode;
        window.__APPLICANT_PORTAL_MOUNT__ = mountNode;

        if (this._scriptLoaded) {
            this._pushData();
            return;
        }
        this._scriptLoaded = true;

        const cacheBuster = '?v=' + Date.now();

        loadScript(this, DONOR_PORTAL + '/assets/index.js' + cacheBuster)
            .then(() => {
                this._pushData();
            })
            .catch((err) => {
                console.error('[donorPortalReact] Script loading error:', err);
                this._scriptLoaded = false;
            });
    }

    _pushData() {
        const mountNode = this.template.querySelector('.react-root');
        if (!mountNode) {
            console.warn('[donorPortalReact] mountNode not found');
            return;
        }

        const pathParts = window.location.pathname.split('/').filter(Boolean);
        const sitePrefix = (pathParts.length > 0 && pathParts[0] !== 's') ? '/' + pathParts[0] : '';
        const homeUrl = (sitePrefix || '/donor') + '/s/';
        const loginUrl = window.location.origin + (sitePrefix || '/donor') + '/apex/DonorCustomLogin';

        window.__APPLICANT_PORTAL_SITE_PREFIX__ = sitePrefix;
        window.__DONOR_PORTAL_MOUNT__           = mountNode;
        window.__APPLICANT_PORTAL_MOUNT__       = mountNode;

        window.__DONOR_PORTAL_ASSETS__ = {
            logoLightUrl: INVOICE_LOGO,
            logoDarkUrl:  CSM_LOGO
        };
        window.__APPLICANT_PORTAL_ASSETS__ = window.__DONOR_PORTAL_ASSETS__;

        window.__DONOR_PORTAL_ACTIONS__ = {
            loginUrl,
            logout: () => {
                try {
                    localStorage.setItem('gms_donor_logged_in', 'false');
                    localStorage.removeItem('gms_donor_user_name');
                    localStorage.removeItem('gms_donor_profile_status');
                    sessionStorage.clear();
                } catch (e) {
                    // ignore
                }
                const logoutServlet = window.location.origin + (sitePrefix || '/donor') + '/secur/logout.jsp';
                const home = window.location.origin + (sitePrefix || '/donor') + '/s/';
                window.location.replace(logoutServlet + '?retURL=' + encodeURIComponent(home));
            },
            getFieldSetMetadata: (fieldSetName) => getFieldSetMetadata({ fieldSetName }),
            getCurrentUserProfile: () => getCurrentUserProfile(),
            submitProfileForApproval: (recordId) => submitProfileForApprovalApex({ recordId }),
            createProfile:       (profileRec) => createProfileApex({ profileRec }),
            getActiveDonorCampaigns: () => getActiveDonorCampaigns(),
            createDonation:      (params) => createDonation(params),
            getDonorDashboardSummary: () => getDonorDashboardSummary()
        };
        window.__APPLICANT_PORTAL_ACTIONS__ = window.__DONOR_PORTAL_ACTIONS__;

        const loggedIn = !isGuest;
        const isApproved = this._profileStatus === 'Approved';

        const payload = {
            isLoggedIn:    loggedIn,
            userName:      this._userName || '',
            profileStatus: this._profileStatus || null,
            isApproved:    isApproved,
            loginUrl:      loginUrl,
            initialRoute:  '/donor'
        };

        window.__DONOR_PORTAL_DATA__    = payload;
        window.__APPLICANT_PORTAL_DATA__ = payload;

        if (typeof window.__DONOR_PORTAL_RENDER__ === 'function') {
            window.__DONOR_PORTAL_RENDER__(payload, mountNode);
        } else if (typeof window.__APPLICANT_PORTAL_RENDER__ === 'function') {
            window.__APPLICANT_PORTAL_RENDER__(payload, mountNode);
        }
    }
}
