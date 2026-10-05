/**
 * Salesforce Service - Interfaces with Salesforce through window objects
 * This makes the app org-agnostic and works as a managed package
 */

class SalesforceService {
  constructor() {
    this.actions = null;
    this.data = null;
    this.assets = null;
    this.sitePrefix = '';
  }

  /**
   * Initialize with data from LWC component
   */
  initialize() {
    this.actions = window.__APPLICANT_PORTAL_ACTIONS__ || {};
    this.data = window.__APPLICANT_PORTAL_DATA__ || {};
    this.assets = window.__APPLICANT_PORTAL_ASSETS__ || {};
    this.sitePrefix = window.__APPLICANT_PORTAL_SITE_PREFIX__ || '';
  }

  // Authentication
  get isLoggedIn() {
    return this.data?.isLoggedIn || false;
  }

  get userName() {
    return this.data?.userName || '';
  }

  get profileStatus() {
    return this.data?.profileStatus || null;
  }

  get loginUrl() {
    return this.actions?.loginUrl || '/login';
  }

  logout() {
    if (this.actions?.logout) {
      this.actions.logout();
    }
  }

  // Assets
  getAsset(key) {
    return this.assets?.[key] || '';
  }

  // Profile APIs
  async getUserName() {
    if (this.actions?.getUserName) {
      return await this.actions.getUserName();
    }
    return null;
  }

  async getProfileStatus() {
    if (this.actions?.getProfileStatus) {
      return await this.actions.getProfileStatus();
    }
    return null;
  }

  async getCurrentUserProfile() {
    if (this.actions?.getCurrentUserProfile) {
      return await this.actions.getCurrentUserProfile();
    }
    return null;
  }

  async getFieldSetMetadata(fieldSetName) {
    if (this.actions?.getFieldSetMetadata) {
      return await this.actions.getFieldSetMetadata(fieldSetName);
    }
    return null;
  }

  async submitProfileForApproval(recordId) {
    if (this.actions?.submitProfileForApproval) {
      return await this.actions.submitProfileForApproval(recordId);
    }
    return null;
  }

  async createProfile(profileRec) {
    if (this.actions?.createProfile) {
      return await this.actions.createProfile(profileRec);
    }
    return null;
  }

  // Stats APIs
  async getHomeStats() {
    if (this.actions?.getHomeStats) {
      return await this.actions.getHomeStats();
    }
    return null;
  }

  // Program APIs
  async getPrograms() {
    if (this.actions?.getPrograms) {
      return await this.actions.getPrograms();
    }
    return [];
  }

  async getProgramById(programId) {
    if (this.actions?.getProgramById) {
      return await this.actions.getProgramById(programId);
    }
    return null;
  }

  async getProgramDocuments(programId) {
    if (this.actions?.getProgramDocuments) {
      return await this.actions.getProgramDocuments(programId);
    }
    return [];
  }

  // Application APIs
  async getMyApplications() {
    if (this.actions?.getMyApplications) {
      return await this.actions.getMyApplications();
    }
    return [];
  }

  async getApplication(recordId) {
    if (this.actions?.getApplication) {
      return await this.actions.getApplication(recordId);
    }
    return null;
  }

  async getApplicationFiles(recordId) {
    if (this.actions?.getApplicationFiles) {
      return await this.actions.getApplicationFiles(recordId);
    }
    return [];
  }

  async saveApplication(app) {
    if (this.actions?.saveApplication) {
      return await this.actions.saveApplication(app);
    }
    return null;
  }

  async submitApplication(appId) {
    if (this.actions?.submitApplication) {
      return await this.actions.submitApplication(appId);
    }
    return null;
  }

  async generatePdfAndSubmit(recordId) {
    if (this.actions?.generatePdfAndSubmit) {
      return await this.actions.generatePdfAndSubmit(recordId);
    }
    return null;
  }

  async withdrawApplication(recordId, reason) {
    if (this.actions?.withdrawApplication) {
      return await this.actions.withdrawApplication(recordId, reason);
    }
    return null;
  }

  async getApplicantInfo() {
    if (this.actions?.getApplicantInfo) {
      return await this.actions.getApplicantInfo();
    }
    return null;
  }

  // File Management APIs
  async uploadFile(fileName, base64Data, recordId) {
    if (this.actions?.uploadFile) {
      return await this.actions.uploadFile(fileName, base64Data, recordId);
    }
    return null;
  }

  async deleteFile(documentId) {
    if (this.actions?.deleteFile) {
      return await this.actions.deleteFile(documentId);
    }
    return null;
  }

  async fixFileVisibility(documentId) {
    if (this.actions?.fixFileVisibility) {
      return await this.actions.fixFileVisibility(documentId);
    }
    return null;
  }

  // Navigation helpers
  navigate(path) {
    const fullPath = `${this.sitePrefix}${path}`;
    window.location.href = fullPath;
  }
}

export default new SalesforceService();
