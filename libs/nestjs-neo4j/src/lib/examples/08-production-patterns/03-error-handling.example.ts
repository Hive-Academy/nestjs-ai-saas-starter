/**
 * Example: Error Handling and Resilience - Production-Grade Error Management
 * Category: 08-production-patterns
 * Features: Circuit breaker patterns, retry logic, graceful degradation, error reporting, recovery mechanisms
 */
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { Retry } from '@nestjs/terminus';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Neo4jHealthService,
  Neo4jConnectionService,
  Neo4jMetricsService,
  FindOne,
  FindMany,
  CreateEntity,
  UpdateEntity,
  DeleteEntity
} from '../../../index';

// ===== Error Types and Interfaces =====

enum ErrorCategory {
  CONNECTION = 'CONNECTION',
  QUERY = 'QUERY',
  TIMEOUT = 'TIMEOUT',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  RESOURCE_EXHAUSTION = 'RESOURCE_EXHAUSTION',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE'
}

enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

interface ErrorContext {
  category: ErrorCategory;
  severity: ErrorSeverity;
  operation: string;
  userId?: string;
  sessionId?: string;
  queryText?: string;
  parameters?: Record<string, any>;
  timestamp: Date;
  retryAttempt?: number;
  stackTrace?: string;
  metadata?: Record<string, any>;
}

interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: Date | null;
  nextRetryTime: Date | null;
  successCount: number;
  totalRequests: number;
}

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryableErrors: ErrorCategory[];
}

interface FallbackStrategy {
  strategy: 'cache' | 'default' | 'graceful_degradation' | 'alternative_service';
  configuration?: Record<string, any>;
}

// ===== Production Error Handler Service =====

/**
 * Enterprise-grade error handling and resilience service
 * Implements circuit breakers, retry logic, and graceful degradation patterns
 */
@Injectable()
export class Neo4jProductionErrorHandler {
  private readonly logger = new Logger(Neo4jProductionErrorHandler.name);

  // Circuit breaker states for different operations
  private circuitBreakers = new Map<string, CircuitBreakerState>();

  // Error tracking and analytics
  private errorHistory: ErrorContext[] = [];
  private errorPatterns = new Map<string, number>();

  // Configuration
  private readonly circuitBreakerConfig = {
    failureThreshold: 5,      // Open circuit after 5 failures
    recoveryTimeout: 60000,   // 1 minute recovery timeout
    successThreshold: 3       // Close circuit after 3 successes
  };

