import { db, initDatabase, hashPassword, hashToken } from './server/db.js';
import { approveConversion } from './server/api.js';
import { config } from './server/config.js';
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
  // 1. INITIAL ADMIN SETUP & SECURITY CHECKS
  // =========================================================================
  console.log('\n--- 1. Initial Admin Setup & Concurrency ---');

  // Verify that subsequent setup attempt is permanently disabled once admin exists
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
    assert(disabledSetupRes.status === 403 || disabledSetupRes.status === 429, 'Subsequent setup attempt is permanently disabled (403)');
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

  const adminCount = (db.prepare('SELECT COUNT(*) as c FROM admins').get() as any).c;
  assert(adminCount >= 1, 'Database contains initial administrator');

  // =========================================================================
  // 2. CASHBACK APPROVAL INTEGRITY & BOUNDARY VALIDATION
  // =========================================================================
  console.log('\n--- 2. Cashback Financial Approval Boundary Integrity ---');

  const now = new Date().toISOString();
  const testUserId = 'usr_fin_test_' + Date.now();
  db.prepare(`
    INSERT INTO users (id, email, name, password_hash, salt, referral_code, created_at, updated_at)
    VALUES (?, ?, 'Financial Test User', 'h', 's', ?, ?, ?)
  `).run(testUserId, `fin_${Date.now()}@roycash.test`, `REF_FIN_${Date.now()}`, now, now);

  const testCampId = 'cmp_fin_test_' + Date.now();
  db.prepare(`
    INSERT INTO campaigns (id, name, advertiser_name, category, description, reward_amount, tracking_url_template, is_demo, requires_install, requires_signup, requires_kyc, requires_deposit, created_at, updated_at)
    VALUES (?, 'Strict Multi-Step Campaign', 'FinCorp', 'Banking', 'Test', 1000, 'https://fincorp.com', 0, 1, 1, 1, 0, ?, ?)
  `).run(testCampId, now, now);

  const clickId = 'rc_fin_click_' + Date.now();
  db.prepare(`
    INSERT INTO offer_clicks (click_id, user_id, campaign_id, provider, created_at)
    VALUES (?, ?, ?, 'mitgo', ?)
  `).run(clickId, testUserId, testCampId, now);

  db.prepare(`
    INSERT INTO conversions (id, click_id, user_id, campaign_id, provider, status, reward_amount, currency, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'mitgo', 'click_recorded', 1000, 'INR', ?, ?)
  `).run('cnv_fin_' + Date.now(), clickId, testUserId, testCampId, now, now);

  // Test 2.1: Direct invocation of approveConversion() with NO steps completed must be rejected
  const approvalRes1 = approveConversion(clickId, testUserId, 1000, 'tx_direct_1_' + Date.now(), now);
  assert(approvalRes1.success === false, 'Direct approveConversion() call with 0 steps fails safely');
  assert(approvalRes1.missing_steps?.includes('install') && approvalRes1.missing_steps?.includes('signup') && approvalRes1.missing_steps?.includes('kyc'),
    'approveConversion() reports all missing required steps (install, signup, kyc)');

  const ledgerCheck1 = db.prepare("SELECT * FROM cashback_ledger WHERE user_id = ? AND type = 'cashback_credit'").get(testUserId);
  assert(!ledgerCheck1, 'No cashback was credited to ledger after failed direct approveConversion()');

  // Test 2.2: Add only 1 step (install) and call approveConversion() directly
  db.prepare(`
    INSERT INTO offer_events (id, click_id, user_id, campaign_id, step_type, event_name, status, transaction_id, verified_at, created_at)
    VALUES (?, ?, ?, ?, 'install', 'Install', 'confirmed', ?, ?, ?)
  `).run('evt_' + Date.now(), clickId, testUserId, testCampId, 'tx_evt_1_' + Date.now(), now, now);

  const approvalRes2 = approveConversion(clickId, testUserId, 1000, 'tx_direct_2_' + Date.now(), now);
  assert(approvalRes2.success === false, 'Direct approveConversion() with partial steps (missing signup, kyc) is rejected');
  assert(approvalRes2.missing_steps?.includes('signup') && approvalRes2.missing_steps?.includes('kyc'), 'Correctly identifies remaining missing steps');

  // Test 2.3: Add rejected or reversed event - cannot be counted as valid confirmed step
  db.prepare(`
    INSERT INTO offer_events (id, click_id, user_id, campaign_id, step_type, event_name, status, transaction_id, verified_at, created_at)
    VALUES (?, ?, ?, ?, 'signup', 'Signup', 'rejected', ?, ?, ?)
  `).run('evt_' + (Date.now() + 1), clickId, testUserId, testCampId, 'tx_evt_2_' + Date.now(), now, now);

  const approvalRes3 = approveConversion(clickId, testUserId, 1000, 'tx_direct_3_' + Date.now(), now);
  assert(approvalRes3.success === false, 'Rejected provider event is NOT treated as valid confirmed step');
  assert(approvalRes3.missing_steps?.includes('signup'), 'Signup is still reported as missing step');

  // Test 2.4: Complete all remaining required steps with confirmed provider events
  db.prepare(`
    INSERT INTO offer_events (id, click_id, user_id, campaign_id, step_type, event_name, status, transaction_id, verified_at, created_at)
    VALUES (?, ?, ?, ?, 'signup', 'Signup', 'confirmed', ?, ?, ?)
  `).run('evt_' + (Date.now() + 2), clickId, testUserId, testCampId, 'tx_evt_3_' + Date.now(), now, now);

  db.prepare(`
    INSERT INTO offer_events (id, click_id, user_id, campaign_id, step_type, event_name, status, transaction_id, verified_at, created_at)
    VALUES (?, ?, ?, ?, 'kyc', 'KYC', 'confirmed', ?, ?, ?)
  `).run('evt_' + (Date.now() + 3), clickId, testUserId, testCampId, 'tx_evt_4_' + Date.now(), now, now);

  const validTxId = 'tx_direct_valid_' + Date.now();
  const approvalRes4 = approveConversion(clickId, testUserId, 1000, validTxId, now);
  assert(approvalRes4.success === true, 'Direct approveConversion() succeeds when all required steps are confirmed');

  const validLedger = db.prepare("SELECT * FROM cashback_ledger WHERE user_id = ? AND type = 'cashback_credit'").get(testUserId) as any;
  assert(validLedger && validLedger.amount === 1000, 'Cashback ledger correctly received 1000 INR withdrawable credit');

  // Test 2.5: Idempotent repeat approval - must NOT duplicate ledger credit
  const approvalRes5 = approveConversion(clickId, testUserId, 1000, validTxId, now);
  assert(approvalRes5.success === true, 'Repeat approveConversion() call returns idempotent success');
  const ledgerCount = (db.prepare("SELECT COUNT(*) as c FROM cashback_ledger WHERE user_id = ? AND type = 'cashback_credit'").get(testUserId) as any).c;
  assert(ledgerCount === 1, 'Cashback ledger contains exactly 1 credit row (zero duplicates)');

  // =========================================================================
  // 3. CSRF PROTECTION VALIDATION
  // =========================================================================
  console.log('\n--- 3. CSRF Protection for Cookie-Authenticated Requests ---');

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

  // Test 3.1: Mutating request with foreign Origin is rejected (403)
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

  // Test 3.2: Mutating request with missing Origin/Referer when cookie-authenticated is rejected
  const missingOriginRes = await fetch(`${BASE_URL}/api/admin/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `roycash_admin_token=${adminCookie}`,
    },
    body: JSON.stringify({ key: 'app_tagline', value: 'Hacked' }),
  });
  assert(missingOriginRes.status === 403, 'Cookie-authenticated mutating request with missing Origin/Referer is rejected with 403');

  // Test 3.3: Mutating request with valid Origin is accepted
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
  // 4. MITGO POSTBACK SPECIFICATION COMPLIANCE
  // =========================================================================
  console.log('\n--- 4. Mitgo Postback Ingestion Compliance ---');

  // Test 4.1: Live campaign postback without confirmed official contract credentials is explicitly disabled
  const livePostbackRes = await fetch(`${BASE_URL}/api/postback/mitgo?click_id=${clickId}&event=approved&token=random_shared_token`);
  const livePostbackData = await livePostbackRes.json() as any;
  assert(livePostbackRes.status === 403, 'Live Mitgo postback is rejected (403)');
  assert(livePostbackData.documentation_status === 'unconfirmed_live_provider_signature',
    'Response explicitly identifies unconfirmed live provider documentation status');

  // Test 4.2: Sandbox demo postback with invalid sandbox key is rejected
  const sandboxCampId = 'cmp_sb_test_' + Date.now();
  db.prepare(`
    INSERT INTO campaigns (id, name, advertiser_name, category, description, reward_amount, tracking_url_template, is_demo, requires_install, created_at, updated_at)
    VALUES (?, 'Demo Offer', 'Demo Adv', 'Shopping', 'Test', 100, 'https://demo.com', 1, 1, ?, ?)
  `).run(sandboxCampId, now, now);

  const sbClickId = 'rc_sb_click_' + Date.now();
  db.prepare(`
    INSERT INTO offer_clicks (click_id, user_id, campaign_id, provider, created_at)
    VALUES (?, ?, ?, 'mitgo', ?)
  `).run(sbClickId, testUserId, sandboxCampId, now);

  db.prepare(`
    INSERT INTO conversions (id, click_id, user_id, campaign_id, provider, status, reward_amount, currency, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'mitgo', 'click_recorded', 100, 'INR', ?, ?)
  `).run('cnv_sb_' + Date.now(), sbClickId, testUserId, sandboxCampId, now, now);

  const invalidSbKeyRes = await fetch(`${BASE_URL}/api/postback/mitgo?click_id=${sbClickId}&event=install&token=wrong_key`);
  assert(invalidSbKeyRes.status === 403, 'Sandbox postback with invalid sandbox token is rejected with 403');

  // Test 4.3: Valid sandbox postback succeeds in development mode
  const validSbKeyRes = await fetch(`${BASE_URL}/api/postback/mitgo?click_id=${sbClickId}&event=install&token=sec_mitgo_sandbox_key`);
  assert(validSbKeyRes.status === 200, 'Valid sandbox postback in development environment succeeds with 200 OK');

  console.log('\n===============================================================');
  console.log(`TOTAL SECURITY TESTS: ${passed}/${total} PASSED`);
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
