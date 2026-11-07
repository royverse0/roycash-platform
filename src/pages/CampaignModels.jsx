import React, { useState } from 'react';
import { 
  ArrowRight, 
  CheckCircle2, 
  HelpCircle, 
  Layers, 
  Search, 
  DollarSign, 
  Smartphone, 
  Download, 
  ShoppingCart, 
  UserCheck, 
  RefreshCw, 
  GitMerge 
} from 'lucide-react';

export default function CampaignModels({ openModal }) {
  const [activeFilter, setActiveFilter] = useState('all');

  const models = [
    {
      id: 'cpa',
      category: 'action',
      code: 'CPA',
      name: 'Cost Per Action',
      trigger: 'Completed specific qualified action',
      definition: 'The advertiser pays a fixed commission when a referred user completes a designated post-click action beyond a simple registration—such as making an initial account deposit, linking a bank account, or activating a subscription.',
      example: 'A fintech trading platform pays a $75 CPA when a referred user completes KYC identity verification and deposits at least $25 into their trading wallet.',
      bestFor: 'Fintech, crypto platforms, neo-banks, and multi-step SaaS trials.'
    },
    {
      id: 'cpl',
      category: 'lead',
      code: 'CPL',
      name: 'Cost Per Lead',
      trigger: 'Validated contact form submission',
      definition: 'The advertiser compensates the publisher for collecting verified, prospective customer contact details (typically verified name, phone number, and email address).',
      example: 'An insurance broker pays $18 CPL for every consumer who fills out an auto insurance comparison questionnaire with a valid geographic location and telephone number.',
      bestFor: 'Mortgage lending, insurance, B2B enterprise software, and home service quotes.'
    },
    {
      id: 'cpc',
      category: 'traffic',
      code: 'CPC',
      name: 'Cost Per Click',
      trigger: 'Validated outbound click to landing page',
      definition: 'The advertiser pays for each qualified visitor click directed to their external web portal, regardless of whether the user subsequently completes a purchase.',
      example: 'A travel booking site pays $0.35 CPC for qualified visitors directed from a flight search aggregator to their hotel booking search results.',
      bestFor: 'Brand awareness, high-volume e-commerce portals, and search comparison engines.'
    },
    {
      id: 'cpi',
      category: 'mobile',
      code: 'CPI',
      name: 'Cost Per Install',
      trigger: 'App downloaded and opened on device',
      definition: 'Payout is earned when a user clicks an ad, downloads the advertiser\'s mobile application from Apple App Store or Google Play Store, and opens it for the first time.',
      example: 'A mobile casual game pays $3.20 CPI when an iOS user installs the application and initiates their initial game session via an MMP postback.',
      bestFor: 'Mobile gaming, utility apps, fintech mobile wallets, and social platforms.'
    },
    {
      id: 'cpd',
      category: 'mobile',
      code: 'CPD',
      name: 'Cost Per Download',
      trigger: 'Successful file or software download',
      definition: 'Compensates the affiliate when a prospective user downloads an installable desktop program, mobile file, digital whitepaper, or software utility.',
      example: 'A PC cybersecurity company pays $2.50 CPD when a Windows user successfully downloads their free antivirus installer package.',
      bestFor: 'Desktop utilities, productivity software, PDF research reports, and browser addons.'
    },
    {
      id: 'cps',
      category: 'sales',
      code: 'CPS',
      name: 'Cost Per Sale',
      trigger: 'Completed commercial checkout',
      definition: 'The publisher receives a designated percentage of the total cart order value or a flat bounty once a customer finishes a retail payment and passes the cancellation window.',
      example: 'An electronics retailer offers a 6% CPS commission on all completed purchases, paying $36 on a $600 smartphone order.',
      bestFor: 'E-commerce retailers, fashion brands, consumer electronics, and subscription boxes.'
    },
    {
      id: 'cpo',
      category: 'sales',
      code: 'CPO',
      name: 'Cost Per Order',
      trigger: 'Individual order placement validated',
      definition: 'Similar to CPS, but offers a predetermined fixed monetary bounty per distinct valid order, irrespective of how many items or what basket size was purchased.',
      example: 'A meal-kit delivery service pays a flat $40 CPO bounty for every newly placed initial food basket order.',
      bestFor: 'Subscription groceries, specialty delivery services, and recurring consumer goods.'
    },
    {
      id: 'cpr',
      category: 'lead',
      code: 'CPR',
      name: 'Cost Per Registration',
      trigger: 'User creates and confirms account',
      definition: 'Payout occurs as soon as the referred visitor successfully signs up for an account, verifies their email address, and gains access to the basic platform tier.',
      example: 'A freemium project management SaaS platform pays $6.00 CPR when an individual registers with a corporate work email address and confirms their sign-up.',
      bestFor: 'Community forums, online gaming portals, dating services, and freemium productivity tools.'
    },
    {
      id: 'revshare',
      category: 'retention',
      code: 'RevShare',
      name: 'Revenue Share',
      trigger: 'Recurring billing cycles and revenue generation',
      definition: 'The affiliate receives an ongoing contractual percentage of the actual net revenue generated by the referred client across months or years of service.',
      example: 'A cloud hosting provider pays 25% recurring monthly RevShare for the entire duration the referred customer retains an active VPS server hosting subscription.',
      bestFor: 'B2B SaaS, web hosting, VPN providers, marketing automation tools, and subscription software.'
    },
    {
      id: 'hybrid',
      category: 'retention',
      code: 'Hybrid',
      name: 'Hybrid Commission Model',
      trigger: 'Combined initial action plus ongoing revenue',
      definition: 'Combines an immediate upfront bounty (such as CPA or CPR) with a secondary recurring percentage share, aligning immediate media costs with long-term retention value.',
      example: 'A trading brokerage pays an upfront $50 CPA upon first customer deposit, plus a continuous 15% net spread revenue share on all completed trades.',
      bestFor: 'Performance media buyers requiring upfront cash flow to reinvest into ad spend while building long-term recurring revenue.'
    }
  ];

  const filteredModels = activeFilter === 'all' 
    ? models 
    : models.filter(m => m.category === activeFilter);

  return (
    <div>
      {/* Hero */}
      <section className="section-wrapper" style={{ paddingTop: '80px', paddingBottom: '60px' }}>
        <div className="container">
          <div style={{ maxWidth: '820px' }}>
            <span className="badge-clean" style={{ marginBottom: '12px' }}>
              <Layers size={14} />
              <span>Performance Monetization</span>
            </span>
            <h1 className="hero-title" style={{ marginBottom: '20px' }}>
              Comprehensive Guide to 10 Campaign Performance Models
            </h1>
            <p className="section-subtitle" style={{ marginBottom: '32px' }}>
              RoyCash supports all major performance marketing structures. Understand the exact payout triggers, advertiser incentives, and operational mechanics of each model.
            </p>

            {/* Filter buttons */}
            <div className="tab-group" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              <button
                type="button"
                className={`tab-btn ${activeFilter === 'all' ? 'active' : ''}`}
                onClick={() => setActiveFilter('all')}
              >
                All 10 Models
              </button>
              <button
                type="button"
                className={`tab-btn ${activeFilter === 'action' ? 'active' : ''}`}
                onClick={() => setActiveFilter('action')}
              >
                Action &amp; Deposit (CPA)
              </button>
              <button
                type="button"
                className={`tab-btn ${activeFilter === 'sales' ? 'active' : ''}`}
                onClick={() => setActiveFilter('sales')}
              >
                Sales &amp; Orders (CPS / CPO)
              </button>
              <button
                type="button"
                className={`tab-btn ${activeFilter === 'lead' ? 'active' : ''}`}
                onClick={() => setActiveFilter('lead')}
              >
                Leads &amp; Registrations (CPL / CPR)
              </button>
              <button
                type="button"
                className={`tab-btn ${activeFilter === 'mobile' ? 'active' : ''}`}
                onClick={() => setActiveFilter('mobile')}
              >
                Mobile &amp; App (CPI / CPD)
              </button>
              <button
                type="button"
                className={`tab-btn ${activeFilter === 'retention' ? 'active' : ''}`}
                onClick={() => setActiveFilter('retention')}
              >
                Recurring &amp; Hybrid (RevShare)
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Models Grid */}
      <section className="section-wrapper" style={{ background: 'rgba(13, 20, 36, 0.4)', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="container">
          <div className="grid-2" style={{ gap: '32px' }}>
            {filteredModels.map((m) => (
              <div key={m.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="mono-text" style={{ 
                        fontSize: '1.1rem', 
                        fontWeight: '800', 
                        color: m.category === 'retention' ? 'var(--gold-accent)' : 'var(--emerald-primary)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        padding: '4px 10px',
                        borderRadius: '6px'
                      }}>
                        {m.code}
                      </span>
                      <h3 style={{ fontSize: '1.2rem' }}>{m.name}</h3>
                    </div>
                  </div>

                  <div className="meta-row" style={{ marginBottom: '16px' }}>
                    <span style={{ color: '#FFFFFF', fontWeight: '600' }}>Trigger:</span>
                    <span>{m.trigger}</span>
                  </div>

                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: '1.65', marginBottom: '18px' }}>
                    {m.definition}
                  </p>

                  <div style={{ background: 'var(--bg-surface-elevated)', borderRadius: '10px', padding: '16px', border: '1px solid var(--border-subtle)', marginBottom: '18px' }}>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--gold-accent)', fontWeight: '700', marginBottom: '4px' }}>
                      Real-World Example
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#E2E8F0', lineHeight: '1.6' }}>
                      {m.example}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
                  <strong style={{ color: 'var(--text-muted)' }}>Optimal Verticals:</strong> {m.bestFor}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Summary Matrix Table */}
      <section className="section-wrapper">
        <div className="container">
          <div style={{ marginBottom: '36px' }}>
            <span className="badge-gold-clean">Comparison Matrix</span>
            <h2 className="section-title" style={{ marginTop: '6px' }}>Campaign Models at a Glance</h2>
            <p className="section-subtitle">
              Quick reference comparison of payment triggers and validation criteria.
            </p>
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Model</th>
                  <th>Full Name</th>
                  <th>Primary Payout Trigger</th>
                  <th>Risk Profile (Advertiser / Publisher)</th>
                  <th>Typical Integration</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <span className="mono-text" style={{ fontWeight: '700', color: m.category === 'retention' ? 'var(--gold-accent)' : 'var(--emerald-primary)' }}>
                        {m.code}
                      </span>
                    </td>
                    <td style={{ fontWeight: '600', color: '#FFFFFF' }}>{m.name}</td>
                    <td style={{ fontSize: '0.875rem' }}>{m.trigger}</td>
                    <td style={{ fontSize: '0.8125rem' }}>
                      {m.category === 'sales' || m.category === 'action' ? 'Zero Adv Risk / Medium Pub Risk' : 
                       m.category === 'traffic' ? 'Low Pub Risk / High Adv Risk' : 
                       'Balanced Performance Risk'}
                    </td>
                    <td className="mono-text" style={{ fontSize: '0.75rem' }}>
                      {m.category === 'mobile' ? 'MMP / SDK Postback' : 'S2S Webhook / Postback'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-wrapper" style={{ textAlign: 'center', background: 'rgba(7, 11, 20, 0.7)' }}>
        <div className="container" style={{ maxWidth: '640px' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '16px' }}>Find the Right Model for Your Traffic</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '28px' }}>
            Our affiliate managers help align your audience with campaigns featuring the optimal model and highest verified EPC (Earnings Per Click).
          </p>
          <button
            type="button"
            onClick={() => openModal('publisher')}
            className="btn btn-primary"
          >
            <span>Discuss Campaign Models</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}
