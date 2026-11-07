import React from 'react';
import { ShieldCheck, FileText, CheckCircle2, AlertOctagon } from 'lucide-react';

export default function TermsConditions() {
  return (
    <div>
      {/* Hero */}
      <section className="section-wrapper" style={{ paddingTop: '80px', paddingBottom: '50px' }}>
        <div className="container" style={{ maxWidth: '860px' }}>
          <span className="badge-clean" style={{ marginBottom: '12px' }}>
            <FileText size={14} />
            <span>Master Service Agreement</span>
          </span>
          <h1 className="hero-title" style={{ marginBottom: '16px' }}>Terms &amp; Conditions</h1>
          <div className="meta-row" style={{ marginBottom: '24px' }}>
            <span>Effective Date: November 2026</span>
            <span className="meta-separator">&middot;</span>
            <span>Version 3.1</span>
            <span className="meta-separator">&middot;</span>
            <span>RoyCash Network</span>
          </div>
          <p className="section-subtitle">
            These Terms &amp; Conditions govern participation in the RoyCash affiliate, performance marketing, and cashback network for both publishers and advertisers.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="section-wrapper" style={{ paddingTop: 0 }}>
        <div className="container" style={{ maxWidth: '860px' }}>
          <div className="glass-card" style={{ padding: '40px', lineHeight: '1.75', fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
            
            <h2 style={{ fontSize: '1.35rem', color: '#FFFFFF', marginBottom: '14px' }}>1. Acceptance of Terms</h2>
            <p style={{ marginBottom: '24px' }}>
              By registering as a publisher, onboarding as an advertiser, or utilizing tracking endpoints provided by RoyCash, you represent that you have full legal authority to enter into this agreement and agree to be bound by all stipulations outlined herein.
            </p>

            <h2 style={{ fontSize: '1.35rem', color: '#FFFFFF', marginBottom: '14px' }}>2. Publisher Traffic Rules &amp; Acceptable Use</h2>
            <p style={{ marginBottom: '14px' }}>
              Publishers must strictly adhere to industry advertising ethics. The following practices are strictly prohibited and constitute a material breach resulting in immediate account termination and forfeiture of unpaid commissions:
            </p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px', paddingLeft: '8px' }}>
              <li style={{ display: 'flex', gap: '10px' }}>
                <span className="mono-text" style={{ color: '#F87171' }}>&times;</span>
                <span>Generating automated, simulated, bot-driven, or proxy-routed clicks or conversions.</span>
              </li>
              <li style={{ display: 'flex', gap: '10px' }}>
                <span className="mono-text" style={{ color: '#F87171' }}>&times;</span>
                <span>Cookie dropping, cookie stuffing, or loading merchant URLs in hidden zero-pixel iframes.</span>
              </li>
              <li style={{ display: 'flex', gap: '10px' }}>
                <span className="mono-text" style={{ color: '#F87171' }}>&times;</span>
                <span>Deceptive ads claiming unauthorized discounts, false endorsements, or non-existent giveaways.</span>
              </li>
              <li style={{ display: 'flex', gap: '10px' }}>
                <span className="mono-text" style={{ color: '#F87171' }}>&times;</span>
                <span>Bidding on merchant trademarked terms in search ad auctions without explicit written advertiser approval.</span>
              </li>
            </ul>

            <h2 style={{ fontSize: '1.35rem', color: '#FFFFFF', marginBottom: '14px' }}>3. Advertiser Obligations &amp; Postback Integrity</h2>
            <p style={{ marginBottom: '24px' }}>
              Advertisers agree to maintain active, accurate server-to-server postback endpoints and to transmit valid transaction identifiers for all legitimate customer actions. Advertisers agree not to artificially manipulate, delay, or suppress postbacks for qualifying referral events.
            </p>

            <h2 style={{ fontSize: '1.35rem', color: '#FFFFFF', marginBottom: '14px' }}>4. Conversion Validation &amp; Return Periods</h2>
            <p style={{ marginBottom: '24px' }}>
              All commissions and cashback disbursements are contingent upon verified advertiser reconciliation. Transactions remain in "Pending" status during the advertiser's designated reconciliation window (standardly 14 to 45 calendar days). Cancellations, chargebacks, customer returns, or fraudulent orders reported by the merchant will be deducted from pending commission balances.
            </p>

            <h2 style={{ fontSize: '1.35rem', color: '#FFFFFF', marginBottom: '14px' }}>5. Payment Terms &amp; Thresholds</h2>
            <p style={{ marginBottom: '24px' }}>
              Verified balances are disbursed according to agreed payment terms (typically Net-15 or Net-30). Minimum payout thresholds are $100 for electronic payments (PayPal, USDT) and $500 for International Bank Wire Transfers. All transactions are subject to AML and identity verification checks.
            </p>

            <h2 style={{ fontSize: '1.35rem', color: '#FFFFFF', marginBottom: '14px' }}>6. No Guarantee of Volume or Earnings</h2>
            <p style={{ marginBottom: '24px' }}>
              RoyCash does not guarantee specific traffic volumes, conversion rates, or earnings for publishers. Performance outcomes depend entirely upon market demand, campaign terms, audience relevance, and publisher execution.
            </p>

            <h2 style={{ fontSize: '1.35rem', color: '#FFFFFF', marginBottom: '14px' }}>7. Limitation of Liability</h2>
            <p style={{ marginBottom: '24px' }}>
              In no event shall RoyCash, its officers, directors, or technical affiliates be liable for indirect, incidental, consequential, or punitive damages arising from temporary downtime of third-party merchant servers, network routing interruptions, or tracking parameter omissions caused by browser configurations.
            </p>

            <h2 style={{ fontSize: '1.35rem', color: '#FFFFFF', marginBottom: '14px' }}>8. Governing Law &amp; Dispute Resolution</h2>
            <p>
              These Terms shall be governed by and construed in accordance with international commercial law principles. Any dispute arising out of this agreement shall be submitted to confidential binding arbitration.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
