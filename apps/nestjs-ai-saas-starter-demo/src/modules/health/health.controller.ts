import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Get overall health status' })
  @ApiResponse({ status: 200, description: 'Health check successful' })
  @ApiResponse({ status: 503, description: 'Service unavailable' })
  async getHealth() {
    return this.healthService.getHealthStatus();
  }

  @Get('chromadb')
  @ApiOperation({ summary: 'Check ChromaDB connection health' })
  async getChromaDBHealth() {
    return this.healthService.getChromaDBHealth();
  }

  @Get('neo4j')
  @ApiOperation({ summary: 'Check Neo4j connection health' })
  async getNeo4jHealth() {
    return this.healthService.getNeo4jHealth();
  }

  @Get('redis')
  @ApiOperation({ summary: 'Check Redis connection health' })
  async getRedisHealth() {
    return this.healthService.getRedisHealth();
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Get detailed health status for all services' })
  async getDetailedHealth() {
    return this.healthService.getDetailedHealthStatus();
  }
}
