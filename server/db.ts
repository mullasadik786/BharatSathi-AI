import fs from 'fs';
import path from 'path';
import { getSecurityPosture } from './security.ts';
import type {
  ActivityLog,
  AppDatabaseState,
  CropReport,
  FarmExpense,
  FarmerProfile,
  IrrigationReminder,
  MarketPrice,
  PerformanceMetrics,
  VoiceSessionRecord,
} from '../src/types.ts';

interface PersistedSchema {
  farmer: FarmerProfile;
  expenses: FarmExpense[];
  reminders: IrrigationReminder[];
  cropReports: CropReport[];
  marketPrices: MarketPrice[];
  voiceSessions: VoiceSessionRecord[];
  activityLogs: ActivityLog[];
  voiceFirstByteLatenciesMs: number[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
function getDbFilePath(): string {
  if (process.env.BHARATSATHI_DB_FILE) {
    return path.resolve(process.env.BHARATSATHI_DB_FILE);
  }
  return path.join(DATA_DIR, 'bharatsathi-db.json');
}

function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function getTomorrowDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function createSeedDatabase(): PersistedSchema {
  const today = getTodayDateString();
  const tomorrow = getTomorrowDateString();
  const nowIso = new Date().toISOString();

  return {
    farmer: {
      id: 'FRM-1001',
      name: 'Ramesh Reddy',
      village: 'Shamirpet',
      district: 'Medchal-Malkajgiri',
      state: 'Telangana',
      preferred_language: 'Telugu-English',
      crops: ['Paddy (Sona Masoori)', 'Cotton', 'Green Chilli'],
      farm_acres: 6.5,
      consent_given: false,
      updated_at: nowIso,
    },
    expenses: [
      {
        id: 'EXP-4012',
        farmer_id: 'FRM-1001',
        amount: 3200,
        category: 'Seeds',
        date: today,
        description: 'Sona Masoori paddy nursery seed bags (20 kg)',
        created_at: nowIso,
      },
      {
        id: 'EXP-4011',
        farmer_id: 'FRM-1001',
        amount: 1850,
        category: 'Labor',
        date: today,
        description: 'Bund clearing and canal desilting labor (2 workers)',
        created_at: nowIso,
      },
      {
        id: 'EXP-4010',
        farmer_id: 'FRM-1001',
        amount: 1400,
        category: 'Irrigation',
        date: today,
        description: 'Drip lateral pipe fittings and valve maintenance',
        created_at: nowIso,
      },
    ],
    reminders: [
      {
        id: 'REM-2001',
        farmer_id: 'FRM-1001',
        task: 'Check borewell motor starter & irrigate North Paddy Block',
        date: tomorrow,
        time: '06:30',
        status: 'upcoming',
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: 'REM-2002',
        farmer_id: 'FRM-1001',
        task: 'Apply foliar micronutrient spray on Cotton plot',
        date: tomorrow,
        time: '16:30',
        status: 'upcoming',
        created_at: nowIso,
        updated_at: nowIso,
      },
    ],
    cropReports: [
      {
        id: 'CRP-3001',
        farmer_id: 'FRM-1001',
        crop: 'Green Chilli',
        symptoms: 'Slight upward leaf curling on younger shoots near field border',
        date: today,
        location: 'Shamirpet East Plot',
        severity: 'moderate',
        guidance:
          'General educational guidance: Upward leaf curling in chilli is commonly associated with thrips or mite feeding, or moisture stress. Inspect leaf undersides carefully, maintain regular field moisture, and consult your nearest Krishi Vigyan Kendra (KVK) or Horticulture Officer before applying any chemical spray.',
        expert_recommended: true,
        status: 'expert_referred',
        created_at: nowIso,
      },
    ],
    marketPrices: [
      {
        id: 'MKT-01',
        crop: 'Paddy (Sona Masoori)',
        market: 'Nizamabad Mandi',
        state: 'Telangana',
        price: 2380,
        unit: 'INR / Quintal',
        updated_at: nowIso,
        data_source: 'Demo Dataset (Agmarknet Reference Snapshot — Not Live Exchange Feed)',
      },
      {
        id: 'MKT-02',
        crop: 'Cotton (Kapas)',
        market: 'Warangal Enumamula Mandi',
        state: 'Telangana',
        price: 7150,
        unit: 'INR / Quintal',
        updated_at: nowIso,
        data_source: 'Demo Dataset (Agmarknet Reference Snapshot — Not Live Exchange Feed)',
      },
      {
        id: 'MKT-03',
        crop: 'Red Chilli (Teja)',
        market: 'Guntur Mirchi Yard',
        state: 'Andhra Pradesh',
        price: 16400,
        unit: 'INR / Quintal',
        updated_at: nowIso,
        data_source: 'Demo Dataset (Agmarknet Reference Snapshot — Not Live Exchange Feed)',
      },
      {
        id: 'MKT-04',
        crop: 'Wheat (Lokwan)',
        market: 'Indore Mandi',
        state: 'Madhya Pradesh',
        price: 2625,
        unit: 'INR / Quintal',
        updated_at: nowIso,
        data_source: 'Demo Dataset (Agmarknet Reference Snapshot — Not Live Exchange Feed)',
      },
      {
        id: 'MKT-05',
        crop: 'Onion (Red)',
        market: 'Lasalgaon APMC',
        state: 'Maharashtra',
        price: 2850,
        unit: 'INR / Quintal',
        updated_at: nowIso,
        data_source: 'Demo Dataset (Agmarknet Reference Snapshot — Not Live Exchange Feed)',
      },
      {
        id: 'MKT-06',
        crop: 'Maize (Hybrid)',
        market: 'Karimnagar Mandi',
        state: 'Telangana',
        price: 2210,
        unit: 'INR / Quintal',
        updated_at: nowIso,
        data_source: 'Demo Dataset (Agmarknet Reference Snapshot — Not Live Exchange Feed)',
      },
      {
        id: 'MKT-07',
        crop: 'Turmeric (Finger)',
        market: 'Nizamabad Mandi',
        state: 'Telangana',
        price: 13900,
        unit: 'INR / Quintal',
        updated_at: nowIso,
        data_source: 'Demo Dataset (Agmarknet Reference Snapshot — Not Live Exchange Feed)',
      },
      {
        id: 'MKT-08',
        crop: 'Tomato (Desi)',
        market: 'Madanapalle Market',
        state: 'Andhra Pradesh',
        price: 1950,
        unit: 'INR / Quintal',
        updated_at: nowIso,
        data_source: 'Demo Dataset (Agmarknet Reference Snapshot — Not Live Exchange Feed)',
      },
    ],
    voiceSessions: [],
    activityLogs: [
      {
        id: 'ACT-9001',
        timestamp: nowIso,
        action_type: 'expense_recorded',
        tool_name: 'add_farm_expense',
        summary: 'Seed purchase logged: ₹3,200 (Seeds — Sona Masoori nursery)',
        transaction_id: 'EXP-4012',
        status: 'success',
        latency_ms: 14,
        language: 'English',
      },
    ],
    voiceFirstByteLatenciesMs: [],
  };
}

function ensureDbFile(): PersistedSchema {
  const dbFile = getDbFilePath();
  const dir = path.dirname(dbFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(dbFile)) {
    const seed = createSeedDatabase();
    fs.writeFileSync(dbFile, JSON.stringify(seed, null, 2), 'utf8');
    return seed;
  }
  try {
    const raw = fs.readFileSync(dbFile, 'utf8');
    const parsed = JSON.parse(raw) as PersistedSchema;
    if (!parsed.farmer || !Array.isArray(parsed.expenses)) {
      throw new Error('Corrupt DB structure');
    }
    return parsed;
  } catch {
    const seed = createSeedDatabase();
    fs.writeFileSync(dbFile, JSON.stringify(seed, null, 2), 'utf8');
    return seed;
  }
}

export function readDb(): PersistedSchema {
  return ensureDbFile();
}

export function writeDb(data: PersistedSchema): void {
  const dbFile = getDbFilePath();
  const dir = path.dirname(dbFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tmpFile = `${dbFile}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpFile, dbFile);
}

export function generateId(prefix: string): string {
  const rand = Math.floor(1000 + Math.random() * 9000);
  const ts = Date.now().toString().slice(-4);
  return `${prefix}-${ts}${rand}`;
}

export function computeMetrics(db: PersistedSchema): PerformanceMetrics {
  const totalActions = db.activityLogs.length;
  const successful = db.activityLogs.filter((l) => l.status === 'success' || l.status === 'recovered').length;
  const latencies = db.activityLogs.map((l) => l.latency_ms).filter((n) => n > 0);
  const avgActionLatency =
    latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
  const lastActionLatency = db.activityLogs.length > 0 ? db.activityLogs[0].latency_ms : null;

  const vLat = db.voiceFirstByteLatenciesMs;
  const avgVoiceFirstByte =
    vLat.length > 0 ? Math.round(vLat.reduce((a, b) => a + b, 0) / vLat.length) : null;

  const interruptions = db.voiceSessions.reduce((acc, s) => acc + s.interruptions_handled, 0);
  const errorsRecovered = db.voiceSessions.reduce((acc, s) => acc + s.errors_recovered, 0);

  const languagesUsed: Record<string, number> = {};
  for (const log of db.activityLogs) {
    const lang = log.language || 'Unknown';
    languagesUsed[lang] = (languagesUsed[lang] || 0) + 1;
  }

  return {
    total_actions_executed: totalActions,
    successful_actions: successful,
    success_rate_percent: totalActions > 0 ? Math.round((successful / totalActions) * 100) : 100,
    avg_action_latency_ms: avgActionLatency,
    last_action_latency_ms: lastActionLatency,
    avg_voice_first_byte_ms: avgVoiceFirstByte,
    total_voice_sessions: db.voiceSessions.length,
    interruptions_handled: interruptions,
    errors_recovered: errorsRecovered,
    languages_used: languagesUsed,
  };
}

export function getPublicState(): AppDatabaseState {
  const db = readDb();
  return {
    farmer: db.farmer,
    expenses: db.expenses,
    reminders: db.reminders,
    cropReports: db.cropReports,
    marketPrices: db.marketPrices,
    voiceSessions: db.voiceSessions,
    activityLogs: db.activityLogs,
    metrics: computeMetrics(db),
  };
}

export function recordActivity(
  db: PersistedSchema,
  entry: Omit<ActivityLog, 'id' | 'timestamp'>
): ActivityLog {
  const item: ActivityLog = {
    id: generateId('ACT'),
    timestamp: new Date().toISOString(),
    ...entry,
  };
  db.activityLogs.unshift(item);
  if (db.activityLogs.length > 100) {
    db.activityLogs = db.activityLogs.slice(0, 100);
  }
  return item;
}

export function recordVoiceFirstByteLatency(latencyMs: number): void {
  if (latencyMs <= 0 || latencyMs > 30000) return;
  const db = readDb();
  db.voiceFirstByteLatenciesMs.push(Math.round(latencyMs));
  if (db.voiceFirstByteLatenciesMs.length > 50) {
    db.voiceFirstByteLatenciesMs = db.voiceFirstByteLatenciesMs.slice(-50);
  }
  writeDb(db);
}

export function startVoiceSession(language: string): VoiceSessionRecord {
  const db = readDb();
  const session: VoiceSessionRecord = {
    id: generateId('SES'),
    farmer_id: db.farmer.id,
    language,
    session_start: new Date().toISOString(),
    actions_completed: 0,
    avg_latency_ms: 0,
    interruptions_handled: 0,
    errors_recovered: 0,
  };
  db.voiceSessions.unshift(session);
  if (db.voiceSessions.length > 40) {
    db.voiceSessions = db.voiceSessions.slice(0, 40);
  }
  writeDb(db);
  return session;
}

export function updateVoiceSession(
  sessionId: string,
  patch: Partial<VoiceSessionRecord> & { incrementActions?: number; incrementInterruptions?: number; incrementErrorsRecovered?: number }
): void {
  const db = readDb();
  const target = db.voiceSessions.find((s) => s.id === sessionId);
  if (!target) return;
  if (patch.session_end) target.session_end = patch.session_end;
  if (patch.language) target.language = patch.language;
  if (typeof patch.avg_latency_ms === 'number') target.avg_latency_ms = patch.avg_latency_ms;
  if (patch.incrementActions) target.actions_completed += patch.incrementActions;
  if (patch.incrementInterruptions) target.interruptions_handled += patch.incrementInterruptions;
  if (patch.incrementErrorsRecovered) target.errors_recovered += patch.incrementErrorsRecovered;
  writeDb(db);
}
