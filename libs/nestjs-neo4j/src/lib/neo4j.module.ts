import { DynamicModule, Module, Global, Provider, Type } from '@nestjs/common';
import * as neo4j from 'neo4j-driver';
import { NEO4J_OPTIONS, NEO4J_DRIVER, DEFAULT_NEO4J_CONFIG } from './constants';
// Inline interfaces due to build configuration issue
interface Neo4jModuleOptions {
  url: string;
  username: string;
  password: string;
  database?: string;
  config?: {
    logger?: (message: string) => void;
    disableLosslessIntegers?: boolean;
    encrypted?: boolean;
    maxConnectionLifetime?: number;
    maxConnectionPoolSize?: number;
    connectionAcquisitionTimeout?: number;
    disableDriverMetrics?: boolean;
  };
  healthCheck?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

interface Neo4jModuleOptionsFactory {
  createNeo4jOptions(): Promise<Neo4jModuleOptions> | Neo4jModuleOptions;
}

interface Neo4jModuleAsyncOptions {
  name?: string;
  imports?: any[];
  useExisting?: any;
  useClass?: any;
  useFactory?: (
    ...args: any[]
  ) => Promise<Neo4jModuleOptions> | Neo4jModuleOptions;
  inject?: any[];
}
import { NeogmaService } from './core/neogma.service';
import { NeogmaMetricsService } from './services/neogma-metrics.service';
import { NeogmaConnectionService } from './services/neogma-connection.service';
import { setNeo4jConfig } from './utils/neo4j-config.accessor';
import { NeogmaModule } from './neogma/neogma.module';

// Modern QueryBuilder Services
import { NeogmaQueryBuilderService } from './query-builder/neogma-query-builder.service';
import { NeogmaQueryRunnerService } from './query-builder/neogma-query-runner.service';
import { NeogmaModelFactoryService } from './query-builder/neogma-model-factory.service';

// Modern Relationship Services (BaseRelationshipService is abstract and not registered)
import { RelationshipCoreRepository } from './repositories/relationship/relationship-core.repository';
import { RelationshipBulkOperationsService } from './repositories/relationship/relationship-bulk.service';
import { RelationshipRepository } from './repositories/relationship/relationship-repository';

// Modern Graph Services (BaseGraphService is abstract and not registered)
import { GraphTraversalService } from './repositories/graph/graph-traversal.service';
import { GraphMetricsService } from './repositories/graph/graph-metrics.service';
import { GraphPatternService } from './repositories/graph/graph-pattern.service';
import { GraphRepository } from './repositories/graph-repository';
@Global()
@Module({})
export class Neo4jModule {
  /**
   * Register Neo4j module synchronously with Neogma integration
   */
  public static forRoot(options: Neo4jModuleOptions): DynamicModule {
    // CRITICAL: Validate configuration before proceeding
    validateNeo4jConfig(options);

    // Store config for decorator access
    setNeo4jConfig(options);

    const optionsProvider: Provider = {
      provide: NEO4J_OPTIONS,
      useValue: options,
    };

    const driverProvider: Provider = {
      provide: NEO4J_DRIVER,
      useFactory: () => {
        const config = {
          ...DEFAULT_NEO4J_CONFIG,
          ...options.config,
        };

        return neo4j.driver(
          options.url,
          neo4j.auth.basic(options.username, options.password),
          config
        );
      },
      inject: [],
    };

    // Convert Neo4j options to Neogma format
    const neogmaOptions = {
      url: options.url,
      username: options.username,
      password: options.password,
      database: options.database,
      config: options.config,
    };

    const providers = [
      optionsProvider,
      driverProvider,
      // Primary Neogma services (CONSOLIDATED)
      NeogmaService,
      NeogmaMetricsService,
      NeogmaConnectionService,
      // Modern QueryBuilder Services
      NeogmaQueryBuilderService,
      NeogmaQueryRunnerService,
      NeogmaModelFactoryService,
      // Modern Relationship Services
      RelationshipCoreRepository,
      RelationshipBulkOperationsService,
      // Legacy Facade (for backward compatibility)
      RelationshipRepository,
      // Modern Graph Services
      GraphTraversalService,
      GraphMetricsService,
      GraphPatternService,
      // Legacy Graph Facade (for backward compatibility)
      GraphRepository,
    ];

    return {
      module: Neo4jModule,
      imports: [NeogmaModule.forRoot(neogmaOptions)],
      providers,
      exports: [
        // Primary Neogma services (CONSOLIDATED)
        NeogmaService,
        NeogmaMetricsService,
        NeogmaConnectionService,
        // Modern QueryBuilder Services
        NeogmaQueryBuilderService,
        NeogmaQueryRunnerService,
        NeogmaModelFactoryService,
        // Modern Relationship Services
        RelationshipCoreRepository,
        RelationshipBulkOperationsService,
        // Legacy Facade (for backward compatibility)
        RelationshipRepository,
        // Core tokens
        NEO4J_DRIVER,
        NEO4J_OPTIONS,
      ],
    };
  }

