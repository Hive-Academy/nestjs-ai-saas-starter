import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Driver } from 'neo4j-driver';
import { NEO4J_DRIVER, NEO4J_OPTIONS } from '../constants';
import type { Neo4jModuleOptions } from '../interfaces/neo4j-module-options.interface';
import type { Neo4jConnection } from '../interfaces/neo4j-connection.interface';

@Injectable()
export class Neo4jConnectionService implements Neo4jConnection, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(Neo4jConnectionService.name);
  private isConnectionEstablished = false;
  private retryCount = 0;

  constructor(
    @Inject(NEO4J_DRIVER) public readonly driver: Driver,
    @Inject(NEO4J_OPTIONS) private readonly options: Neo4jModuleOptions
  ) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.close();
  }

  private async connect(): Promise<void> {
    const maxRetries = this.options.retryAttempts || 5;
    const retryDelay = this.options.retryDelay || 5000;

    while (this.retryCount < maxRetries) {
      try {
        await this.driver.verifyConnectivity();
        this.isConnectionEstablished = true;
        this.logger.log('Successfully connected to Neo4j database');
        
        // Verify database exists if specified
        if (this.options.database) {
          await this.verifyDatabase();
        }
        
        return;
      } catch (error) {
        this.retryCount++;
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(
          `Failed to connect to Neo4j (attempt ${this.retryCount}/${maxRetries}): ${message}`
        );
        
        if (this.retryCount >= maxRetries) {
          throw new Error(`Failed to connect to Neo4j after ${maxRetries} attempts: ${message}`);
        }
        
        await this.delay(retryDelay);
      }
    }
  }

  private async verifyDatabase(): Promise<void> {
    const session = this.driver.session({
      database: 'system',
    });

    try {
      const result = await session.run(
        'SHOW DATABASES WHERE name = $database',
        { database: this.options.database }
      );
      
      if (result.records.length === 0) {
        this.logger.warn(`Database ${this.options.database} does not exist, creating...`);
        await this.createDatabase();
      }
    } catch (error) {
      // If we can't access system database, assume the database exists
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.debug(`Could not verify database existence: ${message}`);
    } finally {
      await session.close();
    }
  }

  private async createDatabase(): Promise<void> {
    const session = this.driver.session({
      database: 'system',
    });

    try {
      await session.run(
        `CREATE DATABASE $database IF NOT EXISTS`,
        { database: this.options.database }
      );
      this.logger.log(`Created database ${this.options.database}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Could not create database: ${message}`);
    } finally {
      await session.close();
    }
  }

  async isConnected(): Promise<boolean> {
    try {
      await this.driver.verifyConnectivity();
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    if (this.isConnectionEstablished) {
      await this.driver.close();
      this.isConnectionEstablished = false;
      this.logger.log('Closed Neo4j connection');
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getConnectionInfo() {
    return {
      uri: this.options.uri,
      database: this.options.database,
      isConnected: this.isConnectionEstablished,
      retryCount: this.retryCount,
    };
  }
}