import { Injectable, Logger } from '@nestjs/common';
import { ChromaDBService, InjectChromaDB } from '@hive-academy/nestjs-chromadb';
import { Neo4jService, InjectNeo4j } from '@hive-academy/nestjs-neo4j';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    chromadb: ServiceHealth;
    neo4j: ServiceHealth;
    redis: ServiceHealth;
  };
}

export interface ServiceHealth {
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime?: number;
  error?: string;
  details?: Record<string, any>;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(
    @InjectChromaDB() private readonly chromaDB: ChromaDBService,
    @InjectNeo4j() private readonly neo4j: Neo4jService
  ) {}

  async getHealthStatus(): Promise<HealthStatus> {
    const chromadbHealth = await this.getChromaDBHealth();
    const neo4jHealth = await this.getNeo4jHealth();
    const redisHealth = await this.getRedisHealth();

    // Determine overall status
    const serviceStatuses = [
      chromadbHealth.status,
      neo4jHealth.status,
      redisHealth.status,
    ];
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded';

    if (serviceStatuses.every((status) => status === 'healthy')) {
      overallStatus = 'healthy';
    } else if (serviceStatuses.some((status) => status === 'healthy')) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'unhealthy';
    }

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: process.env.npm_package_version || '1.0.0',
      services: {
        chromadb: chromadbHealth,
        neo4j: neo4jHealth,
        redis: redisHealth,
      },
    };

    this.logger.debug(`Health check completed: ${overallStatus}`);
    return healthStatus;
  }

  async getChromaDBHealth(): Promise<ServiceHealth> {
    try {
      const startTime = Date.now();

      // Test ChromaDB connection by heartbeat
      const result = await this.chromaDB.heartbeat();
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
        details: {
          heartbeat: result,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`ChromaDB health check failed: ${errorMessage}`);
      return {
        status: 'unhealthy',
        error: errorMessage,
      };
    }
  }

  async getNeo4jHealth(): Promise<ServiceHealth> {
    try {
      const startTime = Date.now();

      // Test Neo4j connection with a simple query
      await this.neo4j.read(async (session) => {
        const result = await session.run('RETURN 1 as test');
        return result.records[0]?.get('test');
      });

      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
        details: {
          database: 'connected',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Neo4j health check failed: ${errorMessage}`);
      return {
        status: 'unhealthy',
        error: errorMessage,
      };
    }
  }

  async getRedisHealth(): Promise<ServiceHealth> {
    try {
      // For now, we don't have direct Redis integration, so we'll return unknown
      // In a real application, you would inject a Redis client and test the connection
      return {
        status: 'unknown',
        details: {
          message:
            'Redis health check not implemented - no direct Redis integration',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Redis health check failed: ${errorMessage}`);
      return {
        status: 'unhealthy',
        error: errorMessage,
      };
    }
  }

  async getDetailedHealthStatus(): Promise<{
    application: HealthStatus;
    system: {
      memory: NodeJS.MemoryUsage;
      uptime: number;
      nodeVersion: string;
      platform: string;
      cpuUsage: NodeJS.CpuUsage;
    };
  }> {
    const applicationHealth = await this.getHealthStatus();

    const systemInfo = {
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      cpuUsage: process.cpuUsage(),
    };

    return {
      application: applicationHealth,
      system: systemInfo,
    };
  }
}
