/**
 * Test controller to verify Phase 1 adapter injection success
 *
 * Provides endpoints to test and verify that all adapters can be directly injected
 */

import { Controller, Get, Logger } from '@nestjs/common';
import { AdapterTestService } from '../services/adapter-test.service';

@Controller('test/adapters')
export class AdapterTestController {
  private readonly logger = new Logger(AdapterTestController.name);

  constructor(private readonly adapterTestService: AdapterTestService) {}

  /**
   * Simple health check to verify all adapters are injectable
   * GET /test/adapters/health
   */
  @Get('health')
  async getHealth() {
    this.logger.log('Health check requested');
    return await this.adapterTestService.healthCheck();
  }

  /**
   * Comprehensive test of all Phase 1 success criteria
   * GET /test/adapters/comprehensive
   */
  @Get('comprehensive')
  async runComprehensiveTest() {
    this.logger.log('Comprehensive adapter test requested');
    return await this.adapterTestService.runComprehensiveTest();
  }

  /**
   * Test direct adapter injection capabilities
   * GET /test/adapters/injection
   */
  @Get('injection')
  async testInjection() {
    this.logger.log('Adapter injection test requested');
    return await this.adapterTestService.testDirectAdapterInjection();
  }

  /**
   * Test enterprise memory integration specifically
   * GET /test/adapters/memory
   */
  @Get('memory')
  async testMemory() {
    this.logger.log('Memory adapter test requested');
    return await this.adapterTestService.testEnterpriseMemoryIntegration();
  }

  /**
   * Test checkpoint adapter capabilities
   * GET /test/adapters/checkpoint
   */
  @Get('checkpoint')
  async testCheckpoint() {
    this.logger.log('Checkpoint adapter test requested');
    return await this.adapterTestService.testCheckpointAdapterCapabilities();
  }
}
