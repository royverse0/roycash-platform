import React from 'react';
import { ArrowRight, ShieldCheck, CheckCircle2, Target, Globe, Cpu, Users } from 'lucide-react';

export default function About({ navigate, openModal }) {
  const values = [
    {
      title: "Deterministic Attribution",
      desc: "We prioritize server-to-server engineering over brittle browser cookies, ensuring accurate, tamper-proof tracking for all participants."
    },
    {
      title: "Zero-Fraud Discipline",
      desc: "Advertisers trust us because we actively police traffic. Click injection, bot farms, and deceptive practices have zero place in our ecosystem."
    },
    {
      title: "Ethical Transparency",
      desc: "We do not manufacture fake earnings, fake testimonials, or hollow income guarantees. Real marketing performance requires real strategy."
    },
    {
      title: "Sustainable Economics",
      desc: "We ensure our commission models create sustainable margin for merchants while rewarding affiliates for legitimate customer acquisition."
    }
  ];

  return (
    <div>
      {/* Hero */}
      <section className="section-wrapper" style={{ paddingTop: '80px', paddingBottom: '60px' }}>
        <div className="container">
          <div style={{ maxWidth: '820px' }}>
            <span className="badge-clean" style={{ marginBottom: '12px' }}>
              <ShieldCheck size={14} />
              <span>About RoyCash</span>
            </span>
            <h1 className="hero-title" style={{ marginBottom: '20px' }}>
              "Earn Through Actions. <br />
              <span className="text-emerald">Grow Through Referrals."</span>
            </h1>
            <p className="section-subtitle" style={{ marginBottom: '32px' }}>
              RoyCash is an enterprise performance marketing and cashback affiliate network built by engineers and growth specialists. We connect verified publishers with top-tier advertiser programs through deterministic tracking infrastructure.
            </p>
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="section-wrapper" style={{ background: 'rgba(13, 20, 36, 0.4)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="container">
          <div className="grid-2" style={{ gap: '48px', alignItems: 'center' }}>
            <div>
              <span className="badge-gold-clean">Our Philosophy</span>
              <h2 className="section-title" style={{ marginTop: '6px' }}>The Antidote to Affiliate Opacity</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.65', marginBottom: '16px' }}>
                For too long, the affiliate and performance marketing space has been clouded by exaggerated income claims, mysterious shaving of conversions, and unreliable third-party cookies that break with every browser update.
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.65', marginBottom: '24px' }}>
                RoyCash was engineered from first principles to be the transparent, reliable performance network that modern digital media buyers, content creators, and direct-to-consumer brands demand.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#FFFFFF' }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--emerald-primary)' }} />
                  <span>Direct postback reconciliation with advertiser databases</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#FFFFFF' }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--emerald-primary)' }} />
                  <span>Zero toleration for bot traffic, click stuffing, or deceptive popups</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#FFFFFF' }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--emerald-primary)' }} />
                  <span>Standardized payout cycles with complete postback audit logs</span>
                </div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '36px' }}>
              <div style={{ marginBottom: '20px' }}>
                <span className="badge-clean">Operational Pillars</span>
                <h3 style={{ fontSize: '1.25rem', marginTop: '6px' }}>Core Network Tenets</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {values.map((v, i) => (
                  <div key={i}>
                    <h4 style={{ fontSize: '0.95rem', color: '#FFFFFF', marginBottom: '4px' }}>{v.title}</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.55' }}>{v.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Network Standards */}
      <section className="section-wrapper">
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 48px auto' }}>
            <span className="badge-clean">Integrity Standards</span>
            <h2 className="section-title">Strict Professional Governance</h2>
            <p className="section-subtitle" style={{ margin: '0 auto' }}>
              We uphold compliance across GDPR, CCPA, and global digital advertising standards.
            </p>
          </div>

          <div className="grid-3">
            <div className="glass-card">
              <div className="feature-icon-box">
                <Globe size={22} />
              </div>
              <h3 className="card-title">Global Geo Verification</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: '1.6' }}>
                Traffic geo-matching ensures campaigns receive verified local intent, preventing cross-country spoofing and misattributed media spend.
              </p>
            </div>

            <div className="glass-card">
              <div className="feature-icon-box gold">
                <ShieldCheck size={22} />
              </div>
              <h3 className="card-title">Merchant Verification</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: '1.6' }}>
                Every advertiser program is thoroughly vetted for corporate legitimacy, financial health, and verified tracking endpoints prior to network launch.
              </p>
            </div>

            <div className="glass-card">
              <div className="feature-icon-box">
                <Users size={22} />
              </div>
              <h3 className="card-title">Dedicated Account Support</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: '1.6' }}>
                Experienced affiliate managers assist top publishers with bespoke landing page split-tests, sub-ID parameter optimization, and priority payment releases.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-wrapper" style={{ textAlign: 'center', background: 'rgba(7, 11, 20, 0.7)' }}>
        <div className="container" style={{ maxWidth: '640px' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '16px' }}>Ready to Experience Genuine Performance?</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '28px' }}>
            Join a network that values real outcomes, technical excellence, and transparent long-term collaboration.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => openModal('publisher')}
              className="btn btn-primary"
            >
              <span>Apply as Publisher</span>
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={() => openModal('advertiser')}
              className="btn btn-secondary"
            >
              <span>Onboard as Advertiser</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
