import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Bug,
  CalendarClock,
  CheckCircle2,
  CloudSun,
  FileText,
  Hand,
  IndianRupee,
  Mic,
  MicOff,
  Play,
  Radio,
  Send,
  ShieldCheck,
  Square,
  Store,
  Trash2,
  Volume2,
  Wind,
} from 'lucide-react';
import type {
  FarmerProfile,
  SupportedLanguage,
  TranscriptEntry,
  VoiceConnectionStatus,
} from '../types.ts';

interface VoiceAssistantPanelProps {
  farmer: FarmerProfile;
  status: VoiceConnectionStatus;
  errorMessage: string | null;
  transcript: TranscriptEntry[];
  micLevel: number;
  speakerLevel: number;
  lastLatencyMs: number | null;
  language: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  noiseFilterEnabled: boolean;
  onToggleNoiseFilter: () => void;
  isMicMuted: boolean;
  onToggleMute: () => void;
  onGrantConsent: (consent: boolean) => Promise<void>;
  onStartVoice: () => Promise<void>;
  onStopVoice: () => void;
  onInterrupt: () => void;
  onSendPrompt: (text: string, label?: string) => Promise<void>;
  onClearTranscript: () => void;
  onQuickAction: (action: 'expense' | 'reminder' | 'crop' | 'weather' | 'market' | 'records') => void;
}

const DEMO_SCENARIOS = [
  {
    id: 'demo-te',
    title: 'Demo 1 · Telugu Irrigation',
    langLabel: 'Telugu',
    prompt: 'నా పొలానికి రేపు ఉదయం 6 గంటలకు నీళ్లు పెట్టాలి. రిమైండర్ సెట్ చేయి.',
    note: 'Tests Telugu speech understanding, date/time extraction & reminder creation.',
  },
  {
    id: 'demo-hi',
    title: 'Demo 2 · Hindi Expense',
    langLabel: 'Hindi',
    prompt: 'आज मैंने खाद पर 2500 रुपये खर्च किए। इसे मेरे रिकॉर्ड में जोड़ दो।',
    note: 'Extracts ₹2,500 Fertilizer expense in Hindi and saves to DB.',
  },
  {
    id: 'demo-en',
    title: 'Demo 3 · English Total Query',
    langLabel: 'English',
    prompt: 'Show me my total farm expenses this month.',
    note: 'Queries database ledger and speaks the real calculated INR total.',
  },
  {
    id: 'demo-mix',
    title: 'Demo 4 · Code-Switched (Te+En)',
    langLabel: 'Code-Switched',
    prompt: 'Naku tomorrow Shamirpet weather check chesi irrigation reminder set cheyyi morning 7 AM ki.',
    note: 'Fetches live Open-Meteo weather + schedules irrigation in one mixed command.',
  },
  {
    id: 'demo-int',
    title: 'Demo 5 · Mid-Sentence Interrupt',
    langLabel: 'Interruption',
    prompt: 'Tell me a detailed summary of all my farm expenses and crop reports...',
    interruptFollowUp: 'Actually, stop that and add 1500 rupees fertilizer expense for today.',
    note: 'Demonstrates mid-turn interruption handling and immediate intent switching.',
  },
];

const STATUS_META: Record<
  VoiceConnectionStatus,
  { label: string; toneClass: string; isLive: boolean }
> = {
  disconnected: { label: 'Ready · Standby', toneClass: 'text-slate-600 bg-slate-100 border-slate-200', isLive: false },
  connecting: { label: 'Connecting to Gemini Live...', toneClass: 'text-blue-700 bg-blue-50 border-blue-200', isLive: true },
  listening: { label: 'Listening (16kHz PCM)', toneClass: 'text-emerald-800 bg-emerald-50 border-emerald-200', isLive: true },
  thinking: { label: 'Executing Backend Action...', toneClass: 'text-blue-800 bg-blue-50 border-blue-200', isLive: true },
  speaking: { label: 'Speaking (24kHz Audio)', toneClass: 'text-emerald-900 bg-emerald-100 border-emerald-300', isLive: true },
  interrupted: { label: 'Interrupted · Switching Context', toneClass: 'text-amber-800 bg-amber-50 border-amber-200', isLive: true },
  error: { label: 'Connection Error · Recoverable', toneClass: 'text-red-800 bg-red-50 border-red-200', isLive: false },
};

