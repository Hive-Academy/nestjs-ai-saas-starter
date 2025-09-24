/**
 * @fileoverview Tenant Validation Utilities - Validation logic for decorator operations
 */

import { Logger } from '@nestjs/common';
import type {
  TenantContext,
  TenantIsolationConfig,
} from '../../services/multi-tenant/tenant-context.service';

/**
 * Tenant validation error with detailed context
 */
export class TenantValidationError extends Error {
  constructor(
    message: string,
    public readonly validationType: string,
    public readonly tenantId?: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'TenantValidationError';
  }
}

/**
 * Validation rule interface
 */
export interface TenantValidationRule {
  readonly name: string;
  readonly priority: number;
  readonly description: string;
  validate(
    context: TenantContext,
    config: TenantIsolationConfig
  ): Promise<ValidationRuleResult>;
}

/**
 * Validation rule result
 */
export interface ValidationRuleResult {
  readonly isValid: boolean;
  readonly errors: string[];
  readonly warnings: string[];
  readonly metadata?: Record<string, unknown>;
}

/**
 * Cross-tenant operation validation context
 */
export interface CrossTenantValidationContext {
  readonly requestingTenant: TenantContext;
  readonly targetTenantIds: string[];
  readonly operation: string;
  readonly resource: string;
}

/**
 * Tenant ID format validation rule
 */
export class TenantIdFormatRule implements TenantValidationRule {
  readonly name = 'tenant-id-format';
  readonly priority = 100;
  readonly description = 'Validates tenant ID format and characters';

  async validate(context: TenantContext): Promise<ValidationRuleResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!context.tenantId) {
      errors.push('Tenant ID is required');
      return { isValid: false, errors, warnings };
    }

    // Length validation
    if (context.tenantId.length < 3) {
      errors.push('Tenant ID must be at least 3 characters long');
    }

    if (context.tenantId.length > 64) {
      errors.push('Tenant ID must not exceed 64 characters');
    }

    // Character validation
    if (!/^[a-zA-Z0-9_-]+$/.test(context.tenantId)) {
      errors.push(
        'Tenant ID can only contain alphanumeric characters, hyphens, and underscores'
      );
    }

    // Pattern validation
    if (context.tenantId.startsWith('-') || context.tenantId.endsWith('-')) {
      errors.push('Tenant ID cannot start or end with hyphens');
    }

    if (context.tenantId.includes('__') || context.tenantId.includes('--')) {
      warnings.push(
        'Tenant ID contains consecutive separators which may cause issues'
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        tenantIdLength: context.tenantId.length,
        validatedAt: new Date().toISOString(),
      },
    };
  }
}

/**
 * Tenant tier validation rule
 */
export class TenantTierRule implements TenantValidationRule {
  readonly name = 'tenant-tier';
  readonly priority = 80;
  readonly description = 'Validates tenant tier and associated permissions';

  async validate(
    context: TenantContext,
    config: TenantIsolationConfig
  ): Promise<ValidationRuleResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate tier exists
    if (context.tier && !['free', 'pro', 'enterprise'].includes(context.tier)) {
      errors.push(`Invalid tenant tier: ${context.tier}`);
    }

    // Enterprise tier validations
    if (context.tier === 'enterprise') {
      if (!context.organizationId) {
        warnings.push('Enterprise tier typically requires organization ID');
      }

      if (
        config.allowCrossTenant &&
        !context.permissions?.includes('cross-tenant-access')
      ) {
        warnings.push(
          'Enterprise tier with cross-tenant enabled should have cross-tenant permissions'
        );
      }
    }

    // Free tier validations
    if (context.tier === 'free') {
      if (context.permissions?.includes('admin')) {
        warnings.push('Free tier with admin permissions is unusual');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        tier: context.tier,
        hasOrgId: !!context.organizationId,
        permissionCount: context.permissions?.length || 0,
      },
    };
  }
}

/**
 * Tenant permissions validation rule
 */
export class TenantPermissionsRule implements TenantValidationRule {
  readonly name = 'tenant-permissions';
  readonly priority = 70;
  readonly description = 'Validates tenant permissions and authorization';

