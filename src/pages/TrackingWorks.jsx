import React from 'react';
import { 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Cpu, 
  Database, 
  Key, 
  RefreshCw, 
  AlertTriangle,
  Clock,
  Layers,
  Lock,
  GitCommit
} from 'lucide-react';
import PostbackSimulator from '../components/PostbackSimulator.jsx';

export default function TrackingWorks({ openModal }) {
  const lifecycleSteps = [
    {
      step: '01',
      title: 'Click ID Generation & Redirect',
      desc: 'When a visitor clicks a publisher referral link, the RoyCash edge routing gateway generates a unique, cryptographic click identifier (rc_click_id). This identifier is appended to the merchant destination URL and passed directly to the merchant.'
    },
    {
      step: '02',
      title: 'Merchant Session Storage',
      desc: 'The advertiser’s application stores the rc_click_id in their secure session or order database. No vulnerable third-party tracking cookies or invasive device inspection is required.'
    },
    {
      step: '03',
      title: 'Advertiser S2S Postback Trigger',
      desc: 'Upon successful checkout, registration, or deposit, the advertiser’s backend server initiates an automated HTTP GET/POST callback to the RoyCash ingestion gateway with the rc_click_id and unique order tx_id.'
    },
    {
      step: '04',
      title: 'Validation & Deduplication Ledger',
      desc: 'Our engine authenticates the request signature, verifies the attribution time window, runs duplicate collision checks on the tx_id, and checks for IP anomalies before recording the event.'
    },
    {
      step: '05',
      title: 'Cashback & Commission Settlement',
      desc: 'The transaction enters a Pending status during the merchant’s statutory customer return window. Once validated against return batches, the payout status shifts to Approved.'
    }
  ];

  return (
    <div>
      {/* Hero */}
      <section className="section-wrapper" style={{ paddingTop: '80px', paddingBottom: '60px' }}>
        <div className="container">
          <div style={{ maxWidth: '820px' }}>
            <span className="badge-clean" style={{ marginBottom: '12px' }}>
              <Cpu size={14} />
              <span>Attribution Architecture</span>
            </span>
            <h1 className="hero-title" style={{ marginBottom: '20px' }}>
              How Tracking Works: The Deterministic S2S Lifecycle
            </h1>
            <p className="section-subtitle" style={{ marginBottom: '32px' }}>
              A technical explanation of unique click IDs, server-to-server callbacks, automated duplicate prevention, and the transparent cashback reconciliation pipeline.
            </p>
          </div>
        </div>
      </section>

      {/* Critical Integration Disclosure Box */}
      <section className="section-wrapper-sm" style={{ paddingTop: 0 }}>
        <div className="container">
          <div style={{ 
            background: 'rgba(245, 158, 11, 0.08)', 
            border: '1px solid var(--border-gold)', 
            borderRadius: '12px', 
            padding: '24px 28px',
            display: 'flex',
            gap: '18px',
            alignItems: 'flex-start'
          }}>
            <AlertTriangle size={24} style={{ color: 'var(--gold-accent)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <h3 style={{ fontSize: '1.05rem', color: '#FFFFFF', marginBottom: '6px', fontWeight: '700' }}>
                Important Technical Integration Notice
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.65' }}>
                RoyCash explicitly does <strong>not</strong> claim to independently inspect external device processes, private app sandboxes, or detect new users without direct advertiser integration. All conversion tracking relies authoritatively on authenticated merchant integrations (Server-to-Server postbacks, secure REST APIs, or Mobile Measurement Partner SDKs like AppsFlyer/Adjust). We believe honesty in tracking engineering is the foundation of long-term partnership.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5-Step Lifecycle */}
      <section className="section-wrapper" style={{ background: 'rgba(13, 20, 36, 0.4)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 60px auto' }}>
            <span className="badge-clean">Lifecycle Stages</span>
            <h2 className="section-title">The Complete Conversion Pathway</h2>
            <p className="section-subtitle" style={{ margin: '0 auto' }}>
              From initial referral to final verified commission approval.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '920px', margin: '0 auto' }}>
            {lifecycleSteps.map((s, idx) => (
              <div key={idx} className="glass-card" style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
                <div className="mono-text" style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: '800', 
                  color: 'var(--emerald-primary)', 
                  background: 'var(--emerald-subtle)',
                  padding: '12px 18px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-emerald)',
                  flexShrink: 0
                }}>
                  {s.step}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>{s.title}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', lineHeight: '1.65' }}>
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Deduplication & Validation Deep Dive */}
      <section className="section-wrapper">
        <div className="container">
          <div className="grid-2" style={{ gap: '48px', alignItems: 'center' }}>
            <div>
              <span className="badge-clean">Ledger Integrity</span>
              <h2 className="section-title" style={{ marginTop: '6px' }}>
                Duplicate Prevention &amp; Idempotency Keys
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.65', marginBottom: '20px' }}>
                A common flaw in rudimentary affiliate systems is accidental duplicate billing caused by network retries, browser reloads on confirmation pages, or multi-tab checkout completions.
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.65', marginBottom: '24px' }}>
                RoyCash addresses this through <strong>strict transactional idempotency</strong>. When an advertiser pings our endpoint with a transaction identifier (<code className="mono-text">tx_id</code>), our system computes a SHA-256 hash across the offer, transaction, and merchant key:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#FFFFFF' }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--emerald-primary)' }} />
                  <span><strong>First Occurrence:</strong> Logged as authoritative; commission reserved.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#FFFFFF' }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--emerald-primary)' }} />
                  <span><strong>Subsequent Replays:</strong> Detected in memory index; dropped with HTTP 200 (duplicate suppressed).</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#FFFFFF' }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--emerald-primary)' }} />
                  <span><strong>Zero Double-Charging:</strong> The advertiser is never billed twice for identical order IDs.</span>
                </div>
              </div>
            </div>

            {/* Visual Box */}
            <div className="glass-card" style={{ padding: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <Lock size={20} style={{ color: 'var(--gold-accent)' }} />
                <h3 style={{ fontSize: '1.15rem' }}>Cashback Approval &amp; Reconciliation Windows</h3>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: '1.6', marginBottom: '20px' }}>
                Cashback networks require clear timelines to prevent clawbacks from consumer returns:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ borderLeft: '3px solid #94A3B8', paddingLeft: '14px' }}>
                  <div style={{ fontSize: '0.825rem', fontWeight: '700', color: '#FFFFFF' }}>Stage 1: Pending Verification</div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-dim)' }}>Triggered within 60 seconds of merchant postback. Funds held in reserve.</div>
                </div>

                <div style={{ borderLeft: '3px solid var(--gold-accent)', paddingLeft: '14px' }}>
                  <div style={{ fontSize: '0.825rem', fontWeight: '700', color: '#FFFFFF' }}>Stage 2: Reconciliation Period (14–45 Days)</div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-dim)' }}>Matches statutory merchant return window and chargeback dispute policies.</div>
                </div>

                <div style={{ borderLeft: '3px solid var(--emerald-primary)', paddingLeft: '14px' }}>
                  <div style={{ fontSize: '0.825rem', fontWeight: '700', color: '#FFFFFF' }}>Stage 3: Approved &amp; Paid</div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-dim)' }}>Advertiser reconciles the batch; balance released to publisher wallet.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Simulator Section */}
      <section className="section-wrapper" style={{ background: 'rgba(7, 11, 20, 0.7)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 40px auto' }}>
            <span className="badge-clean">Live Testing Sandbox</span>
            <h2 className="section-title">Test the Ingestion Architecture</h2>
          </div>
          <PostbackSimulator />
        </div>
      </section>
    </div>
  );
}
