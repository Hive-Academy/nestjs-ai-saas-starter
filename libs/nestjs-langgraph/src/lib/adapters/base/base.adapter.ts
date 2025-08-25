import { Logger } from '@nestjs/common';
import type {
  IModuleAdapter,
  AdapterStatus,
} from '../interfaces/adapter.interface';

/**
 * Abstract base class for all module adapters
 *
 * Provides common functionality and enforces consistent patterns across
 * all adapters in the LangGraph ecosystem. Follows the Template Method
 * pattern to ensure proper structure while allowing adapter-specific logic.
 *
 * Key Benefits:
 * - Consistent logging across all adapters
 * - Standardized error handling patterns
 * - Enforced diagnostic methods
 * - Common fallback behavior
 *
 * @template TConfig Configuration type for the adapter
 * @template TResult Return type for adapter operations
 */
export abstract class BaseModuleAdapter<TConfig = unknown, TResult = unknown>
  implements IModuleAdapter<TConfig, TResult>
{
  protected readonly logger: Logger;

  /**
   * Name of the service that this adapter manages
   * Used for error messages and logging context
   */
  protected abstract readonly serviceName: string;

  constructor() {
    // Use the concrete class name for the logger
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Check if enterprise functionality is available
   * Must be implemented by each adapter based on its specific dependencies
   */
  abstract isEnterpriseAvailable(): boolean;

  /**
   * Get comprehensive adapter status
   * Must be implemented by each adapter with its specific diagnostic data
   */
  abstract getAdapterStatus(): AdapterStatus;

  /**
   * Handle fallback scenarios when enterprise services are unavailable
   *
   * Provides consistent error messaging and logging for failed operations.
   * Subclasses can override this to provide custom fallback behavior.
   *
   * @param error The error that triggered the fallback
   * @param operation Description of the operation that failed
   * @throws Error with descriptive message
   */
  protected handleFallback(error: Error, operation: string): never {
    const errorMessage = `${operation} requires ${this.serviceName}. ${error.message}`;
    this.logger.error(`Fallback triggered for ${operation}:`, error.stack);
    throw new Error(errorMessage);
  }

  /**
   * Handle enterprise service unavailable scenarios
   *
   * Provides consistent error messaging when enterprise services are not installed.
   *
   * @param operation Description of the operation being attempted
   * @param moduleName Name of the required enterprise module
   * @throws Error with installation instructions
   */
  protected handleEnterpriseUnavailable(
    operation: string,
    moduleName?: string
  ): never {
    const module =
      moduleName || `@libs/langgraph-modules/${this.serviceName.toLowerCase()}`;
    const errorMessage = `${operation} requires enterprise ${this.serviceName} module. Install ${module}`;

    this.logger.warn(`Enterprise service unavailable for ${operation}`);
    throw new Error(errorMessage);
  }

  /**
   * Log successful enterprise service usage
   *
   * Provides consistent logging when enterprise services are successfully used.
   *
   * @param operation Description of the successful operation
   */
  protected logEnterpriseUsage(operation: string): void {
    this.logger.log(
      `Using enterprise ${this.serviceName} module for ${operation}`
    );
  }

  /**
   * Log fallback to basic implementation
   *
   * Provides consistent logging when falling back to basic implementations.
   *
   * @param operation Description of the operation using fallback
   * @param reason Optional reason for the fallback
   */
  protected logFallbackUsage(operation: string, reason?: string): void {
    const message = reason
      ? `Using fallback ${this.serviceName} implementation for ${operation}: ${reason}`
      : `Using fallback ${this.serviceName} implementation for ${operation}`;

    this.logger.log(message);
  }

  /**
   * Safely execute an operation with error handling
   *
   * Template method that handles common error scenarios and logging.
   * Subclasses can use this for consistent error handling patterns.
   *
   * @param operation Description of the operation
   * @param fn Function to execute
   * @param fallbackFn Optional fallback function
   * @returns Result of the operation or fallback
   */
  protected async safeExecute<T>(
    operation: string,
    fn: () => Promise<T> | T,
    fallbackFn?: () => Promise<T> | T
  ): Promise<T> {
    try {
      const result = await fn();
      this.logger.debug(`Successfully executed ${operation}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to execute ${operation}:`, error);

      if (fallbackFn) {
        try {
          this.logger.log(`Attempting fallback for ${operation}`);
          const fallbackResult = await fallbackFn();
          this.logger.log(`Fallback succeeded for ${operation}`);
          return fallbackResult;
        } catch (fallbackError) {
          this.logger.error(
            `Fallback also failed for ${operation}:`,
            fallbackError
          );
          throw fallbackError;
        }
      }

      throw error;
    }
  }

  /**
   * Validate configuration before processing
   *
   * Template method for configuration validation.
   * Subclasses should override to implement specific validation logic.
   *
   * @param config Configuration to validate
   * @throws Error if configuration is invalid
   */
  protected validateConfig(config: TConfig): void {
    if (config === null || config === undefined) {
      throw new Error(`Configuration is required for ${this.serviceName}`);
    }
  }

  /**
   * Get basic capabilities that all adapters provide
   * Subclasses should extend this list with their specific capabilities
   */
  protected getBaseCapabilities(): string[] {
    return ['diagnostic_status', 'error_handling', 'logging'];
  }
}