export function VoiceAssistantPanel({
  farmer,
  status,
  errorMessage,
  transcript,
  micLevel,
  speakerLevel,
  lastLatencyMs,
  language,
  onLanguageChange,
  noiseFilterEnabled,
  onToggleNoiseFilter,
  isMicMuted,
  onToggleMute,
  onGrantConsent,
  onStartVoice,
  onStopVoice,
  onInterrupt,
  onSendPrompt,
  onClearTranscript,
  onQuickAction,
}: VoiceAssistantPanelProps) {
  const [textInput, setTextInput] = useState('');
  const [submittingText, setSubmittingText] = useState(false);
  const [runningDemoId, setRunningDemoId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  const isActive =
    status === 'connecting' ||
    status === 'listening' ||
    status === 'thinking' ||
    status === 'speaking' ||
    status === 'interrupted';

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Real-time canvas waveform bar visualizer driven by micLevel & speakerLevel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const bars = 36;
    const gap = 4;
    const barWidth = (width - (bars - 1) * gap) / bars;
    const activeLevel = status === 'speaking' ? speakerLevel : micLevel;
    const baseColor =
      status === 'speaking' ? '#1d4ed8' : isActive ? '#15803d' : '#cbd5e1';

    ctx.fillStyle = baseColor;
    const now = Date.now() / 180;
    for (let i = 0; i < bars; i++) {
      const distFromCenter = Math.abs(i - bars / 2) / (bars / 2);
      const envelope = 1 - distFromCenter * 0.65;
      const harmonic = 0.5 + 0.5 * Math.sin(now + i * 0.55);
      const amp = isActive ? Math.max(0.08, activeLevel * envelope * (0.45 + harmonic * 0.75)) : 0.06;
      const barHeight = Math.max(4, Math.min(height - 4, amp * height));
      const x = i * (barWidth + gap);
      const y = (height - barHeight) / 2;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 2);
      ctx.fill();
    }
  }, [micLevel, speakerLevel, status, isActive]);

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || submittingText) return;
    const payload = textInput.trim();
    setTextInput('');
    setSubmittingText(true);
    try {
      await onSendPrompt(payload);
    } finally {
      setSubmittingText(false);
    }
  };

  const handleRunDemo = async (demo: (typeof DEMO_SCENARIOS)[number]) => {
    setRunningDemoId(demo.id);
    try {
      if (demo.interruptFollowUp) {
        // Demo 5: start initial query, then fire mid-sentence interruption
        void onSendPrompt(demo.prompt, demo.langLabel);
        setTimeout(async () => {
          onInterrupt();
          await onSendPrompt(demo.interruptFollowUp!, 'English (Interrupt)');
          setRunningDemoId(null);
        }, 1200);
        return;
      }
      await onSendPrompt(demo.prompt, demo.langLabel);
    } finally {
      if (!demo.interruptFollowUp) {
        setRunningDemoId(null);
      }
    }
  };

  const statusInfo = STATUS_META[status];

  return (
    <section className="space-y-6">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
        <img
          src="/src/assets/images/hero_farmland_dawn_1794973152851.jpg"
          alt="Irrigated Indian farmland at dawn"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/75 to-slate-900/45" />
        <div className="relative z-10 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-medium tracking-wide text-emerald-300">
              Your Voice. Your Language. Your Digital Farming Assistant.
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight text-balance">
              Welcome to BharatSathi AI
            </h1>
            <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
              Your intelligent farming companion. Speak naturally in Telugu, Hindi, English, or code-switched speech to log expenses, schedule irrigation, report crop symptoms, check live weather, and inspect mandi prices.
            </p>
          </div>

          {/* Active Farmer Context Card */}
          <div className="flex items-center gap-3.5 bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-3.5 shrink-0">
            <img
              src="/src/assets/images/avatar_farmer_profile_1794973152441.jpg"
              alt={farmer.name}
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-lg object-cover border border-white/25"
            />
            <div className="text-white">
              <div className="text-sm font-semibold">{farmer.name}</div>
              <div className="text-xs text-slate-200">
                {farmer.village}, {farmer.district}
              </div>
              <div className="text-xs text-emerald-300 font-mono tabular-nums mt-0.5">
                {farmer.preferred_language} · {farmer.farm_acres} Acres
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Voice Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Real-Time Voice Control Console */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-xs font-medium ${statusInfo.toneClass}`}
                >
                  {statusInfo.isLive ? (
                    <Radio className="w-3.5 h-3.5 animate-pulse" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                  <span>{statusInfo.label}</span>
                </span>
              </div>

              {lastLatencyMs !== null && (
                <span className="text-xs font-mono tabular-nums text-slate-600">
                  Observed Latency: <strong className="text-slate-900">{lastLatencyMs} ms</strong>
                </span>
              )}
            </div>

            {/* Responsible AI Consent Gate */}
            <label className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={farmer.consent_given}
                onChange={(e) => void onGrantConsent(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
              />
              <span className="text-xs text-slate-700 leading-relaxed">
                <strong className="font-semibold text-slate-900 inline-flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  Voice Processing Consent:
                </strong>{' '}
                I consent to stream microphone audio to Gemini Live API on Google Cloud to execute farm actions.
              </span>
            </label>

            {/* Animated Microphone Orb + Waveform */}
            <div className="py-4 flex flex-col items-center justify-center gap-4 border border-slate-100 rounded-xl bg-slate-50/70">
              <div className="relative flex items-center justify-center">
                {isActive && (
                  <span
                    className="absolute w-28 h-28 rounded-full border-2 border-emerald-500/40 transition-transform duration-150"
                    style={{
                      transform: `scale(${1 + Math.max(micLevel, speakerLevel) * 0.35})`,
                    }}
                  />
                )}
                <button
                  type="button"
                  disabled={!farmer.consent_given && !isActive}
                  onClick={() => {
                    if (isActive) {
                      onStopVoice();
                    } else {
                      void onStartVoice();
                    }
                  }}
                  aria-label={isActive ? 'Stop voice conversation' : 'Start voice conversation'}
                  className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center shadow-md transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 ${
                    isActive
                      ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                      : farmer.consent_given
                        ? 'bg-slate-900 hover:bg-emerald-700 text-white'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {isActive ? <Mic className="w-9 h-9" /> : <Mic className="w-9 h-9" />}
                </button>
              </div>

              <canvas
                ref={canvasRef}
                width={320}
                height={42}
                className="w-full max-w-[320px] h-[42px]"
                aria-label="Live audio waveform visualizer"
              />

              {/* Primary Voice Controls */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 px-3">
                {!isActive ? (
                  <button
                    type="button"
                    disabled={!farmer.consent_given}
                    onClick={() => void onStartVoice()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-500 text-white text-sm font-medium transition-colors whitespace-nowrap"
                  >
                    <Play className="w-4 h-4" />
                    <span>Start Conversation</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={onStopVoice}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors whitespace-nowrap"
                    >
                      <Square className="w-4 h-4" />
                      <span>Stop</span>
                    </button>

                    <button
                      type="button"
                      onClick={onInterrupt}
                      className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium transition-colors whitespace-nowrap"
                    >
                      <Hand className="w-4 h-4" />
                      <span>Interrupt Assistant</span>
                    </button>

                    <button
                      type="button"
                      onClick={onToggleMute}
                      className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors whitespace-nowrap"
                    >
                      {isMicMuted ? <MicOff className="w-4 h-4 text-red-600" /> : <Mic className="w-4 h-4" />}
                      <span>{isMicMuted ? 'Unmute' : 'Mute'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Language Selector & Noise Resilience */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Conversation Language
                </label>
                <select
                  value={language}
                  onChange={(e) => onLanguageChange(e.target.value as SupportedLanguage)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <option value="auto">Auto-Detect (Te / Hi / En)</option>
                  <option value="te">Telugu (తెలుగు)</option>
                  <option value="hi">Hindi (हिन्दी)</option>
                  <option value="en">English</option>
                  <option value="mixed">Code-Switched (Te/Hi + En)</option>
                </select>
              </div>

              <div className="flex flex-col justify-end">
                <button
                  type="button"
                  onClick={onToggleNoiseFilter}
                  className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    noiseFilterEnabled
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Wind className="w-4 h-4" />
                  <span>Outdoor Noise Gate: {noiseFilterEnabled ? 'On' : 'Off'}</span>
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Live Conversation Transcript & Tool Actions */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Live Conversation & Action Execution Log
              </h2>
              <p className="text-xs text-slate-500">
                Real-time speech transcripts, Gemini function calls, and database transaction IDs
              </p>
            </div>
            {transcript.length > 0 && (
              <button
                type="button"
                onClick={onClearTranscript}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 px-2.5 py-1.5 rounded-lg hover:bg-slate-100"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Scrollable Transcript Feed */}
          <div className="h-[310px] overflow-y-auto space-y-3 pr-1">
            {transcript.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-6">
                <p className="text-sm font-medium text-slate-700">
                  No active turns yet
                </p>
                <p className="text-xs text-slate-500 max-w-md mt-1 leading-relaxed">
                  Consent above and click <strong>Start Conversation</strong> to speak in Telugu, Hindi, or English, or trigger any of the 5 live hackathon demonstrations below.
                </p>
              </div>
            ) : (
              transcript.map((entry) => {
                if (entry.role === 'tool') {
                  return (
                    <div
                      key={entry.id}
                      className="rounded-lg border border-blue-200 bg-blue-50/70 px-3.5 py-2.5 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-blue-900 inline-flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-700" />
                          Backend Action: {entry.toolName}
                        </span>
                        <span className="font-mono tabular-nums text-blue-800">
                          {entry.transactionId} · {entry.latencyMs} ms
                        </span>
                      </div>
                      <p className="text-slate-700">{entry.text}</p>
                    </div>
                  );
                }

                if (entry.role === 'system') {
                  return (
                    <div
                      key={entry.id}
                      className="text-center text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg py-1.5 px-3"
                    >
                      {entry.text}
                    </div>
                  );
                }

                const isUser = entry.role === 'user';
                return (
                  <div
                    key={entry.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <span className="text-[11px] font-medium text-slate-500 mb-1">
                      {isUser ? `${farmer.name} · Voice/Input` : 'BharatSathi AI'} ·{' '}
                      {new Date(entry.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                    <div
                      className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                        isUser
                          ? 'bg-slate-900 text-white'
                          : 'bg-emerald-50 border border-emerald-200 text-slate-900'
                      }`}
                    >
                      {entry.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={transcriptEndRef} />
          </div>

          {/* Direct Voice/Text Command Bar */}
          <form onSubmit={handleTextSubmit} className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Speak via mic above, or type a Telugu / Hindi / English / Hinglish command..."
              className="flex-1 px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            <button
              type="submit"
              disabled={!textInput.trim() || submittingText}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-sm font-medium whitespace-nowrap"
            >
              <Send className="w-4 h-4" />
              <span>{submittingText ? 'Sending...' : 'Send'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* 6 Quick Actions Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="font-display text-sm font-semibold text-slate-900">
            Quick Farm Actions
          </h2>
          <span className="text-xs text-slate-500">
            Execute directly or speak the request in your language
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { id: 'expense', label: 'Add Farm Expense', icon: IndianRupee },
            { id: 'reminder', label: 'Set Irrigation Reminder', icon: CalendarClock },
            { id: 'crop', label: 'Report Crop Problem', icon: Bug },
            { id: 'weather', label: 'Check Weather', icon: CloudSun },
            { id: 'market', label: 'Check Market Prices', icon: Store },
            { id: 'records', label: 'View Farm Records', icon: FileText },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  onQuickAction(
                    item.id as 'expense' | 'reminder' | 'crop' | 'weather' | 'market' | 'records'
                  )
                }
                className="flex flex-col items-start gap-2 p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-emerald-50 hover:border-emerald-300 text-left transition-colors"
              >
                <Icon className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-semibold text-slate-900">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* HD Visual Field & Resilience Guide */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Visual Field & Resilience Guide
          </h2>
          <span className="text-xs text-slate-500">
            Click any card to inspect live records or open the Andhra Pradesh preparedness workflow
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              title: 'Water & Irrigation Security',
              subtitle: 'Farm ponds, drip scheduling & Telugu/Hindi reminders',
              image: '/src/assets/images/climate_water_preparedness_1794973746103.jpg',
              action: 'reminder' as const,
            },
            {
              title: 'Heat & Rainfall Resilience',
              subtitle: 'Andhra Pradesh live climate desk & community checklists',
              image: '/src/assets/images/heat_resilience_farmers_1794973746278.jpg',
              action: 'weather' as const,
            },
            {
              title: 'Crop Health & KVK Referral',
              subtitle: 'Symptom logging, educational tips & expert escalation',
              image: '/src/assets/images/crop_diagnostics_field_1794973746432.jpg',
              action: 'crop' as const,
            },
            {
              title: 'Mandi Rates & Farm Ledger',
              subtitle: 'Voice expense tracking (₹) & reference mandi prices',
              image: '/src/assets/images/mandi_rural_commerce_1794973747487.jpg',
              action: 'market' as const,
            },
          ].map((card) => (
            <button
              key={card.title}
              type="button"
              onClick={() => onQuickAction(card.action)}
              className="group overflow-hidden rounded-xl border border-slate-200 bg-white text-left hover:border-emerald-400 transition-colors"
            >
              <div className="aspect-4/3 w-full overflow-hidden bg-slate-100">
                <img
                  src={card.image}
                  alt={card.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-200"
                />
              </div>
              <div className="p-3.5 space-y-1">
                <div className="text-sm font-semibold text-slate-900">{card.title}</div>
                <p className="text-xs text-slate-600 leading-snug">{card.subtitle}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 5 Interactive Multilingual Hackathon Demo Scenarios */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Multilingual & Interruption Demonstration Suite
            </h2>
            <p className="text-xs text-slate-500">
              Click any scenario to run a genuine Gemini tool-calling turn (speaks aloud when Live Voice is active)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          {DEMO_SCENARIOS.map((demo) => {
            const running = runningDemoId === demo.id;
            return (
              <button
                key={demo.id}
                type="button"
                disabled={running}
                onClick={() => void handleRunDemo(demo)}
                className="flex flex-col justify-between gap-2.5 p-3.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 text-left transition-colors"
              >
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-blue-800">{demo.title}</div>
                  <p className="text-xs text-slate-900 font-medium line-clamp-2">
                    &ldquo;{demo.prompt}&rdquo;
                  </p>
                  <p className="text-[11px] text-slate-500 leading-snug">{demo.note}</p>
                </div>
                <div className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 pt-1">
                  <span>{running ? 'Running...' : 'Run Demo'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
