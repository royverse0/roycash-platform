import React, { useState, useEffect } from 'react';
import { Users, Copy, Check, Share2, DollarSign, ShieldCheck, ArrowRight, UserCheck } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Referrals({ navigate }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReferrals();
  }, []);

  const loadReferrals = async () => {
    try {
      setLoading(true);
      const res = await api.getReferrals();
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Failed to load referrals:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (!data?.referral_link) return;
    navigator.clipboard.writeText(data.referral_link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ paddingBottom: '80px' }}>
      {/* Hero */}
      <section className="section-wrapper" style={{ paddingTop: '60px', paddingBottom: '30px' }}>
        <div className="container">
          <div style={{ maxWidth: '780px' }}>
            <span className="badge-clean" style={{ marginBottom: '10px' }}>
              <Users size={14} />
              <span>Community Rewards</span>
            </span>
            <h1 className="hero-title" style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', marginBottom: '12px' }}>
              Earn 10% Lifetime Referral Commission
            </h1>
            <p className="section-subtitle">
              Invite friends to RoyCash. Whenever your referred friends complete a verified campaign and receive cashback, you automatically earn 10% bonus commission credited directly to your withdrawable wallet.
            </p>
          </div>
        </div>
      </section>

      {/* Referral Code & Link Box */}
      <section className="section-wrapper-sm" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="glass-card" style={{ padding: '32px', marginBottom: '36px', border: '1px solid var(--border-emerald)' }}>
            <div className="grid-2" style={{ gap: '32px', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '6px' }}>Your Personal Invitation Link</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '20px' }}>
                  Share your link via WhatsApp, Telegram, or social channels. New members signing up through this link are automatically linked to your referral wallet.
                </p>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  <input
                    type="text"
                    readOnly
                    value={data?.referral_link || 'Loading your link...'}
                    style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                  />
                  <button
                    type="button"
                    onClick={copyLink}
                    className="btn btn-primary btn-sm"
                    style={{ padding: '0 20px' }}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>

                <div className="meta-row">
                  <span>Referral Code:</span>
                  <span className="mono-text" style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--emerald-primary)' }}>
                    {data?.referral_code || user?.referral_code}
                  </span>
                </div>
              </div>

              {/* Stats Counters */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="glass-panel" style={{ textAlign: 'center', padding: '24px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    FRIENDS REFERRED
                  </div>
                  <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#FFFFFF' }}>
                    {data?.total_referred || 0}
                  </div>
                </div>

                <div className="glass-panel" style={{ textAlign: 'center', padding: '24px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    REFERRAL COMMISSIONS
                  </div>
                  <div style={{ fontSize: '2.2rem', fontWeight: '800', color: 'var(--emerald-primary)' }}>
                    ₹{data?.total_earned?.toFixed(2) || '0.00'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Referred Members List */}
          <div className="glass-card" style={{ padding: '32px', marginBottom: '32px' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '18px' }}>Referred Network Members</h3>
            {data?.referrals?.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)' }}>
                No friends have joined using your referral code yet. Share your link above to begin!
              </div>
            ) : (
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Friend Name</th>
                      <th>Account Status</th>
                      <th>Joined Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.referrals?.map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: '600', color: '#FFFFFF' }}>{r.name}</td>
                        <td>
                          <span style={{ color: 'var(--emerald-primary)', fontWeight: '600', fontSize: '0.8rem' }}>
                            Active Member
                          </span>
                        </td>
                        <td className="mono-text" style={{ fontSize: '0.8rem' }}>
                          {new Date(r.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
