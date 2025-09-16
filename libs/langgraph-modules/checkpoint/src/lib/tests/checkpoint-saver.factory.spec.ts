import { Test, type TestingModule } from '@nestjs/testing';
import { CheckpointSaverFactory } from '../core/checkpoint-saver.factory';
import type { CheckpointConfig } from '../interfaces/checkpoint.interface';

describe('CheckpointSaverFactory', () => {
  let factory: CheckpointSaverFactory;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CheckpointSaverFactory],
    }).compile();

    factory = module.get<CheckpointSaverFactory>(CheckpointSaverFactory);
  });

  describe('createMemoryCheckpointSaver', () => {
    it('should create memory checkpoint saver without hanging', async () => {
      const config: CheckpointConfig = {
        type: 'memory',
        memory: {
          maxCheckpoints: 25,
          cleanupInterval: 300000,
        },
      };

      // This should complete quickly without hanging
      const startTime = Date.now();
      const saver = await factory.createCheckpointSaver(config);
      const duration = Date.now() - startTime;

      expect(saver).toBeDefined();
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should create memory checkpoint saver with default config', async () => {
      const config: CheckpointConfig = {
        type: 'memory',
      };

      const saver = await factory.createCheckpointSaver(config);
      expect(saver).toBeDefined();
    });

    it('should create memory checkpoint saver with undefined memory config', async () => {
      const config: CheckpointConfig = {
        type: 'memory',
        memory: undefined,
      };

      const saver = await factory.createCheckpointSaver(config);
      expect(saver).toBeDefined();
    });
  });

  describe('validateConfig', () => {
    it('should validate memory config successfully', () => {
      const config: CheckpointConfig = {
        type: 'memory',
        memory: {
          maxCheckpoints: 25,
          cleanupInterval: 300000,
        },
      };

      expect(() => factory.validateConfig(config)).not.toThrow();
    });

    it('should validate memory config with minimal settings', () => {
      const config: CheckpointConfig = {
        type: 'memory',
      };

      expect(() => factory.validateConfig(config)).not.toThrow();
    });

    it('should reject invalid memory config', () => {
      const config: CheckpointConfig = {
        type: 'memory',
        memory: {
          maxCheckpoints: -1, // Invalid value
          cleanupInterval: 300000,
        },
      };

      expect(() => factory.validateConfig(config)).toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle unsupported checkpoint type', async () => {
      const config = {
        type: 'unsupported',
      } as any;

      await expect(factory.createCheckpointSaver(config)).rejects.toThrow(
        'Unsupported checkpoint type: unsupported'
      );
    });

    it('should handle missing saver type', async () => {
      const config = {} as CheckpointConfig;

      expect(() => factory.validateConfig(config)).toThrow(
        'Checkpoint saver type is required'
      );
    });
  });
});
