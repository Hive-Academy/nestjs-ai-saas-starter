/**
 * Test controller to verify child module service injection success
 *
 * Provides endpoints to test and verify that all child module services work correctly
 */

import { Controller, Get, Logger } from '@nestjs/common';
import { AdapterTestService } from '../services/adapter-test.service';

@Controller('test/modules')
export class AdapterTestController {
  private readonly logger = new Logger(AdapterTestController.name);

  constructor(private readonly adapterTestService: AdapterTestService) {}

  /**
   * Simple health check to verify child module services are injectable
   * GET /test/modules/health
   */
  @Get('health')
  async getHealth() {
    this.logger.log('Module health check requested');
    return await this.adapterTestService.healthCheck();
  }

  /**
   * Comprehensive test of child module architecture
   * GET /test/modules/comprehensive
   */
  @Get('comprehensive')
  async runComprehensiveTest() {
    this.logger.log('Comprehensive module test requested');
    return await this.adapterTestService.runComprehensiveTest();
  }

  /**
   * Test child module service injection capabilities
   * GET /test/modules/injection
   */
  @Get('injection')
  async testInjection() {
    this.logger.log('Module service injection test requested');
    return await this.adapterTestService.testChildModuleServiceInjection();
  }

  /**
   * Test memory module integration specifically
   * GET /test/modules/memory
   */
  @Get('memory')
  async testMemory() {
    this.logger.log('Memory module test requested');
    return await this.adapterTestService.testMemoryModuleIntegration();
  }

  /**
   * Test checkpoint module capabilities
   * GET /test/modules/checkpoint
   */
  @Get('checkpoint')
  async testCheckpoint() {
    this.logger.log('Checkpoint module test requested');
    return await this.adapterTestService.testCheckpointModuleCapabilities();
  }
}
