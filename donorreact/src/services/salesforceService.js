/**
 * Salesforce Service for Donor Portal
 * Interfaces with Salesforce through window objects
 */

class SalesforceService {
  constructor() {
    this.actions = null;
    this.data = null;
    this.assets = null;
    this.sitePrefix = '';
  }

  initialize() {
    this.actions = window.__DONOR_PORTAL_ACTIONS__ || window.__APPLICANT_PORTAL_ACTIONS__ || {};
    this.data = window.__DONOR_PORTAL_DATA__ || window.__APPLICANT_PORTAL_DATA__ || {};
    this.assets = window.__DONOR_PORTAL_ASSETS__ || window.__APPLICANT_PORTAL_ASSETS__ || {};
    this.sitePrefix = window.__APPLICANT_PORTAL_SITE_PREFIX__ || '';
  }

  // Live Authentication Getters
  get isLoggedIn() {
    if (this.data?.isLoggedIn !== undefined) {
      return Boolean(this.data.isLoggedIn);
    }
    const globalData = window.__DONOR_PORTAL_DATA__ || window.__APPLICANT_PORTAL_DATA__;
    if (globalData?.isLoggedIn !== undefined) {
      return Boolean(globalData.isLoggedIn);
    }
    // Fallback: false unless explicitly logged in
    return localStorage.getItem('gms_donor_logged_in') === 'true';
  }

  get userName() {
    const raw = this.data?.userName || window.__DONOR_PORTAL_DATA__?.userName;
    if (raw && raw !== 'Verified Donor' && raw !== 'Guest User') {
      return raw;
    }
    const profile = this.data?.userProfile || window.__DONOR_PORTAL_DATA__?.userProfile;
    if (profile) {
      const name = `${profile.First_Name__c || ''} ${profile.Last_Name__c || ''}`.trim() || profile.Name;
      if (name) return name;
    }
    return localStorage.getItem('gms_donor_user_name');
  }

  get profileStatus() {
    return this.data?.profileStatus || window.__DONOR_PORTAL_DATA__?.profileStatus || localStorage.getItem('gms_donor_profile_status');
  }

  get isApproved() {
    if (this.data?.isApproved !== undefined) {
      return Boolean(this.data.isApproved);
    }
    if (window.__DONOR_PORTAL_DATA__?.isApproved !== undefined) {
      return Boolean(window.__DONOR_PORTAL_DATA__.isApproved);
    }
    return this.profileStatus === 'Approved';
  }

  get loginUrl() {
    return this.actions?.loginUrl || (this.sitePrefix ? this.sitePrefix + '/apex/DonorCustomLogin' : '/donor/apex/DonorCustomLogin');
  }

  logout() {
    try {
      localStorage.setItem('gms_donor_logged_in', 'false');
      localStorage.removeItem('gms_donor_user_name');
      localStorage.removeItem('gms_donor_profile_status');
      sessionStorage.clear();
    } catch (e) {
      console.warn('Could not clear local storage on logout:', e);
    }

    if (this.actions?.logout) {
      this.actions.logout();
      return;
    }

    // Localhost / Fallback logout navigation to home page
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost) {
      window.location.hash = '#home';
      window.location.reload();
      return;
    }

