import { FunctionDeclaration, Type } from '@google/genai';
import {
  generateId,
  getPublicState,
  readDb,
  recordActivity,
  writeDb,
} from './db.ts';
import { sanitizeText, validatePositiveAmount } from './security.ts';
import type {
  ActivityLog,
  AgriculturalWeatherAdvisory,
  CropReport,
  CycloneWatchAssessment,
  FarmExpense,
  IrrigationReminder,
  WeatherData,
} from '../src/types.ts';

const WEATHER_CODE_LABELS: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Slight snow',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

function normalizeDateInput(raw?: string): string {
  const today = new Date();
  if (!raw || !raw.trim()) return today.toISOString().slice(0, 10);
  const lower = raw.trim().toLowerCase();
  if (lower === 'today' || lower === 'aaj' || lower === 'ఈరోజు') {
    return today.toISOString().slice(0, 10);
  }
  if (lower === 'tomorrow' || lower === 'kal' || lower === 'రేపు') {
    const t = new Date(today);
    t.setDate(t.getDate() + 1);
    return t.toISOString().slice(0, 10);
  }
  if (lower === 'yesterday') {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    return y.toISOString().slice(0, 10);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) {
    return raw.trim();
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return today.toISOString().slice(0, 10);
}

function normalizeExpenseCategory(raw?: string): FarmExpense['category'] {
  const val = (raw || '').toLowerCase();
  if (val.includes('fert') || val.includes('urea') || val.includes('dap') || val.includes('खाद') || val.includes('ఎరువు')) {
    return 'Fertilizer';
  }
  if (val.includes('seed') || val.includes('बीज') || val.includes('విత్తన')) return 'Seeds';
  if (val.includes('labor') || val.includes('labour') || val.includes('worker') || val.includes('मजदूर') || val.includes('కూలీ')) {
    return 'Labor';
  }
  if (val.includes('irrig') || val.includes('water') || val.includes('motor') || val.includes('drip') || val.includes('సింఛాయి') || val.includes('నీళ్లు')) {
    return 'Irrigation';
  }
  if (val.includes('pest') || val.includes('spray') || val.includes('insect') || val.includes('कीटनाशक') || val.includes('పురుగు')) {
    return 'Pesticide';
  }
  if (val.includes('equip') || val.includes('tractor') || val.includes('tool')) return 'Equipment';
  if (val.includes('transp') || val.includes('diesel') || val.includes('mandi')) return 'Transport';
  return 'Other';
}

function assessCycloneAndWind(
  pressureHpa: number,
  windSpeedKmh: number,
  windGustsKmh: number,
  maxDailyRainMm: number
): CycloneWatchAssessment {
  const officialNote =
    'Official cyclone tracks, storm naming, and Red/Orange warnings must always be verified directly on IMD Mausam (mausam.imd.gov.in) and NDMA Sachet (sachet.ndma.gov.in).';

  if (pressureHpa <= 1000 || windSpeedKmh >= 45 || windGustsKmh >= 62 || maxDailyRainMm >= 65) {
    return {
      level: 'storm_watch',
      label: 'Elevated Storm / Squall Watch (Verify IMD Alert)',
      barometric_note: `Observed surface pressure ${pressureHpa} hPa with gusts up to ${windGustsKmh} km/h. Monitor coastal/district advisories immediately.`,
      official_verification_note: officialNote,
    };
  }
  if (pressureHpa <= 1006 || windSpeedKmh >= 28 || windGustsKmh >= 42 || maxDailyRainMm >= 25) {
    return {
      level: 'wind_advisory',
      label: 'Moderate Wind / Heavy Rain Advisory',
      barometric_note: `Surface pressure ${pressureHpa} hPa, gusts ${windGustsKmh} km/h. Secure nursery shade nets and check field drainage.`,
      official_verification_note: officialNote,
    };
  }
  return {
    level: 'nominal',
    label: 'Nominal Atmospheric Pressure (No Local Storm-Force Winds)',
    barometric_note: `Observed surface pressure ${pressureHpa} hPa, sustained winds ${windSpeedKmh} km/h (gusts ${windGustsKmh} km/h).`,
    official_verification_note: officialNote,
  };
}

function buildAgriAdvisory(
  windSpeedKmh: number,
  windGustsKmh: number,
  currentPrecipMm: number,
  todayRainProb: number,
  et0TodayMm: number
): AgriculturalWeatherAdvisory {
  let sprayingSuitability: AgriculturalWeatherAdvisory['spraying_suitability'] = 'Good';
  let sprayingReason = 'Calm winds and low immediate rain wash-off risk.';

  if (currentPrecipMm > 0.2 || todayRainProb >= 60 || windGustsKmh >= 24) {
    sprayingSuitability = 'Avoid';
    sprayingReason =
      currentPrecipMm > 0.2 || todayRainProb >= 60
        ? 'High rainfall wash-off risk — delay foliar or pesticide spraying.'
        : 'High wind gusts increase chemical drift risk — avoid spraying.';
  } else if (windSpeedKmh >= 14 || todayRainProb >= 35) {
    sprayingSuitability = 'Caution';
    sprayingReason = 'Moderate breeze or scattered cloud cover — spray only during calm early morning hours.';
  }

  let irrigationGuidance = `Today's FAO reference evapotranspiration (ET₀) is ${et0TodayMm.toFixed(1)} mm/day. `;
  if (todayRainProb >= 55) {
    irrigationGuidance += 'Hold routine irrigation and inspect field drainage bunds to avoid waterlogging.';
  } else if (et0TodayMm >= 5.0) {
    irrigationGuidance += 'High crop water demand — schedule drip or early-morning irrigation (05:30–08:30).';
  } else {
    irrigationGuidance += 'Moderate crop water demand — maintain normal soil moisture monitoring.';
  }

  return {
    spraying_suitability: sprayingSuitability,
    spraying_reason: sprayingReason,
    evapotranspiration_today_mm: Number(et0TodayMm.toFixed(1)),
    irrigation_guidance: irrigationGuidance,
  };
}

export async function fetchLiveWeather(locationQuery: string): Promise<WeatherData> {
  const query = sanitizeText(locationQuery || 'Hyderabad, Telangana', 120) || 'Hyderabad, Telangana';
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    query
  )}&count=3&language=en&format=json`;

  const geoRes = await fetch(geoUrl);
  if (!geoRes.ok) {
    throw new Error(`Weather geocoding failed with status ${geoRes.status}`);
  }
  const geoJson = (await geoRes.json()) as {
    results?: Array<{
      name: string;
      admin1?: string;
      country?: string;
      latitude: number;
      longitude: number;
    }>;
  };

  let target =
    geoJson.results?.find((r) => r.country === 'India') ?? geoJson.results?.[0];

  if (!target && query.includes(',')) {
    const cityOnly = query.split(',')[0].trim();
    const retryRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        cityOnly
      )}&count=3&language=en&format=json`
    );
    if (retryRes.ok) {
      const retryJson = (await retryRes.json()) as typeof geoJson;
      target =
        retryJson.results?.find((r) => r.country === 'India') ??
        retryJson.results?.[0];
    }
  }

  if (!target) {
    throw new Error(`Could not resolve geographic coordinates for "${query}".`);
  }

  const forecastUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${target.latitude}&longitude=${target.longitude}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,surface_pressure` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,wind_gusts_10m_max,uv_index_max,et0_fao_evapotranspiration` +
    `&timezone=auto&forecast_days=7`;

  const weatherRes = await fetch(forecastUrl);
  if (!weatherRes.ok) {
    throw new Error(`Open-Meteo forecast failed with status ${weatherRes.status}`);
  }

  const w = (await weatherRes.json()) as {
    current: {
      time: string;
      temperature_2m: number;
      relative_humidity_2m: number;
      apparent_temperature: number;
      precipitation: number;
      weather_code: number;
      wind_speed_10m: number;
      wind_gusts_10m: number;
      surface_pressure: number;
    };
    daily: {
      time: string[];
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      precipitation_probability_max: number[];
      precipitation_sum: number[];
      wind_speed_10m_max: number[];
      wind_gusts_10m_max: number[];
      uv_index_max: number[];
      et0_fao_evapotranspiration: number[];
    };
  };

  const dailyForecast = w.daily.time.map((date, idx) => ({
    date,
    temp_max_c: w.daily.temperature_2m_max[idx] ?? 0,
    temp_min_c: w.daily.temperature_2m_min[idx] ?? 0,
    rain_prob_percent: w.daily.precipitation_probability_max[idx] ?? 0,
    precip_mm: w.daily.precipitation_sum[idx] ?? 0,
    wind_max_kmh: w.daily.wind_speed_10m_max[idx] ?? 0,
    wind_gust_max_kmh: w.daily.wind_gusts_10m_max[idx] ?? 0,
    uv_index_max: w.daily.uv_index_max[idx] ?? 0,
    et0_mm: w.daily.et0_fao_evapotranspiration[idx] ?? 0,
  }));

  const maxDailyRainMm = Math.max(0, ...dailyForecast.map((d) => d.precip_mm));
  const cycloneWatch = assessCycloneAndWind(
    w.current.surface_pressure ?? 1013,
    w.current.wind_speed_10m ?? 0,
    w.current.wind_gusts_10m ?? 0,
    maxDailyRainMm
  );

  const agriAdvisory = buildAgriAdvisory(
    w.current.wind_speed_10m ?? 0,
    w.current.wind_gusts_10m ?? 0,
    w.current.precipitation ?? 0,
    dailyForecast[0]?.rain_prob_percent ?? 0,
    dailyForecast[0]?.et0_mm ?? 3.5
  );

  const tips: string[] = [];
  const nextRainProb = dailyForecast[0]?.rain_prob_percent ?? 0;
  const tomorrowRainProb = dailyForecast[1]?.rain_prob_percent ?? 0;
  if (nextRainProb >= 50 || tomorrowRainProb >= 50 || w.current.precipitation > 0) {
    tips.push('Rain probability is elevated — clear field drainage channels and delay foliar spraying.');
  } else {
    tips.push('Low near-term rainfall — early morning (05:30–08:30) irrigation minimizes evaporation loss.');
  }
  if (w.current.temperature_2m >= 35 || w.current.apparent_temperature >= 38) {
    tips.push('High heat-index advisory — avoid peak afternoon fieldwork (12:00–15:30) and hydrate livestock.');
  }
  if ((w.current.wind_gusts_10m ?? 0) >= 30) {
    tips.push('Strong wind gusts observed — anchor polyhouse/shade nets and support tall banana or sugarcane crops.');
  }

  const resolvedName = [target.name, target.admin1, target.country]
    .filter(Boolean)
    .join(', ');

  return {
    location: query,
    resolved_name: resolvedName,
    latitude: target.latitude,
    longitude: target.longitude,
    temperature_c: w.current.temperature_2m,
    apparent_temperature_c: w.current.apparent_temperature,
    humidity_percent: w.current.relative_humidity_2m,
    wind_speed_kmh: w.current.wind_speed_10m,
    wind_gusts_kmh: w.current.wind_gusts_10m ?? w.current.wind_speed_10m,
    surface_pressure_hpa: w.current.surface_pressure ?? 1013,
    precipitation_mm: w.current.precipitation,
    condition_label: WEATHER_CODE_LABELS[w.current.weather_code] ?? 'Clear to partly cloudy',
    cyclone_watch: cycloneWatch,
    agri_advisory: agriAdvisory,
    daily_forecast: dailyForecast,
    preparedness_tips: tips,
    source: 'Open-Meteo Live Weather & Geocoding API (open-meteo.com)',
    is_live_api: true,
    last_updated: new Date().toISOString(),
  };
}

