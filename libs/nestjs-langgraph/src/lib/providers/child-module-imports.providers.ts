import { type DynamicModule, Logger } from '@nestjs/common';
import * as path from 'path';

// Use interface instead of importing from @langgraph-modules/core to avoid dependency issues
interface LangGraphModuleOptions {
  checkpoint?: {
    enabled?: boolean;
    [key: string]: any;
  };
  memory?: {
    [key: string]: any;
  };
  multiAgent?: {
    [key: string]: any;
  };
  functionalApi?: {
    [key: string]: any;
  };
  platform?: {
    [key: string]: any;
  };
  timeTravel?: {
    [key: string]: any;
  };
  monitoring?: {
    [key: string]: any;
  };
  hitl?: {
    [key: string]: any;
  };
  streaming?: {
    [key: string]: any;
  };
  workflowEngine?: {
    [key: string]: any;
  };
}

/**
 * Module metadata for registry-based loading
 */
interface ModuleMetadata {
  moduleId: string;
  className: string;
  importPath: string;
  optional: boolean;
  dependencies: string[];
  loadingStrategy: 'sync' | 'async' | 'fallback';
}

/**
 * Module loading strategy interface
 */
interface IModuleLoadingStrategy {
  loadModule<T>(moduleId: string, config: any): Promise<DynamicModule | null>;
  canHandle(moduleId: string): boolean;
  priority: number;
}

/**
 * Module validation result
 */
interface ModuleValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  moduleInfo: {
    name: string;
    version?: string;
    exports: string[];
  };
}

/**
 * Path resolution service for different environments
 */
class PathResolutionService {
  private static readonly logger = new Logger(PathResolutionService.name);

  static resolveModulePaths(moduleId: string): string[] {
    const environment = process.env.NODE_ENV || 'development';

    // Primary paths using TypeScript path mapping
    const paths = [
      `@langgraph-modules/${moduleId}`,
    ];

    // Development fallback paths
    if (environment === 'development') {
      paths.push(
        path.resolve(__dirname, `../../../langgraph-modules/${moduleId}/src/index.ts`),
        path.resolve(__dirname, `../../../langgraph-modules/${moduleId}/src/index.js`),
        `./libs/langgraph-modules/${moduleId}/src/index`
      );
    }

    // Production fallback paths
    if (environment === 'production') {
      paths.push(
        path.resolve(__dirname, `../../../langgraph-modules/${moduleId}/dist/index.js`),
        `./libs/langgraph-modules/${moduleId}/dist/index`
      );
    }

    this.logger.debug(`Resolved paths for ${moduleId}:`, paths);
    return paths;
  }
}

/**
 * Module validator service
 */
class ModuleValidatorService {
  private static readonly logger = new Logger(ModuleValidatorService.name);

  static async validateModule(module: any, metadata: ModuleMetadata): Promise<ModuleValidationResult> {
    const result: ModuleValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      moduleInfo: { name: metadata.moduleId, exports: [] }
    };

    try {
      // Check if module has required forRoot method
      if (!module || typeof module.forRoot !== 'function') {
        result.errors.push(`Module ${metadata.className} missing required forRoot method`);
        result.valid = false;
        return result;
      }

      // Test module instantiation with empty config
      const testInstance = module.forRoot({});
      if (!testInstance || !testInstance.module) {
        result.errors.push(`Module ${metadata.className} forRoot() does not return valid DynamicModule`);
        result.valid = false;
      }

      // Extract module information
      result.moduleInfo.exports = Object.keys(module);

      this.logger.debug(`Validation successful for module: ${metadata.moduleId}`);
    } catch (error) {
      result.errors.push(`Module instantiation failed: ${error.message}`);
      result.valid = false;
    }

    return result;
  }
}

/**
 * Module registry service with predefined child modules
 */