  /**
   * Register Neo4j module asynchronously
   */
  public static forRootAsync(options: Neo4jModuleAsyncOptions): DynamicModule {
    const providers = [
      ...this.createAsyncProviders(options),
      {
        provide: NEO4J_DRIVER,
        useFactory: (moduleOptions: Neo4jModuleOptions) => {
          const config = {
            ...DEFAULT_NEO4J_CONFIG,
            ...moduleOptions.config,
          };

          return neo4j.driver(
            moduleOptions.url,
            neo4j.auth.basic(moduleOptions.username, moduleOptions.password),
            config
          );
        },
        inject: [NEO4J_OPTIONS],
      },
      // Primary Neogma services
      NeogmaService,
      NeogmaMetricsService,
      NeogmaConnectionService,
      // Modern QueryBuilder Services
      NeogmaQueryBuilderService,
      NeogmaQueryRunnerService,
      NeogmaModelFactoryService,
      // Modern Relationship Services
      RelationshipCoreRepository,
      RelationshipBulkOperationsService,
      // Legacy Facade (for backward compatibility)
      RelationshipRepository,
    ];

    // Create Neogma module async import
    const neogmaModuleImport = NeogmaModule.forRootAsync({
      useFactory: (moduleOptions: Neo4jModuleOptions) => ({
        url: moduleOptions.url,
        username: moduleOptions.username,
        password: moduleOptions.password,
        database: moduleOptions.database,
        config: moduleOptions.config,
      }),
      inject: [NEO4J_OPTIONS],
    });

    return {
      module: Neo4jModule,
      imports: [neogmaModuleImport, ...(options.imports ?? [])],
      providers,
      exports: [
        // Primary Neogma services (CONSOLIDATED)
        NeogmaService,
        NeogmaMetricsService,
        NeogmaConnectionService,
        // Modern QueryBuilder Services
        NeogmaQueryBuilderService,
        NeogmaQueryRunnerService,
        NeogmaModelFactoryService,
        // Modern Relationship Services
        RelationshipCoreRepository,
        RelationshipBulkOperationsService,
        // Legacy Facade (for backward compatibility)
        RelationshipRepository,
        // Core tokens
        NEO4J_DRIVER,
        NEO4J_OPTIONS,
      ],
    };
  }

  /**
   * Register specific database sessions
   */
  public static forFeature(databases: string[]): DynamicModule {
    const providers = databases.map((database) => ({
      provide: `NEO4J_SESSION_${database}`,
      useFactory: (driver: neo4j.Driver) => {
        return driver.session({ database });
      },
      inject: [NEO4J_DRIVER],
    }));

    return {
      module: Neo4jModule,
      providers,
      exports: providers,
    };
  }

  private static createAsyncProviders(
    options: Neo4jModuleAsyncOptions
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }

    const useClass = options.useClass as Type<Neo4jModuleOptionsFactory>;

    return [
      this.createAsyncOptionsProvider(options),
      {
        provide: useClass,
        useClass,
      },
    ];
  }

  private static createAsyncOptionsProvider(
    options: Neo4jModuleAsyncOptions
  ): Provider {
    if (options.useFactory) {
      return {
        provide: NEO4J_OPTIONS,
        useFactory: async (...args) => {
          const config = await options.useFactory!(...args);

          // CRITICAL: Validate configuration before proceeding
          validateNeo4jConfig(config);

          // Store config for decorator access
          setNeo4jConfig(config);

          return config;
        },
        inject: options.inject ?? [],
      };
    }

    const inject = [
      (options.useClass ??
        options.useExisting) as Type<Neo4jModuleOptionsFactory>,
    ];

    return {
      provide: NEO4J_OPTIONS,
      useFactory: async (optionsFactory: Neo4jModuleOptionsFactory) => {
        const config = await optionsFactory.createNeo4jOptions();

        // CRITICAL: Validate configuration before proceeding
        validateNeo4jConfig(config);

        // Store config for decorator access
        setNeo4jConfig(config);

        return config;
      },
      inject,
    };
  }
}

