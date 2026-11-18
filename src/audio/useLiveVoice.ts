import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AppDatabaseState,
  SupportedLanguage,
  TranscriptEntry,
  VoiceConnectionStatus,
} from '../types.ts';

interface UseLiveVoiceOptions {
  language: SupportedLanguage;
  noiseFilterEnabled: boolean;
  onDatabaseUpdate: (nextState: AppDatabaseState) => void;
}

function float32ToBase64Pcm16(float32: Float32Array): string {
  const buffer = new ArrayBuffer(float32.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64Pcm16ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const view = new DataView(bytes.buffer);
  const sampleCount = Math.floor(bytes.byteLength / 2);
  const float32 = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    float32[i] = view.getInt16(i * 2, true) / 0x8000;
  }
  return float32;
}

function computeRms(data: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i] * data[i];
  }
  return Math.sqrt(sum / Math.max(1, data.length));
}

export function useLiveVoice({
  language,
  noiseFilterEnabled,
  onDatabaseUpdate,
}: UseLiveVoiceOptions) {
  const [status, setStatus] = useState<VoiceConnectionStatus>('disconnected');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [micLevel, setMicLevel] = useState(0);
  const [speakerLevel, setSpeakerLevel] = useState(0);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const isMutedRef = useRef(false);
  const noiseFilterRef = useRef(noiseFilterEnabled);
  const statusRef = useRef<VoiceConnectionStatus>('disconnected');
  const onDbUpdateRef = useRef(onDatabaseUpdate);

  useEffect(() => {
    noiseFilterRef.current = noiseFilterEnabled;
  }, [noiseFilterEnabled]);

  useEffect(() => {
    onDbUpdateRef.current = onDatabaseUpdate;
  }, [onDatabaseUpdate]);

  useEffect(() => {
    isMutedRef.current = isMicMuted;
  }, [isMicMuted]);

  const setStatusSafe = useCallback((next: VoiceConnectionStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const appendOrMergeTranscript = useCallback(
    (role: 'user' | 'assistant', chunk: string) => {
      const cleaned = chunk;
      if (!cleaned) return;
      setTranscript((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === role && last.interim) {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...last,
            text: last.text + cleaned,
            timestamp: new Date().toISOString(),
          };
          return updated;
        }
        return [
          ...prev,
          {
            id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            role,
            text: cleaned,
            timestamp: new Date().toISOString(),
            interim: true,
          },
        ];
      });
    },
    []
  );

  const finalizeInterimTranscript = useCallback(() => {
    setTranscript((prev) =>
      prev.map((item) => (item.interim ? { ...item, interim: false } : item))
    );
  }, []);

  const stopAllPlayback = useCallback(() => {
    for (const src of activeSourcesRef.current) {
      try {
        src.stop();
        src.disconnect();
      } catch {
        // Ignore stopped nodes
      }
    }
    activeSourcesRef.current.clear();
    if (outputCtxRef.current) {
      nextStartTimeRef.current = outputCtxRef.current.currentTime;
    } else {
      nextStartTimeRef.current = 0;
    }
    setSpeakerLevel(0);
  }, []);

  const playPcm24kChunk = useCallback((base64Audio: string) => {
    const ctx = outputCtxRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    const samples = base64Pcm16ToFloat32(base64Audio);
    if (samples.length === 0) return;

    const rms = computeRms(samples);
    setSpeakerLevel(Math.min(1, rms * 4.5));

    const buffer = ctx.createBuffer(1, samples.length, 24000);
    buffer.getChannelData(0).set(samples);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const now = ctx.currentTime;
    const startAt = Math.max(now + 0.01, nextStartTimeRef.current);
    nextStartTimeRef.current = startAt + buffer.duration;

    activeSourcesRef.current.add(source);
    source.onended = () => {
      activeSourcesRef.current.delete(source);
      if (activeSourcesRef.current.size === 0) {
        setSpeakerLevel(0);
        if (statusRef.current === 'speaking') {
          setStatusSafe('listening');
        }
      }
    };
    source.start(startAt);
    setStatusSafe('speaking');
  }, [setStatusSafe]);

  const stopConversation = useCallback(() => {
    stopAllPlayback();
    try {
      processorRef.current?.disconnect();
    } catch {
      // ignore
    }
    processorRef.current = null;
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (inputCtxRef.current) {
      void inputCtxRef.current.close();
      inputCtxRef.current = null;
    }
    if (outputCtxRef.current) {
      void outputCtxRef.current.close();
      outputCtxRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }
    finalizeInterimTranscript();
    setMicLevel(0);
    setSpeakerLevel(0);
    setStatusSafe('disconnected');
  }, [finalizeInterimTranscript, setStatusSafe, stopAllPlayback]);

  const startConversation = useCallback(async () => {
    if (statusRef.current !== 'disconnected' && statusRef.current !== 'error') {
      return;
    }
    setErrorMessage(null);
    setStatusSafe('connecting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = stream;

      const inputCtx = new AudioContext({ sampleRate: 16000 });
      const outputCtx = new AudioContext({ sampleRate: 24000 });
      inputCtxRef.current = inputCtx;
      outputCtxRef.current = outputCtx;
      nextStartTimeRef.current = outputCtx.currentTime;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/live?lang=${encodeURIComponent(language)}`);
      wsRef.current = ws;

      ws.onopen = () => {
        const source = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (event) => {
          if (ws.readyState !== WebSocket.OPEN || isMutedRef.current) {
            setMicLevel(0);
            return;
          }
          const floatData = event.inputBuffer.getChannelData(0);
          const rms = computeRms(floatData);
          setMicLevel(Math.min(1, rms * 6));

          // Optional outdoor noise-floor gate: suppress pure wind/ambient noise below threshold
          if (noiseFilterRef.current && rms < 0.008) {
            return;
          }

          const b64 = float32ToBase64Pcm16(floatData);
          ws.send(JSON.stringify({ type: 'audio', audio: b64 }));
        };

        source.connect(processor);
        processor.connect(inputCtx.destination);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string);

          if (msg.type === 'status') {
            if (msg.status === 'listening') setStatusSafe('listening');
            if (msg.status === 'thinking') setStatusSafe('thinking');
            if (msg.status === 'disconnected') setStatusSafe('disconnected');
            if (msg.state) onDbUpdateRef.current(msg.state);
          } else if (msg.type === 'input_transcript' && msg.text) {
            appendOrMergeTranscript('user', msg.text);
          } else if (msg.type === 'output_transcript' && msg.text) {
            appendOrMergeTranscript('assistant', msg.text);
          } else if (msg.type === 'audio' && msg.audio) {
            playPcm24kChunk(msg.audio);
          } else if (msg.type === 'latency' && typeof msg.voiceFirstByteMs === 'number') {
            setLastLatencyMs(msg.voiceFirstByteMs);
          } else if (msg.type === 'interrupted') {
            stopAllPlayback();
            finalizeInterimTranscript();
            setStatusSafe('interrupted');
            setTranscript((prev) => [
              ...prev,
              {
                id: `sys-int-${Date.now()}`,
                role: 'system',
                text: 'Assistant interrupted — listening to your updated instruction.',
                timestamp: new Date().toISOString(),
              },
            ]);
            if (msg.state) onDbUpdateRef.current(msg.state);
            setTimeout(() => {
              if (statusRef.current === 'interrupted') {
                setStatusSafe('listening');
              }
            }, 600);
          } else if (msg.type === 'turn_complete') {
            finalizeInterimTranscript();
            if (activeSourcesRef.current.size === 0 && statusRef.current !== 'disconnected') {
              setStatusSafe('listening');
            }
          } else if (msg.type === 'tool_executed') {
            finalizeInterimTranscript();
            setTranscript((prev) => [
              ...prev,
              {
                id: `tool-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                role: 'tool',
                text: msg.activityLog?.summary || `Executed ${msg.toolName}`,
                timestamp: new Date().toISOString(),
                toolName: msg.toolName,
                transactionId: msg.activityLog?.transaction_id,
                latencyMs: msg.latencyMs,
                status: msg.result?.success ? 'success' : msg.result?.needs_confirmation ? 'needs_confirmation' : 'error',
              },
            ]);
            if (msg.state) onDbUpdateRef.current(msg.state);
          } else if (msg.type === 'error') {
            setErrorMessage(msg.message || 'Live voice session error');
            setStatusSafe('error');
          }
        } catch {
          // ignore parse error
        }
      };

      ws.onerror = () => {
        setErrorMessage('WebSocket connection to BharatSathi Live server failed.');
        setStatusSafe('error');
      };

      ws.onclose = () => {
        if (statusRef.current !== 'disconnected' && statusRef.current !== 'error') {
          stopConversation();
        }
      };
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Microphone access denied or unavailable.';
      setErrorMessage(msg);
      stopConversation();
      setStatusSafe('error');
    }
  }, [
    appendOrMergeTranscript,
    finalizeInterimTranscript,
    language,
    playPcm24kChunk,
    setStatusSafe,
    stopAllPlayback,
    stopConversation,
  ]);

  const interruptAssistant = useCallback(() => {
    stopAllPlayback();
    finalizeInterimTranscript();
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
    }
    setStatusSafe('interrupted');
    setTimeout(() => {
      if (statusRef.current === 'interrupted') {
        setStatusSafe('listening');
      }
    }, 500);
  }, [finalizeInterimTranscript, setStatusSafe, stopAllPlayback]);

  // Inject text into live Gemini 3.8 session OR fallback to /api/agent/text
  const sendVoiceOrTextPrompt = useCallback(
    async (text: string, labelOverride?: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      finalizeInterimTranscript();
      setTranscript((prev) => [
        ...prev,
        {
          id: `user-txt-${Date.now()}`,
          role: 'user',
          text: trimmed,
          timestamp: new Date().toISOString(),
        },
      ]);

      // If Live WebSocket is active, inject directly so Gemini speaks back with audio!
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        stopAllPlayback();
        setStatusSafe('thinking');
        wsRef.current.send(JSON.stringify({ type: 'text', text: trimmed }));
        return;
      }

      // Otherwise execute via REST agent endpoint (/api/agent/text)
      setStatusSafe('thinking');
      setErrorMessage(null);
      try {
        const recentHistory = transcript
          .filter((t) => t.role === 'user' || t.role === 'assistant')
          .slice(-6)
          .map((t) => ({ role: t.role, text: t.text }));

        const res = await fetch('/api/agent/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: trimmed,
            language: labelOverride || language,
            history: recentHistory,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to process agent command');
        }

        setLastLatencyMs(data.latencyMs ?? null);

        if (Array.isArray(data.toolsExecuted)) {
          for (const t of data.toolsExecuted) {
            setTranscript((prev) => [
              ...prev,
              {
                id: `tool-rest-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                role: 'tool',
                text: t.activityLog?.summary || `Executed ${t.toolName}`,
                timestamp: new Date().toISOString(),
                toolName: t.toolName,
                transactionId: t.activityLog?.transaction_id,
                latencyMs: t.latencyMs,
                status: t.result?.success ? 'success' : t.result?.needs_confirmation ? 'needs_confirmation' : 'error',
              },
            ]);
          }
        }

        if (data.reply) {
          setTranscript((prev) => [
            ...prev,
            {
              id: `ast-rest-${Date.now()}`,
              role: 'assistant',
              text: data.reply,
              timestamp: new Date().toISOString(),
            },
          ]);
        }

        if (data.state) {
          onDbUpdateRef.current(data.state);
        }
        setStatusSafe('disconnected');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Agent request failed';
        setErrorMessage(msg);
        setStatusSafe('error');
      }
    },
    [finalizeInterimTranscript, language, setStatusSafe, stopAllPlayback, transcript]
  );

  const clearTranscript = useCallback(() => {
    setTranscript([]);
    setErrorMessage(null);
  }, []);

  useEffect(() => {
    return () => {
      stopConversation();
    };
  }, [stopConversation]);

  return {
    status,
    errorMessage,
    transcript,
    micLevel,
    speakerLevel,
    lastLatencyMs,
    isMicMuted,
    setIsMicMuted,
    startConversation,
    stopConversation,
    interruptAssistant,
    sendVoiceOrTextPrompt,
    clearTranscript,
  };
}
