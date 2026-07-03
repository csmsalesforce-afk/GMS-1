import { LightningElement, wire } from 'lwc';
import { loadScript, loadStyle } from 'lightning/platformResourceLoader';
import APPLICANT_PORTAL from '@salesforce/resourceUrl/applicantPortalApp';
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

export default class ApplicantPortalReact extends LightningElement {

    _scriptLoaded  = false;
    _userName      = undefined;
    _profileStatus = undefined;

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
        loadStyle(this, APPLICANT_PORTAL + '/assets/index.css').catch(() => {});
        loadScript(this, APPLICANT_PORTAL + '/assets/index.js')
            .then(() => this._pushData())
            .catch((err) => console.error('[applicantPortalReact]', err));
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
            profileStatus: this._profileStatus || null
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
            createProfile:            (profileRec) => createProfileApex({ profileRec })
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