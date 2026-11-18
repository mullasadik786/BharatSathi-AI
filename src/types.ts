export type SupportedLanguage = 'auto' | 'te' | 'hi' | 'en' | 'mixed';

export interface FarmerProfile {
  id: string;
  name: string;
  village: string;
  district: string;
  state: string;
  preferred_language: 'Telugu' | 'Hindi' | 'English' | 'Hinglish' | 'Telugu-English';
  crops: string[];
  farm_acres: number;
  consent_given: boolean;
  consent_timestamp?: string;
  updated_at: string;
}

export interface FarmExpense {
  id: string;
  farmer_id: string;
  amount: number;
  category: 'Fertilizer' | 'Seeds' | 'Labor' | 'Irrigation' | 'Pesticide' | 'Equipment' | 'Transport' | 'Other';
  date: string;
  description: string;
  created_at: string;
}

export interface IrrigationReminder {
  id: string;
  farmer_id: string;
  task: string;
  date: string;
  time: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface CropReport {
  id: string;
  farmer_id: string;
  crop: string;
  symptoms: string;
  date: string;
  location: string;
  severity: 'low' | 'moderate' | 'high';
  guidance: string;
  expert_recommended: boolean;
  status: 'recorded' | 'expert_referred' | 'resolved';
  created_at: string;
}

export interface MarketPrice {
  id: string;
  crop: string;
  market: string;
  state: string;
  price: number;
  unit: string;
  updated_at: string;
  data_source: string;
}

export interface VoiceSessionRecord {
  id: string;
  farmer_id: string;
  language: string;
  session_start: string;
  session_end?: string;
  actions_completed: number;
  avg_latency_ms: number;
  interruptions_handled: number;
  errors_recovered: number;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  action_type: string;
  tool_name: string;
  summary: string;
  transaction_id: string;
  status: 'success' | 'needs_confirmation' | 'error' | 'recovered';
  latency_ms: number;
  language: string;
}

export interface CycloneWatchAssessment {
  level: 'nominal' | 'wind_advisory' | 'storm_watch';
  label: string;
  barometric_note: string;
  official_verification_note: string;
}

export interface AgriculturalWeatherAdvisory {
  spraying_suitability: 'Good' | 'Caution' | 'Avoid';
  spraying_reason: string;
  evapotranspiration_today_mm: number;
  irrigation_guidance: string;
}

export interface WeatherData {
  location: string;
  resolved_name: string;
  latitude: number;
  longitude: number;
  temperature_c: number;
  apparent_temperature_c: number;
  humidity_percent: number;
  wind_speed_kmh: number;
  wind_gusts_kmh: number;
  surface_pressure_hpa: number;
  precipitation_mm: number;
  condition_label: string;
  cyclone_watch: CycloneWatchAssessment;
  agri_advisory: AgriculturalWeatherAdvisory;
  daily_forecast: Array<{
    date: string;
    temp_max_c: number;
    temp_min_c: number;
    rain_prob_percent: number;
    precip_mm: number;
    wind_max_kmh: number;
    wind_gust_max_kmh: number;
    uv_index_max: number;
    et0_mm: number;
  }>;
  preparedness_tips: string[];
  source: string;
  is_live_api: boolean;
  last_updated: string;
}

export interface PerformanceMetrics {
  total_actions_executed: number;
  successful_actions: number;
  success_rate_percent: number;
  avg_action_latency_ms: number;
  last_action_latency_ms: number | null;
  avg_voice_first_byte_ms: number | null;
  total_voice_sessions: number;
  interruptions_handled: number;
  errors_recovered: number;
  languages_used: Record<string, number>;
}

export interface SecurityPosture {
  server_side_api_key_isolation: boolean;
  http_security_headers_enabled: boolean;
  rate_limiting_enabled: boolean;
  input_sanitization_enabled: boolean;
  websocket_max_payload_bytes: number;
  destructive_action_confirmation_required: boolean;
  profile_update_permission_required: boolean;
  voice_consent_enforced: boolean;
}

export interface AppDatabaseState {
  farmer: FarmerProfile;
  expenses: FarmExpense[];
  reminders: IrrigationReminder[];
  cropReports: CropReport[];
  marketPrices: MarketPrice[];
  voiceSessions: VoiceSessionRecord[];
  activityLogs: ActivityLog[];
  metrics: PerformanceMetrics;
  securityPosture?: SecurityPosture;
}

export type VoiceConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'interrupted'
  | 'error';

export interface TranscriptEntry {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'system';
  text: string;
  timestamp: string;
  toolName?: string;
  transactionId?: string;
  latencyMs?: number;
  status?: 'success' | 'needs_confirmation' | 'error';
  interim?: boolean;
}
