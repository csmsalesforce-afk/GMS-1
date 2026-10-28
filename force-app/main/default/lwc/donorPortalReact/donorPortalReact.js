import { LightningElement, wire } from 'lwc';
import { loadScript, loadStyle } from 'lightning/platformResourceLoader';
import DONOR_PORTAL from '@salesforce/resourceUrl/donorPortalApp';
import isGuest from '@salesforce/user/isGuest';
import getUserName from '@salesforce/apex/NavbarController.getUserName';
import getActiveCampaigns from '@salesforce/apex/DonorPortalController.getActiveCampaigns';
import getCampaignDetails from '@salesforce/apex/DonorPortalController.getCampaignDetails';
import submitDonation from '@salesforce/apex/DonorPortalController.submitDonation';
import submitLeadInquiry from '@salesforce/apex/DonorPortalController.submitLeadInquiry';
import getDonorPlatformStats from '@salesforce/apex/DonorPortalController.getDonorPlatformStats';
import getDonorProfileStatus from '@salesforce/apex/DonorPortalController.getDonorProfileStatus';
import submitDonorProfile from '@salesforce/apex/DonorPortalController.submitDonorProfile';
import createStripeCheckoutSession from '@salesforce/apex/DonorPortalController.createStripeCheckoutSession';
import confirmStripeDonation from '@salesforce/apex/DonorPortalController.confirmStripeDonation';
import getDonorGivingHistory from '@salesforce/apex/DonorPortalController.getDonorGivingHistory';
import cancelRecurringDonation from '@salesforce/apex/DonorPortalController.cancelRecurringDonation';
import getRequiredDonorDocuments from '@salesforce/apex/DonorPortalController.getRequiredDonorDocuments';
import getDonorRequirementsForCampaign from '@salesforce/apex/DonorPortalController.getDonorRequirementsForCampaign';
import uploadDonorKYCDocument from '@salesforce/apex/DonorPortalController.uploadDonorKYCDocument';
import deleteDonorKYCDocument from '@salesforce/apex/DonorPortalController.deleteDonorKYCDocument';
import submitDonorDocumentsForReview from '@salesforce/apex/DonorPortalController.submitDonorDocumentsForReview';
import requestCampaignAccess from '@salesforce/apex/DonorPortalController.requestCampaignAccess';

export default class DonorPortalReact extends LightningElement {
    _scriptLoaded = false;
    _campaigns = undefined;
    _stats = undefined;
    _userName = undefined;
    _profileStatus = undefined;

    @wire(getUserName)
    wiredUserName({ data, error }) {
        this._userName = (data !== undefined) ? data : (error ? null : undefined);
        this._pushData();
    }

    @wire(getDonorProfileStatus)
    wiredProfile({ data, error }) {
        if (data !== undefined) {
            this._profileStatus = this._deepCopy(data);
            this._pushData();
        } else if (error) {
            console.error('[donorPortalReact] Error fetching donor profile status:', error);
            this._profileStatus = { status: 'NO_PROFILE' };
            this._pushData();
        }
    }

    @wire(getActiveCampaigns)
    wiredCampaigns({ data, error }) {
        if (data !== undefined) {
            this._campaigns = this._deepCopy(data);
            this._pushData();
        } else if (error) {
            console.error('[donorPortalReact] Error fetching campaigns:', error);
            this._campaigns = [];
            this._pushData();
        }
    }

    @wire(getDonorPlatformStats)
    wiredStats({ data, error }) {
        if (data !== undefined) {
            this._stats = this._deepCopy(data);
            this._pushData();
        } else if (error) {
            console.error('[donorPortalReact] Error fetching stats:', error);
            this._stats = {};
            this._pushData();
        }
    }

    renderedCallback() {
        if (this._scriptLoaded) return;
        this._scriptLoaded = true;

        loadStyle(this, DONOR_PORTAL + '/assets/index.css').catch(() => {});
        loadScript(this, DONOR_PORTAL + '/assets/index.js')
            .then(() => {
                console.log('[donorPortalReact] Static resources loaded successfully.');
                this._pushData();
            })
            .catch(err => {
                console.error('[donorPortalReact] Error loading static resources:', err);
            });
    }

