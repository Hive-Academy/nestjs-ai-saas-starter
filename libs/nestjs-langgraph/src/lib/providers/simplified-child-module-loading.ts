import { type DynamicModule, Logger } from '@nestjs/common';
import type { LangGraphModuleOptions } from '../interfaces/module-options.interface';

/**
 * Simplified child module loading using adapter pattern
 *
 * This replaces the complex 700+ line dynamic loading system with a simple
 * approach that relies on our adapter pattern for graceful degradation.
 *
 * Benefits:
 * - 90% code reduction (from 700+ lines to ~100 lines)
 * - No complex path resolution needed
 * - No module validation needed (adapters handle graceful fallback)
 * - No multiple loading strategies needed
 * - Leverages @Optional() @Inject() pattern in adapters
 */

/**
 * Module configuration mapping
 * Maps user configuration to actual child module attempts
 */
interface ModuleConfigMapping {
  configKey: keyof LangGraphModuleOptions;
  moduleName: string;
  packageName: string;
  className: string;
}

/**
 * Registry of available child modules
 * NOTE: Memory module is intentionally EXCLUDED (requires manual setup)
 */
const CHILD_MODULE_REGISTRY: ModuleConfigMapping[] = [
  {
    configKey: 'checkpoint',
    moduleName: 'checkpoint',
    packageName: '@hive-academy/langgraph-checkpoint',
    className: 'LanggraphModulesCheckpointModule',
  },
  {
    configKey: 'multiAgent',
    moduleName: 'multi-agent',
    packageName: '@hive-academy/langgraph-multi-agent',
    className: 'MultiAgentModule',
  },
  {
    configKey: 'functionalApi',
    moduleName: 'functional-api',
    packageName: '@hive-academy/langgraph-functional-api',
    className: 'FunctionalApiModule',
  },
  {
    configKey: 'platform',
    moduleName: 'platform',
    packageName: '@hive-academy/langgraph-platform',
    className: 'PlatformModule',
  },
  {
    configKey: 'timeTravel',
    moduleName: 'time-travel',
    packageName: '@hive-academy/langgraph-time-travel',
    className: 'TimeTravelModule',
  },
  {
    configKey: 'monitoring',
    moduleName: 'monitoring',
    packageName: '@hive-academy/langgraph-monitoring',
    className: 'MonitoringModule',
  },
  {
    configKey: 'hitl',
    moduleName: 'hitl',
    packageName: '@hive-academy/langgraph-hitl',
    className: 'HitlModule',
  },
  {
    configKey: 'streaming',
    moduleName: 'streaming',
    packageName: '@hive-academy/langgraph-streaming',
    className: 'StreamingModule',
  },
  {
    configKey: 'workflowEngine',
    moduleName: 'workflow-engine',
    packageName: '@hive-academy/langgraph-workflow-engine',
    className: 'WorkflowEngineModule',
  },
];

/**
 * Simplified child module loader
 *
 * Uses the adapter pattern philosophy:
 * - Try to load the child module
 * - If it fails, gracefully degrade (adapters handle this)
 * - No complex validation, path resolution, or fallback strategies needed
 */
export class SimplifiedChildModuleLoader {
  private static readonly logger = new Logger(SimplifiedChildModuleLoader.name);

  /**
   * Load child modules based on user configuration
   *
   * Much simpler than the previous 700+ line implementation:
   * 1. Check if user enabled the module
   * 2. Try to load it
   * 3. If it fails, let the adapter handle graceful degradation
   */
  static loadChildModules(options: LangGraphModuleOptions): DynamicModule[] {
    const modules: DynamicModule[] = [];
    const enabledModules = this.getEnabledModules(options);

    this.logger.log(
      `Loading ${enabledModules.length} child modules: ${enabledModules
        .map((m) => m.moduleName)
        .join(', ')}`
    );

    for (const moduleConfig of enabledModules) {
      try {
        const module = this.loadSingleModule(
          moduleConfig,
          options[moduleConfig.configKey]
        );
        if (module) {
          modules.push(module);
          this.logger.log(`✅ Loaded ${moduleConfig.moduleName} module`);
        }
      } catch (error) {
        // This is expected and OK - adapters will handle graceful degradation
        this.logger.debug(
          `⚠️ ${moduleConfig.moduleName} module not available - adapter will handle graceful degradation:`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    this.logger.log(
      `Loaded ${modules.length}/${enabledModules.length} child modules successfully`
    );
    return modules;
  }

  /**
   * Load a single child module
   * Simple approach: try require, if it works great, if not the adapter handles it
   */
  private static loadSingleModule(
    moduleConfig: ModuleConfigMapping,
    config: any
  ): DynamicModule | null {
    try {
      // Simple require - no complex path resolution needed
      const moduleExports = require(moduleConfig.packageName);

      // Get the module class
      const ModuleClass =
        moduleExports[moduleConfig.className] ||
        moduleExports.default?.[moduleConfig.className] ||
        moduleExports.default;

      if (!ModuleClass || typeof ModuleClass.forRoot !== 'function') {
        this.logger.debug(
          `Module ${moduleConfig.className} not found or invalid in ${moduleConfig.packageName}`
        );
        return null;
      }

      // Create the dynamic module
      const dynamicModule = ModuleClass.forRoot(config);

      if (!dynamicModule || !dynamicModule.module) {
        this.logger.debug(
          `Module ${moduleConfig.className} forRoot() returned invalid DynamicModule`
        );
        return null;
      }

      return dynamicModule;
    } catch (error) {
      // This is normal - not all child modules will be installed
      this.logger.debug(
        `Could not load ${moduleConfig.packageName}:`,
        error instanceof Error ? error.message : String(error)
      );
      return null;
    }
  }

  /**
   * Get list of modules that user has enabled in configuration
   * Only attempt to load modules the user actually wants
   */
  private static getEnabledModules(
    options: LangGraphModuleOptions
  ): ModuleConfigMapping[] {
    return CHILD_MODULE_REGISTRY.filter((module) => {
      const config = options[module.configKey];

      // Special handling for checkpoint (requires enabled: true)
      if (module.configKey === 'checkpoint') {
        return (config as any)?.enabled === true;
      }

      // For other modules, any truthy config means enabled
      return !!config;
    });
  }
}

/**
 * Backward compatibility export
 * Maintains the same interface as the complex system
 */
export class ChildModuleImportFactory {
  private static readonly logger = new Logger(ChildModuleImportFactory.name);

  static createChildModuleImports(
    options: LangGraphModuleOptions
  ): DynamicModule[] {
    this.logger.log(
      '🚀 Using simplified child module loading (adapter pattern)'
    );
    return SimplifiedChildModuleLoader.loadChildModules(options);
  }

  static async createChildModuleImportsAsync(
    options: LangGraphModuleOptions
  ): Promise<DynamicModule[]> {
    // For backward compatibility - sync and async do the same thing now
    return this.createChildModuleImports(options);
  }
}

/**
 * Note about memory module:
 *
 * The memory module is intentionally NOT included in auto-loading because:
 * 1. It requires manual setup by the user (not auto-discoverable)
 * 2. It needs manual configuration in the app
 * 3. The MemoryAdapter handles this special case correctly
 *
 * Users who want memory functionality must:
 * 1. Install @hive-academy/langgraph-memory manually
 * 2. Import and configure it in their app module manually
 * 3. The MemoryAdapter will detect and use it via @Optional() @Inject()
 */
