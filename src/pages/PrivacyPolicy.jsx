import React from 'react';
import { ShieldCheck, Lock, FileText, CheckCircle2 } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div>
      {/* Hero */}
      <section className="section-wrapper" style={{ paddingTop: '80px', paddingBottom: '50px' }}>
        <div className="container" style={{ maxWidth: '860px' }}>
          <span className="badge-clean" style={{ marginBottom: '12px' }}>
            <Lock size={14} />
            <span>Legal Documentation</span>
          </span>
          <h1 className="hero-title" style={{ marginBottom: '16px' }}>Privacy Policy</h1>
          <div className="meta-row" style={{ marginBottom: '24px' }}>
            <span>Last Updated: November 2026</span>
            <span className="meta-separator">&middot;</span>
            <span>Version 2.4</span>
            <span className="meta-separator">&middot;</span>
            <span>RoyCash Performance Network</span>
          </div>
          <p className="section-subtitle">
            This Privacy Policy sets out how RoyCash collects, processes, and protects transactional and personal data in connection with our performance marketing, affiliate tracking, and cashback referral services.
          </p>
        </div>
      </section>

      {/* Policy Content */}
      <section className="section-wrapper" style={{ paddingTop: 0 }}>
        <div className="container" style={{ maxWidth: '860px' }}>
          <div className="glass-card" style={{ padding: '40px', lineHeight: '1.75', fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
            
            <h2 style={{ fontSize: '1.35rem', color: '#FFFFFF', marginBottom: '14px' }}>1. Scope &amp; Role of RoyCash</h2>
            <p style={{ marginBottom: '24px' }}>
              RoyCash operates as a technical intermediary and performance attribution network. In this capacity, RoyCash routes user referrals from registered publishers to participating merchant websites and receives server-to-server (S2S) postback notifications confirming qualifying commercial events.
            </p>

            <h2 style={{ fontSize: '1.35rem', color: '#FFFFFF', marginBottom: '14px' }}>2. Information We Collect</h2>
            <p style={{ marginBottom: '14px' }}>
              We collect minimal technical and transactional data necessary to substantiate performance marketing outcomes:
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px', paddingLeft: '8px' }}>
              <li style={{ display: 'flex', gap: '10px' }}>
                <span className="mono-text" style={{ color: 'var(--emerald-primary)' }}>&bull;</span>
                <span><strong>Click Identifiers:</strong> Randomly generated cryptographic tokens (e.g., <code className="mono-text">rc_click_id</code>) stamped upon outbound redirect to correlate user clicks with subsequent conversions.</span>
              </li>
              <li style={{ display: 'flex', gap: '10px' }}>
                <span className="mono-text" style={{ color: 'var(--emerald-primary)' }}>&bull;</span>
                <span><strong>Transaction References:</strong> Order identifiers (<code className="mono-text">tx_id</code>), event timestamps, transaction amounts, and currency transmitted by advertiser servers via S2S postbacks.</span>
              </li>
              <li style={{ display: 'flex', gap: '10px' }}>
                <span className="mono-text" style={{ color: 'var(--emerald-primary)' }}>&bull;</span>
                <span><strong>Technical Diagnostics:</strong> Truncated/anonymized IP addresses, country codes, browser user-agent strings, and referrer headers used exclusively for anti-fraud analysis and duplicate detection.</span>
              </li>
              <li style={{ display: 'flex', gap: '10px' }}>
                <span className="mono-text" style={{ color: 'var(--emerald-primary)' }}>&bull;</span>
                <span><strong>Publisher &amp; Advertiser Account Data:</strong> Business names, authorized contact names, corporate email addresses, and payment remittance details supplied during partner onboarding.</span>
              </li>
            </ul>

            <h2 style={{ fontSize: '1.35rem', color: '#FFFFFF', marginBottom: '14px' }}>3. Cookieless Attribution &amp; Privacy Protection</h2>
            <p style={{ marginBottom: '24px' }}>
              RoyCash utilizes direct Server-to-Server (S2S) tracking protocols. Unlike legacy advertising networks, we do not rely on invasive cross-site tracking cookies, persistent advertising IDs (IDFA/GAID), or behavioral profiling. Our tracking architecture is designed to function strictly on verified transactional parameters.
            </p>

            <h2 style={{ fontSize: '1.35rem', color: '#FFFFFF', marginBottom: '14px' }}>4. Non-Inspection of External Applications</h2>
            <p style={{ marginBottom: '24px' }}>
              RoyCash explicitly affirms that it does not inspect, monitor, or scan user activities on third-party mobile applications or devices. All conversion events are authoritatively reported by participating merchants through standardized APIs, server postbacks, or licensed Mobile Measurement Partner (MMP) platforms.
            </p>

            <h2 style={{ fontSize: '1.35rem', color: '#FFFFFF', marginBottom: '14px' }}>5. Legal Basis for Processing &amp; Fraud Prevention</h2>
            <p style={{ marginBottom: '24px' }}>
              We process technical tracking data on the legal basis of legitimate interest and contractual necessity to fulfill commercial agreements between publishers and advertisers. Fraud mitigation (such as identifying automated click injection, duplicate transaction replay, and VPN abuse) is critical to maintaining network integrity.
            </p>

            <h2 style={{ fontSize: '1.35rem', color: '#FFFFFF', marginBottom: '14px' }}>6. Data Retention Schedule</h2>
            <p style={{ marginBottom: '24px' }}>
              Click identifiers and transactional logs are maintained in an active deduplication index for 90 days to satisfy reconciliation, return period adjustments, and accounting audit requirements. After 90 days, transactional logs are aggregated for historical financial reporting and stripped of technical identifiers.
            </p>

            <h2 style={{ fontSize: '1.35rem', color: '#FFFFFF', marginBottom: '14px' }}>7. GDPR &amp; CCPA User Rights</h2>
            <p style={{ marginBottom: '14px' }}>
              Residents of the European Economic Area (EEA), the United Kingdom, and California retain rights regarding their personal information:
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px', paddingLeft: '8px' }}>
              <li>&bull; The right to request access to personal data processed by RoyCash.</li>
              <li>&bull; The right to rectify inaccurate or incomplete records.</li>
              <li>&bull; The right to request erasure of partner account credentials.</li>
              <li>&bull; The right to lodge a complaint with an applicable data protection supervisory authority.</li>
            </ul>

            <h2 style={{ fontSize: '1.35rem', color: '#FFFFFF', marginBottom: '14px' }}>8. Contact Our Data Protection Officer</h2>
            <p>
              For privacy-related inquiries, data subject access requests, or regulatory communications, please reach out to our compliance desk at <strong style={{ color: '#FFFFFF' }}>compliance@roycash.net</strong>.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
