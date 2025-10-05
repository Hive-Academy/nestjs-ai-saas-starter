import { DynamicModule, Global, Module, Provider, Type } from '@nestjs/common';
import * as neo4j from 'neo4j-driver';
import {
  DEFAULT_NEO4J_CONFIG,
  NEO4J_DRIVER,
  NEO4J_OPTIONS,
} from './constants/constants';
import type {
  Neo4jModuleAsyncOptions,
  Neo4jModuleOptions,
  Neo4jModuleOptionsFactory,
} from './interfaces/neo4j-module-options.interface';
import type { NeogmaModuleOptions } from './neogma/neogma.interfaces';
import { NeogmaModule } from './neogma/neogma.module';
import { Neo4jCrudService } from './services/neo4j-crud.service';
import { NeogmaConnectionService } from './services/neogma-connection.service';
import { NeogmaMetricsService } from './services/neogma-metrics.service';
import { NeogmaService } from './services/neogma.service';
import { setNeo4jConfig } from './utils/neo4j-config.accessor';

// Modern QueryBuilder Services
import { NeogmaModelFactoryService } from './query-builder/neogma-model-factory.service';
import { NeogmaQueryBuilderService } from './query-builder/neogma-query-builder.service';
import { NeogmaQueryRunnerService } from './query-builder/neogma-query-runner.service';

// Modern Relationship Services (BaseRelationshipService is abstract and not registered)
import { RelationshipBulkOperationsService } from './repositories/relationship/relationship-bulk.service';
import { RelationshipCoreRepository } from './repositories/relationship/relationship-core.repository';
// ❌ REMOVED: RelationshipRepository - deprecated in favor of RelationshipCoreRepository

