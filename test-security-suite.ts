import path from 'node:path';
import fs from 'node:fs';
import type { Server } from 'node:http';

// 1. DYNAMICALLY ISOLATE DATABASE PATH & PORT BEFORE MODULE IMPORTS
const testDbPath = path.resolve(process.cwd(), 'data', 'test_roycash_security_isolated.sqlite');
process.env.DATABASE_PATH = testDbPath;
process.env.PORT = '3999';
process.env.MITGO_SANDBOX_POSTBACK_KEY = 'valid_test_sandbox_secret_123';

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
const { approveConversion, apiRouter, sanitizeJsonStringForLogging } = await import('./server/api.js');
const { config, validateProductionConfig } = await import('./server/config.js');
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
  let adminCookie = '';

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
    // 1. MANDATORY SANDBOX TOKEN, LOG SANITIZATION & REPLAY PROTECTION TESTS
    // =========================================================================
    console.log('--- 1. Mandatory Sandbox Token, Log Sanitization & Replay Protection ---');

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
    const demoClickId1 = 'rc_click_demo1_' + Date.now();
    const demoClickId2 = 'rc_click_demo2_' + Date.now();
    const wrongClickId = 'rc_click_wrong_' + Date.now();

    db.prepare(`
      INSERT INTO offer_clicks (click_id, user_id, campaign_id, provider, created_at)
      VALUES (?, ?, ?, 'mitgo', ?)
    `).run(liveClickId, validUserId, liveCampId, now);

    db.prepare(`
      INSERT INTO offer_clicks (click_id, user_id, campaign_id, provider, created_at)
      VALUES (?, ?, ?, 'mitgo', ?)
    `).run(demoClickId1, validUserId, demoCampId, now);

    db.prepare(`
      INSERT INTO offer_clicks (click_id, user_id, campaign_id, provider, created_at)
      VALUES (?, ?, ?, 'mitgo', ?)
    `).run(demoClickId2, validUserId, demoCampId, now);

    db.prepare(`
      INSERT INTO offer_clicks (click_id, user_id, campaign_id, provider, created_at)
      VALUES (?, ?, ?, 'mitgo', ?)
    `).run(wrongClickId, validUserId, wrongCampId, now);

    const liveConvId = 'cnv_sec2_live_' + Date.now();
    db.prepare(`
      INSERT INTO conversions (id, click_id, user_id, campaign_id, provider, status, reward_amount, currency, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'mitgo', 'click_recorded', 500, 'INR', ?, ?)
    `).run(liveConvId, liveClickId, validUserId, liveCampId, now, now);

    const demoConvId1 = 'cnv_sec2_demo1_' + Date.now();
    db.prepare(`
      INSERT INTO conversions (id, click_id, user_id, campaign_id, provider, status, reward_amount, currency, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'mitgo', 'click_recorded', 300, 'INR', ?, ?)
    `).run(demoConvId1, demoClickId1, validUserId, demoCampId, now, now);

    const demoConvId2 = 'cnv_sec2_demo2_' + Date.now();
    db.prepare(`
      INSERT INTO conversions (id, click_id, user_id, campaign_id, provider, status, reward_amount, currency, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'mitgo', 'click_recorded', 300, 'INR', ?, ?)
    `).run(demoConvId2, demoClickId2, validUserId, demoCampId, now, now);

    // REGRESSION TEST 1: Missing provider transaction_id → 400 Bad Request
    const noTxRes = await fetch(`${BASE_URL}/api/postback/mitgo?click_id=${demoClickId1}&event_type=install`, {
      method: 'GET',
    });
    const noTxJson = await noTxRes.json();
    assert(noTxRes.status === 400 && noTxJson.error?.includes('Missing required provider transaction_id'), 'Missing provider transaction_id parameter rejected with 400 Bad Request (fake IDs not generated)');

    // REGRESSION TEST 2: Empty provider transaction_id → 400 Bad Request
    const emptyTxRes = await fetch(`${BASE_URL}/api/postback/mitgo?click_id=${demoClickId1}&event_type=install&tx_id=`, {
      method: 'GET',
    });
    assert(emptyTxRes.status === 400, 'Empty provider transaction_id parameter rejected with 400 Bad Request');

    // REGRESSION TEST 3: Postback secret/token log redaction
    const secretLogTxId = 'tx_redact_test_' + Date.now();
    const secretToken = 'SUPER_SECRET_POSTBACK_KEY_9999';
    const secretHeaderToken = 'SUPER_SECRET_HEADER_TOKEN_7777';

    await fetch(`${BASE_URL}/api/postback/mitgo?click_id=${demoClickId1}&event_type=install&tx_id=${secretLogTxId}&token=${secretToken}`, {
      method: 'GET',
      headers: {
        'x-postback-token': secretHeaderToken,
      },
    });

    const logRow = db.prepare("SELECT payload, headers FROM postback_logs WHERE transaction_id = ?").get(secretLogTxId) as { payload: string; headers: string } | undefined;
    assert(Boolean(logRow), 'Postback log entry created in database');

    const payloadRedacted = logRow?.payload.includes('[REDACTED]') && !logRow?.payload.includes(secretToken);
    const headersRedacted = logRow?.headers.includes('[REDACTED]') && !logRow?.headers.includes(secretHeaderToken);
    assert(Boolean(payloadRedacted && headersRedacted), 'Postback logs sanitize and redact sensitive query tokens, signatures, and auth headers ([REDACTED] stored)');

    // REGRESSION TEST 3B: Advanced Log Sanitization (URL-encoded values & Mixed-Case Keys)
    const rawQueryStr = 'click_id=clk123&token=my_secret_token_val&subid_secret=topsecret';
    const sanitizedQueryStr = sanitizeJsonStringForLogging(rawQueryStr);
    assert(sanitizedQueryStr.includes('[REDACTED]') && !sanitizedQueryStr.includes('my_secret_token_val') && !sanitizedQueryStr.includes('topsecret'), 'Non-JSON query string fallback redacts sensitive token parameters');

    const urlEncodedStr = 'click_id%3Dclk123%26tOkEn%3Dmy_secret_url_encoded_token_99';
    const sanitizedUrlEncodedStr = sanitizeJsonStringForLogging(urlEncodedStr);
    assert(sanitizedUrlEncodedStr.includes('[REDACTED]') && !sanitizedUrlEncodedStr.includes('my_secret_url_encoded_token_99'), 'URL-encoded query string redacts encoded sensitive tokens');

    const mixedCaseHeaderStr = 'AuThOrIzAtIoN: Bearer secret_bearer_mixed_case';
    const sanitizedMixedHeaderStr = sanitizeJsonStringForLogging(mixedCaseHeaderStr);
    assert(sanitizedMixedHeaderStr.includes('[REDACTED]') && !sanitizedMixedHeaderStr.includes('secret_bearer_mixed_case'), 'Mixed-case Authorization header string redacts Bearer token');

    const mixedCaseObj = {
      ToKeN: 'secret_token_val_111',
      AuThOrIzAtIoN: 'Bearer secret_auth_222',
      CoOkIe: 'roycash_token=secret_cookie_333',
      'SeT-cOoKiE': 'session=secret_setcookie_444',
      'x-MiTgO-sIgNaTuRe': 'secret_sig_555',
    };
    const sanitizedObjStr = sanitizeJsonStringForLogging(mixedCaseObj);
    const objHasNoSecrets =
      !sanitizedObjStr.includes('secret_token_val_111') &&
      !sanitizedObjStr.includes('secret_auth_222') &&
      !sanitizedObjStr.includes('secret_cookie_333') &&
      !sanitizedObjStr.includes('secret_setcookie_444') &&
      !sanitizedObjStr.includes('secret_sig_555');
    assert(objHasNoSecrets && sanitizedObjStr.includes('[REDACTED]'), 'Mixed-case keys (ToKeN, AuThOrIzAtIoN, CoOkIe, SeT-cOoKiE, x-MiTgO-sIgNaTuRe) are completely redacted in logs');

    // REGRESSION TEST 3C: Strict Amount Validation & Parameter Format Enforcement
    const invalidTypeRes = await fetch(`${BASE_URL}/api/postback/mitgo?click_id=${demoClickId1}&tx_id=tx_invalidtype_1&token=valid_test_sandbox_secret_123`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: { nested: 'object' } }),
    });
    assert(invalidTypeRes.status === 400, 'Invalid event_type parameter type (object) rejected with controlled 400 Bad Request without server crash');

    const invalidFormatRes = await fetch(`${BASE_URL}/api/postback/mitgo?click_id=${demoClickId1}&tx_id=tx_invalidfmt_1&event_type=install<script>alert(1)</script>&token=valid_test_sandbox_secret_123`, {
      method: 'GET',
    });
    assert(invalidFormatRes.status === 400, 'Non-alphanumeric event_type format rejected with controlled 400 Bad Request');

    // Trailing characters in numeric string (100abc) -> 400 Bad Request
    const trailingNumRes = await fetch(`${BASE_URL}/api/postback/mitgo?click_id=${demoClickId1}&tx_id=tx_trailing_1&event_type=install&amount=100abc&token=valid_test_sandbox_secret_123`, {
      method: 'GET',
    });
    assert(trailingNumRes.status === 400, 'Amount with trailing non-numeric characters ("100abc") rejected with 400 Bad Request');

    // Float with trailing characters (10.50xyz) -> 400 Bad Request
    const trailingFloatRes = await fetch(`${BASE_URL}/api/postback/mitgo?click_id=${demoClickId1}&tx_id=tx_trailing_2&event_type=install&amount=10.50xyz&token=valid_test_sandbox_secret_123`, {
      method: 'GET',
    });
    assert(trailingFloatRes.status === 400, 'Float amount with trailing characters ("10.50xyz") rejected with 400 Bad Request');

    // Negative amount (-100) -> 400 Bad Request
    const negativeAmtRes = await fetch(`${BASE_URL}/api/postback/mitgo?click_id=${demoClickId1}&tx_id=tx_invalidamt_1&event_type=install&amount=-100&token=valid_test_sandbox_secret_123`, {
      method: 'GET',
    });
    assert(negativeAmtRes.status === 400, 'Negative amount value rejected with controlled 400 Bad Request');

    // Non-numeric Infinity / NaN -> 400 Bad Request
    const infinityAmtRes = await fetch(`${BASE_URL}/api/postback/mitgo?click_id=${demoClickId1}&tx_id=tx_inf_1&event_type=install&amount=Infinity&token=valid_test_sandbox_secret_123`, {
      method: 'GET',
    });
    assert(infinityAmtRes.status === 400, 'Infinity amount string rejected with controlled 400 Bad Request');

    // Clean numeric string with leading/trailing whitespace (" 100.50 ") -> 200 OK (accepted)
    const cleanWhitespaceAmtRes = await fetch(`${BASE_URL}/api/postback/mitgo?click_id=${demoClickId1}&tx_id=tx_clean_ws_1&event_type=install&amount=%20100.50%20&token=valid_test_sandbox_secret_123`, {
      method: 'GET',
    });
    assert(cleanWhitespaceAmtRes.status === 200, 'Clean numeric string with whitespace (" 100.50 ") correctly accepted');

    // REGRESSION TEST 4: Missing sandbox token → 403
    const noTokenRes = await fetch(`${BASE_URL}/api/postback/mitgo?click_id=${demoClickId1}&event_type=install&tx_id=tx_notoken_1`, {
      method: 'GET',
    });
    assert(noTokenRes.status === 403, 'Missing sandbox token rejected with 403 Forbidden');

    // REGRESSION TEST 5: Empty sandbox token → 403
    const emptyTokenRes = await fetch(`${BASE_URL}/api/postback/mitgo?click_id=${demoClickId1}&event_type=install&tx_id=tx_emptytoken_1&token=`, {
      method: 'GET',
    });
    assert(emptyTokenRes.status === 403, 'Empty sandbox token rejected with 403 Forbidden');

    // REGRESSION TEST 6: Wrong sandbox token → 403
    const wrongTokenRes = await fetch(`${BASE_URL}/api/postback/mitgo?click_id=${demoClickId1}&event_type=install&tx_id=tx_wrongtoken_1&token=invalid_secret_abc`, {
      method: 'GET',
    });
    assert(wrongTokenRes.status === 403, 'Wrong sandbox token rejected with 403 Forbidden');

    // REGRESSION TEST 7: Missing sandbox secret configuration → 403
    const origSandboxKey = process.env.MITGO_SANDBOX_POSTBACK_KEY;
    delete process.env.MITGO_SANDBOX_POSTBACK_KEY;
    db.prepare("UPDATE provider_integrations SET postback_key = NULL WHERE id = 'mitgo'").run();

    const missingSecretRes = await fetch(`${BASE_URL}/api/postback/mitgo?click_id=${demoClickId1}&event_type=install&tx_id=tx_nosecret_1&token=valid_test_sandbox_secret_123`, {
      method: 'GET',
    });
    assert(missingSecretRes.status === 403, 'Missing sandbox secret configuration rejected with 403 Forbidden');

    // Restore sandbox secret configuration
    process.env.MITGO_SANDBOX_POSTBACK_KEY = origSandboxKey;
    db.prepare("UPDATE provider_integrations SET postback_key = ? WHERE id = 'mitgo'").run('valid_test_sandbox_secret_123');

    // REGRESSION TEST 8: Correct sandbox token → accepted ONLY in non-production demo campaigns
    const correctTokenRes = await fetch(`${BASE_URL}/api/postback/mitgo?click_id=${demoClickId1}&event_type=install&tx_id=tx_indep_1&token=valid_test_sandbox_secret_123`, {
      method: 'GET',
    });
    assert(correctTokenRes.status === 200, 'Correct sandbox token accepted for demo campaign in development mode');

    // Send sandbox postback for second independent demo conversion
    await fetch(`${BASE_URL}/api/postback/mitgo?click_id=${demoClickId2}&event_type=install&tx_id=tx_indep_2&token=valid_test_sandbox_secret_123`, {
      method: 'GET',
    });

    const demoClickId3 = 'rc_click_demo3_' + Date.now();
    db.prepare(`
      INSERT INTO offer_clicks (click_id, user_id, campaign_id, provider, created_at)
      VALUES (?, ?, ?, 'mitgo', ?)
    `).run(demoClickId3, validUserId, demoCampId, now);

    const demoConvId3 = 'cnv_sec2_demo3_' + Date.now();
    db.prepare(`
      INSERT INTO conversions (id, click_id, user_id, campaign_id, provider, status, reward_amount, currency, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'mitgo', 'click_recorded', 300, 'INR', ?, ?)
    `).run(demoConvId3, demoClickId3, validUserId, demoCampId, now, now);

    // Send verified postback for click 3 with a distinct event transaction
    await fetch(`${BASE_URL}/api/postback/mitgo?click_id=${demoClickId3}&event_type=install&tx_id=tx_indep_3&token=valid_test_sandbox_secret_123`, {
      method: 'GET',
    });

    // REGRESSION TEST 9: Two independent conversions with different transaction IDs → both can succeed
    const approval1 = approveConversion(demoClickId1, validUserId, 300, 'tx_indep_1', now);
    const approval2 = approveConversion(demoClickId2, validUserId, 300, 'tx_indep_2', now);
    assert(approval1.success === true && approval2.success === true, 'Two independent conversions with different transaction IDs both succeed');

    // REGRESSION TEST 10: Same transaction ID reused across conversions → rejected
    const replayedTxApproval = approveConversion(demoClickId3, validUserId, 300, 'tx_indep_1', now);
    assert(replayedTxApproval.success === false && replayedTxApproval.error?.includes('Replayed transaction ID rejected'), 'Reused transaction ID across different conversions is rejected');

    // REGRESSION TEST 11: Same conversion duplicate approval → idempotent success
    const duplicateApproval = approveConversion(demoClickId1, validUserId, 300, 'tx_indep_1', now);
    assert(duplicateApproval.success === true, 'Duplicate approval on same conversion returns idempotent success');

    // REGRESSION TEST 12: Live campaign remains blocked without official Mitgo verification
    const livePostbackRes = await fetch(`${BASE_URL}/api/postback/mitgo?click_id=${liveClickId}&event_type=install&tx_id=tx_live_1`, {
      method: 'GET',
    });
    assert(livePostbackRes.status === 403, 'Live Mitgo postback blocked when official provider verification credentials are not configured');

    const liveApprovalRes = approveConversion(liveClickId, validUserId, 500, 'tx_live_approval_1', now);
    assert(liveApprovalRes.success === false, 'Live campaign conversion approval rejected when official provider signature verification is unconfigured');

    // REGRESSION TEST 13: Existing admin credentials and production database remain untouched by tests
    assert(fs.existsSync(testDbPath), 'Security test executed against isolated test database (data/roycash.sqlite untouched)');

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
    adminCookie = setCookie.match(/roycash_admin_token=([^;]+)/)?.[1] || '';

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

    // =========================================================================
    // 5. MILESTONE 1.1: CAMPAIGN MANAGEMENT INTEGRATION & SAFETY TESTS
    // =========================================================================
    console.log('\n--- 5. Milestone 1.1: Campaign Management Integration & Safety ---');

    // A. Strict Payload Validation & Rejection Tests
    const badRewardRes = await fetch(`${BASE_URL}/api/admin/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': ORIGIN, 'Cookie': `roycash_admin_token=${adminCookie}` },
      body: JSON.stringify({
        name: 'Bad Reward Test',
        advertiser_name: 'Corp',
        category: 'Finance',
        description: 'Desc',
        tracking_url_template: 'https://example.com/track',
        reward_amount: '100abc',
        status: 'active',
        is_demo: 1,
      }),
    });
    assert(badRewardRes.status === 400, 'Campaign creation with invalid reward amount ("100abc") rejected with 400 Bad Request');

    const badUrlRes = await fetch(`${BASE_URL}/api/admin/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': ORIGIN, 'Cookie': `roycash_admin_token=${adminCookie}` },
      body: JSON.stringify({
        name: 'Bad URL Test',
        advertiser_name: 'Corp',
        category: 'Finance',
        description: 'Desc',
        tracking_url_template: 'ftp://invalid-scheme.com',
        reward_amount: 500,
        status: 'active',
        is_demo: 1,
      }),
    });
    assert(badUrlRes.status === 400, 'Campaign creation with invalid URL protocol ("ftp://...") rejected with 400 Bad Request');

    const badStepTypeRes = await fetch(`${BASE_URL}/api/admin/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': ORIGIN, 'Cookie': `roycash_admin_token=${adminCookie}` },
      body: JSON.stringify({
        name: 'Bad Step Type Test',
        advertiser_name: 'Corp',
        category: 'Finance',
        description: 'Desc',
        tracking_url_template: 'https://example.com/track',
        reward_amount: 500,
        status: 'draft',
        is_demo: 1,
        steps: [
          { title: 'Invalid Step', description: 'Desc', step_type: 'unsupported_type', is_required: 1 }
        ],
      }),
    });
    assert(badStepTypeRes.status === 400, 'Campaign creation with unsupported step_type ("unsupported_type") rejected with 400 Bad Request');

    const badStatusRes = await fetch(`${BASE_URL}/api/admin/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': ORIGIN, 'Cookie': `roycash_admin_token=${adminCookie}` },
      body: JSON.stringify({
        name: 'Bad Status Test',
        advertiser_name: 'Corp',
        category: 'Finance',
        description: 'Desc',
        tracking_url_template: 'https://example.com/track',
        reward_amount: 500,
        status: 'super_active',
        is_demo: 1,
      }),
    });
    assert(badStatusRes.status === 400, 'Campaign creation with invalid status ("super_active") rejected with 400 Bad Request');

    // B. Live Campaign Activation Guard Tests
    const activateUnverifiedLiveRes = await fetch(`${BASE_URL}/api/admin/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': ORIGIN, 'Cookie': `roycash_admin_token=${adminCookie}` },
      body: JSON.stringify({
        name: 'Unverified Live Activation Test',
        advertiser_name: 'UnverifiedCorp',
        category: 'Crypto',
        description: 'Desc',
        tracking_url_template: 'https://example.com/track',
        reward_amount: 500,
        status: 'active',
        is_demo: 0,
        provider: 'mitgo',
      }),
    });
    assert(activateUnverifiedLiveRes.status === 400, 'Creating an active live campaign (is_demo=0, status=active) when provider is unverified rejected with 400');

    // C. Dynamic Campaign Steps & User Tracking API Tests
    const customStepsCampRes = await fetch(`${BASE_URL}/api/admin/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': ORIGIN, 'Cookie': `roycash_admin_token=${adminCookie}` },
      body: JSON.stringify({
        name: 'Custom Trade Steps Demo Campaign',
        advertiser_name: 'TradeCorp',
        category: 'Fintech',
        description: 'Test trading platform offer with custom trade step.',
        tracking_url_template: 'https://tradecorp.com/signup?click={click_id}',
        reward_amount: 750,
        status: 'active',
        is_demo: 1,
        steps: [
          { title: 'App Install', description: 'Install app', step_type: 'install', is_required: 1 },
          { title: 'Account Signup', description: 'Create account', step_type: 'signup', is_required: 1 },
          { title: 'Execute First Trade', description: 'Place a trade of min ₹500', step_type: 'trade', is_required: 1 },
          { title: 'Optional Feedback', description: 'Leave feedback', step_type: 'other', is_required: 0 },
        ],
      }),
    });
    const customStepsCampData = await customStepsCampRes.json();
    assert(customStepsCampRes.status === 201 && customStepsCampData.campaign_id, 'Created demo campaign with custom step types ("trade", "other") successfully');

    const tradeCampId = customStepsCampData.campaign_id;

    // Create user session token to query tracking API
    const userSessionToken = 'user_test_token_m11_' + Date.now();
    const tradeUserId = 'usr_m11_trade_' + Date.now();
    db.prepare(`
      INSERT INTO users (id, email, name, password_hash, salt, referral_code, created_at, updated_at)
      VALUES (?, 'tradeuser@roycash.sec', 'Trade User', 'h', 's', ?, ?, ?)
    `).run(tradeUserId, `REF_TRADE_${Date.now()}`, now, now);

    db.prepare(`
      INSERT INTO sessions (id, user_id, token, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run('sess_' + Date.now(), tradeUserId, userSessionToken, new Date(Date.now() + 86400000).toISOString(), now);

    // Create click for trade campaign
    const clickRes = await fetch(`${BASE_URL}/api/offers/click`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': ORIGIN,
        'Authorization': `Bearer ${userSessionToken}`,
      },
      body: JSON.stringify({ campaign_id: tradeCampId }),
    });
    const clickData = await clickRes.json();
    assert(clickRes.status === 200 && clickData.click_id, 'Generated tracking click for custom step campaign');

    const tradeClickId = clickData.click_id;

    // Fetch tracking details and verify timeline items
    const trackingRes = await fetch(`${BASE_URL}/api/offers/tracking/${tradeClickId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userSessionToken}`,
      },
    });
    const trackingData = await trackingRes.json();
    assert(trackingRes.status === 200 && Array.isArray(trackingData.tracking?.timeline), 'Public tracking API returned dynamic timeline from campaign_steps');

    const timelineItems = trackingData.tracking.timeline;
    const hasTradeStep = timelineItems.some((t: any) => t.type === 'trade' && t.is_required === true);
    const hasOtherOptionalStep = timelineItems.some((t: any) => t.type === 'other' && t.is_required === false);
    assert(hasTradeStep && hasOtherOptionalStep, 'Dynamic tracking timeline correctly displays required "trade" and optional "other" steps in correct order');

    // Send postbacks for install, signup, trade (skipping optional other step)
    await fetch(`${BASE_URL}/api/postback/mitgo?click_id=${tradeClickId}&event_type=install&tx_id=tx_trade_1&token=valid_test_sandbox_secret_123`, { method: 'GET' });
    await fetch(`${BASE_URL}/api/postback/mitgo?click_id=${tradeClickId}&event_type=signup&tx_id=tx_trade_2&token=valid_test_sandbox_secret_123`, { method: 'GET' });
    await fetch(`${BASE_URL}/api/postback/mitgo?click_id=${tradeClickId}&event_type=trade&tx_id=tx_trade_3&token=valid_test_sandbox_secret_123`, { method: 'GET' });

    // Optional step skipped, all required steps completed -> approve conversion succeeds
    const tradeApproval = approveConversion(tradeClickId, tradeUserId, 750, 'tx_trade_3', now);
    assert(tradeApproval.success === true, 'Conversion approval succeeds when all required steps (including custom "trade") are verified, even if optional step is skipped');

    // D. Unverified Live Redirect Blocking Test
    const liveRedirectRes = await fetch(`${BASE_URL}/api/offers/redirect/${liveClickId}`, {
      method: 'GET',
    });
    assert(liveRedirectRes.status === 403, 'Redirecting to unverified live campaign URL rejected with 403 Forbidden');

    // =========================================================================
    // 6. MILESTONE 1.2: DUPLICATE CAMPAIGN STEP TRACKING & APPROVAL TESTS
    // =========================================================================
    console.log('\n--- 6. Milestone 1.2: Duplicate Campaign Step Tracking & Approval ---');

    // TEST 1: One required "trade" step with one confirmed event -> CAN PASS
    const singleTradeCampId = 'cmp_m12_single_' + Date.now();
    db.prepare(`
      INSERT INTO campaigns (id, name, advertiser_name, category, description, reward_amount, tracking_url_template, is_demo, created_at, updated_at)
      VALUES (?, 'Single Trade Camp', 'SingleCorp', 'Finance', 'Test', 200, 'https://single.com', 1, ?, ?)
    `).run(singleTradeCampId, now, now);

    const stepS1 = 'step_s1_' + Date.now();
    db.prepare(`
      INSERT INTO campaign_steps (id, campaign_id, step_order, step_type, title, description, is_required, created_at)
      VALUES (?, ?, 1, 'trade', 'First Trade', 'Complete 1 trade', 1, ?)
    `).run(stepS1, singleTradeCampId, now);

    const singleTradeClickId = 'rc_click_s1_' + Date.now();
    db.prepare(`
      INSERT INTO offer_clicks (click_id, user_id, campaign_id, provider, created_at)
      VALUES (?, ?, ?, 'mitgo', ?)
    `).run(singleTradeClickId, validUserId, singleTradeCampId, now);

    db.prepare(`
      INSERT INTO conversions (id, click_id, user_id, campaign_id, provider, status, reward_amount, currency, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'mitgo', 'click_recorded', 200, 'INR', ?, ?)
    `).run('cnv_s1_' + Date.now(), singleTradeClickId, validUserId, singleTradeCampId, now, now);

    await fetch(`${BASE_URL}/api/postback/mitgo?click_id=${singleTradeClickId}&event_type=trade&tx_id=tx_s1_1&token=valid_test_sandbox_secret_123`, { method: 'GET' });
    const singleTradeApproval = approveConversion(singleTradeClickId, validUserId, 200, 'tx_s1_1', now);
    assert(singleTradeApproval.success === true, 'M1.2-1: One required "trade" step with one confirmed event can pass approval');

    // TEST 2: Two required "trade" steps with only ONE confirmed event -> MUST FAIL
    const doubleTradeCampId = 'cmp_m12_double_' + Date.now();
    db.prepare(`
      INSERT INTO campaigns (id, name, advertiser_name, category, description, reward_amount, tracking_url_template, is_demo, created_at, updated_at)
      VALUES (?, 'Double Trade Camp', 'DoubleCorp', 'Finance', 'Test', 500, 'https://double.com', 1, ?, ?)
    `).run(doubleTradeCampId, now, now);

    const stepD1 = 'step_d1_' + Date.now();
    const stepD2 = 'step_d2_' + Date.now();
    db.prepare(`
      INSERT INTO campaign_steps (id, campaign_id, step_order, step_type, title, description, is_required, created_at)
      VALUES (?, ?, 1, 'trade', 'Trade Step 1', 'First trade', 1, ?)
    `).run(stepD1, doubleTradeCampId, now);
    db.prepare(`
      INSERT INTO campaign_steps (id, campaign_id, step_order, step_type, title, description, is_required, created_at)
      VALUES (?, ?, 2, 'trade', 'Trade Step 2', 'Second trade', 1, ?)
    `).run(stepD2, doubleTradeCampId, now);

    const doubleTradeClickId = 'rc_click_d1_' + Date.now();
    db.prepare(`
      INSERT INTO offer_clicks (click_id, user_id, campaign_id, provider, created_at)
      VALUES (?, ?, ?, 'mitgo', ?)
    `).run(doubleTradeClickId, tradeUserId, doubleTradeCampId, now);

    db.prepare(`
      INSERT INTO conversions (id, click_id, user_id, campaign_id, provider, status, reward_amount, currency, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'mitgo', 'click_recorded', 500, 'INR', ?, ?)
    `).run('cnv_d1_' + Date.now(), doubleTradeClickId, tradeUserId, doubleTradeCampId, now, now);

    // Send only 1 trade event for double trade campaign
    await fetch(`${BASE_URL}/api/postback/mitgo?click_id=${doubleTradeClickId}&event_type=trade&tx_id=tx_d1_1&token=valid_test_sandbox_secret_123`, { method: 'GET' });
    const doubleTrade1EventApproval = approveConversion(doubleTradeClickId, tradeUserId, 500, 'tx_d1_1', now);
    assert(doubleTrade1EventApproval.success === false && doubleTrade1EventApproval.error?.toLowerCase().includes('missing required steps'), 'M1.2-2: Two required "trade" steps with only ONE confirmed event fails approval (missing Step 2)');

    // TEST 10: Timeline must show duplicate steps separately and only mark the assigned step completed
    const doubleTradeTrackingRes1 = await fetch(`${BASE_URL}/api/offers/tracking/${doubleTradeClickId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${userSessionToken}` },
    });
    const doubleTradeTrackingData1 = await doubleTradeTrackingRes1.json();
    const dTimeline1 = doubleTradeTrackingData1.tracking?.timeline || [];

    const dStep1 = dTimeline1.find((t: any) => t.step_id === stepD1);
    const dStep2 = dTimeline1.find((t: any) => t.step_id === stepD2);
    assert(
      dStep1 && dStep2 && dStep1.state === 'completed' && dStep2.state === 'action_required',
      'M1.2-10: Tracking timeline displays duplicate steps separately (Step 1 is completed, Step 2 is action_required)'
    );

    // TEST 3: Two required "trade" steps with two independently verified and mapped events -> CAN PASS
    await fetch(`${BASE_URL}/api/postback/mitgo?click_id=${doubleTradeClickId}&event_type=trade&tx_id=tx_d1_2&token=valid_test_sandbox_secret_123`, { method: 'GET' });
    const doubleTrade2EventApproval = approveConversion(doubleTradeClickId, tradeUserId, 500, 'tx_d1_2', now);
    assert(doubleTrade2EventApproval.success === true, 'M1.2-3: Two required "trade" steps with TWO independently verified events can pass approval');

    // TEST 4: One required and one optional "trade" step -> required step can pass without falsely marking optional step complete
    const reqOptCampId = 'cmp_m12_reqopt_' + Date.now();
    db.prepare(`
      INSERT INTO campaigns (id, name, advertiser_name, category, description, reward_amount, tracking_url_template, is_demo, created_at, updated_at)
      VALUES (?, 'Req Opt Trade Camp', 'ReqOptCorp', 'Finance', 'Test', 300, 'https://reqopt.com', 1, ?, ?)
    `).run(reqOptCampId, now, now);

    const stepRO1 = 'step_ro1_' + Date.now();
    const stepRO2 = 'step_ro2_' + Date.now();
    db.prepare(`
      INSERT INTO campaign_steps (id, campaign_id, step_order, step_type, title, description, is_required, created_at)
      VALUES (?, ?, 1, 'trade', 'Required Trade', 'Must do', 1, ?)
    `).run(stepRO1, reqOptCampId, now);
    db.prepare(`
      INSERT INTO campaign_steps (id, campaign_id, step_order, step_type, title, description, is_required, created_at)
      VALUES (?, ?, 2, 'trade', 'Optional Second Trade', 'Optional bonus trade', 0, ?)
    `).run(stepRO2, reqOptCampId, now);

    const reqOptClickId = 'rc_click_ro1_' + Date.now();
    db.prepare(`
      INSERT INTO offer_clicks (click_id, user_id, campaign_id, provider, created_at)
      VALUES (?, ?, ?, 'mitgo', ?)
    `).run(reqOptClickId, tradeUserId, reqOptCampId, now);

    db.prepare(`
      INSERT INTO conversions (id, click_id, user_id, campaign_id, provider, status, reward_amount, currency, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'mitgo', 'click_recorded', 300, 'INR', ?, ?)
    `).run('cnv_ro1_' + Date.now(), reqOptClickId, tradeUserId, reqOptCampId, now, now);

    await fetch(`${BASE_URL}/api/postback/mitgo?click_id=${reqOptClickId}&event_type=trade&tx_id=tx_ro_1&token=valid_test_sandbox_secret_123`, { method: 'GET' });
    const reqOptApproval = approveConversion(reqOptClickId, tradeUserId, 300, 'tx_ro_1', now);
    assert(reqOptApproval.success === true, 'M1.2-4: Required trade step passes approval even when optional second trade step is unfulfilled');

    const reqOptTrackingRes = await fetch(`${BASE_URL}/api/offers/tracking/${reqOptClickId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${userSessionToken}` },
    });
    const reqOptTrackingData = await reqOptTrackingRes.json();
    const roTimeline = reqOptTrackingData.tracking?.timeline || [];
    const roStep1 = roTimeline.find((t: any) => t.step_id === stepRO1);
    const roStep2 = roTimeline.find((t: any) => t.step_id === stepRO2);
    assert(
      roStep1 && roStep2 && roStep1.state === 'completed' && roStep2.state === 'action_required',
      'M1.2-4b: Required step is completed without falsely marking optional second trade step completed'
    );

    // TEST 5: Duplicate events/replayed postbacks -> must not create duplicate completion
    const replayedPostbackRes = await fetch(`${BASE_URL}/api/postback/mitgo?click_id=${doubleTradeClickId}&event_type=trade&tx_id=tx_d1_1&token=valid_test_sandbox_secret_123`, { method: 'GET' });
    const replayedJson = await replayedPostbackRes.json();
    assert(replayedJson.message?.includes('Duplicate transaction ignored'), 'M1.2-5: Replayed postback transaction ID is safely ignored without creating extra step completion');

    // TEST 6: Incorrect step mapping -> fails safely
    const invalidStepIdPostbackRes = await fetch(`${BASE_URL}/api/postback/mitgo?click_id=${doubleTradeClickId}&event_type=trade&step_id=non_existent_step_123&tx_id=tx_invalid_step_1&token=valid_test_sandbox_secret_123`, { method: 'GET' });
    assert(invalidStepIdPostbackRes.status === 200, 'Postback with unresolvable step_id safely falls back to standard step matching without crashing');

    // TEST 7: Unverified event -> must not complete a step
    const unverifiedClickId = 'rc_click_unv_' + Date.now();
    db.prepare(`
      INSERT INTO offer_clicks (click_id, user_id, campaign_id, provider, created_at)
      VALUES (?, ?, ?, 'mitgo', ?)
    `).run(unverifiedClickId, validUserId, singleTradeCampId, now);

    db.prepare(`
      INSERT INTO conversions (id, click_id, user_id, campaign_id, provider, status, reward_amount, currency, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'mitgo', 'click_recorded', 200, 'INR', ?, ?)
    `).run('cnv_unv_' + Date.now(), unverifiedClickId, validUserId, singleTradeCampId, now, now);

    // Directly insert an unverified event (is_provider_verified = 0) into offer_events
    db.prepare(`
      INSERT INTO offer_events (id, click_id, user_id, campaign_id, step_id, step_type, event_name, status, transaction_id, metadata, is_provider_verified, verification_source, verified_at, created_at)
      VALUES (?, ?, ?, ?, ?, 'trade', 'Fake Unverified Event', 'confirmed', 'tx_unv_1', '{}', 0, 'unverified_client', ?, ?)
    `).run('evt_unv_' + Date.now(), unverifiedClickId, validUserId, singleTradeCampId, stepS1, now, now);

    const unverifiedApproval = approveConversion(unverifiedClickId, validUserId, 200, 'tx_unv_1', now);
    assert(unverifiedApproval.success === false && unverifiedApproval.error?.toLowerCase().includes('missing required steps'), 'M1.2-7: Unverified event (is_provider_verified = 0) does not complete a step and approval fails');

    // TEST 8: Sandbox event on live campaign -> must fail
    const liveCampClickId2 = 'rc_click_live2_' + Date.now();
    db.prepare(`
      INSERT INTO offer_clicks (click_id, user_id, campaign_id, provider, created_at)
      VALUES (?, ?, ?, 'mitgo', ?)
    `).run(liveCampClickId2, validUserId, liveCampId, now);

    db.prepare(`
      INSERT INTO conversions (id, click_id, user_id, campaign_id, provider, status, reward_amount, currency, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'mitgo', 'click_recorded', 500, 'INR', ?, ?)
    `).run('cnv_live2_' + Date.now(), liveCampClickId2, validUserId, liveCampId, now, now);

    // Insert sandbox event for live campaign
    db.prepare(`
      INSERT INTO offer_events (id, click_id, user_id, campaign_id, step_type, event_name, status, transaction_id, metadata, is_provider_verified, verification_source, verified_at, created_at)
      VALUES (?, ?, ?, ?, 'install', 'Sandbox Event', 'sandbox_confirmed', 'tx_sandbox_live_1', '{}', 1, 'sandbox_postback', ?, ?)
    `).run('evt_sandlive_' + Date.now(), liveCampClickId2, validUserId, liveCampId, now, now);

    const sandboxOnLiveApproval = approveConversion(liveCampClickId2, validUserId, 500, 'tx_sandbox_live_1', now);
    assert(sandboxOnLiveApproval.success === false, 'M1.2-8: Sandbox event on live campaign rejected by approveConversion()');

    // TEST 9: Existing normal campaigns with unique step types continue working
    const normalCampId = 'cmp_m12_normal_' + Date.now();
    db.prepare(`
      INSERT INTO campaigns (id, name, advertiser_name, category, description, reward_amount, tracking_url_template, is_demo, created_at, updated_at)
      VALUES (?, 'Normal Unique Step Camp', 'NormalCorp', 'Shopping', 'Test', 400, 'https://normal.com', 1, ?, ?)
    `).run(normalCampId, now, now);

    const normS1 = 'step_norm1_' + Date.now();
    const normS2 = 'step_norm2_' + Date.now();
    db.prepare(`
      INSERT INTO campaign_steps (id, campaign_id, step_order, step_type, title, description, is_required, created_at)
      VALUES (?, ?, 1, 'install', 'App Install', 'Install app', 1, ?)
    `).run(normS1, normalCampId, now);
    db.prepare(`
      INSERT INTO campaign_steps (id, campaign_id, step_order, step_type, title, description, is_required, created_at)
      VALUES (?, ?, 2, 'signup', 'Account Registration', 'Register account', 1, ?)
    `).run(normS2, normalCampId, now);

    const normalClickId = 'rc_click_norm_' + Date.now();
    db.prepare(`
      INSERT INTO offer_clicks (click_id, user_id, campaign_id, provider, created_at)
      VALUES (?, ?, ?, 'mitgo', ?)
    `).run(normalClickId, validUserId, normalCampId, now);

    db.prepare(`
      INSERT INTO conversions (id, click_id, user_id, campaign_id, provider, status, reward_amount, currency, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'mitgo', 'click_recorded', 400, 'INR', ?, ?)
    `).run('cnv_norm_' + Date.now(), normalClickId, validUserId, normalCampId, now, now);

    await fetch(`${BASE_URL}/api/postback/mitgo?click_id=${normalClickId}&event_type=install&tx_id=tx_norm_1&token=valid_test_sandbox_secret_123`, { method: 'GET' });
    await fetch(`${BASE_URL}/api/postback/mitgo?click_id=${normalClickId}&event_type=signup&tx_id=tx_norm_2&token=valid_test_sandbox_secret_123`, { method: 'GET' });

    const normalApproval = approveConversion(normalClickId, validUserId, 400, 'tx_norm_2', now);
    assert(normalApproval.success === true, 'M1.2-9: Existing normal campaigns with unique step types ("install", "signup") continue working seamlessly');

    // TEST 11: Unverified event cannot cause a later verified event to be assigned to the wrong duplicate step
    const unvDupCampId = 'cmp_m12_unvdup_' + Date.now();
    db.prepare(`
      INSERT INTO campaigns (id, name, advertiser_name, category, description, reward_amount, tracking_url_template, is_demo, created_at, updated_at)
      VALUES (?, 'Unverified Isolation Camp', 'UnvCorp', 'Trading', 'Test', 300, 'https://unv.com', 1, ?, ?)
    `).run(unvDupCampId, now, now);

    const unvStep1 = 'step_unv_d1_' + Date.now();
    const unvStep2 = 'step_unv_d2_' + Date.now();
    db.prepare(`
      INSERT INTO campaign_steps (id, campaign_id, step_order, step_type, title, description, is_required, created_at)
      VALUES (?, ?, 1, 'trade', 'First Trade', 'First trade', 1, ?)
    `).run(unvStep1, unvDupCampId, now);
    db.prepare(`
      INSERT INTO campaign_steps (id, campaign_id, step_order, step_type, title, description, is_required, created_at)
      VALUES (?, ?, 2, 'trade', 'Second Trade', 'Second trade', 1, ?)
    `).run(unvStep2, unvDupCampId, now);

    const unvDupClickId = 'rc_click_unvdup_' + Date.now();
    db.prepare(`
      INSERT INTO offer_clicks (click_id, user_id, campaign_id, provider, created_at)
      VALUES (?, ?, ?, 'mitgo', ?)
    `).run(unvDupClickId, tradeUserId, unvDupCampId, now);

    db.prepare(`
      INSERT INTO conversions (id, click_id, user_id, campaign_id, provider, status, reward_amount, currency, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'mitgo', 'click_recorded', 300, 'INR', ?, ?)
    `).run('cnv_unvdup_' + Date.now(), unvDupClickId, tradeUserId, unvDupCampId, now, now);

    // Insert an unverified event (is_provider_verified = 0) with step_type='trade' (no step_id)
    db.prepare(`
      INSERT INTO offer_events (id, click_id, user_id, campaign_id, step_type, event_name, status, transaction_id, metadata, is_provider_verified, verification_source, verified_at, created_at)
      VALUES (?, ?, ?, ?, 'trade', 'Unverified Trade', 'confirmed', 'tx_unv_fake', '{}', 0, 'unverified_client', ?, ?)
    `).run('evt_unv_fake_' + Date.now(), unvDupClickId, tradeUserId, unvDupCampId, now, now);

    // Send a valid verified postback via /api/postback/mitgo
    await fetch(`${BASE_URL}/api/postback/mitgo?click_id=${unvDupClickId}&event_type=trade&tx_id=tx_v1_verified&token=valid_test_sandbox_secret_123`, { method: 'GET' });

    // Verify the newly recorded event was assigned to Step 1 (unvStep1), NOT Step 2
    const recordedVerifiedEvt = db.prepare(`
      SELECT step_id FROM offer_events WHERE click_id = ? AND transaction_id = 'tx_v1_verified'
    `).get(unvDupClickId) as any;
    assert(recordedVerifiedEvt && recordedVerifiedEvt.step_id === unvStep1, 'M1.2-11: Unverified event does not reserve Step 1; first verified event correctly attaches to Step 1');

    // Verify tracking endpoint shows Step 1 as completed by verified event and Step 2 as action_required
    const unvDupTrackingRes = await fetch(`${BASE_URL}/api/offers/tracking/${unvDupClickId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${userSessionToken}` },
    });
    const unvDupTimelineData = await unvDupTrackingRes.json();
    const unvTimeline = unvDupTimelineData.tracking?.timeline || [];
    assert(unvTimeline.length >= 2 && unvTimeline[0].state === 'completed' && unvTimeline[1].state === 'action_required', 'M1.2-11b: Unverified event is excluded from tracking timeline and does not pollute step status');

    // =========================================================================
    // 7. MILESTONE 1.3: SECURE ADMIN WITHDRAWAL MANAGEMENT TESTS
    // =========================================================================
    console.log('\n--- 7. Milestone 1.3: Secure Admin Withdrawal Management ---');

    const wdrTestUserId = 'usr_wdr_' + Date.now();
    db.prepare(`
      INSERT INTO users (id, email, name, password_hash, salt, referral_code, upi_id, created_at, updated_at)
      VALUES (?, 'wdruser@roycash.sec', 'Withdrawal User', 'h', 's', ?, 'secretupi@paytm', ?, ?)
    `).run(wdrTestUserId, `REF_WDR_${Date.now()}`, now, now);

    db.prepare(`
      INSERT INTO cashback_ledger (id, user_id, type, amount, balance_type, status, description, created_at)
      VALUES (?, ?, 'cashback_credit', 1000, 'withdrawable', 'available', 'Initial balance', ?)
    `).run('ldg_init_' + Date.now(), wdrTestUserId, now);

    const testWdrId = 'wdr_test_' + Date.now();
    const testWdrAmount = 500;
    db.prepare(`
      INSERT INTO withdrawal_requests (id, user_id, amount, currency, payout_method, payout_details, status, requested_at)
      VALUES (?, ?, ?, 'INR', 'upi', '{"upi_id": "secretupi@paytm"}', 'pending', ?)
    `).run(testWdrId, wdrTestUserId, testWdrAmount, now);

    db.prepare(`
      INSERT INTO cashback_ledger (id, user_id, withdrawal_id, type, amount, balance_type, status, description, created_at)
      VALUES (?, ?, ?, 'withdrawal_debit', ?, 'withdrawable', 'deducted', 'Payout Request Held', ?)
    `).run('ldg_debit_' + Date.now(), wdrTestUserId, testWdrId, testWdrAmount, now);

    const nonAdminWdrRes = await fetch(`${BASE_URL}/api/admin/withdrawals`, {
      headers: { Cookie: `session_token=${userSessionToken}` },
    });
    assert(nonAdminWdrRes.status === 403 || nonAdminWdrRes.status === 401, 'M1.3-2: Non-admin cannot access withdrawal management');

    const adminWdrListRes = await fetch(`${BASE_URL}/api/admin/withdrawals`, {
      headers: { Cookie: `roycash_admin_token=${adminCookie}`, 'Origin': ORIGIN },
    });
    const adminWdrListData = await adminWdrListRes.json();
    assert(adminWdrListRes.status === 200 && Array.isArray(adminWdrListData.withdrawals), 'M1.3-1: Admin can list withdrawal requests');

    const listedWdr = adminWdrListData.withdrawals.find((w: any) => w.id === testWdrId);
    assert(listedWdr && !listedWdr.payout_details.includes('secretupi@paytm'), 'M1.3-12: Full payout details are masked in the list response');

    const invalidTransRes = await fetch(`${BASE_URL}/api/admin/withdrawals/${testWdrId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: `roycash_admin_token=${adminCookie}`, 'X-Requested-With': 'XMLHttpRequest', 'Origin': ORIGIN },
      body: JSON.stringify({ status: 'paid', reference_id: 'UTR123', admin_confirmation: true }),
    });
    assert(invalidTransRes.status === 400, 'M1.3-11: Invalid status transitions (pending -> paid directly) are rejected with 400');

    const approveRes = await fetch(`${BASE_URL}/api/admin/withdrawals/${testWdrId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: `roycash_admin_token=${adminCookie}`, 'X-Requested-With': 'XMLHttpRequest', 'Origin': ORIGIN },
      body: JSON.stringify({ status: 'approved' }),
    });
    const approveJson = await approveRes.json();
    assert(approveRes.status === 200 && approveJson.success, 'M1.3-3: Pending request can be approved');

    const processRes = await fetch(`${BASE_URL}/api/admin/withdrawals/${testWdrId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: `roycash_admin_token=${adminCookie}`, 'X-Requested-With': 'XMLHttpRequest', 'Origin': ORIGIN },
      body: JSON.stringify({ status: 'processing' }),
    });
    const processJson = await processRes.json();
    assert(processRes.status === 200 && processJson.success, 'M1.3-4: Approved request can move to processing');

    const paidWithoutUtrRes = await fetch(`${BASE_URL}/api/admin/withdrawals/${testWdrId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: `roycash_admin_token=${adminCookie}`, 'X-Requested-With': 'XMLHttpRequest', 'Origin': ORIGIN },
      body: JSON.stringify({ status: 'paid', reference_id: '', admin_confirmation: true }),
    });
    assert(paidWithoutUtrRes.status === 400, 'M1.3-5a: Marking paid without valid payment reference is rejected');

    const paidWithoutConfirmRes = await fetch(`${BASE_URL}/api/admin/withdrawals/${testWdrId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: `roycash_admin_token=${adminCookie}`, 'X-Requested-With': 'XMLHttpRequest', 'Origin': ORIGIN },
      body: JSON.stringify({ status: 'paid', reference_id: 'UTR_TEST_999', admin_confirmation: false }),
    });
    assert(paidWithoutConfirmRes.status === 400, 'M1.3-5b: Marking paid without explicit admin confirmation is rejected');

    const validPaidRes = await fetch(`${BASE_URL}/api/admin/withdrawals/${testWdrId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: `roycash_admin_token=${adminCookie}`, 'X-Requested-With': 'XMLHttpRequest', 'Origin': ORIGIN },
      body: JSON.stringify({ status: 'paid', reference_id: 'UTR_TEST_999', admin_confirmation: true }),
    });
    const validPaidJson = await validPaidRes.json();
    assert(validPaidRes.status === 200 && validPaidJson.success, 'M1.3-5c: Processing request marked paid with valid reference and confirmation succeeds');

    const paidTwiceRes = await fetch(`${BASE_URL}/api/admin/withdrawals/${testWdrId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: `roycash_admin_token=${adminCookie}`, 'X-Requested-With': 'XMLHttpRequest', 'Origin': ORIGIN },
      body: JSON.stringify({ status: 'paid', reference_id: 'UTR_TEST_DUPLICATE', admin_confirmation: true }),
    });
    assert(paidTwiceRes.status === 400, 'M1.3-6: Paid request cannot be paid twice');

    // Test missing hold rejection
    const missingHoldWdrId = 'wdr_missing_hold_' + Date.now();
    db.prepare(`
      INSERT INTO withdrawal_requests (id, user_id, amount, currency, payout_method, payout_details, status, requested_at)
      VALUES (?, ?, ?, 'INR', 'upi', '{"upi_id": "missinghold@paytm"}', 'pending', ?)
    `).run(missingHoldWdrId, wdrTestUserId, 200, now);

    const missingHoldRejRes = await fetch(`${BASE_URL}/api/admin/withdrawals/${missingHoldWdrId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: `roycash_admin_token=${adminCookie}`, 'X-Requested-With': 'XMLHttpRequest', 'Origin': ORIGIN },
      body: JSON.stringify({ status: 'rejected', rejection_reason: 'No hold' }),
    });
    assert(missingHoldRejRes.status === 400, 'M1.3-15: Rejection without valid withdrawal_debit hold is rejected with 400');

    // Test amount-mismatched hold rejection
    const mismatchHoldWdrId = 'wdr_mismatch_hold_' + Date.now();
    db.prepare(`
      INSERT INTO withdrawal_requests (id, user_id, amount, currency, payout_method, payout_details, status, requested_at)
      VALUES (?, ?, ?, 'INR', 'upi', '{"upi_id": "mismatch@paytm"}', 'pending', ?)
    `).run(mismatchHoldWdrId, wdrTestUserId, 200, now);
    db.prepare(`
      INSERT INTO cashback_ledger (id, user_id, withdrawal_id, type, amount, balance_type, status, description, created_at)
      VALUES (?, ?, ?, 'withdrawal_debit', 100, 'withdrawable', 'deducted', 'Mismatched Hold', ?)
    `).run('ldg_debit_mismatch_' + Date.now(), wdrTestUserId, mismatchHoldWdrId, now);

    const mismatchRejRes = await fetch(`${BASE_URL}/api/admin/withdrawals/${mismatchHoldWdrId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: `roycash_admin_token=${adminCookie}`, 'X-Requested-With': 'XMLHttpRequest', 'Origin': ORIGIN },
      body: JSON.stringify({ status: 'rejected', rejection_reason: 'Mismatched hold amount' }),
    });
    assert(mismatchRejRes.status === 400, 'M1.3-16: Rejection with amount-mismatched withdrawal_debit hold is rejected with 400');

    // Test duplicate UTR rejection
    const testWdrId2 = 'wdr_test2_' + Date.now();
    db.prepare(`
      INSERT INTO withdrawal_requests (id, user_id, amount, currency, payout_method, payout_details, status, requested_at)
      VALUES (?, ?, ?, 'INR', 'upi', '{"upi_id": "upi2@paytm"}', 'approved', ?)
    `).run(testWdrId2, wdrTestUserId, 100, now);
    db.prepare(`
      INSERT INTO cashback_ledger (id, user_id, withdrawal_id, type, amount, balance_type, status, description, created_at)
      VALUES (?, ?, ?, 'withdrawal_debit', 100, 'withdrawable', 'deducted', 'Hold 2', ?)
    `).run('ldg_debit2_' + Date.now(), wdrTestUserId, testWdrId2, now);

    await fetch(`${BASE_URL}/api/admin/withdrawals/${testWdrId2}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: `roycash_admin_token=${adminCookie}`, 'X-Requested-With': 'XMLHttpRequest', 'Origin': ORIGIN },
      body: JSON.stringify({ status: 'processing' }),
    });

    const duplicateUtrRes = await fetch(`${BASE_URL}/api/admin/withdrawals/${testWdrId2}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: `roycash_admin_token=${adminCookie}`, 'X-Requested-With': 'XMLHttpRequest', 'Origin': ORIGIN },
      body: JSON.stringify({ status: 'paid', reference_id: 'UTR_TEST_999', admin_confirmation: true }),
    });
    assert(duplicateUtrRes.status === 400, 'M1.3-17: Reusing an existing payment reference (UTR) is rejected with 400');

    // Test database-level protection against multiple withdrawal_debit entries for the same withdrawal_id
    const dbUniqueWdrId = 'wdr_db_unique_' + Date.now();
    db.prepare(`
      INSERT INTO withdrawal_requests (id, user_id, amount, currency, payout_method, payout_details, status, requested_at)
      VALUES (?, ?, ?, 'INR', 'upi', '{"upi_id": "dbunique@paytm"}', 'pending', ?)
    `).run(dbUniqueWdrId, wdrTestUserId, 80, now);
    db.prepare(`
      INSERT INTO cashback_ledger (id, user_id, withdrawal_id, type, amount, balance_type, status, description, created_at)
      VALUES (?, ?, ?, 'withdrawal_debit', 80, 'withdrawable', 'deducted', 'First debit', ?)
    `).run('ldg_db1_' + Date.now(), wdrTestUserId, dbUniqueWdrId, now);

    let dbUniqueConstraintCaught = false;
    try {
      db.prepare(`
        INSERT INTO cashback_ledger (id, user_id, withdrawal_id, type, amount, balance_type, status, description, created_at)
        VALUES (?, ?, ?, 'withdrawal_debit', 80, 'withdrawable', 'deducted', 'Second debit duplicate', ?)
      `).run('ldg_db2_' + Date.now(), wdrTestUserId, dbUniqueWdrId, now);
    } catch (err: any) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        dbUniqueConstraintCaught = true;
      }
    }
    assert(dbUniqueConstraintCaught, 'M1.3-18: Database unique partial index correctly prevents multiple withdrawal_debit entries for the same withdrawal_id');

    // Test rollback behavior for invalid hold metadata (invalid balance_type or status)
    const invMetaWdrId = 'wdr_inv_meta_' + Date.now();
    db.prepare(`
      INSERT INTO withdrawal_requests (id, user_id, amount, currency, payout_method, payout_details, status, requested_at)
      VALUES (?, ?, ?, 'INR', 'upi', '{"upi_id": "inv@paytm"}', 'pending', ?)
    `).run(invMetaWdrId, wdrTestUserId, 120, now);
    db.prepare(`
      INSERT INTO cashback_ledger (id, user_id, withdrawal_id, type, amount, balance_type, status, description, created_at)
      VALUES (?, ?, ?, 'withdrawal_debit', 120, 'invalid_type', 'available', 'Invalid Meta Hold', ?)
    `).run('ldg_inv_' + Date.now(), wdrTestUserId, invMetaWdrId, now);

    const invMetaRes = await fetch(`${BASE_URL}/api/admin/withdrawals/${invMetaWdrId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: `roycash_admin_token=${adminCookie}`, 'X-Requested-With': 'XMLHttpRequest', 'Origin': ORIGIN },
      body: JSON.stringify({ status: 'rejected', rejection_reason: 'Invalid metadata test' }),
    });
    assert(invMetaRes.status === 400, 'M1.3-19: Rejection with invalid hold balance_type/status is rejected with 400 and rolls back');

    const rejectWdrId = 'wdr_reject_' + Date.now();
    db.prepare(`
      INSERT INTO withdrawal_requests (id, user_id, amount, currency, payout_method, payout_details, status, requested_at)
      VALUES (?, ?, ?, 'INR', 'upi', '{"upi_id": "secretupi@paytm"}', 'pending', ?)
    `).run(rejectWdrId, wdrTestUserId, 300, now);
    db.prepare(`
      INSERT INTO cashback_ledger (id, user_id, withdrawal_id, type, amount, balance_type, status, description, created_at)
      VALUES (?, ?, ?, 'withdrawal_debit', ?, 'withdrawable', 'deducted', 'Payout Request Held', ?)
    `).run('ldg_debit_rej_' + Date.now(), wdrTestUserId, rejectWdrId, 300, now);

    const rejectRes = await fetch(`${BASE_URL}/api/admin/withdrawals/${rejectWdrId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: `roycash_admin_token=${adminCookie}`, 'X-Requested-With': 'XMLHttpRequest', 'Origin': ORIGIN },
      body: JSON.stringify({ status: 'rejected', rejection_reason: 'Incorrect UPI handle' }),
    });
    const rejectJson = await rejectRes.json();
    assert(rejectRes.status === 200 && rejectJson.success, 'M1.3-7a: Rejected request succeeds with rejection reason');

    // Test repeated/duplicate rejection requests
    const repeatRejectRes = await fetch(`${BASE_URL}/api/admin/withdrawals/${rejectWdrId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: `roycash_admin_token=${adminCookie}`, 'X-Requested-With': 'XMLHttpRequest', 'Origin': ORIGIN },
      body: JSON.stringify({ status: 'rejected', rejection_reason: 'Duplicate rejection attempt' }),
    });
    assert(repeatRejectRes.status === 400, 'M1.3-20: Repeated rejection request on already rejected withdrawal is rejected with 400');

    const refundEntries = db.prepare(`
      SELECT * FROM cashback_ledger WHERE user_id = ? AND type = 'admin_adjustment' AND withdrawal_id = ?
    `).all(wdrTestUserId, rejectWdrId);
    assert(refundEntries.length === 1, 'M1.3-7b: Rejected request refunds held amount exactly once via withdrawal_id (no duplicate refund created)');

    const rejectAfterRes = await fetch(`${BASE_URL}/api/admin/withdrawals/${rejectWdrId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: `roycash_admin_token=${adminCookie}`, 'X-Requested-With': 'XMLHttpRequest', 'Origin': ORIGIN },
      body: JSON.stringify({ status: 'approved' }),
    });
    assert(rejectAfterRes.status === 400, 'M1.3-8: Rejected request cannot be approved or processed later (no invalid status transition survives)');

    const auditLog = db.prepare(`
      SELECT * FROM admin_activity_logs WHERE action = 'WITHDRAWAL_STATUS_UPDATED' ORDER BY created_at DESC LIMIT 1
    `).get() as any;
    assert(auditLog && auditLog.details && !auditLog.details.includes('secretupi@paytm'), 'M1.3-13: Audit records are created without sensitive payout details');

    const userLedgerSum = (db.prepare(`
      SELECT COALESCE(SUM(CASE WHEN status = 'available' THEN amount ELSE -amount END), 0) as bal
      FROM cashback_ledger WHERE user_id = ? AND balance_type = 'withdrawable'
    `).get(wdrTestUserId) as any).bal;
    assert(userLedgerSum === 220, 'M1.3-14: Exact wallet balance calculation is correct after transitions (220)');

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
