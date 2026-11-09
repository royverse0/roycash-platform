import path from 'node:path';
import fs from 'node:fs';
import type { Server } from 'node:http';

// 1. DYNAMICALLY ISOLATE DATABASE PATH & PORT BEFORE MODULE IMPORTS
const testDbPath = path.resolve(process.cwd(), 'data', 'test_roycash_security_isolated.sqlite');
process.env.DATABASE_PATH = testDbPath;
process.env.PORT = '3999';

// Ensure data directory exists
if (!fs.existsSync(path.dirname(testDbPath))) {
  fs.mkdirSync(path.dirname(testDbPath), { recursive: true });
}

// Clean any pre-existing temporary test DB files
for (const ext of ['', '-wal', '-shm']) {
  if (fs.existsSync(testDbPath + ext)) {
    try { fs.unlinkSync(testDbPath + ext); } catch {}
  }
}

// Import server modules after DATABASE_PATH is defined
const { db, initDatabase, hashPassword } = await import('./server/db.js');
const { approveConversion } = await import('./server/api.js');
const { config, validateProductionConfig } = await import('./server/config.js');
const { apiRouter } = await import('./server/api.js');
const { adminAuthRouter, adminAuthMiddleware } = await import('./server/adminAuth.js');
import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';

async function runComprehensiveSecuritySuite() {
  console.log('================================================================');
  console.log('ROYCASH COMPREHENSIVE SECURITY AUDIT & VERIFICATION SUITE (ROUND 2)');
  console.log('================================================================');
  console.log('Environment Setup: Node.js, Express, Isolated SQLite WAL Database');
  console.log(`Target Test Database: ${testDbPath}`);
  console.log(`Target Test Server Base URL: http://127.0.0.1:3999`);
  console.log('Database Isolation: 100% Isolated Temporary Test DB (data/roycash.sqlite untouched)');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, desc: string) {
    total++;
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
      process.exitCode = 1;
    }
  }

  // Initialize SQLite schema on test database
  initDatabase();

  // Spin up an isolated Express HTTP server instance on port 3999 for CSRF & Auth testing
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  // Anti-CSRF protection middleware matching production server.ts logic
  app.use((req: Request, res: Response, next: NextFunction) => {
    const mutatingMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
    if (mutatingMethods.includes(req.method) && req.path.startsWith('/api')) {
      if (req.path.startsWith('/api/postback')) {
        return next();
      }

      const hasCookieAuth = Boolean(req.cookies?.roycash_admin_token || req.cookies?.roycash_token);
      const rawOrigin = req.headers['origin'];
      const rawReferer = req.headers['referer'];

      let requestOrigin: string | null = null;
      if (typeof rawOrigin === 'string' && rawOrigin) {
        requestOrigin = rawOrigin.trim().toLowerCase();
      } else if (typeof rawReferer === 'string' && rawReferer) {
        try {
          const parsed = new URL(rawReferer);
          requestOrigin = parsed.origin.toLowerCase();
        } catch {
          requestOrigin = null;
        }
      }

      const allowedOrigins = new Set<string>([
        'http://127.0.0.1:3999',
        'http://localhost:3999',
      ]);

      if (hasCookieAuth || requestOrigin !== null) {
        if (!requestOrigin || !allowedOrigins.has(requestOrigin)) {
          return res.status(403).json({
            success: false,
            error: 'Forbidden: CSRF protection rejected request. Missing or untrusted Origin / Referer.',
          });
        }
      }
    }
    next();
  });

  app.use(adminAuthMiddleware as any);
  app.use('/api/admin', adminAuthRouter);
  app.use('/api', apiRouter);

  let serverInstance: Server | null = null;
  await new Promise<void>((resolve) => {
    serverInstance = app.listen(3999, '127.0.0.1', () => {
      resolve();
    });
  });

  const BASE_URL = 'http://127.0.0.1:3999';
  const ORIGIN = 'http://127.0.0.1:3999';
  const now = new Date().toISOString();

  try {
    // =========================================================================
    // 1. CAMPAIGN REWARD & REAL PROVIDER SIGNATURE AUTHENTICITY TESTS
    // =========================================================================
    console.log('--- 1. Campaign Reward & Real Provider Signature Authenticity ---');

    const validUserId = 'usr_sec2_valid_' + Date.now();
    const wrongUserId = 'usr_sec2_wrong_' + Date.now();

    db.prepare(`
      INSERT INTO users (id, email, name, password_hash, salt, referral_code, created_at, updated_at)
      VALUES (?, ?, 'Valid Sec User', 'h', 's', ?, ?, ?)
    `).run(validUserId, `valid_${Date.now()}@roycash.sec`, `REF_VAL_${Date.now()}`, now, now);

    db.prepare(`
      INSERT INTO users (id, email, name, password_hash, salt, referral_code, created_at, updated_at)
      VALUES (?, ?, 'Wrong Sec User', 'h', 's', ?, ?, ?)
    `).run(wrongUserId, `wrong_${Date.now()}@roycash.sec`, `REF_WRONG_${Date.now()}`, now, now);

    const liveCampId = 'cmp_sec2_live_' + Date.now();
    const demoCampId = 'cmp_sec2_demo_' + Date.now();
    const invalidRewardCampId = 'cmp_sec2_badreward_' + Date.now();
    const wrongCampId = 'cmp_sec2_wrongcamp_' + Date.now();

    // Live campaign (is_demo = 0) with reward_amount = 500 & required install step
    db.prepare(`
      INSERT INTO campaigns (id, name, advertiser_name, category, description, reward_amount, tracking_url_template, is_demo, requires_install, requires_signup, requires_kyc, requires_deposit, created_at, updated_at)
      VALUES (?, 'Live Campaign Security Test', 'LiveCorp', 'Finance', 'Test', 500, 'https://live.com', 0, 1, 0, 0, 0, ?, ?)
    `).run(liveCampId, now, now);

    db.prepare(`
      INSERT INTO campaign_steps (id, campaign_id, step_order, step_type, title, description, is_required, created_at)
      VALUES (?, ?, 1, 'install', 'App Install', 'Install app step', 1, ?)
    `).run('stp_live_install_' + Date.now(), liveCampId, now);

    // Demo campaign (is_demo = 1) with reward_amount = 300 & required install step
    db.prepare(`
      INSERT INTO campaigns (id, name, advertiser_name, category, description, reward_amount, tracking_url_template, is_demo, requires_install, requires_signup, requires_kyc, requires_deposit, created_at, updated_at)
      VALUES (?, 'Demo Campaign Security Test', 'DemoCorp', 'Shopping', 'Test', 300, 'https://demo.com', 1, 1, 0, 0, 0, ?, ?)
    `).run(demoCampId, now, now);

    db.prepare(`
      INSERT INTO campaign_steps (id, campaign_id, step_order, step_type, title, description, is_required, created_at)
      VALUES (?, ?, 1, 'install', 'App Install', 'Install demo app step', 1, ?)
    `).run('stp_demo_install_' + Date.now(), demoCampId, now);

    // Campaign with invalid reward amount (-100)
    db.prepare(`
      INSERT INTO campaigns (id, name, advertiser_name, category, description, reward_amount, tracking_url_template, is_demo, requires_install, requires_signup, requires_kyc, requires_deposit, created_at, updated_at)
      VALUES (?, 'Bad Reward Campaign', 'BadCorp', 'Shopping', 'Test', -100, 'https://bad.com', 0, 1, 0, 0, 0, ?, ?)
    `).run(invalidRewardCampId, now, now);

    // Unrelated wrong campaign
    db.prepare(`
      INSERT INTO campaigns (id, name, advertiser_name, category, description, reward_amount, tracking_url_template, is_demo, requires_install, requires_signup, requires_kyc, requires_deposit, created_at, updated_at)
      VALUES (?, 'Wrong Campaign', 'WrongCorp', 'Shopping', 'Test', 500, 'https://wrong.com', 0, 1, 0, 0, 0, ?, ?)
    `).run(wrongCampId, now, now);

    const liveClickId = 'rc_click_live_' + Date.now();
    const demoClickId = 'rc_click_demo_' + Date.now();
    const wrongClickId = 'rc_click_wrong_' + Date.now();

    db.prepare(`
      INSERT INTO offer_clicks (click_id, user_id, campaign_id, provider, created_at)
      VALUES (?, ?, ?, 'mitgo', ?)
    `).run(liveClickId, validUserId, liveCampId, now);

    db.prepare(`
      INSERT INTO offer_clicks (click_id, user_id, campaign_id, provider, created_at)
      VALUES (?, ?, ?, 'mitgo', ?)
    `).run(demoClickId, validUserId, demoCampId, now);

    db.prepare(`
      INSERT INTO offer_clicks (click_id, user_id, campaign_id, provider, created_at)
      VALUES (?, ?, ?, 'mitgo', ?)
    `).run(wrongClickId, validUserId, wrongCampId, now);

    const liveConvId = 'cnv_sec2_live_' + Date.now();
    db.prepare(`
      INSERT INTO conversions (id, click_id, user_id, campaign_id, provider, status, reward_amount, currency, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'mitgo', 'click_recorded', 500, 'INR', ?, ?)
    `).run(liveConvId, liveClickId, validUserId, liveCampId, now, now);

    const demoConvId = 'cnv_sec2_demo_' + Date.now();
    db.prepare(`
      INSERT INTO conversions (id, click_id, user_id, campaign_id, provider, status, reward_amount, currency, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'mitgo', 'click_recorded', 300, 'INR', ?, ?)
    `).run(demoConvId, demoClickId, validUserId, demoCampId, now, now);

    // Test 1.1: Missing campaign rejected
    const deletedCampId = 'cmp_sec2_deleted_' + Date.now();
    const missingCampClickId = 'rc_click_nocamp_' + Date.now();
    db.prepare(`
      INSERT INTO campaigns (id, name, advertiser_name, category, description, reward_amount, tracking_url_template, is_demo, requires_install, requires_signup, requires_kyc, requires_deposit, created_at, updated_at)
      VALUES (?, 'Deleted Campaign', 'TempCorp', 'Finance', 'Test', 500, 'https://temp.com', 0, 1, 0, 0, 0, ?, ?)
    `).run(deletedCampId, now, now);
    db.prepare(`
      INSERT INTO offer_clicks (click_id, user_id, campaign_id, provider, created_at)
      VALUES (?, ?, ?, 'mitgo', ?)
    `).run(missingCampClickId, validUserId, deletedCampId, now);
    db.prepare(`
      INSERT INTO conversions (id, click_id, user_id, campaign_id, provider, status, reward_amount, currency, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'mitgo', 'click_recorded', 500, 'INR', ?, ?)
    `).run('cnv_nocamp_' + Date.now(), missingCampClickId, validUserId, deletedCampId, now, now);
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(deletedCampId);

    const missingCampRes = approveConversion(missingCampClickId, validUserId, 500, 'tx_nocamp_' + Date.now(), now);
    assert(missingCampRes.success === false, 'Missing campaign rejected safely');

    // Test 1.2: Invalid reward configuration rejected
    const badRewardClickId = 'rc_click_badreward_' + Date.now();
    db.prepare(`
      INSERT INTO offer_clicks (click_id, user_id, campaign_id, provider, created_at)
      VALUES (?, ?, ?, 'mitgo', ?)
    `).run(badRewardClickId, validUserId, invalidRewardCampId, now);
    db.prepare(`
      INSERT INTO conversions (id, click_id, user_id, campaign_id, provider, status, reward_amount, currency, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'mitgo', 'click_recorded', 500, 'INR', ?, ?)
    `).run('cnv_badreward_' + Date.now(), badRewardClickId, validUserId, invalidRewardCampId, now, now);

    const badRewardRes = approveConversion(badRewardClickId, validUserId, 500, 'tx_badreward_' + Date.now(), now);
    assert(badRewardRes.success === false && badRewardRes.error?.includes('reward amount is missing or invalid'), 'Invalid campaign reward configuration rejected');

    // Test 1.3: Excessive reward rejected (attempt 1500 when limit is 500)
    const excessiveRes = approveConversion(liveClickId, validUserId, 1500, 'tx_excessive_' + Date.now(), now);
    assert(excessiveRes.success === false && excessiveRes.error?.includes('exceeds campaign configured limit'), 'Excessive reward amount above campaign limit rejected');

    // Test 1.4: Manually inserted event with "signature_valid: true" in metadata CANNOT authorize cashback
    // Manual database insert has is_provider_verified = 0 (default unverified)
    const manualFakeMeta = JSON.stringify({ provider: 'mitgo', signature_valid: true, verified: true });
    db.prepare(`
      INSERT INTO offer_events (id, click_id, user_id, campaign_id, step_type, event_name, status, transaction_id, metadata, is_provider_verified, verification_source, verified_at, created_at)
      VALUES (?, ?, ?, ?, 'install', 'Install', 'confirmed', ?, ?, 0, 'unverified_client', ?, ?)
    `).run('evt_manual_fake_' + Date.now(), demoClickId, validUserId, demoCampId, 'tx_manual_fake_' + Date.now(), manualFakeMeta, now, now);

    const manualFakeRes = approveConversion(demoClickId, validUserId, 300, 'tx_manual_fake_' + Date.now(), now);
    assert(manualFakeRes.success === false, 'Manually inserted confirmed event with fake metadata signature_valid:true is rejected (is_provider_verified=0)');

    // Test 1.5: Forged signature rejected
    const forgedMeta = JSON.stringify({ provider: 'mitgo', forged: true });
    db.prepare(`
      INSERT INTO offer_events (id, click_id, user_id, campaign_id, step_type, event_name, status, transaction_id, metadata, is_provider_verified, verification_source, verified_at, created_at)
      VALUES (?, ?, ?, ?, 'install', 'Install', 'confirmed', ?, ?, 0, 'unverified', ?, ?)
    `).run('evt_forged_' + Date.now(), demoClickId, validUserId, demoCampId, 'tx_forged_' + Date.now(), forgedMeta, now, now);

    const forgedRes = approveConversion(demoClickId, validUserId, 300, 'tx_fg_' + Date.now(), now);
    assert(forgedRes.success === false, 'Forged provider event (metadata forged:true) rejected');

    // Test 1.6: Incorrect postback token/secret rejected
    const badPostbackRes = await fetch(`${BASE_URL}/api/postback/mitgo?click_id=${demoClickId}&event_type=install&tx_id=tx_badpostback_1&token=wrong_invalid_token`, {
      method: 'GET',
    });
    assert(badPostbackRes.status === 403, 'Postback with incorrect provider token/secret rejected with 403 Forbidden');

    // Test 1.7: Live Mitgo postback blocked when official verification is unconfigured
    const livePostbackRes = await fetch(`${BASE_URL}/api/postback/mitgo?click_id=${liveClickId}&event_type=install&tx_id=tx_livepostback_1`, {
      method: 'GET',
    });
    assert(livePostbackRes.status === 403, 'Live Mitgo postback blocked when official provider verification credentials are not configured');

    // Test 1.8: Live campaign conversion approval rejected
    const liveApprovalRes = approveConversion(liveClickId, validUserId, 500, 'tx_live_approval_' + Date.now(), now);
    assert(liveApprovalRes.success === false, 'Live campaign conversion approval rejected when official provider signature verification is unconfigured');

    // Test 1.9: Valid cryptographic / server-controlled verification path succeeds (Sandbox postback for demo campaign)
    const validDemoTxId = 'tx_valid_demo_' + Date.now();
    const simRes = await fetch(`${BASE_URL}/api/postback/mitgo?click_id=${demoClickId}&event_type=install&tx_id=${validDemoTxId}&token=sec_mitgo_sandbox_key`, {
      method: 'GET',
    });
    const simJson = await simRes.json();
    assert(simRes.status === 200 && simJson.success === true, 'Sandbox postback endpoint with valid key generates authentic server-verified event (is_provider_verified=1)');

    const validApprovalRes = approveConversion(demoClickId, validUserId, 300, validDemoTxId, now);
    assert(validApprovalRes.success === true, 'Valid campaign approval succeeds through trusted server verification path');

    const ledgerRecord = db.prepare("SELECT * FROM cashback_ledger WHERE user_id = ? AND type = 'cashback_credit'").get(validUserId) as any;
    assert(ledgerRecord && ledgerRecord.amount === 300, 'Cashback ledger credited exactly 300 INR to legitimate user wallet');

    // Test 1.10: Replayed transaction ID rejected
    const replayApprovalRes = approveConversion(demoClickId, validUserId, 300, validDemoTxId, now);
    assert(replayApprovalRes.success === true, 'Duplicate approval on same conversion returns idempotent success');

    // Attempting to reuse same validDemoTxId for another approval attempt
    const replayAttemptRes = approveConversion(liveClickId, validUserId, 500, validDemoTxId, now);
    assert(replayAttemptRes.success === false && replayAttemptRes.error?.includes('Replayed transaction ID rejected'), 'Replayed transaction ID across conversions is rejected');

    // =========================================================================
    // 2. ADMIN SETUP CONFIGURATION SECURITY TESTS
    // =========================================================================
    console.log('\n--- 2. Admin Setup Configuration Security ---');

    const origEnv = process.env.NODE_ENV;
    const origSetupToken = process.env.ADMIN_SETUP_TOKEN;
    const origSecret = process.env.ADMIN_SESSION_SECRET;

    process.env.NODE_ENV = 'production';
    process.env.ADMIN_SESSION_SECRET = 'a_very_secure_high_entropy_32_character_session_secret_2026!';
    delete process.env.ADMIN_SETUP_TOKEN;

    let missingTokenError = false;
    try {
      validateProductionConfig('production');
    } catch {
      missingTokenError = true;
    }
    assert(missingTokenError, 'Production startup fails when ADMIN_SETUP_TOKEN is missing');

    process.env.ADMIN_SETUP_TOKEN = 'short_token_12345';
    let weakTokenError = false;
    try {
      validateProductionConfig('production');
    } catch {
      weakTokenError = true;
    }
    assert(weakTokenError, 'Production startup fails when ADMIN_SETUP_TOKEN is under 32 characters');

    process.env.ADMIN_SETUP_TOKEN = 'admin_setup_token_placeholder_32chars_long!';
    let placeholderError = false;
    try {
      validateProductionConfig('production');
    } catch {
      placeholderError = true;
    }
    assert(placeholderError, 'Production startup fails when ADMIN_SETUP_TOKEN is a placeholder');

    process.env.ADMIN_SETUP_TOKEN = 'a_very_secure_high_entropy_32_character_setup_token_2026!';
    let validConfigPass = false;
    try {
      validateProductionConfig('production');
      validConfigPass = true;
    } catch {
      validConfigPass = false;
    }
    assert(validConfigPass, 'Production startup succeeds with valid high-entropy 32+ char setup token');

    process.env.NODE_ENV = origEnv;
    if (origSetupToken) process.env.ADMIN_SETUP_TOKEN = origSetupToken; else delete process.env.ADMIN_SETUP_TOKEN;
    if (origSecret) process.env.ADMIN_SESSION_SECRET = origSecret; else delete process.env.ADMIN_SESSION_SECRET;

    // =========================================================================
    // 3. ANTI-CSRF PROTECTION & ISOLATED HTTP ENDPOINT TESTS
    // =========================================================================
    console.log('\n--- 3. Anti-CSRF Protection & HTTP Endpoint Security ---');

    const { hash: tHash, salt: tSalt } = hashPassword('StrongPassword123!');
    const admId = 'adm_test_' + Date.now();
    db.prepare(`
      INSERT INTO admins (id, username, email, name, password_hash, salt, role, status, created_at, updated_at)
      VALUES (?, 'testadmin', 'testadmin@roycash.internal', 'Test Admin', ?, ?, 'superadmin', 'active', ?, ?)
    `).run(admId, tHash, tSalt, now, now);

    const loginRes = await fetch(`${BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': ORIGIN },
      body: JSON.stringify({
        identifier: 'testadmin@roycash.internal',
        password: 'StrongPassword123!',
      }),
    });

    const cookiesArr = (loginRes.headers as any).getSetCookie ? (loginRes.headers as any).getSetCookie() : [loginRes.headers.get('set-cookie') || ''];
    const setCookie = cookiesArr.join('; ');
    const adminCookie = setCookie.match(/roycash_admin_token=([^;]+)/)?.[1] || '';

    const foreignOriginRes = await fetch(`${BASE_URL}/api/admin/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://evil-attacker-site.com',
        'Cookie': `roycash_admin_token=${adminCookie}`,
      },
      body: JSON.stringify({ key: 'app_tagline', value: 'Hacked' }),
    });
    assert(foreignOriginRes.status === 403, 'Cookie-authenticated mutating request from foreign Origin is rejected with 403');

    const missingOriginRes = await fetch(`${BASE_URL}/api/admin/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `roycash_admin_token=${adminCookie}`,
      },
      body: JSON.stringify({ key: 'app_tagline', value: 'Hacked' }),
    });
    assert(missingOriginRes.status === 403, 'Cookie-authenticated mutating request with missing Origin/Referer is rejected with 403');

    const validOriginRes = await fetch(`${BASE_URL}/api/admin/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Origin': ORIGIN,
        'Cookie': `roycash_admin_token=${adminCookie}`,
      },
      body: JSON.stringify({ key: 'app_tagline', value: 'Earn Through Actions. Grow Through Referrals.' }),
    });
    assert(validOriginRes.status === 200, 'Cookie-authenticated request with valid Origin succeeds with 200 OK');

  } finally {
    // =========================================================================
    // CLEANUP ISOLATED TEST SERVER & DATABASE FILES
    // =========================================================================
    console.log('\n--- 4. Test Database Isolation & Cleanup ---');
    if (serverInstance) {
      (serverInstance as Server).close();
      console.log('[TEST SERVER] Isolated Express test server closed.');
    }

    try {
      db.close();
      console.log('[TEST DB] SQLite test connection closed.');
    } catch (e: any) {
      console.warn('[TEST DB] Warning closing DB connection:', e.message);
    }

    // Safely delete temporary test database files
    for (const ext of ['', '-wal', '-shm']) {
      const file = testDbPath + ext;
      if (fs.existsSync(file)) {
        try {
          fs.unlinkSync(file);
          console.log(`[CLEANUP] Deleted temporary test DB file: ${path.basename(file)}`);
        } catch (e: any) {
          console.warn(`[CLEANUP] Could not delete ${file}:`, e.message);
        }
      }
    }
  }

  console.log('\n================================================================');
  console.log(`TOTAL SECURITY ASSERTIONS EXECUTED: ${passed}/${total} PASSED`);
  console.log('================================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runComprehensiveSecuritySuite().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
