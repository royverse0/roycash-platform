import React, { useState } from 'react';
import { X, CheckCircle2, ArrowRight, Shield } from 'lucide-react';

export default function ApplicationModal({ isOpen, onClose, initialType = 'publisher' }) {
  const [formType, setFormType] = useState(initialType);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    trafficType: 'content',
    campaignModel: 'cpa',
    website: '',
    monthlyVolume: '10k_50k',
    integrationPreference: 's2s',
    notes: '',
  });

  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Full name or company name is required';
    if (!formData.email.trim() || !/^\S+@\S+\.\S+$/.test(formData.email)) {
      errs.email = 'Valid corporate or work email is required';
    }
    if (!formData.website.trim()) {
      errs.website = formType === 'publisher' ? 'Traffic channel or website URL is required' : 'Company or product URL is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    // Simulate instantaneous client-side handling
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 400);
  };

  const resetForm = () => {
    setSubmitted(false);
    setFormData({
      name: '',
      email: '',
      company: '',
      trafficType: 'content',
      campaignModel: 'cpa',
      website: '',
      monthlyVolume: '10k_50k',
      integrationPreference: 's2s',
      notes: '',
    });
    setErrors({});
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button 
          type="button" 
          className="modal-close" 
          onClick={onClose}
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '24px 8px' }}>
            <div style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '50%', 
              background: 'var(--emerald-subtle)', 
              color: 'var(--emerald-primary)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 20px auto',
              border: '1px solid var(--border-emerald)'
            }}>
              <CheckCircle2 size={32} />
            </div>

            <h3 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>
              Application Successfully Received
            </h3>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: '1.6', marginBottom: '24px', maxWidth: '440px', margin: '0 auto 24px auto' }}>
              Thank you, <strong style={{ color: '#FFFFFF' }}>{formData.name}</strong>. Your onboarding inquiry for the 
              <span style={{ color: 'var(--emerald-primary)', fontWeight: '600' }}> {formType === 'publisher' ? 'Publisher Network' : 'Advertiser Partnership'}</span> has been recorded.
            </p>

            <div style={{ background: 'var(--bg-surface-elevated)', borderRadius: '10px', padding: '16px', textAlign: 'left', marginBottom: '28px', border: '1px solid var(--border-subtle)' }}>
              <div className="meta-row" style={{ marginBottom: '8px' }}>
                <span>Application Reference</span>
                <span className="meta-separator">&middot;</span>
                <span className="mono-text" style={{ color: 'var(--emerald-primary)' }}>RC-{Math.floor(100000 + Math.random() * 900000)}</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Our compliance team will review your traffic channels and contact <strong style={{ color: '#FFFFFF' }}>{formData.email}</strong> within 1 business day with onboarding documentation and tracking credentials.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  resetForm();
                  onClose();
                }}
              >
                Close Window
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Header Switcher */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span className="badge-clean">Partner Registration</span>
              </div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>
                Join RoyCash Performance Network
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Direct integrations, zero-fraud tracking, and verified performance terms.
              </p>

              {/* Segmented type selector */}
              <div className="tab-group" style={{ marginTop: '16px', width: '100%', display: 'flex' }}>
                <button
                  type="button"
                  className={`tab-btn ${formType === 'publisher' ? 'active' : ''}`}
                  onClick={() => setFormType('publisher')}
                  style={{ flex: 1 }}
                >
                  Apply as Publisher / Affiliate
                </button>
                <button
                  type="button"
                  className={`tab-btn ${formType === 'advertiser' ? 'active' : ''}`}
                  onClick={() => setFormType('advertiser')}
                  style={{ flex: 1 }}
                >
                  Onboard as Advertiser / Brand
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">
                    {formType === 'publisher' ? 'Full Name / Company Name *' : 'Company Name & Contact *'}
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    placeholder={formType === 'publisher' ? 'e.g. Alex Morgan / Growth Media' : 'e.g. Fintech Labs Inc (John Doe)'}
                    value={formData.name}
                    onChange={handleChange}
                  />
                  {errors.name && <div style={{ color: '#F87171', fontSize: '0.75rem', marginTop: '4px' }}>{errors.name}</div>}
                </div>

                <div className="form-group">
                  <label htmlFor="email">Work / Business Email *</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="partner@yourdomain.com"
                    value={formData.email}
                    onChange={handleChange}
                  />
                  {errors.email && <div style={{ color: '#F87171', fontSize: '0.75rem', marginTop: '4px' }}>{errors.email}</div>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="website">
                    {formType === 'publisher' ? 'Primary Traffic Source / Channel URL *' : 'Website or Mobile App URL *'}
                  </label>
                  <input
                    id="website"
                    name="website"
                    type="text"
                    placeholder="https://yourchannel-or-app.com"
                    value={formData.website}
                    onChange={handleChange}
                  />
                  {errors.website && <div style={{ color: '#F87171', fontSize: '0.75rem', marginTop: '4px' }}>{errors.website}</div>}
                </div>

                {formType === 'publisher' ? (
                  <div className="form-group">
                    <label htmlFor="trafficType">Primary Promotion Method</label>
                    <select
                      id="trafficType"
                      name="trafficType"
                      value={formData.trafficType}
                      onChange={handleChange}
                    >
                      <option value="content">Content &amp; Editorial SEO</option>
                      <option value="paid_search">Paid Search / Native Ads</option>
                      <option value="social_influencer">Social &amp; Creator Channels</option>
                      <option value="cashback_loyalty">Cashback, Coupons &amp; Loyalty</option>
                      <option value="mobile_app">Mobile App &amp; In-App Traffic</option>
                      <option value="email_newsletter">Opt-in Email &amp; Newsletters</option>
                    </select>
                  </div>
                ) : (
                  <div className="form-group">
                    <label htmlFor="campaignModel">Preferred Performance Model</label>
                    <select
                      id="campaignModel"
                      name="campaignModel"
                      value={formData.campaignModel}
                      onChange={handleChange}
                    >
                      <option value="cpa">CPA (Cost Per Action / Deposit)</option>
                      <option value="cpl">CPL (Cost Per Verified Lead)</option>
                      <option value="cps">CPS (Cost Per Sale / Purchase)</option>
                      <option value="cpi">CPI (Cost Per Valid Install)</option>
                      <option value="revshare">Revenue Share (Recurring)</option>
                      <option value="hybrid">Hybrid (CPA + RevShare)</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="monthlyVolume">
                    {formType === 'publisher' ? 'Estimated Monthly Clicks / Conversions' : 'Estimated Monthly Performance Budget'}
                  </label>
                  <select
                    id="monthlyVolume"
                    name="monthlyVolume"
                    value={formData.monthlyVolume}
                    onChange={handleChange}
                  >
                    {formType === 'publisher' ? (
                      <>
                        <option value="under_10k">Under 10,000 monthly clicks</option>
                        <option value="10k_50k">10,000 &ndash; 50,000 monthly clicks</option>
                        <option value="50k_250k">50,000 &ndash; 250,000 monthly clicks</option>
                        <option value="over_250k">250,000+ monthly clicks</option>
                      </>
                    ) : (
                      <>
                        <option value="test_budget">$2,500 &ndash; $5,000 / month (Pilot)</option>
                        <option value="growth_budget">$5,000 &ndash; $25,000 / month</option>
                        <option value="scale_budget">$25,000 &ndash; $100,000 / month</option>
                        <option value="enterprise_budget">$100,000+ / month (Enterprise)</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="integrationPreference">Tracking &amp; Postback Protocol</label>
                  <select
                    id="integrationPreference"
                    name="integrationPreference"
                    value={formData.integrationPreference}
                    onChange={handleChange}
                  >
                    <option value="s2s">Server-to-Server (S2S) HTTP Postback</option>
                    <option value="webhook">Real-Time Webhook Endpoint</option>
                    <option value="rest_api">Direct REST API Integration</option>
                    <option value="mmp">MMP Integration (AppsFlyer, Adjust, Branch)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="notes">Brief Notes or Geographic Focus</label>
                <textarea
                  id="notes"
                  name="notes"
                  rows="3"
                  placeholder={formType === 'publisher' ? 'Tell us about your audience demographics, top GEOs, or primary niches...' : 'Specify target geos, compliance requirements, or specific KPIs...'}
                  value={formData.notes}
                  onChange={handleChange}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', fontSize: '0.8125rem', color: 'var(--text-dim)' }}>
                <Shield size={14} style={{ color: 'var(--emerald-primary)', flexShrink: 0 }} />
                <span>Zero-spam policy. Your application is reviewed by our compliance team.</span>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: '100%', padding: '14px' }}
              >
                {loading ? 'Processing Application...' : formType === 'publisher' ? 'Submit Publisher Application' : 'Request Advertiser Onboarding'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