// Modern Graph Services (BaseGraphService is abstract and not registered)
import { GraphMetricsService } from './repositories/graph/graph-metrics.service';
import { GraphPatternService } from './repositories/graph/graph-pattern.service';
import { GraphTraversalService } from './repositories/graph/graph-traversal.service';

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
          options.uri,
          neo4j.auth.basic(options.username, options.password),
          config
        );
      },
      inject: [],
    };

    // Convert Neo4j options to Neogma format
    const neogmaOptions: NeogmaModuleOptions = {
      url: options.uri,
      username: options.username,
      password: options.password,
      database: options.database,
      config: options.config as NeogmaModuleOptions['config'],
    };

    const providers = [
      optionsProvider,
      driverProvider,
      // Primary Neogma services (CONSOLIDATED)
      NeogmaService,
      NeogmaMetricsService,
      NeogmaConnectionService,
      // CRUD Service (GLOBAL - for TypeORM-style repositories)
      Neo4jCrudService,
      // Modern QueryBuilder Services
      NeogmaQueryBuilderService,
      NeogmaQueryRunnerService,
      NeogmaModelFactoryService,
      // Modern Relationship Services
      RelationshipCoreRepository,
      RelationshipBulkOperationsService,
      // Modern Graph Services
      GraphTraversalService,
      GraphMetricsService,
      GraphPatternService,
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
        // CRUD Service (GLOBAL - for TypeORM-style repositories)
        Neo4jCrudService,
        // Modern QueryBuilder Services
        NeogmaQueryBuilderService,
        NeogmaQueryRunnerService,
        NeogmaModelFactoryService,
        // Modern Relationship Services
        RelationshipCoreRepository,
        RelationshipBulkOperationsService,

        // Modern Graph Services (ADDED - these were missing!)
        GraphTraversalService,
        GraphMetricsService,
        GraphPatternService,

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
            moduleOptions.uri,
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
      // CRUD Service (GLOBAL - for TypeORM-style repositories)
      Neo4jCrudService,
      // Modern QueryBuilder Services
      NeogmaQueryBuilderService,
      NeogmaQueryRunnerService,
      NeogmaModelFactoryService,
      // Modern Relationship Services
      RelationshipCoreRepository,
      RelationshipBulkOperationsService,
    ];

    // Create Neogma module async import
    const neogmaModuleImport = NeogmaModule.forRootAsync({
      useFactory: (moduleOptions: Neo4jModuleOptions): NeogmaModuleOptions => ({
        url: moduleOptions.uri,
        username: moduleOptions.username,
        password: moduleOptions.password,
        database: moduleOptions.database,
        config: moduleOptions.config as NeogmaModuleOptions['config'],
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
        // CRUD Service (GLOBAL - for TypeORM-style repositories)
        Neo4jCrudService,
        // Modern QueryBuilder Services
        NeogmaQueryBuilderService,
        NeogmaQueryRunnerService,
        NeogmaModelFactoryService,
        // Modern Relationship Services
        RelationshipCoreRepository,
        RelationshipBulkOperationsService,

        // Modern Graph Services (ADDED - these were missing!)
        GraphTraversalService,
        GraphMetricsService,
        GraphPatternService,

        // Core tokens
        NEO4J_DRIVER,
        NEO4J_OPTIONS,
      ],
    };
  }

  /**
   * Register repositories for specified entities (TypeORM-style pattern)
   *
   * This method auto-generates repositories for entities, eliminating the need for
   * manual repository boilerplate. It follows the same pattern as TypeORM/Mongoose.
   *
   * Features:
   * - Auto-generates Neo4jRepository<T> for each entity
   * - Uses factory pattern with NeogmaService + Neo4jCrudService injection
   * - Supports custom repository override via provider pattern
   * - Full type safety with TypeScript generics
   *
   * @param entities - Array of entity classes decorated with @Neo4jEntity
   * @returns DynamicModule with auto-generated repository providers
   *
   * @example
   * ```typescript
   * // Simple CRUD (auto-generated repository)
   * @Module({
   *   imports: [
   *     Neo4jModule.forRoot({ ... }),
   *     Neo4jModule.forFeature([User, Post, Comment])
   *   ]
   * })
   * export class UserModule {}
   *
   * @Injectable()
   * export class UserService {
   *   constructor(
   *     @InjectRepository(User)
   *     private userRepo: Neo4jRepository<User>
   *   ) {}
   *
   *   async getUser(id: string) {
   *     return this.userRepo.findById(id);  // Auto-generated method
   *   }
   * }
   *
   * // Custom repository (override auto-generated)
   * @Injectable()
   * export class UserRepository extends Neo4jRepository<User> {
   *   constructor(neogma: NeogmaService, crud: Neo4jCrudService) {
   *     super(User, 'User', neogma, crud);
   *   }
   *
   *   async findByEmail(email: string) {
   *     // Custom method
   *   }
   * }
   *
   * @Module({
   *   imports: [Neo4jModule.forFeature([User])],
   *   providers: [
   *     {
   *       provide: getRepositoryToken(User),
   *       useClass: UserRepository  // Override with custom repository
   *     }
   *   ]
   * })
   * export class UserModule {}
   * ```
   */
  public static forFeature(entities: Type<unknown>[]): DynamicModule {
    const providers: Provider[] = entities.map((entity) => {
      // Dynamically import at runtime to avoid circular dependencies
      const {
        getRepositoryToken,
        getEntityLabel,
      } = require('./decorators/inject-repository.decorator');
      const { Neo4jRepository } = require('./repositories/neo4j-repository');

      const label = getEntityLabel(entity);
      const repositoryToken = getRepositoryToken(entity);

      return {
        provide: repositoryToken,
        useFactory: (neogma: NeogmaService, crud: Neo4jCrudService) => {
          return new Neo4jRepository(entity, label, neogma, crud);
        },
        inject: [NeogmaService, Neo4jCrudService],
      };
    });

    return {
      module: Neo4jModule,
      providers,
      exports: providers,
    };
  }

  /**
   * Register specific database sessions (DEPRECATED - use forFeature(entities) instead)
   *
   * This method is deprecated in favor of the TypeORM-style forFeature(entities) pattern.
   * It will be removed in v3.0.0.
   *
   * @deprecated Use forFeature(entities: Type<any>[]) for repository auto-generation
   */
  public static forFeatureDatabases(databases: string[]): DynamicModule {
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
    if (!config.uri || typeof config.uri !== 'string') {
      errors.push('Neo4j URI is required and must be a string');
      throw new Neo4jConfigurationError(
        'Neo4j URI is required and must be a string',
        'uri',
        config.uri,
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
    if (!isValidNeo4jUrl(config.uri)) {
      errors.push('Invalid Neo4j URI format');
      throw new Neo4jConfigurationError(
        'Invalid Neo4j URI format',
        'uri',
        config.uri,
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
}