export function buildDisasterPreparednessPlaybook(hazardType: string, weather?: WeatherData | null) {
  const hazard = sanitizeText(hazardType || 'cyclone', 40).toLowerCase();

  const helplines = [
    { name: 'National Emergency Response', number: '112' },
    { name: 'State Disaster Helpline (AP / Telangana)', number: '1070' },
    { name: 'District Emergency Control Room', number: '1077' },
    { name: 'Emergency Ambulance & Medical', number: '108' },
    { name: 'Kisan Call Centre (Agri Relief & Advice)', number: '1800-180-1551' },
  ];

  const officialSources = [
    { name: 'India Meteorological Department (IMD) Cyclones & Warnings', url: 'https://mausam.imd.gov.in' },
    { name: 'NDMA Sachet Common Alerting Protocol (CAP)', url: 'https://sachet.ndma.gov.in' },
    { name: 'INCOIS Coastal Storm Surge & Ocean Advisories', url: 'https://incois.gov.in' },
    { name: 'National Disaster Management Authority (NDMA)', url: 'https://ndma.gov.in' },
  ];

  const checklists = {
    cyclone_and_storm: [
      'Before Storm: Harvest mature standing crops if safe; move harvested grain and fertilizer bags to raised, waterproof storage.',
      'Farm & Livestock: Untie cattle from fragile sheds and move livestock to elevated, sturdy community shelters; turn off agricultural borewell mains.',
      'Household Go-Bag: Pack waterproof pouch with Aadhaar/land passbooks, 72h drinking water, dry rations, torch, power bank, and first-aid medicines.',
      'Evacuation & Aftermath: Follow official Panchayat/NDMA shelter orders immediately; stay away from fallen power lines and flooded culverts.',
    ],
    flood_and_heavy_rain: [
      'Clear field bund outlets and farm drainage trenches before heavy rain bands arrive.',
      'Elevate electrical pump starters and diesel engines onto brick/concrete plinths above water lines.',
      'Boil or chlorinate drinking water after floodwater recession and inspect livestock fodder for mold.',
    ],
    heatwave_and_drought: [
      'Shift all manual farm labor and school outdoor activities to 05:30–10:30 AM or after 4:30 PM.',
      'Apply crop residue mulching around roots to retain soil moisture and lower root-zone heat.',
      'Keep ORS sachets, cool water, and shaded rest areas accessible for workers and elderly family members.',
    ],
  };

  return {
    hazard_focus: hazard,
    live_weather_summary: weather
      ? {
          location: weather.resolved_name,
          surface_pressure_hpa: weather.surface_pressure_hpa,
          wind_speed_kmh: weather.wind_speed_kmh,
          wind_gusts_kmh: weather.wind_gusts_kmh,
          cyclone_watch: weather.cyclone_watch,
          last_updated: weather.last_updated,
        }
      : null,
    checklists,
    helplines,
    official_sources: officialSources,
    uncertainty_disclaimer:
      'BharatSathi AI never fabricates cyclone landfall tracks or official warnings. Use Open-Meteo barometric/wind telemetry for local awareness and verify official IMD/NDMA cyclone bulletins before acting.',
  };
}

