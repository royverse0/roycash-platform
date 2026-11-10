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
