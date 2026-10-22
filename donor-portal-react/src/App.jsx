import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import DonationModal from './components/DonationModal';
import ReceiptModal from './components/ReceiptModal';
import PartnerInquiryModal from './components/PartnerInquiryModal';
import DonorProfileModal from './components/DonorProfileModal';
import Home from './pages/Home';
import Campaigns from './pages/Campaigns';
import CampaignDetails from './pages/CampaignDetails';
import ImpactStory from './pages/ImpactStory';
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
  const [profileStatus, setProfileStatus] = useState(() => userAuth?.profileStatus || salesforceService.profileStatus);

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
              donorEmail: res.donorEmail,
              date: res.date
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

  const handleOpenDonate = (campaign = null, amount = null) => {
    if (campaign) {
      setSelectedCampaign(campaign);
    } else if (campaigns.length > 0 && !selectedCampaign) {
      setSelectedCampaign(campaigns[0]);
    }
    if (amount) {
      setInitialAmount(amount);
    }
    setDonateModalOpen(true);
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

  const handleOpenInquiry = () => {
    if (!isLoggedIn) {
      setInquiryModalOpen(true);
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
      />

      <main className="main-viewport">
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
            element={<Campaigns onOpenDonate={handleOpenDonate} />}
          />
          <Route
            path="/campaign/:campaignId"
            element={<CampaignDetails onOpenDonate={handleOpenDonate} />}
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
        </Routes>
      </main>

      <Footer onOpenInquiry={handleOpenInquiry} isLoggedIn={isLoggedIn} />

      {/* Global Modals */}
      <DonationModal
        isOpen={donateModalOpen}
        onClose={() => setDonateModalOpen(false)}
        defaultCampaign={selectedCampaign}
        initialAmount={initialAmount}
        campaigns={campaigns}
        onDonationSuccess={handleDonationSuccess}
        userAuth={userAuth}
        profileStatus={profileStatus}
        onOpenProfile={() => setProfileModalOpen(true)}
      />

      <ReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        receiptData={receiptData}
      />

      <PartnerInquiryModal
        isOpen={inquiryModalOpen}
        onClose={() => setInquiryModalOpen(false)}
        campaigns={campaigns}
      />

      <DonorProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        profileStatus={profileStatus}
        onProfileUpdated={(updated) => setProfileStatus(updated)}
      />
    </div>
  );
}
