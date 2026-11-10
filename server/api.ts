import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { db, hashPassword, verifyPassword, logAdminActivity } from './db.js';

import { config } from './config.js';

export const apiRouter = Router();

// Middleware: Extract Authenticated User
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    referral_code: string;
  };
  admin?: {
    id: string;
    username: string;
    email: string;
    name: string;
    role: string;
  };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.roycash_token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return next();
  }

  try {
    const session = db.prepare(`
      SELECT s.id as session_id, s.expires_at, u.id, u.email, u.name, u.role, u.referral_code, u.status
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ?
    `).get(token) as any;

    if (session && new Date(session.expires_at) > new Date() && session.status === 'active') {
      req.user = {
        id: session.id,
        email: session.email,
        name: session.name,
        role: session.role,
        referral_code: session.referral_code,
      };
    }
  } catch (err) {
    console.error('Session lookup error:', err);
  }
  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required. Please log in.' });
  }
  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.admin) {
    return res.status(401).json({ success: false, error: 'Administrator authentication required.' });
  }
  next();
}

apiRouter.use(authMiddleware);

/* ==========================================================================
   1. AUTHENTICATION ROUTES
   ========================================================================== */

apiRouter.post('/auth/register', (req: Request, res: Response) => {
  try {
    const { name, email, phone, password, referral_code } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existing) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
    }

    // Generate unique referral code
    let userReferralCode = 'ROY' + crypto.randomBytes(3).toString('hex').toUpperCase();
    while (db.prepare('SELECT id FROM users WHERE referral_code = ?').get(userReferralCode)) {
      userReferralCode = 'ROY' + crypto.randomBytes(3).toString('hex').toUpperCase();
    }

    // Verify referrer if provided
    let referrerUserId: string | null = null;
    if (referral_code) {
      const refUser = db.prepare('SELECT id FROM users WHERE referral_code = ?').get(referral_code.trim().toUpperCase()) as any;
      if (refUser) {
        referrerUserId = refUser.id;
      }
    }

    const { hash, salt } = hashPassword(password);
    const userId = 'usr_' + crypto.randomBytes(8).toString('hex');
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, email, phone, name, password_hash, salt, referral_code, referred_by_code, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'user', ?, ?)
    `).run(userId, cleanEmail, phone || null, name.trim(), hash, salt, userReferralCode, referral_code || null, now, now);

    // Record referral relationship if valid
    if (referrerUserId && referrerUserId !== userId) {
      const relId = 'ref_' + crypto.randomBytes(8).toString('hex');
      db.prepare(`
        INSERT INTO referral_relationships (id, referrer_user_id, referred_user_id, created_at)
        VALUES (?, ?, ?, ?)
      `).run(relId, referrerUserId, userId, now);
    }

    // Create session
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare(`
      INSERT INTO sessions (id, user_id, token, user_agent, ip_address, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('sess_' + crypto.randomBytes(8).toString('hex'), userId, sessionToken, req.headers['user-agent'] || '', req.ip || '', now, expiresAt);

    res.cookie('roycash_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      user: {
        id: userId,
        email: cleanEmail,
        name: name.trim(),
        role: 'user',
        referral_code: userReferralCode,
      },
      token: sessionToken,
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ success: false, error: 'Registration failed: ' + err.message });
  }
});

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail) as any;

    if (!user || !verifyPassword(password, user.password_hash, user.salt)) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, error: 'Your account is suspended. Please contact support.' });
    }

    const sessionToken = crypto.randomBytes(32).toString('hex');
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO sessions (id, user_id, token, user_agent, ip_address, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('sess_' + crypto.randomBytes(8).toString('hex'), user.id, sessionToken, req.headers['user-agent'] || '', req.ip || '', now, expiresAt);

    res.cookie('roycash_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        referral_code: user.referral_code,
      },
      token: sessionToken,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, error: 'Login failed: ' + err.message });
  }
});

apiRouter.post('/auth/logout', (req: AuthenticatedRequest, res: Response) => {
  const token = req.cookies?.roycash_token || req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }
  res.clearCookie('roycash_token');
  return res.json({ success: true, message: 'Logged out successfully.' });
});

apiRouter.post('/auth/logout-all', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(req.user!.id);
  res.clearCookie('roycash_token');
  return res.json({ success: true, message: 'Logged out from all devices.' });
});

apiRouter.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = db.prepare(`
    SELECT id, email, phone, name, role, referral_code, upi_id, bank_account_number, bank_ifsc, bank_holder_name, created_at
    FROM users WHERE id = ?
  `).get(req.user!.id) as any;

  // Compute live wallet balances
  const balances = calculateUserBalances(req.user!.id);

  return res.json({
    success: true,
    user: {
      ...user,
      balances,
    },
  });
});

apiRouter.put('/auth/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, phone, upi_id, bank_account_number, bank_ifsc, bank_holder_name } = req.body;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE users
      SET name = COALESCE(?, name),
          phone = COALESCE(?, phone),
          upi_id = COALESCE(?, upi_id),
          bank_account_number = COALESCE(?, bank_account_number),
          bank_ifsc = COALESCE(?, bank_ifsc),
          bank_holder_name = COALESCE(?, bank_holder_name),
          updated_at = ?
      WHERE id = ?
    `).run(
      name?.trim() || null,
      phone?.trim() || null,
      upi_id?.trim() || null,
      bank_account_number?.trim() || null,
      bank_ifsc?.trim() || null,
      bank_holder_name?.trim() || null,
      now,
      req.user!.id
    );

    return res.json({ success: true, message: 'Profile updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Update failed: ' + err.message });
  }
});

/* ==========================================================================
   2. CAMPAIGNS & OFFERS
   ========================================================================== */

apiRouter.get('/campaigns', (req: Request, res: Response) => {
  try {
    const campaigns = db.prepare(`
      SELECT * FROM campaigns WHERE status = 'active' ORDER BY reward_amount DESC
    `).all() as any[];

    // Fetch steps for each campaign
    const getSteps = db.prepare('SELECT * FROM campaign_steps WHERE campaign_id = ? ORDER BY step_order ASC');
    const result = campaigns.map((c) => ({
      ...c,
      steps: getSteps.all(c.id),
      is_demo: Boolean(c.is_demo),
    }));

    // Provider status notice
    const provider = db.prepare('SELECT * FROM provider_integrations WHERE id = ?').get('mitgo') as any;

    return res.json({
      success: true,
      campaigns: result,
      provider: {
        name: provider?.name || 'Mitgo Integration',
        is_live: Boolean(provider?.is_live),
        status: provider?.status || 'awaiting_credentials',
        notice: provider?.is_live
          ? 'Connected to Live Mitgo Affiliate API'
          : 'Awaiting Live Mitgo Credentials — Operating in Verified Sandbox Mode',
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.get('/campaigns/:id', (req: Request, res: Response) => {
  try {
    const campaignId = String(req.params.id);
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId) as any;
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found.' });
    }
    const steps = db.prepare('SELECT * FROM campaign_steps WHERE campaign_id = ? ORDER BY step_order ASC').all(campaign.id);
    return res.json({
      success: true,
      campaign: {
        ...campaign,
        steps,
        is_demo: Boolean(campaign.is_demo),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Step 1: User clicks "Get Offer"
apiRouter.post('/offers/click', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { campaign_id } = req.body;
    if (!campaign_id) {
      return res.status(400).json({ success: false, error: 'Campaign ID is required.' });
    }

    const campaign = db.prepare("SELECT * FROM campaigns WHERE id = ? AND status = 'active'").get(campaign_id) as any;
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign is inactive or not found.' });
    }

    // Generate unique click ID with timestamp prefix
    const clickId = 'rc_' + Date.now().toString(36) + '_' + crypto.randomBytes(6).toString('hex');
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO offer_clicks (click_id, user_id, campaign_id, provider, ip_address, user_agent, subid1, subid2, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      clickId,
      req.user!.id,
      campaign.id,
      campaign.provider,
      req.ip || '',
      req.headers['user-agent'] || '',
      clickId,
      req.user!.id,
      now
    );

    // Create initial conversion record in 'not_started' / 'verifying'
    const conversionId = 'cnv_' + crypto.randomBytes(8).toString('hex');
    db.prepare(`
      INSERT INTO conversions (id, click_id, user_id, campaign_id, provider, status, reward_amount, currency, steps_completed, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'click_recorded', ?, ?, '[]', ?, ?)
    `).run(
      conversionId,
      clickId,
      req.user!.id,
      campaign.id,
      campaign.provider,
      campaign.reward_amount,
      campaign.currency,
      now,
      now
    );

    // Initial event: Click Recorded
    db.prepare(`
      INSERT INTO offer_events (id, click_id, user_id, campaign_id, step_type, event_name, status, verified_at, created_at)
      VALUES (?, ?, ?, ?, 'click', 'Click Recorded', 'confirmed', ?, ?)
    `).run('evt_' + crypto.randomBytes(8).toString('hex'), clickId, req.user!.id, campaign.id, now, now);

    return res.json({
      success: true,
      click_id: clickId,
      tracking_url: `/api/offers/redirect/${clickId}`,
      live_tracking_url: `#/track/${clickId}`,
    });
  } catch (err: any) {
    console.error('Click error:', err);
    return res.status(500).json({ success: false, error: 'Failed to generate click tracking: ' + err.message });
  }
});

// Official Redirect Gateway (Safe server-side redirect)
apiRouter.get('/offers/redirect/:clickId', (req: Request, res: Response) => {
  try {
    const clickId = String(req.params.clickId);
    const click = db.prepare(`
      SELECT c.*, cmp.tracking_url_template, cmp.name, cmp.is_demo, cmp.provider
      FROM offer_clicks c
      JOIN campaigns cmp ON c.campaign_id = cmp.id
      WHERE c.click_id = ?
    `).get(clickId) as any;

    if (!click) {
      return res.status(404).send('Invalid or expired tracking click ID.');
    }

    // Replace placeholder parameters
    let targetUrl = click.tracking_url_template
      .replace('{click_id}', encodeURIComponent(click.click_id))
      .replace('{user_id}', encodeURIComponent(click.user_id));

    // If sandbox demo offer, redirect back to the live tracking page with guidance
    if (click.is_demo) {
      return res.redirect(`/#/track/${click.click_id}?sandbox=true`);
    }

    // Check provider live status before redirecting to live affiliate tracking link
    const providerConfig = db.prepare('SELECT * FROM provider_integrations WHERE id = ?').get(click.provider || 'mitgo') as any;
    if (!providerConfig || !providerConfig.is_live) {
      return res.status(403).send('Live campaign tracking URL redirect is disabled: provider integration is unverified or not live.');
    }

    return res.redirect(targetUrl);
  } catch (err: any) {
    return res.status(500).send('Redirection error: ' + err.message);
  }
});

