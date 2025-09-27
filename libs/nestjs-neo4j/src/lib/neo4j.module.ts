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
import { Neo4jService } from './services/neo4j.service';
import { NeogmaService } from './core/neogma.service';
import { NeogmaMetricsService } from './services/neogma-metrics.service';
import { NeogmaConnectionService } from './services/neogma-connection.service';
import { setNeo4jConfig } from './utils/neo4j-config.accessor';
import { NeogmaModule } from './neogma/neogma.module';
@Global()
@Module({})
export class Neo4jModule {
  /**
   * Register Neo4j module synchronously with Neogma integration
   */
  public static forRoot(options: Neo4jModuleOptions): DynamicModule {
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
      // Modern Neogma services (PRIMARY)
      NeogmaService,
      NeogmaMetricsService,
      NeogmaConnectionService,
      // Legacy service for gradual migration
      Neo4jService,
    ];

    return {
      module: Neo4jModule,
      imports: [NeogmaModule.forRoot(neogmaOptions)],
      providers,
      exports: [
        // Modern Neogma services (PRIMARY) - Use these for new development
        NeogmaService,
        NeogmaMetricsService,
        NeogmaConnectionService,
        // Legacy service for gradual migration
        Neo4jService,
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
      NeogmaService,
      NeogmaMetricsService,
      NeogmaConnectionService,
      Neo4jService,
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
        // Modern Neogma services (PRIMARY) - Use these for new development
        NeogmaService,
        NeogmaMetricsService,
        NeogmaConnectionService,
        // Legacy service for gradual migration
        Neo4jService,
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

        // Store config for decorator access
        setNeo4jConfig(config);

        return config;
      },
      inject,
    };
  }
}
