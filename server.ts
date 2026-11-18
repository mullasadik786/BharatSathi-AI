import 'dotenv/config';
import http from 'http';
import path from 'path';
import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer as createViteServer } from 'vite';
import { getPublicState, readDb, writeDb } from './server/db.ts';
import {
  buildBharatSathiSystemInstruction,
  getGeminiClient,
} from './server/geminiClient.ts';
import { attachLiveWebSocketServer } from './server/liveHandler.ts';
import {
  createRateLimiter,
  getSecurityPosture,
  sanitizeText,
  securityHeadersMiddleware,
} from './server/security.ts';
import {
  bharatsathiFunctionDeclarations,
  buildDisasterPreparednessPlaybook,
  executeAgentTool,
  fetchLiveWeather,
} from './server/tools.ts';

async function bootstrap() {
  const app = express();
  app.disable('x-powered-by');
  app.use(securityHeadersMiddleware);
  app.use(express.json({ limit: '512kb' }));

  const apiLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 120 });
  app.use('/api', apiLimiter.middleware);

  // Health & DB state snapshot
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'BharatSathi AI',
      security: getSecurityPosture(),
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/state', (_req, res) => {
    res.json(getPublicState());
  });

  // Farmer Profile & Consent
  app.post('/api/farmer/consent', (req, res) => {
    const db = readDb();
    db.farmer.consent_given = Boolean(req.body?.consent_given);
    db.farmer.consent_timestamp = new Date().toISOString();
    db.farmer.updated_at = new Date().toISOString();
    writeDb(db);
    res.json({ success: true, state: getPublicState() });
  });

  app.put('/api/farmer', async (req, res) => {
    const outcome = await executeAgentTool(
      'register_or_update_farmer_profile',
      {
        ...req.body,
        user_confirmed_permission: true,
      },
      req.body?.preferred_language || 'English'
    );
    res.json({ ...outcome.result, state: getPublicState() });
  });

  // Expenses CRUD
  app.get('/api/expenses', (_req, res) => {
    const state = getPublicState();
    const total_inr = state.expenses.reduce((s, e) => s + e.amount, 0);
    res.json({ expenses: state.expenses, total_inr });
  });

  app.post('/api/expenses', async (req, res) => {
    const outcome = await executeAgentTool('add_farm_expense', req.body, 'Dashboard UI');
    if (!outcome.result.success) {
      res.status(400).json({ ...outcome.result, state: getPublicState() });
      return;
    }
    res.json({ ...outcome.result, activityLog: outcome.activityLog, state: getPublicState() });
  });

  // Irrigation Reminders CRUD
  app.get('/api/reminders', (_req, res) => {
    res.json({ reminders: getPublicState().reminders });
  });

  app.post('/api/reminders', async (req, res) => {
    const outcome = await executeAgentTool('create_irrigation_reminder', req.body, 'Dashboard UI');
    if (!outcome.result.success) {
      res.status(400).json({ ...outcome.result, state: getPublicState() });
      return;
    }
    res.json({ ...outcome.result, activityLog: outcome.activityLog, state: getPublicState() });
  });

  app.patch('/api/reminders/:id', async (req, res) => {
    const outcome = await executeAgentTool(
      'update_irrigation_reminder',
      { reminder_id: req.params.id, ...req.body },
      'Dashboard UI'
    );
    res.json({ ...outcome.result, activityLog: outcome.activityLog, state: getPublicState() });
  });

  app.delete('/api/reminders/:id', async (req, res) => {
    const confirmed = req.query.confirmed === 'true' || Boolean(req.body?.confirmed);
    const outcome = await executeAgentTool(
      'cancel_irrigation_reminder',
      { reminder_id: req.params.id, confirmed },
      'Dashboard UI'
    );
    if (!outcome.result.success) {
      res.status(confirmed ? 404 : 409).json({ ...outcome.result, state: getPublicState() });
      return;
    }
    res.json({ ...outcome.result, activityLog: outcome.activityLog, state: getPublicState() });
  });

  // Crop Issues
  app.get('/api/crop-reports', (_req, res) => {
    res.json({ cropReports: getPublicState().cropReports });
  });

  app.post('/api/crop-reports', async (req, res) => {
    const outcome = await executeAgentTool('record_crop_issue', req.body, 'Dashboard UI');
    if (!outcome.result.success) {
      res.status(400).json({ ...outcome.result, state: getPublicState() });
      return;
    }
    res.json({ ...outcome.result, activityLog: outcome.activityLog, state: getPublicState() });
  });

  // Live Weather API (Open-Meteo)
  app.get('/api/weather', async (req, res) => {
    const location = sanitizeText(req.query.location, 120) || `${readDb().farmer.district}, ${readDb().farmer.state}`;
    try {
      const weather = await fetchLiveWeather(location);
      res.json({ success: true, weather });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to fetch live weather data.';
      res.status(502).json({ success: false, error: msg });
    }
  });

  // Cyclone & Community Disaster Management Playbook + Live Disturbance Check
  app.get('/api/disaster-guidance', async (req, res) => {
    const location = sanitizeText(req.query.location, 120) || `${readDb().farmer.district}, ${readDb().farmer.state}`;
    const hazard = sanitizeText(req.query.hazard, 40) || 'cyclone';
    let weather = null;
    try {
      weather = await fetchLiveWeather(location);
    } catch {
      weather = null;
    }
    const playbook = buildDisasterPreparednessPlaybook(hazard, weather);
    res.json({ success: true, ...playbook });
  });

  // Market Prices (Labeled Demo Dataset)
  app.get('/api/market-prices', (req, res) => {
    const crop = String(req.query.crop || '').trim().toLowerCase();
    const market = String(req.query.market || '').trim().toLowerCase();
    const all = getPublicState().marketPrices;
    const filtered = all.filter((m) => {
      const cropOk = !crop || m.crop.toLowerCase().includes(crop);
      const mktOk = !market || m.market.toLowerCase().includes(market) || m.state.toLowerCase().includes(market);
      return cropOk && mktOk;
    });
    res.json({
      prices: filtered,
      data_notice: 'Demo Dataset (Agmarknet Reference Snapshot) — clearly labeled non-live reference prices.',
    });
  });

  // Text / Quick-Demo Agent Fallback (uses gemini-4-hydrogen with identical 6-tool function calling)
  app.post('/api/agent/text', async (req, res) => {
    const start = performance.now();
    const userMessage = String(req.body?.message || '').trim();
    const languageLabel = String(req.body?.language || 'Multilingual');
    const history = Array.isArray(req.body?.history) ? req.body.history : [];

    if (!userMessage) {
      res.status(400).json({ success: false, error: 'Message text is required.' });
      return;
    }

    try {
      const ai = getGeminiClient();
      const db = readDb();
      const systemInstruction = buildBharatSathiSystemInstruction(
        languageLabel,
        db.farmer.name,
        db.farmer.village,
        db.farmer.district,
        db.farmer.state
      );

      const contents: Array<{ role: 'user' | 'model'; parts: Array<Record<string, unknown>> }> = [];
      for (const h of history.slice(-8)) {
        if (h?.text && (h.role === 'user' || h.role === 'assistant')) {
          contents.push({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: String(h.text) }],
          });
        }
      }
      contents.push({ role: 'user', parts: [{ text: userMessage }] });

      const toolsExecuted: Array<{
        toolName: string;
        args: Record<string, unknown>;
        result: Record<string, unknown>;
        activityLog: unknown;
        latencyMs: number;
      }> = [];

      let currentResponse = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: contents as never,
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: bharatsathiFunctionDeclarations }],
        },
      });

      // Execute up to 3 sequential tool-calling rounds if needed
      for (let round = 0; round < 3; round++) {
        const functionCalls = currentResponse.functionCalls;
        if (!functionCalls || functionCalls.length === 0) break;

        const modelContent = currentResponse.candidates?.[0]?.content;
        if (modelContent) {
          contents.push(modelContent as never);
        }

        const responseParts: Array<Record<string, unknown>> = [];
        for (const call of functionCalls) {
          const toolName = call.name || 'unknown';
          const toolArgs = (call.args ?? {}) as Record<string, unknown>;
          const outcome = await executeAgentTool(toolName, toolArgs, languageLabel);
          toolsExecuted.push({
            toolName,
            args: toolArgs,
            result: outcome.result,
            activityLog: outcome.activityLog,
            latencyMs: outcome.latencyMs,
          });
          responseParts.push({
            functionResponse: {
              id: call.id,
              name: toolName,
              response: outcome.result,
            },
          });
        }

        contents.push({ role: 'user', parts: responseParts });
        currentResponse = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: contents as never,
          config: {
            systemInstruction,
            tools: [{ functionDeclarations: bharatsathiFunctionDeclarations }],
          },
        });
      }

      const totalLatencyMs = Math.round(performance.now() - start);
      res.json({
        success: true,
        reply: currentResponse.text || 'Action completed.',
        toolsExecuted,
        latencyMs: totalLatencyMs,
        state: getPublicState(),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Agent processing error';
      res.status(500).json({ success: false, error: msg, state: getPublicState() });
    }
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({
    server,
    path: '/live',
    maxPayload: 256 * 1024,
  });
  attachLiveWebSocketServer(wss);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT || 3000);
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`BharatSathi AI server listening on http://0.0.0.0:${PORT}`);
  });
}

bootstrap();
