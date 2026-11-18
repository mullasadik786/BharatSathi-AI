# BharatSathi AI — Real-Time Multilingual Voice-Powered Agricultural & Rural Business Agent

**Team:** Bharat Innovation  
**Team Leader:** Shaik Mulla Sadik  
**Challenge:** Hack2Skill — Build with Google Gemini (Open Innovation)  
**Tagline:** *Your Voice. Your Language. Your Digital Farming Assistant.*

---

## Overview

BharatSathi AI is a voice-first, action-oriented multilingual agricultural assistant built with **Google Gemini Live API (`gemini-3.8-live`)**, **Gemini 4 Hydrogen (`gemini-4-hydrogen`)**, and a persistent Express + WebSocket backend. Farmers and rural entrepreneurs can speak naturally in **Telugu, Hindi, English, Hinglish, or Telugu-English code-switched speech** to execute real backend operations.

### Supported Agentic Tools
1. **Farm Expense Manager (`add_farm_expense`, `get_farm_expenses`)**: Extracts INR amounts, categories, and dates, validates inputs, persists transactions, and calculates real totals.
2. **Irrigation Reminder Agent (`create_irrigation_reminder`, `update_irrigation_reminder`, `cancel_irrigation_reminder`, `get_irrigation_reminders`)**: Schedules irrigation tasks, asks for missing times, marks tasks complete, and requires explicit confirmation before cancelling.
3. **Crop Issue Recording (`record_crop_issue`, `get_crop_issues`)**: Captures crop name, symptoms, severity, and location; provides clearly labeled educational guidance and recommends consulting a Krishi Vigyan Kendra (KVK) agronomist.
4. **Live Weather & Climate Information (`get_weather_info`)**: Fetches live weather and 3-day agricultural forecasts via the **Open-Meteo API** with explicit source attribution and timestamps.
5. **Mandi Market Information (`get_market_prices`)**: Queries commodity prices by crop and market from a clearly labeled Demo Dataset (`Agmarknet Reference Snapshot`).
6. **Farmer Profile Management (`get_farmer_profile`, `register_or_update_farmer_profile`)**: Manages farmer details and language preferences with explicit user permission.

---

## Architecture Flow

```text
User Voice (16kHz PCM Mic)
  → Browser Web Audio API & WebSocket (/live)
  → Express / Node.js Backend Proxy (server/liveHandler.ts)
  → Gemini Live API (gemini-3.8-live)
  → Intent Understanding & Multilingual Reasoning
  → Function Calling (6 Domain Tools in server/tools.ts)
  → Persistent JSON Database (data/bharatsathi-db.json) + Live Open-Meteo API
  → Action Result & Latency Telemetry
  → Spoken Confirmation (24kHz PCM Audio) + Live Dashboard Update
```

---

## Database Schema (`data/bharatsathi-db.json`)

- **Farmers**: `id, name, village, district, state, preferred_language, crops, farm_acres, consent_given, updated_at`
- **Expenses**: `id, farmer_id, amount, category, date, description, created_at`
- **Reminders**: `id, farmer_id, task, date, time, status, created_at, updated_at`
- **CropReports**: `id, farmer_id, crop, symptoms, date, location, severity, guidance, expert_recommended, status, created_at`
- **MarketPrices**: `id, crop, market, state, price, unit, updated_at, data_source`
- **VoiceSessions**: `id, farmer_id, language, session_start, session_end, actions_completed, avg_latency_ms, interruptions_handled, errors_recovered`
- **ActivityLogs**: `id, timestamp, action_type, tool_name, summary, transaction_id, status, latency_ms, language`

---

## REST & WebSocket API Reference

- `WS /live?lang=auto|te|hi|en|mixed` — Real-time bidirectional 16kHz input / 24kHz output Gemini Live audio stream + tool execution events.
- `POST /api/agent/text` — Multilingual text/demo turn execution via `gemini-4-hydrogen` with identical function calling.
- `GET /api/state` — Full database snapshot and computed performance metrics.
- `GET /api/expenses` · `POST /api/expenses` — Expense ledger retrieval and creation.
- `GET /api/reminders` · `POST /api/reminders` · `PATCH /api/reminders/:id` · `DELETE /api/reminders/:id?confirmed=true` — Irrigation schedule management.
- `GET /api/crop-reports` · `POST /api/crop-reports` — Crop issue reporting.
- `GET /api/weather?location=...` — Live Open-Meteo weather query.
- `GET /api/market-prices?crop=...&market=...` — Demo dataset mandi query.
- `POST /api/farmer/consent` · `PUT /api/farmer` — Consent and profile updates.

---

## Local Setup

1. Configure environment variables based on `.env.example`:
   - `GEMINI_API_KEY`: Your server-side Gemini API key (never exposed to browser code).
2. Install dependencies and start the server:
   ```bash
   npm install
   npm run dev
   ```
3. Open `http://localhost:3000`.

---

## Google Cloud Run Deployment

1. Build the production frontend bundle:
   ```bash
   npm run build
   ```
2. Deploy to Cloud Run (supporting WebSockets and port `3000`):
   ```bash
   gcloud run deploy bharatsathi-ai \
     --source . \
     --region asia-south1 \
     --allow-unauthenticated \
     --port 3000 \
     --set-env-vars NODE_ENV=production \
     --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest
   ```

---

## Demo Test Cases

1. **Telugu**: `"నా పొలానికి రేపు ఉదయం 6 గంటలకు నీళ్లు పెట్టాలి. రిమైండర్ సెట్ చేయి."`
2. **Hindi**: `"आज मैंने खाद पर 2500 रुपये खर्च किए। इसे मेरे रिकॉर्ड में जोड़ दो।"`
3. **English**: `"Show me my total farm expenses this month."`
4. **Code-Switched**: `"Naku tomorrow Shamirpet weather check chesi irrigation reminder set cheyyi morning 7 AM ki."`
5. **Mid-Sentence Interruption**: Start `"Tell me a detailed summary of all my farm expenses..."` and interrupt with `"Actually, stop that and add 1500 rupees fertilizer expense for today."`
