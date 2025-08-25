import { Injectable, Inject, Optional } from '@nestjs/common';
import type {
  ICreatableAdapter,
  IExecutableAdapter,
  ExtendedAdapterStatus,
} from './interfaces/adapter.interface';
import { BaseModuleAdapter } from './base/base.adapter';

/**
 * Configuration for LangGraph Platform operations
 */
export interface PlatformConfig {
  enabled?: boolean;
  /** Platform API endpoint */
  endpoint?: string;
  /** API key for authentication */
  apiKey?: string;
  /** Default assistant configuration */
  defaultAssistant?: {
    name?: string;
    description?: string;
    model?: string;
    instructions?: string;
  };
  /** Deployment settings */
  deployment?: {
    /** Auto-deploy workflows */
    autoDeploy?: boolean;
    /** Environment to deploy to */
    environment?: 'development' | 'staging' | 'production';
    /** Resource limits */
    resources?: {
      memory?: string;
      cpu?: string;
      timeout?: number;
    };
  };
}

/**
 * Result of platform operations
 */
export interface PlatformResult {
  /** Deployment or operation ID */
  id: string;
  /** Operation type */
  type: 'deployment' | 'assistant' | 'invocation';
  /** Current status */
  status: 'pending' | 'running' | 'completed' | 'failed';
  /** Result data */
  data: any;
  /** Platform metadata */
  metadata: {
    platform: 'langgraph-platform';
    version?: string;
    endpoint?: string;
  };
  /** Timestamps */
  timestamps: {
    created: Date;
    updated: Date;
  };
}

/**
 * Platform assistant structure
 */
export interface PlatformAssistant {
  /** Assistant ID */
  id: string;
  /** Assistant name */
  name: string;
  /** Assistant description */
  description?: string;
  /** Configuration */
  config: {
    model?: string;
    instructions?: string;
    tools?: string[];
  };
  /** Deployment info */
  deployment?: {
    status: 'deployed' | 'not-deployed' | 'deploying';
    endpoint?: string;
    version?: string;
  };
}

/**
 * Remote invocation request
 */
export interface RemoteInvocationRequest {
  /** Assistant ID to invoke */
  assistantId: string;
  /** Input data */
  input: any;
  /** Invocation options */
  options?: {
    /** Stream the response */
    stream?: boolean;
    /** Include metadata */
    includeMetadata?: boolean;
    /** Timeout for the request */
    timeout?: number;
  };
}

/**
 * Adapter that bridges the main NestJS LangGraph library to the LangGraph Platform module
 *
 * This adapter follows the Adapter pattern to provide seamless integration between
 * the main library and the LangGraph Platform service without breaking existing APIs.
 *
 * Benefits:
 * - Maintains backward compatibility with existing platform APIs
 * - Delegates to enterprise-grade platform module when available
 * - Provides fallback to local execution when child module not installed
 * - Follows SOLID principles with single responsibility (bridge interface)
 */
