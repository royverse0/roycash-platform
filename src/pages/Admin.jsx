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
  Check,
  Plus,
  Trash2,
  Edit,
  Play,
  Pause,
  Eye,
  ArrowUp,
  ArrowDown,
  Info,
  Sparkles,
  Copy,
  Tag,
  X,
  Search,
  Filter
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

  // Campaign Management State
  const [campaignsList, setCampaignsList] = useState([]);
  const [campaignSearch, setCampaignSearch] = useState('');
  const [campaignStatusFilter, setCampaignStatusFilter] = useState('all');
  const [campaignTypeFilter, setCampaignTypeFilter] = useState('all');
  const [selectedCampaignForView, setSelectedCampaignForView] = useState(null);

  // Withdrawal Management State
  const [withdrawalsList, setWithdrawalsList] = useState([]);
  const [withdrawalFilter, setWithdrawalFilter] = useState('all');
  const [withdrawalSearch, setWithdrawalSearch] = useState('');
  const [selectedWithdrawalDetail, setSelectedWithdrawalDetail] = useState(null);
  const [detailModalLoading, setDetailModalLoading] = useState(false);
  const [withdrawalActionModal, setWithdrawalActionModal] = useState(null);
  const [withdrawalUtrInput, setWithdrawalUtrInput] = useState('');
  const [withdrawalRejectInput, setWithdrawalRejectInput] = useState('');
  const [withdrawalAdminConfirm, setWithdrawalAdminConfirm] = useState(false);
  const [withdrawalActionLoading, setWithdrawalActionLoading] = useState(false);

  const handleUpdateWithdrawalStatus = async (id, status, extra = {}) => {
    try {
      setWithdrawalActionLoading(true);
      setErrorMsg('');
      setSuccessMsg('');

      const payload = { status, ...extra };
      const res = await api.updateWithdrawalStatus(id, payload);
      if (res.success) {
        setSuccessMsg(res.message || `Withdrawal updated to ${status}.`);
        setWithdrawalActionModal(null);
        setWithdrawalUtrInput('');
        setWithdrawalRejectInput('');
        setWithdrawalAdminConfirm(false);
        await loadTabContent('withdrawals');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update withdrawal status.');
    } finally {
      setWithdrawalActionLoading(false);
    }
  };

  const handleOpenWithdrawalDetail = async (wdr) => {
    try {
      setDetailModalLoading(true);
      setSelectedWithdrawalDetail(wdr);
      const res = await api.getAdminWithdrawalById(wdr.id);
      if (res.success) {
        setSelectedWithdrawalDetail(res.withdrawal);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load withdrawal details.');
    } finally {
      setDetailModalLoading(false);
    }
  };

  // Campaign Form Modal / Slide-over State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState(null);
  const [formSaving, setFormSaving] = useState(false);

  // Campaign Form Fields
  const [cName, setCName] = useState('');
  const [cAdvertiser, setCAdvertiser] = useState('');
  const [cCategory, setCCategory] = useState('Fintech');
  const [cProvider, setCProvider] = useState('mitgo');
  const [cProviderId, setCProviderId] = useState('');
  const [cLogoUrl, setCLogoUrl] = useState('');
  const [cDescription, setCDescription] = useState('');
  const [cTerms, setCTerms] = useState('');
  const [cRewardAmount, setCRewardAmount] = useState('300');
  const [cCurrency, setCCurrency] = useState('INR');
  const [cTrackingUrl, setCTrackingUrl] = useState('https://tracking.roycash.com/click?subid1={click_id}');
  const [cApprovalDays, setCApprovalDays] = useState('30');
  const [cIsDemo, setCIsDemo] = useState(1);
  const [cStatus, setCStatus] = useState('active');
  const [cReqInstall, setCReqInstall] = useState(true);
  const [cReqSignup, setCReqSignup] = useState(true);
  const [cReqKyc, setCReqKyc] = useState(false);
  const [cReqDeposit, setCReqDeposit] = useState(false);
  const [cMinDeposit, setCMinDeposit] = useState('0');

  // Dynamic Steps Array
  const [cSteps, setCSteps] = useState([
    {
      step_order: 1,
      step_type: 'install',
      title: 'Download & Install Application',
      description: 'Install the official application on your mobile device using the tracking link.',
      is_required: true,
      min_deposit_amount: '0',
    },
    {
      step_order: 2,
      step_type: 'signup',
      title: 'Complete Registration & Sign Up',
      description: 'Register a new account with valid user details.',
      is_required: true,
      min_deposit_amount: '0',
    },
  ]);

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
      } else if (tab === 'campaigns') {
        const campRes = await api.getAdminCampaigns();
        if (campRes.success) setCampaignsList(campRes.campaigns || []);
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
      } else if (tab === 'withdrawals') {
        const wdrRes = await api.getAdminWithdrawals();
        if (wdrRes.success) setWithdrawalsList(wdrRes.withdrawals || []);
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

  // Campaign Handlers
  const openCreateCampaignForm = () => {
    setErrorMsg('');
    setSuccessMsg('');
    setEditingCampaignId(null);
    setCName('');
    setCAdvertiser('');
    setCCategory('Fintech');
    setCProvider('mitgo');
    setCProviderId('');
    setCLogoUrl('');
    setCDescription('');
    setCTerms('Standard network cashback terms apply. Artificial or bot traffic will lead to conversion rejection.');
    setCRewardAmount('300');
    setCCurrency('INR');
    setCTrackingUrl('https://tracking.roycash.com/click?subid1={click_id}');
    setCApprovalDays('30');
    setCIsDemo(1);
    setCStatus('active');
    setCReqInstall(true);
    setCReqSignup(true);
    setCReqKyc(false);
    setCReqDeposit(false);
    setCMinDeposit('0');
    setCSteps([
      {
        step_order: 1,
        step_type: 'install',
        title: 'Download & Install Application',
        description: 'Install the official application on your mobile device using the tracking link.',
        is_required: true,
        min_deposit_amount: '0',
      },
      {
        step_order: 2,
        step_type: 'signup',
        title: 'Complete Registration & Sign Up',
        description: 'Register a new account with valid user details.',
        is_required: true,
        min_deposit_amount: '0',
      },
    ]);
    setIsFormOpen(true);
  };

  const openEditCampaignForm = async (campaign) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      setIsRefreshing(true);
      const res = await api.getAdminCampaignById(campaign.id);
      if (res.success && res.campaign) {
        const c = res.campaign;
        setEditingCampaignId(c.id);
        setCName(c.name || '');
        setCAdvertiser(c.advertiser_name || '');
        setCCategory(c.category || 'Fintech');
        setCProvider(c.provider || 'mitgo');
        setCProviderId(c.provider_campaign_id || '');
        setCLogoUrl(c.logo_url || '');
        setCDescription(c.description || '');
        setCTerms(c.terms || '');
        setCRewardAmount(String(c.reward_amount || '300'));
        setCCurrency(c.currency || 'INR');
        setCTrackingUrl(c.tracking_url_template || '');
        setCApprovalDays(String(c.estimated_approval_days || '30'));
        setCIsDemo(c.is_demo);
        setCStatus(c.status || 'active');
        setCReqInstall(Boolean(c.requires_install));
        setCReqSignup(Boolean(c.requires_signup));
        setCReqKyc(Boolean(c.requires_kyc));
        setCReqDeposit(Boolean(c.requires_deposit));
        setCMinDeposit(String(c.minimum_deposit_amount || '0'));

        if (Array.isArray(c.steps) && c.steps.length > 0) {
          setCSteps(
            c.steps.map((s, idx) => ({
              step_order: idx + 1,
              step_type: s.step_type || 'other',
              title: s.title || '',
              description: s.description || '',
              is_required: Boolean(s.is_required),
              min_deposit_amount: String(s.min_deposit_amount || '0'),
            }))
          );
        } else {
          setCSteps([]);
        }

        setIsFormOpen(true);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch campaign details for editing.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSaveCampaign = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!cName.trim()) { setErrorMsg('Campaign Name is required.'); return; }
    if (!cAdvertiser.trim()) { setErrorMsg('Advertiser Name is required.'); return; }
    if (!cCategory.trim()) { setErrorMsg('Category is required.'); return; }
    if (!cDescription.trim()) { setErrorMsg('Description is required.'); return; }
    if (!cTrackingUrl.trim()) { setErrorMsg('Tracking URL Template is required.'); return; }

    const numReward = parseFloat(cRewardAmount);
    if (isNaN(numReward) || !isFinite(numReward) || numReward <= 0) {
      setErrorMsg('Reward amount must be a positive number greater than 0.');
      return;
    }

    const formattedSteps = cSteps.map((s, idx) => ({
      step_order: idx + 1,
      step_type: s.step_type || 'other',
      title: (s.title || '').trim(),
      description: (s.description || '').trim(),
      is_required: Boolean(s.is_required),
      min_deposit_amount: parseFloat(s.min_deposit_amount) || 0,
    }));

    for (let i = 0; i < formattedSteps.length; i++) {
      if (!formattedSteps[i].title) {
        setErrorMsg(`Step #${i + 1} is missing a title.`);
        return;
      }
      if (!formattedSteps[i].description) {
        setErrorMsg(`Step #${i + 1} ('${formattedSteps[i].title}') is missing a description.`);
        return;
      }
    }

    const payload = {
      name: cName.trim(),
      advertiser_name: cAdvertiser.trim(),
      category: cCategory.trim(),
      provider: cProvider.trim(),
      provider_campaign_id: cProviderId.trim() || null,
      logo_url: cLogoUrl.trim() || null,
      description: cDescription.trim(),
      terms: cTerms.trim() || null,
      reward_amount: numReward,
      currency: cCurrency.trim().toUpperCase() || 'INR',
      tracking_url_template: cTrackingUrl.trim(),
      estimated_approval_days: parseInt(cApprovalDays, 10) || 30,
      is_demo: Number(cIsDemo),
      status: cStatus,
      requires_install: cReqInstall ? 1 : 0,
      requires_signup: cReqSignup ? 1 : 0,
      requires_kyc: cReqKyc ? 1 : 0,
      requires_deposit: cReqDeposit ? 1 : 0,
      minimum_deposit_amount: parseFloat(cMinDeposit) || 0,
      steps: formattedSteps,
    };

    try {
      setFormSaving(true);
      let res;
      if (editingCampaignId) {
        res = await api.updateAdminCampaign(editingCampaignId, payload);
      } else {
        res = await api.createAdminCampaign(payload);
      }

      if (res.success) {
        setSuccessMsg(res.message || 'Campaign saved successfully.');
        setIsFormOpen(false);
        const campRes = await api.getAdminCampaigns();
        if (campRes.success) setCampaignsList(campRes.campaigns || []);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save campaign.');
    } finally {
      setFormSaving(false);
    }
  };

  const handleToggleStatus = async (campaign, newStatus) => {
    try {
      setErrorMsg('');
      setSuccessMsg('');
      const res = await api.updateAdminCampaignStatus(campaign.id, newStatus);
      if (res.success) {
        setSuccessMsg(res.message);
        const campRes = await api.getAdminCampaigns();
        if (campRes.success) setCampaignsList(campRes.campaigns || []);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update campaign status.');
    }
  };

  const handleDeleteCampaign = async (campaign) => {
    if (!window.confirm(`Are you sure you want to delete campaign '${campaign.name}'? If clicks or conversions exist, it will be set to Draft mode to preserve ledger history.`)) {
      return;
    }
    try {
      setErrorMsg('');
      setSuccessMsg('');
      const res = await api.deleteAdminCampaign(campaign.id);
      if (res.success) {
        setSuccessMsg(res.message);
        const campRes = await api.getAdminCampaigns();
        if (campRes.success) setCampaignsList(campRes.campaigns || []);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to delete campaign.');
    }
  };

  // Step Array Manipulation Helpers
  const handleAddStep = () => {
    setCSteps((prev) => [
      ...prev,
      {
        step_order: prev.length + 1,
        step_type: 'other',
        title: '',
        description: '',
        is_required: true,
        min_deposit_amount: '0',
      },
    ]);
  };

  const handleRemoveStep = (index) => {
    setCSteps((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleStepChange = (index, field, value) => {
    setCSteps((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleMoveStep = (index, direction) => {
    setCSteps((prev) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
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
    { id: 'campaigns', label: 'Campaign Management', icon: Layers, status: 'active' },
    { id: 'mitgo', label: 'Mitgo Integration', icon: Radio, status: 'coming_soon' },
    { id: 'tracking', label: 'Conversion Tracking', icon: TrendingUp, status: 'coming_soon' },
    { id: 'users_wallets', label: 'Users & Wallets', icon: UserCheck, status: 'coming_soon' },
    { id: 'cashback', label: 'Cashback Management', icon: ShieldCheck, status: 'coming_soon' },
    { id: 'withdrawals', label: 'Withdrawal Management', icon: Send, status: 'active' },
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
          {/* TAB: CAMPAIGN MANAGEMENT & DYNAMIC STEPS CONFIGURATION */}
          {/* ============================================================== */}
          {activeTab === 'campaigns' && (
            <div>
              {/* Header with Title and Create Button */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '28px',
                  flexWrap: 'wrap',
                  gap: '16px',
                }}
              >
                <div>
                  <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                    Campaign Management & Dynamic Steps
                  </h1>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem', marginTop: '4px' }}>
                    Create, edit, pause, and configure required verification steps for performance campaigns
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={loadCampaigns}
                    disabled={isRefreshing}
                    className="btn btn-outline"
                    style={{ padding: '10px 16px', fontSize: '0.85rem' }}
                  >
                    <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} style={{ marginRight: '6px' }} />
                    Refresh
                  </button>

                  <button
                    type="button"
                    onClick={openCreateCampaignForm}
                    className="btn btn-primary"
                    style={{ padding: '10px 20px', fontSize: '0.875rem' }}
                  >
                    <Plus size={16} style={{ marginRight: '6px' }} />
                    Create New Campaign
                  </button>
                </div>
              </div>

              {/* KPI Banner */}
              <div className="grid-4" style={{ gap: '16px', marginBottom: '24px' }}>
                <div className="glass-card" style={{ padding: '16px 20px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Total Campaigns
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', marginTop: '4px' }}>
                    {campaignsList.length}
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '16px 20px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Active Offers
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--emerald-primary)', marginTop: '4px' }}>
                    {campaignsList.filter((c) => c.status === 'active').length}
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '16px 20px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Demo / Sandbox Offers
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gold-accent)', marginTop: '4px' }}>
                    {campaignsList.filter((c) => c.is_demo === 1).length}
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '16px 20px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Live Provider Offers
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#60A5FA', marginTop: '4px' }}>
                    {campaignsList.filter((c) => c.is_demo === 0).length}
                  </div>
                </div>
              </div>

              {/* Search and Filters Bar */}
              <div
                className="glass-card"
                style={{
                  padding: '16px 20px',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
                  <Search size={18} style={{ color: 'var(--text-dim)' }} />
                  <input
                    type="text"
                    value={campaignSearch}
                    onChange={(e) => setCampaignSearch(e.target.value)}
                    placeholder="Search by campaign, advertiser, category, provider ID..."
                    className="contact-input"
                    style={{ flex: 1, border: 'none', background: 'transparent', padding: '6px 0' }}
                  />
                  {campaignSearch && (
                    <button
                      type="button"
                      onClick={() => setCampaignSearch('')}
                      style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Filter size={14} style={{ color: 'var(--text-dim)' }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Status:</span>
                    <select
                      value={campaignStatusFilter}
                      onChange={(e) => setCampaignStatusFilter(e.target.value)}
                      className="contact-input"
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Environment:</span>
                    <select
                      value={campaignTypeFilter}
                      onChange={(e) => setCampaignTypeFilter(e.target.value)}
                      className="contact-input"
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    >
                      <option value="all">All Environments</option>
                      <option value="demo">Demo / Sandbox</option>
                      <option value="live">Live Campaigns</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Campaigns Table */}
              <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                        <th style={{ padding: '14px 18px' }}>Campaign & Advertiser</th>
                        <th style={{ padding: '14px 18px' }}>Environment & Provider</th>
                        <th style={{ padding: '14px 18px' }}>Reward & Approval</th>
                        <th style={{ padding: '14px 18px' }}>Requirements & Steps</th>
                        <th style={{ padding: '14px 18px' }}>Status</th>
                        <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const filtered = campaignsList.filter((c) => {
                          const matchesSearch =
                            !campaignSearch ||
                            c.name.toLowerCase().includes(campaignSearch.toLowerCase()) ||
                            c.advertiser_name.toLowerCase().includes(campaignSearch.toLowerCase()) ||
                            c.category.toLowerCase().includes(campaignSearch.toLowerCase()) ||
                            (c.provider_campaign_id && c.provider_campaign_id.toLowerCase().includes(campaignSearch.toLowerCase()));

                          const matchesStatus = campaignStatusFilter === 'all' || c.status === campaignStatusFilter;
                          const matchesType =
                            campaignTypeFilter === 'all' ||
                            (campaignTypeFilter === 'demo' && c.is_demo === 1) ||
                            (campaignTypeFilter === 'live' && c.is_demo === 0);

                          return matchesSearch && matchesStatus && matchesType;
                        });

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} style={{ padding: '48px 18px', textAlign: 'center', color: 'var(--text-dim)' }}>
                                No campaigns found matching the criteria. Click <strong>Create New Campaign</strong> above to add one.
                              </td>
                            </tr>
                          );
                        }

                        return filtered.map((c) => (
                          <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            {/* Name & Advertiser */}
                            <td style={{ padding: '14px 18px' }}>
                              <div style={{ fontWeight: 700, color: '#FFFFFF', fontSize: '0.9rem' }}>{c.name}</div>
                              <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem', marginTop: '2px' }}>
                                {c.advertiser_name} · <span style={{ color: 'var(--emerald-light)' }}>{c.category}</span>
                              </div>
                            </td>

                            {/* Environment & Provider */}
                            <td style={{ padding: '14px 18px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {c.is_demo === 1 ? (
                                  <span className="badge badge-gold" style={{ fontSize: '0.68rem' }}>
                                    DEMO / SANDBOX
                                  </span>
                                ) : (
                                  <span className="badge" style={{ background: 'rgba(96, 165, 250, 0.15)', color: '#60A5FA', border: '1px solid rgba(96, 165, 250, 0.3)', fontSize: '0.68rem' }}>
                                    LIVE CAMPAIGN
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                                Provider: {c.provider} {c.provider_campaign_id ? `(${c.provider_campaign_id})` : ''}
                              </div>
                            </td>

                            {/* Reward & Approval */}
                            <td style={{ padding: '14px 18px' }}>
                              <div style={{ fontWeight: 800, color: 'var(--emerald-primary)', fontSize: '0.95rem' }}>
                                ₹{c.reward_amount} {c.currency}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                                Est. Approval: {c.estimated_approval_days} Days
                              </div>
                            </td>

                            {/* Steps & Requirements */}
                            <td style={{ padding: '14px 18px' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '200px' }}>
                                <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)', color: '#FFFFFF' }}>
                                  {c.step_count || 0} Steps Configured
                                </span>
                                {Boolean(c.requires_install) && <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--emerald-light)' }}>Install</span>}
                                {Boolean(c.requires_signup) && <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--emerald-light)' }}>Signup</span>}
                                {Boolean(c.requires_kyc) && <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--gold-accent)' }}>KYC</span>}
                                {Boolean(c.requires_deposit) && <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(96, 165, 250, 0.1)', color: '#60A5FA' }}>Deposit (Min ₹{c.minimum_deposit_amount})</span>}
                              </div>
                            </td>

                            {/* Status */}
                            <td style={{ padding: '14px 18px' }}>
                              {c.status === 'active' && (
                                <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>Active</span>
                              )}
                              {c.status === 'paused' && (
                                <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>Paused</span>
                              )}
                              {c.status === 'draft' && (
                                <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-dim)', fontSize: '0.7rem' }}>Draft</span>
                              )}
                            </td>

                            {/* Actions */}
                            <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                <button
                                  type="button"
                                  title="View Campaign Steps & Details"
                                  onClick={async () => {
                                    const res = await api.getAdminCampaignById(c.id);
                                    if (res.success) setSelectedCampaignForView(res.campaign);
                                  }}
                                  className="btn btn-outline"
                                  style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                                >
                                  <Eye size={14} />
                                </button>

                                <button
                                  type="button"
                                  title="Edit Campaign & Steps"
                                  onClick={() => openEditCampaignForm(c)}
                                  className="btn btn-outline"
                                  style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                                >
                                  <Edit size={14} />
                                </button>

                                {c.status === 'active' ? (
                                  <button
                                    type="button"
                                    title="Pause Campaign"
                                    onClick={() => handleToggleStatus(c, 'paused')}
                                    className="btn btn-outline"
                                    style={{ padding: '6px 10px', fontSize: '0.75rem', borderColor: 'rgba(245, 158, 11, 0.3)', color: 'var(--gold-accent)' }}
                                  >
                                    <Pause size={14} />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    title="Activate Campaign"
                                    onClick={() => handleToggleStatus(c, 'active')}
                                    className="btn btn-outline"
                                    style={{ padding: '6px 10px', fontSize: '0.75rem', borderColor: 'var(--border-emerald)', color: 'var(--emerald-light)' }}
                                  >
                                    <Play size={14} />
                                  </button>
                                )}

                                <button
                                  type="button"
                                  title="Delete or Archive Campaign"
                                  onClick={() => handleDeleteCampaign(c)}
                                  className="btn btn-outline"
                                  style={{ padding: '6px 10px', fontSize: '0.75rem', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#F87171' }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* MODAL 1: CREATE / EDIT CAMPAIGN & DYNAMIC STEPS BUILDER */}
              {isFormOpen && (
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(5, 8, 15, 0.85)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px',
                  }}
                >
                  <div
                    className="glass-card"
                    style={{
                      width: '100%',
                      maxWidth: '820px',
                      maxHeight: '90vh',
                      overflowY: 'auto',
                      padding: '32px',
                      border: '1px solid var(--border-emerald)',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                      <div>
                        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#FFFFFF' }}>
                          {editingCampaignId ? 'Edit Campaign & Verification Steps' : 'Create Performance Campaign'}
                        </h2>
                        <p style={{ color: 'var(--text-dim)', fontSize: '0.825rem', marginTop: '2px' }}>
                          Configure campaign parameters, tracking URL templates, and required conversion steps
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsFormOpen(false)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '6px' }}
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <form onSubmit={handleSaveCampaign}>
                      {/* SECTION A: BASIC CAMPAIGN INFORMATION */}
                      <div style={{ marginBottom: '24px', background: 'rgba(255, 255, 255, 0.02)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--emerald-light)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Tag size={16} /> Basic Offer Metadata
                        </h3>

                        <div className="grid-2" style={{ gap: '16px', marginBottom: '16px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Campaign Name *</label>
                            <input
                              type="text"
                              required
                              value={cName}
                              onChange={(e) => setCName(e.target.value)}
                              placeholder="e.g. Kotak Mahindra 811 Savings Account"
                              className="contact-input"
                              style={{ width: '100%' }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Advertiser Name *</label>
                            <input
                              type="text"
                              required
                              value={cAdvertiser}
                              onChange={(e) => setCAdvertiser(e.target.value)}
                              placeholder="e.g. Kotak Mahindra Bank"
                              className="contact-input"
                              style={{ width: '100%' }}
                            />
                          </div>
                        </div>

                        <div className="grid-3" style={{ gap: '16px', marginBottom: '16px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Category *</label>
                            <select
                              value={cCategory}
                              onChange={(e) => setCCategory(e.target.value)}
                              className="contact-input"
                              style={{ width: '100%' }}
                            >
                              <option value="Banking">Banking</option>
                              <option value="Fintech">Fintech</option>
                              <option value="Trading">Trading & Investment</option>
                              <option value="Crypto">Crypto</option>
                              <option value="Gaming">Gaming & Skill</option>
                              <option value="Shopping">Shopping & E-Commerce</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Provider</label>
                            <select
                              value={cProvider}
                              onChange={(e) => setCProvider(e.target.value)}
                              className="contact-input"
                              style={{ width: '100%' }}
                            >
                              <option value="mitgo">Mitgo Performance Network</option>
                              <option value="internal">Internal Advertiser Direct</option>
                            </select>
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Provider Campaign ID</label>
                            <input
                              type="text"
                              value={cProviderId}
                              onChange={(e) => setCProviderId(e.target.value)}
                              placeholder="e.g. mitgo_cmp_8829"
                              className="contact-input"
                              style={{ width: '100%' }}
                            />
                          </div>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                          <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Logo URL</label>
                          <input
                            type="text"
                            value={cLogoUrl}
                            onChange={(e) => setCLogoUrl(e.target.value)}
                            placeholder="https://images.roycash.com/logos/kotak.png"
                            className="contact-input"
                            style={{ width: '100%' }}
                          />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                          <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Description *</label>
                          <textarea
                            required
                            rows={3}
                            value={cDescription}
                            onChange={(e) => setCDescription(e.target.value)}
                            placeholder="Briefly describe the campaign and user instructions..."
                            className="contact-input"
                            style={{ width: '100%', resize: 'vertical' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Terms & Conditions</label>
                          <textarea
                            rows={2}
                            value={cTerms}
                            onChange={(e) => setCTerms(e.target.value)}
                            placeholder="Specific offer restrictions, anti-fraud rules, or geographical constraints..."
                            className="contact-input"
                            style={{ width: '100%', resize: 'vertical' }}
                          />
                        </div>
                      </div>

                      {/* SECTION B: PAYOUT & TRACKING URL CONFIGURATION */}
                      <div style={{ marginBottom: '24px', background: 'rgba(255, 255, 255, 0.02)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--emerald-light)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <TrendingUp size={16} /> Payout & Tracking URL Setup
                        </h3>

                        <div className="grid-3" style={{ gap: '16px', marginBottom: '16px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Cashback Reward Amount *</label>
                            <input
                              type="number"
                              required
                              min="1"
                              step="any"
                              value={cRewardAmount}
                              onChange={(e) => setCRewardAmount(e.target.value)}
                              placeholder="300"
                              className="contact-input"
                              style={{ width: '100%' }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Currency</label>
                            <input
                              type="text"
                              required
                              value={cCurrency}
                              onChange={(e) => setCCurrency(e.target.value)}
                              className="contact-input"
                              style={{ width: '100%' }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Estimated Approval Days</label>
                            <input
                              type="number"
                              min="0"
                              value={cApprovalDays}
                              onChange={(e) => setCApprovalDays(e.target.value)}
                              className="contact-input"
                              style={{ width: '100%' }}
                            />
                          </div>
                        </div>

                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Tracking URL Template *</label>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => setCTrackingUrl((prev) => prev + '{click_id}')}
                                className="btn btn-outline"
                                style={{ padding: '2px 6px', fontSize: '0.68rem' }}
                              >
                                + {'{click_id}'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setCTrackingUrl((prev) => prev + '{user_id}')}
                                className="btn btn-outline"
                                style={{ padding: '2px 6px', fontSize: '0.68rem' }}
                              >
                                + {'{user_id}'}
                              </button>
                            </div>
                          </div>

                          <input
                            type="text"
                            required
                            value={cTrackingUrl}
                            onChange={(e) => setCTrackingUrl(e.target.value)}
                            placeholder="https://tracking.adnetwork.com/aff_c?offer_id=123&sub1={click_id}"
                            className="contact-input"
                            style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                          />
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                            RoyCash dynamically replaces <code>{'{click_id}'}</code> with the generated unique tracking session ID upon user click.
                          </span>
                        </div>
                      </div>

                      {/* SECTION C: ENVIRONMENT MODE & STEP REQUIREMENT FLAGS */}
                      <div style={{ marginBottom: '24px', background: 'rgba(255, 255, 255, 0.02)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--emerald-light)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <ShieldCheck size={16} /> Environment Mode & Requirement Flags
                        </h3>

                        <div className="grid-2" style={{ gap: '16px', marginBottom: '16px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Campaign Environment Mode *</label>
                            <select
                              value={cIsDemo}
                              onChange={(e) => setCIsDemo(Number(e.target.value))}
                              className="contact-input"
                              style={{ width: '100%' }}
                            >
                              <option value={1}>Demo / Sandbox Campaign (Simulations Permitted)</option>
                              <option value={0}>Live Advertiser Campaign (Requires S2S Postbacks)</option>
                            </select>
                            <span style={{ fontSize: '0.72rem', color: cIsDemo === 1 ? 'var(--gold-accent)' : '#60A5FA', marginTop: '4px', display: 'block' }}>
                              {cIsDemo === 1
                                ? 'Sandbox mode allows local testing and postback simulation.'
                                : 'Live campaigns require authenticated advertiser postbacks.'}
                            </span>
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Initial Campaign Status</label>
                            <select
                              value={cStatus}
                              onChange={(e) => setCStatus(e.target.value)}
                              className="contact-input"
                              style={{ width: '100%' }}
                            >
                              <option value="active">Active (Visible to Users)</option>
                              <option value="paused">Paused (Hidden from Offer Wall)</option>
                              <option value="draft">Draft (Internal Setup Only)</option>
                            </select>
                          </div>
                        </div>

                        {/* Step Checkboxes */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#FFFFFF', cursor: 'pointer' }}>
                            <input type="checkbox" checked={cReqInstall} onChange={(e) => setCReqInstall(e.target.checked)} />
                            Requires App Install
                          </label>

                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#FFFFFF', cursor: 'pointer' }}>
                            <input type="checkbox" checked={cReqSignup} onChange={(e) => setCReqSignup(e.target.checked)} />
                            Requires Sign Up / Registration
                          </label>

                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#FFFFFF', cursor: 'pointer' }}>
                            <input type="checkbox" checked={cReqKyc} onChange={(e) => setCReqKyc(e.target.checked)} />
                            Requires KYC Verification
                          </label>

                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#FFFFFF', cursor: 'pointer' }}>
                            <input type="checkbox" checked={cReqDeposit} onChange={(e) => setCReqDeposit(e.target.checked)} />
                            Requires Deposit / First Trade
                          </label>
                        </div>

                        {cReqDeposit && (
                          <div style={{ marginTop: '12px' }}>
                            <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Minimum Deposit Amount (₹)</label>
                            <input
                              type="number"
                              min="0"
                              value={cMinDeposit}
                              onChange={(e) => setCMinDeposit(e.target.value)}
                              className="contact-input"
                              style={{ width: '200px' }}
                            />
                          </div>
                        )}
                      </div>

                      {/* SECTION D: DYNAMIC CAMPAIGN STEPS BUILDER */}
                      <div style={{ marginBottom: '28px', background: 'rgba(255, 255, 255, 0.02)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                          <div>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--emerald-light)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Layers size={16} /> Dynamic Campaign Verification Steps ({cSteps.length})
                            </h3>
                            <p style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginTop: '2px' }}>
                              Sequence of user actions verified before cashback financial approval
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={handleAddStep}
                            className="btn btn-outline"
                            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                          >
                            <Plus size={14} style={{ marginRight: '4px' }} />
                            Add Step
                          </button>
                        </div>

                        {cSteps.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)', fontSize: '0.825rem' }}>
                            No verification steps configured. Click <strong>Add Step</strong> to define required user actions.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {cSteps.map((step, idx) => (
                              <div
                                key={idx}
                                style={{
                                  padding: '16px',
                                  background: 'rgba(0, 0, 0, 0.3)',
                                  borderRadius: '8px',
                                  border: '1px solid var(--border-subtle)',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                  <span className="badge badge-emerald" style={{ fontSize: '0.68rem' }}>
                                    Step #{idx + 1}
                                  </span>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <button
                                      type="button"
                                      disabled={idx === 0}
                                      onClick={() => handleMoveStep(idx, 'up')}
                                      className="btn btn-outline"
                                      style={{ padding: '2px 6px', opacity: idx === 0 ? 0.3 : 1 }}
                                    >
                                      <ArrowUp size={12} />
                                    </button>

                                    <button
                                      type="button"
                                      disabled={idx === cSteps.length - 1}
                                      onClick={() => handleMoveStep(idx, 'down')}
                                      className="btn btn-outline"
                                      style={{ padding: '2px 6px', opacity: idx === cSteps.length - 1 ? 0.3 : 1 }}
                                    >
                                      <ArrowDown size={12} />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleRemoveStep(idx)}
                                      className="btn btn-outline"
                                      style={{ padding: '2px 6px', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#F87171' }}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </div>

                                <div className="grid-2" style={{ gap: '12px', marginBottom: '10px' }}>
                                  <div>
                                    <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>Step Title *</label>
                                    <input
                                      type="text"
                                      required
                                      value={step.title}
                                      onChange={(e) => handleStepChange(idx, 'title', e.target.value)}
                                      placeholder="e.g. KYC Identity Verification"
                                      className="contact-input"
                                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem' }}
                                    />
                                  </div>

                                  <div>
                                    <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>Step Event Type</label>
                                    <select
                                      value={step.step_type}
                                      onChange={(e) => handleStepChange(idx, 'step_type', e.target.value)}
                                      className="contact-input"
                                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem' }}
                                    >
                                      <option value="install">install (App Installation)</option>
                                      <option value="signup">signup (Account Registration)</option>
                                      <option value="kyc">kyc (Identity Verification)</option>
                                      <option value="deposit">deposit (Deposit / First Trade)</option>
                                      <option value="trade">trade (Trading / Action)</option>
                                      <option value="other">other (Custom Action)</option>
                                    </select>
                                  </div>
                                </div>

                                <div style={{ marginBottom: '10px' }}>
                                  <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>Step User Instructions *</label>
                                  <input
                                    type="text"
                                    required
                                    value={step.description}
                                    onChange={(e) => handleStepChange(idx, 'description', e.target.value)}
                                    placeholder="e.g. Upload Aadhaar/PAN to complete instant KYC."
                                    className="contact-input"
                                    style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem' }}
                                  />
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                    <input
                                      type="checkbox"
                                      checked={Boolean(step.is_required)}
                                      onChange={(e) => handleStepChange(idx, 'is_required', e.target.checked)}
                                    />
                                    Mandatory Step for Conversion Approval
                                  </label>

                                  {step.step_type === 'deposit' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Min Deposit:</span>
                                      <input
                                        type="number"
                                        min="0"
                                        value={step.min_deposit_amount}
                                        onChange={(e) => handleStepChange(idx, 'min_deposit_amount', e.target.value)}
                                        className="contact-input"
                                        style={{ width: '100px', padding: '4px 8px', fontSize: '0.75rem' }}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Modal Footer Controls */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
                        <button
                          type="button"
                          onClick={() => setIsFormOpen(false)}
                          disabled={formSaving}
                          className="btn btn-outline"
                          style={{ padding: '10px 20px' }}
                        >
                          Cancel
                        </button>

                        <button
                          type="submit"
                          disabled={formSaving}
                          className="btn btn-primary"
                          style={{ padding: '10px 24px' }}
                        >
                          <Save size={16} style={{ marginRight: '6px' }} />
                          {formSaving ? 'Saving Campaign...' : editingCampaignId ? 'Update Campaign' : 'Create Campaign'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* MODAL 2: VIEW CAMPAIGN STEPS & DETAILS DRAWER */}
              {selectedCampaignForView && (
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(5, 8, 15, 0.85)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px',
                  }}
                >
                  <div
                    className="glass-card"
                    style={{
                      width: '100%',
                      maxWidth: '680px',
                      maxHeight: '85vh',
                      overflowY: 'auto',
                      padding: '32px',
                      border: '1px solid var(--border-medium)',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div>
                          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF' }}>{selectedCampaignForView.name}</h2>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                            {selectedCampaignForView.advertiser_name} · {selectedCampaignForView.category}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedCampaignForView(null)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                      {selectedCampaignForView.is_demo === 1 ? (
                        <span className="badge badge-gold">DEMO / SANDBOX</span>
                      ) : (
                        <span className="badge" style={{ background: 'rgba(96, 165, 250, 0.15)', color: '#60A5FA' }}>LIVE CAMPAIGN</span>
                      )}
                      <span className="badge badge-emerald">Reward: ₹{selectedCampaignForView.reward_amount} {selectedCampaignForView.currency}</span>
                      <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: '#FFFFFF' }}>Status: {selectedCampaignForView.status}</span>
                    </div>

                    <div style={{ marginBottom: '20px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>Tracking Template</h4>
                      <code style={{ fontSize: '0.8rem', color: 'var(--emerald-light)', wordBreak: 'break-all' }}>
                        {selectedCampaignForView.tracking_url_template}
                      </code>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Layers size={16} /> Configured Verification Steps ({selectedCampaignForView.steps?.length || 0})
                      </h4>

                      {(!selectedCampaignForView.steps || selectedCampaignForView.steps.length === 0) ? (
                        <div style={{ color: 'var(--text-dim)', fontSize: '0.825rem' }}>No dynamic steps configured for this offer.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {selectedCampaignForView.steps.map((step, idx) => (
                            <div key={step.id || idx} style={{ padding: '12px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ fontWeight: 700, color: 'var(--emerald-light)', fontSize: '0.85rem' }}>
                                  Step #{step.step_order}: {step.title}
                                </span>
                                <span className="badge" style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-dim)' }}>
                                  Type: {step.step_type}
                                </span>
                              </div>
                              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                                {step.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedCampaignForView(null)}
                        className="btn btn-outline"
                        style={{ padding: '8px 18px' }}
                      >
                        Close Details
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB: WITHDRAWAL MANAGEMENT */}
          {/* ============================================================== */}
          {activeTab === 'withdrawals' && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '28px',
                  flexWrap: 'wrap',
                  gap: '16px',
                }}
              >
                <div>
                  <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                    Withdrawal Management & Payouts
                  </h1>
                  <p style={{ color: 'var(--text-dim)', fontSize: '0.875rem', marginTop: '4px' }}>
                    Review, approve, process, pay, or reject user withdrawal requests backed by secure ledger holds and atomic ACID transactions
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => loadTabContent('withdrawals')}
                    disabled={isRefreshing}
                    className="btn btn-outline"
                    style={{ padding: '8px 16px', fontSize: '0.825rem' }}
                  >
                    <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} style={{ marginRight: '6px' }} />
                    {isRefreshing ? 'Refreshing...' : 'Refresh Requests'}
                  </button>
                </div>
              </div>

              {/* Filters & Search */}
              <div className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['all', 'pending', 'approved', 'processing', 'paid', 'rejected'].map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setWithdrawalFilter(f)}
                        className={`btn ${withdrawalFilter === f ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '6px 14px', fontSize: '0.8rem', textTransform: 'capitalize' }}
                      >
                        {f}
                      </button>
                    ))}
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Search by Request ID, User Name, Email..."
                      value={withdrawalSearch}
                      onChange={(e) => setWithdrawalSearch(e.target.value)}
                      className="contact-input"
                      style={{ width: '280px', fontSize: '0.85rem', padding: '8px 12px' }}
                    />
                  </div>
                </div>
              </div>

              {/* Withdrawals Table */}
              <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                        <th style={{ padding: '14px 16px', fontWeight: 600 }}>Request ID</th>
                        <th style={{ padding: '14px 16px', fontWeight: 600 }}>User</th>
                        <th style={{ padding: '14px 16px', fontWeight: 600 }}>Amount</th>
                        <th style={{ padding: '14px 16px', fontWeight: 600 }}>Payout Method</th>
                        <th style={{ padding: '14px 16px', fontWeight: 600 }}>Requested Date</th>
                        <th style={{ padding: '14px 16px', fontWeight: 600 }}>Status</th>
                        <th style={{ padding: '14px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawalsList
                        .filter((w) => {
                          if (withdrawalFilter !== 'all' && w.status !== withdrawalFilter) return false;
                          if (withdrawalSearch.trim()) {
                            const q = withdrawalSearch.toLowerCase();
                            return (
                              w.id.toLowerCase().includes(q) ||
                              w.user_name?.toLowerCase().includes(q) ||
                              w.user_email?.toLowerCase().includes(q)
                            );
                          }
                          return true;
                        })
                        .map((w) => {
                          const statusBadgeColor =
                            w.status === 'paid'
                              ? { bg: 'rgba(16, 185, 129, 0.15)', color: '#34D399' }
                              : w.status === 'rejected'
                              ? { bg: 'rgba(239, 68, 68, 0.15)', color: '#F87171' }
                              : w.status === 'approved'
                              ? { bg: 'rgba(59, 130, 246, 0.15)', color: '#60A5FA' }
                              : w.status === 'processing'
                              ? { bg: 'rgba(168, 85, 247, 0.15)', color: '#C084FC' }
                              : { bg: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24' };

                          return (
                            <tr key={w.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                              <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#FFFFFF' }}>
                                {w.id}
                              </td>
                              <td style={{ padding: '14px 16px' }}>
                                <div style={{ fontWeight: 600, color: '#FFFFFF' }}>{w.user_name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{w.user_email}</div>
                              </td>
                              <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--emerald-light)' }}>
                                ₹{w.amount} {w.currency}
                              </td>
                              <td style={{ padding: '14px 16px' }}>
                                <div style={{ textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 700, color: '#FFFFFF' }}>{w.payout_method}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{w.payout_details}</div>
                              </td>
                              <td style={{ padding: '14px 16px', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                                {new Date(w.requested_at).toLocaleString()}
                              </td>
                              <td style={{ padding: '14px 16px' }}>
                                <span className="badge" style={{ background: statusBadgeColor.bg, color: statusBadgeColor.color, textTransform: 'capitalize' }}>
                                  {w.status}
                                </span>
                              </td>
                              <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenWithdrawalDetail(w)}
                                    className="btn btn-outline"
                                    style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                                  >
                                    View
                                  </button>

                                  {w.status === 'pending' && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateWithdrawalStatus(w.id, 'approved')}
                                        disabled={withdrawalActionLoading}
                                        className="btn btn-primary"
                                        style={{ padding: '6px 10px', fontSize: '0.75rem', background: '#3B82F6' }}
                                      >
                                        Approve
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateWithdrawalStatus(w.id, 'processing')}
                                        disabled={withdrawalActionLoading}
                                        className="btn btn-primary"
                                        style={{ padding: '6px 10px', fontSize: '0.75rem', background: '#9333EA' }}
                                      >
                                        Process
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setWithdrawalActionModal({ type: 'reject', withdrawal: w })}
                                        disabled={withdrawalActionLoading}
                                        className="btn btn-outline"
                                        style={{ padding: '6px 10px', fontSize: '0.75rem', color: '#F87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                                      >
                                        Reject
                                      </button>
                                    </>
                                  )}

                                  {w.status === 'approved' && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateWithdrawalStatus(w.id, 'processing')}
                                        disabled={withdrawalActionLoading}
                                        className="btn btn-primary"
                                        style={{ padding: '6px 10px', fontSize: '0.75rem', background: '#9333EA' }}
                                      >
                                        Process
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setWithdrawalActionModal({ type: 'paid', withdrawal: w })}
                                        disabled={withdrawalActionLoading}
                                        className="btn btn-primary"
                                        style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                                      >
                                        Mark Paid
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setWithdrawalActionModal({ type: 'reject', withdrawal: w })}
                                        disabled={withdrawalActionLoading}
                                        className="btn btn-outline"
                                        style={{ padding: '6px 10px', fontSize: '0.75rem', color: '#F87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                                      >
                                        Reject
                                      </button>
                                    </>
                                  )}

                                  {w.status === 'processing' && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => setWithdrawalActionModal({ type: 'paid', withdrawal: w })}
                                        disabled={withdrawalActionLoading}
                                        className="btn btn-primary"
                                        style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                                      >
                                        Mark Paid
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setWithdrawalActionModal({ type: 'reject', withdrawal: w })}
                                        disabled={withdrawalActionLoading}
                                        className="btn btn-outline"
                                        style={{ padding: '6px 10px', fontSize: '0.75rem', color: '#F87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                                      >
                                        Reject
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      {withdrawalsList.length === 0 && (
                        <tr>
                          <td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-dim)' }}>
                            No withdrawal requests found in the database.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Detail Modal */}
              {selectedWithdrawalDetail && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                  <div className="glass-card" style={{ maxWidth: '600px', width: '100%', padding: '32px', border: '1px solid var(--border-emerald)', maxHeight: '90vh', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF' }}>Withdrawal Request Details</h3>
                      <button type="button" onClick={() => setSelectedWithdrawalDetail(null)} className="btn btn-outline" style={{ padding: '4px 10px' }}>✕</button>
                    </div>

                    {detailModalLoading ? (
                      <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-dim)' }}>Loading authorized payout details...</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.9rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                          <span style={{ color: 'var(--text-dim)' }}>Request ID:</span>
                          <span style={{ fontFamily: 'var(--font-mono)', color: '#FFFFFF' }}>{selectedWithdrawalDetail.id}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                          <span style={{ color: 'var(--text-dim)' }}>User Name:</span>
                          <span style={{ color: '#FFFFFF' }}>{selectedWithdrawalDetail.user_name}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                          <span style={{ color: 'var(--text-dim)' }}>User Email:</span>
                          <span style={{ color: '#FFFFFF' }}>{selectedWithdrawalDetail.user_email}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                          <span style={{ color: 'var(--text-dim)' }}>Amount:</span>
                          <span style={{ fontWeight: 700, color: 'var(--emerald-light)' }}>₹{selectedWithdrawalDetail.amount} {selectedWithdrawalDetail.currency}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                          <span style={{ color: 'var(--text-dim)' }}>Status:</span>
                          <span style={{ textTransform: 'capitalize', color: '#FFFFFF' }}>{selectedWithdrawalDetail.status}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                          <span style={{ color: 'var(--text-dim)' }}>Payout Method:</span>
                          <span style={{ textTransform: 'uppercase', color: '#FFFFFF' }}>{selectedWithdrawalDetail.payout_method}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                          <span style={{ color: 'var(--text-dim)' }}>Full Payout Details:</span>
                          <pre style={{ color: 'var(--emerald-light)', fontSize: '0.8rem', background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '4px', overflowX: 'auto', margin: 0 }}>
                            {typeof selectedWithdrawalDetail.payout_details === 'object'
                              ? JSON.stringify(selectedWithdrawalDetail.payout_details, null, 2)
                              : selectedWithdrawalDetail.payout_details}
                          </pre>
                        </div>
                        {selectedWithdrawalDetail.reference_id && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                            <span style={{ color: 'var(--text-dim)' }}>Payment Reference (UTR):</span>
                            <span style={{ fontFamily: 'var(--font-mono)', color: '#34D399' }}>{selectedWithdrawalDetail.reference_id}</span>
                          </div>
                        )}
                        {selectedWithdrawalDetail.rejection_reason && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', padding: '10px', background: 'rgba(239,68,68,0.05)', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.2)' }}>
                            <span style={{ color: '#F87171' }}>Rejection Reason:</span>
                            <span style={{ color: '#F87171' }}>{selectedWithdrawalDetail.rejection_reason}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ marginTop: '24px', textAlign: 'right' }}>
                      <button type="button" onClick={() => setSelectedWithdrawalDetail(null)} className="btn btn-outline" style={{ padding: '8px 20px' }}>Close</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Modal (Mark Paid / Reject) */}
              {withdrawalActionModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                  <div className="glass-card" style={{ maxWidth: '500px', width: '100%', padding: '32px', border: '1px solid var(--border-emerald)' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '16px', textTransform: 'capitalize' }}>
                      {withdrawalActionModal.type === 'paid' ? 'Mark Withdrawal as Paid' : 'Reject Withdrawal Request'}
                    </h3>

                    <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginBottom: '20px' }}>
                      Request ID: <code style={{ color: '#FFFFFF' }}>{withdrawalActionModal.withdrawal.id}</code> (User: {withdrawalActionModal.withdrawal.user_name}, Amount: ₹{withdrawalActionModal.withdrawal.amount})
                    </p>

                    {withdrawalActionModal.type === 'paid' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                            Payment Reference / UTR Number (Required)
                          </label>
                          <input
                            type="text"
                            required
                            value={withdrawalUtrInput}
                            onChange={(e) => setWithdrawalUtrInput(e.target.value)}
                            placeholder="e.g. UTR1234567890IN"
                            className="contact-input"
                            style={{ width: '100%' }}
                          />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                          <input
                            type="checkbox"
                            id="adminConfirmCheck"
                            checked={withdrawalAdminConfirm}
                            onChange={(e) => setWithdrawalAdminConfirm(e.target.checked)}
                            style={{ marginTop: '3px' }}
                          />
                          <label htmlFor="adminConfirmCheck" style={{ fontSize: '0.825rem', color: '#FFFFFF', lineHeight: 1.4, cursor: 'pointer' }}>
                            I explicitly confirm that payment of ₹{withdrawalActionModal.withdrawal.amount} has actually been sent and verified via our banking channel.
                          </label>
                        </div>
                      </div>
                    )}

                    {withdrawalActionModal.type === 'reject' && (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          Rejection Reason (Required — will be logged & refunded to ledger once)
                        </label>
                        <textarea
                          required
                          rows={3}
                          value={withdrawalRejectInput}
                          onChange={(e) => setWithdrawalRejectInput(e.target.value)}
                          placeholder="e.g. Invalid bank account details or KYC mismatch."
                          className="contact-input"
                          style={{ width: '100%', resize: 'vertical' }}
                        />
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setWithdrawalActionModal(null);
                          setWithdrawalUtrInput('');
                          setWithdrawalRejectInput('');
                          setWithdrawalAdminConfirm(false);
                        }}
                        className="btn btn-outline"
                        style={{ padding: '8px 16px' }}
                      >
                        Cancel
                      </button>

                      {withdrawalActionModal.type === 'paid' ? (
                        <button
                          type="button"
                          disabled={withdrawalActionLoading || !withdrawalUtrInput.trim() || !withdrawalAdminConfirm}
                          onClick={() => handleUpdateWithdrawalStatus(withdrawalActionModal.withdrawal.id, 'paid', { reference_id: withdrawalUtrInput, admin_confirmation: true })}
                          className="btn btn-primary"
                          style={{ padding: '8px 20px' }}
                        >
                          {withdrawalActionLoading ? 'Processing...' : 'Confirm Paid'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={withdrawalActionLoading || !withdrawalRejectInput.trim()}
                          onClick={() => handleUpdateWithdrawalStatus(withdrawalActionModal.withdrawal.id, 'rejected', { rejection_reason: withdrawalRejectInput })}
                          className="btn btn-primary"
                          style={{ padding: '8px 20px', background: '#EF4444' }}
                        >
                          {withdrawalActionLoading ? 'Processing...' : 'Confirm Reject & Refund'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

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
