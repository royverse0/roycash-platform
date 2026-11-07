import React from 'react';
import { 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  Layers, 
  Zap, 
  Database, 
  DollarSign, 
  Sliders, 
  AlertCircle,
  FileText
} from 'lucide-react';

export default function Publishers({ openModal, navigate }) {
  const publisherFeatures = [
    {
      icon: <Database size={24} />,
      title: "Granular Sub-ID Tracking",
      desc: "Append up to 5 custom parameters (subid1 through subid5) to test ad sets, creative variants, traffic sources, and placement IDs with zero data loss."
    },
    {
      icon: <Zap size={24} />,
      title: "Real-Time Postback Forwarding",
      desc: "Instantly forward validated conversion data to your third-party tracker (Voluum, Keitaro, RedTrack, Binom) via dynamic HTTP GET/POST webhooks."
    },
    {
      icon: <DollarSign size={24} />,
      title: "Dependable Payout Terms",
      desc: "Predictable Net-15 and Net-30 payment cadences via International Wire, ACH Direct Deposit, PayPal, or USDT once verified by advertiser ledger."
    },
    {
      icon: <Sliders size={24} />,
      title: "Multi-Model Campaign Inventory",
      desc: "Access exclusive offers across CPA, CPL, CPS, CPI, and recurring Revenue Share across high-converting e-commerce, SaaS, and financial verticals."
    }
  ];

  const trafficTypes = [
    { name: "Content & Editorial Portals", status: "Approved", detail: "Product comparison reviews, niche blogs, buyer guides, and editorial roundups." },
    { name: "Search & Native Media Buyers", status: "Approved", detail: "Google Ads, Bing, Taboola, Outbrain, and Revcontent running verified landing pages." },
    { name: "Cashback & Loyalty Apps", status: "Approved", detail: "Community rewards, receipt-scanning apps, and registered browser extensions." },
    { name: "Social & Influencer Channels", status: "Approved", detail: "Dedicated YouTube, TikTok, Telegram, and podcast sponsorship placements." },
    { name: "Incentivized Click Farms", status: "Prohibited", detail: "Automated bots, fake click exchanges, emulator farms, and proxy networks." },
    { name: "Deceptive Creatives / Popunders", status: "Prohibited", detail: "Misleading brand impersonation, auto-redirect malware, or unprompted cookie stuffing." }
  ];

  return (
    <div>
      {/* Hero */}
      <section className="section-wrapper" style={{ paddingTop: '80px', paddingBottom: '60px' }}>
        <div className="container">
          <div style={{ maxWidth: '780px' }}>
            <span className="badge-clean" style={{ marginBottom: '12px' }}>
              <ShieldCheck size={14} />
              <span>Publisher Ecosystem</span>
            </span>
            <h1 className="hero-title" style={{ marginBottom: '20px' }}>
              Built for Serious Publishers, Media Buyers &amp; Content Creators
            </h1>
            <p className="section-subtitle" style={{ marginBottom: '32px' }}>
              Scale your traffic with verified advertiser inventory, deterministic postback attribution, and multi-tier payout structures designed to reward quality.
            </p>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => openModal('publisher')}
                className="btn btn-primary"
              >
                <span>Submit Publisher Application</span>
                <ArrowRight size={16} />
              </button>
              <button
                type="button"
                onClick={() => navigate('campaign-models')}
                className="btn btn-secondary"
              >
                <span>View Campaign Models</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Core Advantages */}
      <section className="section-wrapper" style={{ background: 'rgba(13, 20, 36, 0.4)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 60px auto' }}>
            <span className="badge-clean">Publisher Toolkit</span>
            <h2 className="section-title">Engineered for Maximum Attribution Accuracy</h2>
            <p className="section-subtitle" style={{ margin: '0 auto' }}>
              Every link, click, and postback is processed through our high-throughput routing engine.
            </p>
          </div>

          <div className="grid-2" style={{ gap: '32px' }}>
            {publisherFeatures.map((f, i) => (
              <div key={i} className="glass-card" style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                <div className="feature-icon-box" style={{ marginBottom: 0 }}>
                  {f.icon}
                </div>
                <div>
                  <h3 className="card-title" style={{ fontSize: '1.15rem' }}>{f.title}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Traffic Quality & Compliance Table */}
      <section className="section-wrapper">
        <div className="container">
          <div style={{ marginBottom: '40px' }}>
            <span className="badge-gold-clean">Compliance Framework</span>
            <h2 className="section-title" style={{ marginTop: '6px' }}>Traffic Quality &amp; Verification Guidelines</h2>
            <p className="section-subtitle">
              We maintain direct relationships with enterprise brands by enforcing strict traffic compliance. Transparent guidelines protect legitimate publishers and ensure timely payments.
            </p>
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Traffic Category</th>
                  <th>Status</th>
                  <th>Compliance Specification</th>
                </tr>
              </thead>
              <tbody>
                {trafficTypes.map((t, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: '600', color: '#FFFFFF' }}>{t.name}</td>
                    <td>
                      {t.status === 'Approved' ? (
                        <span style={{ color: 'var(--emerald-primary)', fontWeight: '600', fontSize: '0.8125rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <CheckCircle2 size={14} />
                          <span>Approved</span>
                        </span>
                      ) : (
                        <span style={{ color: '#F87171', fontWeight: '600', fontSize: '0.8125rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <AlertCircle size={14} />
                          <span>Strictly Prohibited</span>
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.875rem' }}>{t.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Integration Code Sample */}
      <section className="section-wrapper" style={{ background: 'rgba(7, 11, 20, 0.7)' }}>
        <div className="container">
          <div className="grid-2" style={{ alignItems: 'center', gap: '48px' }}>
            <div>
              <span className="badge-clean">Seamless Tracking</span>
              <h2 className="section-title" style={{ marginTop: '6px' }}>Publisher Tracking Link Format</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.65', marginBottom: '20px' }}>
                Your unique affiliate tracking link captures the visitor click, records sub-identifiers, and transfers the user seamlessly to the merchant destination URL while stamping the conversion session.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span className="mono-text" style={{ color: 'var(--emerald-primary)' }}>&bull;</span>
                  <span><strong style={{ color: '#FFFFFF' }}>subid1:</strong> Traffic source identifier (e.g. google_cpc, fb_feed).</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span className="mono-text" style={{ color: 'var(--emerald-primary)' }}>&bull;</span>
                  <span><strong style={{ color: '#FFFFFF' }}>subid2:</strong> Campaign or ad group name.</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span className="mono-text" style={{ color: 'var(--emerald-primary)' }}>&bull;</span>
                  <span><strong style={{ color: '#FFFFFF' }}>subid3:</strong> Creative variation ID.</span>
                </div>
              </div>
            </div>

            <div className="code-terminal">
              <div className="terminal-header">
                <span>SAMPLE TRACKING LINK FORMAT</span>
                <span className="mono-text">HTTPS ONLY</span>
              </div>
              <div className="terminal-body">
                <span style={{ color: '#6EE7B7' }}>https://track.roycash.net/click</span><br />
                <span style={{ color: '#94A3B8' }}>?offer_id=</span><span style={{ color: 'var(--gold-accent)' }}>1042</span><br />
                <span style={{ color: '#94A3B8' }}>&amp;pub_id=</span><span style={{ color: 'var(--gold-accent)' }}>8849</span><br />
                <span style={{ color: '#94A3B8' }}>&amp;subid1=</span><span style={{ color: '#93C5FD' }}>fb_adset_finance</span><br />
                <span style={{ color: '#94A3B8' }}>&amp;subid2=</span><span style={{ color: '#93C5FD' }}>video_v3</span><br />
                <span style={{ color: '#94A3B8' }}>&amp;subid3=</span><span style={{ color: '#93C5FD' }}>us_tier1</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-wrapper" style={{ textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '640px' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '16px' }}>Ready to Scale Your Publisher Revenue?</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '28px' }}>
            Applications are reviewed individually by our compliance specialists. Verified traffic channels receive onboarding documentation within 24 hours.
          </p>
          <button
            type="button"
            onClick={() => openModal('publisher')}
            className="btn btn-primary"
          >
            <span>Apply as a RoyCash Publisher</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}
