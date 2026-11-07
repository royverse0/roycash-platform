import React, { useState } from 'react';
import { Terminal, Check, Copy, RefreshCw, ShieldAlert, Cpu } from 'lucide-react';

export default function PostbackSimulator() {
  const [eventType, setEventType] = useState('cps');
  const [clickId, setClickId] = useState('rc_98f7e2a4c10d');
  const [subId, setSubId] = useState('aff_seo_top10');
  const [txId, setTxId] = useState('ORD-2026-88192');
  const [payout, setPayout] = useState('35.00');
  const [copied, setCopied] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);
  const [simulating, setSimulating] = useState(false);

  const eventConfigs = {
    cpa: { label: 'CPA (Action / Deposit)', defaultPayout: '50.00' },
    cpl: { label: 'CPL (Lead Form)', defaultPayout: '12.50' },
    cps: { label: 'CPS (E-Commerce Sale)', defaultPayout: '28.00' },
    cpi: { label: 'CPI (App Install)', defaultPayout: '4.20' },
    revshare: { label: 'RevShare (Subscription)', defaultPayout: '18.75' },
  };

  const handleEventChange = (type) => {
    setEventType(type);
    setPayout(eventConfigs[type].defaultPayout);
    setSimulationResult(null);
  };

  const postbackUrl = `https://track.roycash.net/postback?click_id=${clickId}&subid1=${subId}&tx_id=${txId}&amount=${payout}&currency=USD&event=${eventType}&token=sec_f89a2b7e19`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(postbackUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const runSimulation = () => {
    setSimulating(true);
    setSimulationResult(null);

    setTimeout(() => {
      setSimulating(false);
      setSimulationResult({
        status: 'SUCCESS_200',
        timestamp: new Date().toISOString(),
        validationLog: [
          `[AUTH] Security token signature verified (HMAC-SHA256).`,
          `[CLICK] Resolved click_id "${clickId}" (Attributed to subid1: "${subId}", latency: 42s).`,
          `[DEDUPE] Unique tx_id "${txId}" checked against 90-day ledger. (Zero collisions found).`,
          `[FRAUD] IP velocity and geo consistency check passed.`,
          `[LEDGER] Stored in reconciliation ledger. Status: PENDING_ADVERTISER_SETTLEMENT.`,
        ],
      });
    }, 450);
  };

  return (
    <div className="glass-card" style={{ padding: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div className="badge-clean" style={{ marginBottom: '6px' }}>
            <Cpu size={14} />
            <span>Interactive Protocol Sandbox</span>
          </div>
          <h3 style={{ fontSize: '1.25rem' }}>Server-to-Server (S2S) Postback Simulator</h3>
        </div>

        {/* Event selector */}
        <div className="tab-group">
          {Object.entries(eventConfigs).map(([key, config]) => (
            <button
              key={key}
              type="button"
              className={`tab-btn ${eventType === key ? 'active' : ''}`}
              onClick={() => handleEventChange(key)}
            >
              {key.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem', marginBottom: '24px' }}>
        Simulate how advertiser servers fire automated HTTP callbacks to the RoyCash gateway upon a verified user event. No client-side cookies or browser vulnerabilities required.
      </p>

      {/* Inputs for test values */}
      <div className="form-row" style={{ marginBottom: '20px' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '0.8125rem' }}>Originating Click ID (click_id)</label>
          <input
            type="text"
            className="mono-text"
            value={clickId}
            onChange={(e) => setClickId(e.target.value)}
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '0.8125rem' }}>Publisher Sub-ID (subid1)</label>
          <input
            type="text"
            className="mono-text"
            value={subId}
            onChange={(e) => setSubId(e.target.value)}
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '0.8125rem' }}>Merchant Order ID (tx_id)</label>
          <input
            type="text"
            className="mono-text"
            value={txId}
            onChange={(e) => setTxId(e.target.value)}
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '0.8125rem' }}>Validated Payout (USD)</label>
          <input
            type="text"
            className="mono-text"
            value={payout}
            onChange={(e) => setPayout(e.target.value)}
          />
        </div>
      </div>

      {/* Terminal View */}
      <div className="code-terminal" style={{ marginBottom: '20px' }}>
        <div className="terminal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="terminal-dots">
              <span className="terminal-dot" />
              <span className="terminal-dot" />
              <span className="terminal-dot" />
            </div>
            <span>OUTGOING S2S HTTP GET REQUEST</span>
          </div>
          <button
            type="button"
            onClick={copyToClipboard}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontSize: '0.75rem' }}
          >
            {copied ? <Check size={12} style={{ color: 'var(--emerald-primary)' }} /> : <Copy size={12} />}
            <span>{copied ? 'Copied' : 'Copy Postback'}</span>
          </button>
        </div>

        <div className="terminal-body" style={{ wordBreak: 'break-all', fontSize: '0.8125rem' }}>
          <span style={{ color: 'var(--gold-accent)' }}>GET</span>{' '}
          <span style={{ color: '#93C5FD' }}>{postbackUrl}</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-dim)' }}>
          Standard parameters: <code className="mono-text">click_id</code>, <code className="mono-text">tx_id</code>, <code className="mono-text">amount</code>, <code className="mono-text">token</code>
        </div>
        <button
          type="button"
          onClick={runSimulation}
          disabled={simulating}
          className="btn btn-primary btn-sm"
        >
          <RefreshCw size={14} className={simulating ? 'animate-spin' : ''} />
          <span>{simulating ? 'Validating Pipeline...' : 'Test Postback Ingestion'}</span>
        </button>
      </div>

      {/* Simulation Result Output */}
      {simulationResult && (
        <div style={{ marginTop: '20px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid var(--border-emerald)', borderRadius: '10px', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--emerald-primary)', fontWeight: '600', fontSize: '0.875rem' }}>
              <Check size={16} />
              <span>HTTP 200 OK — Conversion Logged in Ingestion Buffer</span>
            </div>
            <span className="mono-text" style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              {simulationResult.timestamp}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {simulationResult.validationLog.map((log, idx) => (
              <div key={idx} className="mono-text" style={{ fontSize: '0.775rem', color: '#E2E8F0', paddingLeft: '8px', borderLeft: '2px solid var(--emerald-primary)' }}>
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
