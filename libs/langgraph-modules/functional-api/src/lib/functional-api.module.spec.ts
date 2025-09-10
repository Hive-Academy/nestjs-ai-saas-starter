import { Test } from '@nestjs/testing';
import { FunctionalApiModule } from './functional-api.module';
import { FunctionalWorkflowService } from './services/functional-workflow.service';
import {
  CHECKPOINT_ADAPTER_TOKEN,
  NoOpCheckpointAdapter,
} from '@hive-academy/langgraph-core';

describe('FunctionalApiModule', () => {
  describe('forRoot', () => {
    it('should create module without checkpoint adapter', async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [FunctionalApiModule.forRoot()],
      }).compile();

      const workflowService = moduleRef.get<FunctionalWorkflowService>(
        FunctionalWorkflowService
      );
      const checkpointAdapter = moduleRef.get(CHECKPOINT_ADAPTER_TOKEN);

      expect(workflowService).toBeDefined();
      expect(checkpointAdapter).toBeInstanceOf(NoOpCheckpointAdapter);
    });

    it('should create module with custom checkpoint adapter', async () => {
      const customAdapter = new NoOpCheckpointAdapter();

      const moduleRef = await Test.createTestingModule({
        imports: [
          FunctionalApiModule.forRoot({
            checkpointAdapter: customAdapter,
          }),
        ],
      }).compile();

      const workflowService = moduleRef.get<FunctionalWorkflowService>(
        FunctionalWorkflowService
      );
      const checkpointAdapter = moduleRef.get(CHECKPOINT_ADAPTER_TOKEN);

      expect(workflowService).toBeDefined();
      expect(checkpointAdapter).toBe(customAdapter);
    });
  });

  describe('forRootAsync', () => {
    it('should create module with async factory', async () => {
      const customAdapter = new NoOpCheckpointAdapter();

      const moduleRef = await Test.createTestingModule({
        imports: [
          FunctionalApiModule.forRootAsync({
            useFactory: () => ({
              checkpointAdapter: customAdapter,
              defaultTimeout: 5000,
            }),
          }),
        ],
      }).compile();

      const workflowService = moduleRef.get<FunctionalWorkflowService>(
        FunctionalWorkflowService
      );
      const checkpointAdapter = moduleRef.get(CHECKPOINT_ADAPTER_TOKEN);

      expect(workflowService).toBeDefined();
      expect(checkpointAdapter).toBe(customAdapter);
    });
  });
});