/**
 * Configuration validation error with detailed context
 */
export class Neo4jConfigurationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: unknown,
    public readonly suggestion?: string
  ) {
    super(message);
    this.name = 'Neo4jConfigurationError';
  }
}

/**
 * Comprehensive Neo4j configuration validation
 *
 * This function implements enterprise-grade configuration validation
 * to prevent runtime failures and security issues.
 *
 * @param config - Neo4j module configuration to validate
 * @throws Neo4jConfigurationError - When configuration is invalid
 */
function validateNeo4jConfig(config: Neo4jModuleOptions): void {
  const errors: string[] = [];

  try {
    // 1. REQUIRED FIELDS VALIDATION
    if (!config.url || typeof config.url !== 'string') {
      errors.push('Neo4j URL is required and must be a string');
      throw new Neo4jConfigurationError(
        'Neo4j URL is required and must be a string',
        'url',
        config.url,
        'Use format: bolt://localhost:7687 or neo4j://localhost:7687'
      );
    }

    if (!config.username || typeof config.username !== 'string') {
      errors.push('Neo4j username is required and must be a string');
      throw new Neo4jConfigurationError(
        'Neo4j username is required and must be a string',
        'username',
        config.username,
        'Provide the database username (e.g., "neo4j")'
      );
    }

    if (!config.password || typeof config.password !== 'string') {
      errors.push('Neo4j password is required and must be a string');
      throw new Neo4jConfigurationError(
        'Neo4j password is required and must be a string',
        'password',
        config.password ? '[REDACTED]' : config.password,
        'Provide the database password'
      );
    }

    // 2. URL FORMAT VALIDATION
    if (!isValidNeo4jUrl(config.url)) {
      errors.push('Invalid Neo4j URL format');
      throw new Neo4jConfigurationError(
        'Invalid Neo4j URL format',
        'url',
        config.url,
        'Use bolt://, neo4j://, or neo4j+s:// protocol with valid hostname and port'
      );
    }

    // 3. SECURITY VALIDATIONS
    if (config.password.length < 3) {
      errors.push('Neo4j password is too short (minimum 3 characters)');
      throw new Neo4jConfigurationError(
        'Neo4j password is too short (minimum 3 characters)',
        'password',
        '[REDACTED]',
        'Use a stronger password for security'
      );
    }

    // Check for default/weak passwords
    const weakPasswords = ['password', '123456', 'admin', 'neo4j', 'test'];
    if (weakPasswords.includes(config.password.toLowerCase())) {
      console.warn(
        '⚠️  WARNING: Using a weak password for Neo4j. Consider using a stronger password for production.'
      );
    }

    // 4. OPTIONAL FIELD VALIDATIONS
    if (config.database !== undefined) {
      if (
        typeof config.database !== 'string' ||
        config.database.trim() === ''
      ) {
        errors.push('Database name must be a non-empty string when provided');
        throw new Neo4jConfigurationError(
          'Database name must be a non-empty string when provided',
          'database',
          config.database,
          'Use a valid database name or omit for default database'
        );
      }
    }

    // 5. CONFIG OBJECT VALIDATIONS
    if (config.config) {
      validateDriverConfig(config.config);
    }

    // 6. RETRY CONFIGURATION VALIDATIONS
    if (config.retryAttempts !== undefined) {
      if (
        !Number.isInteger(config.retryAttempts) ||
        config.retryAttempts < 0 ||
        config.retryAttempts > 10
      ) {
        throw new Neo4jConfigurationError(
          'Retry attempts must be an integer between 0 and 10',
          'retryAttempts',
          config.retryAttempts,
          'Use a reasonable number of retry attempts (0-10)'
        );
      }
    }

    if (config.retryDelay !== undefined) {
      if (
        !Number.isInteger(config.retryDelay) ||
        config.retryDelay < 0 ||
        config.retryDelay > 30000
      ) {
        throw new Neo4jConfigurationError(
          'Retry delay must be an integer between 0 and 30000 milliseconds',
          'retryDelay',
          config.retryDelay,
          'Use a reasonable retry delay (0-30000ms)'
        );
      }
    }

    // 7. HEALTH CHECK VALIDATION
    if (
      config.healthCheck !== undefined &&
      typeof config.healthCheck !== 'boolean'
    ) {
      throw new Neo4jConfigurationError(
        'Health check option must be a boolean',
        'healthCheck',
        config.healthCheck,
        'Use true or false for health check configuration'
      );
    }

    // Log successful validation
    console.log('✅ Neo4j configuration validation passed');
  } catch (error) {
    if (error instanceof Neo4jConfigurationError) {
      throw error;
    }

    // Handle unexpected validation errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Neo4jConfigurationError(
      `Configuration validation failed: ${errorMessage}`,
      'unknown',
      config,
      'Check your configuration object for invalid values'
    );
  }
}

