import { DynamicModule, Module, Global, Provider, Type } from '@nestjs/common';
import * as neo4j from 'neo4j-driver';
import { NEO4J_OPTIONS, NEO4J_DRIVER, DEFAULT_NEO4J_CONFIG } from './constants';
import {
  Neo4jModuleOptions,
  Neo4jModuleAsyncOptions,
  Neo4jModuleOptionsFactory,
} from './interfaces/neo4j-module-options.interface';
import { Neo4jService } from './services/neo4j.service';
import { Neo4jConnectionService } from './services/neo4j-connection.service';
import { Neo4jHealthService } from './services/neo4j-health.service';
import { setNeo4jConfig } from './utils/neo4j-config.accessor';
@Global()
@Module({})
export class Neo4jModule {
  /**
   * Register Neo4j module synchronously
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
          options.uri,
          neo4j.auth.basic(options.username, options.password),
          config
        );
      },
      inject: [],
    };

    const providers = [
      optionsProvider,
      driverProvider,
      Neo4jService,
      Neo4jConnectionService,
      Neo4jHealthService,
    ];

    return {
      module: Neo4jModule,
      providers,
      exports: [
        Neo4jService,
        Neo4jConnectionService,
        Neo4jHealthService,
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
      Neo4jService,
      Neo4jConnectionService,
      Neo4jHealthService,
    ];

    return {
      module: Neo4jModule,
      imports: options.imports ?? [],
      providers,
      exports: [
        Neo4jService,
        Neo4jConnectionService,
        Neo4jHealthService,
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
