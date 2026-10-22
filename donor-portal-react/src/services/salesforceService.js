/**
 * Salesforce Service for Donor Portal
 * Interacts with Salesforce LWC bridge via window.__DONOR_PORTAL_ACTIONS__
 * Falls back to live demo mock data when running standalone.
 */

class SalesforceService {
  constructor() {
    this.actions = null;
    this.data = null;
    this.assets = null;
    this.sitePrefix = '';
    this.initialize();
  }

  initialize() {
    this.actions = window.__DONOR_PORTAL_ACTIONS__ || null;
    this.data = window.__DONOR_PORTAL_DATA__ || {};
    this.assets = window.__DONOR_PORTAL_ASSETS__ || {};
    this.sitePrefix = window.__DONOR_PORTAL_SITE_PREFIX__ || '';
  }

  get isSalesforce() {
    return Boolean(this.actions && typeof this.actions.getActiveCampaigns === 'function');
  }

  get isLoggedIn() {
    return Boolean(this.data?.isLoggedIn);
  }

  get userName() {
    return this.data?.userName || '';
  }

  get loginUrl() {
    if (this.actions?.loginUrl) return this.actions.loginUrl;
    if (this.data?.loginUrl) return this.data.loginUrl;
    const sitePrefix = this.sitePrefix || (window.location.pathname.startsWith('/donor') ? '/donor' : '');
    return window.location.origin + sitePrefix + '/DonorCustomLogin';
  }

  get logoutUrl() {
    if (this.data?.logoutUrl) return this.data.logoutUrl;
    const sitePrefix = this.sitePrefix || (window.location.pathname.startsWith('/donor') ? '/donor' : '');
    return window.location.origin + sitePrefix + '/secur/logout.jsp?retURL=' + encodeURIComponent(window.location.origin + sitePrefix);
  }

  logout() {
    if (this.actions?.logout) {
      this.actions.logout();
    } else {
      window.location.href = this.logoutUrl;
    }
  }

  get profileStatus() {
    return this.data?.profileStatus || { status: this.isLoggedIn ? 'NO_PROFILE' : 'GUEST' };
  }

  // Get donor profile and verification status
  async getDonorProfileStatus() {
    if (this.actions?.getDonorProfileStatus) {
      try {
        const res = await this.actions.getDonorProfileStatus();
        if (res) {
          if (!this.data) this.data = {};
          this.data.profileStatus = res;
        }
        return res;
      } catch (e) {
        console.error('Error fetching profile status from Apex:', e);
      }
    }
    return this.data?.profileStatus || { status: this.isLoggedIn ? 'NO_PROFILE' : 'GUEST' };
  }

  // Submit or update donor KYC profile
  async submitDonorProfile(payload) {
    if (this.actions?.submitDonorProfile) {
      try {
        const res = await this.actions.submitDonorProfile(payload);
        if (res && res.success) {
          if (!this.data) this.data = {};
          this.data.profileStatus = {
            ...(this.data.profileStatus || {}),
            status: 'Pending',
            complianceStatus: 'Pending',
            donorId: res.donorId,
            kycVerified: false,
            ...payload
          };
        }
        return res;
      } catch (e) {
        console.error('Error submitting donor profile to Apex:', e);
        const errMsg = e?.body?.message || e?.message || (typeof e === 'string' ? e : 'Profile submission failed.');
        return { success: false, error: errMsg };
      }
    }
    // Standalone fallback
    if (!this.data) this.data = {};
    this.data.profileStatus = {
      status: 'Pending',
      complianceStatus: 'Pending',
      donorId: 'DEMO-DNR-001',
      kycVerified: false,
      ...payload
    };
    return { success: true, donorId: 'DEMO-DNR-001', status: 'Pending' };
  }

  // Assets helper
  getAsset(key) {
    return this.assets?.[key] || '';
  }

  // Get active campaigns
  async getActiveCampaigns() {
    if (this.actions?.getActiveCampaigns) {
      try {
        const res = await this.actions.getActiveCampaigns();
        return Array.isArray(res) ? res : [];
      } catch (e) {
        console.error('Error fetching campaigns from Apex:', e);
      }
    }
    // Standalone fallback / demo data
    return [
      {
        id: 'a0Mfj000001gMbREAU',
        name: 'Organ Transplant Funding Campaign',
        description: 'Providing life-saving organ transplants, post-operative medication, and compassionate rehabilitation for underprivileged pediatric and adult patients.',
        goalAmount: 100000,
        raisedAmount: 64500,
        donorCount: 142,
        progressPercent: 64.5,
        startDate: '2026-01-15',
        endDate: '2026-12-31',
        type: 'Medical Grant',
        status: 'In Progress',
        programId: 'a06fj00000A1uSDAAZ',
        programName: 'Global Medical Grant Initiative',
        programType: 'Healthcare & Life Sciences'
      },
      {
        id: 'a0Mfj000001gMefEAE',
        name: 'Disaster Relief & Rapid Recovery',
        description: 'Deploying immediate emergency supplies, clean drinking water, temporary shelters, and primary medical kits to communities afflicted by extreme natural disasters.',
        goalAmount: 150000,
        raisedAmount: 98200,
        donorCount: 289,
        progressPercent: 65.5,
        startDate: '2026-02-01',
        endDate: '2026-11-30',
        type: 'Emergency Response',
        status: 'In Progress',
        programId: 'a06fj000009Ii2DAAS',
        programName: 'Crisis & Humanitarian Aid Fund',
        programType: 'Disaster Humanitarian Aid'
      },
      {
        id: 'demo-campaign-3',
        name: 'Future Innovators STEM Fellowship',
        description: 'Empowering first-generation scholars with full university tuition, cutting-edge AI laboratory access, and personalized mentorship.',
        goalAmount: 75000,
        raisedAmount: 48000,
        donorCount: 95,
        progressPercent: 64.0,
        startDate: '2026-03-01',
        endDate: '2026-10-31',
        type: 'Education Grant',
        status: 'In Progress',
        programId: 'demo-prog-3',
        programName: 'NextGen Scholars Program',
        programType: 'Academic Research & Education'
      }
    ];
  }

