import React, { useState } from 'react';
import { 
  ArrowRight, 
  ArrowUpRight, 
  ShieldCheck, 
  CheckCircle2, 
  Layers, 
  Zap, 
  Database, 
  Globe, 
  BarChart3, 
  Lock, 
  ChevronDown, 
  HelpCircle,
  Share2,
  TrendingUp,
  Cpu
} from 'lucide-react';
import PostbackSimulator from '../components/PostbackSimulator.jsx';

export default function Home({ navigate, openModal }) {
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (idx) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const handleNav = (route, e) => {
    if (e) e.preventDefault();
    navigate(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const faqItems = [
    {
      q: "What is RoyCash and how does it operate?",
      a: "RoyCash is a dedicated performance marketing and affiliate network connecting vetted digital publishers (content creators, media buyers, app developers, and cashback aggregators) with verified merchant advertising programs. Our platform routes traffic through secure tracking links and reconciles verified conversions via direct Server-to-Server (S2S) postbacks."
    },
    {
      q: "Does RoyCash guarantee a fixed income or return?",
      a: "No. In accordance with ethical advertising standards, RoyCash strictly does not promise or guarantee publisher earnings. Compensation is strictly performance-based, depending on the volume of qualified traffic, conversion rates, and the specific terms of active advertiser campaigns."
    },
    {
      q: "How does RoyCash prevent duplicate conversions and fraud?",
      a: "Every outbound referral generates a cryptographic click identifier. When an advertiser's server fires a conversion callback, our engine checks the unique transaction ID against a 90-day ledger, verifies geographic and IP velocity parameters, and rejects duplicate or spoofed postback requests."
    },
    {
      q: "Can RoyCash detect actions inside third-party apps without advertiser integration?",
      a: "No. RoyCash never claims to independently inspect external device processes or third-party applications. All conversion tracking relies authoritatively on advertiser-side integrations, such as S2S HTTP postbacks, REST APIs, or Mobile Measurement Partners (MMP) like AppsFlyer and Adjust."
    },
    {
      q: "What payout methods and schedules are available for publishers?",
      a: "Verified publishers can receive payouts via International Wire Transfer, SEPA, ACH Direct Deposit, PayPal, and verified USDT, operating on standard Net-15 or Net-30 cycles subject to advertiser validation and standard return windows."
    },
    {
      q: "What types of traffic are prohibited?",
      a: "We enforce a zero-tolerance policy against bot traffic, automated click bots, unauthorized spam, incentivized click farming on non-incent campaigns, deceptive creatives, and cookie stuffing. Violation results in immediate campaign disqualification and account forfeiture."
    }
  ];

  return (
    <div>
      {/* =================================================================== */}
      {/* 1. HERO SECTION                                                    */}
      {/* =================================================================== */}
      <section className="section-wrapper" style={{ paddingTop: '80px', paddingBottom: '70px' }}>
        <div className="container">
          <div className="grid-2" style={{ alignItems: 'center', gap: '48px' }}>
            {/* Left Column: Core Value Proposition */}
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span className="badge-clean">
                  <ShieldCheck size={14} />
                  <span>Performance Marketing Network</span>
                </span>
                <span className="meta-separator">&middot;</span>
                <span className="meta-row">Deterministic Tracking</span>
              </div>

              <h1 className="hero-title" style={{ marginBottom: '20px' }}>
                Earn Through Actions. <br />
                <span className="text-emerald">Grow Through Referrals.</span>
              </h1>

              <p className="section-subtitle" style={{ marginBottom: '32px' }}>
                RoyCash connects quality publishers, content creators, and media buyers with verified advertiser campaigns. Built for scale with deterministic Server-to-Server postbacks, multi-model payouts, and honest attribution.
              </p>

              {/* CTAs */}
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '32px' }}>
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

              {/* Trust signals */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--emerald-primary)' }} />
                  <span>Verified S2S Postbacks</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--emerald-primary)' }} />
                  <span>10 Flexible Campaign Models</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--emerald-primary)' }} />
                  <span>Strict Anti-Fraud Ledger</span>
                </div>
              </div>
            </div>

            {/* Right Column: Premium Fintech Visual Card */}
            <div>
              <div className="hero-visual-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <div>
                    <span className="badge-gold-clean">Performance Hub</span>
                    <h3 style={{ fontSize: '1.25rem', marginTop: '4px' }}>RoyCash Core Gateway</h3>
                  </div>
                  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '6px 12px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--emerald-primary)' }}>
                    ACTIVE GATEWAY
                  </div>
                </div>

                {/* Workflow mini diagram */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
                  <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--emerald-subtle)', color: 'var(--emerald-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Share2 size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#FFFFFF' }}>1. Referral Routing &amp; Click Stamping</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>User clicks link &rarr; unique cryptographic <code className="mono-text">rc_click_id</code> generated.</div>
                    </div>
                  </div>

                  <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--gold-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Zap size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#FFFFFF' }}>2. Merchant Action &amp; S2S Postback</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Advertiser server validates checkout/lead and fires authenticated postback.</div>
                    </div>
                  </div>

                  <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--emerald-subtle)', color: 'var(--emerald-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Database size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#FFFFFF' }}>3. Deduplication &amp; Settlement</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Transaction hash matched, return window checked, commission approved.</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem', color: 'var(--text-dim)', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                  <span>Zero client-side cookie decay</span>
                  <a href="#tracking" onClick={(e) => handleNav('tracking', e)} style={{ color: 'var(--emerald-primary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Technical Architecture</span>
                    <ArrowRight size={14} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* 2. ROY CASH INTRODUCTION & PILLARS                                 */}
      {/* =================================================================== */}
      <section className="section-wrapper" style={{ background: 'rgba(13, 20, 36, 0.4)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 64px auto' }}>
            <span className="badge-clean" style={{ marginBottom: '8px' }}>Ecosystem Principles</span>
            <h2 className="section-title">Built on Transparent Performance</h2>
            <p className="section-subtitle" style={{ margin: '0 auto' }}>
              We eliminate the ambiguity of traditional affiliate networks. Real-time postbacks, transparent hold periods, and direct publisher-advertiser relationships.
            </p>
          </div>

          <div className="grid-3">
            <div className="glass-card">
              <div className="feature-icon-box">
                <Database size={24} />
              </div>
              <h3 className="card-title">Deterministic Tracking</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', lineHeight: '1.65' }}>
                Cookieless, server-to-server postback routing protects your revenue against modern browser tracking restrictions, ad-blockers, and iOS privacy updates.
              </p>
            </div>

            <div className="glass-card">
              <div className="feature-icon-box gold">
                <Lock size={24} />
              </div>
              <h3 className="card-title">Zero-Fraud Policy</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', lineHeight: '1.65' }}>
                Automated click-velocity analysis, device fingerprinting, and geographic verification protect advertisers from bot farms and fraudulent lead injections.
              </p>
            </div>

            <div className="glass-card">
              <div className="feature-icon-box">
                <BarChart3 size={24} />
              </div>
              <h3 className="card-title">Multi-Model Flexibility</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', lineHeight: '1.65' }}>
                From high-intent CPA and CPL to app installs (CPI) and recurring Revenue Share, choose the exact compensation structure suited for your vertical.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* 3. PUBLISHER & ADVERTISER DUAL ADVANTAGES                          */}
      {/* =================================================================== */}
      <section className="section-wrapper">
        <div className="container">
          <div className="grid-2" style={{ gap: '48px', alignItems: 'stretch' }}>
            {/* Publisher Card */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <span className="badge-clean">For Publishers &amp; Affiliates</span>
                  <span className="mono-text" style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>MEDIA BUYERS &amp; CREATORS</span>
                </div>
                
                <h3 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>
                  Monetize Verified Intent Across Premium Verticals
                </h3>
                
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', marginBottom: '24px', lineHeight: '1.6' }}>
                  Whether you drive high-volume search traffic, run targeted social campaigns, manage a coupon site, or operate a content portal, RoyCash equips you with direct advertiser campaigns and granular attribution.
                </p>

                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '32px' }}>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.9rem' }}>
                    <CheckCircle2 size={16} style={{ color: 'var(--emerald-primary)', flexShrink: 0, marginTop: '2px' }} />
                    <span><strong>Transparent Payout Schedules:</strong> Reliable Net-15 / Net-30 settlement cycles via Wire, ACH, PayPal, and USDT.</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.9rem' }}>
                    <CheckCircle2 size={16} style={{ color: 'var(--emerald-primary)', flexShrink: 0, marginTop: '2px' }} />
                    <span><strong>Sub-ID Parameter Support:</strong> Append up to 5 custom tracking tags (<code className="mono-text">subid1-subid5</code>) for campaign optimization.</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.9rem' }}>
                    <CheckCircle2 size={16} style={{ color: 'var(--emerald-primary)', flexShrink: 0, marginTop: '2px' }} />
                    <span><strong>Direct Postback Forwarding:</strong> Forward conversions in real time to your third-party tracker (Voluum, Keitaro, RedTrack).</span>
                  </li>
                </ul>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => handleNav('publishers')}
                  className="btn btn-outline-emerald"
                  style={{ width: '100%' }}
                >
                  <span>Publisher Guide &amp; Integration Specs</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>

            {/* Advertiser Card */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <span className="badge-gold-clean">For Advertisers &amp; Brands</span>
                  <span className="mono-text" style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>DIRECT MERCHANTS &amp; SAAS</span>
                </div>
                
                <h3 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>
                  Acquire Customers with Zero Upfront Capital Waste
                </h3>
                
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', marginBottom: '24px', lineHeight: '1.6' }}>
                  Scale customer acquisition across global editorial and media networks without paying for useless impressions or empty clicks. Only remunerate verified actions that meet your exact qualification criteria.
                </p>

                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '32px' }}>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.9rem' }}>
                    <CheckCircle2 size={16} style={{ color: 'var(--gold-accent)', flexShrink: 0, marginTop: '2px' }} />
                    <span><strong>100% Performance-Based:</strong> Only pay when a user registers, deposits, purchases, or installs your application.</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.9rem' }}>
                    <CheckCircle2 size={16} style={{ color: 'var(--gold-accent)', flexShrink: 0, marginTop: '2px' }} />
                    <span><strong>Cryptographic Idempotency:</strong> Built-in duplicate rejection ensures you never pay twice for the same order ID.</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.9rem' }}>
                    <CheckCircle2 size={16} style={{ color: 'var(--gold-accent)', flexShrink: 0, marginTop: '2px' }} />
                    <span><strong>Flexible Settlement Windows:</strong> Hold conversions during statutory consumer refund or cancellation periods.</span>
                  </li>
                </ul>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => handleNav('advertisers')}
                  className="btn btn-secondary"
                  style={{ width: '100%' }}
                >
                  <span>Advertiser Solutions &amp; S2S Ingestion</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* 4. CAMPAIGN MODELS PREVIEW                                         */}
      {/* =================================================================== */}
      <section className="section-wrapper" style={{ background: 'rgba(7, 11, 20, 0.7)' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '48px', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <span className="badge-clean">Monetization Frameworks</span>
              <h2 className="section-title" style={{ marginTop: '6px' }}>10 Robust Performance Models</h2>
              <p className="section-subtitle">
                Clear compensation triggers mapped to real business objectives.
              </p>
            </div>
            <a 
              href="#campaign-models" 
              onClick={(e) => handleNav('campaign-models', e)}
              className="btn btn-secondary btn-sm"
            >
              <span>Explore All 10 Models</span>
              <ArrowUpRight size={14} />
            </a>
          </div>

          <div className="grid-3" style={{ gap: '24px' }}>
            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className="mono-text" style={{ color: 'var(--emerald-primary)', fontWeight: '700' }}>CPA</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Action Driven</span>
              </div>
              <h4 style={{ fontSize: '1.125rem', marginBottom: '8px' }}>Cost Per Action</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: '1.6' }}>
                Commission is triggered when a user completes a predefined commercial action, such as funding an account or completing an identity verification.
              </p>
            </div>

            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className="mono-text" style={{ color: 'var(--emerald-primary)', fontWeight: '700' }}>CPS</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>E-Commerce</span>
              </div>
              <h4 style={{ fontSize: '1.125rem', marginBottom: '8px' }}>Cost Per Sale</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: '1.6' }}>
                Publisher receives a percentage or fixed flat fee upon a completed customer checkout, validated after any return hold period.
              </p>
            </div>

            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className="mono-text" style={{ color: 'var(--emerald-primary)', fontWeight: '700' }}>CPL</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Lead Generation</span>
              </div>
              <h4 style={{ fontSize: '1.125rem', marginBottom: '8px' }}>Cost Per Lead</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: '1.6' }}>
                Compensates for qualified customer information submissions (e.g. quote requests, insurance inquiries) with valid contact parameters.
              </p>
            </div>

            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className="mono-text" style={{ color: 'var(--emerald-primary)', fontWeight: '700' }}>CPI</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Mobile Apps</span>
              </div>
              <h4 style={{ fontSize: '1.125rem', marginBottom: '8px' }}>Cost Per Install</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: '1.6' }}>
                Rewarded upon mobile app installation and initial launch on a verified unique physical handset via MMP postback.
              </p>
            </div>

            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className="mono-text" style={{ color: 'var(--gold-accent)', fontWeight: '700' }}>REVSHARE</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>SaaS &amp; Subscriptions</span>
              </div>
              <h4 style={{ fontSize: '1.125rem', marginBottom: '8px' }}>Revenue Share</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: '1.6' }}>
                Recurring monthly percentage commission paid for the lifetime or designated duration of referred paying subscribers.
              </p>
            </div>

            <div className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className="mono-text" style={{ color: 'var(--gold-accent)', fontWeight: '700' }}>HYBRID</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Custom Blend</span>
              </div>
              <h4 style={{ fontSize: '1.125rem', marginBottom: '8px' }}>Hybrid Model</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: '1.6' }}>
                Blends an upfront baseline CPA with a recurring backend revenue percentage, aligning incentives for both immediate scale and retention.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* 5. INTERACTIVE POSTBACK SIMULATOR PREVIEW                          */}
      {/* =================================================================== */}
      <section className="section-wrapper">
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 48px auto' }}>
            <span className="badge-clean">Technical Verification</span>
            <h2 className="section-title">Experience How Tracking Truly Works</h2>
            <p className="section-subtitle" style={{ margin: '0 auto' }}>
              We believe in complete technical transparency. Test our standard Server-to-Server postback URL schema and observe how duplicate prevention protects campaign integrity.
            </p>
          </div>

          <PostbackSimulator />
        </div>
      </section>

      {/* =================================================================== */}
      {/* 6. FAQ SECTION                                                     */}
      {/* =================================================================== */}
      <section className="section-wrapper" style={{ background: 'rgba(13, 20, 36, 0.4)', borderTop: '1px solid var(--border-subtle)' }}>
        <div className="container" style={{ maxWidth: '860px' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <span className="badge-clean">Frequently Answered</span>
            <h2 className="section-title">Network Operation &amp; Guidelines</h2>
            <p className="section-subtitle" style={{ margin: '0 auto' }}>
              Direct, transparent answers regarding compliance, tracking, and settlements.
            </p>
          </div>

          <div>
            {faqItems.map((item, idx) => (
              <div 
                key={idx} 
                className={`faq-item ${openFaq === idx ? 'open' : ''}`}
              >
                <button
                  type="button"
                  className="faq-question"
                  onClick={() => toggleFaq(idx)}
                  aria-expanded={openFaq === idx}
                >
                  <span>{item.q}</span>
                  <ChevronDown 
                    size={18} 
                    style={{ 
                      transform: openFaq === idx ? 'rotate(180deg)' : 'none', 
                      transition: 'transform var(--transition-fast)',
                      flexShrink: 0
                    }} 
                  />
                </button>
                {openFaq === idx && (
                  <div className="faq-answer">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* 7. STRONG CALL TO ACTION                                           */}
      {/* =================================================================== */}
      <section className="section-wrapper" style={{ paddingTop: '80px', paddingBottom: '96px' }}>
        <div className="container">
          <div className="glass-card" style={{ padding: '64px 32px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'relative', zIndex: 1, maxWidth: '640px', margin: '0 auto' }}>
              <span className="badge-gold-clean" style={{ marginBottom: '12px' }}>
                Verified Partnership
              </span>
              <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', marginBottom: '16px', lineHeight: '1.2' }}>
                Join the RoyCash Performance Ecosystem
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.0625rem', lineHeight: '1.65', marginBottom: '36px' }}>
                Whether you are an established media buyer looking for higher payout caps or a direct merchant scaling user acquisition, partner with an engineering-first network.
              </p>

              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => openModal('publisher')}
                  className="btn btn-primary"
                >
                  <span>Register as Publisher</span>
                  <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => openModal('advertiser')}
                  className="btn btn-secondary"
                >
                  <span>Connect as Advertiser</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
