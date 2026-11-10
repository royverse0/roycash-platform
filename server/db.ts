import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { config } from './config.js';

// Ensure data directory exists
if (!fs.existsSync(config.database.dir)) {
  fs.mkdirSync(config.database.dir, { recursive: true });
}

export const db = new DatabaseSync(config.database.path);

// Optimize database for transactional integrity & performance
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA synchronous = NORMAL;');

// Password hashing utility using Node.js built-in scrypt
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const testHash = crypto.scryptSync(password, salt, 64);
    const originalHash = Buffer.from(hash, 'hex');
    return crypto.timingSafeEqual(testHash, originalHash);
  } catch {
    return false;
  }
}

// Token hashing for secure session lookup (SHA-256)
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Audit logger for administrative actions
export function logAdminActivity(
  adminId: string | null,
  action: string,
  details: Record<string, unknown> | string,
  ipAddress?: string,
  userAgent?: string
) {
  try {
    const id = `log_${crypto.randomBytes(12).toString('hex')}`;
    const now = new Date().toISOString();
    const detailsStr = typeof details === 'string' ? details : JSON.stringify(details);

    db.prepare(`
      INSERT INTO admin_activity_logs (id, admin_id, action, details, ip_address, user_agent, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, adminId, action, detailsStr, ipAddress || 'internal', userAgent || 'server', now);
  } catch (err) {
    console.error('Failed to write admin activity log:', err);
  }
}

// Initialize database schema
export function initDatabase() {
  db.exec(`
    -- =========================================================
    -- MILESTONE 1 TABLES: ADMINS, SESSIONS, AUDIT, SETTINGS
    -- =========================================================

    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'superadmin',
      status TEXT NOT NULL DEFAULT 'active',
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT,
      last_login_at TEXT,
      last_login_ip TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
    CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
    CREATE INDEX IF NOT EXISTS idx_admins_status ON admins(status);

    CREATE TABLE IF NOT EXISTS admin_sessions (
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL,
      token_hash TEXT UNIQUE NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token_hash);
    CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin ON admin_sessions(admin_id);
    CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);

    CREATE TABLE IF NOT EXISTS admin_activity_logs (
      id TEXT PRIMARY KEY,
      admin_id TEXT,
      action TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_activity_logs(admin_id);
    CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_activity_logs(action);
    CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_activity_logs(created_at);

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      is_secret INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      updated_by TEXT,
      FOREIGN KEY (updated_by) REFERENCES admins(id) ON DELETE SET NULL
    );

    -- =========================================================
    -- CORE APPLICATION TABLES (PRESERVED FOR INTEGRATION)
    -- =========================================================

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      referral_code TEXT UNIQUE NOT NULL,
      referred_by_code TEXT,
      role TEXT DEFAULT 'user',
      upi_id TEXT,
      bank_account_number TEXT,
      bank_ifsc TEXT,
      bank_holder_name TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      user_agent TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL DEFAULT 'mitgo',
      provider_campaign_id TEXT,
      name TEXT NOT NULL,
      advertiser_name TEXT NOT NULL,
      category TEXT NOT NULL,
      logo_url TEXT,
      description TEXT NOT NULL,
      terms TEXT,
      reward_amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      tracking_url_template TEXT NOT NULL,
      estimated_approval_days INTEGER DEFAULT 30,
      is_demo INTEGER DEFAULT 1,
      status TEXT DEFAULT 'active',
      requires_install INTEGER DEFAULT 1,
      requires_signup INTEGER DEFAULT 1,
      requires_kyc INTEGER DEFAULT 0,
      requires_deposit INTEGER DEFAULT 0,
      minimum_deposit_amount REAL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS campaign_steps (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      step_order INTEGER NOT NULL,
      step_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      is_required INTEGER DEFAULT 1,
      min_deposit_amount REAL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS offer_clicks (
      click_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      campaign_id TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'mitgo',
      ip_address TEXT,
      user_agent TEXT,
      subid1 TEXT,
      subid2 TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS offer_events (
      id TEXT PRIMARY KEY,
      click_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      campaign_id TEXT NOT NULL,
      step_id TEXT,
      step_type TEXT NOT NULL,
      event_name TEXT NOT NULL,
      status TEXT NOT NULL,
      transaction_id TEXT,
      metadata TEXT,
      is_provider_verified INTEGER NOT NULL DEFAULT 0,
      verification_source TEXT DEFAULT 'unverified',
      verified_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (click_id) REFERENCES offer_clicks(click_id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (step_id) REFERENCES campaign_steps(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS conversions (
      id TEXT PRIMARY KEY,
      click_id TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL,
      campaign_id TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'mitgo',
      provider_conversion_id TEXT UNIQUE,
      status TEXT NOT NULL,
      reward_amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      rejection_reason TEXT,
      steps_completed TEXT,
      approved_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (click_id) REFERENCES offer_clicks(click_id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cashback_ledger (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      conversion_id TEXT,
      withdrawal_id TEXT,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      balance_type TEXT NOT NULL,
      status TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (conversion_id) REFERENCES conversions(id) ON DELETE SET NULL,
      FOREIGN KEY (withdrawal_id) REFERENCES withdrawal_requests(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS withdrawal_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      payout_method TEXT NOT NULL,
      payout_details TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      reference_id TEXT,
      rejection_reason TEXT,
      requested_at TEXT NOT NULL,
      processed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS referral_relationships (
      id TEXT PRIMARY KEY,
      referrer_user_id TEXT NOT NULL,
      referred_user_id TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL,
      FOREIGN KEY (referrer_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS referral_rewards (
      id TEXT PRIMARY KEY,
      relationship_id TEXT NOT NULL,
      referrer_user_id TEXT NOT NULL,
      referred_user_id TEXT NOT NULL,
      source_conversion_id TEXT,
      reward_amount REAL NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (relationship_id) REFERENCES referral_relationships(id) ON DELETE CASCADE,
      FOREIGN KEY (referrer_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (source_conversion_id) REFERENCES conversions(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS support_tickets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      click_id TEXT,
      campaign_id TEXT,
      category TEXT NOT NULL,
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      admin_notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS provider_integrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      is_live INTEGER DEFAULT 0,
      client_id TEXT,
      client_secret TEXT,
      api_token TEXT,
      postback_key TEXT,
      status TEXT DEFAULT 'configured',
      last_sync_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS postback_logs (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      method TEXT NOT NULL,
      payload TEXT NOT NULL,
      headers TEXT NOT NULL,
      click_id TEXT,
      transaction_id TEXT,
      event_type TEXT,
      status TEXT NOT NULL,
      response_code INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_type TEXT NOT NULL,
      actor_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Table column migrations for existing databases
  try {
    db.exec(`ALTER TABLE offer_events ADD COLUMN is_provider_verified INTEGER NOT NULL DEFAULT 0;`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE offer_events ADD COLUMN verification_source TEXT DEFAULT 'unverified';`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE offer_events ADD COLUMN step_id TEXT REFERENCES campaign_steps(id) ON DELETE SET NULL;`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`ALTER TABLE cashback_ledger ADD COLUMN withdrawal_id TEXT REFERENCES withdrawal_requests(id) ON DELETE SET NULL;`);
  } catch {
    // Column already exists
  }
  try {
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_refund_withdrawal ON cashback_ledger(withdrawal_id) WHERE type = 'admin_adjustment';`);
  } catch {
    // Index already exists
  }
  try {
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_withdrawal_reference_unique ON withdrawal_requests(reference_id) WHERE reference_id IS NOT NULL AND reference_id != '';`);
  } catch {
    // Index already exists
  }

  initSystemSettings();
  bootstrapInitialAdminFromEnv();
}

// Seed baseline system configuration if not already present
function initSystemSettings() {
  const now = new Date().toISOString();
  const baselineSettings = [
    { key: 'app_name', value: 'RoyCash', description: 'Application brand name', is_secret: 0 },
    { key: 'app_tagline', value: 'Earn Through Actions. Grow Through Referrals.', description: 'Brand tagline', is_secret: 0 },
    { key: 'platform_version', value: '1.0.0-step1', description: 'Current system version', is_secret: 0 },
    { key: 'current_milestone', value: 'Step 1: Backend Foundation & Admin Authentication', description: 'Active development phase', is_secret: 0 },
    { key: 'maintenance_mode', value: 'false', description: 'Global maintenance mode toggle', is_secret: 0 },
    { key: 'admin_session_hours', value: String(config.admin.sessionExpiryHours), description: 'Admin session duration in hours', is_secret: 0 },
    { key: 'max_login_attempts', value: String(config.admin.maxLoginAttempts), description: 'Failed login attempts before temporary lockout', is_secret: 0 },
  ];

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO system_settings (key, value, description, is_secret, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const s of baselineSettings) {
    insertStmt.run(s.key, s.value, s.description, s.is_secret, now);
  }
}

// Bootstrap initial admin if environment variables are provided and no admin exists
function bootstrapInitialAdminFromEnv() {
  const rowCount = db.prepare('SELECT COUNT(*) as count FROM admins').get() as { count: number };
  if (rowCount.count > 0) {
    return; // Already initialized, never overwrite
  }

  const email = config.admin.initialEmail;
  const password = config.admin.initialPassword;
  const name = config.admin.initialName || 'System Superadmin';

  if (email && password) {
    const now = new Date().toISOString();
    const { hash, salt } = hashPassword(password);
    const adminId = `adm_${crypto.randomBytes(8).toString('hex')}`;
    const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') || 'admin';

    db.prepare(`
      INSERT INTO admins (
        id, username, email, name, password_hash, salt, role, status,
        failed_attempts, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'superadmin', 'active', 0, ?, ?)
    `).run(adminId, username, email.toLowerCase(), name, hash, salt, now, now);

    logAdminActivity(adminId, 'ADMIN_INITIALIZED_VIA_ENV', { email, name, role: 'superadmin' });
    console.log(`[RoyCash Admin] Root administrator initialized via environment variables for ${email}`);
  }
}
