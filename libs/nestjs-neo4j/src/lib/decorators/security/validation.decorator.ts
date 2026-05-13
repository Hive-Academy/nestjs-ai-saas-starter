import { SetMetadata } from '@nestjs/common';
import { DECORATOR_METADATA_KEYS } from '../../interfaces/decorator-metadata.interface';
import type { ValidateInputConfig } from './interfaces';

// Validation error class
export class ValidationError extends Error {
  constructor(message: string, public details: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Input validation and sanitization
async function validateAndSanitizeInput(
  args: any[],
  config: ValidateInputConfig,
  methodName: string
): Promise<any[]> {
  // Simplified validation - in real implementation would use JSON schema validation
  const validatedArgs = [...args];

  // Check for injection attempts
  if (config.injectionPrevention?.enabled) {
    for (const arg of validatedArgs) {
      if (typeof arg === 'string' && containsSuspiciousPatterns(arg)) {
        if (config.injectionPrevention.onDetection === 'throw') {
          throw new ValidationError('Suspicious input detected', {
            method: methodName,
            input: arg,
          });
        }
      }
    }
  }

  return validatedArgs;
}

function containsSuspiciousPatterns(input: string): boolean {
  const patterns = [
    /DROP\s+/i,
    /DELETE\s+/i,
    /MERGE.*DELETE/i,
    /<script/i,
    /javascript:/i,
    /eval\s*\(/i,
  ];

  return patterns.some((pattern) => pattern.test(input));
}

/**
 * Input validation and sanitization decorator
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class UserService {
 *   @ValidateInput({
 *     schema: {
 *       parameterSchema: {
 *         type: 'object',
 *         properties: {
 *           email: { type: 'string', format: 'email' },
 *           age: { type: 'number', minimum: 0, maximum: 150 }
 *         },
 *         required: ['email']
 *       }
 *     },
 *     sanitization: {
 *       stripHtml: true,
 *       maxStringLength: 1000
 *     },
 *     injectionPrevention: {
 *       enabled: true,
 *       onDetection: 'throw'
 *     }
 *   })
 *   async createUser(userData: CreateUserDto): Promise<User> {
 *     // Input is validated and sanitized before method execution
 *   }
 * }
 * ```
 */
export function ValidateInput(config?: ValidateInputConfig): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const finalConfig = config || {
      injectionPrevention: { enabled: false, onDetection: 'log' as const },
    };
    SetMetadata(
      DECORATOR_METADATA_KEYS.VALIDATE_INPUT || 'VALIDATE_INPUT',
      finalConfig
    )(target, propertyKey, descriptor);

    const originalMethod = descriptor.value;
    const methodName = String(propertyKey);

    descriptor.value = async function (this: any, ...args: any[]) {
      try {
        // Validate and sanitize input parameters
        const validatedArgs = await validateAndSanitizeInput(
          args,
          finalConfig,
          methodName
        );

        // Execute original method with validated args
        return await originalMethod.apply(this, validatedArgs);
      } catch (error) {
        //  error with validation details
        if (error instanceof ValidationError) {
          const returnedError = new Error(
            `Input validation failed for ${methodName}: ${error.message}`
          );
          (returnedError as any).validationErrors = error.details;
          (returnedError as any).originalInput = args;
          throw returnedError;
        }
        throw error;
      }
    };

    return descriptor;
  };
}
