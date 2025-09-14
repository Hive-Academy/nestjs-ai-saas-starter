import { Injectable, Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

/**
 * Decoded auth token shape (extend as needed without breaking callers)
 */
export interface StreamingAuthClaims {
  sub?: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  [key: string]: any; // Intentional index signature for forward-compatible custom claims (not `any` leakage—value type purposely broad)
}

export interface VerifyTokenOptions {
  required?: boolean; // If true, absence of token is an error
  secret?: string; // Override configured secret
  clockToleranceSec?: number; // Allowable clock skew
}

export class StreamingAuthError extends Error {
  constructor(message: string, public readonly code = 'AUTH_ERROR') {
    super(message);
  }
}

interface CachedTokenEntry {
  claims: StreamingAuthClaims;
  expiresAt: number; // epoch ms
}

@Injectable()
export class StreamingAuthService {
  private readonly logger = new Logger(StreamingAuthService.name);
  private readonly cache = new Map<string, CachedTokenEntry>();
  private defaultTTLms = 60_000; // 1 minute cache unless token exp sooner

  configure(options: { defaultTTLms?: number } = {}): void {
    if (options.defaultTTLms && options.defaultTTLms > 0) {
      this.defaultTTLms = options.defaultTTLms;
    }
  }

  /**
   * Verify a JWT (or return claims from cache if still valid).
   * Throws StreamingAuthError on failure when required.
   */
  verify(
    token: string | undefined,
    options: VerifyTokenOptions = {}
  ): StreamingAuthClaims | null {
    if (!token) {
      if (options.required) {
        throw new StreamingAuthError(
          'Missing authentication token',
          'TOKEN_MISSING'
        );
      }
      return null;
    }

    const secret = options.secret;
    if (!secret) {
      // If auth not strictly required, allow pass-through without secret
      if (options.required) {
        throw new StreamingAuthError(
          'JWT secret not configured',
          'SECRET_MISSING'
        );
      }
      return null;
    }

    const cached = this.cache.get(token);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      return cached.claims;
    }

    try {
      const decoded = jwt.verify(token, secret, {
        clockTolerance: options.clockToleranceSec,
      }) as StreamingAuthClaims;

      const expMs = decoded.exp ? decoded.exp * 1000 : now + this.defaultTTLms;
      const ttl = Math.min(this.defaultTTLms, expMs - now);
      if (ttl > 0) {
        this.cache.set(token, { claims: decoded, expiresAt: now + ttl });
      }
      return decoded;
    } catch (error: any) {
      if (options.required) {
        throw new StreamingAuthError(
          error.message || 'Token verification failed',
          'TOKEN_INVALID'
        );
      }
      this.logger.debug(`Optional token verification failed: ${error.message}`);
      return null;
    }
  }

  /** Manually clear cache (for tests / revocation events). */
  clearCache(): void {
    this.cache.clear();
  }
}
