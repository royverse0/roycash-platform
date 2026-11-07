// RoyCash Client API Service

const BASE_URL = '/api';

async function request(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // General user token
  const token = localStorage.getItem('roycash_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Anti-CSRF protection header for server cookie verification
  headers['X-Requested-With'] = 'XMLHttpRequest';

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Public Health
  getHealth: () => request('/health'),

  // =========================================================
  // ADMIN AUTH & MANAGEMENT (STEP 1 MILESTONE)
  // =========================================================
  getAdminAuthStatus: () => request('/admin/status'),
  setupInitialAdmin: (payload) =>
    request('/admin/setup-initial', { method: 'POST', body: JSON.stringify(payload) }),
  adminLogin: (payload) =>
    request('/admin/login', { method: 'POST', body: JSON.stringify(payload) }),
  adminLogout: () => request('/admin/logout', { method: 'POST' }),
  getAdminMe: () => request('/admin/me'),
  getAdminDashboardStatus: () => request('/admin/dashboard/status'),
  getAdminSettings: () => request('/admin/settings'),
  updateAdminSetting: (payload) =>
    request('/admin/settings', { method: 'PUT', body: JSON.stringify(payload) }),
  getAdminActivityLogs: (limit = 25) => request(`/admin/activity-logs?limit=${limit}`),
  updateAdminPassword: (payload) =>
    request('/admin/profile/password', { method: 'PUT', body: JSON.stringify(payload) }),

  // User Auth
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  logoutAll: () => request('/auth/logout-all', { method: 'POST' }),
  getMe: () => request('/auth/me'),
  updateProfile: (payload) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(payload) }),

  // Campaigns & Offers
  getCampaigns: () => request('/campaigns'),
  getCampaign: (id) => request(`/campaigns/${id}`),
  clickOffer: (campaignId) =>
    request('/offers/click', { method: 'POST', body: JSON.stringify({ campaign_id: campaignId }) }),
  getTracking: (clickId) => request(`/offers/tracking/${clickId}`),
  getMyOffers: () => request('/user/my-offers'),

  // Dashboard & Wallet
  getDashboard: () => request('/user/dashboard'),
  getWallet: () => request('/user/wallet'),
  requestWithdrawal: (payload) => request('/user/withdraw', { method: 'POST', body: JSON.stringify(payload) }),
  getReferrals: () => request('/user/referrals'),

  // Support Tickets
  submitTicket: (payload) => request('/user/support/ticket', { method: 'POST', body: JSON.stringify(payload) }),
  getTickets: () => request('/user/support/tickets'),

  // Legacy/Future Admin Placeholders
  getAdminMetrics: () => request('/admin/metrics'),
  getAdminUsers: () => request('/admin/users'),
  getAdminWithdrawals: () => request('/admin/withdrawals'),
  updateWithdrawalStatus: (id, payload) =>
    request(`/admin/withdrawals/${id}/status`, { method: 'PUT', body: JSON.stringify(payload) }),
  getAdminTickets: () => request('/admin/tickets'),
  updateAdminTicket: (id, payload) =>
    request(`/admin/tickets/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  getAdminPostbackLogs: () => request('/admin/postback-logs'),
  getAdminProviderStatus: () => request('/admin/provider-status'),
  simulatePostback: (payload) =>
    request('/admin/simulate-postback', { method: 'POST', body: JSON.stringify(payload) }),
};
