import React, { useState } from 'react';
import { Menu, X, ArrowUpRight, ShieldCheck, Wallet, User, LogOut, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar({ currentRoute, navigate, openModal }) {
  const { user, logout, openAuth } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);

  // Dynamic nav items based on authentication state
  const publicNavItems = [
    { label: 'Cashback Offers', route: 'offers' },
    { label: 'Publishers', route: 'publishers' },
    { label: 'Advertisers', route: 'advertisers' },
    { label: 'Tracking System', route: 'tracking' },
    { label: 'About', route: 'about' },
  ];

  const memberNavItems = [
    { label: 'Cashback Offers', route: 'offers' },
    { label: 'My Dashboard', route: 'dashboard' },
    { label: 'Wallet & Payouts', route: 'wallet' },
    { label: 'Referral Hub', route: 'referrals' },
    ...(user?.role === 'admin' ? [{ label: 'Admin Console', route: 'admin' }] : []),
  ];

  const activeNavItems = user ? memberNavItems : publicNavItems;

  const handleNavClick = (route, e) => {
    e.preventDefault();
    navigate(route);
    setMobileMenuOpen(false);
    setUserDropdown(false);
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
          {activeNavItems.map((item) => (
            <a
              key={item.route}
              href={`#${item.route}`}
              onClick={(e) => handleNavClick(item.route, e)}
              className={`nav-link ${currentRoute === item.route || currentRoute.startsWith(item.route) ? 'active' : ''}`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="header-actions">
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
              <button
                type="button"
                onClick={() => navigate('wallet')}
                className="btn btn-secondary btn-sm"
                style={{ border: '1px solid var(--border-emerald)', color: 'var(--emerald-light)', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Wallet size={14} />
                <span>₹{user.balances?.withdrawable_balance?.toFixed(0) || '0'}</span>
              </button>

              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setUserDropdown(!userDropdown)}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <User size={14} />
                  <span>{user.name?.split(' ')[0]}</span>
                </button>

                {userDropdown && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 'calc(100% + 8px)',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: '10px',
                      boxShadow: 'var(--shadow-lg)',
                      minWidth: '200px',
                      padding: '8px 0',
                      zIndex: 110,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.8rem' }}>
                      <div style={{ fontWeight: '700', color: '#FFFFFF' }}>{user.name}</div>
                      <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>{user.email}</div>
                    </div>
                    <a
                      href="#dashboard"
                      onClick={(e) => handleNavClick('dashboard', e)}
                      style={{ padding: '10px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}
                    >
                      Member Dashboard
                    </a>
                    <a
                      href="#wallet"
                      onClick={(e) => handleNavClick('wallet', e)}
                      style={{ padding: '10px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}
                    >
                      Wallet &amp; Payouts
                    </a>
                    <a
                      href="#referrals"
                      onClick={(e) => handleNavClick('referrals', e)}
                      style={{ padding: '10px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}
                    >
                      Referral Rewards
                    </a>
                    {user.role === 'admin' && (
                      <a
                        href="#admin"
                        onClick={(e) => handleNavClick('admin', e)}
                        style={{ padding: '10px 16px', fontSize: '0.85rem', color: 'var(--gold-accent)', fontWeight: '600' }}
                      >
                        Admin Control Plane
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        setUserDropdown(false);
                        navigate('home');
                      }}
                      style={{
                        padding: '10px 16px',
                        fontSize: '0.85rem',
                        color: '#F87171',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        borderTop: '1px solid var(--border-subtle)',
                        marginTop: '4px',
                      }}
                    >
                      <LogOut size={14} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                type="button"
                onClick={() => openAuth('login')}
                className="btn btn-secondary btn-sm"
              >
                <span>Sign In</span>
              </button>
              <button 
                type="button"
                onClick={() => openAuth('register')}
                className="btn btn-primary btn-sm"
              >
                <span>Join Free</span>
                <ArrowUpRight size={14} />
              </button>
            </div>
          )}
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
            {activeNavItems.map((item) => (
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
              Contact Support
            </a>
          </nav>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('wallet');
                  }}
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                >
                  My Wallet (₹{user.balances?.withdrawable_balance?.toFixed(0) || '0'})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                    navigate('home');
                  }}
                  className="btn btn-secondary"
                  style={{ width: '100%', color: '#F87171' }}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button 
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openAuth('login');
                  }}
                  className="btn btn-secondary"
                  style={{ width: '100%' }}
                >
                  Sign In to Account
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    openAuth('register');
                  }}
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                >
                  Create Free Account
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