    const sitePrefix = this.sitePrefix || '/donor';
    const homeUrl = window.location.origin + sitePrefix + '/s/';
    window.location.replace(`${sitePrefix}/secur/logout.jsp?retURL=${encodeURIComponent(homeUrl)}`);
  }

  getAsset(key) {
    return this.assets?.[key] || '';
  }

  async getFieldSetMetadata(fieldSetName = 'Donor') {
    if (this.actions?.getFieldSetMetadata) {
      try {
        const res = await this.actions.getFieldSetMetadata(fieldSetName);
        if (res && res.length > 0) {
          // Normalize options to guarantee consistency with Salesforce Object Manager
          return res.map(f => {
            if (f.name === 'Donor_Type__c' && (!f.options || f.options.length === 0)) {
              f.options = [
                { label: 'Individual Donor', value: 'Individual' },
                { label: 'Corporation / Corporate Foundation', value: 'Corporation' },
                { label: 'Foundation / Philanthropic Trust', value: 'Foundation' },
                { label: 'Nonprofit Organization / NGO', value: 'Nonprofit Organization' },
                { label: 'Other', value: 'Other' }
              ];
            }
            if (f.name === 'Country__c' && (!f.options || f.options.length === 0)) {
              f.options = [
                { label: 'India', value: 'a03fj00000ZkG7FAAV' },
                { label: 'United States', value: 'a03fj00001m0UDFAA2' }
              ];
            }
            if (f.name === 'Region__c' && (!f.options || f.options.length === 0)) {
              f.options = [
                { label: 'Asia-Pacific', value: 'a04fj000000wkvJAAQ' },
                { label: 'America', value: 'a04fj000001WQMzAAO' },
                { label: 'Europe', value: 'a04fj000000wkthAAA' },
                { label: 'Africa', value: 'a04fj000001WQObAAO' },
                { label: 'United States', value: 'a04fj000003xmrhAAA' }
              ];
            }
            if (f.name === 'Stripe_Onboarding_Status__c') {
              f.type = 'select';
              if (!f.options || f.options.length === 0) {
                f.options = [
                  { label: 'Not Connected', value: 'Not Connected' },
                  { label: 'Onboarding', value: 'Onboarding' },
                  { label: 'Completed', value: 'Completed' }
                ];
              }
            }
            return f;
          });
        }
      } catch (e) {
        console.warn('Apex getFieldSetMetadata call failed, falling back:', e);
      }
    }

    // Default metadata matching the exact order and valid values of the Donor field set
    return [
      { name: 'First_Name__c', label: 'First Name', type: 'text', required: true },
      {
        name: 'Donor_Type__c',
        label: 'Donor Type',
        type: 'select',
        required: true,
        options: [
          { label: 'Individual Donor', value: 'Individual' },
          { label: 'Corporation / Corporate Foundation', value: 'Corporation' },
          { label: 'Foundation / Philanthropic Trust', value: 'Foundation' },
          { label: 'Nonprofit Organization / NGO', value: 'Nonprofit Organization' },
          { label: 'Other', value: 'Other' }
        ]
      },
      { name: 'Last_Name__c', label: 'Last Name', type: 'text', required: true },
      { name: 'Email_Address__c', label: 'Email Address', type: 'email', required: true },
      { name: 'Mailing_City__c', label: 'Mailing City', type: 'text', required: false },
      { name: 'Mailing_State__c', label: 'Mailing State', type: 'text', required: false },
      { name: 'Mailing_Street__c', label: 'Mailing Street', type: 'textarea', required: false },
      { name: 'ZIP_Code__c', label: 'ZIP Code', type: 'text', required: false },
      {
        name: 'Country__c',
        label: 'Country',
        type: 'select',
        required: true,
        options: [
          { label: 'India', value: 'a03fj00000ZkG7FAAV' },
          { label: 'United States', value: 'a03fj00001m0UDFAA2' }
        ]
      },
      {
        name: 'Region__c',
        label: 'Region',
        type: 'select',
        required: false,
        options: [
          { label: 'Asia-Pacific', value: 'a04fj000000wkvJAAQ' },
          { label: 'America', value: 'a04fj000001WQMzAAO' },
          { label: 'Europe', value: 'a04fj000000wkthAAA' },
          { label: 'Africa', value: 'a04fj000001WQObAAO' },
          { label: 'United States', value: 'a04fj000003xmrhAAA' }
        ]
      },
      {
        name: 'Stripe_Onboarding_Status__c',
        label: 'Stripe Onboarding Status',
        type: 'select',
        required: false,
        options: [
          { label: 'Not Connected', value: 'Not Connected' },
          { label: 'Onboarding', value: 'Onboarding' },
          { label: 'Completed', value: 'Completed' }
        ]
      },
      { name: 'Stripe_Connected_Account_ID__c', label: 'Stripe Connected Account ID', type: 'text', required: false }
    ];
  }

  async getCurrentUserProfile() {
    if (this.actions?.getCurrentUserProfile) {
      try {
        const res = await this.actions.getCurrentUserProfile();
        return res;
      } catch (err) {
        console.warn('Apex getCurrentUserProfile call failed:', err);
      }
    }
    const stored = JSON.parse(localStorage.getItem('gms_donor_profile_record') || 'null');
    return stored;
  }

  async saveDonorProfile(donorData) {
    if (this.actions?.createProfile) {
      // Auto-compute Primary Contact and Organization Type mappings to match backend and approval view
      const fullName = `${donorData.First_Name__c || ''} ${donorData.Last_Name__c || ''}`.trim();
      const donorType = donorData.Donor_Type__c;
      let mappedOrgType = 'Individual Applicant';
      if (donorType === 'Corporation' || donorType === 'Foundation') {
        mappedOrgType = 'Private Organisation';
      } else if (donorType === 'Nonprofit Organization') {
        mappedOrgType = 'NGO';
      }

      const payload = {
        ...donorData,
        Primary_Contact_Name__c: donorData.Primary_Contact_Name__c || fullName,
        Primary_Contact_Email__c: donorData.Primary_Contact_Email__c || donorData.Email_Address__c,
        Organization_Type__c: donorData.Organization_Type__c || mappedOrgType,
        Profile_Status__c: donorData.Profile_Status__c || 'Pending'
      };
      const recordId = await this.actions.createProfile(payload);
      if (this.actions?.submitProfileForApproval && recordId) {
        try {
          await this.actions.submitProfileForApproval(recordId);
        } catch (subErr) {
          console.warn('Submit for approval notice:', subErr);
        }
      }
      return { success: true, recordId, status: payload.Profile_Status__c };
    }

    // Standalone Local Simulation
    const recordId = donorData.Id || ('gp_' + Date.now());
    const donorRecord = {
      ...donorData,
      Id: recordId,
      Profile_Status__c: donorData.Profile_Status__c || 'Pending',
      lastModifiedDate: new Date().toISOString()
    };
    localStorage.setItem('gms_donor_profile_record', JSON.stringify(donorRecord));
    localStorage.setItem('gms_donor_profile_status', donorRecord.Profile_Status__c);
    return { success: true, recordId, status: donorRecord.Profile_Status__c };
  }

  async registerDonor(donorData) {
    return this.saveDonorProfile(donorData);
  }

  async checkDonorStatus(verificationToken) {
    if (this.actions?.checkDonorStatus) {
      return await this.actions.checkDonorStatus(verificationToken);
    }

    const stored = JSON.parse(localStorage.getItem('gms_registered_donors') || '{}');
    if (stored[verificationToken]) {
      const rec = stored[verificationToken];
      return {
        found: true,
        status: rec.Profile_Status__c || 'Pending',
        donorName: rec.Institution_Name__c || rec.Primary_Contact_Name__c || 'Donor',
        createdDate: rec.createdDate,
        isApproved: rec.Profile_Status__c === 'Approved'
      };
    }

    // Demo Tokens for immediate testing
    if (verificationToken === 'DEMO-APPROVED') {
      return {
        found: true,
        status: 'Approved',
        donorName: 'Global Impact Philanthropy',
        createdDate: new Date(Date.now() - 86400000 * 3).toISOString(),
        isApproved: true
      };
    }
    if (verificationToken === 'DEMO-PENDING') {
      return {
        found: true,
        status: 'Pending',
        donorName: 'Acme Hope Foundation',
        createdDate: new Date(Date.now() - 86400000).toISOString(),
        isApproved: false
      };
    }

    return { found: false, error: 'No donor profile found for the provided token.' };
  }

  async getDonorCampaigns() {
    if (this.actions?.getActiveDonorCampaigns) {
      try {
        const res = await this.actions.getActiveDonorCampaigns();
        if (Array.isArray(res) && res.length > 0) return res;
      } catch (err) {
        console.error('getActiveDonorCampaigns apex call failed:', err);
      }
    }
    if (this.actions?.getDonorCampaigns) {
      try {
        const res = await this.actions.getDonorCampaigns();
        if (Array.isArray(res) && res.length > 0) return res;
      } catch (err) {
        console.error('getDonorCampaigns apex call failed:', err);
      }
    }

    // Real active Salesforce campaigns from your Salesforce org
    return [
      {
        Id: 'a0Mfj000001gMefEAE',
        Name: 'Disaster Relief Fundraising Campaign',
        Program__r: { Name: 'Disaster Relief & Emergency Assistance Program' },
        Expected_Revenue_in_Campaign__c: 150000,
        Description__c: 'A fundraising initiative to provide emergency assistance, essential supplies, temporary shelter, and recovery support to communities affected by natural disasters across the United States.',
        Active__c: true
      },
      {
        Id: 'a0Mfj000001gMbREAU',
        Name: 'Organ Transplant Funding Campaign',
        Program__r: { Name: 'Organ Transplant Funding Program' },
        Expected_Revenue_in_Campaign__c: 100000,
        Description__c: 'A fundraising campaign to collect donations to support organ transplant funding and related patient assistance through the selected program.',
        Active__c: true
      }
    ];
  }

  async createDonation(params) {
    if (this.actions?.createDonation) {
      try {
        return await this.actions.createDonation(params);
      } catch (err) {
        console.error('Apex createDonation error:', err);
        throw err;
      }
    }
    const mockDonation = {
      Id: 'don_' + Date.now(),
      Donor_Campaign__c: params.campaignId,
      Donation_Amount__c: params.amount,
      Donor_Name__c: params.donorName || 'Generous Donor',
      Donor_Email__c: params.donorEmail,
      Payment_Status__c: 'Successful',
      Payment_Date__c: new Date().toISOString(),
      Receipt_Number__c: 'REC-' + Math.floor(10000000 + Math.random() * 90000000)
    };
    const stored = JSON.parse(localStorage.getItem('gms_donations') || '[]');
    stored.unshift(mockDonation);
    localStorage.setItem('gms_donations', JSON.stringify(stored));
    return mockDonation;
  }

  async getDonorDashboardSummary() {
    if (this.actions?.getDonorDashboardSummary) {
      try {
        const res = await this.actions.getDonorDashboardSummary();
        if (res) return res;
      } catch (err) {
        console.warn('Apex getDonorDashboardSummary call failed, using fallback:', err);
      }
    }
    const stored = JSON.parse(localStorage.getItem('gms_donations') || '[]');
    const total = stored.reduce((acc, curr) => acc + (Number(curr.Donation_Amount__c) || 0), 0);
    return {
      totalDonations: total > 0 ? total : 792,
      campaignsSupported: stored.length > 0 ? stored.length : 3,
      totalTransactions: stored.length > 0 ? stored.length : 4,
      profileStatus: 'Approved',
      isApproved: true,
      recentDonations: stored.length > 0 ? stored : [
        {
          Id: 'don-demo-1',
          Donation_Amount__c: 180,
          Donor_Campaign__r: { Name: 'Clean Water & Sanitation Initiative 2026' },
          Payment_Status__c: 'Successful',
          Payment_Date__c: new Date(Date.now() - 86400000 * 2).toISOString(),
          Receipt_Number__c: 'REC-84920194'
        },
        {
          Id: 'don-demo-2',
          Donation_Amount__c: 360,
          Donor_Campaign__r: { Name: 'Emergency Medical Mobile Clinics' },
          Payment_Status__c: 'Successful',
          Payment_Date__c: new Date(Date.now() - 86400000 * 8).toISOString(),
          Receipt_Number__c: 'REC-39104821'
        }
      ]
    };
  }

  async submitDonorCampaignApplication(applicationData) {
    if (this.actions?.submitDonorCampaignApplication) {
      return await this.actions.submitDonorCampaignApplication(applicationData);
    }

    const appId = 'DAPP-' + Math.floor(1000 + Math.random() * 9000);
    return {
      success: true,
      applicationId: appId,
      submittedDate: new Date().toISOString(),
      campaignName: applicationData.campaignName,
      pledgeAmount: applicationData.pledgeAmount
    };
  }
}

export default new SalesforceService();