  private readonly retryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitter: true,
    retryableErrors: [
      ErrorCategory.CONNECTION,
      ErrorCategory.TIMEOUT,
      ErrorCategory.RESOURCE_EXHAUSTION
    ]
  };

  constructor(
    private readonly healthService: Neo4jHealthService,
    private readonly connectionService: Neo4jConnectionService,
    private readonly metricsService: Neo4jMetricsService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  // ===== Core Error Handling Methods =====

  /**
   * Execute operation with comprehensive error handling
   */
  async executeWithResilience<T>(
    operation: () => Promise<T>,
    operationName: string,
    context: Partial<ErrorContext> = {},
    fallbackStrategy?: FallbackStrategy
  ): Promise<T> {
    const fullContext: ErrorContext = {
      category: ErrorCategory.QUERY,
      severity: ErrorSeverity.MEDIUM,
      operation: operationName,
      timestamp: new Date(),
      ...context
    };

    // Check circuit breaker
    if (this.isCircuitOpen(operationName)) {
      return this.handleCircuitOpenScenario(operationName, fullContext, fallbackStrategy);
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        fullContext.retryAttempt = attempt;

        // Execute the operation
        const result = await this.executeOperation(operation, fullContext);

        // Record success for circuit breaker
        this.recordSuccess(operationName);

        // Log successful retry if applicable
        if (attempt > 1) {
          this.logger.log(`Operation ${operationName} succeeded on attempt ${attempt}`);
        }

        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const errorCategory = this.categorizeError(lastError);

        fullContext.category = errorCategory;
        fullContext.severity = this.determineSeverity(lastError, errorCategory);

        // Record error for analytics
        this.recordError({
          ...fullContext,
          stackTrace: lastError.stack,
          metadata: { attempt, maxAttempts: this.retryConfig.maxAttempts }
        });

        // Record failure for circuit breaker
        this.recordFailure(operationName);

        // Check if error is retryable
        if (!this.isRetryableError(errorCategory) || attempt === this.retryConfig.maxAttempts) {
          break;
        }

        // Calculate delay for next attempt
        const delay = this.calculateRetryDelay(attempt);
        this.logger.warn(
          `Operation ${operationName} failed (attempt ${attempt}/${this.retryConfig.maxAttempts}), retrying in ${delay}ms`,
          { error: lastError.message, context: fullContext }
        );

        await this.delay(delay);
      }
    }

    // All attempts failed, try fallback strategy
    if (fallbackStrategy) {
      try {
        const fallbackResult = await this.executeFallbackStrategy(fallbackStrategy, fullContext);
        this.logger.warn(`Operation ${operationName} failed, using fallback strategy: ${fallbackStrategy.strategy}`);
        return fallbackResult;
      } catch (fallbackError) {
        this.logger.error(`Fallback strategy also failed for ${operationName}`, fallbackError);
      }
    }

    // Final error handling
    throw this.createStructuredError(lastError!, fullContext);
  }

  // ===== Circuit Breaker Implementation =====

  private isCircuitOpen(operationName: string): boolean {
    const state = this.getCircuitBreakerState(operationName);

    if (!state.isOpen) {
      return false;
    }

    // Check if recovery timeout has passed
    if (state.nextRetryTime && new Date() > state.nextRetryTime) {
      // Move to half-open state
      state.isOpen = false;
      state.nextRetryTime = null;
      this.logger.log(`Circuit breaker for ${operationName} moved to half-open state`);
      return false;
    }

    return true;
  }

  private getCircuitBreakerState(operationName: string): CircuitBreakerState {
    if (!this.circuitBreakers.has(operationName)) {
      this.circuitBreakers.set(operationName, {
        isOpen: false,
        failureCount: 0,
        lastFailureTime: null,
        nextRetryTime: null,
        successCount: 0,
        totalRequests: 0
      });
    }
    return this.circuitBreakers.get(operationName)!;
  }

  private recordSuccess(operationName: string): void {
    const state = this.getCircuitBreakerState(operationName);
    state.successCount++;
    state.totalRequests++;
    state.failureCount = 0; // Reset failure count on success

    // Close circuit if we have enough successes
    if (state.isOpen && state.successCount >= this.circuitBreakerConfig.successThreshold) {
      state.isOpen = false;
      state.nextRetryTime = null;
      this.logger.log(`Circuit breaker for ${operationName} closed after ${state.successCount} successes`);

      this.eventEmitter.emit('circuit-breaker.closed', { operationName, state });
    }
  }

  private recordFailure(operationName: string): void {
    const state = this.getCircuitBreakerState(operationName);
    state.failureCount++;
    state.totalRequests++;
    state.lastFailureTime = new Date();
    state.successCount = 0; // Reset success count on failure

    // Open circuit if failure threshold is reached
    if (state.failureCount >= this.circuitBreakerConfig.failureThreshold) {
      state.isOpen = true;
      state.nextRetryTime = new Date(Date.now() + this.circuitBreakerConfig.recoveryTimeout);

      this.logger.error(`Circuit breaker for ${operationName} opened after ${state.failureCount} failures`);

      this.eventEmitter.emit('circuit-breaker.opened', { operationName, state });
    }
  }

  // ===== Error Classification =====

  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();

    // Connection errors
    if (message.includes('connection') || message.includes('econnrefused') || message.includes('timeout')) {
      return ErrorCategory.CONNECTION;
    }

    // Authentication errors
    if (message.includes('authentication') || message.includes('unauthorized') || message.includes('invalid credentials')) {
      return ErrorCategory.AUTHENTICATION;
    }

    // Authorization errors
    if (message.includes('permission') || message.includes('access denied') || message.includes('forbidden')) {
      return ErrorCategory.AUTHORIZATION;
    }

    // Timeout errors
    if (message.includes('timeout') || message.includes('timed out')) {
      return ErrorCategory.TIMEOUT;
    }

    // Resource exhaustion
    if (message.includes('pool') || message.includes('resources') || message.includes('limit exceeded')) {
      return ErrorCategory.RESOURCE_EXHAUSTION;
    }

    // Query errors
    if (message.includes('cypher') || message.includes('syntax') || message.includes('query')) {
      return ErrorCategory.QUERY;
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return ErrorCategory.VALIDATION;
    }

    return ErrorCategory.BUSINESS_LOGIC;
  }

  private determineSeverity(error: Error, category: ErrorCategory): ErrorSeverity {
    // Critical errors that require immediate attention
    if (category === ErrorCategory.CONNECTION || category === ErrorCategory.AUTHENTICATION) {
      return ErrorSeverity.CRITICAL;
    }

    // High priority errors
    if (category === ErrorCategory.RESOURCE_EXHAUSTION || category === ErrorCategory.AUTHORIZATION) {
      return ErrorSeverity.HIGH;
    }

    // Medium priority errors
    if (category === ErrorCategory.TIMEOUT || category === ErrorCategory.QUERY) {
      return ErrorSeverity.MEDIUM;
    }

    return ErrorSeverity.LOW;
  }

  // ===== Retry Logic =====

  private isRetryableError(category: ErrorCategory): boolean {
    return this.retryConfig.retryableErrors.includes(category);
  }

  private calculateRetryDelay(attempt: number): number {
    let delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1);

    // Apply maximum delay limit
    delay = Math.min(delay, this.retryConfig.maxDelay);

    // Add jitter to avoid thundering herd
    if (this.retryConfig.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    return Math.floor(delay);
  }

  // ===== Fallback Strategies =====

  private async executeFallbackStrategy<T>(
    strategy: FallbackStrategy,
    context: ErrorContext
  ): Promise<T> {
    switch (strategy.strategy) {
      case 'cache':
        return this.executeCacheFallback(context);

      case 'default':
        return this.executeDefaultValueFallback(strategy.configuration);

      case 'graceful_degradation':
        return this.executeGracefulDegradation(context);

      case 'alternative_service':
        return this.executeAlternativeService(strategy.configuration);

      default:
        throw new Error(`Unknown fallback strategy: ${strategy.strategy}`);
    }
  }

  private async executeCacheFallback<T>(context: ErrorContext): Promise<T> {
    // Try to retrieve from cache if available
    // This is a placeholder - implement with your caching solution
    this.logger.log(`Attempting cache fallback for operation: ${context.operation}`);
    throw new Error('Cache fallback not available');
  }

  private executeDefaultValueFallback<T>(configuration?: Record<string, any>): T {
    const defaultValue = configuration?.defaultValue;
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error('No default value configured for fallback');
  }

  private async executeGracefulDegradation<T>(context: ErrorContext): Promise<T> {
    // Return minimal functionality or empty results
    this.logger.log(`Executing graceful degradation for operation: ${context.operation}`);

    // Example: Return empty results for query operations
    if (context.operation.includes('find') || context.operation.includes('query')) {
      return [] as unknown as T;
    }

    throw new Error('Graceful degradation not applicable for this operation');
  }

  private async executeAlternativeService<T>(configuration?: Record<string, any>): Promise<T> {
    // Use alternative service or data source
    this.logger.log(`Attempting alternative service fallback`);

    // This would be implemented with actual alternative service calls
    throw new Error('Alternative service not configured');
  }

  // ===== Error Recording and Analytics =====

  private recordError(context: ErrorContext): void {
    // Store error for analytics
    this.errorHistory.push(context);

    // Update error patterns
    const pattern = `${context.category}:${context.operation}`;
    this.errorPatterns.set(pattern, (this.errorPatterns.get(pattern) || 0) + 1);

    // Keep only last 1000 errors to prevent memory growth
    if (this.errorHistory.length > 1000) {
      this.errorHistory.splice(0, this.errorHistory.length - 1000);
    }

    // Record error in metrics service
    if (this.metricsService) {
      this.metricsService.recordConnectionAttempt(false);
    }

    // Emit error event for external monitoring
    this.eventEmitter.emit('error.recorded', context);

    // Log structured error
    this.logger.error(
      `[${context.severity}] ${context.category} error in ${context.operation}`,
      {
        context,
        pattern,
        totalOccurrences: this.errorPatterns.get(pattern)
      }
    );
  }

  private createStructuredError(originalError: Error, context: ErrorContext): Error {
    const structuredError = new Error(
      `${context.category} error in ${context.operation}: ${originalError.message}`
    );

    // Attach context information
    (structuredError as any).context = context;
    (structuredError as any).category = context.category;
    (structuredError as any).severity = context.severity;
    (structuredError as any).originalError = originalError;

    return structuredError;
  }

  // ===== Utility Methods =====

  private async executeOperation<T>(
    operation: () => Promise<T>,
    context: ErrorContext
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await operation();

      const duration = Date.now() - startTime;
      if (duration > 5000) { // Log slow operations
        this.logger.warn(`Slow operation detected: ${context.operation} took ${duration}ms`);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      context.metadata = { ...context.metadata, duration };
      throw error;
    }
  }

  private async handleCircuitOpenScenario<T>(
    operationName: string,
    context: ErrorContext,
    fallbackStrategy?: FallbackStrategy
  ): Promise<T> {
    const state = this.getCircuitBreakerState(operationName);

    this.logger.warn(
      `Circuit breaker is open for ${operationName}. Next retry: ${state.nextRetryTime}`
    );

    if (fallbackStrategy) {
      return this.executeFallbackStrategy(fallbackStrategy, context);
    }

    throw new HttpException(
      `Service temporarily unavailable for ${operationName}`,
      HttpStatus.SERVICE_UNAVAILABLE
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ===== Public API for Monitoring =====

  getCircuitBreakerStates(): Map<string, CircuitBreakerState> {
    return new Map(this.circuitBreakers);
  }

  getErrorAnalytics(): {
    totalErrors: number;
    errorsByCategory: Record<ErrorCategory, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    topErrorPatterns: Array<{ pattern: string; count: number }>;
    recentErrors: ErrorContext[];
  } {
    const errorsByCategory: Record<ErrorCategory, number> = {} as any;
    const errorsBySeverity: Record<ErrorSeverity, number> = {} as any;

    this.errorHistory.forEach(error => {
      errorsByCategory[error.category] = (errorsByCategory[error.category] || 0) + 1;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
    });

    const topErrorPatterns = Array.from(this.errorPatterns.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([pattern, count]) => ({ pattern, count }));

    return {
      totalErrors: this.errorHistory.length,
      errorsByCategory,
      errorsBySeverity,
      topErrorPatterns,
      recentErrors: this.errorHistory.slice(-20)
    };
  }

  clearErrorHistory(): void {
    this.errorHistory = [];
    this.errorPatterns.clear();
    this.circuitBreakers.clear();
    this.logger.log('Error history and circuit breaker states cleared');
  }
}

// ===== Resilient Service Implementation =====

/**
 * Example service implementing resilient operations with decorators
 */
@Injectable()
export class ResilientUserService {
  private readonly logger = new Logger(ResilientUserService.name);

  constructor(
    private readonly errorHandler: Neo4jProductionErrorHandler
  ) {}

  // ===== Read Operations with Resilience =====

  /**
   * Find user with comprehensive error handling and fallback
   */
  async findUserSafely(userId: string): Promise<any | null> {
    return this.errorHandler.executeWithResilience(
      () => this.findUserById(userId),
      'findUser',
      {
        category: ErrorCategory.QUERY,
        severity: ErrorSeverity.MEDIUM,
        userId,
        queryText: 'MATCH (u:User {id: $userId}) RETURN u'
      },
      {
        strategy: 'graceful_degradation'
      }
    );
  }

  @FindOne(() => Object, {
    cache: '5m',
    retry: 3,
    safe: true,
    description: 'Find user by ID with caching'
  })
  private async findUserById(userId: string): Promise<any> {
    // Implementation handled by decorator
    return null; // Placeholder
  }

  /**
   * Find users with pagination and error recovery
   */
  async findUsersWithResilience(
    page = 1,
    limit = 20
  ): Promise<{ users: any[]; total: number; hasErrors: boolean }> {
    let hasErrors = false;

    const users = await this.errorHandler.executeWithResilience(
      () => this.findUsersInternal({ skip: (page - 1) * limit, limit }),
      'findUsers',
      {
        category: ErrorCategory.QUERY,
        severity: ErrorSeverity.MEDIUM,
        metadata: { page, limit }
      },
      {
        strategy: 'default',
        configuration: { defaultValue: [] }
      }
    ).catch(error => {
      hasErrors = true;
      this.logger.error('Failed to load users, returning empty list', error);
      return [];
    });

    const total = await this.errorHandler.executeWithResilience(
      () => this.countUsersInternal(),
      'countUsers',
      {
        category: ErrorCategory.QUERY,
        severity: ErrorSeverity.LOW
      },
      {
        strategy: 'default',
        configuration: { defaultValue: 0 }
      }
    ).catch(error => {
      hasErrors = true;
      this.logger.error('Failed to count users', error);
      return 0;
    });

    return { users, total, hasErrors };
  }

  @FindMany(() => Object, {
    cache: '2m',
    description: 'Find users with pagination'
  })
  private async findUsersInternal(options: { skip: number; limit: number }): Promise<any[]> {
    // Implementation handled by decorator
    return []; // Placeholder
  }

  @CountEntities(() => Object, {
    cache: '5m',
    description: 'Count total users'
  })
  private async countUsersInternal(): Promise<number> {
    // Implementation handled by decorator
    return 0; // Placeholder
  }

  // ===== Write Operations with Resilience =====

  /**
   * Create user with comprehensive error handling
   */
  async createUserSafely(userData: any): Promise<{
    user: any | null;
    success: boolean;
    error?: string;
  }> {
    try {
      const user = await this.errorHandler.executeWithResilience(
        () => this.createUserInternal(userData),
        'createUser',
        {
          category: ErrorCategory.BUSINESS_LOGIC,
          severity: ErrorSeverity.HIGH,
          metadata: { email: userData.email }
        }
        // No fallback for create operations - they should either succeed or fail
      );

      return {
        user,
        success: true
      };

    } catch (error) {
      return {
        user: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  @CreateEntity(() => Object, {
    retry: 3,
    safe: true,
    description: 'Create new user'
  })
  private async createUserInternal(userData: any): Promise<any> {
    // Validate data before creation
    this.validateUserData(userData);

    // Implementation handled by decorator
    return null; // Placeholder
  }

  /**
   * Update user with validation and error recovery
   */
  async updateUserSafely(
    userId: string,
    updateData: any
  ): Promise<{
    user: any | null;
    success: boolean;
    error?: string;
  }> {
    try {
      // First check if user exists
      const existingUser = await this.findUserSafely(userId);
      if (!existingUser) {
        return {
          user: null,
          success: false,
          error: 'User not found'
        };
      }

      const user = await this.errorHandler.executeWithResilience(
        () => this.updateUserInternal(userId, updateData),
        'updateUser',
        {
          category: ErrorCategory.BUSINESS_LOGIC,
          severity: ErrorSeverity.MEDIUM,
          userId,
          metadata: { updateFields: Object.keys(updateData) }
        }
      );

      return {
        user,
        success: true
      };

    } catch (error) {
      return {
        user: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  @UpdateEntity(() => Object, {
    retry: 3,
    safe: true,
    description: 'Update existing user'
  })
  private async updateUserInternal(userId: string, updateData: any): Promise<any> {
    // Validate update data
    this.validateUpdateData(updateData);

    // Implementation handled by decorator
    return null; // Placeholder
  }

  /**
   * Delete user with comprehensive safety checks
   */
  async deleteUserSafely(userId: string): Promise<{
    success: boolean;
    error?: string;
    warnings?: string[];
  }> {
    const warnings: string[] = [];

    try {
      // Safety check: verify user exists
      const user = await this.findUserSafely(userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Safety check: warn about potential data loss
      if (user.role === 'admin') {
        warnings.push('Deleting admin user - ensure another admin exists');
      }

      const deleted = await this.errorHandler.executeWithResilience(
        () => this.deleteUserInternal(userId),
        'deleteUser',
        {
          category: ErrorCategory.BUSINESS_LOGIC,
          severity: ErrorSeverity.HIGH,
          userId,
          metadata: { userRole: user.role }
        }
      );

      return {
        success: deleted,
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        warnings: warnings.length > 0 ? warnings : undefined
      };
    }
  }

  @DeleteEntity(() => Object, {
    detach: true,
    retry: 2,
    safe: true,
    description: 'Delete user and relationships'
  })
  private async deleteUserInternal(userId: string): Promise<boolean> {
    // Implementation handled by decorator
    return false; // Placeholder
  }

  // ===== Validation Methods =====

  private validateUserData(userData: any): void {
    if (!userData.email) {
      throw new Error('Email is required');
    }

    if (!userData.email.includes('@')) {
      throw new Error('Invalid email format');
    }

    if (!userData.firstName || !userData.lastName) {
      throw new Error('First name and last name are required');
    }
  }

  private validateUpdateData(updateData: any): void {
    if (updateData.email && !updateData.email.includes('@')) {
      throw new Error('Invalid email format');
    }

    const allowedFields = ['firstName', 'lastName', 'email', 'isActive', 'role'];
    const invalidFields = Object.keys(updateData).filter(key => !allowedFields.includes(key));

    if (invalidFields.length > 0) {
      throw new Error(`Invalid update fields: ${invalidFields.join(', ')}`);
    }
  }

  // ===== Batch Operations with Resilience =====

  /**
   * Batch create users with individual error handling
   */
  async createUsersBatch(usersData: any[]): Promise<{
    successful: any[];
    failed: Array<{ data: any; error: string }>;
    summary: {
      total: number;
      successful: number;
      failed: number;
      circuitBreakerTrips: number;
    };
  }> {
    const successful: any[] = [];
    const failed: Array<{ data: any; error: string }> = [];
    let circuitBreakerTrips = 0;

    for (const userData of usersData) {
      const result = await this.createUserSafely(userData);

      if (result.success && result.user) {
        successful.push(result.user);
      } else {
        failed.push({
          data: userData,
          error: result.error || 'Unknown error'
        });

        if (result.error?.includes('temporarily unavailable')) {
          circuitBreakerTrips++;
        }
      }
    }

    return {
      successful,
      failed,
      summary: {
        total: usersData.length,
        successful: successful.length,
        failed: failed.length,
        circuitBreakerTrips
      }
    };
  }
}

// ===== Usage Examples =====

export const ERROR_HANDLING_USAGE_EXAMPLE = `
// app.module.ts
import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    // ... other modules
  ],
  providers: [
    Neo4jProductionErrorHandler,
    ResilientUserService,
  ],
})
export class AppModule {}

// Usage in controller
@Controller('users')
export class UsersController {
  constructor(
    private readonly userService: ResilientUserService,
    private readonly errorHandler: Neo4jProductionErrorHandler
  ) {}

  @Get(':id')
  async getUser(@Param('id') id: string) {
    const user = await this.userService.findUserSafely(id);
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  @Get('analytics/errors')
  async getErrorAnalytics() {
    return this.errorHandler.getErrorAnalytics();
  }

  @Get('monitoring/circuit-breakers')
  async getCircuitBreakerStatus() {
    const states = this.errorHandler.getCircuitBreakerStates();
    return Object.fromEntries(states);
  }
}

// Error event handling
@Injectable()
export class ErrorMonitoringService {
  @OnEvent('error.recorded')
  handleErrorRecorded(context: ErrorContext) {
    if (context.severity === ErrorSeverity.CRITICAL) {
      // Send immediate alert
      this.sendCriticalAlert(context);
    }
  }

  @OnEvent('circuit-breaker.opened')
  handleCircuitBreakerOpened({ operationName, state }) {
    // Trigger operational response
    this.handleSystemDegradation(operationName, state);
  }
}
`;

export default Neo4jProductionErrorHandler;
