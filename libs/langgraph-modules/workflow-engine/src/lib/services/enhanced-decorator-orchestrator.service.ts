import { Injectable, Logger } from '@nestjs/common';
import { DecoratorTranslationService } from './decorator-translation.service';
import { EnhancedExecutionContextService } from './enhanced-execution-context.service';
import type {
  DecoratorDefinition,
} from '../interfaces/decorator-bridge.interface';
import type {
  EnhancedDecoratorBridgeConfig,
} from '../interfaces/enhanced-decorator-metadata.interface';
import type { WorkflowState } from '../interfaces';

/**
 * Orchestrator service that coordinates enhanced decorator translation
 * 
 * This service maintains backward compatibility by providing the same public API
 * as the original EnhancedDecoratorTranslationService while delegating work
 * to the focused services.
 * 
 * Responsibilities:
 * - Public API orchestration
 * - Service coordination
 * - Performance monitoring
 * - Error handling and recovery
 * - Backward compatibility maintenance
 */
@Injectable()
export class EnhancedDecoratorOrchestratorService extends DecoratorTranslationService {
  private readonly enhancedLogger = new Logger(EnhancedDecoratorOrchestratorService.name);
  
  constructor(private readonly enhancedContextService: EnhancedExecutionContextService) {
    super();
  }

  private readonly defaultEnhancedConfig: EnhancedDecoratorBridgeConfig = {
    enableStreaming: true,
    enableApproval: false,
    enableMemory: true,
    enableCheckpointing: true,
  };


  /**
   * Enhanced translation method supporting all decorator types
   * 
   * This is the main entry point for functional-api integration with full decorator support
   * Maintains backward compatibility with the original API
   */
  async translateDecoratorDefinitionEnhanced<TState extends WorkflowState = WorkflowState>(
    definition: DecoratorDefinition<TState>,
    instance: object,
    config?: Partial<EnhancedDecoratorBridgeConfig>
  ): Promise<any> {
    const startTime = performance.now();
    const mergedConfig = { ...this.defaultEnhancedConfig, ...config };
    
    this.enhancedLogger.debug(`Enhanced translation starting for: ${this.getEnhancedDefinitionName(definition)}`);
    
    try {
      // Get base translation first
      const baseResult = await this.translateDecoratorDefinition(definition, instance, mergedConfig);
      
      const translationTime = performance.now() - startTime;
      
      const enhancedResult = {
        nodes: baseResult.nodes,
        edges: baseResult.edges,
        entryPoint: baseResult.entryPoint,
        metadata: {
          ...baseResult.metadata,
          translationTime,
          enhancementLevel: 'basic',
          supportedDecorators: [],
          decoratorMetadata: {},
          configurationWarnings: [],
          performanceMetrics: {
            totalTime: translationTime,
            metadataExtractionTime: 0,
            nodeEnhancementTime: 0,
            enhancedNodesCount: baseResult.nodes.length,
          },
        },
      };
      
      this.enhancedLogger.debug(
        `Enhanced translation completed in ${translationTime.toFixed(2)}ms with ${baseResult.nodes.length} nodes`
      );
      
      return enhancedResult;

    } catch (error) {
      const errorTime = performance.now() - startTime;
      this.enhancedLogger.error(
        `Enhanced translation failed after ${errorTime.toFixed(2)}ms for: ${this.getEnhancedDefinitionName(definition)}`,
        error
      );
      
      // Return graceful fallback
      return this.createFallbackResult(definition, instance, error, errorTime);
    }
  }

  /**
   * Get configuration defaults (for external access)
   */
  getDefaultConfiguration(): EnhancedDecoratorBridgeConfig {
    return { ...this.defaultEnhancedConfig };
  }

  /**
   * Validate service availability and configuration
   */
  validateServiceAvailability(): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.enhancedContextService) {
      errors.push('Enhanced execution context service is not available');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get service health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, 'available' | 'unavailable'>;
    capabilities: Record<string, boolean>;
  } {
    const serviceValidation = this.validateServiceAvailability();
    
    const services = {
      executionContextService: this.enhancedContextService ? 'available' : 'unavailable',
    } as Record<string, 'available' | 'unavailable'>;

    const capabilities = {
      enhancedTranslation: serviceValidation.isValid,
      contextCreation: !!this.enhancedContextService,
      backwardCompatibility: true, // Always maintained
    };

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (serviceValidation.errors.length === 0) {
      status = serviceValidation.warnings.length === 0 ? 'healthy' : 'degraded';
    } else {
      status = 'unhealthy';
    }

    return { status, services, capabilities };
  }

  /**
   * Create a performance report for the last translation
   */
  createPerformanceReport(result: any): {
    summary: string;
    metrics: Record<string, number>;
    recommendations: string[];
  } {
    const metrics = result.metadata.performanceMetrics || {};
    const decoratorCount = 0; // Simplified implementation

    const recommendations: string[] = [];
    
    if (metrics.totalTime > 1000) {
      recommendations.push('Consider caching decorator metadata for frequently used instances');
    }
    
    if (result.metadata.configurationWarnings?.length > 0) {
      recommendations.push('Address configuration warnings to ensure optimal performance');
    }

    return {
      summary: `Translation completed in ${metrics.totalTime?.toFixed(2)}ms with ${decoratorCount} decorators`,
      metrics: {
        totalTime: metrics.totalTime || 0,
        decoratorCount,
        nodeCount: result.nodes.length,
        edgeCount: result.edges.length,
        warningCount: result.metadata.configurationWarnings?.length || 0,
      },
      recommendations,
    };
  }


  /**
   * Create fallback result when translation fails
   */
  private createFallbackResult<TState extends WorkflowState = WorkflowState>(
    definition: DecoratorDefinition<TState>,
    instance: object,
    error: any,
    errorTime: number
  ): any {
    this.enhancedLogger.warn('Creating fallback enhanced translation result due to error');
    
    return {
      nodes: [],
      edges: [],
      entryPoint: 'fallback',
      metadata: {
        translationTime: errorTime,
        enhancementLevel: 'none',
        supportedDecorators: [],
        decoratorMetadata: {},
        configurationWarnings: [`Translation failed: ${error.message}`],
        performanceMetrics: {
          totalTime: errorTime,
          metadataExtractionTime: 0,
          nodeEnhancementTime: 0,
          enhancedNodesCount: 0,
        },
        fallback: true,
        originalError: error.message,
      },
    };
  }

  /**
   * Get definition name for logging (enhanced version)
   */
  private getEnhancedDefinitionName<TState extends WorkflowState = WorkflowState>(
    definition: DecoratorDefinition<TState>
  ): string {
    if (typeof definition === 'string') {
      return definition;
    } else if (definition && typeof definition === 'object') {
      return definition.constructor?.name || 'UnknownDefinition';
    }
    return 'Anonymous';
  }
}