/**
 * Validate Neo4j URL format
 *
 * @param url - URL to validate
 * @returns boolean - Whether URL is valid
 */
function isValidNeo4jUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Check protocol
    const validProtocols = ['bolt:', 'neo4j:', 'neo4j+s:', 'bolt+s:'];
    if (!validProtocols.includes(parsed.protocol)) {
      return false;
    }

    // Check hostname
    if (!parsed.hostname || parsed.hostname.trim() === '') {
      return false;
    }

    // Check port (optional, but if provided must be valid)
    if (parsed.port) {
      const portNum = parseInt(parsed.port, 10);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Validate driver configuration object
 *
 * @param config - Driver configuration to validate
 */
function validateDriverConfig(config: Neo4jModuleOptions['config']): void {
  if (!config || typeof config !== 'object') {
    return; // Optional config can be undefined
  }

  // Validate connection pool settings
  if (config.maxConnectionPoolSize !== undefined) {
    if (
      !Number.isInteger(config.maxConnectionPoolSize) ||
      config.maxConnectionPoolSize < 1 ||
      config.maxConnectionPoolSize > 1000
    ) {
      throw new Neo4jConfigurationError(
        'Max connection pool size must be an integer between 1 and 1000',
        'config.maxConnectionPoolSize',
        config.maxConnectionPoolSize,
        'Use a reasonable pool size for your application load'
      );
    }
  }

  if (config.maxConnectionLifetime !== undefined) {
    if (
      !Number.isInteger(config.maxConnectionLifetime) ||
      config.maxConnectionLifetime < 1000
    ) {
      throw new Neo4jConfigurationError(
        'Max connection lifetime must be at least 1000 milliseconds',
        'config.maxConnectionLifetime',
        config.maxConnectionLifetime,
        'Use a reasonable connection lifetime (e.g., 1800000 for 30 minutes)'
      );
    }
  }

  if (config.connectionAcquisitionTimeout !== undefined) {
    if (
      !Number.isInteger(config.connectionAcquisitionTimeout) ||
      config.connectionAcquisitionTimeout < 1000
    ) {
      throw new Neo4jConfigurationError(
        'Connection acquisition timeout must be at least 1000 milliseconds',
        'config.connectionAcquisitionTimeout',
        config.connectionAcquisitionTimeout,
        'Use a reasonable timeout value (e.g., 60000 for 1 minute)'
      );
    }
  }

  // Validate boolean settings with type safety
  if (
    config.disableLosslessIntegers !== undefined &&
    typeof config.disableLosslessIntegers !== 'boolean'
  ) {
    throw new Neo4jConfigurationError(
      'disableLosslessIntegers must be a boolean value',
      'config.disableLosslessIntegers',
      config.disableLosslessIntegers,
      'Use true or false'
    );
  }

  if (config.encrypted !== undefined && typeof config.encrypted !== 'boolean') {
    throw new Neo4jConfigurationError(
      'encrypted must be a boolean value',
      'config.encrypted',
      config.encrypted,
      'Use true or false'
    );
  }

  if (
    config.disableDriverMetrics !== undefined &&
    typeof config.disableDriverMetrics !== 'boolean'
  ) {
    throw new Neo4jConfigurationError(
      'disableDriverMetrics must be a boolean value',
      'config.disableDriverMetrics',
      config.disableDriverMetrics,
      'Use true or false'
    );
  }

  // Validate logger function
  if (config.logger !== undefined && typeof config.logger !== 'function') {
    throw new Neo4jConfigurationError(
      'Logger must be a function',
      'config.logger',
      typeof config.logger,
      'Provide a function that accepts a string parameter'
    );
  }
}