  async validate(context: TenantContext): Promise<ValidationRuleResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate permissions format
    if (context.permissions && !Array.isArray(context.permissions)) {
      errors.push('Tenant permissions must be an array');
      return { isValid: false, errors, warnings };
    }

    // Check for valid permission names
    const validPermissions = [
      'read',
      'write',
      'delete',
      'admin',
      'cross-tenant-access',
      'cross-tenant-read',
      'cross-tenant-write',
      'manage-collections',
      'manage-users',
      'view-metrics',
    ];

    const invalidPermissions =
      context.permissions?.filter((perm) => !validPermissions.includes(perm)) ||
      [];

    if (invalidPermissions.length > 0) {
      warnings.push(`Unknown permissions: ${invalidPermissions.join(', ')}`);
    }

    // Check for conflicting permissions
    if (context.permissions?.includes('admin') && context.tier === 'free') {
      warnings.push('Admin permissions on free tier may be restricted');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        permissionCount: context.permissions?.length || 0,
        hasAdminPermission: context.permissions?.includes('admin'),
        invalidPermissions,
      },
    };
  }
}

/**
 * Tenant metadata validation rule
 */
export class TenantMetadataRule implements TenantValidationRule {
  readonly name = 'tenant-metadata';
  readonly priority = 50;
  readonly description = 'Validates tenant metadata structure and content';

  async validate(context: TenantContext): Promise<ValidationRuleResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!context.metadata) {
      return { isValid: true, errors, warnings };
    }

    // Check metadata size
    const metadataString = JSON.stringify(context.metadata);
    if (metadataString.length > 10000) {
      warnings.push('Tenant metadata is very large and may impact performance');
    }

    // Check for sensitive data patterns
    const sensitiveKeys = ['password', 'secret', 'key', 'token', 'credential'];
    const metadataKeys = Object.keys(context.metadata).map((k) =>
      k.toLowerCase()
    );

    const hasSensitiveKeys = sensitiveKeys.some((sensitive) =>
      metadataKeys.some((key) => key.includes(sensitive))
    );

    if (hasSensitiveKeys) {
      warnings.push('Tenant metadata may contain sensitive information');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        metadataSize: metadataString.length,
        keyCount: Object.keys(context.metadata).length,
        hasSensitiveKeys,
      },
    };
  }
}

/**
 * Configuration validation rule
 */
export class ConfigurationValidationRule implements TenantValidationRule {
  readonly name = 'configuration';
  readonly priority = 90;
  readonly description = 'Validates isolation configuration consistency';

  async validate(
    context: TenantContext,
    config: TenantIsolationConfig
  ): Promise<ValidationRuleResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate naming strategy
    if (
      !['prefix', 'suffix', 'separate', 'custom'].includes(
        config.namingStrategy
      )
    ) {
      errors.push(`Invalid naming strategy: ${config.namingStrategy}`);
    }

    // Custom naming validation
    if (config.namingStrategy === 'custom' && !config.customNaming) {
      errors.push('Custom naming strategy requires customNaming function');
    }

    // Extraction strategy validation
    if (
      !['header', 'query', 'jwt', 'context', 'custom'].includes(
        config.tenantExtraction
      )
    ) {
      errors.push(
        `Invalid tenant extraction strategy: ${config.tenantExtraction}`
      );
    }

    // Custom extraction validation
    if (config.tenantExtraction === 'custom' && !config.customExtraction) {
      errors.push(
        'Custom extraction strategy requires customExtraction function'
      );
    }

    // Cache configuration validation
    if (
      config.enableTenantCaching &&
      config.cacheTtl &&
      config.cacheTtl < 1000
    ) {
      warnings.push('Very short cache TTL may impact performance');
    }

    // Default tenant validation
    if (config.defaultTenant && config.strictValidation) {
      warnings.push(
        'Default tenant with strict validation may cause security concerns'
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        namingStrategy: config.namingStrategy,
        extractionStrategy: config.tenantExtraction,
        strictValidation: config.strictValidation,
        cachingEnabled: config.enableTenantCaching,
      },
    };
  }
}

/**
 * Main tenant validator that manages validation rules
 */