  // Get single campaign details + live supporter wall
  async getCampaignDetails(campaignId) {
    if (this.actions?.getCampaignDetails) {
      try {
        return await this.actions.getCampaignDetails(campaignId);
      } catch (e) {
        console.error('Error fetching campaign details from Apex:', e);
      }
    }
    const all = await this.getActiveCampaigns();
    const found = all.find(c => c.id === campaignId) || all[0];
    return {
      campaign: found,
      recentDonations: [
        { donorName: 'Eleanor Vance', amount: 500, date: new Date().toISOString(), message: 'In memory of my mother. Keep up the vital work!' },
        { donorName: 'Marcus Sterling', amount: 250, date: new Date(Date.now() - 86400000).toISOString(), message: 'Proud to stand with this community.' },
        { donorName: 'Dr. Aris Thorne', amount: 1000, date: new Date(Date.now() - 172800000).toISOString(), message: 'Every life touched is a victory.' },
        { donorName: 'Anonymous Supporter', amount: 100, date: new Date(Date.now() - 259200000).toISOString(), message: 'Sending hope and strength.' }
      ]
    };
  }

  // Create real Stripe Checkout Session
  async createStripeCheckoutSession(payload) {
    if (this.actions?.createStripeCheckoutSession) {
      try {
        return await this.actions.createStripeCheckoutSession(payload);
      } catch (e) {
        console.error('Error creating Stripe session:', e);
        const errMsg = e?.body?.message || e?.message || (typeof e === 'string' ? e : 'Stripe checkout initialization failed.');
        return { success: false, error: errMsg };
      }
    }
    // Standalone fallback
    return {
      success: true,
      sessionId: 'demo_session_' + Date.now(),
      checkoutUrl: null // will trigger simulated modal flow
    };
  }

  // Confirm and verify real Stripe Checkout Session
  async confirmStripeDonation(sessionId) {
    if (this.actions?.confirmStripeDonation) {
      try {
        return await this.actions.confirmStripeDonation(sessionId);
      } catch (e) {
        console.error('Error confirming Stripe session:', e);
        const errMsg = e?.body?.message || e?.message || (typeof e === 'string' ? e : 'Failed to verify Stripe payment.');
        return { success: false, error: errMsg };
      }
    }
    return {
      success: true,
      donationId: 'DON-' + Math.floor(1000 + Math.random() * 9000),
      receiptNumber: 'REC-' + Date.now().toString().slice(4) + '-777',
      amount: 100,
      campaignName: 'Verified Initiative',
      date: new Date().toISOString()
    };
  }

  // Submit donation (direct or verified fallback)
  async submitDonation(payload) {
    if (this.actions?.submitDonation) {
      try {
        return await this.actions.submitDonation(payload);
      } catch (e) {
        console.error('Error submitting donation to Apex:', e);
        const errMsg = e?.body?.message || e?.message || (typeof e === 'string' ? e : 'Donation submission failed.');
        return { success: false, error: errMsg };
      }
    }
    return {
      success: true,
      donationId: 'DON-' + Math.floor(1000 + Math.random() * 9000),
      receiptNumber: 'REC-' + Date.now().toString().slice(4) + '-777',
      amount: payload?.amount || 100,
      campaignName: payload?.campaignName || 'General Grant Fund',
      date: new Date().toISOString()
    };
  }

  // Submit Corporate / Major Gift Inquiry (Lead)
  async submitLeadInquiry(payload) {
    if (this.actions?.submitLeadInquiry) {
      try {
        return await this.actions.submitLeadInquiry(payload);
      } catch (e) {
        console.error('Error submitting inquiry to Apex:', e);
        const errMsg = e?.body?.message || e?.message || (typeof e === 'string' ? e : 'Failed to submit inquiry.');
        return { success: false, error: errMsg };
      }
    }
    return { success: true, leadId: '00Q' + Math.floor(100000000000 + Math.random() * 900000000000) };
  }

  // Platform high level stats
  async getDonorPlatformStats() {
    if (this.actions?.getDonorPlatformStats) {
      try {
        return await this.actions.getDonorPlatformStats();
      } catch (e) {
        console.error('Error fetching platform stats:', e);
      }
    }
    return {
      activeCampaigns: 8,
      totalRaised: 312700,
      uniqueDonors: 1420,
      programsCount: 14
    };
  }
}

export default new SalesforceService();
