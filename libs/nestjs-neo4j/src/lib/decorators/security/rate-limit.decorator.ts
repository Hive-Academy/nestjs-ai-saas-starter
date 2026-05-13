import { SetMetadata } from '@nestjs/common';
import { DECORATOR_METADATA_KEYS } from '../../interfaces/decorator-metadata.interface';
import type { RateLimitConfig } from './interfaces';
import { getExecutionContext } from './auth.decorator';

// Rate limiting utilities
async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<boolean> {
  // Simplified rate limiting - in real implementation would use Redis
  return true; // Allow for now
}

async function incrementRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<void> {
  // Increment counter in Redis or memory store
}

function generateRateLimitKey(
  context: any,
  config: RateLimitConfig,
  methodName: string
): string {
  const parts = [methodName];

  if (config.keyGenerator?.includeUserId && context.userId) {
    parts.push(`user:${context.userId}`);
  }

  if (config.keyGenerator?.includeTenantId && context.tenantId) {
    parts.push(`tenant:${context.tenantId}`);
  }

  if (config.keyGenerator?.includeIpAddress && context.ipAddress) {
    parts.push(`ip:${context.ipAddress}`);
  }

  return parts.join(':');
}

/**
 * Rate limiting decorator for API protection
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class SearchService {
 *   @RateLimit({
 *     requests: 100,
 *     window: '1m',
 *     strategy: 'sliding-window',
 *     keyGenerator: {
 *       includeUserId: true,
 *       includeTenantId: true
 *     },
 *     onLimitExceeded: {
 *       response: 'throw',
 *       message: 'Search rate limit exceeded',
 *       retryAfter: 60
 *     }
 *   })
 *   async searchUsers(query: string): Promise<User[]> {
 *     // Rate limited per user per tenant
 *   }
 * }
 * ```
 */
export function RateLimit(config?: RateLimitConfig): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const finalConfig = config || {
      requests: 100,
      window: '1m',
      strategy: 'fixed-window' as const,
    };
    SetMetadata(
      DECORATOR_METADATA_KEYS.RATE_LIMIT || 'RATE_LIMIT',
      finalConfig
    )(target, propertyKey, descriptor);

    const originalMethod = descriptor.value;
    const methodName = String(propertyKey);

    descriptor.value = async function (this: any, ...args: any[]) {
      // Generate rate limiting key
      const context = await getExecutionContext(this);
      const rateLimitKey = generateRateLimitKey(
        context,
        finalConfig,
        methodName
      );

      // Check rate limit
      const isAllowed = await checkRateLimit(rateLimitKey, finalConfig);

      if (!isAllowed) {
        const error = new Error(
          finalConfig.onLimitExceeded?.message ||
            `Rate limit exceeded for ${methodName}`
        );
        (error as any).code = 'RATE_LIMIT_EXCEEDED';
        (error as any).retryAfter =
          finalConfig.onLimitExceeded?.retryAfter || 60;
        throw error;
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Increment rate limit counter
      await incrementRateLimit(rateLimitKey, finalConfig);

      return result;
    };

    return descriptor;
  };
}
