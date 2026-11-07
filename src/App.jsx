import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import ApplicationModal from './components/ApplicationModal.jsx';
import AuthModal from './components/AuthModal.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';

// Existing Network Pages
import Home from './pages/Home.jsx';
import Publishers from './pages/Publishers.jsx';
import Advertisers from './pages/Advertisers.jsx';
import CampaignModels from './pages/CampaignModels.jsx';
import TrackingWorks from './pages/TrackingWorks.jsx';
import About from './pages/About.jsx';
import Contact from './pages/Contact.jsx';
import PrivacyPolicy from './pages/PrivacyPolicy.jsx';
import TermsConditions from './pages/TermsConditions.jsx';
import Disclaimer from './pages/Disclaimer.jsx';
import NotFound from './pages/NotFound.jsx';

// New Cashback Platform Pages
import OfferWall from './pages/OfferWall.jsx';
import LiveTracking from './pages/LiveTracking.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Wallet from './pages/Wallet.jsx';
import Referrals from './pages/Referrals.jsx';
import Admin from './pages/Admin.jsx';

function MainApp() {
  const { authModal, closeAuth } = useAuth();

  const getInitialRoute = () => {
    const raw = window.location.hash.replace('#', '').trim();
    return raw || 'home';
  };

  const [currentRoute, setCurrentRoute] = useState(getInitialRoute);
  const [modalState, setModalState] = useState({ isOpen: false, type: 'publisher' });

  // Sync hash routing
  useEffect(() => {
    const handleHashChange = () => {
      const raw = window.location.hash.replace('#', '').trim();
      setCurrentRoute(raw || 'home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Sync page title for SEO and UX
  useEffect(() => {
    const baseTitle = 'RoyCash - Premium Cashback & Performance Network';
    if (currentRoute === 'home') document.title = baseTitle;
    else if (currentRoute === 'offers') document.title = 'Verified Cashback Offers & Campaigns | RoyCash';
    else if (currentRoute.startsWith('track/')) document.title = 'Live Offer Tracking & Postback Timeline | RoyCash';
    else if (currentRoute === 'dashboard') document.title = 'Member Dashboard & Wallet | RoyCash';
    else if (currentRoute === 'wallet') document.title = 'Cashback Wallet & Withdrawals | RoyCash';
    else if (currentRoute === 'referrals') document.title = 'Referral Hub & Community Rewards | RoyCash';
    else if (currentRoute === 'admin') document.title = 'Admin Operations Console | RoyCash';
    else if (currentRoute === 'publishers') document.title = 'For Publishers | RoyCash Network';
    else if (currentRoute === 'advertisers') document.title = 'For Advertisers | RoyCash Network';
    else if (currentRoute === 'campaign-models') document.title = '10 Campaign Performance Models | RoyCash';
    else if (currentRoute === 'tracking') document.title = 'How Tracking Works & S2S Postbacks | RoyCash';
    else if (currentRoute === 'about') document.title = 'About Us | RoyCash Network';
    else if (currentRoute === 'contact') document.title = 'Contact Support & Partnerships | RoyCash';
    else if (currentRoute === 'privacy') document.title = 'Privacy Policy | RoyCash Network';
    else if (currentRoute === 'terms') document.title = 'Terms & Conditions | RoyCash Network';
    else if (currentRoute === 'disclaimer') document.title = 'Earnings & Performance Disclaimer | RoyCash';
    else document.title = 'Page Not Found | RoyCash Network';
  }, [currentRoute]);

  const navigate = (route) => {
    window.location.hash = route;
    setCurrentRoute(route);
  };

  const openModal = (type = 'publisher') => {
    setModalState({ isOpen: true, type });
  };

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  // Route resolver
  const renderCurrentPage = () => {
    // Dynamic tracking route: track/:clickId
    if (currentRoute.startsWith('track/')) {
      const clickId = currentRoute.replace('track/', '').split('?')[0];
      return <LiveTracking clickId={clickId} navigate={navigate} />;
    }

    switch (currentRoute) {
      // New Cashback Platform Routes
      case 'offers':
        return <OfferWall navigate={navigate} />;
      case 'dashboard':
        return <Dashboard navigate={navigate} />;
      case 'wallet':
        return <Wallet navigate={navigate} />;
      case 'referrals':
        return <Referrals navigate={navigate} />;
      case 'admin':
        return <Admin navigate={navigate} />;

      // Existing Preserved Marketing Pages
      case 'home':
        return <Home navigate={navigate} openModal={openModal} />;
      case 'publishers':
        return <Publishers navigate={navigate} openModal={openModal} />;
      case 'advertisers':
        return <Advertisers navigate={navigate} openModal={openModal} />;
      case 'campaign-models':
        return <CampaignModels navigate={navigate} openModal={openModal} />;
      case 'tracking':
        return <TrackingWorks navigate={navigate} openModal={openModal} />;
      case 'about':
        return <About navigate={navigate} openModal={openModal} />;
      case 'contact':
        return <Contact navigate={navigate} openModal={openModal} />;
      case 'privacy':
        return <PrivacyPolicy />;
      case 'terms':
        return <TermsConditions />;
      case 'disclaimer':
        return <Disclaimer />;
      default:
        return <NotFound navigate={navigate} />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar currentRoute={currentRoute} navigate={navigate} openModal={openModal} />
      <main style={{ flex: 1 }}>
        {renderCurrentPage()}
      </main>
      <Footer navigate={navigate} />

      <ApplicationModal
        isOpen={modalState.isOpen}
        initialType={modalState.type}
        onClose={closeModal}
      />

      <AuthModal
        isOpen={authModal.isOpen}
        initialMode={authModal.initialMode}
        onClose={closeAuth}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