export const bharatsathiFunctionDeclarations: FunctionDeclaration[] = [
  {
    name: 'add_farm_expense',
    description:
      'Add a validated farm expense record (amount in INR, category, date, description) into the persistent database.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        amount: {
          type: Type.NUMBER,
          description: 'Expense amount in Indian Rupees (INR). Must be greater than 0.',
        },
        category: {
          type: Type.STRING,
          description:
            'Expense category: Fertilizer, Seeds, Labor, Irrigation, Pesticide, Equipment, Transport, or Other.',
        },
        date: {
          type: Type.STRING,
          description: 'Date in YYYY-MM-DD format, or "today" / "yesterday". Defaults to today.',
        },
        description: {
          type: Type.STRING,
          description: 'Short clear description of what was purchased or paid for.',
        },
      },
      required: ['amount', 'category'],
    },
  },
  {
    name: 'get_farm_expenses',
    description:
      'Retrieve recorded farm expenses from the database, optionally filtered by category or period, and calculate the exact total amount in INR.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        category: {
          type: Type.STRING,
          description: 'Optional category filter (Fertilizer, Seeds, Labor, Irrigation, etc.).',
        },
        period: {
          type: Type.STRING,
          description: 'Optional period filter: "today", "this_month", or "all".',
        },
      },
    },
  },
  {
    name: 'create_irrigation_reminder',
    description:
      'Create a new irrigation or farm task reminder in the database. Ask the farmer for a preferred time if they did not provide one.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        task: {
          type: Type.STRING,
          description: 'The irrigation or field task description.',
        },
        date: {
          type: Type.STRING,
          description: 'Date in YYYY-MM-DD format (or "today" / "tomorrow").',
        },
        time: {
          type: Type.STRING,
          description: 'Scheduled time in HH:MM (24-hour) or clear time phrase like "06:30" or "07:00 AM".',
        },
      },
      required: ['task', 'date', 'time'],
    },
  },
  {
    name: 'update_irrigation_reminder',
    description:
      'Update an existing irrigation reminder task, date, time, or mark its status as completed.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        reminder_id: {
          type: Type.STRING,
          description: 'ID of the reminder (e.g., REM-2001). Optional if matching the most recent upcoming reminder.',
        },
        task: { type: Type.STRING, description: 'Updated task text.' },
        date: { type: Type.STRING, description: 'Updated date.' },
        time: { type: Type.STRING, description: 'Updated time.' },
        status: {
          type: Type.STRING,
          description: 'New status: "upcoming" or "completed".',
        },
      },
    },
  },
  {
    name: 'cancel_irrigation_reminder',
    description:
      'Cancel an irrigation reminder. Requires explicit user confirmation (confirmed=true) before cancelling.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        reminder_id: {
          type: Type.STRING,
          description: 'Reminder ID to cancel (e.g., REM-2001).',
        },
        confirmed: {
          type: Type.BOOLEAN,
          description: 'Must be true only after the farmer explicitly confirms cancelling this reminder.',
        },
      },
      required: ['confirmed'],
    },
  },
  {
    name: 'get_irrigation_reminders',
    description: 'Retrieve upcoming or completed irrigation tasks from the database.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        status: {
          type: Type.STRING,
          description: 'Filter by "upcoming", "completed", "cancelled", or "all".',
        },
      },
    },
  },
  {
    name: 'record_crop_issue',
    description:
      'Record a crop problem or pest/disease symptom in the database and return general educational preparedness guidance plus expert KVK referral.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        crop: { type: Type.STRING, description: 'Name of the crop (e.g., Paddy, Cotton, Chilli).' },
        symptoms: { type: Type.STRING, description: 'Observed symptoms on leaves, stems, roots, or yield.' },
        location: { type: Type.STRING, description: 'Field block or village location.' },
        severity: {
          type: Type.STRING,
          description: 'Estimated severity: "low", "moderate", or "high".',
        },
      },
      required: ['crop', 'symptoms'],
    },
  },
  {
    name: 'get_crop_issues',
    description: 'Retrieve recorded crop problem reports from the database.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'get_weather_info',
    description:
      'Fetch real-time 7-day agricultural weather, evapotranspiration (ET0), spraying suitability, barometric pressure, and wind gusts from Open-Meteo API.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        location: {
          type: Type.STRING,
          description: 'City, town, or district name (e.g., "Guntur", "Visakhapatnam", "Shamirpet", "Indore").',
        },
      },
    },
  },
  {
    name: 'get_cyclone_and_disaster_guidance',
    description:
      'Fetch live barometric/wind disturbance indicators for a location and return verified cyclone, flood, heatwave disaster management checklists and official Indian emergency helplines (112, 1070, 1077, 108, 1800-180-1551) plus IMD/NDMA links.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        location: {
          type: Type.STRING,
          description: 'Coastal or inland district/town (e.g., "Visakhapatnam, Andhra Pradesh", "Kakinada", "Guntur").',
        },
        hazard_type: {
          type: Type.STRING,
          description: 'Hazard focus: "cyclone", "flood", "heatwave", or "all".',
        },
      },
    },
  },
  {
    name: 'get_market_prices',
    description:
      'Search mandi market prices from the BharatSathi Demo Dataset by crop name and/or market name.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        crop: { type: Type.STRING, description: 'Crop name to search (e.g., Paddy, Cotton, Chilli, Wheat, Onion).' },
        market: { type: Type.STRING, description: 'Mandi / market name (e.g., Nizamabad, Guntur, Warangal).' },
      },
    },
  },
  {
    name: 'get_farmer_profile',
    description: 'Retrieve the registered farmer profile including name, village, preferred language, and crops.',
    parameters: {
      type: Type.OBJECT,
      properties: {},
    },
  },
  {
    name: 'register_or_update_farmer_profile',
    description:
      'Register or update the farmer profile (name, village, district, state, preferred_language, crops). Requires user_confirmed_permission=true.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: 'Farmer full name.' },
        village: { type: Type.STRING, description: 'Village name.' },
        district: { type: Type.STRING, description: 'District name.' },
        state: { type: Type.STRING, description: 'State name.' },
        preferred_language: {
          type: Type.STRING,
          description: 'Preferred language: Telugu, Hindi, English, Hinglish, or Telugu-English.',
        },
        farm_acres: { type: Type.NUMBER, description: 'Farm size in acres.' },
        user_confirmed_permission: {
          type: Type.BOOLEAN,
          description: 'Must be true after obtaining explicit permission from the user to update profile.',
        },
      },
      required: ['user_confirmed_permission'],
    },
  },
];

