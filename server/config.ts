import path from 'node:path';

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

const nodeEnv = (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development';
const isProd = nodeEnv === 'production';

const dataDir = path.resolve(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'roycash.sqlite');

export const config: ServerConfig = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  nodeEnv,
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  isProd,
  admin: {
    sessionSecret: process.env.ADMIN_SESSION_SECRET || 'roycash_secure_admin_session_secret_2026',
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

// Safe configuration summary for logging (sanitizes all credentials)
export function getSafeConfigSummary() {
  return {
    port: config.port,
    environment: config.nodeEnv,
    appUrl: config.appUrl,
    databasePath: config.database.path,
    sessionExpiryHours: config.admin.sessionExpiryHours,
    maxLoginAttempts: config.admin.maxLoginAttempts,
    lockoutMinutes: config.admin.lockoutDurationMinutes,
    hasInitialAdminEnvConfigured: Boolean(config.admin.initialEmail && config.admin.initialPassword),
    hasSetupToken: Boolean(config.admin.setupToken),
  };
}