class ModuleRegistryService {
  private static readonly MODULE_DEFINITIONS: ModuleMetadata[] = [
    {
      moduleId: 'checkpoint',
      className: 'LanggraphModulesCheckpointModule',
      importPath: '@langgraph-modules/checkpoint',
      optional: true,
      dependencies: [],
      loadingStrategy: 'sync'
    },
    {
      moduleId: 'memory',
      className: 'LanggraphModulesMemoryModule',
      importPath: '@langgraph-modules/memory',
      optional: true,
      dependencies: [],
      loadingStrategy: 'sync'
    },
    {
      moduleId: 'multi-agent',
      className: 'MultiAgentModule',
      importPath: '@langgraph-modules/multi-agent',
      optional: true,
      dependencies: [],
      loadingStrategy: 'sync'
    },
    {
      moduleId: 'functional-api',
      className: 'FunctionalApiModule',
      importPath: '@langgraph-modules/functional-api',
      optional: true,
      dependencies: [],
      loadingStrategy: 'sync'
    },
    {
      moduleId: 'platform',
      className: 'PlatformModule',
      importPath: '@langgraph-modules/platform',
      optional: true,
      dependencies: [],
      loadingStrategy: 'sync'
    },
    {
      moduleId: 'time-travel',
      className: 'TimeTravelModule',
      importPath: '@langgraph-modules/time-travel',
      optional: true,
      dependencies: [],
      loadingStrategy: 'sync'
    },
    {
      moduleId: 'monitoring',
      className: 'MonitoringModule',
      importPath: '@langgraph-modules/monitoring',
      optional: true,
      dependencies: [],
      loadingStrategy: 'sync'
    },
    {
      moduleId: 'hitl',
      className: 'HitlModule',
      importPath: '@langgraph-modules/hitl',
      optional: true,
      dependencies: [],
      loadingStrategy: 'sync'
    },
    {
      moduleId: 'streaming',
      className: 'StreamingModule',
      importPath: '@langgraph-modules/streaming',
      optional: true,
      dependencies: [],
      loadingStrategy: 'sync'
    },
    {
      moduleId: 'workflow-engine',
      className: 'WorkflowEngineModule',
      importPath: '@langgraph-modules/workflow-engine',
      optional: true,
      dependencies: [],
      loadingStrategy: 'sync'
    }
  ];

  static getModule(moduleId: string): ModuleMetadata | null {
    return this.MODULE_DEFINITIONS.find(m => m.moduleId === moduleId) || null;
  }

  static getAllModules(): ModuleMetadata[] {
    return [...this.MODULE_DEFINITIONS];
  }
}

/**
 * Production loading strategy with multi-path resolution
 */
class ProductionLoadingStrategy implements IModuleLoadingStrategy {
  private static readonly logger = new Logger(ProductionLoadingStrategy.name);
  readonly priority = 10;

  canHandle(moduleId: string): boolean {
    return ModuleRegistryService.getModule(moduleId) !== null;
  }

  async loadModule<T>(moduleId: string, config: any): Promise<DynamicModule | null> {
    const metadata = ModuleRegistryService.getModule(moduleId);
    if (!metadata) {
      ProductionLoadingStrategy.logger.warn(`Module metadata not found: ${moduleId}`);
      return null;
    }

    const startTime = Date.now();
    const modulePaths = PathResolutionService.resolveModulePaths(moduleId);

    for (const modulePath of modulePaths) {
      try {
        ProductionLoadingStrategy.logger.debug(`Attempting to load module from path: ${modulePath}`);

        // Use dynamic import with proper error handling
        const moduleExports = await import(modulePath);

        // Handle both default and named exports
        const ModuleClass = moduleExports[metadata.className] ||
                           moduleExports.default?.[metadata.className] ||
                           moduleExports.default;

        if (!ModuleClass) {
          ProductionLoadingStrategy.logger.debug(`Module class ${metadata.className} not found in ${modulePath}`);
          continue;
        }

        // Validate module before instantiation
        const validationResult = await ModuleValidatorService.validateModule(ModuleClass, metadata);
        if (!validationResult.valid) {
          ProductionLoadingStrategy.logger.warn(`Module validation failed for ${moduleId}:`, validationResult.errors);
          continue;
        }

        // Create dynamic module instance
        const dynamicModule = ModuleClass.forRoot(config);

        const loadTime = Date.now() - startTime;
        ProductionLoadingStrategy.logger.log(`✅ Successfully loaded module '${moduleId}' in ${loadTime}ms using path: ${modulePath}`);

        return dynamicModule;
      } catch (error) {
        ProductionLoadingStrategy.logger.debug(`Failed to load from path ${modulePath}:`, error.message);
        continue;
      }
    }

    const totalTime = Date.now() - startTime;
    ProductionLoadingStrategy.logger.warn(`❌ Failed to load module '${moduleId}' after trying all paths (${totalTime}ms)`);
    return null;
  }
}

/**
 * Fallback strategy that provides no-op implementations
 */
class FallbackStrategy implements IModuleLoadingStrategy {
  private static readonly logger = new Logger(FallbackStrategy.name);
  readonly priority = 1;

