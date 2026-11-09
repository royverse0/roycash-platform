import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { db, hashPassword, verifyPassword, hashToken, logAdminActivity } from './db.js';
import { config, validateSetupTokenConfig } from './config.js';

export const adminAuthRouter = Router();

export interface AdminRequest extends Request {
  admin?: {
    id: string;
    username: string;
    email: string;
    name: string;
    role: string;
    status: string;
  };
  adminSessionId?: string;
}

// Client IP resolver helper
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

// Admin Authentication Middleware: extracts & validates session ONLY from HttpOnly cookie
export function adminAuthMiddleware(req: AdminRequest, res: Response, next: NextFunction) {
  // STRICT SECURITY: Accept admin authentication exclusively through secure HttpOnly session cookie
  const token = req.cookies?.roycash_admin_token;

  if (!token) {
    return next();
  }

  try {
    const hashed = hashToken(token);
    const session = db.prepare(`
      SELECT s.id as session_id, s.expires_at, a.id, a.username, a.email, a.name, a.role, a.status
      FROM admin_sessions s
      JOIN admins a ON s.admin_id = a.id
      WHERE s.token_hash = ?
    `).get(hashed) as {
      session_id: string;
      expires_at: string;
      id: string;
      username: string;
      email: string;
      name: string;
      role: string;
      status: string;
    } | undefined;

    if (session) {
      const isExpired = new Date(session.expires_at) <= new Date();
      if (!isExpired && session.status === 'active') {
        req.admin = {
          id: session.id,
          username: session.username,
          email: session.email,
          name: session.name,
          role: session.role,
          status: session.status,
        };
        req.adminSessionId = session.session_id;
      }
    }
  } catch (err) {
    console.error('[Admin Auth] Error validating session:', err);
  }

  next();
}

// Require valid admin authentication guard
export function requireAdminAuth(req: AdminRequest, res: Response, next: NextFunction) {
  if (!req.admin) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized. Admin authentication required.',
    });
  }
  next();
}

// Require superadmin role guard
export function requireSuperAdmin(req: AdminRequest, res: Response, next: NextFunction) {
  if (!req.admin || req.admin.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden. Superadmin privileges required.',
    });
  }
  next();
}

// =========================================================================
// PUBLIC ADMIN AUTH ENDPOINTS
// =========================================================================

// 1. Check admin system status (whether initial admin setup is required)
adminAuthRouter.get('/status', (req: AdminRequest, res: Response) => {
  try {
    const countRow = db.prepare('SELECT COUNT(*) as count FROM admins').get() as { count: number };
    const needsInitialSetup = countRow.count === 0;

    res.json({
      success: true,
      needs_initial_setup: needsInitialSetup,
      authenticated: Boolean(req.admin),
      admin: req.admin || null,
      requires_setup_token: Boolean(config.admin.setupToken),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to inspect admin system status' });
  }
});

// Rate limiting tracker for setup attempts
const setupAttempts = new Map<string, { count: number; resetAt: number }>();

function checkSetupRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = setupAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    setupAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 }); // 15 min window
    return true;
  }
  if (entry.count >= 5) {
    return false; // Exceeded 5 setup attempts per 15 min
  }
  entry.count++;
  return true;
}

