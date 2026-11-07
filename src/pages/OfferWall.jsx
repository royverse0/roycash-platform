import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  Smartphone, 
  Search, 
  Layers, 
  DollarSign, 
  AlertTriangle, 
  Info, 
  Check,
  ExternalLink,
  Zap
} from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function OfferWall({ navigate }) {
  const { user, openAuth } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [providerInfo, setProviderInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [startingOfferId, setStartingOfferId] = useState(null);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const res = await api.getCampaigns();
      if (res.success) {
        setCampaigns(res.campaigns || []);
        setProviderInfo(res.provider || null);
      }
    } catch (err) {
      console.error('Failed to load campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGetOffer = async (campaign) => {
    if (!user) {
      openAuth('login');
      return;
    }

    try {
      setStartingOfferId(campaign.id);
      const res = await api.clickOffer(campaign.id);
      if (res.success && res.click_id) {
        // Open live tracking page for this offer
        navigate(`track/${res.click_id}`);
      }
    } catch (err) {
      alert('Unable to generate tracking click: ' + err.message);
    } finally {
      setStartingOfferId(null);
    }
  };

  const filteredCampaigns = campaigns.filter((c) => {
    if (filter === 'apps' && !c.requires_install) return false;
    if (filter === 'kyc' && !c.requires_kyc) return false;
    if (filter === 'deposit' && !c.requires_deposit) return false;
    if (filter === 'nodeposit' && c.requires_deposit) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.advertiser_name.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div>
      {/* Hero */}
      <section className="section-wrapper" style={{ paddingTop: '60px', paddingBottom: '40px' }}>
        <div className="container">
          <div style={{ maxWidth: '780px' }}>
            <span className="badge-clean" style={{ marginBottom: '12px' }}>
              <ShieldCheck size={14} />
              <span>Verified Cashback Wall</span>
            </span>
            <h1 className="hero-title" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', marginBottom: '16px' }}>
              Explore Cashback Offers &amp; Rewards
            </h1>
            <p className="section-subtitle" style={{ marginBottom: '24px' }}>
              Complete advertiser-defined actions and earn verified cashback. Every offer is tracked via deterministic S2S callbacks with complete step-by-step transparency.
            </p>

            {/* Provider Integration Status Banner */}
            {providerInfo && (
              <div
                style={{
                  background: providerInfo.is_live ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                  border: `1px solid ${providerInfo.is_live ? 'var(--border-emerald)' : 'var(--border-gold)'}`,
                  borderRadius: '10px',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '0.875rem',
                  color: '#FFFFFF',
                }}
              >
                <Info size={18} style={{ color: providerInfo.is_live ? 'var(--emerald-primary)' : 'var(--gold-accent)', flexShrink: 0 }} />
                <div>
                  <strong>{providerInfo.name}:</strong> {providerInfo.notice}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Filter & Search Bar */}
      <section className="section-wrapper-sm" style={{ paddingTop: 0 }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
            <div className="tab-group" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              <button
                type="button"
                className={`tab-btn ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All Offers ({campaigns.length})
              </button>
              <button
                type="button"
                className={`tab-btn ${filter === 'apps' ? 'active' : ''}`}
                onClick={() => setFilter('apps')}
              >
                Mobile Apps
              </button>
              <button
                type="button"
                className={`tab-btn ${filter === 'nodeposit' ? 'active' : ''}`}
                onClick={() => setFilter('nodeposit')}
              >
                Zero Deposit
              </button>
              <button
                type="button"
                className={`tab-btn ${filter === 'kyc' ? 'active' : ''}`}
                onClick={() => setFilter('kyc')}
              >
                KYC Demat &amp; Finance
              </button>
              <button
                type="button"
                className={`tab-btn ${filter === 'deposit' ? 'active' : ''}`}
                onClick={() => setFilter('deposit')}
              >
                Deposit / Purchase
              </button>
            </div>

            <div style={{ position: 'relative', minWidth: '240px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="text"
                placeholder="Search offer or merchant..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '36px', width: '100%' }}
              />
            </div>
          </div>

          {/* Offer Cards Grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              Loading verified campaigns...
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>No campaigns found</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Try clearing your search or filter.</p>
            </div>
          ) : (
            <div className="grid-3" style={{ gap: '24px' }}>
              {filteredCampaigns.map((c) => (
                <div key={c.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    {/* Top Row: Advertiser & Reward */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {c.advertiser_name}
                        </div>
                        <h3 style={{ fontSize: '1.2rem', marginTop: '2px', color: '#FFFFFF' }}>{c.name}</h3>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '1.35rem', fontWeight: '800', color: 'var(--emerald-primary)' }}>
                          ₹{c.reward_amount}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>CASHBACK</div>
                      </div>
                    </div>

                    {/* Category & Demo Label */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', background: 'rgba(255, 255, 255, 0.05)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                        {c.category}
                      </span>
                      {c.is_demo && (
                        <span style={{ fontSize: '0.75rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid var(--border-gold)', padding: '2px 8px', borderRadius: '4px', color: 'var(--gold-accent)' }}>
                          Sandbox Offer
                        </span>
                      )}
                    </div>

                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '18px' }}>
                      {c.description}
                    </p>

                    {/* Step Requirements Checklist */}
                    <div style={{ background: 'var(--bg-surface-elevated)', borderRadius: '8px', padding: '14px', border: '1px solid var(--border-subtle)', marginBottom: '18px' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#FFFFFF', marginBottom: '8px' }}>
                        Conversion Steps Required:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8125rem' }}>
                        {c.steps?.map((s, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                            <CheckCircle2 size={14} style={{ color: 'var(--emerald-primary)', flexShrink: 0 }} />
                            <span>{s.title}</span>
                          </div>
                        ))}
                        {c.requires_deposit ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gold-accent)', fontSize: '0.775rem', marginTop: '2px' }}>
                            <Info size={12} />
                            <span>Min. Deposit: ₹{c.minimum_deposit_amount}</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--emerald-light)', fontSize: '0.775rem', marginTop: '2px' }}>
                            <Check size={12} />
                            <span>Zero Deposit Required</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action & Terms */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} />
                        <span>Est. Approval: ~{c.estimated_approval_days} Days</span>
                      </div>
                      <span>Verified S2S Tracking</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleGetOffer(c)}
                      disabled={startingOfferId === c.id}
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '12px' }}
                    >
                      <span>{startingOfferId === c.id ? 'Generating Click...' : 'Get Offer & Start Tracking'}</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