export class TenantValidator {
  private readonly logger = new Logger(TenantValidator.name);
  private readonly rules = new Map<string, TenantValidationRule>();

  constructor() {
    // Register default validation rules
    this.registerRule(new TenantIdFormatRule());
    this.registerRule(new TenantTierRule());
    this.registerRule(new TenantPermissionsRule());
    this.registerRule(new TenantMetadataRule());
    this.registerRule(new ConfigurationValidationRule());
  }

  /**
   * Register a custom validation rule
   */
  registerRule(rule: TenantValidationRule): void {
    this.rules.set(rule.name, rule);
    this.logger.debug(`Registered tenant validation rule: ${rule.name}`);
  }

  /**
   * Remove a validation rule
   */
  removeRule(ruleName: string): void {
    this.rules.delete(ruleName);
    this.logger.debug(`Removed tenant validation rule: ${ruleName}`);
  }

  /**
   * Validate tenant context using all registered rules
   */
  async validateTenant(
    context: TenantContext,
    config: TenantIsolationConfig,
    options: { skipRules?: string[]; enabledRules?: string[] } = {}
  ): Promise<ValidationRuleResult> {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    const ruleResults: Record<string, ValidationRuleResult> = {};

    // Get active rules
    const activeRules = this.getActiveRules(options);

    // Run validation rules in priority order
    for (const rule of activeRules) {
      try {
        const result = await rule.validate(context, config);
        ruleResults[rule.name] = result;

        allErrors.push(...result.errors);
        allWarnings.push(...result.warnings);

        // Log rule failures
        if (!result.isValid) {
          this.logger.warn(
            `Tenant validation rule failed: ${rule.name} for tenant ${context.tenantId}`,
            { errors: result.errors }
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        const validationErrorMessage = `Validation rule ${rule.name} threw error: ${errorMessage}`;
        allErrors.push(validationErrorMessage);
        this.logger.error(validationErrorMessage, errorStack);
      }
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      metadata: {
        ruleResults,
        rulesExecuted: activeRules.map((r) => r.name),
        validatedAt: new Date().toISOString(),
        tenantId: context.tenantId,
      },
    };
  }

  /**
   * Validate cross-tenant operation
   */
  async validateCrossTenantOperation(
    validationContext: CrossTenantValidationContext
  ): Promise<ValidationRuleResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const { requestingTenant, targetTenantIds, operation, resource } =
      validationContext;

    // Check if requesting tenant has cross-tenant permissions
    if (!requestingTenant.permissions?.includes('cross-tenant-access')) {
      errors.push('Cross-tenant access denied: insufficient permissions');
    }

    // Check tenant tier requirements
    if (requestingTenant.tier !== 'enterprise') {
      errors.push('Cross-tenant access requires enterprise tier');
    }

    // Validate operation type
    const allowedOperations = ['read', 'write', 'admin'];
    if (!allowedOperations.includes(operation)) {
      errors.push(`Invalid cross-tenant operation: ${operation}`);
    }

    // Check target tenant limits
    if (targetTenantIds.length > 100) {
      errors.push('Cross-tenant operation cannot target more than 100 tenants');
    }

    // Validate target tenant IDs
    for (const tenantId of targetTenantIds) {
      if (!tenantId || tenantId.length < 3) {
        errors.push(`Invalid target tenant ID: ${tenantId}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        requestingTenant: requestingTenant.tenantId,
        targetTenantCount: targetTenantIds.length,
        operation,
        resource,
        validatedAt: new Date().toISOString(),
      },
    };
  }

  private getActiveRules(options: {
    skipRules?: string[];
    enabledRules?: string[];
  }): TenantValidationRule[] {
    let rules = Array.from(this.rules.values());

    // Filter by enabled rules if specified
    if (options.enabledRules) {
      rules = rules.filter((rule) => options.enabledRules!.includes(rule.name));
    }

    // Remove skipped rules
    if (options.skipRules) {
      rules = rules.filter((rule) => !options.skipRules!.includes(rule.name));
    }

    // Sort by priority (higher priority first)
    return rules.sort((a, b) => b.priority - a.priority);
  }
}