// 2. One-time initial superadmin setup (strictly atomic, transaction-locked)
adminAuthRouter.post('/setup-initial', (req: Request, res: Response) => {
  const clientIp = getClientIp(req);
  const userAgent = (req.headers['user-agent'] as string) || 'browser';

  try {
    // Immediate check if initial setup is already completed
    const existingCount = (db.prepare('SELECT COUNT(*) as count FROM admins').get() as { count: number }).count;
    if (existingCount > 0) {
      return res.status(403).json({
        success: false,
        error: 'Initial admin setup has already been completed. This endpoint is permanently disabled.',
      });
    }

    // Rate limiting to prevent brute forcing setup token or flooding setup attempts
    if (!checkSetupRateLimit(clientIp)) {
      return res.status(429).json({
        success: false,
        error: 'Too many setup attempts from this IP address. Please try again after 15 minutes.',
      });
    }

    const { email, password, name, setup_token } = req.body;

    // Require setup authorization: In production, or whenever ADMIN_SETUP_TOKEN is configured
    const configuredToken = process.env.ADMIN_SETUP_TOKEN || config.admin.setupToken;
    const providedToken = setup_token || (req.headers['x-admin-setup-token'] as string | undefined);

    const currentEnv = process.env.NODE_ENV || (config.isProd ? 'production' : 'development');
    const isProductionMode = currentEnv === 'production';

    if (isProductionMode) {
      const tokenCheck = validateSetupTokenConfig(configuredToken);
      if (!tokenCheck.valid) {
        return res.status(503).json({
          success: false,
          error: 'Initial admin setup is disabled: ADMIN_SETUP_TOKEN is not configured or weak in production.',
        });
      }
      if (!providedToken || typeof providedToken !== 'string') {
        return res.status(401).json({
          success: false,
          error: 'Setup token is required for initial admin authorization.',
        });
      }
      const tokenBuf = Buffer.from(providedToken);
      const confBuf = Buffer.from(configuredToken!);
      if (tokenBuf.length !== confBuf.length || !crypto.timingSafeEqual(tokenBuf, confBuf)) {
        return res.status(401).json({
          success: false,
          error: 'Invalid admin setup token.',
        });
      }
    } else if (configuredToken) {
      // In development/test mode, if configuredToken is set, strictly enforce authorization
      if (!providedToken || typeof providedToken !== 'string') {
        return res.status(401).json({
          success: false,
          error: 'Setup token is required for initial admin authorization.',
        });
      }
      const tokenBuf = Buffer.from(providedToken);
      const confBuf = Buffer.from(configuredToken);
      if (tokenBuf.length !== confBuf.length || !crypto.timingSafeEqual(tokenBuf, confBuf)) {
        return res.status(401).json({
          success: false,
          error: 'Invalid admin setup token.',
        });
      }
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name && typeof name === 'string' ? name.trim() : 'Super Administrator') || 'Super Administrator';
    const username = cleanEmail.split('@')[0].replace(/[^a-z0-9_]/g, '') || 'admin';
    const adminId = `adm_${crypto.randomBytes(8).toString('hex')}`;
    const now = new Date().toISOString();

    const { hash, salt } = hashPassword(password);
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const tokenHashed = hashToken(sessionToken);
    const sessionId = `admsess_${crypto.randomBytes(10).toString('hex')}`;
    const expiresAt = new Date(Date.now() + config.admin.sessionExpiryHours * 3600 * 1000).toISOString();

    // ATOMIC SETUP: Execute inside BEGIN IMMEDIATE transaction to prevent concurrent race conditions
    db.exec('BEGIN IMMEDIATE;');
    try {
      const countRow = db.prepare('SELECT COUNT(*) as count FROM admins').get() as { count: number };
      if (countRow.count > 0) {
        db.exec('ROLLBACK;');
        return res.status(403).json({
          success: false,
          error: 'Initial admin setup has already been completed. This endpoint is permanently disabled.',
        });
      }

      db.prepare(`
        INSERT INTO admins (
          id, username, email, name, password_hash, salt, role, status,
          failed_attempts, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'superadmin', 'active', 0, ?, ?)
      `).run(adminId, username, cleanEmail, cleanName, hash, salt, now, now);

      db.prepare(`
        INSERT INTO admin_sessions (id, admin_id, token_hash, ip_address, user_agent, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(sessionId, adminId, tokenHashed, clientIp, userAgent, expiresAt, now);

      db.exec('COMMIT;');
    } catch (txErr) {
      db.exec('ROLLBACK;');
      throw txErr;
    }

    logAdminActivity(adminId, 'INITIAL_SUPERADMIN_CREATED', { email: cleanEmail, name: cleanName }, clientIp, userAgent);

    res.cookie('roycash_admin_token', sessionToken, {
      httpOnly: true,
      secure: config.isProd,
      sameSite: 'lax',
      maxAge: config.admin.sessionExpiryHours * 3600 * 1000,
      path: '/',
    });

    return res.status(201).json({
      success: true,
      message: 'Root administrator configured successfully.',
      admin: {
        id: adminId,
        username,
        email: cleanEmail,
        name: cleanName,
        role: 'superadmin',
      },
      expires_at: expiresAt,
    });
  } catch (err: any) {
    console.error('[Admin Setup Error]:', err);
    res.status(500).json({ success: false, error: 'Failed to complete initial admin setup.' });
  }
});

// 3. Admin Login with Rate Limiting & Account Lockout
adminAuthRouter.post('/login', (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;
    const clientIp = getClientIp(req);
    const userAgent = (req.headers['user-agent'] as string) || 'browser';

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide both username/email and password.',
      });
    }

    const cleanIdentifier = String(identifier).trim().toLowerCase();

    // Look up admin by email or username
    const admin = db.prepare(`
      SELECT id, username, email, name, password_hash, salt, role, status, failed_attempts, locked_until
      FROM admins
      WHERE LOWER(email) = ? OR LOWER(username) = ?
    `).get(cleanIdentifier, cleanIdentifier) as {
      id: string;
      username: string;
      email: string;
      name: string;
      password_hash: string;
      salt: string;
      role: string;
      status: string;
      failed_attempts: number;
      locked_until: string | null;
    } | undefined;

    if (!admin) {
      logAdminActivity(null, 'ADMIN_LOGIN_UNKNOWN_IDENTIFIER', { identifier: cleanIdentifier }, clientIp, userAgent);
      return res.status(401).json({
        success: false,
        error: 'Invalid administrator credentials.',
      });
    }

    // Check account status
    if (admin.status !== 'active') {
      logAdminActivity(admin.id, 'ADMIN_LOGIN_INACTIVE_ACCOUNT', { status: admin.status }, clientIp, userAgent);
      return res.status(403).json({
        success: false,
        error: `Account is ${admin.status}. Please contact system support.`,
      });
    }

    // Check lockout status
    if (admin.locked_until) {
      const lockExpiry = new Date(admin.locked_until);
      const now = new Date();
      if (lockExpiry > now) {
        const remainingSeconds = Math.ceil((lockExpiry.getTime() - now.getTime()) / 1000);
        const remainingMinutes = Math.ceil(remainingSeconds / 60);
        logAdminActivity(admin.id, 'ADMIN_LOGIN_BLOCKED_LOCKED_ACCOUNT', { remainingSeconds }, clientIp, userAgent);
        return res.status(429).json({
          success: false,
          error: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute(s).`,
          locked: true,
          retryAfterSeconds: remainingSeconds,
        });
      } else {
        // Lock has expired; reset failed attempts
        db.prepare('UPDATE admins SET failed_attempts = 0, locked_until = NULL WHERE id = ?').run(admin.id);
        admin.failed_attempts = 0;
        admin.locked_until = null;
      }
    }

    // Verify password with timingSafeEqual
    const isValid = verifyPassword(password, admin.password_hash, admin.salt);

    if (!isValid) {
      const newAttempts = (admin.failed_attempts || 0) + 1;
      let newLockedUntil: string | null = null;
      const now = new Date();

      if (newAttempts >= config.admin.maxLoginAttempts) {
        const lockMs = config.admin.lockoutDurationMinutes * 60 * 1000;
        newLockedUntil = new Date(Date.now() + lockMs).toISOString();
      }

      db.prepare(`
        UPDATE admins
        SET failed_attempts = ?, locked_until = ?, updated_at = ?
        WHERE id = ?
      `).run(newAttempts, newLockedUntil, now.toISOString(), admin.id);

      logAdminActivity(
        admin.id,
        newLockedUntil ? 'ADMIN_ACCOUNT_LOCKED' : 'ADMIN_LOGIN_PASSWORD_MISMATCH',
        { attempts: newAttempts, lockedUntil: newLockedUntil },
        clientIp,
        userAgent
      );

      if (newLockedUntil) {
        return res.status(429).json({
          success: false,
          error: `Too many failed attempts. Account has been temporarily locked for ${config.admin.lockoutDurationMinutes} minutes.`,
          locked: true,
          retryAfterSeconds: config.admin.lockoutDurationMinutes * 60,
        });
      }

      const attemptsRemaining = Math.max(0, config.admin.maxLoginAttempts - newAttempts);
      return res.status(401).json({
        success: false,
        error: `Invalid administrator credentials. ${attemptsRemaining} attempt(s) remaining before temporary lockout.`,
        attemptsRemaining,
      });
    }

    // Login successful: reset failed attempts & update last login
    const now = new Date();
    db.prepare(`
      UPDATE admins
      SET failed_attempts = 0, locked_until = NULL, last_login_at = ?, last_login_ip = ?, updated_at = ?
      WHERE id = ?
    `).run(now.toISOString(), clientIp, now.toISOString(), admin.id);

    // Create session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const tokenHashed = hashToken(sessionToken);
    const sessionId = `admsess_${crypto.randomBytes(10).toString('hex')}`;
    const expiresAt = new Date(Date.now() + config.admin.sessionExpiryHours * 3600 * 1000).toISOString();

    db.prepare(`
      INSERT INTO admin_sessions (id, admin_id, token_hash, ip_address, user_agent, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(sessionId, admin.id, tokenHashed, clientIp, userAgent, expiresAt, now.toISOString());

    logAdminActivity(admin.id, 'ADMIN_LOGIN_SUCCESS', { sessionId }, clientIp, userAgent);

    // Set secure httpOnly cookie
    res.cookie('roycash_admin_token', sessionToken, {
      httpOnly: true,
      secure: config.isProd,
      sameSite: 'lax',
      maxAge: config.admin.sessionExpiryHours * 3600 * 1000,
      path: '/',
    });

    return res.json({
      success: true,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
      expires_at: expiresAt,
    });
  } catch (err: any) {
    console.error('[Admin Login Error]:', err);
    res.status(500).json({ success: false, error: 'Internal server error during admin authentication.' });
  }
});

// 4. Admin Logout (destroys active session)
adminAuthRouter.post('/logout', (req: AdminRequest, res: Response) => {
  // Extract token strictly from HttpOnly cookie
  const token = req.cookies?.roycash_admin_token;

  const clientIp = getClientIp(req);
  const userAgent = (req.headers['user-agent'] as string) || 'browser';

  if (token) {
    try {
      const hashed = hashToken(token);
      db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(hashed);
    } catch (err) {
      console.error('[Admin Logout] Error deleting session:', err);
    }
  }

  if (req.admin) {
    logAdminActivity(req.admin.id, 'ADMIN_LOGOUT', { method: 'explicit_logout' }, clientIp, userAgent);
  }

  res.clearCookie('roycash_admin_token', {
    path: '/',
    httpOnly: true,
    secure: config.isProd,
    sameSite: 'lax',
  });
  res.json({ success: true, message: 'Admin session terminated successfully.' });
});

// =========================================================================
// PROTECTED ADMIN ENDPOINTS
// =========================================================================

// 5. Get current authenticated admin profile
adminAuthRouter.get('/me', requireAdminAuth, (req: AdminRequest, res: Response) => {
  const admin = req.admin!;
  try {
    const adminDetails = db.prepare(`
      SELECT id, username, email, name, role, status, last_login_at, last_login_ip, created_at
      FROM admins WHERE id = ?
    `).get(admin.id) as any;

    const sessionInfo = db.prepare(`
      SELECT expires_at, created_at, ip_address, user_agent
      FROM admin_sessions WHERE id = ?
    `).get(req.adminSessionId) as any;

    res.json({
      success: true,
      admin: adminDetails,
      session: sessionInfo,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to retrieve admin profile' });
  }
});

// 6. Admin Dashboard Status: Returns real backend health, DB connection, uptime, and stats
adminAuthRouter.get('/dashboard/status', requireAdminAuth, (req: AdminRequest, res: Response) => {
  try {
    // Database connection test & row counts
    const dbTest = db.prepare('SELECT 1 as alive').get() as { alive: number } | undefined;
    const isDbConnected = dbTest?.alive === 1;

    const adminsCount = (db.prepare('SELECT COUNT(*) as c FROM admins').get() as { c: number }).c;
    const activeSessionsCount = (db.prepare(`
      SELECT COUNT(*) as c FROM admin_sessions WHERE expires_at > datetime('now')
    `).get() as { c: number }).c;
    const activityLogsCount = (db.prepare('SELECT COUNT(*) as c FROM admin_activity_logs').get() as { c: number }).c;

    // Database file stats
    let dbFileSizeBytes = 0;
    try {
      const stats = fs.statSync(config.database.path);
      dbFileSizeBytes = stats.size;
    } catch {
      // Ignored
    }

    const uptimeSeconds = Math.floor(process.uptime());
    const memUsage = process.memoryUsage();

    res.json({
      success: true,
      milestone: {
        number: 1,
        title: 'Step 1: Backend Foundation & Admin Authentication',
        status: 'COMPLETED & VERIFIED',
      },
      system_status: {
        status: 'OPERATIONAL',
        environment: config.nodeEnv,
        uptime_seconds: uptimeSeconds,
        uptime_formatted: formatUptime(uptimeSeconds),
        node_version: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: {
          rss_mb: Math.round((memUsage.rss / 1024 / 1024) * 100) / 100,
          heap_used_mb: Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100,
          heap_total_mb: Math.round((memUsage.heapTotal / 1024 / 1024) * 100) / 100,
        },
      },
      database_status: {
        status: isDbConnected ? 'CONNECTED' : 'DISCONNECTED',
        driver: 'node:sqlite (DatabaseSync)',
        journal_mode: 'WAL',
        foreign_keys: 'ENABLED',
        database_file: config.database.path,
        size_bytes: dbFileSizeBytes,
        size_formatted: `${(dbFileSizeBytes / 1024).toFixed(1)} KB`,
        total_admins: adminsCount,
        active_admin_sessions: activeSessionsCount,
        total_activity_logs: activityLogsCount,
      },
      admin_account: {
        id: req.admin!.id,
        username: req.admin!.username,
        email: req.admin!.email,
        name: req.admin!.name,
        role: req.admin!.role,
      },
      server_time: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Dashboard Status Error]:', err);
    res.status(500).json({ success: false, error: 'Failed to inspect system status.' });
  }
});

// Helper for formatting uptime
function formatUptime(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

// 7. Get System Settings
adminAuthRouter.get('/settings', requireAdminAuth, (req: AdminRequest, res: Response) => {
  try {
    const settings = db.prepare(`
      SELECT key, value, description, updated_at, updated_by
      FROM system_settings
      WHERE is_secret = 0
      ORDER BY key ASC
    `).all();

    res.json({
      success: true,
      settings,
      environment: {
        nodeEnv: config.nodeEnv,
        port: config.port,
        appUrl: config.appUrl,
        sessionExpiryHours: config.admin.sessionExpiryHours,
        maxLoginAttempts: config.admin.maxLoginAttempts,
        lockoutDurationMinutes: config.admin.lockoutDurationMinutes,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to load system settings' });
  }
});

// 8. Update System Setting
adminAuthRouter.put('/settings', requireAdminAuth, (req: AdminRequest, res: Response) => {
  try {
    const { key, value } = req.body;
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ success: false, error: 'Setting key is required.' });
    }

    const cleanKey = key.trim();
    const cleanValue = String(value ?? '').trim();

    // Prevent modifying protected settings
    const existing = db.prepare('SELECT key, is_secret FROM system_settings WHERE key = ?').get(cleanKey) as {
      key: string;
      is_secret: number;
    } | undefined;

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Setting key does not exist.' });
    }

    const now = new Date().toISOString();
    const clientIp = getClientIp(req);
    const userAgent = (req.headers['user-agent'] as string) || 'browser';

    db.prepare(`
      UPDATE system_settings
      SET value = ?, updated_at = ?, updated_by = ?
      WHERE key = ?
    `).run(cleanValue, now, req.admin!.id, cleanKey);

    logAdminActivity(
      req.admin!.id,
      'SYSTEM_SETTING_UPDATED',
      { key: cleanKey, newValue: cleanValue },
      clientIp,
      userAgent
    );

    res.json({
      success: true,
      message: `Setting '${cleanKey}' updated successfully.`,
      setting: { key: cleanKey, value: cleanValue, updated_at: now },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update setting' });
  }
});

// 9. Get Admin Activity Logs
adminAuthRouter.get('/activity-logs', requireAdminAuth, (req: AdminRequest, res: Response) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 25));
    const logs = db.prepare(`
      SELECT l.id, l.admin_id, a.email as admin_email, a.name as admin_name, l.action, l.details, l.ip_address, l.created_at
      FROM admin_activity_logs l
      LEFT JOIN admins a ON l.admin_id = a.id
      ORDER BY l.created_at DESC
      LIMIT ?
    `).all(limit);

    res.json({
      success: true,
      logs,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to retrieve activity logs' });
  }
});

// 10. Update Admin Password
adminAuthRouter.put('/profile/password', requireAdminAuth, (req: AdminRequest, res: Response) => {
  try {
    const { current_password, new_password } = req.body;
    const clientIp = getClientIp(req);
    const userAgent = (req.headers['user-agent'] as string) || 'browser';

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        error: 'Both current password and new password are required.',
      });
    }

    if (typeof new_password !== 'string' || new_password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters long.',
      });
    }

    const admin = db.prepare('SELECT id, password_hash, salt FROM admins WHERE id = ?').get(req.admin!.id) as {
      id: string;
      password_hash: string;
      salt: string;
    };

    const isCurrentValid = verifyPassword(current_password, admin.password_hash, admin.salt);
    if (!isCurrentValid) {
      logAdminActivity(admin.id, 'ADMIN_PASSWORD_CHANGE_FAILED', { reason: 'invalid_current_password' }, clientIp, userAgent);
      return res.status(401).json({ success: false, error: 'Current password does not match.' });
    }

    const { hash, salt } = hashPassword(new_password);
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE admins
      SET password_hash = ?, salt = ?, updated_at = ?
      WHERE id = ?
    `).run(hash, salt, now, admin.id);

    // Invalidate all other active sessions for this admin except current one
    if (req.adminSessionId) {
      db.prepare('DELETE FROM admin_sessions WHERE admin_id = ? AND id != ?').run(admin.id, req.adminSessionId);
    }

    logAdminActivity(admin.id, 'ADMIN_PASSWORD_CHANGED_SUCCESS', {}, clientIp, userAgent);

    res.json({
      success: true,
      message: 'Password changed successfully. All other active sessions have been invalidated.',
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update password' });
  }
});
