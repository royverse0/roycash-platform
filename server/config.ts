import path from 'node:path';
import crypto from 'node:crypto';

export interface ServerConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  appUrl: string;
  isProd: boolean;
  admin: {
    sessionSecret: string;
    sessionExpiryHours: number;
    maxLoginAttempts: number;
    lockoutDurationMinutes: number;
    initialEmail?: string;
    initialPassword?: string;
    initialName?: string;
    setupToken?: string;
  };
  database: {
    dir: string;
    path: string;
  };
}

export const SETUP_TOKEN_PLACEHOLDERS = [
  'admin_setup_token_placeholder',
  'my_admin_setup_token',
  'change_me',
  'placeholder',
  'default_setup_token',
  'admin_setup_token',
  'secret_token',
  'your_admin_setup_token_here',
  'configured_strong_setup_token_9999',
  'configured_strong_setup_token',
  '12345678901234567890123456789012',
];

export function validateSetupTokenConfig(token: string | undefined): { valid: boolean; error?: string } {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'ADMIN_SETUP_TOKEN is missing or not configured.' };
  }
  const trimmed = token.trim();
  if (trimmed.length < 32) {
    return { valid: false, error: `ADMIN_SETUP_TOKEN is too weak. Length must be at least 32 characters (got ${trimmed.length}).` };
  }
  const lower = trimmed.toLowerCase();
  for (const placeholder of SETUP_TOKEN_PLACEHOLDERS) {
    if (lower === placeholder.toLowerCase() || lower.includes('placeholder') || lower.includes('change_me')) {
      return { valid: false, error: `ADMIN_SETUP_TOKEN uses forbidden placeholder '${placeholder}'.` };
    }
  }
  return { valid: true };
}

// Validate production secrets dynamically
export function validateProductionConfig(targetEnv?: string): void {
  const currentEnv = targetEnv || process.env.NODE_ENV;
  if (currentEnv === 'production') {
    const secret = process.env.ADMIN_SESSION_SECRET;
    if (!secret || secret.trim().length < 32 || secret === 'roycash_secure_admin_session_secret_2026') {
      const errorMsg =
        'FATAL CONFIGURATION ERROR: In production (NODE_ENV=production), ADMIN_SESSION_SECRET must be explicitly configured in the environment with a high-entropy secret of at least 32 characters. Default, fallback, or weak secrets are strictly rejected for production security.';
      console.error(`\n[SECURITY ALERT] ${errorMsg}\n`);
      throw new Error(errorMsg);
    }

    // In production, require strong ADMIN_SETUP_TOKEN of at least 32 chars without placeholders
    const setupTokenCheck = validateSetupTokenConfig(process.env.ADMIN_SETUP_TOKEN);
    if (!setupTokenCheck.valid) {
      const errorMsg = `FATAL CONFIGURATION ERROR: In production, ADMIN_SETUP_TOKEN must be configured with a high-entropy secret of at least 32 characters and cannot use placeholders. Details: ${setupTokenCheck.error}`;
      console.error(`\n[SECURITY ALERT] ${errorMsg}\n`);
      throw new Error(errorMsg);
    }
  }
}

const nodeEnv = (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development';
const isProd = nodeEnv === 'production';

// In development, generate an ephemeral random secret if not set to prevent hardcoded predictability
const devSecret =
  process.env.ADMIN_SESSION_SECRET ||
  crypto.randomBytes(32).toString('hex');

const dataDir = path.resolve(process.cwd(), 'data');
const dbPath = process.env.DATABASE_PATH || path.join(dataDir, 'roycash.sqlite');

export const config: ServerConfig = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  nodeEnv,
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  isProd,
  admin: {
    sessionSecret: isProd ? (process.env.ADMIN_SESSION_SECRET || '') : devSecret,
    sessionExpiryHours: process.env.ADMIN_SESSION_EXPIRY_HOURS ? parseInt(process.env.ADMIN_SESSION_EXPIRY_HOURS, 10) : 12,
    maxLoginAttempts: process.env.ADMIN_MAX_LOGIN_ATTEMPTS ? parseInt(process.env.ADMIN_MAX_LOGIN_ATTEMPTS, 10) : 5,
    lockoutDurationMinutes: process.env.ADMIN_LOCKOUT_MINUTES ? parseInt(process.env.ADMIN_LOCKOUT_MINUTES, 10) : 15,
    initialEmail: process.env.INITIAL_ADMIN_EMAIL || process.env.ADMIN_EMAIL,
    initialPassword: process.env.INITIAL_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD,
    initialName: process.env.INITIAL_ADMIN_NAME || process.env.ADMIN_NAME,
    setupToken: process.env.ADMIN_SETUP_TOKEN,
  },
  database: {
    dir: dataDir,
    path: dbPath,
  },
};

// Safe configuration summary for logging (sanitizes all credentials and secrets)
export function getSafeConfigSummary() {
  return {
    port: config.port,
    environment: config.nodeEnv,
    appUrl: config.appUrl,
    databasePath: config.database.path,
    sessionExpiryHours: config.admin.sessionExpiryHours,
    maxLoginAttempts: config.admin.maxLoginAttempts,
    lockoutMinutes: config.admin.lockoutDurationMinutes,
    hasSessionSecretConfigured: Boolean(process.env.ADMIN_SESSION_SECRET),
    hasInitialAdminEnvConfigured: Boolean(config.admin.initialEmail && config.admin.initialPassword),
    hasSetupToken: Boolean(config.admin.setupToken),
  };
}
