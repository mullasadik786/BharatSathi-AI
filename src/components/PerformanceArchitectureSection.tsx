import { ArrowRight, CheckCircle2, Cpu, Database, FileCheck2, Globe, Layers, Mic, Shield } from 'lucide-react';
import type { AppDatabaseState } from '../types.ts';

interface PerformanceArchitectureSectionProps {
  state: AppDatabaseState;
}

export function PerformanceArchitectureSection({
  state,
}: PerformanceArchitectureSectionProps) {
  const { metrics } = state;
  const languageEntries = Object.entries(metrics.languages_used);

  return (
    <section className="space-y-6">
      {/* Real-World Measured Performance */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Observed Runtime Performance & Reliability
            </h2>
            <p className="text-xs text-slate-500">
              Live telemetry computed strictly from executed backend transactions and Gemini Live sessions (no simulated metrics)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500">Observed Voice First-Byte</div>
            <div className="mt-1 font-display text-xl font-bold text-slate-900 tabular-nums">
              {metrics.avg_voice_first_byte_ms !== null
                ? `${metrics.avg_voice_first_byte_ms} ms`
                : 'Awaiting voice turn'}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">Audio turn to 24kHz reply</div>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500">Avg Backend Action Time</div>
            <div className="mt-1 font-display text-xl font-bold text-slate-900 tabular-nums">
              {metrics.avg_action_latency_ms} ms
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Last action: {metrics.last_action_latency_ms !== null ? `${metrics.last_action_latency_ms} ms` : '—'}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500">Successful Actions</div>
            <div className="mt-1 font-display text-xl font-bold text-emerald-700 tabular-nums">
              {metrics.successful_actions} / {metrics.total_actions_executed}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 tabular-nums">
              {metrics.success_rate_percent}% execution success
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500">Interruptions Handled</div>
            <div className="mt-1 font-display text-xl font-bold text-blue-700 tabular-nums">
              {metrics.interruptions_handled}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Mid-sentence queue clears
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500">Sessions & Recovery</div>
            <div className="mt-1 font-display text-xl font-bold text-slate-900 tabular-nums">
              {metrics.total_voice_sessions}
            </div>
            <div className="mt-1 text-[11px] text-slate-500 tabular-nums">
              {metrics.errors_recovered} errors recovered cleanly
            </div>
          </div>
        </div>

        {/* Language Distribution */}
        <div className="pt-2">
          <div className="text-xs font-semibold text-slate-700 mb-2">
            Observed Language & Input Channel Usage
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-slate-700">
            {languageEntries.length === 0 ? (
              <span className="text-slate-500">No actions executed yet.</span>
            ) : (
              languageEntries.map(([lang, count]) => (
                <div
                  key={lang}
                  className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 font-mono tabular-nums"
                >
                  {lang}: <strong className="text-slate-900">{count}</strong>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Business Model & Commercial Viability */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Commercial Viability & Scalable Business Model
          </h2>
          <p className="text-xs text-slate-500">
            Tiered distribution across individual farmers, FPOs, cooperatives, and enterprise agri-service providers
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border border-slate-200 space-y-2">
            <div className="text-xs font-semibold text-emerald-700">For Individual Farmers</div>
            <div className="font-display text-lg font-bold text-slate-900">Freemium Voice Access</div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Free core voice ledger, irrigation reminders, weather advisories, and crop issue logging in Telugu, Hindi, and English.
            </p>
          </div>

          <div className="p-4 rounded-lg border border-slate-200 space-y-2">
            <div className="text-xs font-semibold text-blue-700">For FPOs & Cooperatives</div>
            <div className="font-display text-lg font-bold text-slate-900">Member SaaS Subscription</div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Multi-farmer aggregation dashboards, bulk input procurement coordination, and regional pest-alert broadcasting for Farmer Producer Organisations.
            </p>
          </div>

          <div className="p-4 rounded-lg border border-slate-200 space-y-2">
            <div className="text-xs font-semibold text-slate-700">For Agri-Enterprises & Banks</div>
            <div className="font-display text-lg font-bold text-slate-900">Enterprise Licensing & API</div>
            <p className="text-xs text-slate-600 leading-relaxed">
              White-label multilingual voice workflows and verified operational audit trails for rural NBFCs, agri-input networks, and state extension portals.
            </p>
          </div>
        </div>

        {/* Pilot Assumptions Clearly Labeled */}
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
          <div className="text-xs font-semibold text-slate-900">
            Pilot Assumptions & Target Operational ROI (Illustrative Projections — Not Measured Field Savings)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1 text-xs">
            <div>
              <div className="text-slate-500">Projected Time Saved / Entry</div>
              <div className="font-mono font-semibold text-slate-900 mt-0.5 tabular-nums">~60–90 sec vs manual forms</div>
            </div>
            <div>
              <div className="text-slate-500">Manual Typing Reduction</div>
              <div className="font-mono font-semibold text-slate-900 mt-0.5">Voice-first zero-keyboard flow</div>
            </div>
            <div>
              <div className="text-slate-500">Target FPO Pilot Cost / Call</div>
              <div className="font-mono font-semibold text-slate-900 mt-0.5 tabular-nums">Projected &lt; ₹0.50 / action</div>
            </div>
            <div>
              <div className="text-slate-500">Language Accessibility</div>
              <div className="font-mono font-semibold text-slate-900 mt-0.5">Telugu · Hindi · English · Mixed</div>
            </div>
          </div>
        </div>
      </div>

      {/* End-to-End Architecture & Documentation */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900">
              System Architecture & Implementation Reference
            </h2>
            <p className="text-xs text-slate-500">
              Team Bharat Innovation · Team Leader: Shaik Mulla Sadik · Hack2Skill Build with Google Gemini
            </p>
          </div>
        </div>

        {/* Pipeline Flow */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 items-center">
          {[
            { icon: Mic, title: '1. User Voice', sub: '16kHz PCM Mic' },
            { icon: Globe, title: '2. WebSocket', sub: '/live Proxy' },
            { icon: Cpu, title: '3. Gemini Live', sub: 'gemini-3.8-live' },
            { icon: Layers, title: '4. Tool Call', sub: '6 Domain Tools' },
            { icon: Shield, title: '5. Validation', sub: 'Consent & Checks' },
            { icon: Database, title: '6. Persistent DB', sub: 'CRUD + Open-Meteo' },
            { icon: CheckCircle2, title: '7. Audio Reply', sub: '24kHz Spoken' },
          ].map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="flex items-center gap-2">
                <div className="flex-1 p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
                  <Icon className="w-4 h-4 text-emerald-700" />
                  <div className="text-xs font-semibold text-slate-900">{step.title}</div>
                  <div className="text-[11px] text-slate-500 font-mono">{step.sub}</div>
                </div>
                {index < 6 && (
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden lg:block" />
                )}
              </div>
            );
          })}
        </div>

        {/* Backend Endpoints & Collections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-lg border border-slate-200 space-y-2">
            <div className="font-semibold text-slate-900">Server API & WebSocket Endpoints</div>
            <ul className="space-y-1 font-mono text-slate-600">
              <li>WS /live — Bidirectional Gemini Live audio & tool stream</li>
              <li>POST /api/agent/text — Gemini 4 Hydrogen tool-calling endpoint</li>
              <li>GET /api/state — Full persistent database & telemetry snapshot</li>
              <li>POST /api/expenses · GET /api/expenses — Expense ledger</li>
              <li>POST /api/reminders · PATCH/DELETE /api/reminders/:id</li>
              <li>POST /api/crop-reports · GET /api/weather · GET /api/market-prices</li>
            </ul>
          </div>

          <div className="p-4 rounded-lg border border-slate-200 space-y-2">
            <div className="font-semibold text-slate-900">Google Cloud Production Target Mapping</div>
            <ul className="space-y-1 text-slate-600">
              <li><strong className="text-slate-800">Gemini Live API / Vertex AI:</strong> Native audio-to-audio multilingual reasoning</li>
              <li><strong className="text-slate-800">Cloud Run:</strong> Containerized Node/Express + WebSocket backend on port 3000</li>
              <li><strong className="text-slate-800">Firestore / Cloud SQL:</strong> Persistent multi-farmer records & FPO analytics</li>
              <li><strong className="text-slate-800">Cloud Logging & Pub/Sub:</strong> Tool audit logs & scheduled irrigation alerts</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Page 11 Submission Checklist & Demo Storyline Solution */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-emerald-700" />
              <span>Hackathon Submission Checklist & Demo Storyline Solution</span>
            </h2>
            <p className="text-xs text-slate-500">
              Complete live implementation addressing every requirement on the final content page of the BharatSathi AI submission deck
            </p>
          </div>
          <a
            href="/assets/aistudio/BharatSathi_AI_Built_With_Gemini_Submission_1f7ff538.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 whitespace-nowrap shrink-0"
          >
            <span>Open Submission Deck PDF</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="font-semibold text-slate-900">Proposed Demo Storyline (Implemented Live)</div>
            <ul className="space-y-2 text-slate-700">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span><strong>Andhra Pradesh Location Context:</strong> Interactive district selector (Guntur, Vijayawada, Anantapur, Kurnool, Visakhapatnam, Tirupati) in <em>Climate & Mandi</em> showing live Open-Meteo temperature, humidity, and 3-day rainfall variability.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span><strong>Practical Heat, Rainfall & Water Queries:</strong> One-click & voice prompts in Telugu, Hindi, and English invoking real Gemini tool execution.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span><strong>Action Plan, Citations & Uncertainty:</strong> Structured checklists for Farmers, Households, Students, and FPOs with explicit Open-Meteo source timestamps and uncertainty caveats.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span><strong>Awareness → Preparedness → Community Action:</strong> Live climate monitoring flows directly into voice-scheduled irrigation reminders and FPO coordination.</span>
              </li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="font-semibold text-slate-900">Submission Verification Checklist</div>
            <ul className="space-y-2 text-slate-700">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span><strong>Working Prototype & Live Audio:</strong> Full-stack Express + WebSocket + Gemini 3.8 Live audio-to-audio agent running live on port 3000.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span><strong>HD Visual Representations:</strong> High-definition agricultural field photography integrated across Voice Studio, Climate Desk, Crop Health, and Mandi Market views.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span><strong>Verified Data Attribution & Consent:</strong> Explicit microphone consent gate, confirmation before destructive cancellations, live Open-Meteo timestamps, and clearly labeled Demo Mandi dataset.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span><strong>Concept Mock-Ups Replaced:</strong> All concept wireframes replaced with functional, persistent database-backed interfaces ready for submission screenshots and demo video capture.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Security Controls & Problem Alignment */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="font-display text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-700" />
            <span>Runtime Security Controls & Problem Statement Alignment</span>
          </h2>
          <p className="text-xs text-slate-500">
            Enforced backend safeguards and direct alignment with Climate Preparedness & Community Resilience
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <div className="font-semibold text-slate-900">Enforced Security Posture (Live Server Config)</div>
            <ul className="space-y-1.5 text-slate-700">
              <li className="flex items-center justify-between gap-2">
                <span>Server-Side Gemini Key Isolation</span>
                <span className="font-mono font-semibold text-emerald-700">
                  {state.securityPosture?.server_side_api_key_isolation ? 'Enforced' : 'Inactive'}
                </span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span>HTTP Security Headers (nosniff / X-Frame / Permissions)</span>
                <span className="font-mono font-semibold text-emerald-700">
                  {state.securityPosture?.http_security_headers_enabled ? 'Enforced' : 'Inactive'}
                </span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span>API Sliding-Window Rate Limiter (120 req/min)</span>
                <span className="font-mono font-semibold text-emerald-700">
                  {state.securityPosture?.rate_limiting_enabled ? 'Enforced' : 'Inactive'}
                </span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span>Multilingual Input Sanitization & Bounds Checks</span>
                <span className="font-mono font-semibold text-emerald-700">
                  {state.securityPosture?.input_sanitization_enabled ? 'Enforced' : 'Inactive'}
                </span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span>WebSocket Max Payload Cap</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {state.securityPosture ? `${Math.round(state.securityPosture.websocket_max_payload_bytes / 1024)} KB` : '256 KB'}
                </span>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span>Consent Gate & Confirmation-Before-Delete</span>
                <span className="font-mono font-semibold text-emerald-700">
                  {state.securityPosture?.destructive_action_confirmation_required ? 'Enforced' : 'Inactive'}
                </span>
              </li>
            </ul>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <div className="font-semibold text-slate-900">Problem Alignment: Climate Preparedness & Community Resilience</div>
            <ul className="space-y-1.5 text-slate-700">
              <li><strong>Understand:</strong> Multilingual Telugu, Hindi & English voice explanations of heat, rainfall, ET₀, and storm indicators.</li>
              <li><strong>Monitor:</strong> Live Open-Meteo 7-day agricultural weather, surface pressure (hPa), and wind gust telemetry with timestamps.</li>
              <li><strong>Prepare:</strong> Cyclone, flood, and heatwave checklists tailored for Farmers, Households, Students, and FPOs.</li>
              <li><strong>Act:</strong> Real database-backed irrigation reminders, crop symptom logs, farm expense ledgers, and emergency helplines (112/1070/1077/108).</li>
              <li><strong>Build Resilience:</strong> Grounded citations, explicit uncertainty caveats, and official IMD/NDMA/INCOIS verification links.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
