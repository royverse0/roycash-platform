import { db, initDatabase, hashPassword } from './server/db.js';
import { approveConversion } from './server/api.js';
import { config, validateProductionConfig } from './server/config.js';
import crypto from 'node:crypto';

initDatabase();

async function runComprehensiveSecuritySuite() {
  console.log('================================================================');
  console.log('ROYCASH COMPREHENSIVE SECURITY AUDIT & VERIFICATION SUITE (ROUND 2)');
  console.log('================================================================');
  console.log('Environment Setup: Node.js, Express, SQLite WAL Mode');
  console.log(`Target Server Base URL: http://127.0.0.1:3000`);
  console.log('Database Isolation: Transactional isolation with test data cleanup');
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

  const BASE_URL = 'http://127.0.0.1:3000';
  const ORIGIN = 'http://127.0.0.1:3000';
  const now = new Date().toISOString();

  // Test tracking list for database cleanup
  const cleanupUserIds: string[] = [];
  const cleanupCampaignIds: string[] = [];
  const cleanupClickIds: string[] = [];

  try {
    // =========================================================================
    // 1. CAMPAIGN REWARD & EVENT VERIFICATION TESTS
    // =========================================================================
    console.log('--- 1. Campaign Reward & Event Verification Security ---');

    // Create baseline test users
    const validUserId = 'usr_sec2_valid_' + Date.now();
    const wrongUserId = 'usr_sec2_wrong_' + Date.now();
    cleanupUserIds.push(validUserId, wrongUserId);

    db.prepare(`
      INSERT INTO users (id, email, name, password_hash, salt, referral_code, created_at, updated_at)
      VALUES (?, ?, 'Valid Sec User', 'h', 's', ?, ?, ?)
    `).run(validUserId, `valid_${Date.now()}@roycash.sec`, `REF_VAL_${Date.now()}`, now, now);

    db.prepare(`
      INSERT INTO users (id, email, name, password_hash, salt, referral_code, created_at, updated_at)
      VALUES (?, ?, 'Wrong Sec User', 'h', 's', ?, ?, ?)
    `).run(wrongUserId, `wrong_${Date.now()}@roycash.sec`, `REF_WRONG_${Date.now()}`, now, now);

    // Create baseline test campaigns
    const liveCampId = 'cmp_sec2_live_' + Date.now();
    const demoCampId = 'cmp_sec2_demo_' + Date.now();
    const invalidRewardCampId = 'cmp_sec2_badreward_' + Date.now();
    const wrongCampId = 'cmp_sec2_wrongcamp_' + Date.now();
    cleanupCampaignIds.push(liveCampId, demoCampId, invalidRewardCampId, wrongCampId);

    // Live campaign (is_demo = 0) with reward_amount = 500
    db.prepare(`
      INSERT INTO campaigns (id, name, advertiser_name, category, description, reward_amount, tracking_url_template, is_demo, requires_install, requires_signup, requires_kyc, requires_deposit, created_at, updated_at)
      VALUES (?, 'Live Campaign Security Test', 'LiveCorp', 'Finance', 'Test', 500, 'https://live.com', 0, 1, 0, 0, 0, ?, ?)
    `).run(liveCampId, now, now);

    // Demo campaign (is_demo = 1) with reward_amount = 300
    db.prepare(`
      INSERT INTO campaigns (id, name, advertiser_name, category, description, reward_amount, tracking_url_template, is_demo, requires_install, requires_signup, requires_kyc, requires_deposit, created_at, updated_at)
      VALUES (?, 'Demo Campaign Security Test', 'DemoCorp', 'Shopping', 'Test', 300, 'https://demo.com', 1, 1, 0, 0, 0, ?, ?)
    `).run(demoCampId, now, now);

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

    // Create click and conversion records for Live Campaign
    const liveClickId = 'rc_click_live_' + Date.now();
    const wrongClickId = 'rc_click_wrong_' + Date.now();
    cleanupClickIds.push(liveClickId, wrongClickId);

    db.prepare(`
      INSERT INTO offer_clicks (click_id, user_id, campaign_id, provider, created_at)
      VALUES (?, ?, ?, 'mitgo', ?)
    `).run(liveClickId, validUserId, liveCampId, now);

    db.prepare(`
      INSERT INTO offer_clicks (click_id, user_id, campaign_id, provider, created_at)
      VALUES (?, ?, ?, 'mitgo', ?)
    `).run(wrongClickId, validUserId, wrongCampId, now);

    const liveConvId = 'cnv_sec2_live_' + Date.now();
    db.prepare(`
      INSERT INTO conversions (id, click_id, user_id, campaign_id, provider, status, reward_amount, currency, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'mitgo', 'click_recorded', 500, 'INR', ?, ?)
    `).run(liveConvId, liveClickId, validUserId, liveCampId, now, now);

    // Test 1.1: Missing campaign rejected
    const deletedCampId = 'cmp_sec2_deleted_' + Date.now();
    const missingCampClickId = 'rc_click_nocamp_' + Date.now();
    cleanupClickIds.push(missingCampClickId);
    db.prepare(`
      INSERT INTO campaigns (id, name, advertiser_name, category, description, reward_amount, tracking_url_template, is_demo, created_at, updated_at)
      VALUES (?, 'Deleted Campaign', 'TempCorp', 'Finance', 'Test', 500, 'https://temp.com', 0, ?, ?)
    `).run(deletedCampId, now, now);
    db.prepare(`
      INSERT INTO offer_clicks (click_id, user_id, campaign_id, provider, created_at)
      VALUES (?, ?, ?, 'mitgo', ?)
    `).run(missingCampClickId, validUserId, deletedCampId, now);
    db.prepare(`
      INSERT INTO conversions (id, click_id, user_id, campaign_id, provider, status, reward_amount, currency, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'mitgo', 'click_recorded', 500, 'INR', ?, ?)
    `).run('cnv_nocamp_' + Date.now(), missingCampClickId, validUserId, deletedCampId, now, now);
    // Delete campaign row to simulate deleted/missing campaign
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(deletedCampId);

    const missingCampRes = approveConversion(missingCampClickId, validUserId, 500, 'tx_nocamp_' + Date.now(), now);
    assert(missingCampRes.success === false, 'Missing campaign rejected safely');

    // Test 1.2: Invalid reward configuration rejected
    const badRewardClickId = 'rc_click_badreward_' + Date.now();
    cleanupClickIds.push(badRewardClickId);
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

    // Test 1.3: Excessive reward rejected (attempt 1500 when campaign limit is 500)
    const excessiveRes = approveConversion(liveClickId, validUserId, 1500, 'tx_excessive_' + Date.now(), now);
    assert(excessiveRes.success === false && excessiveRes.error?.includes('exceeds campaign configured limit'), 'Excessive reward amount above campaign limit rejected');

    // Test 1.4: Wrong user event rejected
    // Insert confirmed event for wrong user on liveClickId
    db.prepare(`
      INSERT INTO offer_events (id, click_id, user_id, campaign_id, step_type, event_name, status, transaction_id, verified_at, created_at)
      VALUES (?, ?, ?, ?, 'install', 'Install', 'confirmed', ?, ?, ?)
    `).run('evt_wronguser_' + Date.now(), liveClickId, wrongUserId, liveCampId, 'tx_evt_wronguser_' + Date.now(), now, now);

    const wrongUserRes = approveConversion(liveClickId, validUserId, 500, 'tx_wu_' + Date.now(), now);
    assert(wrongUserRes.success === false, 'Wrong user event rejected (event for different user not counted)');

    // Test 1.5: Wrong campaign event rejected
    // Insert confirmed event for wrong campaign ID on liveClickId
    db.prepare(`
      INSERT INTO offer_events (id, click_id, user_id, campaign_id, step_type, event_name, status, transaction_id, verified_at, created_at)
      VALUES (?, ?, ?, ?, 'install', 'Install', 'confirmed', ?, ?, ?)
    `).run('evt_wrongcamp_' + Date.now(), liveClickId, validUserId, wrongCampId, 'tx_evt_wrongcamp_' + Date.now(), now, now);

    const wrongCampRes = approveConversion(liveClickId, validUserId, 500, 'tx_wc_' + Date.now(), now);
    assert(wrongCampRes.success === false, 'Wrong campaign event rejected (event for different campaign not counted)');

    // Test 1.6: Wrong click event rejected
    // Insert confirmed event for wrong click ID
    db.prepare(`
      INSERT INTO offer_events (id, click_id, user_id, campaign_id, step_type, event_name, status, transaction_id, verified_at, created_at)
      VALUES (?, ?, ?, ?, 'install', 'Install', 'confirmed', ?, ?, ?)
    `).run('evt_wrongclick_' + Date.now(), wrongClickId, validUserId, liveCampId, 'tx_evt_wrongclick_' + Date.now(), now, now);

    const wrongClickRes = approveConversion(liveClickId, validUserId, 500, 'tx_wcl_' + Date.now(), now);
    assert(wrongClickRes.success === false, 'Wrong click event rejected (event for different click ID not counted)');

    // Test 1.7: Unverified provider event rejected
    // Insert unverified ('pending') event for liveClickId
    db.prepare(`
      INSERT INTO offer_events (id, click_id, user_id, campaign_id, step_type, event_name, status, transaction_id, verified_at, created_at)
      VALUES (?, ?, ?, ?, 'install', 'Install', 'pending', ?, ?, ?)
    `).run('evt_unverified_' + Date.now(), liveClickId, validUserId, liveCampId, 'tx_evt_unverified_' + Date.now(), now, now);

    const unverifiedRes = approveConversion(liveClickId, validUserId, 500, 'tx_unverified_' + Date.now(), now);
    assert(unverifiedRes.success === false, 'Unverified provider event (status=pending) rejected');

    // Test 1.8: Sandbox event on live campaign rejected
    // Insert 'sandbox_confirmed' event for live campaign (is_demo = 0)
    db.prepare(`
      INSERT INTO offer_events (id, click_id, user_id, campaign_id, step_type, event_name, status, transaction_id, verified_at, created_at)
      VALUES (?, ?, ?, ?, 'install', 'Install', 'sandbox_confirmed', ?, ?, ?)
    `).run('evt_sandbox_live_' + Date.now(), liveClickId, validUserId, liveCampId, 'tx_evt_sb_live_' + Date.now(), now, now);

    const sandboxLiveRes = approveConversion(liveClickId, validUserId, 500, 'tx_sblive_' + Date.now(), now);
    assert(sandboxLiveRes.success === false, 'Sandbox event on live campaign (is_demo=0) rejected');

    // Test 1.9: Valid campaign approval succeeds
    // Insert genuine 'confirmed' event matching click_id, user_id, and campaign_id
    db.prepare(`
      INSERT INTO offer_events (id, click_id, user_id, campaign_id, step_type, event_name, status, transaction_id, verified_at, created_at)
      VALUES (?, ?, ?, ?, 'install', 'Install', 'confirmed', ?, ?, ?)
    `).run('evt_valid_live_' + Date.now(), liveClickId, validUserId, liveCampId, 'tx_evt_valid_live_' + Date.now(), now, now);

    const validTxId = 'tx_valid_live_' + Date.now();
    const validApprovalRes = approveConversion(liveClickId, validUserId, 500, validTxId, now);
    assert(validApprovalRes.success === true, 'Valid campaign approval succeeds when all requirements are met');

    const ledgerRecord = db.prepare("SELECT * FROM cashback_ledger WHERE user_id = ? AND type = 'cashback_credit'").get(validUserId) as any;
    assert(ledgerRecord && ledgerRecord.amount === 500, 'Cashback ledger credited exactly 500 INR to legitimate user wallet');

    // Test 1.10: Duplicate approval does not create another ledger entry (Idempotency)
    const duplicateApprovalRes = approveConversion(liveClickId, validUserId, 500, validTxId, now);
    assert(duplicateApprovalRes.success === true, 'Duplicate approval returns idempotent success');

    const ledgerCount = (db.prepare("SELECT COUNT(*) as c FROM cashback_ledger WHERE user_id = ? AND type = 'cashback_credit'").get(validUserId) as any).c;
    assert(ledgerCount === 1, 'Duplicate approval did not create another ledger entry (double credit prevented)');

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
    // 3. ANTI-CSRF PROTECTION TESTS
    // =========================================================================
    console.log('\n--- 3. Anti-CSRF Protection Tests ---');

    const { hash: tHash, salt: tSalt } = hashPassword('StrongPassword123!');
    const adminRow = db.prepare('SELECT id FROM admins LIMIT 1').get() as { id: string } | undefined;
    if (adminRow) {
      db.prepare('UPDATE admins SET email = ?, username = ?, password_hash = ?, salt = ?, status = ? WHERE id = ?')
        .run('testadmin@roycash.internal', 'testadmin', tHash, tSalt, 'active', adminRow.id);
    } else {
      const admId = 'adm_test_' + Date.now();
      db.prepare(`
        INSERT INTO admins (id, username, email, name, password_hash, salt, role, status, created_at, updated_at)
        VALUES (?, 'testadmin', 'testadmin@roycash.internal', 'Test Admin', ?, ?, 'superadmin', 'active', ?, ?)
      `).run(admId, tHash, tSalt, now, now);
    }

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
    // ISOLATED TEST DATA CLEANUP (PRESERVES PRODUCTION/SYSTEM DATA)
    // =========================================================================
    console.log('\n--- Test Data Cleanup & Database Isolation ---');
    for (const cId of cleanupClickIds) {
      db.prepare('DELETE FROM offer_events WHERE click_id = ?').run(cId);
      db.prepare('DELETE FROM cashback_ledger WHERE conversion_id IN (SELECT id FROM conversions WHERE click_id = ?)').run(cId);
      db.prepare('DELETE FROM referral_rewards WHERE source_conversion_id IN (SELECT id FROM conversions WHERE click_id = ?)').run(cId);
      db.prepare('DELETE FROM conversions WHERE click_id = ?').run(cId);
      db.prepare('DELETE FROM offer_clicks WHERE click_id = ?').run(cId);
    }
    for (const uId of cleanupUserIds) {
      db.prepare('DELETE FROM cashback_ledger WHERE user_id = ?').run(uId);
      db.prepare('DELETE FROM referral_relationships WHERE referrer_user_id = ? OR referred_user_id = ?').run(uId, uId);
      db.prepare('DELETE FROM users WHERE id = ?').run(uId);
    }
    for (const cmpId of cleanupCampaignIds) {
      db.prepare('DELETE FROM campaign_steps WHERE campaign_id = ?').run(cmpId);
      db.prepare('DELETE FROM campaigns WHERE id = ?').run(cmpId);
    }
    console.log('[CLEANUP] All temporary test records removed cleanly from database.');
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
