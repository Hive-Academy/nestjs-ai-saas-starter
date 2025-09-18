import { Injectable } from '@nestjs/common';

export interface RateLimitConfig {
  tokensPerInterval: number; // refill amount per interval
  intervalMs: number; // interval length
  burst: number; // max bucket size
  enabled: boolean;
}

interface BucketState {
  tokens: number;
  lastRefill: number; // epoch ms
  hits: number;
  denied: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  resetInMs: number;
  reason?: string;
}

@Injectable()
export class RateLimiterService {
  private config: RateLimitConfig = {
    tokensPerInterval: 50,
    intervalMs: 10_000,
    burst: 100,
    enabled: true,
  };
  private readonly buckets = new Map<string, BucketState>();

  configure(partial: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  /**
   * Acquire permission for an action under a named key (connection, execution, etc.)
   */
  allow(key: string, cost = 1): RateLimitDecision {
    if (!this.config.enabled) {
      return { allowed: true, remaining: this.config.burst, resetInMs: 0 };
    }
    const now = Date.now();
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = {
        tokens: this.config.burst,
        lastRefill: now,
        hits: 0,
        denied: 0,
      };
      this.buckets.set(key, bucket);
    }

    this.refill(bucket, now);

    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;
      bucket.hits++;
      return {
        allowed: true,
        remaining: bucket.tokens,
        resetInMs: this.timeToFull(bucket, now),
      };
    }

    bucket.denied++;
    return {
      allowed: false,
      remaining: bucket.tokens,
      resetInMs: this.timeToNextToken(bucket, now),
      reason: 'RATE_LIMIT_EXCEEDED',
    };
  }

  getBucketSnapshot(key: string): BucketState | undefined {
    const b = this.buckets.get(key);
    return b ? { ...b } : undefined;
  }

  private refill(bucket: BucketState, now: number): void {
    if (now <= bucket.lastRefill) return;
    const intervals = Math.floor(
      (now - bucket.lastRefill) / this.config.intervalMs
    );
    if (intervals <= 0) return;
    bucket.tokens = Math.min(
      this.config.burst,
      bucket.tokens + intervals * this.config.tokensPerInterval
    );
    bucket.lastRefill += intervals * this.config.intervalMs;
  }

  private timeToNextToken(bucket: BucketState, now: number): number {
    const elapsed = now - bucket.lastRefill;
    const untilNext = this.config.intervalMs - elapsed;
    return Math.max(0, untilNext);
  }

  private timeToFull(bucket: BucketState, now: number): number {
    if (bucket.tokens === this.config.burst) return 0;
    // Rough estimate: tokens needed / per interval * intervalMs
    const tokensNeeded = this.config.burst - bucket.tokens;
    const intervalsNeeded = Math.ceil(
      tokensNeeded / this.config.tokensPerInterval
    );
    return intervalsNeeded * this.config.intervalMs;
  }
}
