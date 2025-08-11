import { Injectable, Inject } from '@nestjs/common';
import { Driver } from 'neo4j-driver';
import { NEO4J_DRIVER, NEO4J_OPTIONS } from '../constants';
import type { Neo4jModuleOptions } from '../interfaces/neo4j-module-options.interface';

export interface Neo4jHealthIndicator {
  name: string;
  status: 'up' | 'down';
  message?: string;
  details?: {
    database?: string;
    version?: string;
    edition?: string;
    connectionPool?: {
      open: number;
      idle: number;
    };
    responseTime?: number;
  };
}

@Injectable()
export class Neo4jHealthService {
  constructor(
    @Inject(NEO4J_DRIVER) private readonly driver: Driver,
    @Inject(NEO4J_OPTIONS) private readonly options: Neo4jModuleOptions
  ) {}

  async checkHealth(): Promise<Neo4jHealthIndicator> {
    const startTime = Date.now();
    
    try {
      // Verify connectivity
      await this.driver.verifyConnectivity();
      
      // Get database info
      const session = this.driver.session({
        database: this.options.database,
      });

      try {
        const result = await session.run('CALL dbms.components() YIELD name, versions, edition');
        const record = result.records[0];
        
        const responseTime = Date.now() - startTime;
        
        return {
          name: 'neo4j',
          status: 'up',
          message: 'Neo4j is healthy',
          details: {
            database: this.options.database,
            version: record?.get('versions')[0],
            edition: record?.get('edition'),
            responseTime,
          },
        };
      } finally {
        await session.close();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        name: 'neo4j',
        status: 'down',
        message: `Neo4j health check failed: ${message}`,
        details: {
          database: this.options.database,
          responseTime: Date.now() - startTime,
        },
      };
    }
  }

  async ping(): Promise<boolean> {
    try {
      await this.driver.verifyConnectivity();
      return true;
    } catch {
      return false;
    }
  }

  async getMetrics() {
    const session = this.driver.session({
      database: this.options.database,
    });

    try {
      const metrics: any = {};
      
      // Get database size
      try {
        const sizeResult = await session.run(`
          CALL apoc.meta.stats() 
          YIELD nodeCount, relCount, propertyKeyCount, labelCount, relTypeCount
        `);
        
        if (sizeResult.records.length > 0) {
          const record = sizeResult.records[0];
          metrics.nodes = record.get('nodeCount').toNumber();
          metrics.relationships = record.get('relCount').toNumber();
          metrics.properties = record.get('propertyKeyCount').toNumber();
          metrics.labels = record.get('labelCount').toNumber();
          metrics.relationshipTypes = record.get('relTypeCount').toNumber();
        }
      } catch {
        // APOC might not be installed
      }

      // Get connection pool metrics
      const poolMetrics = await this.driver.getServerInfo();
      metrics.connectionPool = {
        address: poolMetrics.address,
        agent: poolMetrics.agent,
      };

      return metrics;
    } finally {
      await session.close();
    }
  }
}