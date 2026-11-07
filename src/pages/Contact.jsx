import React, { useState } from 'react';
import { Mail, Clock, ShieldCheck, CheckCircle2, MessageSquare, Send, Globe } from 'lucide-react';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    inquiryType: 'partnerships',
    subject: '',
    message: ''
  });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Please provide your full name';
    if (!formData.email.trim() || !/^\S+@\S+\.\S+$/.test(formData.email)) {
      errs.email = 'Please provide a valid email address';
    }
    if (!formData.subject.trim()) errs.subject = 'Subject is required';
    if (!formData.message.trim() || formData.message.length < 15) {
      errs.message = 'Please provide a detailed message (minimum 15 characters)';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 450);
  };

  return (
    <div>
      {/* Hero */}
      <section className="section-wrapper" style={{ paddingTop: '80px', paddingBottom: '60px' }}>
        <div className="container">
          <div style={{ maxWidth: '780px' }}>
            <span className="badge-clean" style={{ marginBottom: '12px' }}>
              <Mail size={14} />
              <span>Direct Communication</span>
            </span>
            <h1 className="hero-title" style={{ marginBottom: '20px' }}>
              Contact the RoyCash Team
            </h1>
            <p className="section-subtitle">
              Have questions regarding our tracking architecture, publisher eligibility, or advertiser onboarding? Our specialists are here to assist.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="section-wrapper" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="grid-2" style={{ gap: '48px', alignItems: 'flex-start' }}>
            {/* Contact Form */}
            <div className="glass-card" style={{ padding: '36px' }}>
              {submitted ? (
                <div style={{ textAlign: 'center', padding: '32px 12px' }}>
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

                  <h3 style={{ fontSize: '1.35rem', marginBottom: '12px' }}>Message Successfully Dispatched</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', lineHeight: '1.6', marginBottom: '24px' }}>
                    Thank you, <strong style={{ color: '#FFFFFF' }}>{formData.name}</strong>. Your inquiry regarding <span style={{ color: 'var(--emerald-primary)' }}>"{formData.subject}"</span> has been logged under reference <code className="mono-text" style={{ color: 'var(--gold-accent)' }}>#RC-MSG-{Math.floor(1000 + Math.random() * 9000)}</code>.
                  </p>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginBottom: '28px' }}>
                    Our team will reply to <strong style={{ color: '#FFFFFF' }}>{formData.email}</strong> within 1 business day.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setFormData({
                        name: '',
                        email: '',
                        inquiryType: 'partnerships',
                        subject: '',
                        message: ''
                      });
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Send Us a Message</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
                    All fields marked with an asterisk are required.
                  </p>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="name">Full Name *</label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        placeholder="Johnathan Doe"
                        value={formData.name}
                        onChange={handleChange}
                      />
                      {errors.name && <div style={{ color: '#F87171', fontSize: '0.75rem', marginTop: '4px' }}>{errors.name}</div>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="email">Business Email *</label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="john@domain.com"
                        value={formData.email}
                        onChange={handleChange}
                      />
                      {errors.email && <div style={{ color: '#F87171', fontSize: '0.75rem', marginTop: '4px' }}>{errors.email}</div>}
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="inquiryType">Department / Inquiry Category</label>
                    <select
                      id="inquiryType"
                      name="inquiryType"
                      value={formData.inquiryType}
                      onChange={handleChange}
                    >
                      <option value="partnerships">Publisher &amp; Media Buyer Applications</option>
                      <option value="advertiser">Advertiser Partnerships &amp; Insertion Orders</option>
                      <option value="tracking">Technical S2S Postback &amp; API Integration</option>
                      <option value="compliance">Compliance, Anti-Fraud &amp; Deduplication</option>
                      <option value="general">General Support &amp; Network Inquiries</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="subject">Subject *</label>
                    <input
                      id="subject"
                      name="subject"
                      type="text"
                      placeholder="e.g. S2S Postback Integration Setup for SaaS Offer"
                      value={formData.subject}
                      onChange={handleChange}
                    />
                    {errors.subject && <div style={{ color: '#F87171', fontSize: '0.75rem', marginTop: '4px' }}>{errors.subject}</div>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="message">Detailed Message *</label>
                    <textarea
                      id="message"
                      name="message"
                      rows="4"
                      placeholder="Please include relevant traffic sources, campaign URLs, or technical details..."
                      value={formData.message}
                      onChange={handleChange}
                    />
                    {errors.message && <div style={{ color: '#F87171', fontSize: '0.75rem', marginTop: '4px' }}>{errors.message}</div>}
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                    style={{ width: '100%', padding: '14px' }}
                  >
                    <Send size={16} />
                    <span>{loading ? 'Sending Message...' : 'Submit Inquiry'}</span>
                  </button>
                </form>
              )}
            </div>

            {/* Department Emails & Channels */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="glass-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                  <Mail size={20} style={{ color: 'var(--emerald-primary)' }} />
                  <h3 style={{ fontSize: '1.15rem' }}>Direct Email Channels</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.875rem' }}>
                  <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Advertisers &amp; Brands</div>
                    <div className="mono-text" style={{ color: '#FFFFFF', fontWeight: '600', marginTop: '2px' }}>advertisers@roycash.net</div>
                  </div>

                  <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Publishers &amp; Media Buyers</div>
                    <div className="mono-text" style={{ color: '#FFFFFF', fontWeight: '600', marginTop: '2px' }}>publishers@roycash.net</div>
                  </div>

                  <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Technical &amp; S2S Ingestion</div>
                    <div className="mono-text" style={{ color: '#FFFFFF', fontWeight: '600', marginTop: '2px' }}>tracking@roycash.net</div>
                  </div>

                  <div>
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Compliance &amp; Fraud Desk</div>
                    <div className="mono-text" style={{ color: '#FFFFFF', fontWeight: '600', marginTop: '2px' }}>compliance@roycash.net</div>
                  </div>
                </div>
              </div>

              <div className="glass-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <Clock size={20} style={{ color: 'var(--gold-accent)' }} />
                  <h3 style={{ fontSize: '1.15rem' }}>Operating Hours &amp; SLA</h3>
                </div>

                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: '1.6', marginBottom: '16px' }}>
                  Our technical routing infrastructure operates 24/7/365 with automated failover. Human account managers and technical engineers provide ticket responses during business shifts.
                </p>

                <div className="meta-row" style={{ marginBottom: '6px' }}>
                  <span style={{ color: '#FFFFFF', fontWeight: '600' }}>Active Shifts:</span>
                  <span>Monday &ndash; Friday, 08:00 &ndash; 18:00 UTC</span>
                </div>
                <div className="meta-row">
                  <span style={{ color: '#FFFFFF', fontWeight: '600' }}>First Response SLA:</span>
                  <span style={{ color: 'var(--emerald-primary)' }}>&le; 24 business hours</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
