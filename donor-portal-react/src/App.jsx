import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ReceiptModal from './components/ReceiptModal';
import PartnerInquiryModal from './components/PartnerInquiryModal';
import DonorProfileModal from './components/DonorProfileModal';
import MyGivingModal from './components/MyGivingModal';
import Home from './pages/Home';
import Campaigns from './pages/Campaigns';
import CampaignDetails from './pages/CampaignDetails';
import ImpactStory from './pages/ImpactStory';
import Donate from './pages/Donate';
import ErrorBoundary from './components/ErrorBoundary';
import salesforceService from './services/salesforceService';
import './App.css';

export default function App({ userAuth }) {
  const [campaigns, setCampaigns] = useState([]);
  const [donateModalOpen, setDonateModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [initialAmount, setInitialAmount] = useState(100);
  const [receiptData, setReceiptData] = useState(null);
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [givingModalOpen, setGivingModalOpen] = useState(false);
  const [profileStatus, setProfileStatus] = useState(() => userAuth?.profileStatus || salesforceService.profileStatus);
  const [isCampaignLocked, setIsCampaignLocked] = useState(false);

  useEffect(() => {
    async function initCampaigns() {
      try {
        const list = await salesforceService.getActiveCampaigns();
        if (list && list.length > 0) {
          setCampaigns(list);
          setSelectedCampaign(list[0]);
        }
      } catch (e) {
        console.error('Error initializing campaigns in App:', e);
      }
    }
    initCampaigns();

    if (salesforceService.isLoggedIn || userAuth?.isLoggedIn) {
      salesforceService.getDonorProfileStatus().then(res => {
        if (res) setProfileStatus(res);
      });
    }
  }, [userAuth]);

  // Handle return from Stripe Checkout
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('stripe_session_id') || urlParams.get('session_id');

      if (sessionId) {
        // Clean URL query params so reload doesn't re-trigger
        const cleanUrl = window.location.pathname + (window.location.hash || '#dashboard');
        window.history.replaceState({}, document.title, cleanUrl);

        salesforceService.confirmStripeDonation(sessionId).then(res => {
          if (res && res.success) {
            handleDonationSuccess({
              donationId: res.donationId,
              receiptNumber: res.receiptNumber,
              amount: res.amount,
              campaignName: res.campaignName || 'Grant Program Giving',
              programName: res.programName || 'Philanthropic Initiative',
              donorName: res.donorName,
              donorEmail: (res.donorEmail && res.donorEmail !== 'receipt@donor.org')
                ? res.donorEmail
                : (profileStatus?.donorEmail || profileStatus?.email || profileStatus?.userEmail || userAuth?.userEmail || ''),
              date: res.date,
              frequency: res.frequency,
              designation: res.designation,
              transactionRef: res.transactionRef
            });
          }
        }).catch(err => {
          console.error('Error verifying Stripe checkout session:', err);
        });
      }
    } catch (e) {
      console.error('Error parsing Stripe return URL:', e);
    }
  }, []);

  // Auto-open Partner Inquiry Modal if URL contains #contact, #inquiry, or ?inquiry=true
  useEffect(() => {
    const handleUrlTrigger = () => {
      const hash = window.location.hash;
      const searchParams = new URLSearchParams(window.location.search);
      if (hash === '#contact' || hash === '#inquiry' || searchParams.get('inquiry') === 'true' || searchParams.get('contact') === 'true') {
        setInquiryModalOpen(true);
      }
    };

    handleUrlTrigger();
    window.addEventListener('hashchange', handleUrlTrigger);
    return () => window.removeEventListener('hashchange', handleUrlTrigger);
  }, []);

  const navigate = useNavigate();

  const handleOpenDonate = (campaign = null, amount = null) => {
    navigate('/donate', {
      state: {
        campaign: campaign,
        amount: amount,
        isLocked: Boolean(campaign)
      }
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDonationSuccess = (receipt) => {
    setReceiptData(receipt);
    setReceiptModalOpen(true);
    // Refresh campaigns to show live updated raised amount & donor counts
    salesforceService.getActiveCampaigns().then(updated => {
      if (updated && updated.length > 0) setCampaigns(updated);
    });
  };

  const isLoggedIn = userAuth?.isLoggedIn ?? salesforceService.isLoggedIn;
  const [inquiryInitialCampaign, setInquiryInitialCampaign] = useState(null);

  const handleOpenInquiry = (campaign = null) => {
    setInquiryInitialCampaign(campaign);
    setInquiryModalOpen(true);
  };

  const handleCloseInquiry = () => {
    setInquiryModalOpen(false);
    setInquiryInitialCampaign(null);
    if (window.location.hash === '#contact' || window.location.hash === '#inquiry') {
      window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
    }
  };

  return (
    <div className="donor-app">
      <Navbar
        userAuth={userAuth}
        profileStatus={profileStatus}
        onOpenDonate={handleOpenDonate}
        onOpenInquiry={handleOpenInquiry}
        onOpenProfile={() => setProfileModalOpen(true)}
        onOpenGiving={() => setGivingModalOpen(true)}
      />

      <main className="main-viewport">
        <ErrorBoundary>
          <Routes>
            <Route
              path="/"
              element={
                <Home
                  onOpenDonate={handleOpenDonate}
                  onOpenInquiry={handleOpenInquiry}
                  isLoggedIn={isLoggedIn}
                />
              }
            />
            <Route
              path="/campaigns"
              element={<Campaigns onOpenDonate={handleOpenDonate} onOpenInquiry={handleOpenInquiry} isLoggedIn={isLoggedIn} />}
            />
            <Route
              path="/campaign/:campaignId"
              element={<CampaignDetails onOpenDonate={handleOpenDonate} onOpenInquiry={handleOpenInquiry} isLoggedIn={isLoggedIn} />}
            />
            <Route
              path="/impact"
              element={
                <ImpactStory
                  campaigns={campaigns}
                  onOpenDonate={handleOpenDonate}
                  onOpenInquiry={handleOpenInquiry}
                  isLoggedIn={isLoggedIn}
                />
              }
            />
            <Route
              path="/donate"
              element={
                <Donate
                  campaigns={campaigns}
                  userAuth={userAuth}
                  profileStatus={profileStatus}
                  onOpenProfile={() => setProfileModalOpen(true)}
                  onDonationSuccess={handleDonationSuccess}
                />
              }
            />
          </Routes>
        </ErrorBoundary>
      </main>

      <Footer onOpenInquiry={handleOpenInquiry} isLoggedIn={isLoggedIn} />

      {/* Global Modals */}

      <PartnerInquiryModal
        isOpen={inquiryModalOpen}
        onClose={handleCloseInquiry}
        campaigns={campaigns}
        initialCampaign={inquiryInitialCampaign}
        profileStatus={profileStatus}
      />

      <DonorProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        profileStatus={profileStatus}
        onProfileUpdated={(updated) => setProfileStatus(updated)}
      />

      <MyGivingModal
        isOpen={givingModalOpen}
        onClose={() => setGivingModalOpen(false)}
        onOpenDonate={handleOpenDonate}
        onViewReceipt={(receipt) => {
          setReceiptData(receipt);
          setReceiptModalOpen(true);
        }}
      />

      <ReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        receiptData={{
          ...receiptData,
          donorEmail: (receiptData?.donorEmail && receiptData.donorEmail !== 'receipt@donor.org')
            ? receiptData.donorEmail
            : (profileStatus?.donorEmail || profileStatus?.email || profileStatus?.userEmail || userAuth?.userEmail || '')
        }}
      />
    </div>
  );
}
