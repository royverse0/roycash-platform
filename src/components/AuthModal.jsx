import React, { useState } from 'react';
import { X, Lock, Mail, User, Phone, ArrowRight, Shield, KeyRound, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    referral_code: '',
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(formData.email, formData.password);
      } else {
        await register(formData);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  // Quick fill demo credentials for effortless testing
  const quickFill = (type) => {
    if (type === 'admin') {
      setMode('login');
      setFormData((prev) => ({
        ...prev,
        email: 'admin@roycash.net',
        password: 'Admin@RoyCash2026!',
      }));
    } else {
      setMode('login');
      setFormData((prev) => ({
        ...prev,
        email: 'demo@roycash.net',
        password: 'User@RoyCash2026!',
      }));
    }
    setError('');
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div className="brand-logo" style={{ justifyContent: 'center', marginBottom: '12px' }}>
            <span className="brand-icon">R</span>
            <span>RoyCash</span>
          </div>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '6px' }}>
            {mode === 'login' ? 'Welcome Back to RoyCash' : 'Create Your Cashback Account'}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            {mode === 'login'
              ? 'Access your offers, track live postbacks and withdraw cashback.'
              : 'Earn verified cashback on apps, subscriptions, and financial services.'}
          </p>

          {/* Segmented Switcher */}
          <div className="tab-group" style={{ marginTop: '16px', width: '100%', display: 'flex' }}>
            <button
              type="button"
              className={`tab-btn ${mode === 'login' ? 'active' : ''}`}
              onClick={() => {
                setMode('login');
                setError('');
              }}
              style={{ flex: 1 }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`tab-btn ${mode === 'register' ? 'active' : ''}`}
              onClick={() => {
                setMode('register');
                setError('');
              }}
              style={{ flex: 1 }}
            >
              Register
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '12px 14px', marginBottom: '18px', color: '#FCA5A5', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="auth-name">Full Name *</label>
              <input
                id="auth-name"
                name="name"
                type="text"
                required
                placeholder="e.g. Rahul Verma"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-email">Email Address *</label>
            <input
              id="auth-email"
              name="email"
              type="email"
              required
              placeholder="name@example.com"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="auth-phone">Mobile Number (Optional)</label>
              <input
                id="auth-phone"
                name="phone"
                type="tel"
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-password">Password (min 8 characters) *</label>
            <input
              id="auth-password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="auth-referral">Referral Code (Optional)</label>
              <input
                id="auth-referral"
                name="referral_code"
                type="text"
                placeholder="e.g. ROYARUN"
                value={formData.referral_code}
                onChange={handleChange}
                style={{ textTransform: 'uppercase' }}
              />
              <div className="form-hint">Got a referral from a friend? Enter their code to link accounts.</div>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '13px', marginTop: '8px' }}
          >
            {loading ? 'Authenticating...' : mode === 'login' ? 'Sign In to Dashboard' : 'Create My Account'}
          </button>
        </form>

        {/* Quick Testing Bar */}
        <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
            Quick Demo Credentials
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => quickFill('demo')}
              style={{ fontSize: '0.75rem', padding: '6px 12px' }}
            >
              Demo User
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => quickFill('admin')}
              style={{ fontSize: '0.75rem', padding: '6px 12px', color: 'var(--gold-accent)' }}
            >
              Superadmin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
