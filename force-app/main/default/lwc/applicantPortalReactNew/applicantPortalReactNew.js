import { LightningElement, wire } from 'lwc';
import { loadScript, loadStyle } from 'lightning/platformResourceLoader';
import APPLICANT_PORTAL from '@salesforce/resourceUrl/applicantPortalAppNew';
import isGuest from '@salesforce/user/isGuest';
import CSM_LOGO from '@salesforce/resourceUrl/CSMLogo';
import INVOICE_LOGO from '@salesforce/resourceUrl/InvoiceLogo';
import HERO_IMAGE from '@salesforce/resourceUrl/gmsHero1';
import BENEFIT_MAIN from '@salesforce/resourceUrl/benefitMain';
import TIMELINE from '@salesforce/resourceUrl/timelineCurve';
import ELIGIBLE_ACADEMIC from '@salesforce/resourceUrl/eligibleAcademic';
import ELIGIBLE_NGO from '@salesforce/resourceUrl/eligibleNgo';
import ELIGIBLE_STARTUP from '@salesforce/resourceUrl/eligibleStartup';
import ELIGIBLE_RESEARCHER from '@salesforce/resourceUrl/eligibleResearcher';
import getUserName from '@salesforce/apex/NavbarController.getUserName';
import getProfileStatus from '@salesforce/apex/GrantApplicationController1.getProfileStatus';
import getCurrentUserProfile from '@salesforce/apex/ProfileFieldSetController.getCurrentUserProfile';
import getFieldSetMetadata from '@salesforce/apex/ProfileFieldSetController.getFieldSetMetadata';
import submitProfileForApproval from '@salesforce/apex/ProfileFieldSetController.submitProfileForApproval';
import getPrograms from '@salesforce/apex/GrantProgramsController.getPrograms';
import getProgramById from '@salesforce/apex/GrantProgramsController.getProgramById';
import getProgramDocuments from '@salesforce/apex/GrantProgramsController.getProgramDocuments';
import getMyApplications from '@salesforce/apex/MyApplicationsController.getMyApplications';
import getApplication from '@salesforce/apex/GrantApplicationController1.getApplication';
import getApplicationFiles from '@salesforce/apex/GrantApplicationController1.getApplicationFiles';
import saveApplication from '@salesforce/apex/GrantApplicationController1.saveApplication';
import generatePdfAndSubmit from '@salesforce/apex/GrantApplicationController1.generatePdfAndSubmit';
import withdrawApplicationWithReason from '@salesforce/apex/GrantApplicationController1.withdrawApplicationWithReason';
import getApplicantInfo from '@salesforce/apex/GrantApplicationController1.getApplicantInfo';
import fixFileVisibility from '@salesforce/apex/GrantApplicationController1.fixFileVisibility';
import uploadFileApex from '@salesforce/apex/GrantApplicationController1.uploadFile';
import deleteFileApex from '@salesforce/apex/GrantApplicationController1.deleteFile';
import createProfileApex from '@salesforce/apex/CreateProfileController.createProfile';
import submitApplication from '@salesforce/apex/GrantApplicationController1.submitApplication';
import getHomeStats from '@salesforce/apex/HomeStatsController.getHomeStats';
import getInstallmentsAndDisbursements from '@salesforce/apex/FundUtilizationController.getInstallmentsAndDisbursements';
import uploadUtilizationCertificate from '@salesforce/apex/FundUtilizationController.uploadUtilizationCertificate';
import getProjectBudgets from '@salesforce/apex/GrantApplicationController1.getProjectBudgets';
import saveProjectBudgets from '@salesforce/apex/GrantApplicationController1.saveProjectBudgets';
import createStripeAccount from '@salesforce/apex/StripeConnectService.createStripeAccount';
import createStripeOnboardingLink from '@salesforce/apex/StripeConnectService.createStripeOnboardingLink';
import checkStripeOnboarding from '@salesforce/apex/StripeConnectService.checkStripeOnboarding';

export default class ApplicantPortalReactNew extends LightningElement {

    _scriptLoaded  = false;
    _userName      = undefined;
    _profileStatus = undefined;
    _homeStats     = undefined;

    @wire(getHomeStats)
    wiredHomeStats({ data, error }) {
        if (data) {
            this._homeStats = data;
            this._pushData();
        }
    }

    @wire(getUserName)
    wiredUserName({ data, error }) {
        this._userName = (data !== undefined) ? data : (error ? null : undefined);
        this._pushData();
    }

    @wire(getProfileStatus)
    wiredProfileStatus({ data, error }) {
        this._profileStatus = (data !== undefined) ? data : (error ? null : undefined);
        this._pushData();
    }

    renderedCallback() {
        if (this._scriptLoaded) return;
        this._scriptLoaded = true;
        
        // Add cache buster to force Experience Builder to fetch the newly deployed version
        const cacheBuster = '?v=' + Date.now();
        
        loadStyle(this, APPLICANT_PORTAL + '/assets/index.css' + cacheBuster).catch(() => {});
        loadScript(this, APPLICANT_PORTAL + '/assets/index.js' + cacheBuster)
            .then(() => this._pushData())
            .catch((err) => console.error('[applicantPortalReactNew]', err));
    }

