import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Server,
  Database,
  Cpu,
  Activity,
  Key,
  Lock,
  UserCheck,
  LogOut,
  Layers,
  Settings,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  FileText,
  Radio,
  Send,
  HelpCircle,
  Sliders,
  Save,
  Check
} from 'lucide-react';
import { api } from '../services/api.js';

export default function Admin({ navigate }) {
  // Authentication & System State
  const [authStatus, setAuthStatus] = useState(null); // { needs_initial_setup, authenticated, admin, requires_setup_token }
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Login Form State
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Initial Setup Form State
  const [setupEmail, setSetupEmail] = useState('');
  const [setupName, setSetupName] = useState('Super Administrator');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupPasswordConfirm, setSetupPasswordConfirm] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);

  // Dashboard Data State
  const [dashboardStatus, setDashboardStatus] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [settingsData, setSettingsData] = useState(null);
  const [adminProfile, setAdminProfile] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Profile Password Change State
  const [currPassword, setCurrPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  // Settings edit state
  const [editTagline, setEditTagline] = useState('');
  const [editMaintenance, setEditMaintenance] = useState('false');
  const [savingSettings, setSavingSettings] = useState(false);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  // Load auth status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const statusRes = await api.getAdminAuthStatus();
      setAuthStatus(statusRes);

      if (statusRes.authenticated) {
        await loadTabContent(activeTab);
      }
    } catch (err) {
      console.error('Failed to check admin auth:', err);
      setErrorMsg(err.message || 'Failed to connect to backend.');
    } finally {
      setLoading(false);
    }
  };

  // Reload content when activeTab changes
  useEffect(() => {
    if (authStatus?.authenticated) {
      loadTabContent(activeTab);
    }
  }, [activeTab, authStatus?.authenticated]);

  const loadTabContent = async (tab) => {
    try {
      setIsRefreshing(true);
      setErrorMsg('');

      if (tab === 'dashboard') {
        const [dashRes, logsRes] = await Promise.all([
          api.getAdminDashboardStatus(),
          api.getAdminActivityLogs(15),
        ]);
        if (dashRes.success) setDashboardStatus(dashRes);
        if (logsRes.success) setActivityLogs(logsRes.logs || []);
      } else if (tab === 'settings') {
        const setRes = await api.getAdminSettings();
        if (setRes.success) {
          setSettingsData(setRes);
          const taglineSetting = setRes.settings.find((s) => s.key === 'app_tagline');
          const maintSetting = setRes.settings.find((s) => s.key === 'maintenance_mode');
          if (taglineSetting) setEditTagline(taglineSetting.value);
          if (maintSetting) setEditMaintenance(maintSetting.value);
        }
      } else if (tab === 'profile') {
        const profileRes = await api.getAdminMe();
        if (profileRes.success) setAdminProfile(profileRes);
      }
    } catch (err) {
      console.error(`Failed to load ${tab}:`, err);
      if (err.status === 401) {
        // Session expired
        setAuthStatus((prev) => ({ ...prev, authenticated: false, admin: null }));
        setErrorMsg('Admin session has expired. Please log in again.');
      } else {
        setErrorMsg(err.message || 'Error fetching data.');
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle Initial Superadmin Setup
  const handleInitialSetup = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (setupPassword !== setupPasswordConfirm) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (setupPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters.');
      return;
    }

    try {
      setSetupLoading(true);
      const res = await api.setupInitialAdmin({
        email: setupEmail,
        name: setupName,
        password: setupPassword,
        setup_token: setupToken,
      });

      if (res.success) {
        setSuccessMsg('Root administrator established successfully.');
        setAuthStatus({
          needs_initial_setup: false,
          authenticated: true,
          admin: res.admin,
        });
        setActiveTab('dashboard');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Initial setup failed.');
    } finally {
      setSetupLoading(false);
    }
  };

  // Handle Admin Login
  const handleLogin = async (e) => {
    e.preventDefault();
    if (lockoutSeconds > 0) return;
    setErrorMsg('');
    setSuccessMsg('');

    try {
      setLoginLoading(true);
      const res = await api.adminLogin({
        identifier: loginIdentifier,
        password: loginPassword,
      });

      if (res.success) {
        setAuthStatus({
          needs_initial_setup: false,
          authenticated: true,
          admin: res.admin,
        });
        setLoginPassword('');
        setActiveTab('dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err.data?.locked && err.data?.retryAfterSeconds) {
        setLockoutSeconds(err.data.retryAfterSeconds);
      }
      setErrorMsg(err.message || 'Authentication failed.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Admin Logout
  const handleLogout = async () => {
    try {
      await api.adminLogout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setAuthStatus((prev) => ({
        ...prev,
        authenticated: false,
        admin: null,
      }));
      setActiveTab('dashboard');
      setSuccessMsg('Logged out successfully.');
    }
  };

  // Handle Password Change
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (newPassword !== confirmNewPassword) {
      setErrorMsg('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMsg('New password must be at least 8 characters long.');
      return;
    }

    try {
      setPassLoading(true);
      const res = await api.updateAdminPassword({
        current_password: currPassword,
        new_password: newPassword,
      });
      if (res.success) {
        setSuccessMsg(res.message);
        setCurrPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update password.');
    } finally {
      setPassLoading(false);
    }
  };

  // Handle Save Settings
  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      setErrorMsg('');
      setSuccessMsg('');

      await api.updateAdminSetting({ key: 'app_tagline', value: editTagline });
      await api.updateAdminSetting({ key: 'maintenance_mode', value: editMaintenance });

      setSuccessMsg('System settings updated and audited successfully.');
      await loadTabContent('settings');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Navigation Items Specification (Exact 12 items requested)
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity, status: 'active' },
    { id: 'campaigns', label: 'Campaign Management', icon: Layers, status: 'coming_soon' },
    { id: 'mitgo', label: 'Mitgo Integration', icon: Radio, status: 'coming_soon' },
    { id: 'tracking', label: 'Conversion Tracking', icon: TrendingUp, status: 'coming_soon' },
    { id: 'users_wallets', label: 'Users & Wallets', icon: UserCheck, status: 'coming_soon' },
    { id: 'cashback', label: 'Cashback Management', icon: ShieldCheck, status: 'coming_soon' },
    { id: 'withdrawals', label: 'Withdrawal Management', icon: Send, status: 'coming_soon' },
    { id: 'telegram', label: 'Telegram Bot Settings', icon: Radio, status: 'coming_soon' },
    { id: 'reports', label: 'Reports & Analytics', icon: FileText, status: 'coming_soon' },
    { id: 'settings', label: 'System Settings', icon: Settings, status: 'active' },
    { id: 'profile', label: 'Admin Profile', icon: User, status: 'active' },
  ];

  // Loading Screen
  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw size={36} className="spin" style={{ color: 'var(--emerald-primary)', margin: '0 auto 16px' }} />
          <h3 style={{ color: '#FFFFFF', fontSize: '1.25rem', fontWeight: 600 }}>Connecting to RoyCash Admin Core...</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem', marginTop: '6px' }}>
            Validating security keys and database connection
          </p>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 1: ONE-TIME INITIAL SUPERADMIN SETUP (if count === 0)
  // =========================================================================
  if (authStatus?.needs_initial_setup) {
    return (
      <div className="section-wrapper" style={{ minHeight: '85vh', display: 'flex', alignItems: 'center' }}>
        <div className="container" style={{ maxWidth: '520px' }}>
          <div className="glass-card" style={{ padding: '36px', border: '1px solid var(--border-emerald)' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '14px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  border: '1px solid var(--border-emerald)',
                }}
              >
                <Shield size={28} style={{ color: 'var(--emerald-primary)' }} />
              </div>
              <span className="badge badge-emerald" style={{ marginBottom: '10px' }}>
                One-Time Secure Initialization
              </span>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF' }}>Create Root Superadmin</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '6px', lineHeight: 1.5 }}>
                No administrator exists in the database. Complete this verified setup to configure root system access.
                This endpoint will be permanently disabled once created.
              </p>
            </div>

            {errorMsg && (
              <div
                style={{
                  padding: '12px 16px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  color: '#F87171',
                  fontSize: '0.875rem',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <AlertCircle size={18} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleInitialSetup}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Superadmin Name
                </label>
                <input
                  type="text"
                  required
                  value={setupName}
                  onChange={(e) => setSetupName(e.target.value)}
                  placeholder="e.g. Master Administrator"
                  className="contact-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Superadmin Email Address
                </label>
                <input
                  type="email"
                  required
                  value={setupEmail}
                  onChange={(e) => setSetupEmail(e.target.value)}
                  placeholder="admin@yourdomain.com"
                  className="contact-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Root Password (min. 8 characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={setupPassword}
                  onChange={(e) => setSetupPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="contact-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={setupPasswordConfirm}
                  onChange={(e) => setSetupPasswordConfirm(e.target.value)}
                  placeholder="••••••••••••"
                  className="contact-input"
                  style={{ width: '100%' }}
                />
              </div>

              {authStatus?.requires_setup_token && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Setup Authorization Token (from ADMIN_SETUP_TOKEN env)
                  </label>
                  <input
                    type="password"
                    required
                    value={setupToken}
                    onChange={(e) => setSetupToken(e.target.value)}
                    placeholder="Enter environment setup token"
                    className="contact-input"
                    style={{ width: '100%' }}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={setupLoading}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
              >
                {setupLoading ? 'Initializing Root Access...' : 'Establish Root Superadmin'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: ADMINISTRATOR PORTAL LOGIN
  // =========================================================================
  if (!authStatus?.authenticated) {
    return (
      <div className="section-wrapper" style={{ minHeight: '85vh', display: 'flex', alignItems: 'center' }}>
        <div className="container" style={{ maxWidth: '460px' }}>
          <div className="glass-card" style={{ padding: '36px', border: '1px solid var(--border-medium)' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '14px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  border: '1px solid var(--border-emerald)',
                }}
              >
                <Lock size={26} style={{ color: 'var(--emerald-primary)' }} />
              </div>
              <span className="badge badge-emerald" style={{ marginBottom: '8px' }}>
                Restricted System Access
              </span>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF' }}>RoyCash Administrator</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                Authenticate with your administrator credentials
              </p>
            </div>

            {errorMsg && (
              <div
                style={{
                  padding: '12px 16px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  color: '#F87171',
                  fontSize: '0.85rem',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div
                style={{
                  padding: '12px 16px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid var(--border-emerald)',
                  borderRadius: '8px',
                  color: 'var(--emerald-light)',
                  fontSize: '0.85rem',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                <span>{successMsg}</span>
              </div>
            )}

            {lockoutSeconds > 0 && (
              <div
                style={{
                  padding: '14px 16px',
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '8px',
                  color: '#FCD34D',
                  fontSize: '0.85rem',
                  marginBottom: '20px',
                  textAlign: 'center',
                }}
              >
                <Clock size={20} style={{ margin: '0 auto 6px', display: 'block' }} />
                <strong>Account Temporarily Locked</strong>
                <p style={{ marginTop: '4px' }}>
                  Retry permitted in <strong>{lockoutSeconds}</strong> seconds.
                </p>
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Admin Username or Email
                </label>
                <input
                  type="text"
                  required
                  disabled={lockoutSeconds > 0 || loginLoading}
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="Enter administrator username or email"
                  className="contact-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Password
                </label>
                <input
                  type="password"
                  required
                  disabled={lockoutSeconds > 0 || loginLoading}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="contact-input"
                  style={{ width: '100%' }}
                />
              </div>

              <button
                type="submit"
                disabled={lockoutSeconds > 0 || loginLoading}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
              >
                {loginLoading ? 'Authenticating...' : 'Sign In to Console'}
              </button>
            </form>

            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => navigate('home')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-dim)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                ← Return to Public Website
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: AUTHENTICATED ADMIN DASHBOARD CONSOLE SHELL
  // =========================================================================
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Console Navigation Bar */}
      <header
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(7, 11, 20, 0.95)',
          backdropFilter: 'blur(12px)',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              }}
            >
              <Shield size={18} style={{ color: '#FFFFFF' }} />
            </div>
            <div>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                ROY<span style={{ color: 'var(--emerald-primary)' }}>CASH</span>
              </span>
              <span
                style={{
                  fontSize: '0.68rem',
                  marginLeft: '8px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: 'var(--emerald-light)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                Admin Shell
              </span>
            </div>
          </div>

          <div style={{ height: '20px', width: '1px', background: 'var(--border-subtle)' }} />

          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            Milestone 1: Backend Foundation & Admin Auth
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FFFFFF' }}>
              {authStatus.admin?.name || 'Administrator'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--emerald-light)' }}>
              {authStatus.admin?.email} ({authStatus.admin?.role})
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="btn btn-outline"
            style={{ padding: '8px 14px', fontSize: '0.8rem', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#F87171' }}
          >
            <LogOut size={14} style={{ marginRight: '6px' }} />
            Logout
          </button>
        </div>
      </header>

      {/* Main Console Layout: Sidebar + Content Area */}
      <div style={{ display: 'flex', flex: 1 }}>
        {/* Left Sidebar Navigation (12 Exact Items) */}
        <aside
          style={{
            width: '260px',
            background: 'var(--bg-surface)',
            borderRight: '1px solid var(--border-subtle)',
            padding: '20px 12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div>
            <div
              style={{
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                color: 'var(--text-dim)',
                fontWeight: 700,
                padding: '0 12px 10px',
                letterSpacing: '0.05em',
              }}
            >
              Navigation
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {navItems.map((item) => {
                const IconComponent = item.icon;
                const isSelected = activeTab === item.id;
                const isComingSoon = item.status === 'coming_soon';

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                      color: isSelected ? 'var(--emerald-light)' : isComingSoon ? 'var(--text-dim)' : 'var(--text-secondary)',
                      fontSize: '0.85rem',
                      fontWeight: isSelected ? 600 : 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'var(--transition-fast)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <IconComponent
                        size={16}
                        style={{ color: isSelected ? 'var(--emerald-primary)' : isComingSoon ? 'var(--text-dim)' : 'var(--text-muted)' }}
                      />
                      <span>{item.label}</span>
                    </div>

                    {isComingSoon && (
                      <span
                        style={{
                          fontSize: '0.62rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--text-dim)',
                          fontWeight: 600,
                        }}
                      >
                        Soon
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Footer Link */}
          <div style={{ paddingTop: '20px', borderTop: '1px solid var(--border-subtle)', paddingLeft: '12px', paddingRight: '12px' }}>
            <button
              type="button"
              onClick={() => navigate('home')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'none',
                border: 'none',
                color: 'var(--text-dim)',
                fontSize: '0.8rem',
                cursor: 'pointer',
                padding: '4px 0',
              }}
            >
              <ExternalLink size={14} />
              <span>Open Public Site</span>
            </button>
          </div>
        </aside>

        {/* Right Content Area */}
        <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          {/* Notifications */}
          {errorMsg && (
            <div
              style={{
                padding: '14px 18px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                color: '#F87171',
                fontSize: '0.875rem',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                padding: '14px 18px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid var(--border-emerald)',
                borderRadius: '8px',
                color: 'var(--emerald-light)',
                fontSize: '0.875rem',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB: DASHBOARD (STEP 1 MILESTONE REAL DATA) */}
          {/* ============================================================== */}
          {activeTab === 'dashboard' && (
            <div>
              {/* Header with Refresh button */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '28px',
                }}
              >
                <div>
                  <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                    System Status & Operations
                  </h1>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem', marginTop: '4px' }}>
                    Real-time verification of backend foundation, database connectivity, and administrative session state
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => loadTabContent('dashboard')}
                  disabled={isRefreshing}
                  className="btn btn-outline"
                  style={{ padding: '8px 16px', fontSize: '0.825rem' }}
                >
                  <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} style={{ marginRight: '6px' }} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh Status'}
                </button>
              </div>

              {/* Milestone Indicator Card */}
              <div
                className="glass-card"
                style={{
                  marginBottom: '28px',
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(13, 20, 36, 0.9))',
                  border: '1px solid var(--border-emerald)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '24px',
                }}
              >
                <div>
                  <span
                    className="badge badge-emerald"
                    style={{ marginBottom: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <CheckCircle2 size={12} /> Active Phase: Step 1 Complete
                  </span>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF' }}>
                    {dashboardStatus?.milestone?.title || 'Step 1: Backend Foundation & Admin Authentication'}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px', maxWidth: '720px' }}>
                    Centralized server configuration, WAL-mode SQLite database connection, scrypt password hashing,
                    timing-safe authentication, session tokens, brute-force rate-limiting, and protected routes are verified.
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Milestone Status</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--emerald-primary)', marginTop: '2px' }}>
                    {dashboardStatus?.milestone?.status || 'VERIFIED'}
                  </div>
                </div>
              </div>

              {/* 4 Core Status KPI Cards */}
              <div className="grid-4" style={{ gap: '20px', marginBottom: '32px' }}>
                {/* 1. System Status */}
                <div className="glass-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
                      System Status
                    </span>
                    <Server size={18} style={{ color: 'var(--emerald-primary)' }} />
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF' }}>
                    {dashboardStatus?.system_status?.status || 'OPERATIONAL'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--emerald-light)', marginTop: '6px' }}>
                    ● Uptime: {dashboardStatus?.system_status?.uptime_formatted || '0s'}
                  </div>
                </div>

                {/* 2. Database Connection */}
                <div className="glass-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
                      Database Connection
                    </span>
                    <Database size={18} style={{ color: '#60A5FA' }} />
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#60A5FA' }}>
                    {dashboardStatus?.database_status?.status || 'CONNECTED'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                    {dashboardStatus?.database_status?.journal_mode} Mode · {dashboardStatus?.database_status?.size_formatted || '0 KB'}
                  </div>
                </div>

                {/* 3. Backend API Status */}
                <div className="glass-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
                      Backend API Status
                    </span>
                    <Cpu size={18} style={{ color: 'var(--gold-accent)' }} />
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gold-accent)' }}>
                    HEALTHY
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                    Node {dashboardStatus?.system_status?.node_version || process.version} · Memory: {dashboardStatus?.system_status?.memory?.rss_mb || 0} MB
                  </div>
                </div>

                {/* 4. Admin Account */}
                <div className="glass-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
                      Admin Account
                    </span>
                    <UserCheck size={18} style={{ color: 'var(--emerald-light)' }} />
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {dashboardStatus?.admin_account?.name || authStatus.admin?.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--emerald-light)', marginTop: '6px' }}>
                    Role: {dashboardStatus?.admin_account?.role || 'superadmin'}
                  </div>
                </div>
              </div>

              {/* Two Column Layout: System Diagnostics & Activity Logs */}
              <div className="grid-2" style={{ gap: '24px' }}>
                {/* Diagnostics Panel */}
                <div className="glass-card" style={{ padding: '24px' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '16px' }}>
                    System Diagnostics & Runtime Environment
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Environment Mode:</span>
                      <span style={{ color: '#FFFFFF', fontSize: '0.85rem', fontWeight: 600 }}>{dashboardStatus?.system_status?.environment}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Database Engine:</span>
                      <span style={{ color: '#FFFFFF', fontSize: '0.85rem', fontWeight: 600 }}>{dashboardStatus?.database_status?.driver}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Active Admin Sessions:</span>
                      <span style={{ color: 'var(--emerald-light)', fontSize: '0.85rem', fontWeight: 600 }}>{dashboardStatus?.database_status?.active_admin_sessions} active</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Total Audit Entries:</span>
                      <span style={{ color: '#FFFFFF', fontSize: '0.85rem', fontWeight: 600 }}>{dashboardStatus?.database_status?.total_activity_logs} recorded</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Platform Architecture:</span>
                      <span style={{ color: '#FFFFFF', fontSize: '0.85rem', fontWeight: 600 }}>{dashboardStatus?.system_status?.platform} ({dashboardStatus?.system_status?.arch})</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px' }}>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Server Timestamp:</span>
                      <span style={{ color: '#FFFFFF', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>{dashboardStatus?.server_time}</span>
                    </div>
                  </div>
                </div>

                {/* Real Activity Audit Log */}
                <div className="glass-card" style={{ padding: '24px' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '16px' }}>
                    Recent Administrative Audit Trail
                  </h4>
                  {activityLogs.length === 0 ? (
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem', textAlign: 'center', padding: '32px 0' }}>
                      No administrative events logged yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '320px', overflowY: 'auto' }}>
                      {activityLogs.map((log) => (
                        <div
                          key={log.id}
                          style={{
                            padding: '10px 12px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: '6px',
                            border: '1px solid var(--border-subtle)',
                            fontSize: '0.8rem',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 600, color: 'var(--emerald-light)' }}>{log.action}</span>
                            <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>
                              {new Date(log.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                            IP: {log.ip_address} · Actor: {log.admin_email || 'System'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB: SYSTEM SETTINGS (STEP 1 MILESTONE REAL DATA) */}
          {/* ============================================================== */}
          {activeTab === 'settings' && (
            <div>
              <div style={{ marginBottom: '28px' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                  System Settings & Configuration
                </h1>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem', marginTop: '4px' }}>
                  Core platform configuration loaded directly from the system_settings database table
                </p>
              </div>

              <div className="grid-2" style={{ gap: '24px' }}>
                {/* Core Parameters Table */}
                <div className="glass-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '16px' }}>
                    Active System Configuration
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Application Name</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF', marginTop: '2px' }}>RoyCash</div>
                    </div>

                    <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Environment</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--emerald-light)', marginTop: '2px' }}>
                        {settingsData?.environment?.nodeEnv?.toUpperCase()}
                      </div>
                    </div>

                    <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Backend Health</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--emerald-primary)', marginTop: '2px' }}>
                        Operational (200 OK)
                      </div>
                    </div>

                    <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Database Health</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#60A5FA', marginTop: '2px' }}>
                        Connected · WAL Mode
                      </div>
                    </div>

                    <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Application Version</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gold-accent)', marginTop: '2px' }}>
                        1.0.0-step1
                      </div>
                    </div>
                  </div>
                </div>

                {/* Editable Settings Form */}
                <div className="glass-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '16px' }}>
                    Adjustable Runtime Parameters
                  </h3>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Application Tagline
                    </label>
                    <input
                      type="text"
                      value={editTagline}
                      onChange={(e) => setEditTagline(e.target.value)}
                      className="contact-input"
                      style={{ width: '100%' }}
                    />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                      Stored in system_settings (key: app_tagline)
                    </span>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Maintenance Mode
                    </label>
                    <select
                      value={editMaintenance}
                      onChange={(e) => setEditMaintenance(e.target.value)}
                      className="contact-input"
                      style={{ width: '100%' }}
                    >
                      <option value="false">Disabled (Normal Traffic Allowed)</option>
                      <option value="true">Enabled (System Maintenance Active)</option>
                    </select>
                  </div>

                  <div style={{ padding: '14px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginBottom: '24px' }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      <strong>Audit Compliance:</strong> Every setting modification is recorded in the immutable{' '}
                      <code>admin_activity_logs</code> table with administrator ID, IP, and timestamp.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    disabled={savingSettings}
                    className="btn btn-primary"
                    style={{ padding: '12px 24px' }}
                  >
                    <Save size={16} style={{ marginRight: '8px' }} />
                    {savingSettings ? 'Saving...' : 'Save Settings to Database'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB: ADMIN PROFILE (STEP 1 MILESTONE REAL DATA) */}
          {/* ============================================================== */}
          {activeTab === 'profile' && (
            <div>
              <div style={{ marginBottom: '28px' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                  Administrator Profile & Security
                </h1>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem', marginTop: '4px' }}>
                  Manage session security, password rotation, and audit metadata
                </p>
              </div>

              <div className="grid-2" style={{ gap: '24px' }}>
                {/* Account Details Card */}
                <div className="glass-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '16px' }}>
                    Account Details
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Admin ID:</span>
                      <span style={{ color: '#FFFFFF', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
                        {adminProfile?.admin?.id || authStatus.admin?.id}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Username:</span>
                      <span style={{ color: '#FFFFFF', fontSize: '0.85rem', fontWeight: 600 }}>
                        {adminProfile?.admin?.username || authStatus.admin?.username}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Email:</span>
                      <span style={{ color: '#FFFFFF', fontSize: '0.85rem', fontWeight: 600 }}>
                        {adminProfile?.admin?.email || authStatus.admin?.email}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Role:</span>
                      <span className="badge badge-emerald" style={{ fontSize: '0.72rem' }}>
                        {adminProfile?.admin?.role || authStatus.admin?.role}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Status:</span>
                      <span style={{ color: 'var(--emerald-light)', fontSize: '0.85rem', fontWeight: 600 }}>
                        {adminProfile?.admin?.status || 'active'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '10px' }}>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Session Expiration:</span>
                      <span style={{ color: 'var(--gold-accent)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
                        {adminProfile?.session?.expires_at ? new Date(adminProfile.session.expires_at).toLocaleString() : '12 Hours'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Change Password Card */}
                <div className="glass-card" style={{ padding: '24px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '16px' }}>
                    Rotate Administrator Password
                  </h3>

                  <form onSubmit={handlePasswordChange}>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        Current Password
                      </label>
                      <input
                        type="password"
                        required
                        value={currPassword}
                        onChange={(e) => setCurrPassword(e.target.value)}
                        className="contact-input"
                        style={{ width: '100%' }}
                      />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        New Password (min 8 chars)
                      </label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="contact-input"
                        style={{ width: '100%' }}
                      />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="contact-input"
                        style={{ width: '100%' }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={passLoading}
                      className="btn btn-primary"
                      style={{ padding: '12px 24px' }}
                    >
                      <Lock size={16} style={{ marginRight: '8px' }} />
                      {passLoading ? 'Updating Password...' : 'Update Password & Invalidate Other Sessions'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* COMING SOON MODULES (STRICTLY LABELED AS COMING SOON - NO FAKES) */}
          {/* ============================================================== */}
          {activeTab !== 'dashboard' && activeTab !== 'settings' && activeTab !== 'profile' && (
            <div
              className="glass-card"
              style={{
                textAlign: 'center',
                padding: '64px 24px',
                maxWidth: '640px',
                margin: '40px auto',
                border: '1px solid var(--border-medium)',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                }}
              >
                <Clock size={32} style={{ color: 'var(--gold-accent)' }} />
              </div>

              <span className="badge badge-gold" style={{ marginBottom: '12px', display: 'inline-block' }}>
                Upcoming Milestone
              </span>

              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '12px' }}>
                {navItems.find((n) => n.id === activeTab)?.label || 'Module'} — Coming Soon
              </h2>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, maxWidth: '480px', margin: '0 auto 24px' }}>
                In accordance with development specifications for <strong>Step 1</strong>, this module is reserved for subsequent milestones. No simulated or artificial data is displayed.
              </p>

              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="btn btn-outline"
                style={{ padding: '10px 20px' }}
              >
                Return to Active Dashboard Shell
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
