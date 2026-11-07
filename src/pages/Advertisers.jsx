import React from 'react';
import { 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  Cpu, 
  Lock, 
  BarChart2, 
  RefreshCw, 
  Sliders, 
  Layers,
  FileCheck
} from 'lucide-react';

export default function Advertisers({ openModal, navigate }) {
  const integrationMethods = [
    {
      title: "Direct S2S HTTP Postbacks",
      desc: "Trigger lightweight GET or POST HTTP callbacks directly from your billing or backend order fulfillment server upon verified customer conversion."
    },
    {
      title: "Mobile Measurement Partner (MMP)",
      desc: "Native attribution integration with AppsFlyer, Adjust, Branch, Kochava, and Singular for mobile app install and in-app event tracking."
    },
    {
      title: "Enterprise REST API",
      desc: "Batch or stream conversion logs securely using our authenticated API endpoints with full HMAC-SHA256 signature verification."
    },
    {
      title: "Secure Webhooks",
      desc: "Instant event notification via webhooks with automated retries and exponential backoff to ensure zero lost attribution events."
    }
  ];

  const fraudProtections = [
    { title: "Idempotency Ledger", detail: "Every transaction ID (tx_id) is recorded in an immutable deduplication ledger. Duplicate pings for identical order IDs are automatically dropped." },
    { title: "Click-to-Conversion Latency Validation", detail: "Conversions occurring in impossible time windows (<1 second for complex multi-step checkouts) are flagged for manual review." },
    { title: "IP Velocity & Geo Filtering", detail: "Unusual bursts of transactions originating from single IP subnets, known VPN datacenters, or unapproved countries are automatically quarantined." },
    { title: "Merchant Return Window Settlement", detail: "Customizable reconciliation windows (e.g. 14, 30, or 60 days) ensure you never pay affiliate commissions on refunded or cancelled merchandise." }
  ];

  return (
    <div>
      {/* Hero */}
      <section className="section-wrapper" style={{ paddingTop: '80px', paddingBottom: '60px' }}>
        <div className="container">
          <div style={{ maxWidth: '800px' }}>
            <span className="badge-gold-clean" style={{ marginBottom: '12px' }}>
              <ShieldCheck size={14} />
              <span>Advertiser Partnerships</span>
            </span>
            <h1 className="hero-title" style={{ marginBottom: '20px' }}>
              Acquire High-Value Customers on a Pure Performance Basis
            </h1>
            <p className="section-subtitle" style={{ marginBottom: '32px' }}>
              Eliminate wasted marketing budgets. Partner with vetted publishers across global channels and pay exclusively for verified actions, sales, leads, and app installs.
            </p>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => openModal('advertiser')}
                className="btn btn-gold"
              >
                <span>Request Advertiser Onboarding</span>
                <ArrowRight size={16} />
              </button>
              <button
                type="button"
                onClick={() => navigate('tracking')}
                className="btn btn-secondary"
              >
                <span>Read Tracking Architecture</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Integration Framework */}
      <section className="section-wrapper" style={{ background: 'rgba(13, 20, 36, 0.4)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 60px auto' }}>
            <span className="badge-clean">Seamless Engineering</span>
            <h2 className="section-title">Built to Connect with Any Tech Stack</h2>
            <p className="section-subtitle" style={{ margin: '0 auto' }}>
              No proprietary SDKs required. Implement conversion attribution effortlessly via open, industry-standard protocols.
            </p>
          </div>

          <div className="grid-2" style={{ gap: '28px' }}>
            {integrationMethods.map((m, i) => (
              <div key={i} className="glass-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <Cpu size={20} style={{ color: 'var(--emerald-primary)' }} />
                  <h3 style={{ fontSize: '1.15rem' }}>{m.title}</h3>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                  {m.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fraud & Security */}
      <section className="section-wrapper">
        <div className="container">
          <div className="grid-2" style={{ alignItems: 'center', gap: '48px' }}>
            <div>
              <span className="badge-clean">Enterprise Protection</span>
              <h2 className="section-title" style={{ marginTop: '6px' }}>Rigorous Deduplication &amp; Fraud Prevention</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.65', marginBottom: '24px' }}>
                We believe performance marketing is only as strong as its conversion validation. Our infrastructure shields your acquisition budget from affiliate fraud and duplicate claims.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {fraudProtections.map((p, idx) => (
                  <div key={idx} className="glass-panel" style={{ padding: '16px' }}>
                    <div style={{ fontWeight: '600', color: '#FFFFFF', fontSize: '0.925rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={16} style={{ color: 'var(--emerald-primary)' }} />
                      <span>{p.title}</span>
                    </div>
                    <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', paddingLeft: '24px' }}>
                      {p.detail}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ingestion Spec Code */}
            <div>
              <div className="code-terminal">
                <div className="terminal-header">
                  <span>SAMPLE ADVERTISER S2S POSTBACK INGESTION</span>
                  <span className="mono-text">HTTPS POST / GET</span>
                </div>
                <div className="terminal-body" style={{ fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--gold-accent)' }}># Example Merchant Webhook / S2S Trigger</span><br />
                  <span style={{ color: '#E2E8F0' }}>curl -X POST \</span><br />
                  &nbsp;&nbsp;https://track.roycash.net/api/v1/conversion \<br />
                  &nbsp;&nbsp;-H <span style={{ color: '#6EE7B7' }}>"Content-Type: application/json"</span> \<br />
                  &nbsp;&nbsp;-H <span style={{ color: '#6EE7B7' }}>"X-RoyCash-Signature: 8f9b...a1"</span> \<br />
                  &nbsp;&nbsp;-d '<span style={{ color: '#FCD34D' }}>&#123;</span><br />
                  &nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: '#93C5FD' }}>"click_id"</span>: <span style={{ color: '#6EE7B7' }}>"rc_98f7e2a4c10d"</span>,<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: '#93C5FD' }}>"transaction_id"</span>: <span style={{ color: '#6EE7B7' }}>"ORD-2026-9014"</span>,<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: '#93C5FD' }}>"amount"</span>: <span style={{ color: '#FCD34D' }}>149.00</span>,<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: '#93C5FD' }}>"currency"</span>: <span style={{ color: '#6EE7B7' }}>"USD"</span>,<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: '#93C5FD' }}>"event_type"</span>: <span style={{ color: '#6EE7B7' }}>"purchase"</span>,<br />
                  &nbsp;&nbsp;&nbsp;&nbsp;<span style={{ color: '#93C5FD' }}>"status"</span>: <span style={{ color: '#6EE7B7' }}>"completed"</span><br />
                  &nbsp;&nbsp;<span style={{ color: '#FCD34D' }}>&#125;</span>'
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Onboarding Steps */}
      <section className="section-wrapper" style={{ background: 'rgba(7, 11, 20, 0.7)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 50px auto' }}>
            <span className="badge-clean">Clear Workflow</span>
            <h2 className="section-title">How to Launch a Campaign on RoyCash</h2>
          </div>

          <div className="grid-4">
            <div className="glass-card">
              <div className="mono-text" style={{ color: 'var(--gold-accent)', fontSize: '1.25rem', fontWeight: '800', marginBottom: '12px' }}>01</div>
              <h4 style={{ fontSize: '1.05rem', marginBottom: '8px' }}>Campaign Scoping</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.6' }}>Define your target payout model (CPA, CPS, CPL), payout values, approved geos, and acceptable promotion categories.</p>
            </div>
            <div className="glass-card">
              <div className="mono-text" style={{ color: 'var(--gold-accent)', fontSize: '1.25rem', fontWeight: '800', marginBottom: '12px' }}>02</div>
              <h4 style={{ fontSize: '1.05rem', marginBottom: '8px' }}>Tracking Integration</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.6' }}>Configure your S2S postback or MMP endpoint. Run test transactions to verify parameter transmission and signature checks.</p>
            </div>
            <div className="glass-card">
              <div className="mono-text" style={{ color: 'var(--gold-accent)', fontSize: '1.25rem', fontWeight: '800', marginBottom: '12px' }}>03</div>
              <h4 style={{ fontSize: '1.05rem', marginBottom: '8px' }}>Controlled Distribution</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.6' }}>Offer is released to pre-qualified publishers matching your vertical, ensuring initial quality control and compliance verification.</p>
            </div>
            <div className="glass-card">
              <div className="mono-text" style={{ color: 'var(--gold-accent)', fontSize: '1.25rem', fontWeight: '800', marginBottom: '12px' }}>04</div>
              <h4 style={{ fontSize: '1.05rem', marginBottom: '8px' }}>Scale &amp; Optimize</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.6' }}>Expand volume caps on top-performing sub-IDs while adjusting criteria and maintaining tight ROI metrics.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-wrapper" style={{ textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '640px' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '16px' }}>Ready to Scale Your Customer Acquisition?</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '28px' }}>
            Connect with our advertiser solutions team. We will review your conversion funnel and provide a customized launch proposal.
          </p>
          <button
            type="button"
            onClick={() => openModal('advertiser')}
            className="btn btn-gold"
          >
            <span>Onboard as an Advertiser</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}