@Injectable()
export class PlatformAdapter
  extends BaseModuleAdapter<PlatformConfig, PlatformResult>
  implements
    ICreatableAdapter<PlatformConfig, PlatformResult>,
    IExecutableAdapter<RemoteInvocationRequest, PlatformResult>
{
  protected readonly serviceName = 'platform';

  constructor(
    @Optional()
    @Inject('PlatformClientService')
    private readonly platformClient?: any,
    @Optional()
    @Inject('PlatformDeploymentManager')
    private readonly deploymentManager?: any
  ) {
    super();
  }

  /**
   * Create platform connection - delegates to enterprise module if available
   * Falls back to local execution when enterprise module not installed
   */
  async create(config: PlatformConfig): Promise<PlatformResult> {
    this.validateConfig(config);

    if (!config.enabled) {
      throw new Error('LangGraph Platform integration is not enabled');
    }

    // Try enterprise platform module first
    if (this.platformClient) {
      this.logEnterpriseUsage('platform connection creation');
      try {
        const result = await this.platformClient.initialize(config);
        return {
          id: `platform-${Date.now()}`,
          type: 'deployment',
          status: 'completed',
          data: result,
          metadata: {
            platform: 'langgraph-platform',
            endpoint: config.endpoint,
          },
          timestamps: {
            created: new Date(),
            updated: new Date(),
          },
        };
      } catch (error) {
        this.logger.warn(
          'Enterprise platform module failed, falling back to local execution:',
          error
        );
        return this.createFallbackResult(config);
      }
    }

    // Try deployment manager
    if (this.deploymentManager) {
      this.logger.log('Using deployment manager via adapter');
      try {
        const result = await this.deploymentManager.initialize(config);
        return {
          id: `deployment-${Date.now()}`,
          type: 'deployment',
          status: 'completed',
          data: result,
          metadata: {
            platform: 'langgraph-platform',
            endpoint: config.endpoint,
          },
          timestamps: {
            created: new Date(),
            updated: new Date(),
          },
        };
      } catch (error) {
        this.logger.warn(
          'Deployment manager failed, falling back to local execution:',
          error
        );
        return this.createFallbackResult(config);
      }
    }

    // Fallback to local execution
    this.logFallbackUsage(
      'platform connection creation',
      'no enterprise services available - workflows will run locally'
    );
    return this.createFallbackResult(config);
  }

  /**
   * Execute remote invocation on LangGraph Platform
   */
  async execute(request: RemoteInvocationRequest): Promise<PlatformResult> {
    // Try enterprise platform client first
    if (this.platformClient) {
      this.logEnterpriseUsage('remote assistant invocation');
      try {
        const result = await this.platformClient.invokeRemote(
          request.assistantId,
          request.input,
          request.options
        );
        return {
          id: `invocation-${Date.now()}`,
          type: 'invocation',
          status: 'completed',
          data: result,
          metadata: {
            platform: 'langgraph-platform',
          },
          timestamps: {
            created: new Date(),
            updated: new Date(),
          },
        };
      } catch (error) {
        return this.handleFallback(
          error as Error,
          'remote assistant invocation'
        );
      }
    }

    // Try deployment manager
    if (this.deploymentManager) {
      this.logger.log('Using deployment manager for remote invocation');
      try {
        const result = await this.deploymentManager.invoke(request);
        return {
          id: `invocation-${Date.now()}`,
          type: 'invocation',
          status: 'completed',
          data: result,
          metadata: {
            platform: 'langgraph-platform',
          },
          timestamps: {
            created: new Date(),
            updated: new Date(),
          },
        };
      } catch (error) {
        return this.handleFallback(
          error as Error,
          'remote assistant invocation via deployment manager'
        );
      }
    }

    // No fallback for remote invocation - requires platform connection
    this.handleEnterpriseUnavailable(
      'remote assistant invocation',
      '@libs/langgraph-modules/platform'
    );
  }

  /**
   * Deploy workflow to LangGraph Platform
   */
  async deployWorkflow(
    workflow: any,
    config: PlatformConfig
  ): Promise<PlatformResult> {
    if (this.platformClient) {
      this.logEnterpriseUsage('workflow deployment');
      try {
        const deploymentResult = await this.platformClient.deployWorkflow(
          workflow,
          config
        );
        return {
          id: deploymentResult.deploymentId,
          type: 'deployment',
          status: deploymentResult.status,
          data: deploymentResult,
          metadata: {
            platform: 'langgraph-platform',
            endpoint: config.endpoint,
          },
          timestamps: {
            created: new Date(),
            updated: new Date(),
          },
        };
      } catch (error) {
        return this.handleFallback(error as Error, 'workflow deployment');
      }
    }

    if (this.deploymentManager) {
      try {
        const deploymentResult = await this.deploymentManager.deploy(
          workflow,
          config
        );
        return {
          id: deploymentResult.id,
          type: 'deployment',
          status: deploymentResult.status,
          data: deploymentResult,
          metadata: {
            platform: 'langgraph-platform',
          },
          timestamps: {
            created: new Date(),
            updated: new Date(),
          },
        };
      } catch (error) {
        return this.handleFallback(
          error as Error,
          'workflow deployment via deployment manager'
        );
      }
    }

    this.handleEnterpriseUnavailable(
      'workflow deployment',
      '@libs/langgraph-modules/platform'
    );
  }

  /**
   * Get assistant from LangGraph Platform
   */
  async getAssistant(assistantId: string): Promise<PlatformAssistant | null> {
    if (this.platformClient) {
      try {
        return await this.platformClient.getAssistant(assistantId);
      } catch (error) {
        this.logger.warn('Failed to get assistant:', error);
        return null;
      }
    }

    if (this.deploymentManager) {
      try {
        return await this.deploymentManager.getAssistant(assistantId);
      } catch (error) {
        this.logger.warn(
          'Failed to get assistant via deployment manager:',
          error
        );
        return null;
      }
    }

    return null;
  }

  /**
   * Get deployment status
   */
  async getDeploymentStatus(
    deploymentId: string
  ): Promise<PlatformResult | null> {
    if (this.platformClient) {
      try {
        const status = await this.platformClient.getDeploymentStatus(
          deploymentId
        );
        return {
          id: deploymentId,
          type: 'deployment',
          status: status.status,
          data: status,
          metadata: {
            platform: 'langgraph-platform',
          },
          timestamps: {
            created: status.createdAt ? new Date(status.createdAt) : new Date(),
            updated: new Date(),
          },
        };
      } catch (error) {
        this.logger.warn('Failed to get deployment status:', error);
        return null;
      }
    }

    if (this.deploymentManager) {
      try {
        const status = await this.deploymentManager.getStatus(deploymentId);
        return {
          id: deploymentId,
          type: 'deployment',
          status: status.status,
          data: status,
          metadata: {
            platform: 'langgraph-platform',
          },
          timestamps: {
            created: status.createdAt ? new Date(status.createdAt) : new Date(),
            updated: new Date(),
          },
        };
      } catch (error) {
        this.logger.warn(
          'Failed to get deployment status via deployment manager:',
          error
        );
        return null;
      }
    }

    return null;
  }

  /**
   * Create fallback result for local execution
   */
  private createFallbackResult(config: PlatformConfig): PlatformResult {
    return {
      id: `local-${Date.now()}`,
      type: 'deployment',
      status: 'completed',
      data: {
        message: 'Platform integration not available, using local execution',
        localMode: true,
        config,
      },
      metadata: {
        platform: 'langgraph-platform',
        endpoint: 'local',
      },
      timestamps: {
        created: new Date(),
        updated: new Date(),
      },
    };
  }

  /**
   * Check if enterprise platform module is available
   */
  isEnterpriseAvailable(): boolean {
    return !!this.platformClient;
  }

  /**
   * Check if deployment manager is available
   */
  isDeploymentManagerAvailable(): boolean {
    return !!this.deploymentManager;
  }

  /**
   * Get adapter status for diagnostics
   */
  getAdapterStatus(): ExtendedAdapterStatus {
    const enterpriseAvailable = this.isEnterpriseAvailable();
    const deploymentManagerAvailable = this.isDeploymentManagerAvailable();
    const fallbackMode = !enterpriseAvailable && !deploymentManagerAvailable;

    const capabilities = this.getBaseCapabilities();
    capabilities.push('local_execution_fallback');

    if (enterpriseAvailable) {
      capabilities.push(
        'enterprise_platform',
        'remote_deployment',
        'hosted_assistants',
        'remote_invocation',
        'platform_management'
      );
    }

    if (deploymentManagerAvailable) {
      capabilities.push('deployment_manager', 'workflow_deployment');
    }

    return {
      enterpriseAvailable,
      deploymentManagerAvailable,
      fallbackMode,
      capabilities,
    };
  }
}

/**
 * Factory function for backward compatibility
 */
export function createPlatformProvider(): PlatformAdapter {
  return new PlatformAdapter();
}
