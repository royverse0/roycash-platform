import React from 'react';
import { ArrowUpRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function Footer({ navigate }) {
  const handleNav = (route, e) => {
    e.preventDefault();
    navigate(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="footer-wrapper">
      <div className="container">
        <div className="footer-grid">
          {/* Brand Column */}
          <div className="footer-col">
            <a 
              href="#home" 
              onClick={(e) => handleNav('home', e)}
              className="brand-logo" 
              style={{ marginBottom: '16px', display: 'inline-flex' }}
            >
              <span className="brand-icon">R</span>
              <span>RoyCash</span>
            </a>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: '12px', fontWeight: '500' }}>
              "Earn Through Actions. Grow Through Referrals."
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: '1.6', maxWidth: '380px', marginBottom: '20px' }}>
              Enterprise performance marketing and affiliate network built on deterministic S2S postback tracking, strict conversion validation, and transparent multi-tier commissions.
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--emerald-primary)', fontSize: '0.8125rem', fontWeight: '600' }}>
              <ShieldCheck size={16} />
              <span>Verified Merchant Tracking &amp; Zero-Fraud Policy</span>
            </div>
          </div>

          {/* Network Navigation */}
          <div className="footer-col">
            <h4>Ecosystem</h4>
            <ul className="footer-links">
              <li><a href="#offers" onClick={(e) => handleNav('offers', e)}>Cashback Offers Wall</a></li>
              <li><a href="#dashboard" onClick={(e) => handleNav('dashboard', e)}>Member Dashboard</a></li>
              <li><a href="#wallet" onClick={(e) => handleNav('wallet', e)}>Wallet &amp; Withdrawals</a></li>
              <li><a href="#referrals" onClick={(e) => handleNav('referrals', e)}>Referral Hub</a></li>
              <li><a href="#publishers" onClick={(e) => handleNav('publishers', e)}>For Publishers</a></li>
              <li><a href="#advertisers" onClick={(e) => handleNav('advertisers', e)}>For Advertisers</a></li>
              <li><a href="#campaign-models" onClick={(e) => handleNav('campaign-models', e)}>Campaign Models (10 Models)</a></li>
              <li><a href="#tracking" onClick={(e) => handleNav('tracking', e)}>How Tracking Works</a></li>
            </ul>
          </div>

          {/* Company & Support */}
          <div className="footer-col">
            <h4>Company</h4>
            <ul className="footer-links">
              <li><a href="#about" onClick={(e) => handleNav('about', e)}>About RoyCash</a></li>
              <li><a href="#contact" onClick={(e) => handleNav('contact', e)}>Contact &amp; Support</a></li>
              <li><a href="#tracking" onClick={(e) => handleNav('tracking', e)}>S2S Postback Specs</a></li>
              <li><a href="#publishers" onClick={(e) => handleNav('publishers', e)}>Publisher Guidelines</a></li>
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div className="footer-col">
            <h4>Compliance</h4>
            <ul className="footer-links">
              <li><a href="#privacy" onClick={(e) => handleNav('privacy', e)}>Privacy Policy</a></li>
              <li><a href="#terms" onClick={(e) => handleNav('terms', e)}>Terms &amp; Conditions</a></li>
              <li><a href="#disclaimer" onClick={(e) => handleNav('disclaimer', e)}>Earnings Disclaimer</a></li>
              <li><a href="#admin" onClick={(e) => handleNav('admin', e)}>Admin Console</a></li>
              <li><a href="#tracking" onClick={(e) => handleNav('tracking', e)}>Fraud &amp; Deduplication</a></li>
            </ul>
          </div>
        </div>

        {/* Regulatory & Honesty Notice */}
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '16px 20px', marginBottom: '32px', fontSize: '0.8125rem', color: 'var(--text-dim)', lineHeight: '1.6' }}>
          <strong style={{ color: 'var(--text-muted)' }}>Transparent Network Policy:</strong> RoyCash does not guarantee publisher earnings or conversion volumes. Actual payouts and cashback rewards are strictly contingent on live advertiser availability, validated user actions, and verified server-to-server confirmation. RoyCash does not independently inspect closed third-party apps without advertiser SDK or postback integration.
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom">
          <div>
            &copy; {new Date().getFullYear()} RoyCash Performance Network. All rights reserved.
          </div>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <span>Verified Integration</span>
            <span aria-hidden="true">&middot;</span>
            <span>Standard S2S Protocol</span>
            <span aria-hidden="true">&middot;</span>
            <span style={{ color: 'var(--gold-accent)' }}>Mitgo Partner Ready</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
