import { db, initDatabase, hashPassword, hashToken } from './server/db.js';
import { approveConversion } from './server/api.js';
import { config, validateProductionConfig, validateSetupTokenConfig } from './server/config.js';
import crypto from 'node:crypto';

initDatabase();

async function runComprehensiveSecurityTests() {
  console.log('===============================================================');
  console.log('ROYCASH COMPREHENSIVE SECURITY AUDIT & VERIFICATION SUITE');
  console.log('===============================================================');

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

  const BASE_URL = 'http://127.0.0.1:3000';
  const ORIGIN = 'http://127.0.0.1:3000';

  // =========================================================================
  // 1. ADMIN SETUP CONFIGURATION & STARTUP VALIDATION
  // =========================================================================
  console.log('\n--- 1. Admin Setup Configuration & Production Security ---');

  // Test 1.1: Production startup with missing ADMIN_SETUP_TOKEN
  const origEnv = process.env.NODE_ENV;
  const origSetupToken = process.env.ADMIN_SETUP_TOKEN;
  const origSecret = process.env.ADMIN_SESSION_SECRET;

  process.env.NODE_ENV = 'production';
  process.env.ADMIN_SESSION_SECRET = 'a_very_secure_high_entropy_32_character_session_secret_2026!';
  delete process.env.ADMIN_SETUP_TOKEN;

  let missingTokenError = false;
  try {
    validateProductionConfig('production');
  } catch (err: any) {
    missingTokenError = true;
  }
  assert(missingTokenError, 'Production startup fails when ADMIN_SETUP_TOKEN is missing');

  // Test 1.2: Production startup with weak ADMIN_SETUP_TOKEN (< 32 chars)
  process.env.ADMIN_SETUP_TOKEN = 'short_token_12345';
  let weakTokenError = false;
  try {
    validateProductionConfig('production');
  } catch (err: any) {
    weakTokenError = true;
  }
  assert(weakTokenError, 'Production startup fails when ADMIN_SETUP_TOKEN is under 32 characters');

  // Test 1.3: Production startup with placeholder ADMIN_SETUP_TOKEN
  process.env.ADMIN_SETUP_TOKEN = 'admin_setup_token_placeholder_32chars_long!';
  let placeholderError = false;
  try {
    validateProductionConfig('production');
  } catch (err: any) {
    placeholderError = true;
  }
  assert(placeholderError, 'Production startup fails when ADMIN_SETUP_TOKEN is a placeholder');

  // Test 1.4: Production startup with valid 32+ character high-entropy token
  process.env.ADMIN_SETUP_TOKEN = 'a_very_secure_high_entropy_32_character_setup_token_2026!';
  let validConfigPass = false;
  try {
    validateProductionConfig('production');
    validConfigPass = true;
  } catch (err: any) {
    validConfigPass = false;
  }
  assert(validConfigPass, 'Production startup succeeds with valid high-entropy 32+ char setup token');

  // Restore env
  process.env.NODE_ENV = origEnv;
  if (origSetupToken) process.env.ADMIN_SETUP_TOKEN = origSetupToken; else delete process.env.ADMIN_SETUP_TOKEN;
  if (origSecret) process.env.ADMIN_SESSION_SECRET = origSecret; else delete process.env.ADMIN_SESSION_SECRET;

  // Test 1.5: Verify existing admin setup remains permanently disabled via HTTP endpoint
  const existingAdmins = (db.prepare('SELECT COUNT(*) as c FROM admins').get() as any).c;
  if (existingAdmins > 0) {
    const disabledSetupRes = await fetch(`${BASE_URL}/api/admin/setup-initial`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': ORIGIN },
      body: JSON.stringify({
        email: 'attacker@roycash.internal',
        password: 'AttackerPassword123!',
      }),
    });
    assert(disabledSetupRes.status === 403 || disabledSetupRes.status === 429, 'Existing admin setup endpoint remains permanently disabled (403)');
  } else {
    // Initial setup request
    const setupRes = await fetch(`${BASE_URL}/api/admin/setup-initial`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': ORIGIN },
      body: JSON.stringify({
        email: 'testadmin@roycash.internal',
        name: 'Test Admin',
        password: 'StrongPassword123!',
      }),
    });
    assert(setupRes.status === 201, 'Initial admin setup succeeds with 201 Created');
  }

  // =========================================================================
  // 2. CASHBACK USER OWNERSHIP & WALLET SECURITY
  // =========================================================================
  console.log('\n--- 2. Cashback User Ownership & Wallet Security ---');

  const now = new Date().toISOString();
  const legitimateUser = 'usr_owner_legit_' + Date.now();
  const attackerUser = 'usr_owner_attacker_' + Date.now();

  db.prepare(`
    INSERT INTO users (id, email, name, password_hash, salt, referral_code, created_at, updated_at)
    VALUES (?, ?, 'Legitimate Owner', 'h', 's', ?, ?, ?)
  `).run(legitimateUser, `legit_${Date.now()}@roycash.test`, `REF_LEGIT_${Date.now()}`, now, now);

  db.prepare(`
    INSERT INTO users (id, email, name, password_hash, salt, referral_code, created_at, updated_at)
    VALUES (?, ?, 'Attacker User', 'h', 's', ?, ?, ?)
  `).run(attackerUser, `attacker_${Date.now()}@roycash.test`, `REF_ATTACK_${Date.now()}`, now, now);

  const ownCampId = 'cmp_ownership_' + Date.now();
  db.prepare(`
    INSERT INTO campaigns (id, name, advertiser_name, category, description, reward_amount, tracking_url_template, is_demo, requires_install, requires_signup, requires_kyc, requires_deposit, created_at, updated_at)
    VALUES (?, 'Ownership Campaign', 'OwnerCorp', 'Shopping', 'Test', 1000, 'https://owner.com', 0, 0, 0, 0, 0, ?, ?)
  `).run(ownCampId, now, now);

  const ownClickId = 'rc_own_click_' + Date.now();
  db.prepare(`
    INSERT INTO offer_clicks (click_id, user_id, campaign_id, provider, created_at)
    VALUES (?, ?, ?, 'mitgo', ?)
  `).run(ownClickId, legitimateUser, ownCampId, now);

  db.prepare(`
    INSERT INTO conversions (id, click_id, user_id, campaign_id, provider, status, reward_amount, currency, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'mitgo', 'click_recorded', 1000, 'INR', ?, ?)
  `).run('cnv_own_' + Date.now(), ownClickId, legitimateUser, ownCampId, now, now);

  // Test 2.1: Mismatched conversion user ID - caller tries to pass attackerUser for legitimateUser's conversion
  const mismatchRes = approveConversion(ownClickId, attackerUser, 1000, 'tx_own_mismatch_' + Date.now(), now);
  assert(mismatchRes.success === false, 'Approval fails when supplied user ID does not match conversion.user_id');

  // Test 2.2: Attempt to credit a different user's wallet
  const attackerLedger = db.prepare("SELECT * FROM cashback_ledger WHERE user_id = ? AND type = 'cashback_credit'").get(attackerUser);
  assert(!attackerLedger, 'No cashback was credited to attacker wallet after mismatched approval attempt');

  // =========================================================================
  // 3. CASHBACK AMOUNT VALIDATION & CAMPAIGN REWARD LIMIT
  // =========================================================================
  console.log('\n--- 3. Cashback Amount Validation & Campaign Limits ---');

  // Test 3.1: Negative reward amount
  const negativeRes = approveConversion(ownClickId, legitimateUser, -500, 'tx_amount_neg_' + Date.now(), now);
  assert(negativeRes.success === false, 'Approval rejected for negative reward amount (-500)');

  // Test 3.2: Zero reward amount
  const zeroRes = approveConversion(ownClickId, legitimateUser, 0, 'tx_amount_zero_' + Date.now(), now);
  assert(zeroRes.success === false, 'Approval rejected for zero reward amount (0)');

  // Test 3.3: NaN reward amount
  const nanRes = approveConversion(ownClickId, legitimateUser, NaN, 'tx_amount_nan_' + Date.now(), now);
  assert(nanRes.success === false, 'Approval rejected for NaN reward amount');

  // Test 3.4: Infinity reward amount
  const infinityRes = approveConversion(ownClickId, legitimateUser, Infinity, 'tx_amount_inf_' + Date.now(), now);
  assert(infinityRes.success === false, 'Approval rejected for Infinity reward amount');

  // Test 3.5: Reward amount above campaign limit (5000 vs campaign limit 1000)
  const excessiveRes = approveConversion(ownClickId, legitimateUser, 5000, 'tx_amount_excess_' + Date.now(), now);
  assert(excessiveRes.success === false, 'Approval rejected when reward amount exceeds campaign configured limit (5000 > 1000)');

  // Test 3.6: Valid reward amount within campaign limit
  const validTxId = 'tx_amount_valid_' + Date.now();
  const validRes = approveConversion(ownClickId, legitimateUser, 1000, validTxId, now);
  assert(validRes.success === true, 'Approval succeeds for valid reward amount within campaign limit (1000)');

  const validLedger = db.prepare("SELECT * FROM cashback_ledger WHERE user_id = ? AND type = 'cashback_credit'").get(legitimateUser) as any;
  assert(validLedger && validLedger.amount === 1000, 'Cashback ledger credited exactly 1000 INR to legitimate owner');

  // Test 3.7: Duplicate approval does not create another ledger entry (Idempotency)
  const duplicateRes = approveConversion(ownClickId, legitimateUser, 1000, validTxId, now);
  assert(duplicateRes.success === true, 'Duplicate approval returns idempotent success');

  const ledgerCount = (db.prepare("SELECT COUNT(*) as c FROM cashback_ledger WHERE user_id = ? AND type = 'cashback_credit'").get(legitimateUser) as any).c;
  assert(ledgerCount === 1, 'Duplicate approval did not create another ledger entry (exactly 1 row)');

  // =========================================================================
  // 4. CSRF PROTECTION VALIDATION
  // =========================================================================
  console.log('\n--- 4. CSRF Protection for Cookie-Authenticated Requests ---');

  // Ensure testadmin exists with known password
  const { hash: tHash, salt: tSalt } = hashPassword('StrongPassword123!');
  const adminRow = db.prepare('SELECT id FROM admins LIMIT 1').get() as { id: string } | undefined;
  if (adminRow) {
    db.prepare('UPDATE admins SET email = ?, username = ?, password_hash = ?, salt = ?, status = ? WHERE id = ?')
      .run('testadmin@roycash.internal', 'testadmin', tHash, tSalt, 'active', adminRow.id);
  } else {
    const { hash, salt } = hashPassword('StrongPassword123!');
    const admId = 'adm_test_' + Date.now();
    const n = new Date().toISOString();
    db.prepare(`
      INSERT INTO admins (id, username, email, name, password_hash, salt, role, status, created_at, updated_at)
      VALUES (?, 'testadmin', 'testadmin@roycash.internal', 'Test Admin', ?, ?, 'superadmin', 'active', ?, ?)
    `).run(admId, hash, salt, n, n);
  }

  // Login as admin to obtain cookie
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

  // Test 4.1: Mutating request with foreign Origin is rejected (403)
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

  // Test 4.2: Mutating request with missing Origin/Referer when cookie-authenticated is rejected
  const missingOriginRes = await fetch(`${BASE_URL}/api/admin/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `roycash_admin_token=${adminCookie}`,
    },
    body: JSON.stringify({ key: 'app_tagline', value: 'Hacked' }),
  });
  assert(missingOriginRes.status === 403, 'Cookie-authenticated mutating request with missing Origin/Referer is rejected with 403');

  // Test 4.3: Mutating request with valid Origin is accepted
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
  // 5. MITGO POSTBACK SPECIFICATION COMPLIANCE
  // =========================================================================
  console.log('\n--- 5. Mitgo Postback Ingestion Compliance ---');

  // Test 5.1: Live campaign postback without confirmed official contract credentials is explicitly disabled
  const livePostbackRes = await fetch(`${BASE_URL}/api/postback/mitgo?click_id=${ownClickId}&event=approved&token=random_shared_token`);
  const livePostbackData = await livePostbackRes.json() as any;
  assert(livePostbackRes.status === 403, 'Live Mitgo postback is rejected (403)');
  assert(livePostbackData.documentation_status === 'unconfirmed_live_provider_signature',
    'Response explicitly identifies unconfirmed live provider documentation status');

  // Test 5.2: Sandbox demo postback with invalid sandbox key is rejected
  const sandboxCampId = 'cmp_sb_test_' + Date.now();
  db.prepare(`
    INSERT INTO campaigns (id, name, advertiser_name, category, description, reward_amount, tracking_url_template, is_demo, requires_install, created_at, updated_at)
    VALUES (?, 'Demo Offer', 'Demo Adv', 'Shopping', 'Test', 100, 'https://demo.com', 1, 1, ?, ?)
  `).run(sandboxCampId, now, now);

  const sbClickId = 'rc_sb_click_' + Date.now();
  db.prepare(`
    INSERT INTO offer_clicks (click_id, user_id, campaign_id, provider, created_at)
    VALUES (?, ?, ?, 'mitgo', ?)
  `).run(sbClickId, legitimateUser, sandboxCampId, now);

  db.prepare(`
    INSERT INTO conversions (id, click_id, user_id, campaign_id, provider, status, reward_amount, currency, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'mitgo', 'click_recorded', 100, 'INR', ?, ?)
  `).run('cnv_sb_' + Date.now(), sbClickId, legitimateUser, sandboxCampId, now, now);

  const invalidSbKeyRes = await fetch(`${BASE_URL}/api/postback/mitgo?click_id=${sbClickId}&event=install&token=wrong_key`);
  assert(invalidSbKeyRes.status === 403, 'Sandbox postback with invalid sandbox token is rejected with 403');

  // Test 5.3: Valid sandbox postback succeeds in development mode
  const validSbKeyRes = await fetch(`${BASE_URL}/api/postback/mitgo?click_id=${sbClickId}&event=install&token=sec_mitgo_sandbox_key`);
  assert(validSbKeyRes.status === 200, 'Valid sandbox postback in development environment succeeds with 200 OK');

  console.log('\n===============================================================');
  console.log(`TOTAL SECURITY ASSERTIONS EXECUTED: ${passed}/${total} PASSED`);
  console.log('===============================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runComprehensiveSecurityTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
