import React, { useState, useEffect } from 'react';
import { 
  Wallet as WalletIcon, 
  ArrowUpRight, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  CreditCard, 
  Send,
  Building,
  Smartphone
} from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Wallet({ navigate }) {
  const { user, refreshUser } = useAuth();
  const [walletData, setWalletData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Withdrawal form
  const [amount, setAmount] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('upi');
  const [upiId, setUpiId] = useState('');
  const [bankAcc, setBankAcc] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankName, setBankName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [withdrawMsg, setWithdrawMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    loadWallet();
  }, []);

  const loadWallet = async () => {
    try {
      setLoading(true);
      const res = await api.getWallet();
      if (res.success) {
        setWalletData(res);
        if (res.payout_details) {
          setUpiId(res.payout_details.upi_id || '');
          setBankAcc(res.payout_details.bank_account_number || '');
          setBankIfsc(res.payout_details.bank_ifsc || '');
          setBankName(res.payout_details.bank_holder_name || '');
        }
      }
    } catch (err) {
      console.error('Wallet load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    setWithdrawMsg({ type: '', text: '' });
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount < 100) {
      setWithdrawMsg({ type: 'error', text: 'Minimum withdrawal amount is ₹100.' });
      return;
    }

    if (numAmount > (walletData?.balances?.withdrawable_balance || 0)) {
      setWithdrawMsg({ type: 'error', text: 'Requested amount exceeds withdrawable balance.' });
      return;
    }

    let details = {};
    if (payoutMethod === 'upi') {
      if (!upiId.trim() || !upiId.includes('@')) {
        setWithdrawMsg({ type: 'error', text: 'Please provide a valid UPI ID (e.g. mobile@bank).' });
        return;
      }
      details = { upi_id: upiId.trim() };
    } else {
      if (!bankAcc.trim() || !bankIfsc.trim() || !bankName.trim()) {
        setWithdrawMsg({ type: 'error', text: 'All bank account details are required.' });
        return;
      }
      details = {
        bank_account_number: bankAcc.trim(),
        bank_ifsc: bankIfsc.trim().toUpperCase(),
        bank_holder_name: bankName.trim(),
      };
    }

    try {
      setSubmitting(true);
      // Save payout details in user profile for convenience
      await api.updateProfile(details);

      const res = await api.requestWithdrawal({
        amount: numAmount,
        payout_method: payoutMethod,
        payout_details: details,
      });

      if (res.success) {
        setWithdrawMsg({ type: 'success', text: res.message });
        setAmount('');
        await loadWallet();
        await refreshUser();
      }
    } catch (err) {
      setWithdrawMsg({ type: 'error', text: err.message || 'Withdrawal failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  const balances = walletData?.balances;

  return (
    <div style={{ paddingBottom: '80px' }}>
      {/* Hero */}
      <section className="section-wrapper" style={{ paddingTop: '60px', paddingBottom: '30px' }}>
        <div className="container">
          <div style={{ maxWidth: '780px' }}>
            <span className="badge-clean" style={{ marginBottom: '10px' }}>
              <WalletIcon size={14} />
              <span>Cashback Wallet &amp; Ledger</span>
            </span>
            <h1 className="hero-title" style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', marginBottom: '12px' }}>
              Wallet &amp; Payouts
            </h1>
            <p className="section-subtitle">
              Manage your verified cashback earnings, request automated payouts via UPI or Bank IMPS, and review full ledger audit records.
            </p>
          </div>
        </div>
      </section>

      {/* Balances Strip */}
      <section className="section-wrapper-sm" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="grid-3" style={{ gap: '20px', marginBottom: '36px' }}>
            <div className="glass-card" style={{ border: '1px solid var(--border-emerald)', background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.08), rgba(13, 20, 36, 0.8))' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                AVAILABLE WITHDRAWABLE
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: '800', color: 'var(--emerald-primary)' }}>
                ₹{balances?.withdrawable_balance?.toFixed(2) || '0.00'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--emerald-light)', marginTop: '4px' }}>
                Min. payout: ₹100 &bull; No hidden fees
              </div>
            </div>

            <div className="glass-card">
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                PENDING APPROVAL
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: '800', color: 'var(--gold-accent)' }}>
                ₹{balances?.pending_cashback?.toFixed(2) || '0.00'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Under advertiser settlement review
              </div>
            </div>

            <div className="glass-card">
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                LIFETIME CONFIRMED
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#FFFFFF' }}>
                ₹{balances?.approved_balance?.toFixed(2) || '0.00'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Verified advertiser disbursements
              </div>
            </div>
          </div>

          <div className="grid-2" style={{ gap: '36px', alignItems: 'flex-start' }}>
            {/* Withdrawal Request Box */}
            <div className="glass-card" style={{ padding: '32px' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '6px' }}>Request Cashback Payout</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '24px' }}>
                Funds are disbursed directly to your verified Indian bank account or VPA address.
              </p>

              {withdrawMsg.text && (
                <div
                  style={{
                    background: withdrawMsg.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${withdrawMsg.type === 'success' ? 'var(--border-emerald)' : 'rgba(239, 68, 68, 0.3)'}`,
                    borderRadius: '8px',
                    padding: '14px',
                    marginBottom: '20px',
                    color: withdrawMsg.type === 'success' ? 'var(--emerald-light)' : '#FCA5A5',
                    fontSize: '0.875rem',
                  }}
                >
                  {withdrawMsg.text}
                </div>
              )}

              <form onSubmit={handleWithdraw}>
                <div className="form-group">
                  <label>Amount to Withdraw (₹) *</label>
                  <input
                    type="number"
                    min="100"
                    step="1"
                    placeholder="e.g. 500"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <div className="form-hint">
                    Maximum available: ₹{balances?.withdrawable_balance?.toFixed(2) || '0.00'}
                  </div>
                </div>

                <div className="form-group">
                  <label>Payout Channel *</label>
                  <div className="tab-group" style={{ width: '100%', display: 'flex' }}>
                    <button
                      type="button"
                      className={`tab-btn ${payoutMethod === 'upi' ? 'active' : ''}`}
                      onClick={() => setPayoutMethod('upi')}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <Smartphone size={14} />
                      <span>Instant UPI</span>
                    </button>
                    <button
                      type="button"
                      className={`tab-btn ${payoutMethod === 'bank' ? 'active' : ''}`}
                      onClick={() => setPayoutMethod('bank')}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <Building size={14} />
                      <span>Bank Account IMPS</span>
                    </button>
                  </div>
                </div>

                {payoutMethod === 'upi' ? (
                  <div className="form-group">
                    <label>UPI VPA Address *</label>
                    <input
                      type="text"
                      placeholder="e.g. yourname@oksbi"
                      required
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                    />
                  </div>
                ) : (
                  <>
                    <div className="form-group">
                      <label>Bank Account Number *</label>
                      <input
                        type="text"
                        placeholder="e.g. 918239018239"
                        required
                        value={bankAcc}
                        onChange={(e) => setBankAcc(e.target.value)}
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Bank IFSC Code *</label>
                        <input
                          type="text"
                          placeholder="e.g. HDFC0001234"
                          required
                          style={{ textTransform: 'uppercase' }}
                          value={bankIfsc}
                          onChange={(e) => setBankIfsc(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Account Holder Name *</label>
                        <input
                          type="text"
                          placeholder="e.g. Rahul Verma"
                          required
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={submitting || (balances?.withdrawable_balance || 0) < 100}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '13px', marginTop: '6px' }}
                >
                  {submitting ? 'Submitting Payout...' : 'Submit Withdrawal Request'}
                </button>
              </form>
            </div>

            {/* Payout History & Ledger */}
            <div>
              {/* Withdrawal Requests Status */}
              <div className="glass-card" style={{ padding: '28px', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.15rem', marginBottom: '16px' }}>Withdrawal Payout Requests</h3>
                {walletData?.withdrawals?.length === 0 ? (
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>No withdrawal requests submitted yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {walletData?.withdrawals?.map((w, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 16px',
                          background: 'rgba(255, 255, 255, 0.02)',
                          borderRadius: '8px',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: '700', color: '#FFFFFF' }}>₹{w.amount} via {w.payout_method?.toUpperCase()}</div>
                          <div className="mono-text" style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                            {new Date(w.requested_at).toLocaleDateString()} {w.reference_id && `&bull; UTR: ${w.reference_id}`}
                          </div>
                        </div>

                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background:
                              w.status === 'completed'
                                ? 'var(--emerald-subtle)'
                                : w.status === 'rejected'
                                ? 'rgba(239, 68, 68, 0.1)'
                                : 'rgba(245, 158, 11, 0.1)',
                            color:
                              w.status === 'completed'
                                ? 'var(--emerald-primary)'
                                : w.status === 'rejected'
                                ? '#F87171'
                                : 'var(--gold-accent)',
                          }}
                        >
                          {w.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Full Ledger Audit */}
              <div className="glass-card" style={{ padding: '28px' }}>
                <h3 style={{ fontSize: '1.15rem', marginBottom: '16px' }}>Double-Entry Cashback Ledger</h3>
                {walletData?.ledger?.length === 0 ? (
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Zero ledger entries recorded yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '320px', overflowY: 'auto' }}>
                    {walletData?.ledger?.map((l, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 14px',
                          background: 'rgba(255, 255, 255, 0.02)',
                          borderRadius: '6px',
                          border: '1px solid var(--border-subtle)',
                          fontSize: '0.8125rem',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: '600', color: '#FFFFFF' }}>{l.description}</div>
                          <div className="mono-text" style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                            {new Date(l.created_at).toLocaleString()}
                          </div>
                        </div>

                        <div
                          style={{
                            fontWeight: '700',
                            color: l.type.includes('credit') ? 'var(--emerald-primary)' : '#FCA5A5',
                          }}
                        >
                          {l.type.includes('credit') ? `+₹${l.amount}` : `-₹${l.amount}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