    _pushData() {
        if (!this._scriptLoaded) return;

        const mountNode = this.template.querySelector('.donor-react-mount');
        if (!mountNode) return;

        let sitePrefix = '';
        try {
            const pathParts = window.location.pathname.split('/').filter(Boolean);
            sitePrefix = pathParts.length > 0 ? '/' + pathParts[0] : '';
        } catch (e) {
            sitePrefix = '';
        }

        const loggedIn = !isGuest;
        const loginUrl = window.location.origin + sitePrefix + '/DonorCustomLogin';
        const logoutUrl = window.location.origin + sitePrefix + '/secur/logout.jsp?retURL=' + encodeURIComponent(window.location.origin + sitePrefix);

        window.__DONOR_PORTAL_MOUNT__ = mountNode;
        window.__DONOR_PORTAL_SITE_PREFIX__ = sitePrefix;

        window.__DONOR_PORTAL_ACTIONS__ = {
            getActiveCampaigns: () => getActiveCampaigns().then(res => this._deepCopy(res)),
            getCampaignDetails: (campaignId) => getCampaignDetails({ campaignId }).then(res => this._deepCopy(res)),
            submitDonation: (payload) => submitDonation({ payload }).then(res => this._deepCopy(res)),
            submitLeadInquiry: (payload) => submitLeadInquiry({ payload }).then(res => this._deepCopy(res)),
            getDonorPlatformStats: () => getDonorPlatformStats().then(res => this._deepCopy(res)),
            getDonorProfileStatus: () => getDonorProfileStatus().then(res => {
                this._profileStatus = this._deepCopy(res);
                return this._profileStatus;
            }),
            submitDonorProfile: (payload) => submitDonorProfile({ payload }).then(res => {
                if (res && res.success) {
                    this._profileStatus = Object.assign({}, this._profileStatus, {
                        status: res.status || 'Pending',
                        complianceStatus: res.complianceStatus || 'Pending',
                        donorId: res.donorId,
                        kycVerified: false
                    });
                    this._pushData();
                }
                return this._deepCopy(res);
            }),
            loginUrl: loginUrl,
            logout: () => {
                window.location.href = logoutUrl;
            },
            createStripeCheckoutSession: (payload) => createStripeCheckoutSession({ payload }).then(res => this._deepCopy(res)),
            confirmStripeDonation: (sessionId) => confirmStripeDonation({ sessionId }).then(res => this._deepCopy(res)),
            getDonorGivingHistory: () => getDonorGivingHistory().then(res => this._deepCopy(res)),
            cancelRecurringDonation: (donationId) => cancelRecurringDonation({ donationId }).then(res => this._deepCopy(res)),
            getRequiredDonorDocuments: () => getRequiredDonorDocuments().then(res => this._deepCopy(res)),
            getDonorRequirementsForCampaign: (campaignId, programId) => getDonorRequirementsForCampaign({ campaignId, programId }).then(res => this._deepCopy(res)),
            uploadDonorKYCDocument: (programDocKey, fileName, base64Data) => uploadDonorKYCDocument({ programDocKey, fileName, base64Data }).then(res => this._deepCopy(res)),
            deleteDonorKYCDocument: (contentDocumentId) => deleteDonorKYCDocument({ contentDocumentId }).then(res => this._deepCopy(res)),
            submitDonorDocumentsForReview: () => submitDonorDocumentsForReview().then(res => {
                if (res && res.success) {
                    this._profileStatus = Object.assign({}, this._profileStatus, {
                        complianceStatus: 'Pending',
                        kycVerified: false,
                        status: 'Pending'
                    });
                    this._pushData();
                }
                return this._deepCopy(res);
            }),
            requestCampaignAccess: (campaignId, notes) => requestCampaignAccess({ campaignId, notes }).then(res => this._deepCopy(res))
        };

        const payload = {
            campaigns: this._campaigns || [],
            stats: this._stats || {},
            isLoggedIn: loggedIn,
            userName: loggedIn ? (this._userName || this._profileStatus?.userName || this._profileStatus?.donorName || '') : '',
            profileStatus: this._profileStatus || { status: loggedIn ? 'NO_PROFILE' : 'GUEST' },
            loginUrl: loginUrl,
            logoutUrl: logoutUrl
        };

        window.__DONOR_PORTAL_DATA__ = payload;

        if (typeof window.__DONOR_PORTAL_RENDER__ === 'function') {
            try {
                window.__DONOR_PORTAL_RENDER__(payload);
            } catch (err) {
                console.error('[donorPortalReact] Error during render call:', err);
            }
        }
    }

    _deepCopy(obj) {
        if (obj === null || obj === undefined) return obj;
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch (e) {
            return obj;
        }
    }
}
