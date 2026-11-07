import React, { useState } from 'react';
import { Menu, X, ArrowUpRight, ShieldCheck } from 'lucide-react';

export default function Navbar({ currentRoute, navigate, openModal }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Publishers', route: 'publishers' },
    { label: 'Advertisers', route: 'advertisers' },
    { label: 'Campaign Models', route: 'campaign-models' },
    { label: 'Tracking', route: 'tracking' },
    { label: 'About', route: 'about' },
  ];

  const handleNavClick = (route, e) => {
    e.preventDefault();
    navigate(route);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="header-wrapper">
      <div className="container header-container">
        {/* Zone 1: Single text element wordmark */}
        <a 
          href="#home" 
          onClick={(e) => handleNavClick('home', e)}
          className="brand-logo"
        >
          <span className="brand-icon">R</span>
          <span>RoyCash</span>
        </a>

        {/* Zone 2: 4-5 clean single-line text navigation links */}
        <nav className="nav-links" aria-label="Main Navigation">
          {navItems.map((item) => (
            <a
              key={item.route}
              href={`#${item.route}`}
              onClick={(e) => handleNavClick(item.route, e)}
              className={`nav-link ${currentRoute === item.route ? 'active' : ''}`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="header-actions">
          <button 
            type="button"
            onClick={() => openModal('publisher')}
            className="btn btn-primary btn-sm"
          >
            <span>Partner With Us</span>
            <ArrowUpRight size={14} />
          </button>
        </div>

        {/* Mobile menu toggle */}
        <button
          type="button"
          className="mobile-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-menu-drawer" role="dialog" aria-modal="true">
          <nav style={{ display: 'flex', flexDirection: 'column' }}>
            <a
              href="#home"
              onClick={(e) => handleNavClick('home', e)}
              className={`mobile-nav-link ${currentRoute === 'home' ? 'active' : ''}`}
            >
              Home
            </a>
            {navItems.map((item) => (
              <a
                key={item.route}
                href={`#${item.route}`}
                onClick={(e) => handleNavClick(item.route, e)}
                className={`mobile-nav-link ${currentRoute === item.route ? 'active' : ''}`}
              >
                {item.label}
              </a>
            ))}
            <a
              href="#contact"
              onClick={(e) => handleNavClick('contact', e)}
              className={`mobile-nav-link ${currentRoute === 'contact' ? 'active' : ''}`}
            >
              Contact Us
            </a>
          </nav>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            <button 
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                openModal('publisher');
              }}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              Join as Publisher
            </button>
            <button 
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                openModal('advertiser');
              }}
              className="btn btn-secondary"
              style={{ width: '100%' }}
            >
              Onboard as Advertiser
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
