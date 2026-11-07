import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  RefreshCw, 
  HelpCircle, 
  ExternalLink,
  ChevronRight,
  Info,
  Check,
  Zap,
  Lock,
  Play
} from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function LiveTracking({ clickId, navigate }) {
  const { user } = useAuth();
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Ticket modal state
  const [ticketModal, setTicketModal] = useState(false);
  const [ticketCategory, setTicketCategory] = useState('install_unconfirmed');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(false);

  // Simulation test state
  const [simulating, setSimulating] = useState(false);
  const [simMessage, setSimMessage] = useState('');

  useEffect(() => {
    if (clickId) {
      loadTracking();
    }
  }, [clickId]);

  const loadTracking = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.getTracking(clickId);
      if (res.success && res.tracking) {
        setTrackingData(res.tracking);
      } else {
        setError(res.error || 'Unable to retrieve tracking record.');
      }
    } catch (err) {
      setError(err.message || 'Tracking lookup failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await loadTracking();
    setRefreshing(false);
  };

  const handleTicketSubmit = async (e) => {
    e.preventDefault();
    if (!ticketSubject || !ticketDesc) return;
    setTicketSubmitting(true);

    try {
      await api.submitTicket({
        click_id: clickId,
        campaign_id: trackingData?.campaign_id,
        category: ticketCategory,
        subject: ticketSubject,
        description: ticketDesc,
      });
      setTicketSuccess(true);
    } catch (err) {
      alert('Failed to submit ticket: ' + err.message);
    } finally {
      setTicketSubmitting(false);
    }
  };

  // Sandbox simulation helper
  const handleSimulateStep = async (stepType) => {
    try {
      setSimulating(true);
      setSimMessage('');
      const res = await api.simulatePostback({
        click_id: clickId,
        event_type: stepType,
      });
      if (res.success) {
        setSimMessage(res.message);
        await loadTracking();
      }
    } catch (err) {
      setSimMessage('Simulation error: ' + err.message);
    } finally {
      setSimulating(false);
    }
  };

  if (loading && !trackingData) {
    return (
      <div className="section-wrapper" style={{ textAlign: 'center', padding: '100px 0' }}>
        <div style={{ color: 'var(--text-muted)' }}>Retrieving live postback tracking state...</div>
      </div>
    );
  }

  if (error || !trackingData) {
    return (
      <div className="section-wrapper">
        <div className="container" style={{ maxWidth: '600px', textAlign: 'center' }}>
          <AlertTriangle size={36} style={{ color: '#F87171', margin: '0 auto 16px auto' }} />
          <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Tracking Lookup Error</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>{error || 'Invalid click identifier.'}</p>
          <button type="button" onClick={() => navigate('offers')} className="btn btn-secondary">
            <ArrowLeft size={16} />
            <span>Return to Offer Wall</span>
          </button>
        </div>
      </div>
    );
  }

  const { timeline, events, conversion_status } = trackingData;

  // Determine guidance message: only show after genuine confirmed steps
  const installDone = events.some((e) => e.step_type === 'install' && e.status === 'confirmed');
  const signupDone = events.some((e) => e.step_type === 'signup' && e.status === 'confirmed');
  const kycDone = events.some((e) => e.step_type === 'kyc' && e.status === 'confirmed');
  const depositDone = events.some((e) => e.step_type === 'deposit' && e.status === 'confirmed');

  let activeGuidance = 'Click has been registered. Please launch the advertiser link to begin installation or registration.';
  if (conversion_status === 'approved') {
    activeGuidance = 'Congratulations! All conversion requirements verified by advertiser. Your cashback has been released to your withdrawable wallet balance!';
  } else if (conversion_status === 'rejected') {
    activeGuidance = `Advertiser reported non-qualification: ${trackingData.rejection_reason || 'Reversed by merchant validation rule'}.`;
  } else if (conversion_status === 'pending_approval') {
    activeGuidance = 'All conversion steps are completed! Your offer is currently in the advertiser reconciliation window for final approval.';
  } else if (depositDone) {
    activeGuidance = 'First deposit confirmed by advertiser! Awaiting merchant settlement reconciliation.';
  } else if (kycDone) {
    activeGuidance = 'KYC successfully validated by advertiser! Proceed to make the qualifying transaction or deposit if required.';
  } else if (signupDone) {
    activeGuidance = 'Your registration has been confirmed by the advertiser! Proceed with the remaining required steps.';
  } else if (installDone) {
    activeGuidance = 'Your app installation has been confirmed. Now open the advertiser app and complete signup.';
  }

  return (
    <div style={{ paddingBottom: '80px' }}>
      {/* Top Banner Navigation */}
      <section className="section-wrapper-sm" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'rgba(7, 11, 20, 0.6)' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <button
              type="button"
              onClick={() => navigate('offers')}
              className="btn btn-secondary btn-sm"
            >
              <ArrowLeft size={14} />
              <span>Back to Offers</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="meta-row">
                <span>Click ID:</span>
                <span className="mono-text" style={{ color: 'var(--emerald-primary)' }}>{clickId}</span>
              </div>
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="btn btn-secondary btn-sm"
                title="Refresh tracking status"
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                <span>{refreshing ? 'Checking...' : 'Refresh'}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Tracking Overview */}
      <section className="section-wrapper-sm">
        <div className="container" style={{ maxWidth: '860px' }}>
          {/* Offer Header Card */}
          <div className="glass-card" style={{ padding: '32px', marginBottom: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {trackingData.advertiser_name} &bull; {trackingData.category}
                </div>
                <h1 style={{ fontSize: '1.75rem', marginTop: '4px', color: '#FFFFFF' }}>{trackingData.campaign_name}</h1>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--emerald-primary)' }}>
                  ₹{trackingData.reward_amount}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  POTENTIAL CASHBACK
                </div>
              </div>
            </div>

            {/* Current Status Callout */}
            <div
              style={{
                background: conversion_status === 'approved' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(19, 30, 53, 0.8)',
                border: `1px solid ${conversion_status === 'approved' ? 'var(--border-emerald)' : 'var(--border-subtle)'}`,
                borderRadius: '10px',
                padding: '18px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: conversion_status === 'approved' ? 'var(--emerald-primary)' : 'var(--emerald-subtle)',
                  color: conversion_status === 'approved' ? '#04140D' : 'var(--emerald-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {conversion_status === 'approved' ? <Check size={20} /> : <Zap size={18} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  CURRENT TRACKING STATUS
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#FFFFFF', marginTop: '2px' }}>
                  {activeGuidance}
                </div>
              </div>
            </div>
          </div>

          {/* STEP-BY-STEP PROGRESS TIMELINE */}
          <div className="glass-card" style={{ padding: '32px', marginBottom: '28px' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '6px' }}>Conversion Action Timeline</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '28px' }}>
              Each step is unlocked and marked completed exclusively upon receiving authenticated advertiser postback confirmation.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {timeline.map((step, idx) => {
                const isCompleted = step.state === 'completed';
                const isActionRequired = step.state === 'action_required';
                const isRejected = step.state === 'rejected';

                let badgeColor = 'var(--text-dim)';
                let badgeBg = 'rgba(255, 255, 255, 0.05)';
                let borderColor = 'var(--border-subtle)';

                if (isCompleted) {
                  badgeColor = 'var(--emerald-primary)';
                  badgeBg = 'var(--emerald-subtle)';
                  borderColor = 'var(--border-emerald)';
                } else if (isActionRequired) {
                  badgeColor = 'var(--gold-accent)';
                  badgeBg = 'rgba(245, 158, 11, 0.1)';
                  borderColor = 'var(--border-gold)';
                } else if (isRejected) {
                  badgeColor = '#F87171';
                  badgeBg = 'rgba(239, 68, 68, 0.1)';
                  borderColor = 'rgba(239, 68, 68, 0.3)';
                }

                return (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      border: `1px solid ${borderColor}`,
                      borderRadius: '12px',
                      padding: '20px 24px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '18px',
                      position: 'relative',
                    }}
                  >
                    {/* Status Circle */}
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: badgeBg,
                        color: badgeColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '0.85rem',
                        flexShrink: 0,
                        border: `1px solid ${borderColor}`,
                      }}
                    >
                      {isCompleted ? <Check size={16} /> : idx + 1}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
                        <h3 style={{ fontSize: '1.05rem', color: '#FFFFFF' }}>{step.title}</h3>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            padding: '3px 10px',
                            borderRadius: '6px',
                            background: badgeBg,
                            color: badgeColor,
                            border: `1px solid ${borderColor}`,
                          }}
                        >
                          {step.status}
                        </span>
                      </div>

                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: '1.6', margin: 0 }}>
                        {step.instruction}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SANDBOX TESTER / SIMULATION CONSOLE (Only in Demo/Sandbox Mode) */}
          {trackingData.is_demo && (
            <div className="glass-card" style={{ padding: '24px', marginBottom: '28px', border: '1px solid var(--border-gold)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--gold-accent)' }}>
                <Play size={16} />
                <h3 style={{ fontSize: '1.05rem', color: '#FFFFFF' }}>Sandbox Postback Simulation Controls</h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Because this offer is running in <strong>Sandbox Mode (awaiting live Mitgo credentials)</strong>, you can trigger simulated provider webhooks to verify the live timeline transitions and duplicate protection:
              </p>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleSimulateStep('install')}
                  disabled={simulating}
                >
                  Confirm App Install
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleSimulateStep('signup')}
                  disabled={simulating}
                >
                  Confirm Registration
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleSimulateStep('kyc')}
                  disabled={simulating}
                >
                  Confirm KYC
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleSimulateStep('deposit')}
                  disabled={simulating}
                >
                  Confirm Deposit
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => handleSimulateStep('approval')}
                  disabled={simulating}
                >
                  Approve Cashback (₹{trackingData.reward_amount})
                </button>
              </div>

              {simMessage && (
                <div style={{ fontSize: '0.8rem', color: 'var(--emerald-light)', background: 'var(--emerald-subtle)', padding: '8px 12px', borderRadius: '6px' }}>
                  {simMessage}
                </div>
              )}
            </div>
          )}

          {/* VERIFIED EVENTS AUDIT LOG */}
          <div className="glass-card" style={{ padding: '28px', marginBottom: '28px' }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '14px' }}>Verified Provider Event Logs</h3>
            {events.length === 0 ? (
              <div style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>No incoming events received yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {events.map((evt, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'rgba(255, 255, 255, 0.02)',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.85rem',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', color: '#FFFFFF' }}>{evt.event_name}</div>
                      <div className="mono-text" style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        Step: {evt.step_type} &bull; TxID: {evt.transaction_id || 'N/A'}
                      </div>
                    </div>
                    <div className="mono-text" style={{ fontSize: '0.75rem', color: 'var(--emerald-primary)' }}>
                      {new Date(evt.verified_at).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Report Problem & Actions Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <button
              type="button"
              onClick={() => setTicketModal(true)}
              className="btn btn-secondary btn-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              <HelpCircle size={15} />
              <span>Report Tracking Problem</span>
            </button>

            <a
              href={`/api/offers/redirect/${clickId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline-emerald btn-sm"
            >
              <span>Re-open Advertiser Offer Link</span>
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </section>

      {/* REPORT TRACKING PROBLEM MODAL */}
      {ticketModal && (
        <div className="modal-overlay" onClick={() => setTicketModal(false)} role="dialog" aria-modal="true">
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <button type="button" className="modal-close" onClick={() => setTicketModal(false)}>
              &times;
            </button>

            {ticketSuccess ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <CheckCircle2 size={40} style={{ color: 'var(--emerald-primary)', margin: '0 auto 16px auto' }} />
                <h3 style={{ fontSize: '1.35rem', marginBottom: '8px' }}>Tracking Ticket Submitted</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
                  Our compliance team has logged your report against Click ID <code className="mono-text">{clickId}</code>. We will cross-reference server postback records and respond within 24 hours.
                </p>
                <button type="button" onClick={() => setTicketModal(false)} className="btn btn-secondary btn-sm">
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleTicketSubmit}>
                <h2 style={{ fontSize: '1.3rem', marginBottom: '6px' }}>Report Tracking Issue</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
                  Did an install, signup, or deposit fail to update automatically? Submit a manual audit ticket.
                </p>

                <div className="form-group">
                  <label>Associated Offer</label>
                  <input type="text" readOnly value={trackingData.campaign_name} disabled style={{ opacity: 0.7 }} />
                </div>

                <div className="form-group">
                  <label>Problem Category *</label>
                  <select value={ticketCategory} onChange={(e) => setTicketCategory(e.target.value)}>
                    <option value="install_unconfirmed">App Installed but still showing 'Verifying Install'</option>
                    <option value="signup_issue">Signup completed in advertiser app but not unlocked</option>
                    <option value="kyc_not_showing">KYC completed but not detected</option>
                    <option value="deposit_unconfirmed">First deposit done but not verified</option>
                    <option value="cashback_delayed">Cashback delayed past approval window</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Subject *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Completed registration with registered phone"
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Detailed Description *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Provide details such as registered date/time or merchant order ID to help us locate your postback..."
                    value={ticketDesc}
                    onChange={(e) => setTicketDesc(e.target.value)}
                  />
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '18px' }}>
                  Note: Users cannot manually validate their own events. All resolutions require verified postback reconciliation from the merchant.
                </div>

                <button type="submit" disabled={ticketSubmitting} className="btn btn-primary" style={{ width: '100%' }}>
                  {ticketSubmitting ? 'Submitting Ticket...' : 'Submit Support Ticket'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