  canHandle(moduleId: string): boolean {
    return true; // Always can handle as last resort
  }

  async loadModule<T>(moduleId: string, config: any): Promise<DynamicModule | null> {
    FallbackStrategy.logger.warn(`⚠️ Using fallback implementation for module '${moduleId}'`);

    // Return null to indicate graceful degradation
    // The main module will handle this gracefully
    return null;
  }
}

/**
 * Dynamic module loader facade
 */
class DynamicModuleLoaderFacade {
  private static readonly logger = new Logger(DynamicModuleLoaderFacade.name);

  constructor(
    private readonly strategies: IModuleLoadingStrategy[]
  ) {
    // Sort strategies by priority (highest first)
    this.strategies.sort((a, b) => b.priority - a.priority);
  }

  async loadModules(options: LangGraphModuleOptions): Promise<DynamicModule[]> {
    const modules: DynamicModule[] = [];
    const requiredModules = this.getRequiredModules(options);

    DynamicModuleLoaderFacade.logger.log(`Loading ${requiredModules.length} child modules...`);

    for (const [moduleId, config] of requiredModules) {
      try {
        const module = await this.loadSingleModule(moduleId, config);
        if (module) {
          modules.push(module);
        }
      } catch (error) {
        DynamicModuleLoaderFacade.logger.error(`Failed to load module ${moduleId}:`, error);
        // Continue loading other modules
      }
    }

    DynamicModuleLoaderFacade.logger.log(`Successfully loaded ${modules.length}/${requiredModules.length} child modules`);
    return modules;
  }

  private async loadSingleModule(moduleId: string, config: any): Promise<DynamicModule | null> {
    const strategies = this.strategies.filter(s => s.canHandle(moduleId));

    for (const strategy of strategies) {
      try {
        const module = await strategy.loadModule(moduleId, config);
        if (module) {
          return module;
        }
      } catch (error) {
        DynamicModuleLoaderFacade.logger.debug(`Strategy ${strategy.constructor.name} failed for ${moduleId}:`, error.message);
      }
    }

    return null;
  }

  private getRequiredModules(options: LangGraphModuleOptions): [string, any][] {
    const modules: [string, any][] = [];

    // Map options to module configurations
    if (options.checkpoint?.enabled) {
      modules.push(['checkpoint', options.checkpoint]);
    }
    if (options.memory) {
      modules.push(['memory', options.memory]);
    }
    if (options.multiAgent) {
      modules.push(['multi-agent', options.multiAgent]);
    }
    if (options.functionalApi) {
      modules.push(['functional-api', options.functionalApi]);
    }
    if (options.platform) {
      modules.push(['platform', options.platform]);
    }
    if (options.timeTravel) {
      modules.push(['time-travel', options.timeTravel]);
    }
    if (options.monitoring) {
      modules.push(['monitoring', options.monitoring]);
    }
    if (options.hitl) {
      modules.push(['hitl', options.hitl]);
    }
    if (options.streaming) {
      modules.push(['streaming', options.streaming]);
    }
    if (options.workflowEngine) {
      modules.push(['workflow-engine', options.workflowEngine]);
    }

    return modules;
  }
}

/**
 * Advanced child module import factory with sophisticated loading strategies
 */
export class AdvancedChildModuleImportFactory {
  private static readonly logger = new Logger(AdvancedChildModuleImportFactory.name);

  private static readonly loader = new DynamicModuleLoaderFacade([
    new ProductionLoadingStrategy(),
    new FallbackStrategy()
  ]);

  /**
   * Create child module imports with advanced loading strategies
   */
  static async createChildModuleImports(
    options: LangGraphModuleOptions
  ): Promise<DynamicModule[]> {
    try {
      const startTime = Date.now();
      const modules = await this.loader.loadModules(options);

      const loadTime = Date.now() - startTime;
      const loadedModules = modules.map(m => m.module?.name || 'Unknown').join(', ');

      this.logger.log(`🚀 Child module loading completed in ${loadTime}ms. Loaded: [${loadedModules}]`);

      return modules;
    } catch (error) {
      this.logger.error('💥 Child module loading failed:', error);

      // Return empty array for graceful degradation
      return [];
    }
  }
}

/**
 * Synchronous child module import factory with advanced loading
 */
export class ChildModuleImportFactory {
  private static readonly logger = new Logger(ChildModuleImportFactory.name);
  private static loadedModules: Map<string, DynamicModule> = new Map();