// LIVE OFFER TRACKING SCREEN DATA
apiRouter.get('/offers/tracking/:clickId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const clickId = String(req.params.clickId);
    const click = db.prepare(`
      SELECT c.*, cmp.name as campaign_name, cmp.advertiser_name, cmp.category, cmp.logo_url,
             cmp.reward_amount, cmp.currency, cmp.estimated_approval_days, cmp.is_demo,
             cmp.requires_install, cmp.requires_signup, cmp.requires_kyc, cmp.requires_deposit,
             cmp.minimum_deposit_amount, cmp.terms, cnv.status as conversion_status,
             cnv.rejection_reason, cnv.steps_completed
      FROM offer_clicks c
      JOIN campaigns cmp ON c.campaign_id = cmp.id
      LEFT JOIN conversions cnv ON c.click_id = cnv.click_id
      WHERE c.click_id = ?
    `).get(clickId) as any;

    if (!click) {
      return res.status(404).json({ success: false, error: 'Tracking record not found.' });
    }

    // Ensure user owns this click or is admin
    if (click.user_id !== req.user!.id && req.user!.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized.' });
    }

    // Fetch campaign steps ordered by step_order ASC
    const steps = db.prepare('SELECT * FROM campaign_steps WHERE campaign_id = ? ORDER BY step_order ASC').all(click.campaign_id) as any[];

    // Fetch verified events
    const events = db.prepare('SELECT * FROM offer_events WHERE click_id = ? ORDER BY created_at ASC').all(click.click_id) as any[];

    const completedStepTypes = new Set(
      events
        .filter((e) => e.status === 'confirmed' || e.status === 'sandbox_confirmed')
        .map((e) => e.step_type.toLowerCase())
    );

    // Determine current timeline status for each step dynamically from campaign_steps
    const timeline = [];
    let priorRequiredDone = true;

    if (steps.length > 0) {
      steps.forEach((step, idx) => {
        const stepType = (step.step_type || 'other').toLowerCase();
        const isDone = completedStepTypes.has(stepType);
        const isReq = step.is_required === 1 || step.is_required === true || String(step.is_required) === '1';

        let statusText = '';
        let stateStr = '';

        if (isDone) {
          statusText = `${step.title} Completed`;
          stateStr = 'completed';
        } else if (priorRequiredDone) {
          statusText = 'Action Required';
          stateStr = 'action_required';
        } else {
          statusText = 'Pending Previous Steps';
          stateStr = 'pending_prior';
        }

        timeline.push({
          step_order: step.step_order || (idx + 1),
          type: stepType,
          title: `${idx + 1}. ${step.title}`,
          status: statusText,
          state: stateStr,
          instruction: isDone
            ? `${step.title} confirmed by provider.`
            : step.description || `Complete ${step.title} step.`,
          is_required: isReq,
          min_deposit_amount: step.min_deposit_amount || 0,
        });

        if (isReq && !isDone) {
          priorRequiredDone = false;
        }
      });
    } else {
      // Legacy step construction fallback if campaign_steps row is empty
      let stepIdx = 1;

      if (click.requires_install) {
        const isDone = completedStepTypes.has('install');
        timeline.push({
          step_order: stepIdx,
          type: 'install',
          title: `${stepIdx}. App Install`,
          status: isDone ? 'Install Completed' : 'Verifying Install',
          state: isDone ? 'completed' : 'verifying',
          instruction: isDone
            ? 'Installation confirmed by provider.'
            : 'Download and open the app. Waiting for advertiser install postback confirmation.',
          is_required: true,
        });
        if (!isDone) priorRequiredDone = false;
        stepIdx++;
      }

      if (click.requires_signup) {
        const isDone = completedStepTypes.has('signup');
        timeline.push({
          step_order: stepIdx,
          type: 'signup',
          title: `${stepIdx}. Account Registration`,
          status: isDone ? 'Signup Completed' : priorRequiredDone ? 'Action Required' : 'Waiting for Install',
          state: isDone ? 'completed' : priorRequiredDone ? 'action_required' : 'pending_prior',
          instruction: isDone
            ? 'Registration verified by advertiser.'
            : 'Open the advertiser application and register with your mobile phone or email.',
          is_required: true,
        });
        if (!isDone) priorRequiredDone = false;
        stepIdx++;
      }

      if (click.requires_kyc) {
        const isDone = completedStepTypes.has('kyc');
        timeline.push({
          step_order: stepIdx,
          type: 'kyc',
          title: `${stepIdx}. Identity / KYC Verification`,
          status: isDone ? 'KYC Completed' : priorRequiredDone ? 'Action Required' : 'Pending Previous Steps',
          state: isDone ? 'completed' : priorRequiredDone ? 'action_required' : 'pending_prior',
          instruction: isDone
            ? 'Identity verification verified by advertiser records.'
            : 'Complete in-app paperless KYC.',
          is_required: true,
        });
        if (!isDone) priorRequiredDone = false;
        stepIdx++;
      }

      if (click.requires_deposit) {
        const isDone = completedStepTypes.has('deposit');
        timeline.push({
          step_order: stepIdx,
          type: 'deposit',
          title: `${stepIdx}. First Deposit / Purchase (Min ₹${click.minimum_deposit_amount})`,
          status: isDone ? 'Deposit Verified' : priorRequiredDone ? 'Action Required' : 'Pending Previous Steps',
          state: isDone ? 'completed' : priorRequiredDone ? 'action_required' : 'pending_prior',
          instruction: isDone
            ? `Deposit of ₹${click.minimum_deposit_amount}+ confirmed by advertiser.`
            : `Complete a minimum transaction/deposit of ₹${click.minimum_deposit_amount} inside the app.`,
          is_required: true,
        });
        if (!isDone) priorRequiredDone = false;
        stepIdx++;
      }
    }

    // Final Step: Cashback Settlement
    const convStatus = click.conversion_status || 'click_recorded';
    timeline.push({
      step_order: timeline.length + 1,
      type: 'cashback',
      title: `${timeline.length + 1}. Cashback Approval & Payout`,
      status:
        convStatus === 'approved'
          ? 'Approved & Credited'
          : convStatus === 'rejected'
          ? 'Rejected by Advertiser'
          : convStatus === 'pending_approval'
          ? 'Pending Approval'
          : 'Waiting for Steps',
      state: convStatus === 'approved' ? 'completed' : convStatus === 'rejected' ? 'rejected' : 'verifying',
      instruction:
        convStatus === 'approved'
          ? 'Cashback has been credited to your withdrawable wallet balance.'
          : convStatus === 'rejected'
          ? `Advertiser rejected this conversion: ${click.rejection_reason || 'Unmet requirements'}`
          : 'All required steps received. Conversions are verified against advertiser return periods.',
      is_required: true,
    });

    return res.json({
      success: true,
      tracking: {
        click_id: click.click_id,
        campaign_id: click.campaign_id,
        campaign_name: click.campaign_name,
        advertiser_name: click.advertiser_name,
        category: click.category,
        reward_amount: click.reward_amount,
        currency: click.currency,
        is_demo: Boolean(click.is_demo),
        created_at: click.created_at,
        conversion_status: convStatus,
        rejection_reason: click.rejection_reason,
        timeline,
        events,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/* ==========================================================================
   LOG & PAYLOAD SANITIZATION HELPERS
   ========================================================================== */

const SENSITIVE_LOG_KEYS = new Set([
  'token',
  'key',
  'x-mitgo-signature',
  'x-postback-token',
  'authorization',
  'secret',
  'client_secret',
  'api_token',
  'password',
  'cookie',
  'set-cookie',
  'bearer',
  'signature',
  'access_token',
  'auth_token',
  'postback_key',
  'setup_token',
  'admin_token',
  'roycash_token',
  'roycash_admin_token',
]);

export function sanitizeObjectForLogging(input: any): any {
  if (!input || typeof input !== 'object') {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeObjectForLogging(item));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, val] of Object.entries(input)) {
    const lowerKey = key.toLowerCase();
    let isSensitive = SENSITIVE_LOG_KEYS.has(lowerKey);
    if (!isSensitive) {
      if (
        lowerKey.includes('token') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('signature') ||
        lowerKey.includes('pass') ||
        lowerKey.includes('auth')
      ) {
        isSensitive = true;
      }
    }

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (val && typeof val === 'object') {
      sanitized[key] = sanitizeObjectForLogging(val);
    } else {
      sanitized[key] = val;
    }
  }

  return sanitized;
}

export function sanitizeJsonStringForLogging(input: any): string {
  if (!input) return JSON.stringify({});

  if (typeof input === 'string') {
    let str = input;

    // Decode URL-encoded strings if URL encoding (%20, %3D, %26, etc.) is detected
    if (str.includes('%')) {
      try {
        str = decodeURIComponent(str);
      } catch {
        // Fall back to raw string if URI decoding fails
      }
    }

    const trimmed = str.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmed);
        return JSON.stringify(sanitizeObjectForLogging(parsed));
      } catch {
        // Fall through to non-JSON string sanitization if JSON parsing fails
      }
    }

    // Non-JSON string sanitization (handles URL query strings, HTTP headers, key-value pairs, etc.)
    let sanitized = str;

    // Redact HTTP Headers (e.g. Authorization: Bearer secret, Cookie: session=secret, Set-Cookie: ...)
    sanitized = sanitized.replace(/(authorization|cookie|set-cookie)\s*[:=]\s*(Bearer\s+|Basic\s+)?([^\s;,&"]+)/gi, '$1: [REDACTED]');

    // Redact Query Parameters or Key-Value pairs containing sensitive keywords (case-insensitive)
    sanitized = sanitized.replace(
      /(^|[\?&;\s,{"'])((?:[a-z0-9_-]*(?:token|secret|signature|pass|auth|key|cookie)[a-z0-9_-]*))\s*[:=]\s*["']?([^&;\s,}"']+)["']?/gi,
      '$1$2=[REDACTED]'
    );

    return sanitized;
  }

  if (typeof input === 'object') {
    try {
      return JSON.stringify(sanitizeObjectForLogging(input));
    } catch {
      return JSON.stringify({ error: '[UNSERIALIZABLE_OBJECT]' });
    }
  }

  return String(input);
}

/* ==========================================================================
   3. MITGO S2S POSTBACK / WEBHOOK INGESTION
   ========================================================================== */

// Accept both GET and POST for maximum affiliate network compatibility
apiRouter.all('/postback/mitgo', (req: Request, res: Response) => {
  try {
    const params = { ...req.query, ...req.body };
    const rawClickId = params.click_id || params.subid || params.subid1;
    const clickId = typeof rawClickId === 'string' ? rawClickId.trim() : (typeof rawClickId === 'number' ? String(rawClickId) : '');

    const rawTxId = params.order_id || params.tx_id || params.transaction_id;
    const txId = typeof rawTxId === 'string' ? rawTxId.trim() : (typeof rawTxId === 'number' ? String(rawTxId) : '');

    const rawEventType = params.event_type || params.event || params.event_name || params.status;
    let eventType = 'action';
    if (typeof rawEventType === 'string') {
      eventType = rawEventType.trim().toLowerCase();
    } else if (typeof rawEventType === 'number') {
      eventType = String(rawEventType).trim().toLowerCase();
    } else if (rawEventType !== undefined && rawEventType !== null) {
      logPostback('mitgo', req.method, params, req.headers, clickId || null, txId || '[MISSING_TX_ID]', 'invalid', 'invalid_event_type_type', 400);
      return res.status(400).json({ success: false, error: 'Invalid event_type parameter type. Must be a string or number.' });
    }

    if (!/^[a-z0-9_-]{1,64}$/.test(eventType)) {
      logPostback('mitgo', req.method, params, req.headers, clickId || null, txId || '[MISSING_TX_ID]', 'invalid', 'invalid_event_type_format', 400);
      return res.status(400).json({ success: false, error: 'Invalid event_type format. Must be alphanumeric (1-64 characters).' });
    }

    const rawAmount = params.amount || params.payout || '0';
    let amount = 0;
    if (typeof rawAmount === 'number') {
      amount = rawAmount;
    } else if (typeof rawAmount === 'string') {
      const trimmed = rawAmount.trim();
      // Enforce strictly formatted integer or float number: optional digits, dot, digits.
      // Reject trailing non-numeric characters like "100abc", "10.50xyz", "abc", etc.
      if (!/^\d+(\.\d+)?$/.test(trimmed)) {
        logPostback('mitgo', req.method, params, req.headers, clickId || null, txId || '[MISSING_TX_ID]', eventType, 'invalid_amount_format', 400);
        return res.status(400).json({ success: false, error: 'Invalid amount format. Must be a clean non-negative numeric value without trailing characters.' });
      }
      amount = Number(trimmed);
    } else {
      logPostback('mitgo', req.method, params, req.headers, clickId || null, txId || '[MISSING_TX_ID]', eventType, 'invalid_amount_type', 400);
      return res.status(400).json({ success: false, error: 'Invalid amount parameter type. Must be a number or numeric string.' });
    }

    if (isNaN(amount) || !isFinite(amount) || amount < 0) {
      logPostback('mitgo', req.method, params, req.headers, clickId || null, txId || '[MISSING_TX_ID]', eventType, 'invalid_amount_value', 400);
      return res.status(400).json({ success: false, error: 'Invalid amount value. Must be a finite non-negative number.' });
    }

    const rawToken = params.token || params.key || req.headers['x-mitgo-signature'] || req.headers['x-postback-token'];
    const token = typeof rawToken === 'string' ? rawToken : (typeof rawToken === 'number' ? String(rawToken) : undefined);
    const now = new Date().toISOString();

    // REQUIREMENT 2: REJECT MISSING OR EMPTY PROVIDER TRANSACTION ID (Do not generate fake tx_' + Date.now())
    if (!txId) {
      logPostback('mitgo', req.method, params, req.headers, clickId || null, '[MISSING_TX_ID]', eventType, 'missing_transaction_id', 400);
      return res.status(400).json({
        success: false,
        error: 'Missing required provider transaction_id (or order_id/tx_id) parameter. Fake transaction IDs are not generated.',
      });
    }

    if (!clickId) {
      logPostback('mitgo', req.method, params, req.headers, null, txId, eventType, 'missing_click_id', 400);
      return res.status(400).json({ success: false, error: 'Missing required click_id parameter.' });
    }

    const click = db.prepare(`
      SELECT c.*, cmp.requires_install, cmp.requires_signup, cmp.requires_kyc, cmp.requires_deposit, cmp.reward_amount, cmp.is_demo
      FROM offer_clicks c
      JOIN campaigns cmp ON c.campaign_id = cmp.id
      WHERE c.click_id = ?
    `).get(clickId) as any;

    if (!click) {
      logPostback('mitgo', req.method, JSON.stringify(params), JSON.stringify(req.headers), clickId, txId, eventType, 'click_not_found', 404);
      return res.status(404).json({ success: false, error: 'Click ID not found in ledger.' });
    }

    const isLiveCampaign = click.is_demo === 0;
    const providerConfig = db.prepare('SELECT * FROM provider_integrations WHERE id = ?').get('mitgo') as any;

    // PROVIDER POSTBACK SECURITY & AUTHENTICATION
    if (isLiveCampaign) {
      // REQUIREMENT 4:
      // "Do not invent Mitgo signature algorithms, headers, endpoints, or authentication rules."
      // "If the actual verification method cannot be confirmed, keep live postbacks disabled and clearly report the missing documentation/configuration."
      // "Never treat a shared-token check as proof of official Mitgo integration."
      //
      // Official Mitgo S2S verification requires contract-specific configuration (e.g. revision HMAC-SHA1 or registered IP whitelisting).
      // Since live affiliate tracking documentation is not confirmed/contracted for this deployment,
      // live postbacks are permanently disabled to prevent unauthenticated/fictitious live credits.
      logPostback('mitgo', req.method, JSON.stringify(params), JSON.stringify(req.headers), clickId, txId, eventType, 'live_postbacks_disabled_pending_official_docs', 403);
      return res.status(403).json({
        success: false,
        error: 'Live Mitgo postback ingestion is disabled pending official provider documentation and verified contract credentials (HMAC-SHA1 revision keys or verified IP whitelisting). Shared query tokens are not accepted as verified live signatures.',
        documentation_status: 'unconfirmed_live_provider_signature',
      });
    } else {
      // Sandbox / Demo Campaign
      const currentEnv = process.env.NODE_ENV || (config.isProd ? 'production' : 'development');
      if (currentEnv === 'production') {
        logPostback('mitgo', req.method, JSON.stringify(params), JSON.stringify(req.headers), clickId, txId, eventType, 'sandbox_in_prod_rejected', 403);
        return res.status(403).json({
          success: false,
          error: 'Sandbox demo campaigns cannot receive postbacks in a production environment.',
        });
      }

      // MANDATORY SANDBOX SECRET & TOKEN AUTHENTICATION
      const configuredSecret = process.env.MITGO_SANDBOX_POSTBACK_KEY || providerConfig?.postback_key;

      if (!configuredSecret || typeof configuredSecret !== 'string' || !configuredSecret.trim()) {
        logPostback('mitgo', req.method, JSON.stringify(params), JSON.stringify(req.headers), clickId, txId, eventType, 'sandbox_secret_missing', 403);
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Sandbox postback secret is missing or unconfigured.',
        });
      }

      if (!token || typeof token !== 'string' || !token.trim()) {
        logPostback('mitgo', req.method, JSON.stringify(params), JSON.stringify(req.headers), clickId, txId, eventType, 'sandbox_token_missing', 403);
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Missing required sandbox postback authentication token.',
        });
      }

      const tokenBuf = Buffer.from(token.trim());
      const secretBuf = Buffer.from(configuredSecret.trim());

      if (tokenBuf.length !== secretBuf.length || !crypto.timingSafeEqual(tokenBuf, secretBuf)) {
        logPostback('mitgo', req.method, JSON.stringify(params), JSON.stringify(req.headers), clickId, txId, eventType, 'sandbox_token_invalid', 403);
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Invalid sandbox postback authentication token.',
        });
      }
    }

    // Idempotency check: Reject duplicate event for same transaction_id and step_type
    const existingEvent = db.prepare(`
      SELECT id FROM offer_events WHERE click_id = ? AND transaction_id = ? AND step_type = ?
    `).get(clickId, txId, eventType);

    if (existingEvent) {
      logPostback('mitgo', req.method, JSON.stringify(params), JSON.stringify(req.headers), clickId, txId, eventType, 'duplicate_ignored', 200);
      return res.status(200).json({ success: true, message: 'Duplicate transaction ignored (idempotent).' });
    }

    // Record the verified event
    const eventId = 'evt_' + crypto.randomBytes(8).toString('hex');
    db.prepare(`
      INSERT INTO offer_events (id, click_id, user_id, campaign_id, step_type, event_name, status, transaction_id, metadata, is_provider_verified, verification_source, verified_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'sandbox_confirmed', ?, ?, 1, 'sandbox_postback', ?, ?)
    `).run(
      eventId,
      clickId,
      click.user_id,
      click.campaign_id,
      eventType,
      eventType.toUpperCase() + ' Verified',
      txId,
      JSON.stringify(params),
      now,
      now
    );

    // Evaluate overall campaign step completion:
    // Check specific campaign_steps if defined, otherwise check boolean flags
    const configuredSteps = db.prepare(`
      SELECT step_type FROM campaign_steps WHERE campaign_id = ? AND is_required = 1
    `).all(click.campaign_id) as { step_type: string }[];

    const confirmedEvents = db.prepare(`
      SELECT step_type FROM offer_events WHERE click_id = ? AND status IN ('confirmed', 'sandbox_confirmed')
    `).all(clickId) as { step_type: string }[];
    const confirmedTypes = new Set(confirmedEvents.map((e) => e.step_type.toLowerCase()));

    const missingSteps: string[] = [];
    if (configuredSteps.length > 0) {
      for (const step of configuredSteps) {
        if (!confirmedTypes.has(step.step_type.toLowerCase())) {
          missingSteps.push(step.step_type);
        }
      }
    } else {
      if (click.requires_install && !confirmedTypes.has('install')) missingSteps.push('install');
      if (click.requires_signup && !confirmedTypes.has('signup')) missingSteps.push('signup');
      if (click.requires_kyc && !confirmedTypes.has('kyc')) missingSteps.push('kyc');
      if (click.requires_deposit && !confirmedTypes.has('deposit')) missingSteps.push('deposit');
    }

    const allStepsCompleted = missingSteps.length === 0;

    // Handle Event Types
    if (eventType === 'rejected' || eventType === 'declined') {
      db.prepare(`
        UPDATE conversions
        SET status = 'rejected', rejection_reason = ?, updated_at = ?
        WHERE click_id = ?
      `).run(params.reason || 'Declined by advertiser validation', now, clickId);
    } else if (eventType === 'reversed' || eventType === 'refunded' || eventType === 'chargeback') {
      handleReversal(clickId, click.user_id, txId, params.reason || 'Advertiser reversed transaction', now);
    } else if (eventType === 'approved' || eventType === 'approval') {
      // STRICT REQUIREMENT: An 'approved' event must NEVER bypass required campaign steps!
      if (!allStepsCompleted) {
        db.prepare(`
          UPDATE conversions
          SET status = 'pending_unmet_steps', rejection_reason = ?, updated_at = ?
          WHERE click_id = ?
        `).run(`Approval received but required steps missing: ${missingSteps.join(', ')}`, now, clickId);

        logPostback('mitgo', req.method, JSON.stringify(params), JSON.stringify(req.headers), clickId, txId, eventType, 'approval_missing_steps', 422);
        return res.status(422).json({
          success: false,
          error: `Approval rejected: campaign steps not completed. Missing required steps: ${missingSteps.join(', ')}.`,
          missing_steps: missingSteps,
        });
      }

      // Approve and credit cashback safely
      const approvalResult = approveConversion(clickId, click.user_id, amount || click.reward_amount, txId, now);
      if (!approvalResult.success) {
        logPostback('mitgo', req.method, JSON.stringify(params), JSON.stringify(req.headers), clickId, txId, eventType, 'approval_failed', 422);
        return res.status(422).json({
          success: false,
          error: approvalResult.error || 'Conversion approval failed.',
          missing_steps: approvalResult.missing_steps,
        });
      }
    } else if (allStepsCompleted) {
      // Mark as pending approval
      db.prepare(`
        UPDATE conversions
        SET status = 'pending_approval', updated_at = ?
        WHERE click_id = ?
      `).run(now, clickId);
    }

    logPostback('mitgo', req.method, JSON.stringify(params), JSON.stringify(req.headers), clickId, txId, eventType, 'processed', 200);
    return res.status(200).json({ success: true, message: 'Postback processed successfully.' });
  } catch (err: any) {
    console.error('Postback error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

function logPostback(provider: string, method: string, rawPayload: any, rawHeaders: any, clickId: string | null, txId: string, eventType: string, status: string, code: number) {
  try {
    const sanitizedPayload = sanitizeJsonStringForLogging(rawPayload);
    const sanitizedHeaders = sanitizeJsonStringForLogging(rawHeaders);

    db.prepare(`
      INSERT INTO postback_logs (id, provider, endpoint, method, payload, headers, click_id, transaction_id, event_type, status, response_code, created_at)
      VALUES (?, ?, '/api/postback/mitgo', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'pbl_' + crypto.randomBytes(8).toString('hex'),
      provider,
      method,
      sanitizedPayload,
      sanitizedHeaders,
      clickId,
      txId || '[MISSING_TX_ID]',
      eventType,
      status,
      code,
      new Date().toISOString()
    );
  } catch (e) {
    console.error('Failed to log postback:', e);
  }
}

function handleReversal(clickId: string, userId: string, txId: string, reason: string, now: string) {
  db.exec('BEGIN IMMEDIATE;');
  try {
    const conversion = db.prepare('SELECT id, status, reward_amount FROM conversions WHERE click_id = ?').get(clickId) as any;
    if (!conversion) {
      db.exec('ROLLBACK;');
      return;
    }

    // If conversion was already approved, debit back the credited cashback from ledger
    if (conversion.status === 'approved') {
      const existingDebit = db.prepare(`
        SELECT id FROM cashback_ledger WHERE conversion_id = ? AND type = 'reversal_debit'
      `).get(conversion.id);

      if (!existingDebit) {
        const debitId = 'ldg_' + crypto.randomBytes(8).toString('hex');
        db.prepare(`
          INSERT INTO cashback_ledger (id, user_id, conversion_id, type, amount, balance_type, status, description, created_at)
          VALUES (?, ?, ?, 'reversal_debit', ?, 'withdrawable', 'deducted', ?, ?)
        `).run(debitId, userId, conversion.id, conversion.reward_amount, `Cashback Reversal: ${reason}`, now);

        // Also check if any referral reward was credited for this conversion and reverse it
        const refReward = db.prepare(`
          SELECT id, referrer_user_id, reward_amount, status FROM referral_rewards WHERE source_conversion_id = ?
        `).get(conversion.id) as any;

        if (refReward && refReward.status === 'approved') {
          db.prepare(`
            UPDATE referral_rewards SET status = 'reversed' WHERE id = ?
          `).run(refReward.id);

          const refDebitId = 'ldg_' + crypto.randomBytes(8).toString('hex');
          db.prepare(`
            INSERT INTO cashback_ledger (id, user_id, conversion_id, type, amount, balance_type, status, description, created_at)
            VALUES (?, ?, ?, 'referral_reversal', ?, 'withdrawable', 'deducted', ?, ?)
          `).run(refDebitId, refReward.referrer_user_id, conversion.id, refReward.reward_amount, `Referral Commission Reversal for cancelled order (${txId})`, now);
        }
      }
    }

    // Update conversion status to reversed
    db.prepare(`
      UPDATE conversions
      SET status = 'reversed', rejection_reason = ?, updated_at = ?
      WHERE click_id = ?
    `).run(reason, now, clickId);

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    console.error('Error in handleReversal:', err);
  }
}

export function approveConversion(clickId: string, userId: string, rewardAmount: number, txId: string, now: string): { success: boolean; error?: string; missing_steps?: string[] } {
  // 1. CASHBACK AMOUNT VALIDATION (finite positive number check)
  if (typeof rewardAmount !== 'number' || Number.isNaN(rewardAmount) || !Number.isFinite(rewardAmount) || rewardAmount <= 0) {
    return { success: false, error: `Invalid reward amount (${rewardAmount}). Amount must be a finite positive number.` };
  }

  db.exec('BEGIN IMMEDIATE;');
  try {
    const conversion = db.prepare('SELECT id, status, campaign_id, user_id FROM conversions WHERE click_id = ?').get(clickId) as any;
    if (!conversion) {
      db.exec('ROLLBACK;');
      return { success: false, error: 'Conversion record not found.' };
    }

    if (conversion.status === 'approved') {
      db.exec('ROLLBACK;');
      return { success: true, error: 'Conversion is already approved (idempotent).' };
    }

    if (conversion.status === 'rejected' || conversion.status === 'reversed') {
      db.exec('ROLLBACK;');
      return { success: false, error: `Conversion status is '${conversion.status}'. Cannot approve rejected or reversed conversions.` };
    }

    // 2. CASHBACK USER OWNERSHIP VALIDATION
    const authoritativeUserId = conversion.user_id;
    if (userId && userId !== authoritativeUserId) {
      db.exec('ROLLBACK;');
      return {
        success: false,
        error: `User ownership mismatch: supplied user ID '${userId}' does not match conversion beneficiary '${authoritativeUserId}'. Approval rejected.`,
      };
    }

    // 3. CAMPAIGN REWARD VALIDATION & AUTHORITATIVE SOURCE
    const campaign = db.prepare('SELECT id, reward_amount, is_demo, status FROM campaigns WHERE id = ?').get(conversion.campaign_id) as any;
    if (!campaign) {
      db.exec('ROLLBACK;');
      return { success: false, error: 'Campaign record not found for conversion.' };
    }

    if (typeof campaign.reward_amount !== 'number' || Number.isNaN(campaign.reward_amount) || !Number.isFinite(campaign.reward_amount) || campaign.reward_amount <= 0) {
      db.exec('ROLLBACK;');
      return { success: false, error: 'Configured campaign reward amount is missing or invalid.' };
    }

    if (rewardAmount > campaign.reward_amount) {
      db.exec('ROLLBACK;');
      return {
        success: false,
        error: `Approval reward amount (${rewardAmount}) exceeds campaign configured limit (${campaign.reward_amount}).`,
      };
    }

    const effectiveRewardAmount = Math.min(rewardAmount, campaign.reward_amount);

    // 4. CAMPAIGN EVENT VERIFICATION (Strict click_id, user_id, campaign_id and Sandbox vs Live env check)
    const click = db.prepare(`
      SELECT c.*, cmp.requires_install, cmp.requires_signup, cmp.requires_kyc, cmp.requires_deposit
      FROM offer_clicks c
      JOIN campaigns cmp ON c.campaign_id = cmp.id
      WHERE c.click_id = ? AND c.user_id = ? AND c.campaign_id = ?
    `).get(clickId, authoritativeUserId, conversion.campaign_id) as any;

    if (!click) {
      db.exec('ROLLBACK;');
      return { success: false, error: 'Associated click record not found or mismatched click ownership.' };
    }

    const currentEnv = process.env.NODE_ENV || (config.isProd ? 'production' : 'development');
    const isProdEnv = currentEnv === 'production';
    const isDemoCampaign = campaign.is_demo === 1;

    // Replay Protection: Check exact transaction ID uniqueness across conversions and events
    const replayedConversion = db.prepare(`
      SELECT id FROM conversions
      WHERE provider_conversion_id = ?
        AND id != ?
        AND status IN ('approved', 'cashback_credited')
    `).get(txId, conversion.id);

    if (replayedConversion) {
      db.exec('ROLLBACK;');
      return { success: false, error: `Replayed transaction ID rejected: transaction ID '${txId}' has already been processed for another conversion.` };
    }

    const replayedEvent = db.prepare(`
      SELECT id FROM offer_events
      WHERE transaction_id = ?
        AND click_id != ?
        AND status IN ('confirmed', 'sandbox_confirmed')
    `).get(txId, clickId);

    if (replayedEvent) {
      db.exec('ROLLBACK;');
      return { success: false, error: `Replayed transaction ID rejected: transaction ID '${txId}' was already recorded for a different click.` };
    }

    // 4. PROVIDER EVENT AUTHENTICITY VERIFICATION
    const rawEvents = db.prepare(`
      SELECT id, click_id, user_id, campaign_id, step_type, event_name, status, transaction_id, metadata, is_provider_verified, verification_source, verified_at, created_at
      FROM offer_events
      WHERE click_id = ?
        AND user_id = ?
        AND campaign_id = ?
    `).all(clickId, authoritativeUserId, conversion.campaign_id) as any[];

    // Filter events to strictly enforce server-controlled provider verification
    const authenticatedEvents = rawEvents.filter((evt) => {
      // Must be marked verified by trusted server verification logic (is_provider_verified === 1)
      // Never trust client metadata fields like signature_valid: true or verified: true!
      if (evt.is_provider_verified !== 1) {
        return false;
      }

      if (!evt.verification_source || evt.verification_source === 'unverified' || evt.verification_source === 'unverified_client') {
        return false;
      }

      if (evt.status !== 'confirmed' && evt.status !== 'sandbox_confirmed') {
        return false;
      }

      if (!evt.transaction_id || typeof evt.transaction_id !== 'string' || !evt.transaction_id.trim()) {
        return false;
      }

      if (!evt.verified_at || typeof evt.verified_at !== 'string' || !evt.verified_at.trim() || Number.isNaN(Date.parse(evt.verified_at))) {
        return false;
      }

      // CAMPAIGN TYPE ARCHITECTURE ISOLATION:
      if (isDemoCampaign) {
        // Demo campaigns can ONLY use trusted sandbox verification in non-production environments
        if (isProdEnv) {
          return false; // Sandbox prohibited in production
        }
        const isSandboxSource = evt.verification_source === 'sandbox_simulation' || evt.verification_source === 'sandbox_postback';
        if (!isSandboxSource && evt.status !== 'sandbox_confirmed') {
          return false;
        }
        return true;
      } else {
        // Live campaigns (is_demo === 0) can ONLY use official cryptographically verified provider paths
        // Sandbox verification sources can NEVER authorize a live campaign!
        if (evt.status === 'sandbox_confirmed' || evt.verification_source === 'sandbox_simulation' || evt.verification_source === 'sandbox_postback') {
          return false;
        }

        // Official live provider signature verification path
        // Currently live Mitgo credentials & HMAC verification are unconfigured
        const isOfficialLiveSource = evt.verification_source === 'mitgo_hmac_verified' || evt.verification_source === 'official_provider_postback';
        if (!isOfficialLiveSource) {
          return false; // Fail closed for unconfigured live provider events
        }
        return true;
      }
    });

    const confirmedTypes = new Set(authenticatedEvents.map((e) => e.step_type.toLowerCase()));

    const configuredSteps = db.prepare(`
      SELECT step_type FROM campaign_steps WHERE campaign_id = ? AND is_required = 1
    `).all(conversion.campaign_id) as { step_type: string }[];

    const missingSteps: string[] = [];
    if (configuredSteps.length > 0) {
      for (const step of configuredSteps) {
        if (!confirmedTypes.has(step.step_type.toLowerCase())) {
          missingSteps.push(step.step_type);
        }
      }
    } else {
      if (click.requires_install && !confirmedTypes.has('install')) missingSteps.push('install');
      if (click.requires_signup && !confirmedTypes.has('signup')) missingSteps.push('signup');
      if (click.requires_kyc && !confirmedTypes.has('kyc')) missingSteps.push('kyc');
      if (click.requires_deposit && !confirmedTypes.has('deposit')) missingSteps.push('deposit');
    }

    if (missingSteps.length > 0) {
      db.prepare(`
        UPDATE conversions
        SET status = 'pending_unmet_steps', rejection_reason = ?, updated_at = ?
        WHERE click_id = ?
      `).run(`Financial approval rejected: missing required steps: ${missingSteps.join(', ')}`, now, clickId);

      db.exec('COMMIT;');
      return {
        success: false,
        error: `Approval rejected: campaign steps not completed. Missing required steps: ${missingSteps.join(', ')}.`,
        missing_steps: missingSteps,
      };
    }

    // Check if cashback credit already exists in ledger for this conversion to prevent double credit
    const existingCredit = db.prepare(`
      SELECT id FROM cashback_ledger WHERE conversion_id = ? AND type = 'cashback_credit'
    `).get(conversion.id);

    if (existingCredit) {
      db.exec('ROLLBACK;');
      return { success: true, error: 'Cashback ledger credit already exists (idempotent).' };
    }

    db.prepare(`
      UPDATE conversions
      SET status = 'approved', approved_at = ?, provider_conversion_id = ?, updated_at = ?
      WHERE click_id = ?
    `).run(now, txId, now, clickId);

    // Credit cashback ledger using the authoritative user ID and effective reward amount
    const ledgerId = 'ldg_' + crypto.randomBytes(8).toString('hex');
    db.prepare(`
      INSERT INTO cashback_ledger (id, user_id, conversion_id, type, amount, balance_type, status, description, created_at)
      VALUES (?, ?, ?, 'cashback_credit', ?, 'withdrawable', 'available', 'Verified Cashback Reward', ?)
    `).run(ledgerId, authoritativeUserId, conversion.id, effectiveRewardAmount, now);

    // Check for referrer reward using the authoritative user ID
    const refRel = db.prepare("SELECT * FROM referral_relationships WHERE referred_user_id = ? AND status = 'active'").get(authoritativeUserId) as any;
    if (refRel) {
      const refRewardAmount = Math.round(effectiveRewardAmount * 0.1); // 10%
      if (refRewardAmount > 0) {
        // Prevent duplicate referral reward for this conversion
        const existingRefReward = db.prepare('SELECT id FROM referral_rewards WHERE source_conversion_id = ?').get(conversion.id);
        if (!existingRefReward) {
          const rewardId = 'rw_' + crypto.randomBytes(8).toString('hex');
          db.prepare(`
            INSERT INTO referral_rewards (id, relationship_id, referrer_user_id, referred_user_id, source_conversion_id, reward_amount, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'approved', ?)
          `).run(rewardId, refRel.id, refRel.referrer_user_id, authoritativeUserId, conversion.id, refRewardAmount, now);

          const refLedgerId = 'ldg_' + crypto.randomBytes(8).toString('hex');
          db.prepare(`
            INSERT INTO cashback_ledger (id, user_id, conversion_id, type, amount, balance_type, status, description, created_at)
            VALUES (?, ?, ?, 'referral_credit', ?, 'withdrawable', 'available', 'Referral Commission from Friend Offer', ?)
          `).run(refLedgerId, refRel.referrer_user_id, conversion.id, refRewardAmount, now);
        }
      }
    }

    db.exec('COMMIT;');
    return { success: true };
  } catch (err: any) {
    db.exec('ROLLBACK;');
    console.error('Error in approveConversion:', err);
    return { success: false, error: err.message || 'Database error during conversion approval.' };
  }
}

/* ==========================================================================
   4. USER DASHBOARD & WALLET
   ========================================================================== */

function calculateUserBalances(userId: string) {
  // Total Approved / Withdrawable from ledger
  const credits = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM cashback_ledger
    WHERE user_id = ? AND type IN ('cashback_credit', 'referral_credit', 'admin_adjustment') AND status = 'available'
  `).get(userId) as any;

  const debits = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM cashback_ledger
    WHERE user_id = ? AND type IN ('withdrawal_debit', 'reversal_debit', 'referral_reversal')
  `).get(userId) as any;

  // Pending Conversions
  const pending = db.prepare(`
    SELECT COALESCE(SUM(reward_amount), 0) as total
    FROM conversions
    WHERE user_id = ? AND status IN ('pending_approval', 'click_recorded')
  `).get(userId) as any;

  // Rejected Conversions
  const rejected = db.prepare(`
    SELECT COALESCE(SUM(reward_amount), 0) as total
    FROM conversions
    WHERE user_id = ? AND status = 'rejected'
  `).get(userId) as any;

  // Referral specific earnings
  const referralEarned = db.prepare(`
    SELECT COALESCE(SUM(reward_amount), 0) as total
    FROM referral_rewards
    WHERE referrer_user_id = ? AND status = 'approved'
  `).get(userId) as any;

  const approvedBalance = Math.max(0, (credits?.total || 0) - (debits?.total || 0));

  return {
    approved_balance: approvedBalance,
    withdrawable_balance: approvedBalance,
    pending_cashback: pending?.total || 0,
    rejected_cashback: rejected?.total || 0,
    total_cashback: (credits?.total || 0) + (pending?.total || 0),
    referral_earnings: referralEarned?.total || 0,
  };
}

apiRouter.get('/user/dashboard', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const balances = calculateUserBalances(userId);

    const completedOffersCount = (db.prepare(`
      SELECT COUNT(*) as c FROM conversions WHERE user_id = ? AND status = 'approved'
    `).get(userId) as any).c;

    const activeOffersCount = (db.prepare(`
      SELECT COUNT(*) as c FROM conversions WHERE user_id = ? AND status != 'approved' AND status != 'rejected'
    `).get(userId) as any).c;

    const recentActivity = db.prepare(`
      SELECT cnv.id, cnv.status, cnv.reward_amount, cnv.created_at, cmp.name as campaign_name, cmp.logo_url
      FROM conversions cnv
      JOIN campaigns cmp ON cnv.campaign_id = cmp.id
      WHERE cnv.user_id = ?
      ORDER BY cnv.created_at DESC
      LIMIT 6
    `).all(userId);

    return res.json({
      success: true,
      stats: {
        ...balances,
        total_completed_offers: completedOffersCount,
        active_offers: activeOffersCount,
      },
      recent_activity: recentActivity,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.get('/user/wallet', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const balances = calculateUserBalances(userId);

    const user = db.prepare(`
      SELECT upi_id, bank_account_number, bank_ifsc, bank_holder_name FROM users WHERE id = ?
    `).get(userId) as any;

    const ledger = db.prepare(`
      SELECT * FROM cashback_ledger WHERE user_id = ? ORDER BY created_at DESC LIMIT 50
    `).all(userId);

    const withdrawals = db.prepare(`
      SELECT * FROM withdrawal_requests WHERE user_id = ? ORDER BY requested_at DESC LIMIT 20
    `).all(userId);

    return res.json({
      success: true,
      balances,
      payout_details: {
        upi_id: user?.upi_id || '',
        bank_account_number: user?.bank_account_number || '',
        bank_ifsc: user?.bank_ifsc || '',
        bank_holder_name: user?.bank_holder_name || '',
      },
      ledger,
      withdrawals,
      min_withdrawal_amount: 100, // ₹100 minimum withdrawal
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/user/withdraw', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { amount, payout_method, payout_details } = req.body;
    const withdrawAmount = parseFloat(amount);

    if (isNaN(withdrawAmount) || withdrawAmount < 100) {
      return res.status(400).json({ success: false, error: 'Minimum withdrawal amount is ₹100.' });
    }

    if (!payout_method || !payout_details) {
      return res.status(400).json({ success: false, error: 'Payout method and valid details are required.' });
    }

    const now = new Date().toISOString();
    const withdrawalId = 'wdr_' + crypto.randomBytes(8).toString('hex');
    const ledgerId = 'ldg_' + crypto.randomBytes(8).toString('hex');

    db.exec('BEGIN IMMEDIATE;');
    try {
      // Re-verify balance inside write transaction
      const balances = calculateUserBalances(userId);
      if (balances.withdrawable_balance < withdrawAmount) {
        db.exec('ROLLBACK;');
        return res.status(400).json({ success: false, error: 'Insufficient withdrawable balance.' });
      }

      db.prepare(`
        INSERT INTO withdrawal_requests (id, user_id, amount, currency, payout_method, payout_details, status, requested_at)
        VALUES (?, ?, ?, 'INR', ?, ?, 'pending', ?)
      `).run(withdrawalId, userId, withdrawAmount, payout_method, JSON.stringify(payout_details), now);

      // Debit from ledger immediately to hold funds
      db.prepare(`
        INSERT INTO cashback_ledger (id, user_id, type, amount, balance_type, status, description, created_at)
        VALUES (?, ?, 'withdrawal_debit', ?, 'withdrawable', 'deducted', 'Payout Request Held Pending Review', ?)
      `).run(ledgerId, userId, withdrawAmount, now);

      db.exec('COMMIT;');
    } catch (txErr) {
      db.exec('ROLLBACK;');
      throw txErr;
    }

    return res.json({
      success: true,
      message: `Withdrawal request of ₹${withdrawAmount} submitted. Payouts are processed via IMPS/UPI within 24-48 hours.`,
      withdrawal_id: withdrawalId,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to process withdrawal request.' });
  }
});

apiRouter.get('/user/my-offers', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const offers = db.prepare(`
      SELECT c.click_id, c.created_at, cmp.id as campaign_id, cmp.name, cmp.advertiser_name,
             cmp.logo_url, cmp.reward_amount, cmp.currency, cmp.is_demo, cnv.status as conversion_status
      FROM offer_clicks c
      JOIN campaigns cmp ON c.campaign_id = cmp.id
      LEFT JOIN conversions cnv ON c.click_id = cnv.click_id
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC
    `).all(req.user!.id);

    return res.json({ success: true, offers });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.get('/user/referrals', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = db.prepare('SELECT referral_code FROM users WHERE id = ?').get(userId) as any;

    const referrals = db.prepare(`
      SELECT u.id, u.name, u.email, r.created_at
      FROM referral_relationships r
      JOIN users u ON r.referred_user_id = u.id
      WHERE r.referrer_user_id = ?
      ORDER BY r.created_at DESC
    `).all(userId);

    const rewards = db.prepare(`
      SELECT * FROM referral_rewards WHERE referrer_user_id = ? ORDER BY created_at DESC
    `).all(userId);

    const totalEarned = (db.prepare(`
      SELECT COALESCE(SUM(reward_amount), 0) as total FROM referral_rewards WHERE referrer_user_id = ? AND status = 'approved'
    `).get(userId) as any).total;

    return res.json({
      success: true,
      referral_code: user.referral_code,
      referral_link: `${req.protocol}://${req.get('host')}/#/register?ref=${user.referral_code}`,
      total_referred: referrals.length,
      total_earned: totalEarned,
      referrals,
      rewards,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/* ==========================================================================
   5. SUPPORT TICKETS ("Report Tracking Problem")
   ========================================================================== */

apiRouter.post('/user/support/ticket', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { click_id, campaign_id, category, subject, description } = req.body;
    if (!category || !subject || !description) {
      return res.status(400).json({ success: false, error: 'Category, subject, and description are required.' });
    }

    const ticketId = 'tkt_' + crypto.randomBytes(8).toString('hex');
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO support_tickets (id, user_id, click_id, campaign_id, category, subject, description, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
    `).run(ticketId, req.user!.id, click_id || null, campaign_id || null, category, subject.trim(), description.trim(), now, now);

    return res.json({
      success: true,
      ticket_id: ticketId,
      message: 'Support ticket submitted. Our tracking compliance team will review your click records within 24 hours.',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.get('/user/support/tickets', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const tickets = db.prepare(`
      SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC
    `).all(req.user!.id);
    return res.json({ success: true, tickets });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/* ==========================================================================
   6. ADMIN PORTAL (SECURE MANAGEMENT)
   ========================================================================== */

export function validateStrictNumericValue(val: any, fieldName: string, allowZero = false): { valid: boolean; value?: number; error?: string } {
  if (val === undefined || val === null) {
    return { valid: false, error: `${fieldName} is required.` };
  }
  let str = '';
  if (typeof val === 'number') {
    if (isNaN(val) || !isFinite(val)) {
      return { valid: false, error: `${fieldName} must be a finite number.` };
    }
    str = String(val);
  } else if (typeof val === 'string') {
    str = val.trim();
  } else {
    return { valid: false, error: `${fieldName} must be a valid number or numeric string.` };
  }

  if (!/^\d+(\.\d+)?$/.test(str)) {
    return { valid: false, error: `${fieldName} format invalid. Must be a clean non-negative numeric value without trailing characters.` };
  }

  const num = Number(str);
  if (isNaN(num) || !isFinite(num)) {
    return { valid: false, error: `${fieldName} must be a valid finite number.` };
  }

  if (allowZero) {
    if (num < 0) return { valid: false, error: `${fieldName} cannot be negative.` };
  } else {
    if (num <= 0) return { valid: false, error: `${fieldName} must be a positive number greater than 0.` };
  }

  return { valid: true, value: num };
}

// Helper validation for campaign payload
function validateCampaignPayload(body: any) {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid campaign payload.' };
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const advertiser_name = typeof body.advertiser_name === 'string' ? body.advertiser_name.trim() : '';
  const category = typeof body.category === 'string' ? body.category.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const tracking_url_template = typeof body.tracking_url_template === 'string' ? body.tracking_url_template.trim() : '';

  if (!name) return { valid: false, error: 'Campaign Name is required.' };
  if (!advertiser_name) return { valid: false, error: 'Advertiser Name is required.' };
  if (!category) return { valid: false, error: 'Category is required.' };
  if (!description) return { valid: false, error: 'Description is required.' };
  if (!tracking_url_template) return { valid: false, error: 'Tracking URL Template is required.' };

  // Validate URL template format
  try {
    const parsedUrl = new URL(tracking_url_template);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return { valid: false, error: 'Tracking URL Template must start with http:// or https://.' };
    }
  } catch {
    return { valid: false, error: 'Tracking URL Template is not a valid HTTP or HTTPS URL.' };
  }

  // Strict reward_amount validation
  const rewardVal = validateStrictNumericValue(body.reward_amount, 'Reward Amount', false);
  if (!rewardVal.valid) {
    return { valid: false, error: rewardVal.error };
  }

  // Strict status validation (no silent fallbacks)
  if (!body.status || typeof body.status !== 'string' || !['active', 'paused', 'draft'].includes(body.status.trim())) {
    return { valid: false, error: "Campaign status must be explicitly set to 'active', 'paused', or 'draft'." };
  }
  const status = body.status.trim();

  // Strict is_demo validation (no silent fallbacks)
  if (body.is_demo === undefined || body.is_demo === null) {
    return { valid: false, error: 'is_demo field is required (0 for Live, 1 for Demo).' };
  }
  let is_demo: number;
  if (body.is_demo === 0 || body.is_demo === '0' || body.is_demo === false) {
    is_demo = 0;
  } else if (body.is_demo === 1 || body.is_demo === '1' || body.is_demo === true) {
    is_demo = 1;
  } else {
    return { valid: false, error: 'is_demo must be 0 (Live) or 1 (Demo).' };
  }

  const estimated_approval_days = Math.max(0, parseInt(String(body.estimated_approval_days || '30'), 10) || 30);

  // Strict minimum_deposit_amount validation
  let minimum_deposit_amount = 0;
  if (body.minimum_deposit_amount !== undefined && body.minimum_deposit_amount !== null && String(body.minimum_deposit_amount).trim() !== '') {
    const minDepVal = validateStrictNumericValue(body.minimum_deposit_amount, 'Minimum Deposit Amount', true);
    if (!minDepVal.valid) {
      return { valid: false, error: minDepVal.error };
    }
    minimum_deposit_amount = minDepVal.value!;
  }

  const rawSteps = Array.isArray(body.steps) ? body.steps : [];
  const ALLOWED_STEP_TYPES = new Set(['install', 'signup', 'kyc', 'deposit', 'trade', 'other']);
  const steps = [];

  for (let i = 0; i < rawSteps.length; i++) {
    const s = rawSteps[i];
    if (!s || typeof s !== 'object') continue;
    const title = typeof s.title === 'string' ? s.title.trim() : '';
    const desc = typeof s.description === 'string' ? s.description.trim() : '';
    const rawStepType = typeof s.step_type === 'string' ? s.step_type.trim().toLowerCase() : '';

    if (!title) return { valid: false, error: `Step #${i + 1} is missing a title.` };
    if (!desc) return { valid: false, error: `Step #${i + 1} ('${title}') is missing a description.` };

    if (!rawStepType || !ALLOWED_STEP_TYPES.has(rawStepType)) {
      return { valid: false, error: `Step #${i + 1} ('${title}') has invalid step_type '${s.step_type}'. Allowed types: install, signup, kyc, deposit, trade, other.` };
    }

    let minDep = 0;
    if (s.min_deposit_amount !== undefined && s.min_deposit_amount !== null && String(s.min_deposit_amount).trim() !== '') {
      const stepDepVal = validateStrictNumericValue(s.min_deposit_amount, `Step #${i + 1} Minimum Deposit Amount`, true);
      if (!stepDepVal.valid) {
        return { valid: false, error: stepDepVal.error };
      }
      minDep = stepDepVal.value!;
    }

    steps.push({
      step_order: i + 1,
      step_type: rawStepType,
      title,
      description: desc,
      is_required: s.is_required === 0 || s.is_required === '0' || s.is_required === false ? 0 : 1,
      min_deposit_amount: minDep,
    });
  }

  return {
    valid: true,
    data: {
      name,
      advertiser_name,
      category,
      description,
      tracking_url_template,
      reward_amount: rewardVal.value!,
      currency: typeof body.currency === 'string' && body.currency.trim() ? body.currency.trim().toUpperCase() : 'INR',
      provider: typeof body.provider === 'string' && body.provider.trim() ? body.provider.trim().toLowerCase() : 'mitgo',
      provider_campaign_id: typeof body.provider_campaign_id === 'string' && body.provider_campaign_id.trim() ? body.provider_campaign_id.trim() : null,
      logo_url: typeof body.logo_url === 'string' && body.logo_url.trim() ? body.logo_url.trim() : null,
      terms: typeof body.terms === 'string' && body.terms.trim() ? body.terms.trim() : null,
      estimated_approval_days,
      is_demo,
      status,
      requires_install: steps.some((st) => st.step_type === 'install') ? 1 : (body.requires_install ? 1 : 0),
      requires_signup: steps.some((st) => st.step_type === 'signup') ? 1 : (body.requires_signup ? 1 : 0),
      requires_kyc: steps.some((st) => st.step_type === 'kyc') ? 1 : (body.requires_kyc ? 1 : 0),
      requires_deposit: steps.some((st) => st.step_type === 'deposit') ? 1 : (body.requires_deposit ? 1 : 0),
      minimum_deposit_amount,
      steps,
    },
  };
}

// 1. Get all campaigns for admin dashboard
apiRouter.get('/admin/campaigns', requireAdmin, (req: Request, res: Response) => {
  try {
    const campaigns = db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM campaign_steps WHERE campaign_id = c.id) as step_count,
        (SELECT COUNT(*) FROM offer_clicks WHERE campaign_id = c.id) as total_clicks,
        (SELECT COUNT(*) FROM conversions WHERE campaign_id = c.id) as total_conversions
      FROM campaigns c
      ORDER BY c.created_at DESC
    `).all();

    return res.json({ success: true, campaigns });
  } catch (err: any) {
    console.error('Error fetching admin campaigns:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch admin campaigns list.' });
  }
});

// 2. Get single campaign with full dynamic steps
apiRouter.get('/admin/campaigns/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const campaignId = String(req.params.id);
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId) as any;
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found.' });
    }

    const steps = db.prepare('SELECT * FROM campaign_steps WHERE campaign_id = ? ORDER BY step_order ASC').all(campaignId);

    return res.json({ success: true, campaign: { ...campaign, steps } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to fetch campaign details.' });
  }
});

// 3. Create new campaign with dynamic steps (Transactional)
apiRouter.post('/admin/campaigns', requireAdmin, (req: Request, res: Response) => {
  try {
    const validation = validateCampaignPayload(req.body);
    if (!validation.valid || !validation.data) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const d = validation.data;

    // LIVE CAMPAIGN SAFETY: Prevent creating active live campaigns if provider is unverified
    if (d.is_demo === 0 && d.status === 'active') {
      const provider = db.prepare('SELECT * FROM provider_integrations WHERE id = ?').get(d.provider || 'mitgo') as any;
      if (!provider || !provider.is_live) {
        return res.status(400).json({
          success: false,
          error: `Cannot activate live campaign '${d.name}': provider integration '${d.provider || 'mitgo'}' is unverified or not live. Please set is_demo = 1 or set status to 'draft'/'paused' until provider is live.`,
        });
      }
    }

    const campaignId = 'cmp_' + crypto.randomBytes(8).toString('hex');
    const now = new Date().toISOString();
    const adminId = (req as AuthenticatedRequest).admin?.id || null;

    db.exec('BEGIN IMMEDIATE;');
    try {
      db.prepare(`
        INSERT INTO campaigns (
          id, provider, provider_campaign_id, name, advertiser_name, category, logo_url,
          description, terms, reward_amount, currency, tracking_url_template,
          estimated_approval_days, is_demo, status, requires_install, requires_signup,
          requires_kyc, requires_deposit, minimum_deposit_amount, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?
        )
      `).run(
        campaignId, d.provider, d.provider_campaign_id, d.name, d.advertiser_name, d.category, d.logo_url,
        d.description, d.terms, d.reward_amount, d.currency, d.tracking_url_template,
        d.estimated_approval_days, d.is_demo, d.status, d.requires_install, d.requires_signup,
        d.requires_kyc, d.requires_deposit, d.minimum_deposit_amount, now, now
      );

      for (const step of d.steps) {
        const stepId = 'step_' + crypto.randomBytes(8).toString('hex');
        db.prepare(`
          INSERT INTO campaign_steps (
            id, campaign_id, step_order, step_type, title, description, is_required, min_deposit_amount, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(stepId, campaignId, step.step_order, step.step_type, step.title, step.description, step.is_required, step.min_deposit_amount, now);
      }

      db.exec('COMMIT;');
    } catch (txErr) {
      db.exec('ROLLBACK;');
      throw txErr;
    }

    logAdminActivity(
      adminId,
      'CAMPAIGN_CREATED',
      { campaign_id: campaignId, name: d.name, is_demo: d.is_demo, status: d.status, step_count: d.steps.length },
      req.ip,
      req.headers['user-agent'] as string
    );

    return res.status(201).json({
      success: true,
      message: `Campaign '${d.name}' created successfully.`,
      campaign_id: campaignId,
    });
  } catch (err: any) {
    console.error('Error creating campaign:', err);
    return res.status(500).json({ success: false, error: 'Failed to create campaign.' });
  }
});

// 4. Update campaign with dynamic steps (Transactional)
apiRouter.put('/admin/campaigns/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const campaignId = String(req.params.id);
    const existing = db.prepare('SELECT id FROM campaigns WHERE id = ?').get(campaignId);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Campaign not found.' });
    }

    const validation = validateCampaignPayload(req.body);
    if (!validation.valid || !validation.data) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const d = validation.data;

    // LIVE CAMPAIGN SAFETY: Prevent updating to active live campaign if provider is unverified
    if (d.is_demo === 0 && d.status === 'active') {
      const provider = db.prepare('SELECT * FROM provider_integrations WHERE id = ?').get(d.provider || 'mitgo') as any;
      if (!provider || !provider.is_live) {
        return res.status(400).json({
          success: false,
          error: `Cannot activate live campaign '${d.name}': provider integration '${d.provider || 'mitgo'}' is unverified or not live. Please set is_demo = 1 or set status to 'draft'/'paused' until provider is live.`,
        });
      }
    }

    const now = new Date().toISOString();
    const adminId = (req as AuthenticatedRequest).admin?.id || null;

    db.exec('BEGIN IMMEDIATE;');
    try {
      db.prepare(`
        UPDATE campaigns SET
          provider = ?, provider_campaign_id = ?, name = ?, advertiser_name = ?, category = ?, logo_url = ?,
          description = ?, terms = ?, reward_amount = ?, currency = ?, tracking_url_template = ?,
          estimated_approval_days = ?, is_demo = ?, status = ?, requires_install = ?, requires_signup = ?,
          requires_kyc = ?, requires_deposit = ?, minimum_deposit_amount = ?, updated_at = ?
        WHERE id = ?
      `).run(
        d.provider, d.provider_campaign_id, d.name, d.advertiser_name, d.category, d.logo_url,
        d.description, d.terms, d.reward_amount, d.currency, d.tracking_url_template,
        d.estimated_approval_days, d.is_demo, d.status, d.requires_install, d.requires_signup,
        d.requires_kyc, d.requires_deposit, d.minimum_deposit_amount, now,
        campaignId
      );

      db.prepare('DELETE FROM campaign_steps WHERE campaign_id = ?').run(campaignId);

      for (const step of d.steps) {
        const stepId = 'step_' + crypto.randomBytes(8).toString('hex');
        db.prepare(`
          INSERT INTO campaign_steps (
            id, campaign_id, step_order, step_type, title, description, is_required, min_deposit_amount, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(stepId, campaignId, step.step_order, step.step_type, step.title, step.description, step.is_required, step.min_deposit_amount, now);
      }

      db.exec('COMMIT;');
    } catch (txErr) {
      db.exec('ROLLBACK;');
      throw txErr;
    }

    logAdminActivity(
      adminId,
      'CAMPAIGN_UPDATED',
      { campaign_id: campaignId, name: d.name, is_demo: d.is_demo, status: d.status, step_count: d.steps.length },
      req.ip,
      req.headers['user-agent'] as string
    );

    return res.json({
      success: true,
      message: `Campaign '${d.name}' updated successfully.`,
    });
  } catch (err: any) {
    console.error('Error updating campaign:', err);
    return res.status(500).json({ success: false, error: 'Failed to update campaign.' });
  }
});

// 5. Change campaign status (active, paused, draft)
apiRouter.patch('/admin/campaigns/:id/status', requireAdmin, (req: Request, res: Response) => {
  try {
    const campaignId = String(req.params.id);
    const { status } = req.body;
    if (!['active', 'paused', 'draft'].includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status. Must be 'active', 'paused', or 'draft'." });
    }

    const campaign = db.prepare('SELECT id, name, provider, is_demo FROM campaigns WHERE id = ?').get(campaignId) as any;
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found.' });
    }

    if (status === 'active' && campaign.is_demo === 0) {
      const provider = db.prepare('SELECT * FROM provider_integrations WHERE id = ?').get(campaign.provider || 'mitgo') as any;
      if (!provider || !provider.is_live) {
        return res.status(400).json({
          success: false,
          error: `Cannot activate live campaign '${campaign.name}': provider integration '${campaign.provider || 'mitgo'}' is unverified or not live. Please set is_demo = 1 or change status to 'draft'/'paused' until provider is live.`,
        });
      }
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE campaigns SET status = ?, updated_at = ? WHERE id = ?').run(status, now, campaignId);

    const adminId = (req as AuthenticatedRequest).admin?.id || null;
    logAdminActivity(
      adminId,
      'CAMPAIGN_STATUS_CHANGED',
      { campaign_id: campaignId, name: campaign.name, new_status: status },
      req.ip,
      req.headers['user-agent'] as string
    );

    return res.json({
      success: true,
      message: `Campaign '${campaign.name}' status changed to '${status}'.`,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to update campaign status.' });
  }
});

// 6. Delete campaign (or archive if active tracking history exists)
apiRouter.delete('/admin/campaigns/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const campaignId = String(req.params.id);
    const campaign = db.prepare('SELECT id, name FROM campaigns WHERE id = ?').get(campaignId) as any;
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found.' });
    }

    const adminId = (req as AuthenticatedRequest).admin?.id || null;
    const clicksCount = (db.prepare('SELECT COUNT(*) as c FROM offer_clicks WHERE campaign_id = ?').get(campaignId) as any).c;
    const conversionsCount = (db.prepare('SELECT COUNT(*) as c FROM conversions WHERE campaign_id = ?').get(campaignId) as any).c;

    if (clicksCount > 0 || conversionsCount > 0) {
      db.prepare("UPDATE campaigns SET status = 'draft', updated_at = ? WHERE id = ?").run(new Date().toISOString(), campaignId);
      logAdminActivity(
        adminId,
        'CAMPAIGN_ARCHIVED',
        { campaign_id: campaignId, name: campaign.name, reason: 'has_existing_tracking_history' },
        req.ip,
        req.headers['user-agent'] as string
      );
      return res.json({
        success: true,
        message: `Campaign '${campaign.name}' has existing click/conversion records, so it was set to 'Draft' to preserve tracking integrity.`,
        archived: true,
      });
    }

    db.exec('BEGIN IMMEDIATE;');
    try {
      db.prepare('DELETE FROM campaign_steps WHERE campaign_id = ?').run(campaignId);
      db.prepare('DELETE FROM campaigns WHERE id = ?').run(campaignId);
      db.exec('COMMIT;');
    } catch (txErr) {
      db.exec('ROLLBACK;');
      throw txErr;
    }

    logAdminActivity(
      adminId,
      'CAMPAIGN_DELETED',
      { campaign_id: campaignId, name: campaign.name },
      req.ip,
      req.headers['user-agent'] as string
    );

    return res.json({
      success: true,
      message: `Campaign '${campaign.name}' deleted successfully.`,
      deleted: true,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to delete campaign.' });
  }
});

apiRouter.get('/admin/metrics', requireAdmin, (req: Request, res: Response) => {
  try {
    const totalUsers = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c;
    const totalCampaigns = (db.prepare('SELECT COUNT(*) as c FROM campaigns').get() as any).c;
    const totalClicks = (db.prepare('SELECT COUNT(*) as c FROM offer_clicks').get() as any).c;

    const installs = (db.prepare("SELECT COUNT(*) as c FROM offer_events WHERE step_type = 'install'").get() as any).c;
    const signups = (db.prepare("SELECT COUNT(*) as c FROM offer_events WHERE step_type = 'signup'").get() as any).c;
    const kycs = (db.prepare("SELECT COUNT(*) as c FROM offer_events WHERE step_type = 'kyc'").get() as any).c;
    const deposits = (db.prepare("SELECT COUNT(*) as c FROM offer_events WHERE step_type = 'deposit'").get() as any).c;

    const pendingConversions = (db.prepare("SELECT COUNT(*) as c FROM conversions WHERE status = 'pending_approval'").get() as any).c;
    const approvedConversions = (db.prepare("SELECT COUNT(*) as c FROM conversions WHERE status = 'approved'").get() as any).c;
    const rejectedConversions = (db.prepare("SELECT COUNT(*) as c FROM conversions WHERE status = 'rejected'").get() as any).c;

    const totalCashbackPaid = (db.prepare("SELECT COALESCE(SUM(amount), 0) as s FROM cashback_ledger WHERE type = 'withdrawal_debit'").get() as any).s;
    const pendingWithdrawalsCount = (db.prepare("SELECT COUNT(*) as c FROM withdrawal_requests WHERE status = 'pending'").get() as any).c;
    const openTicketsCount = (db.prepare("SELECT COUNT(*) as c FROM support_tickets WHERE status = 'open'").get() as any).c;

    return res.json({
      success: true,
      metrics: {
        total_users: totalUsers,
        total_campaigns: totalCampaigns,
        total_clicks: totalClicks,
        confirmed_installs: installs,
        confirmed_signups: signups,
        confirmed_kyc: kycs,
        confirmed_deposits: deposits,
        pending_conversions: pendingConversions,
        approved_conversions: approvedConversions,
        rejected_conversions: rejectedConversions,
        total_cashback_paid: totalCashbackPaid,
        pending_withdrawals: pendingWithdrawalsCount,
        open_tickets: openTicketsCount,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.get('/admin/users', requireAdmin, (req: Request, res: Response) => {
  const users = db.prepare(`
    SELECT id, email, phone, name, role, referral_code, status, created_at FROM users ORDER BY created_at DESC LIMIT 100
  `).all();
  return res.json({ success: true, users });
});

apiRouter.get('/admin/withdrawals', requireAdmin, (req: Request, res: Response) => {
  const withdrawals = db.prepare(`
    SELECT w.*, u.name as user_name, u.email as user_email
    FROM withdrawal_requests w
    JOIN users u ON w.user_id = u.id
    ORDER BY w.requested_at DESC
  `).all();
  return res.json({ success: true, withdrawals });
});

apiRouter.put('/admin/withdrawals/:id/status', requireAdmin, (req: Request, res: Response) => {
  try {
    const { status, reference_id, rejection_reason } = req.body;
    const now = new Date().toISOString();
    const withdrawalId = String(req.params.id);

    if (!['approved', 'rejected', 'processing'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid withdrawal status.' });
    }

    const wdr = db.prepare('SELECT id, user_id, amount, status FROM withdrawal_requests WHERE id = ?').get(withdrawalId) as any;
    if (!wdr) {
      return res.status(404).json({ success: false, error: 'Withdrawal request not found.' });
    }

    // STRICT IDEMPOTENCY: An already processed withdrawal cannot be re-processed or re-refunded
    if (wdr.status !== 'pending' && wdr.status !== 'processing') {
      return res.status(400).json({
        success: false,
        error: `Withdrawal request has already been finalized (current status: '${wdr.status}'). Duplicate status modifications or repeated refunds are strictly prevented.`,
      });
    }

    db.exec('BEGIN IMMEDIATE;');
    try {
      db.prepare(`
        UPDATE withdrawal_requests
        SET status = ?, reference_id = ?, rejection_reason = ?, processed_at = ?
        WHERE id = ?
      `).run(status, reference_id || null, rejection_reason || null, now, withdrawalId);

      // If rejected, refund the held balance back to user's withdrawable ledger EXACTLY ONCE
      if (status === 'rejected') {
        const ledgerId = 'ldg_' + crypto.randomBytes(8).toString('hex');
        db.prepare(`
          INSERT INTO cashback_ledger (id, user_id, type, amount, balance_type, status, description, created_at)
          VALUES (?, ?, 'admin_adjustment', ?, 'withdrawable', 'available', ?, ?)
        `).run(ledgerId, wdr.user_id, wdr.amount, `Refund of Rejected Withdrawal Request (${withdrawalId})`, now);
      }

      db.exec('COMMIT;');
    } catch (txErr) {
      db.exec('ROLLBACK;');
      throw txErr;
    }

    return res.json({ success: true, message: `Withdrawal request marked as ${status}.` });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to update withdrawal status.' });
  }
});

apiRouter.get('/admin/tickets', requireAdmin, (req: Request, res: Response) => {
  const tickets = db.prepare(`
    SELECT t.*, u.name as user_name, u.email as user_email
    FROM support_tickets t
    JOIN users u ON t.user_id = u.id
    ORDER BY t.created_at DESC
  `).all();
  return res.json({ success: true, tickets });
});

apiRouter.put('/admin/tickets/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    const { status, admin_notes } = req.body;
    const now = new Date().toISOString();
    const ticketId = String(req.params.id);
    db.prepare(`
      UPDATE support_tickets
      SET status = COALESCE(?, status), admin_notes = COALESCE(?, admin_notes), updated_at = ?
      WHERE id = ?
    `).run(status || null, admin_notes || null, now, ticketId);
    return res.json({ success: true, message: 'Ticket updated.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.get('/admin/postback-logs', requireAdmin, (req: Request, res: Response) => {
  const logs = db.prepare('SELECT * FROM postback_logs ORDER BY created_at DESC LIMIT 50').all();
  return res.json({ success: true, logs });
});

apiRouter.get('/admin/provider-status', requireAdmin, (req: Request, res: Response) => {
  const provider = db.prepare('SELECT id, name, is_live, status, last_sync_at, created_at FROM provider_integrations WHERE id = ?').get('mitgo') as any;
  const hasClientId = Boolean(process.env.MITGO_CLIENT_ID);
  const hasClientSecret = Boolean(process.env.MITGO_CLIENT_SECRET);
  const hasPostbackKey = Boolean(process.env.MITGO_POSTBACK_KEY);

  return res.json({
    success: true,
    provider: {
      id: 'mitgo',
      name: 'Mitgo Performance Network',
      is_live: 0, // Zero until live credentials verified
      status: hasClientId && hasPostbackKey ? 'configured_unverified' : 'sandbox_demo_mode',
      integration_mode: 'Sandbox / Testing (No Live Mitgo Credentials Configured)',
      has_client_id: hasClientId,
      has_client_secret: hasClientSecret,
      has_api_key: Boolean(process.env.MITGO_API_KEY),
      has_postback_key: hasPostbackKey,
      notes: 'Live tracking requires active Mitgo API client ID, client secret, and verified postback key in production environment.',
    },
  });
});

// SIMULATED PROVIDER EVENT TOOL (Sandbox Tester Only - Strictly Rejected in Production)
apiRouter.post('/admin/simulate-postback', requireAdmin, (req: Request, res: Response) => {
  try {
    // 1. Strictly forbid simulation in production environments
    if (config.isProd || process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Simulation tool is permanently disabled in production environments. Simulated postbacks are rejected to protect ledger integrity.',
      });
    }

    const { click_id, event_type, amount, is_duplicate } = req.body;
    if (!click_id || !event_type) {
      return res.status(400).json({ success: false, error: 'click_id and event_type are required.' });
    }

    const click = db.prepare(`
      SELECT c.*, cmp.is_demo, cmp.name as campaign_name, cmp.reward_amount as default_reward
      FROM offer_clicks c
      JOIN campaigns cmp ON c.campaign_id = cmp.id
      WHERE c.click_id = ?
    `).get(click_id) as any;

    if (!click) {
      return res.status(404).json({ success: false, error: 'Click ID not found.' });
    }

    // 2. Prevent simulating on non-demo/live advertiser campaigns
    if (click.is_demo !== 1) {
      return res.status(400).json({
        success: false,
        error: 'Simulation is restricted strictly to Sandbox Demo campaigns (is_demo = 1). Live advertiser campaigns cannot be simulated.',
      });
    }

    // Use fixed tx_id if testing duplicate protection
    const txId = is_duplicate ? 'SIM_DUP_TX_9999' : 'SIM_SANDBOX_' + Date.now();
    const now = new Date().toISOString();

    // Check duplicate
    const existing = db.prepare(`
      SELECT id FROM offer_events WHERE click_id = ? AND transaction_id = ? AND step_type = ?
    `).get(click_id, txId, event_type);

    if (existing) {
      return res.json({
        success: true,
        message: 'Duplicate event detected! Idempotency protection successfully dropped duplicate without double credit.',
        is_duplicate: true,
      });
    }

    // Insert simulated event with clear sandbox tags
    db.prepare(`
      INSERT INTO offer_events (id, click_id, user_id, campaign_id, step_type, event_name, status, transaction_id, metadata, is_provider_verified, verification_source, verified_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'sandbox_confirmed', ?, '{"sandbox_simulation": true, "environment": "development"}', 1, 'sandbox_simulation', ?, ?)
    `).run(
      'evt_sim_' + crypto.randomBytes(8).toString('hex'),
      click_id,
      click.user_id,
      click.campaign_id,
      event_type,
      `[SANDBOX] Simulated ${event_type.toUpperCase()} Event`,
      txId,
      now,
      now
    );

    // If event is approval, ensure required steps are confirmed first
    if (event_type === 'approval' || event_type === 'approved') {
      const configuredSteps = db.prepare(`
        SELECT step_type FROM campaign_steps WHERE campaign_id = ? AND is_required = 1
      `).all(click.campaign_id) as { step_type: string }[];

      const confirmedEvents = db.prepare(`
        SELECT step_type FROM offer_events WHERE click_id = ? AND status IN ('confirmed', 'sandbox_confirmed')
      `).all(click_id) as { step_type: string }[];
      const confirmedTypes = new Set(confirmedEvents.map((e) => e.step_type.toLowerCase()));

      const missingSteps: string[] = [];
      if (configuredSteps.length > 0) {
        for (const step of configuredSteps) {
          if (!confirmedTypes.has(step.step_type.toLowerCase())) {
            missingSteps.push(step.step_type);
          }
        }
      } else {
        const fullCampaign = db.prepare('SELECT requires_install, requires_signup, requires_kyc, requires_deposit FROM campaigns WHERE id = ?').get(click.campaign_id) as any;
        if (fullCampaign?.requires_install && !confirmedTypes.has('install')) missingSteps.push('install');
        if (fullCampaign?.requires_signup && !confirmedTypes.has('signup')) missingSteps.push('signup');
        if (fullCampaign?.requires_kyc && !confirmedTypes.has('kyc')) missingSteps.push('kyc');
        if (fullCampaign?.requires_deposit && !confirmedTypes.has('deposit')) missingSteps.push('deposit');
      }

      if (missingSteps.length > 0) {
        return res.status(422).json({
          success: false,
          error: `Simulated approval rejected: campaign steps not completed. Missing required steps: ${missingSteps.join(', ')}. Simulate individual steps first before simulating approval.`,
          missing_steps: missingSteps,
        });
      }

      const approvalResult = approveConversion(click_id, click.user_id, amount || click.default_reward, txId, now);
      if (!approvalResult.success) {
        return res.status(422).json({
          success: false,
          error: approvalResult.error || 'Simulated conversion approval failed.',
          missing_steps: approvalResult.missing_steps,
        });
      }
    }

    return res.json({
      success: true,
      message: `[SANDBOX] Simulated event '${event_type}' processed for demo offer '${click.campaign_name}'.`,
      sandbox: true,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'Failed to process simulated postback.' });
  }
});
