import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { db, hashPassword, verifyPassword } from './db.js';

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

    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND status = "active"').get(campaign_id) as any;
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
      SELECT c.*, cmp.tracking_url_template, cmp.name, cmp.is_demo
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

    // Fetch campaign steps
    const steps = db.prepare('SELECT * FROM campaign_steps WHERE campaign_id = ? ORDER BY step_order ASC').all(click.campaign_id) as any[];

    // Fetch verified events
    const events = db.prepare('SELECT * FROM offer_events WHERE click_id = ? ORDER BY created_at ASC').all(click.click_id) as any[];

    const completedStepTypes = new Set(events.filter((e) => e.status === 'confirmed').map((e) => e.step_type));

    // Determine current timeline status for each step
    const timeline = [];

    // Step: App Install
    if (click.requires_install) {
      const isDone = completedStepTypes.has('install');
      timeline.push({
        type: 'install',
        title: '1. App Install',
        status: isDone ? 'Install Completed' : 'Verifying Install',
        state: isDone ? 'completed' : 'verifying',
        instruction: isDone
          ? 'Installation confirmed by provider. Proceed to the next step.'
          : 'Download and open the app. Waiting for advertiser install postback confirmation.',
        is_required: true,
      });
    }

    // Step: Signup
    if (click.requires_signup) {
      const isDone = completedStepTypes.has('signup');
      const priorReady = !click.requires_install || completedStepTypes.has('install');
      timeline.push({
        type: 'signup',
        title: '2. Account Registration',
        status: isDone ? 'Signup Completed' : priorReady ? 'Action Required' : 'Waiting for Install',
        state: isDone ? 'completed' : priorReady ? 'action_required' : 'pending_prior',
        instruction: isDone
          ? 'Registration verified by advertiser.'
          : 'Open the advertiser application and register with your mobile phone or email.',
        is_required: true,
      });
    }

    // Step: KYC
    if (click.requires_kyc) {
      const isDone = completedStepTypes.has('kyc');
      const priorReady = completedStepTypes.has('signup');
      timeline.push({
        type: 'kyc',
        title: '3. Identity / KYC Verification',
        status: isDone ? 'KYC Completed' : priorReady ? 'Action Required' : 'Pending Previous Steps',
        state: isDone ? 'completed' : priorReady ? 'action_required' : 'pending_prior',
        instruction: isDone
          ? 'Identity verification verified by advertiser records.'
          : 'Complete in-app paperless KYC. RoyCash does not inspect external apps directly.',
        is_required: true,
      });
    }

    // Step: Deposit
    if (click.requires_deposit) {
      const isDone = completedStepTypes.has('deposit');
      const priorReady = (!click.requires_kyc || completedStepTypes.has('kyc')) && completedStepTypes.has('signup');
      timeline.push({
        type: 'deposit',
        title: `4. First Deposit / Purchase (Min ₹${click.minimum_deposit_amount})`,
        status: isDone ? 'Deposit Verified' : priorReady ? 'Action Required' : 'Pending Previous Steps',
        state: isDone ? 'completed' : priorReady ? 'action_required' : 'pending_prior',
        instruction: isDone
          ? `Deposit of ₹${click.minimum_deposit_amount}+ confirmed by advertiser.`
          : `Complete a minimum transaction/deposit of ₹${click.minimum_deposit_amount} inside the app.`,
        is_required: true,
      });
    }

    // Final Step: Cashback Settlement
    const convStatus = click.conversion_status || 'click_recorded';
    timeline.push({
      type: 'cashback',
      title: '5. Cashback Approval & Payout',
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
   3. MITGO S2S POSTBACK / WEBHOOK INGESTION
   ========================================================================== */

// Accept both GET and POST for maximum affiliate network compatibility
apiRouter.all('/postback/mitgo', (req: Request, res: Response) => {
  try {
    const params = { ...req.query, ...req.body };
    const clickId = params.click_id || params.subid || params.subid1;
    const txId = params.order_id || params.tx_id || params.transaction_id || ('tx_' + Date.now());
    const eventType = (params.event || params.status || 'action').toLowerCase();
    const amount = parseFloat(params.amount || params.payout || '0');
    const token = params.token || params.key || req.headers['x-mitgo-signature'];
    const now = new Date().toISOString();

    const providerConfig = db.prepare('SELECT * FROM provider_integrations WHERE id = ?').get('mitgo') as any;

    // Signature verification if postback_key is configured
    let signatureValid = true;
    if (providerConfig?.postback_key && providerConfig.postback_key !== 'sec_mitgo_sandbox_key') {
      if (token !== providerConfig.postback_key) {
        signatureValid = false;
      }
    }

    if (!signatureValid) {
      logPostback('mitgo', req.method, JSON.stringify(params), JSON.stringify(req.headers), clickId, txId, eventType, 'signature_invalid', 403);
      return res.status(403).json({ success: false, error: 'Invalid postback token/signature.' });
    }

    if (!clickId) {
      logPostback('mitgo', req.method, JSON.stringify(params), JSON.stringify(req.headers), null, txId, eventType, 'missing_click_id', 400);
      return res.status(400).json({ success: false, error: 'Missing click_id parameter.' });
    }

    const click = db.prepare(`
      SELECT c.*, cmp.requires_install, cmp.requires_signup, cmp.requires_kyc, cmp.requires_deposit, cmp.reward_amount
      FROM offer_clicks c
      JOIN campaigns cmp ON c.campaign_id = cmp.id
      WHERE c.click_id = ?
    `).get(clickId) as any;

    if (!click) {
      logPostback('mitgo', req.method, JSON.stringify(params), JSON.stringify(req.headers), clickId, txId, eventType, 'click_not_found', 404);
      return res.status(404).json({ success: false, error: 'Click ID not found in ledger.' });
    }

    // Idempotency check: Reject duplicate event for same transaction_id
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
      INSERT INTO offer_events (id, click_id, user_id, campaign_id, step_type, event_name, status, transaction_id, metadata, verified_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?, ?)
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

    // Evaluate overall campaign step completion
    const events = db.prepare('SELECT step_type FROM offer_events WHERE click_id = ? AND status = "confirmed"').all(clickId) as any[];
    const confirmedTypes = new Set(events.map((e) => e.step_type));

    const needsInstall = click.requires_install && !confirmedTypes.has('install');
    const needsSignup = click.requires_signup && !confirmedTypes.has('signup');
    const needsKyc = click.requires_kyc && !confirmedTypes.has('kyc');
    const needsDeposit = click.requires_deposit && !confirmedTypes.has('deposit');

    const allStepsDone = !needsInstall && !needsSignup && !needsKyc && !needsDeposit;

    if (eventType === 'rejected' || eventType === 'declined') {
      db.prepare(`
        UPDATE conversions
        SET status = 'rejected', rejection_reason = ?, updated_at = ?
        WHERE click_id = ?
      `).run(params.reason || 'Declined by advertiser validation', now, clickId);
    } else if (eventType === 'approved' || (allStepsDone && eventType === 'approval')) {
      // Approve and credit cashback!
      approveConversion(clickId, click.user_id, amount || click.reward_amount, txId, now);
    } else if (allStepsDone) {
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

function logPostback(provider: string, method: string, payload: string, headers: string, clickId: string | null, txId: string, eventType: string, status: string, code: number) {
  try {
    db.prepare(`
      INSERT INTO postback_logs (id, provider, endpoint, method, payload, headers, click_id, transaction_id, event_type, status, response_code, created_at)
      VALUES (?, ?, '/api/postback/mitgo', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'pbl_' + crypto.randomBytes(8).toString('hex'),
      provider,
      method,
      payload,
      headers,
      clickId,
      txId,
      eventType,
      status,
      code,
      new Date().toISOString()
    );
  } catch (e) {
    console.error('Failed to log postback:', e);
  }
}

function approveConversion(clickId: string, userId: string, rewardAmount: number, txId: string, now: string) {
  db.exec('BEGIN IMMEDIATE;');
  try {
    const conversion = db.prepare('SELECT id, status FROM conversions WHERE click_id = ?').get(clickId) as any;
    if (!conversion || conversion.status === 'approved') {
      db.exec('ROLLBACK;');
      return;
    }

    // Check if cashback credit already exists in ledger for this conversion to prevent double credit
    const existingCredit = db.prepare(`
      SELECT id FROM cashback_ledger WHERE conversion_id = ? AND type = 'cashback_credit'
    `).get(conversion.id);

    if (existingCredit) {
      db.exec('ROLLBACK;');
      return;
    }

    db.prepare(`
      UPDATE conversions
      SET status = 'approved', approved_at = ?, provider_conversion_id = ?, updated_at = ?
      WHERE click_id = ?
    `).run(now, txId, now, clickId);

    // Credit cashback ledger as withdrawable
    const ledgerId = 'ldg_' + crypto.randomBytes(8).toString('hex');
    db.prepare(`
      INSERT INTO cashback_ledger (id, user_id, conversion_id, type, amount, balance_type, status, description, created_at)
      VALUES (?, ?, ?, 'cashback_credit', ?, 'withdrawable', 'available', 'Verified Cashback Reward', ?)
    `).run(ledgerId, userId, conversion.id, rewardAmount, now);

    // Check for referrer reward (e.g. 10% referral commission)
    const refRel = db.prepare('SELECT * FROM referral_relationships WHERE referred_user_id = ? AND status = "active"').get(userId) as any;
    if (refRel) {
      const refRewardAmount = Math.round(rewardAmount * 0.1); // 10%
      if (refRewardAmount > 0) {
        // Prevent duplicate referral reward for this conversion
        const existingRefReward = db.prepare('SELECT id FROM referral_rewards WHERE source_conversion_id = ?').get(conversion.id);
        if (!existingRefReward) {
          const rewardId = 'rw_' + crypto.randomBytes(8).toString('hex');
          db.prepare(`
            INSERT INTO referral_rewards (id, relationship_id, referrer_user_id, referred_user_id, source_conversion_id, reward_amount, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'approved', ?)
          `).run(rewardId, refRel.id, refRel.referrer_user_id, userId, conversion.id, refRewardAmount, now);

          const refLedgerId = 'ldg_' + crypto.randomBytes(8).toString('hex');
          db.prepare(`
            INSERT INTO cashback_ledger (id, user_id, conversion_id, type, amount, balance_type, status, description, created_at)
            VALUES (?, ?, ?, 'referral_credit', ?, 'withdrawable', 'available', 'Referral Commission from Friend Offer', ?)
          `).run(refLedgerId, refRel.referrer_user_id, conversion.id, refRewardAmount, now);
        }
      }
    }

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    console.error('Error in approveConversion:', err);
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
    WHERE user_id = ? AND type IN ('cashback_credit', 'referral_credit') AND status = 'available'
  `).get(userId) as any;

  const debits = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total
    FROM cashback_ledger
    WHERE user_id = ? AND type IN ('withdrawal_debit', 'reversal_debit')
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
      INSERT INTO offer_events (id, click_id, user_id, campaign_id, step_type, event_name, status, transaction_id, metadata, verified_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'sandbox_confirmed', ?, '{"sandbox_simulation": true, "environment": "development"}', ?, ?)
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

    // If event is approval, approve conversion in sandbox mode
    if (event_type === 'approval' || event_type === 'approved') {
      approveConversion(click_id, click.user_id, amount || click.default_reward, txId, now);
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