  /**
   * Create child module imports synchronously by pre-loading during module initialization
   */
  static createChildModuleImports(options: LangGraphModuleOptions): DynamicModule[] {
    const modules: DynamicModule[] = [];
    const requiredModules = this.getRequiredModules(options);

    this.logger.log(`Attempting to load ${requiredModules.length} child modules synchronously...`);

    for (const [moduleId, config] of requiredModules) {
      try {
        const module = this.loadModuleSync(moduleId, config);
        if (module) {
          modules.push(module);
          this.logger.log(`✅ Successfully loaded module: ${moduleId}`);
        } else {
          this.logger.warn(`⚠️ Module ${moduleId} not available, graceful degradation enabled`);
        }
      } catch (error) {
        this.logger.error(`❌ Failed to load module ${moduleId}:`, error.message);
      }
    }

    this.logger.log(`Loaded ${modules.length}/${requiredModules.length} child modules`);
    return modules;
  }

  /**
   * Load module synchronously using require (for Node.js environments)
   */
  private static loadModuleSync(moduleId: string, config: any): DynamicModule | null {
    // Check cache first
    const cacheKey = `${moduleId}-${JSON.stringify(config)}`;
    if (this.loadedModules.has(cacheKey)) {
      return this.loadedModules.get(cacheKey)!;
    }

    const metadata = ModuleRegistryService.getModule(moduleId);
    if (!metadata) {
      this.logger.warn(`Module metadata not found: ${moduleId}`);
      return null;
    }

    const modulePaths = PathResolutionService.resolveModulePaths(moduleId);

    for (const modulePath of modulePaths) {
      try {
        this.logger.debug(`Trying to load module from: ${modulePath}`);

        let moduleExports: any;

        // Try CommonJS require (works in Node.js environments)
        try {
          // Use require for synchronous loading
          moduleExports = require(modulePath);
        } catch (requireError) {
          this.logger.debug(`Require failed for ${modulePath}:`, requireError.message);
          continue;
        }

        // Handle both CommonJS and ES module exports
        const ModuleClass = moduleExports[metadata.className] ||
                           moduleExports.default?.[metadata.className] ||
                           moduleExports.default;

        if (!ModuleClass) {
          this.logger.debug(`Module class ${metadata.className} not found in ${modulePath}`);
          continue;
        }

        // Validate and instantiate module
        if (typeof ModuleClass.forRoot !== 'function') {
          this.logger.debug(`Module ${metadata.className} missing forRoot method`);
          continue;
        }

        const dynamicModule = ModuleClass.forRoot(config);
        if (!dynamicModule || !dynamicModule.module) {
          this.logger.debug(`Module ${metadata.className} forRoot() returned invalid DynamicModule`);
          continue;
        }

        // Cache the loaded module
        this.loadedModules.set(cacheKey, dynamicModule);

        this.logger.debug(`Successfully loaded module ${moduleId} from ${modulePath}`);
        return dynamicModule;

      } catch (error) {
        this.logger.debug(`Failed to load from path ${modulePath}:`, error.message);
        continue;
      }
    }

    this.logger.warn(`All loading attempts failed for module: ${moduleId}`);
    return null;
  }

  private static getRequiredModules(options: LangGraphModuleOptions): [string, any][] {
    const modules: [string, any][] = [];

    // Map options to module configurations
    if (options.checkpoint?.enabled) {
      modules.push(['checkpoint', options.checkpoint]);
    }
    if (options.memory) {
      modules.push(['memory', options.memory]);
    }
    if (options.multiAgent) {
      modules.push(['multi-agent', options.multiAgent]);
    }
    if (options.functionalApi) {
      modules.push(['functional-api', options.functionalApi]);
    }
    if (options.platform) {
      modules.push(['platform', options.platform]);
    }
    if (options.timeTravel) {
      modules.push(['time-travel', options.timeTravel]);
    }
    if (options.monitoring) {
      modules.push(['monitoring', options.monitoring]);
    }
    if (options.hitl) {
      modules.push(['hitl', options.hitl]);
    }
    if (options.streaming) {
      modules.push(['streaming', options.streaming]);
    }
    if (options.workflowEngine) {
      modules.push(['workflow-engine', options.workflowEngine]);
    }

    return modules;
  }

  /**
   * Async method for advanced loading (for future use)
   */
  static async createChildModuleImportsAsync(
    options: LangGraphModuleOptions
  ): Promise<DynamicModule[]> {
    return AdvancedChildModuleImportFactory.createChildModuleImports(options);
  }
}
