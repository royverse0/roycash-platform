import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ArrowUpRight, 
  TrendingUp, 
  Users, 
  Layers, 
  ShieldCheck, 
  ArrowRight,
  ExternalLink,
  Wallet
} from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Dashboard({ navigate }) {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [myOffers, setMyOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [dashRes, offersRes] = await Promise.all([
        api.getDashboard(),
        api.getMyOffers(),
      ]);

      if (dashRes.success) {
        setStats(dashRes.stats);
        setRecentActivity(dashRes.recent_activity || []);
      }
      if (offersRes.success) {
        setMyOffers(offersRes.offers || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Top Welcome Section */}
      <section className="section-wrapper" style={{ paddingTop: '60px', paddingBottom: '30px' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <span className="badge-clean" style={{ marginBottom: '8px' }}>
                <ShieldCheck size={14} />
                <span>Verified Member Hub</span>
              </span>
              <h1 className="hero-title" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)', marginBottom: '6px' }}>
                Welcome back, {user?.name?.split(' ')[0] || 'Member'}
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem' }}>
                Track your active offer steps, pending cashback validations, and withdrawable balance.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => navigate('offers')}
                className="btn btn-primary"
              >
                <span>Browse Offers</span>
                <ArrowRight size={16} />
              </button>
              <button
                type="button"
                onClick={() => navigate('wallet')}
                className="btn btn-secondary"
              >
                <Wallet size={16} />
                <span>Withdraw Funds</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* KPI METRICS CARDS */}
      <section className="section-wrapper-sm" style={{ paddingTop: 0 }}>
        <div className="container">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              Calculating verified wallet balances...
            </div>
          ) : (
            <div className="grid-4" style={{ gap: '20px' }}>
              {/* Withdrawable Balance */}
              <div className="glass-card" style={{ border: '1px solid var(--border-emerald)', background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.08), rgba(13, 20, 36, 0.8))' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                  WITHDRAWABLE BALANCE
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--emerald-primary)' }}>
                  ₹{stats?.withdrawable_balance?.toFixed(2) || '0.00'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--emerald-light)', marginTop: '4px' }}>
                  Available for instant UPI / Bank transfer
                </div>
              </div>

              {/* Pending Cashback */}
              <div className="glass-card">
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                  PENDING CASHBACK
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--gold-accent)' }}>
                  ₹{stats?.pending_cashback?.toFixed(2) || '0.00'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  In advertiser validation window
                </div>
              </div>

              {/* Total Approved */}
              <div className="glass-card">
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                  APPROVED CASHBACK
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: '#FFFFFF' }}>
                  ₹{stats?.approved_balance?.toFixed(2) || '0.00'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Total lifetime confirmed rewards
                </div>
              </div>

              {/* Referral Earnings */}
              <div className="glass-card">
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                  REFERRAL COMMISSIONS
                </div>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--emerald-light)' }}>
                  ₹{stats?.referral_earnings?.toFixed(2) || '0.00'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Earned via friend invitations
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* SECONDARY ROW: Active Offers & Recent Activity */}
      <section className="section-wrapper-sm" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="grid-2" style={{ gap: '32px', alignItems: 'flex-start' }}>
            {/* Active Offers In-Progress */}
            <div className="glass-card" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', color: '#FFFFFF' }}>My Active Offers</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                    {myOffers.length} offers initiated
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('offers')}
                  className="btn btn-secondary btn-sm"
                >
                  <span>Explore More</span>
                </button>
              </div>

              {myOffers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--text-muted)' }}>
                  <p style={{ fontSize: '0.9rem', marginBottom: '16px' }}>You haven't started any offers yet.</p>
                  <button type="button" onClick={() => navigate('offers')} className="btn btn-primary btn-sm">
                    Browse Cashback Wall
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {myOffers.slice(0, 5).map((offer, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--bg-surface-elevated)',
                        borderRadius: '10px',
                        padding: '16px',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '14px',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '600', color: '#FFFFFF', fontSize: '0.95rem' }}>
                          {offer.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                          {offer.advertiser_name} &bull; Potential ₹{offer.reward_amount}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: offer.conversion_status === 'approved' ? 'var(--emerald-subtle)' : 'rgba(245, 158, 11, 0.1)',
                            color: offer.conversion_status === 'approved' ? 'var(--emerald-primary)' : 'var(--gold-accent)',
                          }}
                        >
                          {offer.conversion_status === 'approved' ? 'Approved' : 'In Tracking'}
                        </span>
                        <button
                          type="button"
                          onClick={() => navigate(`track/${offer.click_id}`)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                        >
                          <span>Live Timeline</span>
                          <ArrowRight size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Transaction Activity */}
            <div className="glass-card" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', color: '#FFFFFF' }}>Recent Conversion Activity</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                    Live postback reconciliation ledger
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('wallet')}
                  className="btn btn-secondary btn-sm"
                >
                  <span>Full Ledger</span>
                </button>
              </div>

              {recentActivity.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  No conversion records found yet. Click an offer to start tracking.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {recentActivity.map((act, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 14px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.875rem',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '600', color: '#FFFFFF' }}>{act.campaign_name}</div>
                        <div className="mono-text" style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                          {new Date(act.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: '700', color: act.status === 'approved' ? 'var(--emerald-primary)' : 'var(--gold-accent)' }}>
                          ₹{act.reward_amount}
                        </div>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
                          {act.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
