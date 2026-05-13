import { SetMetadata } from '@nestjs/common';
import { DECORATOR_METADATA_KEYS } from '../../interfaces/decorator-metadata.interface';
import type { AuditLogConfig } from './interfaces';
import { getExecutionContext } from './auth.decorator';

// Utility functions
function generateAuditId(): string {
  return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function sanitizeForAudit(data: any): any {
  // Remove sensitive fields for audit logging
  if (typeof data === 'object' && data !== null) {
    const sanitized = { ...data };
    const sensitiveFields = ['password', 'token', 'secret', 'key'];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  return data;
}

// Audit logging
async function logAuditEvent(
  instance: any,
  event: any,
  config: AuditLogConfig
): Promise<void> {
  if (config.storage?.storeInNeo4j && instance.neo4jService) {
    try {
      // Use QueryBuilder for audit log creation
      const queryBuilder = instance.neo4jService.createQueryBuilder();

      queryBuilder.create('(audit:AuditLog)').set({
        'audit.id': '$auditId',
        'audit.event': '$event',
        'audit.methodName': '$methodName',
        'audit.timestamp': '$timestamp',
        'audit.userId': '$userId',
        'audit.tenantId': '$tenantId',
        'audit.details': '$details',
      });

      // Add parameters to QueryBuilder
      queryBuilder.getBindParam().add('auditId', event.auditId);
      queryBuilder.getBindParam().add('event', event.event);
      queryBuilder.getBindParam().add('methodName', event.methodName);
      queryBuilder
        .getBindParam()
        .add('timestamp', event.timestamp.toISOString());
      queryBuilder.getBindParam().add('userId', event.context?.userId);
      queryBuilder.getBindParam().add('tenantId', event.context?.tenantId);
      queryBuilder.getBindParam().add('details', JSON.stringify(event));

      await queryBuilder.run();
    } catch (error) {
      console.error('Failed to store audit log in Neo4j:', error);
    }
  }

  // Also log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔍 Audit: ${event.event} - ${event.methodName}`, event);
  }
}

/**
 * Audit logging decorator for compliance and monitoring
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class PaymentService {
 *   @AuditLog({
 *     enabled: true,
 *     logLevel: 'detailed',
 *     includeSensitiveData: false,
 *     customFields: {
 *       operation: 'payment_processing',
 *       riskLevel: 'high'
 *     },
 *     storage: {
 *       storeInNeo4j: true,
 *       retentionDays: 2555 // 7 years for financial compliance
 *     }
 *   })
 *   async processPayment(amount: number, customerId: string): Promise<PaymentResult> {
 *     // All access to this method is automatically audited
 *   }
 * }
 * ```
 */
export function AuditLog(config?: AuditLogConfig): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const finalConfig = config || {
      enabled: false,
      logLevel: 'minimal' as const,
    };
    SetMetadata(DECORATOR_METADATA_KEYS.AUDIT_LOG || 'AUDIT_LOG', finalConfig)(
      target,
      propertyKey,
      descriptor
    );

    const originalMethod = descriptor.value;
    const methodName = String(propertyKey);

    descriptor.value = async function (this: any, ...args: any[]) {
      const startTime = Date.now();
      const auditId = generateAuditId();

      try {
        // Log method entry
        if (finalConfig.enabled) {
          await logAuditEvent(
            this,
            {
              auditId,
              event: 'method_entry',
              methodName,
              timestamp: new Date(),
              parameters: finalConfig.includeSensitiveData
                ? args
                : sanitizeForAudit(args),
              context: await getExecutionContext(this),
              customFields: finalConfig.customFields,
            },
            finalConfig
          );
        }

        // Execute original method
        const result = await originalMethod.apply(this, args);

        // Log successful completion
        if (finalConfig.enabled && finalConfig.logSuccess !== false) {
          await logAuditEvent(
            this,
            {
              auditId,
              event: 'method_success',
              methodName,
              timestamp: new Date(),
              executionTime: Date.now() - startTime,
              result: finalConfig.includeSensitiveData
                ? result
                : sanitizeForAudit(result),
              context: await getExecutionContext(this),
              customFields: finalConfig.customFields,
            },
            finalConfig
          );
        }

        return result;
      } catch (error) {
        // Log failure
        if (finalConfig.enabled && finalConfig.logFailures !== false) {
          await logAuditEvent(
            this,
            {
              auditId,
              event: 'method_failure',
              methodName,
              timestamp: new Date(),
              executionTime: Date.now() - startTime,
              error: {
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
              },
              context: await getExecutionContext(this),
              customFields: finalConfig.customFields,
            },
            finalConfig
          );
        }

        throw error;
      }
    };

    return descriptor;
  };
}