export interface ToolExecutionOutcome {
  result: Record<string, unknown>;
  activityLog: ActivityLog;
  latencyMs: number;
}

export async function executeAgentTool(
  toolName: string,
  args: Record<string, unknown> = {},
  spokenLanguageLabel = 'Multilingual'
): Promise<ToolExecutionOutcome> {
  const start = performance.now();
  const db = readDb();

  try {
    let result: Record<string, unknown> = {};
    let actionType = toolName;
    let summary = '';
    let transactionId = generateId('TXN');
    let status: ActivityLog['status'] = 'success';

    switch (toolName) {
      case 'add_farm_expense': {
        const amountCheck = validatePositiveAmount(args.amount);
        if (!amountCheck.ok) {
          status = 'error';
          result = {
            success: false,
            error: amountCheck.error,
          };
          summary = 'Expense validation failed: invalid or out-of-range amount';
          break;
        }
        const category = normalizeExpenseCategory(sanitizeText(args.category, 60) || 'Other');
        const date = normalizeDateInput(args.date ? sanitizeText(args.date, 30) : undefined);
        const description =
          sanitizeText(args.description, 240) || `${category} expense logged via BharatSathi Voice`;

        const newExpense: FarmExpense = {
          id: generateId('EXP'),
          farmer_id: db.farmer.id,
          amount: amountCheck.amount,
          category,
          date,
          description,
          created_at: new Date().toISOString(),
        };
        db.expenses.unshift(newExpense);
        transactionId = newExpense.id;
        actionType = 'expense_recorded';
        const newTotal = db.expenses.reduce((acc, e) => acc + e.amount, 0);
        summary = `Added ₹${newExpense.amount.toLocaleString('en-IN')} (${category}) on ${date}`;
        result = {
          success: true,
          expense: newExpense,
          updated_total_expenses_inr: newTotal,
        };
        break;
      }

      case 'get_farm_expenses': {
        const categoryFilter = args.category ? normalizeExpenseCategory(sanitizeText(args.category, 60)) : null;
        const period = sanitizeText(args.period || 'all', 30).toLowerCase();
        const now = new Date();
        const currentMonthPrefix = now.toISOString().slice(0, 7);
        const todayStr = now.toISOString().slice(0, 10);

        const filtered = db.expenses.filter((e) => {
          if (categoryFilter && e.category !== categoryFilter) return false;
          if (period === 'today' && e.date !== todayStr) return false;
          if ((period === 'this_month' || period === 'month') && !e.date.startsWith(currentMonthPrefix)) {
            return false;
          }
          return true;
        });

        const totalInr = filtered.reduce((acc, e) => acc + e.amount, 0);
        const byCategory: Record<string, number> = {};
        for (const item of filtered) {
          byCategory[item.category] = (byCategory[item.category] || 0) + item.amount;
        }
        actionType = 'expenses_queried';
        summary = `Queried ${filtered.length} expense records (Total: ₹${totalInr.toLocaleString('en-IN')})`;
        result = {
          success: true,
          count: filtered.length,
          total_inr: totalInr,
          category_breakdown: byCategory,
          recent_expenses: filtered.slice(0, 8),
        };
        break;
      }

      case 'create_irrigation_reminder': {
        const task = sanitizeText(args.task, 240);
        const rawTime = sanitizeText(args.time, 40);
        if (!task) {
          status = 'error';
          result = { success: false, error: 'Task description is required.' };
          summary = 'Irrigation reminder failed: missing task';
          break;
        }
        if (!rawTime) {
          status = 'needs_confirmation';
          result = {
            success: false,
            missing_field: 'time',
            message: 'Time was not specified. Ask the farmer what time they want the irrigation reminder.',
          };
          summary = 'Asked farmer for preferred irrigation reminder time';
          break;
        }
        const date = normalizeDateInput(args.date ? sanitizeText(args.date, 30) : 'tomorrow');
        const reminder: IrrigationReminder = {
          id: generateId('REM'),
          farmer_id: db.farmer.id,
          task,
          date,
          time: rawTime,
          status: 'upcoming',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        db.reminders.unshift(reminder);
        transactionId = reminder.id;
        actionType = 'reminder_created';
        summary = `Scheduled irrigation task "${task}" for ${date} at ${rawTime}`;
        result = { success: true, reminder };
        break;
      }

      case 'update_irrigation_reminder': {
        const targetId = sanitizeText(args.reminder_id, 40);
        const target =
          db.reminders.find((r) => r.id === targetId) ??
          db.reminders.find((r) => r.status === 'upcoming');
        if (!target) {
          status = 'error';
          result = { success: false, error: 'No matching irrigation reminder found to update.' };
          summary = 'Reminder update failed: no matching reminder';
          break;
        }
        if (args.task) target.task = sanitizeText(args.task, 240);
        if (args.date) target.date = normalizeDateInput(sanitizeText(args.date, 30));
        if (args.time) target.time = sanitizeText(args.time, 40);
        if (args.status === 'completed' || args.status === 'upcoming') {
          target.status = args.status;
        }
        target.updated_at = new Date().toISOString();
        transactionId = target.id;
        actionType = 'reminder_updated';
        summary = `Updated reminder ${target.id} (${target.status}): ${target.task}`;
        result = { success: true, reminder: target };
        break;
      }

      case 'cancel_irrigation_reminder': {
        const confirmed = Boolean(args.confirmed);
        const targetId = sanitizeText(args.reminder_id, 40);
        const target =
          db.reminders.find((r) => r.id === targetId && r.status === 'upcoming') ??
          db.reminders.find((r) => r.status === 'upcoming');

        if (!target) {
          status = 'error';
          result = { success: false, error: 'No upcoming reminder found to cancel.' };
          summary = 'Cancel reminder failed: none found';
          break;
        }
        if (!confirmed) {
          status = 'needs_confirmation';
          transactionId = target.id;
          summary = `Awaiting confirmation to cancel reminder ${target.id}`;
          result = {
            success: false,
            needs_confirmation: true,
            reminder: target,
            message: `Please ask the farmer to confirm cancelling reminder "${target.task}" on ${target.date} at ${target.time}.`,
          };
          break;
        }
        target.status = 'cancelled';
        target.updated_at = new Date().toISOString();
        transactionId = target.id;
        actionType = 'reminder_cancelled';
        summary = `Cancelled reminder ${target.id}: ${target.task}`;
        result = { success: true, reminder: target };
        break;
      }

      case 'get_irrigation_reminders': {
        const statusFilter = sanitizeText(args.status || 'upcoming', 30).toLowerCase();
        const list =
          statusFilter === 'all'
            ? db.reminders
            : db.reminders.filter((r) => r.status === statusFilter);
        actionType = 'reminders_queried';
        summary = `Retrieved ${list.length} (${statusFilter}) irrigation reminders`;
        result = { success: true, count: list.length, reminders: list };
        break;
      }

      case 'record_crop_issue': {
        const crop = sanitizeText(args.crop, 80);
        const symptoms = sanitizeText(args.symptoms, 300);
        if (!crop || !symptoms) {
          status = 'error';
          result = { success: false, error: 'Both crop name and symptoms are required.' };
          summary = 'Crop issue validation failed: missing crop or symptoms';
          break;
        }
        const severityRaw = sanitizeText(args.severity || 'moderate', 20).toLowerCase();
        const severity: CropReport['severity'] =
          severityRaw === 'high' || severityRaw === 'severe'
            ? 'high'
            : severityRaw === 'low' || severityRaw === 'mild'
              ? 'low'
              : 'moderate';

        const location = sanitizeText(args.location, 120) || `${db.farmer.village}, ${db.farmer.district}`;
        const guidance =
          `AI Educational Guidance (Not a certified diagnosis): Document affected leaf/stem photos, avoid over-irrigation, and isolate severely affected plants if possible. ` +
          (severity === 'high'
            ? 'Because severity is high, immediately consult a qualified Agricultural Officer at your nearest Krishi Vigyan Kendra (KVK) before applying pesticides.'
            : 'Monitor spread over 24–48 hours and consult your local Krishi Vigyan Kendra (KVK) agronomist for verified treatment advice.');

        const report: CropReport = {
          id: generateId('CRP'),
          farmer_id: db.farmer.id,
          crop,
          symptoms,
          date: normalizeDateInput(),
          location,
          severity,
          guidance,
          expert_recommended: true,
          status: severity === 'high' ? 'expert_referred' : 'recorded',
          created_at: new Date().toISOString(),
        };
        db.cropReports.unshift(report);
        transactionId = report.id;
        actionType = 'crop_issue_recorded';
        summary = `Logged ${severity} crop issue for ${crop}: ${symptoms}`;
        result = {
          success: true,
          report,
          disclaimer: 'General educational guidance only; verify serious crop issues with a qualified agricultural expert.',
        };
        break;
      }

      case 'get_crop_issues': {
        actionType = 'crop_issues_queried';
        summary = `Retrieved ${db.cropReports.length} crop issue reports`;
        result = { success: true, count: db.cropReports.length, reports: db.cropReports };
        break;
      }

      case 'get_weather_info': {
        const location = sanitizeText(args.location, 120) || `${db.farmer.district}, ${db.farmer.state}`;
        const weather = await fetchLiveWeather(location);
        actionType = 'weather_checked';
        summary = `Fetched live 7-day agri weather for ${weather.resolved_name}: ${weather.temperature_c}°C, ${weather.surface_pressure_hpa} hPa`;
        result = { success: true, weather };
        break;
      }

      case 'get_cyclone_and_disaster_guidance': {
        const location = sanitizeText(args.location, 120) || `${db.farmer.district}, ${db.farmer.state}`;
        const hazardType = sanitizeText(args.hazard_type || 'cyclone', 40);
        let weather: WeatherData | null = null;
        try {
          weather = await fetchLiveWeather(location);
        } catch {
          weather = null;
        }
        const playbook = buildDisasterPreparednessPlaybook(hazardType, weather);
        actionType = 'disaster_guidance_checked';
        summary = `Retrieved cyclone & disaster preparedness guidance for ${weather?.resolved_name || location}`;
        result = { success: true, ...playbook };
        break;
      }

      case 'get_market_prices': {
        const cropQuery = sanitizeText(args.crop, 80).toLowerCase();
        const marketQuery = sanitizeText(args.market, 80).toLowerCase();
        const matches = db.marketPrices.filter((m) => {
          const cropOk = !cropQuery || m.crop.toLowerCase().includes(cropQuery);
          const mktOk =
            !marketQuery ||
            m.market.toLowerCase().includes(marketQuery) ||
            m.state.toLowerCase().includes(marketQuery);
          return cropOk && mktOk;
        });
        actionType = 'market_prices_checked';
        summary = `Checked mandi prices (${matches.length} matches, Demo Dataset)`;
        result = {
          success: true,
          count: matches.length,
          data_notice: 'Demo Dataset (Agmarknet Reference Snapshot) — clearly labeled non-live reference prices.',
          prices: matches.length > 0 ? matches : db.marketPrices.slice(0, 4),
        };
        break;
      }

      case 'get_farmer_profile': {
        actionType = 'profile_retrieved';
        summary = `Retrieved profile for ${db.farmer.name} (${db.farmer.village})`;
        result = { success: true, farmer: db.farmer };
        break;
      }

      case 'register_or_update_farmer_profile': {
        const permitted = Boolean(args.user_confirmed_permission);
        if (!permitted) {
          status = 'needs_confirmation';
          summary = 'Awaiting user permission to update farmer profile';
          result = {
            success: false,
            needs_confirmation: true,
            message: 'Ask the farmer for explicit permission before saving profile updates.',
          };
          break;
        }
        if (args.name) db.farmer.name = sanitizeText(args.name, 100);
        if (args.village) db.farmer.village = sanitizeText(args.village, 100);
        if (args.district) db.farmer.district = sanitizeText(args.district, 100);
        if (args.state) db.farmer.state = sanitizeText(args.state, 100);
        if (args.preferred_language) {
          db.farmer.preferred_language = sanitizeText(args.preferred_language, 40) as typeof db.farmer.preferred_language;
        }
        if (typeof args.farm_acres === 'number' && Number.isFinite(args.farm_acres) && args.farm_acres > 0 && args.farm_acres <= 5000) {
          db.farmer.farm_acres = args.farm_acres;
        }
        db.farmer.updated_at = new Date().toISOString();
        transactionId = db.farmer.id;
        actionType = 'profile_updated';
        summary = `Updated profile for ${db.farmer.name} (${db.farmer.village})`;
        result = { success: true, farmer: db.farmer };
        break;
      }

      default: {
        status = 'error';
        result = { success: false, error: `Unknown tool: ${toolName}` };
        summary = `Unknown tool invoked: ${toolName}`;
      }
    }

    const latencyMs = Math.max(1, Math.round(performance.now() - start));
    const activityLog = recordActivity(db, {
      action_type: actionType,
      tool_name: toolName,
      summary,
      transaction_id: transactionId,
      status,
      latency_ms: latencyMs,
      language: spokenLanguageLabel,
    });
    writeDb(db);

    return { result, activityLog, latencyMs };
  } catch (err) {
    const latencyMs = Math.max(1, Math.round(performance.now() - start));
    const msg = err instanceof Error ? err.message : 'Tool execution error';
    const activityLog = recordActivity(db, {
      action_type: 'tool_error',
      tool_name: toolName,
      summary: `Error in ${toolName}: ${msg}`,
      transaction_id: generateId('ERR'),
      status: 'error',
      latency_ms: latencyMs,
      language: spokenLanguageLabel,
    });
    writeDb(db);
    return {
      result: { success: false, error: msg },
      activityLog,
      latencyMs,
    };
  }
}

export function getFullStateSnapshot() {
  return getPublicState();
}
