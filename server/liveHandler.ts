import { LiveServerMessage, Modality } from '@google/genai';
import type { WebSocket, WebSocketServer } from 'ws';
import {
  getPublicState,
  readDb,
  recordVoiceFirstByteLatency,
  startVoiceSession,
  updateVoiceSession,
} from './db.ts';
import {
  buildBharatSathiSystemInstruction,
  getGeminiClient,
} from './geminiClient.ts';
import {
  bharatsathiFunctionDeclarations,
  executeAgentTool,
} from './tools.ts';

interface ClientWsMessage {
  type?: 'audio' | 'text' | 'interrupt' | 'ping';
  audio?: string;
  text?: string;
  language?: string;
}

const LANGUAGE_LABELS: Record<string, string> = {
  auto: 'Multilingual (Auto)',
  te: 'Telugu',
  hi: 'Hindi',
  en: 'English',
  mixed: 'Code-Switched (Te/Hi + En)',
};

export function attachLiveWebSocketServer(wss: WebSocketServer): void {
  wss.on('connection', async (clientWs: WebSocket, req) => {
    const url = new URL(req.url || '/live', 'http://localhost:3000');
    const langCode = url.searchParams.get('lang') || 'auto';
    const languageLabel = LANGUAGE_LABELS[langCode] || 'Multilingual';

    const db = readDb();
    const voiceSession = startVoiceSession(languageLabel);
    let actionsCompleted = 0;
    const actionLatencies: number[] = [];
    let sessionClosed = false;
    let lastUserActivityAt = Date.now();
    let awaitingFirstAudioByte = false;

    const sendToClient = (payload: Record<string, unknown>) => {
      if (clientWs.readyState === clientWs.OPEN) {
        clientWs.send(JSON.stringify(payload));
      }
    };

    let geminiSession: Awaited<ReturnType<ReturnType<typeof getGeminiClient>['live']['connect']>> | null = null;

    try {
      const ai = getGeminiClient();
      const systemInstruction = buildBharatSathiSystemInstruction(
        languageLabel,
        db.farmer.name,
        db.farmer.village,
        db.farmer.district,
        db.farmer.state
      );

      geminiSession = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: [{ functionDeclarations: bharatsathiFunctionDeclarations }],
          systemInstruction,
        },
        callbacks: {
          onopen: () => {
            sendToClient({
              type: 'status',
              status: 'listening',
              sessionId: voiceSession.id,
              language: languageLabel,
            });
          },
          onmessage: async (message: LiveServerMessage) => {
            if (sessionClosed) return;
            const content = message.serverContent;

            if (content?.inputTranscription?.text) {
              lastUserActivityAt = Date.now();
              awaitingFirstAudioByte = true;
              sendToClient({
                type: 'input_transcript',
                text: content.inputTranscription.text,
              });
            }

            if (content?.outputTranscription?.text) {
              sendToClient({
                type: 'output_transcript',
                text: content.outputTranscription.text,
              });
            }

            if (content?.interrupted) {
              updateVoiceSession(voiceSession.id, { incrementInterruptions: 1 });
              sendToClient({
                type: 'interrupted',
                state: getPublicState(),
              });
            }

            for (const part of content?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                if (awaitingFirstAudioByte) {
                  awaitingFirstAudioByte = false;
                  const firstByteMs = Date.now() - lastUserActivityAt;
                  recordVoiceFirstByteLatency(firstByteMs);
                  sendToClient({
                    type: 'latency',
                    voiceFirstByteMs: firstByteMs,
                  });
                }
                sendToClient({
                  type: 'audio',
                  audio: part.inlineData.data,
                });
              }
            }

            if (content?.turnComplete) {
              sendToClient({ type: 'turn_complete' });
            }

            const toolCalls = message.toolCall?.functionCalls ?? [];
            if (toolCalls.length > 0 && geminiSession) {
              sendToClient({ type: 'status', status: 'thinking' });
              const functionResponses = [];

              for (const call of toolCalls) {
                const toolName = call.name || 'unknown_tool';
                const toolArgs = (call.args ?? {}) as Record<string, unknown>;
                const outcome = await executeAgentTool(toolName, toolArgs, languageLabel);

                actionsCompleted += 1;
                actionLatencies.push(outcome.latencyMs);
                const avgLat = Math.round(
                  actionLatencies.reduce((a, b) => a + b, 0) / actionLatencies.length
                );
                updateVoiceSession(voiceSession.id, {
                  incrementActions: 1,
                  avg_latency_ms: avgLat,
                });

                sendToClient({
                  type: 'tool_executed',
                  toolName,
                  args: toolArgs,
                  result: outcome.result,
                  activityLog: outcome.activityLog,
                  latencyMs: outcome.latencyMs,
                  state: getPublicState(),
                });

                functionResponses.push({
                  id: call.id,
                  name: toolName,
                  response: outcome.result,
                });
              }

              try {
                geminiSession.sendToolResponse({ functionResponses });
              } catch (err) {
                updateVoiceSession(voiceSession.id, { incrementErrorsRecovered: 1 });
                sendToClient({
                  type: 'error',
                  message:
                    err instanceof Error
                      ? `Failed to return tool response: ${err.message}`
                      : 'Failed to return tool response.',
                });
              }
            }
          },
          onerror: (err) => {
            updateVoiceSession(voiceSession.id, { incrementErrorsRecovered: 1 });
            sendToClient({
              type: 'error',
              message: err?.message || 'Gemini Live session encountered a connection error.',
            });
          },
          onclose: () => {
            if (!sessionClosed) {
              sessionClosed = true;
              updateVoiceSession(voiceSession.id, {
                session_end: new Date().toISOString(),
              });
              sendToClient({
                type: 'status',
                status: 'disconnected',
                state: getPublicState(),
              });
            }
          },
        },
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Unable to connect to Gemini Live API.';
      updateVoiceSession(voiceSession.id, {
        session_end: new Date().toISOString(),
        incrementErrorsRecovered: 1,
      });
      sendToClient({ type: 'error', message: msg });
      clientWs.close();
      return;
    }

    clientWs.on('message', (raw) => {
      if (!geminiSession || sessionClosed) return;
      try {
        const msg = JSON.parse(raw.toString()) as ClientWsMessage;
        if (msg.type === 'ping') {
          sendToClient({ type: 'pong' });
          return;
        }
        if (msg.type === 'interrupt') {
          updateVoiceSession(voiceSession.id, { incrementInterruptions: 1 });
          sendToClient({
            type: 'interrupted',
            state: getPublicState(),
          });
          return;
        }
        if (msg.text) {
          lastUserActivityAt = Date.now();
          awaitingFirstAudioByte = true;
          geminiSession.sendClientContent({
            turns: [{ role: 'user', parts: [{ text: msg.text }] }],
            turnComplete: true,
          });
          return;
        }
        if (msg.audio) {
          if (!awaitingFirstAudioByte) {
            lastUserActivityAt = Date.now();
          }
          geminiSession.sendRealtimeInput({
            audio: { data: msg.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        }
      } catch {
        // Ignore malformed frame safely
      }
    });

    clientWs.on('close', () => {
      sessionClosed = true;
      updateVoiceSession(voiceSession.id, {
        session_end: new Date().toISOString(),
        actions_completed: actionsCompleted,
      });
      try {
        geminiSession?.close();
      } catch {
        // Already closed
      }
    });
  });
}
