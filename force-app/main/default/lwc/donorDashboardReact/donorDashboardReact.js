import { LightningElement, wire } from 'lwc';
import { loadScript, loadStyle } from 'lightning/platformResourceLoader';
import DONOR_DASHBOARD from '@salesforce/resourceUrl/donorDashboardApp';
import getDonorAgreements from '@salesforce/apex/DonorDashboardController.getDonorAgreements';
import getFundingRequests from '@salesforce/apex/DonorDashboardController.getFundingRequests';
import updateAgreementStatus from '@salesforce/apex/DonorDashboardController.updateAgreementStatus';
import updateFundingRequest from '@salesforce/apex/DonorDashboardController.updateFundingRequest';

export default class DonorDashboardReact extends LightningElement {

    _scriptLoaded = false;
    _agreements   = undefined;
    _fundingRequests = undefined;

    @wire(getDonorAgreements)
    wiredAgreements({ data, error }) {
        this._agreements = data !== undefined ? (data || []) : (error ? [] : undefined);
        this._pushData();
    }

    @wire(getFundingRequests)
    wiredFundingRequests({ data, error }) {
        this._fundingRequests = data !== undefined ? (data || []) : (error ? [] : undefined);
        this._pushData();
    }

    renderedCallback() {
        if (this._scriptLoaded) return;
        this._scriptLoaded = true;

        loadStyle(this, DONOR_DASHBOARD + '/assets/index.css').catch(() => {});
        loadScript(this, DONOR_DASHBOARD + '/assets/index.js')
            .then(() => this._pushData())
            .catch((err) => console.error('[donorDashboardReact]', err));
    }

    _pushData() {
        if (!this._scriptLoaded) return;

        const mountNode = this.template.querySelector('.react-root');
        if (!mountNode) return;

        // Derive the site prefix from the current URL path
        // e.g. /lwrgms/home → /lwrgms
        const pathParts = window.location.pathname.split('/').filter(Boolean);
        const sitePrefix = pathParts.length > 0 ? '/' + pathParts[0] : '';
        const loginUrl = window.location.origin + sitePrefix + '/login';

        window.__DONOR_DASHBOARD_MOUNT__ = mountNode;
        window.__DONOR_DASHBOARD_ACTIONS__ = {
            updateAgreementStatus: (agreementId, action) =>
                updateAgreementStatus({ agreementId, action }),
            updateFundingRequest: (requestId, action) =>
                updateFundingRequest({ requestId, action }),
            reload: () => Promise.all([
                getDonorAgreements(),
                getFundingRequests()
            ]).then(([agrs, frs]) => ({
                agreements:      this._deepCopy(agrs  || []),
                fundingRequests: this._deepCopy(frs   || [])
            })),
            logout: () => {
                // Redirect to the site-specific logout — returns to site login page
                window.location.href = window.location.origin + sitePrefix + '/secur/logout.jsp?retURL=' + encodeURIComponent(loginUrl);
            }
        };

        if (this._agreements === undefined || this._fundingRequests === undefined) return;

        // Safely deep-copy LWC Proxy objects before passing to React
        let payload;
        try {
            payload = {
                agreements:      this._deepCopy(this._agreements),
                fundingRequests: this._deepCopy(this._fundingRequests)
            };
        } catch (e) {
            console.error('[donorDashboardReact] Failed to serialize wire data:', e);
            return;
        }

        window.__DONOR_DASHBOARD_DATA__ = payload;

        if (typeof window.__DONOR_DASHBOARD_RENDER__ === 'function') {
            window.__DONOR_DASHBOARD_RENDER__(payload);
        }
    }

    // Safely unwrap LWC Proxy objects into plain JS structures
    _deepCopy(obj) {
        if (obj === null || obj === undefined) return obj;
        // Use JSON round-trip — works for all plain data from Apex
        // Wrap in try/catch; fall back to manual copy if Proxy throws
        try {
            return JSON.parse(JSON.stringify(obj));
        } catch (e) {
            if (Array.isArray(obj)) {
                return obj.map(item => this._deepCopy(item));
            }
            if (typeof obj === 'object') {
                const result = {};
                for (const key of Object.keys(obj)) {
                    try { result[key] = this._deepCopy(obj[key]); } catch (_) { result[key] = null; }
                }
                return result;
            }
            return obj;
        }
    }
}