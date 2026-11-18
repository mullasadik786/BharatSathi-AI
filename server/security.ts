import type { NextFunction, Request, Response } from 'express';

/**
 * Strips ASCII control characters and angle brackets to mitigate XSS/injection
 * while preserving Telugu, Hindi (Devanagari), and multilingual Unicode characters.
 */
export function sanitizeText(value: unknown, maxLength = 400): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Validates positive bounded currency values in INR.
 */
export function validatePositiveAmount(value: unknown): { ok: true; amount: number } | { ok: false; error: string } {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0 || num > 10_000_000) {
    return {
      ok: false,
      error: 'Amount must be a positive number between ₹1 and ₹1,00,00,000.',
    };
  }
  return { ok: true, amount: Math.round(num * 100) / 100 };
}

/**
 * Express middleware setting defensive security headers on every response.
 */
export function securityHeadersMiddleware(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'microphone=(self), geolocation=()');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  next();
}

interface RateBucket {
  timestamps: number[];
}

/**
 * Sliding-window in-memory rate limiter for Express routes.
 */
export function createRateLimiter(options: { windowMs: number; maxRequests: number }) {
  const buckets = new Map<string, RateBucket>();

  const middleware = (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const cutoff = now - options.windowMs;

    const bucket = buckets.get(key) ?? { timestamps: [] };
    bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);

    if (bucket.timestamps.length >= options.maxRequests) {
      const retryAfterSec = Math.max(1, Math.ceil((bucket.timestamps[0] + options.windowMs - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      res.status(429).json({
        success: false,
        error: `Too many requests. Please retry after ${retryAfterSec} seconds.`,
      });
      return;
    }

    bucket.timestamps.push(now);
    buckets.set(key, bucket);

    // Periodic cleanup of stale buckets
    if (buckets.size > 500) {
      for (const [ip, b] of buckets.entries()) {
        if (b.timestamps.every((t) => t <= cutoff)) {
          buckets.delete(ip);
        }
      }
    }

    next();
  };

  return { middleware, _buckets: buckets };
}

export interface SecurityPostureSnapshot {
  server_side_api_key_isolation: boolean;
  http_security_headers_enabled: boolean;
  rate_limiting_enabled: boolean;
  input_sanitization_enabled: boolean;
  websocket_max_payload_bytes: number;
  destructive_action_confirmation_required: boolean;
  profile_update_permission_required: boolean;
  voice_consent_enforced: boolean;
}

export function getSecurityPosture(): SecurityPostureSnapshot {
  return {
    server_side_api_key_isolation: true,
    http_security_headers_enabled: true,
    rate_limiting_enabled: true,
    input_sanitization_enabled: true,
    websocket_max_payload_bytes: 256 * 1024,
    destructive_action_confirmation_required: true,
    profile_update_permission_required: true,
    voice_consent_enforced: true,
  };
}
