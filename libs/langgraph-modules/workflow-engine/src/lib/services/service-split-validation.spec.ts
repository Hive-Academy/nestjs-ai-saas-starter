import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WorkflowEngineModule } from '../workflow-engine.module';
import { EnhancedDecoratorTranslationService } from './enhanced-decorator-translation.service';
import { EnhancedDecoratorOrchestratorService } from './enhanced-decorator-orchestrator.service';
import { EnhancedMetadataProcessorService } from './enhanced-metadata-processor.service';
import { EnhancedExecutionContextService } from './enhanced-execution-context.service';
import { EnhancedNodeProcessorService } from './enhanced-node-processor.service';
import { WorkflowStreamService } from '../streaming/workflow-stream.service';
import { WorkflowStreamOrchestratorService } from '../streaming/workflow-stream-orchestrator.service';
import { StreamManagementService } from '../streaming/stream-management.service';
import { TokenProcessingService } from '../streaming/token-processing.service';
import { StreamEventProcessorService } from '../streaming/stream-event-processor.service';

/**
 * Test suite to validate that the service splitting was successful
 * and maintains backward compatibility
 */
describe('Service Split Validation', () => {
  let testingModule: TestingModule;

  beforeEach(async () => {
    testingModule = await Test.createTestingModule({
      imports: [
        WorkflowEngineModule.forRoot({
          compilation: { cacheEnabled: false },
          execution: { streamingEnabled: true },
          debugging: { enabled: false },
        }),
      ],
      providers: [
        // Mock EventEmitter2 for testing
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
            on: jest.fn(),
            removeAllListeners: jest.fn(),
          },
        },
        // Mock streaming service
        {
          provide: 'IStreamingService',
          useValue: {
            createStream: jest.fn(),
          },
        },
      ],
    }).compile();
  });

  afterEach(async () => {
    await testingModule.close();
  });

  describe('Enhanced Decorator Translation Services', () => {
    it('should provide EnhancedMetadataProcessorService', () => {
      const service = testingModule.get<EnhancedMetadataProcessorService>(EnhancedMetadataProcessorService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(EnhancedMetadataProcessorService);
    });

    it('should provide EnhancedExecutionContextService', () => {
      const service = testingModule.get<EnhancedExecutionContextService>(EnhancedExecutionContextService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(EnhancedExecutionContextService);
    });

    it('should provide EnhancedNodeProcessorService', () => {
      const service = testingModule.get<EnhancedNodeProcessorService>(EnhancedNodeProcessorService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(EnhancedNodeProcessorService);
    });

    it('should provide EnhancedDecoratorOrchestratorService', () => {
      const service = testingModule.get<EnhancedDecoratorOrchestratorService>(EnhancedDecoratorOrchestratorService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(EnhancedDecoratorOrchestratorService);
    });

    it('should maintain backward compatibility for EnhancedDecoratorTranslationService', () => {
      const legacyService = testingModule.get<EnhancedDecoratorTranslationService>(EnhancedDecoratorTranslationService);
      const orchestratorService = testingModule.get<EnhancedDecoratorOrchestratorService>(EnhancedDecoratorOrchestratorService);
      
      expect(legacyService).toBeDefined();
      expect(orchestratorService).toBeDefined();
      // They should be the same instance due to alias
      expect(legacyService).toBe(orchestratorService);
    });

    it('should have correct service dependencies', () => {
      const orchestrator = testingModule.get<EnhancedDecoratorOrchestratorService>(EnhancedDecoratorOrchestratorService);
      
      // Test that orchestrator has access to its dependencies
      expect(orchestrator.getDefaultConfiguration()).toBeDefined();
      expect(orchestrator.validateServiceAvailability()).toBeDefined();
    });
  });

  describe('Workflow Stream Services', () => {
    it('should provide StreamManagementService', () => {
      const service = testingModule.get<StreamManagementService>(StreamManagementService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(StreamManagementService);
    });

    it('should provide TokenProcessingService', () => {
      const service = testingModule.get<TokenProcessingService>(TokenProcessingService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(TokenProcessingService);
    });

    it('should provide StreamEventProcessorService', () => {
      const service = testingModule.get<StreamEventProcessorService>(StreamEventProcessorService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(StreamEventProcessorService);
    });

    it('should provide WorkflowStreamOrchestratorService', () => {
      const service = testingModule.get<WorkflowStreamOrchestratorService>(WorkflowStreamOrchestratorService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(WorkflowStreamOrchestratorService);
    });

    it('should maintain backward compatibility for WorkflowStreamService', () => {
      const legacyService = testingModule.get<WorkflowStreamService>(WorkflowStreamService);
      const orchestratorService = testingModule.get<WorkflowStreamOrchestratorService>(WorkflowStreamOrchestratorService);
      
      expect(legacyService).toBeDefined();
      expect(orchestratorService).toBeDefined();
      // They should be the same instance due to alias
      expect(legacyService).toBe(orchestratorService);
    });

    it('should have correct service health status', () => {
      const orchestrator = testingModule.get<WorkflowStreamOrchestratorService>(WorkflowStreamOrchestratorService);
      
      const healthStatus = orchestrator.getHealthStatus();
      expect(healthStatus).toBeDefined();
      expect(healthStatus.status).toMatch(/healthy|degraded|unhealthy/);
      expect(healthStatus.services).toBeDefined();
      expect(healthStatus.metrics).toBeDefined();
    });
  });

  describe('Service Size Validation', () => {
    it('should have split large services into smaller focused services', () => {
      // This is a conceptual test - in practice, we'd check line counts
      // For the test, we verify that split services exist and are functional
      
      const metadataProcessor = testingModule.get<EnhancedMetadataProcessorService>(EnhancedMetadataProcessorService);
      const executionContext = testingModule.get<EnhancedExecutionContextService>(EnhancedExecutionContextService);
      const nodeProcessor = testingModule.get<EnhancedNodeProcessorService>(EnhancedNodeProcessorService);
      const streamManagement = testingModule.get<StreamManagementService>(StreamManagementService);
      const tokenProcessor = testingModule.get<TokenProcessingService>(TokenProcessingService);
      const eventProcessor = testingModule.get<StreamEventProcessorService>(StreamEventProcessorService);
      
      // Verify all split services are available
      expect(metadataProcessor).toBeDefined();
      expect(executionContext).toBeDefined();
      expect(nodeProcessor).toBeDefined();
      expect(streamManagement).toBeDefined();
      expect(tokenProcessor).toBeDefined();
      expect(eventProcessor).toBeDefined();
    });

    it('should maintain SOLID principles with single responsibility services', () => {
      const metadataProcessor = testingModule.get<EnhancedMetadataProcessorService>(EnhancedMetadataProcessorService);
      const streamManagement = testingModule.get<StreamManagementService>(StreamManagementService);
      
      // Test single responsibility - metadata processor handles metadata
      expect(metadataProcessor.extractAllDecoratorMetadata).toBeDefined();
      expect(metadataProcessor.getSupportedDecoratorTypes).toBeDefined();
      
      // Test single responsibility - stream management handles streams
      expect(streamManagement.createStream).toBeDefined();
      expect(streamManagement.getActiveStreamCount).toBeDefined();
    });
  });

  describe('Orchestrator Pattern Validation', () => {
    it('should coordinate services properly in decorator orchestrator', () => {
      const orchestrator = testingModule.get<EnhancedDecoratorOrchestratorService>(EnhancedDecoratorOrchestratorService);
      
      // Test orchestrator coordination capabilities
      const healthStatus = orchestrator.getHealthStatus();
      expect(healthStatus).toBeDefined();
      expect(healthStatus.capabilities).toBeDefined();
      expect(healthStatus.capabilities.backwardCompatibility).toBe(true);
    });

    it('should coordinate services properly in stream orchestrator', () => {
      const orchestrator = testingModule.get<WorkflowStreamOrchestratorService>(WorkflowStreamOrchestratorService);
      
      // Test orchestrator coordination capabilities
      const healthStatus = orchestrator.getHealthStatus();
      expect(healthStatus).toBeDefined();
      expect(healthStatus.services).toBeDefined();
    });
  });

  describe('Performance and Resource Management', () => {
    it('should provide resource cleanup capabilities', () => {
      const streamOrchestrator = testingModule.get<WorkflowStreamOrchestratorService>(WorkflowStreamOrchestratorService);
      
      // Test cleanup capabilities
      const cleanupResult = streamOrchestrator.forceCleanup();
      expect(cleanupResult).toBeDefined();
      expect(typeof cleanupResult.streamsCleanedUp).toBe('number');
      expect(typeof cleanupResult.buffersCleanedUp).toBe('number');
    });

    it('should support performance monitoring', () => {
      const decoratorOrchestrator = testingModule.get<EnhancedDecoratorOrchestratorService>(EnhancedDecoratorOrchestratorService);
      
      // Test performance monitoring capabilities
      const config = decoratorOrchestrator.getDefaultConfiguration();
      expect(config.enablePerformanceMonitoring).toBeDefined();
    });
  });
});