    _pushData() {
        if (!this._scriptLoaded) return;
        const mountNode = this.template.querySelector('.react-root');
        if (!mountNode) return;

        const pathParts = window.location.pathname.split('/').filter(Boolean);
        const sitePrefix = pathParts.length > 0 ? '/' + pathParts[0] : '';
        const loginUrl = window.location.origin + sitePrefix + '/LoginCustom';

        window.__APPLICANT_PORTAL_SITE_PREFIX__ = sitePrefix;
        window.__APPLICANT_PORTAL_MOUNT__       = mountNode;

        // Pass static resource URLs so React can use the same assets
        window.__APPLICANT_PORTAL_ASSETS__ = {
            logoLightUrl:       INVOICE_LOGO,
            logoDarkUrl:        CSM_LOGO,
            heroImage:          HERO_IMAGE,
            benefitMain:        BENEFIT_MAIN,
            timeline:           TIMELINE,
            eligibleAcademic:   ELIGIBLE_ACADEMIC,
            eligibleNgo:        ELIGIBLE_NGO,
            eligibleStartup:    ELIGIBLE_STARTUP,
            eligibleResearcher: ELIGIBLE_RESEARCHER,
        };
        window.__APPLICANT_PORTAL_ACTIONS__     = this._buildActions(sitePrefix, loginUrl);

        // For guest users, wires return errors quickly — treat both as resolved
        const loggedIn = !isGuest;
        if (loggedIn && (this._userName === undefined || this._profileStatus === undefined)) {
            return;
        }

        const payload = {
            isLoggedIn:    loggedIn,
            userName:      this._userName || '',
            profileStatus: this._profileStatus || null,
            homeStats:     this._homeStats || { activePrograms: 0, totalApplications: 0, totalFunded: '$0', countries: 0 }
        };

        window.__APPLICANT_PORTAL_DATA__ = payload;

        if (typeof window.__APPLICANT_PORTAL_RENDER__ === 'function') {
            window.__APPLICANT_PORTAL_RENDER__(payload);
        }
    }

    _buildActions(sitePrefix, loginUrl) {
        return {
            loginUrl,
            logout: () => {
                window.location.href = window.location.origin + sitePrefix
                    + '/secur/logout.jsp?retURL=' + encodeURIComponent(loginUrl);
            },
            getUserName:              () => Promise.resolve(this._userName),
            getProfileStatus:         () => getProfileStatus(),
            getCurrentUserProfile:    () => getCurrentUserProfile(),
            getFieldSetMetadata:      (fieldSetName) => getFieldSetMetadata({ fieldSetName }),
            submitProfileForApproval: (recordId) => submitProfileForApproval({ recordId }),
            getPrograms:              () => getPrograms(),
            getProgramById:           (programId) => getProgramById({ programId }),
            getProgramDocuments:      (programId) => getProgramDocuments({ programId }),
            getMyApplications:        () => getMyApplications(),
            getApplication:           (recordId) => getApplication({ recordId }),
            getApplicationFiles:      (recordId) => getApplicationFiles({ recordId }),
            saveApplication:          (app) => saveApplication({ app }),
            submitApplication:        (appId) => submitApplication({ appId }),
            generatePdfAndSubmit:     (recordId) => generatePdfAndSubmit({ recordId }),
            withdrawApplication:      (recordId, reason) => withdrawApplicationWithReason({ recordId, reason }),
            getApplicantInfo:         () => getApplicantInfo(),
            fixFileVisibility:        (documentId) => fixFileVisibility({ documentId }),
            uploadFile:               (fileName, base64Data, recordId) => uploadFileApex({ fileName, base64Data, recordId }),
            deleteFile:               (documentId) => deleteFileApex({ documentId }),
            createProfile:            (profileRec) => createProfileApex({ profileRec }),
            getHomeStats:             () => getHomeStats(),
            getInstallmentsAndDisbursements: (applicationId) => getInstallmentsAndDisbursements({ applicationId }),
            uploadUtilizationCertificate: (applicationId, disbursementId, fileName, base64Data, description) =>
                uploadUtilizationCertificate({ applicationId, disbursementId, fileName, base64Data, description }),
            getProjectBudgets: (applicationId) => getProjectBudgets({ applicationId }),
            saveProjectBudgets: (applicationId, budgetJson) => saveProjectBudgets({ applicationId, budgetJson }),
            createStripeAccount: (grantProgramId) => createStripeAccount({ grantProgramId }),
            createStripeOnboardingLink: (grantProgramId) => createStripeOnboardingLink({ grantProgramId }),
            checkStripeOnboarding: (grantProgramId) => checkStripeOnboarding({ grantProgramId })
        };
    }

    _deepCopy(obj) {
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch (e) {
            if (Array.isArray(obj)) return obj.map(i => this._deepCopy(i));
            if (typeof obj === 'object' && obj !== null) {
                const r = {};
                for (const k of Object.keys(obj)) {
                    try { r[k] = this._deepCopy(obj[k]); } catch (_) { r[k] = null; }
                }
                return r;
            }
            return obj;
        }
    }
}
