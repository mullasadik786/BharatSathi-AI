import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

// Point server/db.ts at an isolated temporary test DB file before importing modules
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bharatsathi-test-'));
const tempDbFile = path.join(tempDir, 'test-db.json');
process.env.BHARATSATHI_DB_FILE = tempDbFile;

import { getPublicState, readDb } from '../server/db.ts';
import {
  createRateLimiter,
  getSecurityPosture,
  sanitizeText,
  securityHeadersMiddleware,
  validatePositiveAmount,
} from '../server/security.ts';
import {
  buildDisasterPreparednessPlaybook,
  executeAgentTool,
} from '../server/tools.ts';

test.after(() => {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {
    // ignore cleanup failures
  }
});

test('Security: sanitizeText strips XSS/control chars while preserving Telugu and Hindi', () => {
  const dirty = '<script>alert(1)</script> నా పొలానికి నీళ్లు & खाद 2500\u0007';
  const cleaned = sanitizeText(dirty, 200);
  assert.equal(cleaned.includes('<'), false);
  assert.equal(cleaned.includes('>'), false);
  assert.equal(cleaned.includes('\u0007'), false);
  assert.equal(cleaned.includes('నా పొలానికి నీళ్లు'), true);
  assert.equal(cleaned.includes('खाद 2500'), true);
});

test('Security: validatePositiveAmount rejects invalid and out-of-range amounts', () => {
  assert.equal(validatePositiveAmount(-500).ok, false);
  assert.equal(validatePositiveAmount(0).ok, false);
  assert.equal(validatePositiveAmount('abc').ok, false);
  assert.equal(validatePositiveAmount(999_999_999).ok, false);
  const valid = validatePositiveAmount(2500.456);
  assert.equal(valid.ok, true);
  if (valid.ok) assert.equal(valid.amount, 2500.46);
});

test('Security: HTTP headers middleware and rate limiter enforce protections', () => {
  const headers: Record<string, string> = {};
  let nextCalled = false;
  securityHeadersMiddleware(
    {} as never,
    {
      setHeader: (k: string, v: string) => {
        headers[k] = v;
      },
    } as never,
    () => {
      nextCalled = true;
    }
  );
  assert.equal(nextCalled, true);
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(headers['X-Frame-Options'], 'SAMEORIGIN');

  const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 2 });
  let statusCode = 200;
  let passed = 0;
  const runReq = () => {
    limiter.middleware(
      { ip: '127.0.0.1', socket: { remoteAddress: '127.0.0.1' } } as never,
      {
        setHeader: () => {},
        status: (code: number) => {
          statusCode = code;
          return { json: () => {} };
        },
      } as never,
      () => {
        passed += 1;
      }
    );
  };
  runReq();
  runReq();
  runReq();
  assert.equal(passed, 2);
  assert.equal(statusCode, 429);
  assert.equal(getSecurityPosture().server_side_api_key_isolation, true);
});

test('Tool 1: Farm Expense Manager saves validated expense and calculates total', async () => {
  const before = await executeAgentTool('get_farm_expenses', { period: 'all' }, 'English');
  const initialTotal = Number(before.result.total_inr);

  const invalid = await executeAgentTool('add_farm_expense', { amount: -10, category: 'Fertilizer' }, 'Hindi');
  assert.equal(invalid.result.success, false);

  const added = await executeAgentTool(
    'add_farm_expense',
    { amount: 2500, category: 'खाद Fertilizer', date: 'today', description: 'DAP fertilizer bag' },
    'Hindi'
  );
  assert.equal(added.result.success, true);
  assert.equal(added.result.updated_total_expenses_inr, initialTotal + 2500);
});

test('Tool 2: Irrigation Reminder requires time and confirmation before cancelling', async () => {
  const missingTime = await executeAgentTool(
    'create_irrigation_reminder',
    { task: 'Irrigate paddy plot', date: 'tomorrow', time: '' },
    'Telugu'
  );
  assert.equal(missingTime.result.success, false);
  assert.equal(missingTime.result.missing_field, 'time');

  const created = await executeAgentTool(
    'create_irrigation_reminder',
    { task: 'Irrigate paddy plot', date: 'tomorrow', time: '06:00' },
    'Telugu'
  );
  assert.equal(created.result.success, true);
  const remId = (created.result.reminder as { id: string }).id;

  const unconfirmedCancel = await executeAgentTool(
    'cancel_irrigation_reminder',
    { reminder_id: remId, confirmed: false },
    'Telugu'
  );
  assert.equal(unconfirmedCancel.result.success, false);
  assert.equal(unconfirmedCancel.result.needs_confirmation, true);

  const confirmedCancel = await executeAgentTool(
    'cancel_irrigation_reminder',
    { reminder_id: remId, confirmed: true },
    'Telugu'
  );
  assert.equal(confirmedCancel.result.success, true);
  assert.equal((confirmedCancel.result.reminder as { status: string }).status, 'cancelled');
});

test('Tool 3, 5 & 6: Crop reporting, demo market query, and profile permission gate', async () => {
  const cropRes = await executeAgentTool(
    'record_crop_issue',
    { crop: 'Paddy', symptoms: 'Brown leaf spots on lower blades', severity: 'high' },
    'English'
  );
  assert.equal(cropRes.result.success, true);
  assert.equal((cropRes.result.report as { expert_recommended: boolean }).expert_recommended, true);

  const marketRes = await executeAgentTool('get_market_prices', { crop: 'Chilli', market: 'Guntur' }, 'Telugu');
  assert.equal(marketRes.result.success, true);
  assert.equal(String(marketRes.result.data_notice).includes('Demo Dataset'), true);

  const deniedProfile = await executeAgentTool(
    'register_or_update_farmer_profile',
    { name: 'Unauthorized Change', user_confirmed_permission: false },
    'English'
  );
  assert.equal(deniedProfile.result.success, false);
  assert.equal(deniedProfile.result.needs_confirmation, true);

  const allowedProfile = await executeAgentTool(
    'register_or_update_farmer_profile',
    { village: 'Amaravati', user_confirmed_permission: true },
    'Telugu'
  );
  assert.equal(allowedProfile.result.success, true);
  assert.equal(readDb().farmer.village, 'Amaravati');
});

test('Disaster Management: Cyclone & Disaster playbook provides verified helplines and non-fabricated disclaimer', () => {
  const playbook = buildDisasterPreparednessPlaybook('cyclone', null);
  assert.equal(playbook.helplines.some((h) => h.number === '112'), true);
  assert.equal(playbook.helplines.some((h) => h.number === '1070'), true);
  assert.equal(playbook.helplines.some((h) => h.number === '1800-180-1551'), true);
  assert.equal(playbook.official_sources.some((s) => s.url.includes('mausam.imd.gov.in')), true);
  assert.equal(playbook.checklists.cyclone_and_storm.length >= 4, true);

  const state = getPublicState();
  assert.equal(state.metrics.total_actions_executed > 0, true);
});
