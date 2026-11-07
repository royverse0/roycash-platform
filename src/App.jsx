import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import ApplicationModal from './components/ApplicationModal.jsx';

// Pages
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

export default function App() {
  const getInitialRoute = () => {
    const hash = window.location.hash.replace('#', '').trim().toLowerCase();
    return hash || 'home';
  };

  const [currentRoute, setCurrentRoute] = useState(getInitialRoute);
  const [modalState, setModalState] = useState({ isOpen: false, type: 'publisher' });

  // Sync hash routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').trim().toLowerCase();
      setCurrentRoute(hash || 'home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Sync page title for SEO and UX
  useEffect(() => {
    const titleMap = {
      home: 'RoyCash - Premium Affiliate & Performance Marketing Network',
      publishers: 'For Publishers | RoyCash Performance Network',
      advertisers: 'For Advertisers | RoyCash Performance Network',
      'campaign-models': '10 Campaign Performance Models | RoyCash',
      tracking: 'How Tracking Works & S2S Postbacks | RoyCash',
      about: 'About Us | RoyCash Performance Network',
      contact: 'Contact Us | RoyCash Partnerships & Support',
      privacy: 'Privacy Policy | RoyCash Network',
      terms: 'Terms & Conditions | RoyCash Network',
      disclaimer: 'Earnings & Performance Disclaimer | RoyCash Network',
    };

    const targetTitle = titleMap[currentRoute] || 'Page Not Found | RoyCash Network';
    document.title = targetTitle;
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
    switch (currentRoute) {
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
    </div>
  );
}
