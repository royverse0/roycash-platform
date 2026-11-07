import React from 'react';
import { AlertTriangle, ShieldCheck, CheckCircle2, FileText } from 'lucide-react';

export default function Disclaimer() {
  return (
    <div>
      {/* Hero */}
      <section className="section-wrapper" style={{ paddingTop: '80px', paddingBottom: '50px' }}>
        <div className="container" style={{ maxWidth: '860px' }}>
          <span className="badge-gold-clean" style={{ marginBottom: '12px' }}>
            <AlertTriangle size={14} />
            <span>Transparency &amp; Disclosures</span>
          </span>
          <h1 className="hero-title" style={{ marginBottom: '16px' }}>Network Earnings &amp; Performance Disclaimer</h1>
          <div className="meta-row" style={{ marginBottom: '24px' }}>
            <span>Last Updated: November 2026</span>
            <span className="meta-separator">&middot;</span>
            <span>RoyCash Network Compliance</span>
          </div>
          <p className="section-subtitle">
            RoyCash is dedicated to ethical affiliate and performance marketing. Please read our comprehensive network disclosures carefully.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="section-wrapper" style={{ paddingTop: 0 }}>
        <div className="container" style={{ maxWidth: '860px' }}>
          <div className="glass-card" style={{ padding: '40px', lineHeight: '1.75', fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
            
            <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid var(--border-gold)', borderRadius: '10px', padding: '20px', marginBottom: '32px' }}>
              <h3 style={{ fontSize: '1.05rem', color: '#FFFFFF', marginBottom: '6px' }}>
                Summary of Core Disclosures
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: '1.6' }}>
                RoyCash does not promise or guarantee financial earnings. Payouts and cashback rewards are solely contingent on active advertiser campaigns, verified customer actions, and approved reconciliation reports.
              </p>
            </div>

            <h2 style={{ fontSize: '1.35rem', color: '#FFFFFF', marginBottom: '14px' }}>1. No Guarantee of Earnings or Financial Income</h2>
            <p style={{ marginBottom: '24px' }}>
              Any references to commission models (such as CPA, CPL, CPS, or Revenue Share) or payout metrics on this website are provided strictly for illustrative and educational purposes. RoyCash makes no guarantees regarding the financial income, revenue, or return on advertising spend (ROAS) that any publisher, affiliate, or media buyer may generate through our network. Individual publisher results vary widely depending on audience quality, traffic source, conversion funnel design, and market competition.
            </p>

            <h2 style={{ fontSize: '1.35rem', color: '#FFFFFF', marginBottom: '14px' }}>2. Campaign Availability &amp; Terms Dependency</h2>
            <p style={{ marginBottom: '24px' }}>
              All marketing campaigns, payout rates, geo-allowances, and daily conversion caps listed on the RoyCash network are set by independent third-party advertisers and are subject to change, pause, or termination without prior notice. Placement on our network does not constitute an ongoing contract to provide specific offer inventory.
            </p>

            <h2 style={{ fontSize: '1.35rem', color: '#FFFFFF', marginBottom: '14px' }}>3. Cashback Settlement &amp; Merchant Validation Contingency</h2>
            <p style={{ marginBottom: '24px' }}>
              Cashback incentives, customer rewards, and affiliate commissions are strictly contingent upon verified advertiser server-to-server confirmation. If an advertiser declines a transaction due to customer cancellation, merchandise return, credit card chargeback, or fraud, RoyCash cannot remit payment for that transaction. RoyCash serves as an intermediary and is not responsible for funds withheld by merchants under verified return policies.
            </p>

            <h2 style={{ fontSize: '1.35rem', color: '#FFFFFF', marginBottom: '14px' }}>4. Technical Tracking &amp; Device Inspection Limitations</h2>
            <p style={{ marginBottom: '24px' }}>
              RoyCash explicitly affirms that it does not possess the capability or authority to independently inspect closed third-party mobile applications, scan private user device processes, or detect app installs without direct advertiser integration (e.g., S2S postbacks or approved Mobile Measurement Partner SDKs). All conversion data is authoritative only through authenticated advertiser transmissions.
            </p>

            <h2 style={{ fontSize: '1.35rem', color: '#FFFFFF', marginBottom: '14px' }}>5. Independent Intermediary Status &amp; Trademark Notice</h2>
            <p style={{ marginBottom: '24px' }}>
              RoyCash operates as an independent performance network. All corporate brand names, merchant logos, product trademarks, and service marks mentioned in discussions of merchant categories belong strictly to their respective registered owners. Mention of commercial categories (e.g. e-commerce, SaaS, travel, fintech) does not imply endorsement or direct partnership unless explicitly documented under active commercial agreements.
            </p>

            <h2 style={{ fontSize: '1.35rem', color: '#FFFFFF', marginBottom: '14px' }}>6. Questions Concerning Compliance</h2>
            <p>
              If you have any questions or require clarification regarding any aspect of our network disclosures, please contact our legal and compliance desk at <strong style={{ color: '#FFFFFF' }}>compliance@roycash.net</strong>.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
