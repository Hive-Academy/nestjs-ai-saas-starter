import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DevBrandController } from './devbrand.controller';
import { DevBrandSupervisorWorkflow } from '../business-workflows/workflows/devbrand-supervisor.workflow';
import { ExecuteDevBrandDto } from './devbrand.controller';

describe('DevBrandController', () => {
  let controller: DevBrandController;
  let mockWorkflow: jest.Mocked<DevBrandSupervisorWorkflow>;

  beforeEach(async () => {
    // Mock DevBrandSupervisorWorkflow with refactored execute() signature
    mockWorkflow = {
      execute: jest.fn().mockResolvedValue({
        achievements: [
          {
            id: 'ach-1',
            repository: 'test-repo',
            description: 'Test achievement',
            technologies: ['TypeScript', 'NestJS'],
            impact: 'high',
            date: new Date('2025-01-01'),
          },
        ],
        strategy: {
          positioning: 'Backend developer',
          targetAudience: ['developers', 'tech leads'],
          contentThemes: ['architecture', 'best practices'],
        },
        content: {
          linkedin: {
            post: 'Test LinkedIn post',
            headline: 'Test headline',
          },
          devto: {
            article: 'Test Dev.to article',
            tags: ['typescript', 'nestjs'],
          },
        },
        confidence: 0.85,
      }),
    } as unknown as jest.Mocked<DevBrandSupervisorWorkflow>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DevBrandController],
      providers: [
        {
          provide: DevBrandSupervisorWorkflow,
          useValue: mockWorkflow,
        },
      ],
    }).compile();

    controller = module.get<DevBrandController>(DevBrandController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeDevBrand', () => {
    it('should return executionId and WebSocket URL when workflow starts', async () => {
      const dto: ExecuteDevBrandDto = {
        githubUsername: 'testdev',
        userId: 'user-123',
      };

      const response = await controller.executeDevBrand(dto);

      // Verify immediate response (not waiting for workflow completion)
      expect(response.executionId).toMatch(/^devbrand-\d+$/);
      expect(response.status).toBe('started');
      expect(response.message).toContain('Workflow started successfully');
      expect(response.websocketUrl).toBe('ws://localhost:8080/streaming');
      expect(response.websocketInstructions).toBeDefined();
      expect(response.websocketInstructions.subscribe).toContain(
        response.executionId
      );
      expect(response.websocketInstructions.events).toHaveLength(5);
    });

    it('should execute workflow in background without blocking response', async () => {
      const dto: ExecuteDevBrandDto = {
        githubUsername: 'testdev',
        userId: 'user-123',
      };

      const startTime = Date.now();
      const response = await controller.executeDevBrand(dto);
      const responseTime = Date.now() - startTime;

      // Response should be immediate (< 100ms), not waiting for workflow completion
      expect(responseTime).toBeLessThan(100);
      expect(response.status).toBe('started');

      // Workflow execute() should eventually be called in background
      // Note: We can't directly verify async background call without waiting,
      // but we verify the response is immediate
    });

    it('should call workflow.execute() with correct input structure', async () => {
      const dto: ExecuteDevBrandDto = {
        githubUsername: 'testdev',
        userId: 'user-123',
      };

      const response = await controller.executeDevBrand(dto);

      // Wait a bit for background execution to start
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify workflow.execute() called with correct signature
      expect(mockWorkflow.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          githubUsername: 'testdev',
          executionId: expect.stringMatching(/^devbrand-\d+$/),
        })
      );
    });

    it('should use "anonymous" as default userId if not provided', async () => {
      const dto: ExecuteDevBrandDto = {
        githubUsername: 'testdev',
      };

      const response = await controller.executeDevBrand(dto);

      // Wait for background execution
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockWorkflow.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'anonymous',
          githubUsername: 'testdev',
          executionId: expect.any(String),
        })
      );

      expect(response.executionId).toMatch(/^devbrand-\d+$/);
    });

    it('should throw BadRequestException when githubUsername is missing', async () => {
      const dto = {} as ExecuteDevBrandDto;

      await expect(controller.executeDevBrand(dto)).rejects.toThrow(
        BadRequestException
      );
      await expect(controller.executeDevBrand(dto)).rejects.toThrow(
        'githubUsername is required'
      );

      expect(mockWorkflow.execute).not.toHaveBeenCalled();
    });

    it('should handle workflow execution errors gracefully in background', async () => {
      // Mock workflow to throw error
      mockWorkflow.execute.mockRejectedValueOnce(
        new Error('GitHub API rate limit exceeded')
      );

      const dto: ExecuteDevBrandDto = {
        githubUsername: 'testdev',
        userId: 'user-123',
      };

      // Controller should still return 201 response (fire-and-forget)
      const response = await controller.executeDevBrand(dto);

      expect(response.status).toBe('started');
      expect(response.executionId).toMatch(/^devbrand-\d+$/);

      // Wait for background execution to fail
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Workflow execution should have been attempted
      expect(mockWorkflow.execute).toHaveBeenCalled();
    });

    it('should return WebSocket instructions with all required event types', async () => {
      const dto: ExecuteDevBrandDto = {
        githubUsername: 'testdev',
        userId: 'user-123',
      };

      const response = await controller.executeDevBrand(dto);

      const instructions = response.websocketInstructions;
      expect(instructions.connect).toContain('ws://localhost:8080/streaming');
      expect(instructions.subscribe).toContain('subscribe_execution');

      // Verify all required event types are present
      const eventsString = instructions.events.join(' ');
      expect(eventsString).toContain('stream_update');
      expect(eventsString).toContain('token_update');
      expect(eventsString).toContain('interruption_request');
      expect(eventsString).toContain('interruption_resolved');
      expect(eventsString).toContain('error');
    });

    it('should generate unique executionId for each request', async () => {
      const dto: ExecuteDevBrandDto = {
        githubUsername: 'testdev',
        userId: 'user-123',
      };

      const response1 = await controller.executeDevBrand(dto);
      await new Promise((resolve) => setTimeout(resolve, 10)); // Ensure different timestamp
      const response2 = await controller.executeDevBrand(dto);

      expect(response1.executionId).not.toBe(response2.executionId);
      expect(response1.executionId).toMatch(/^devbrand-\d+$/);
      expect(response2.executionId).toMatch(/^devbrand-\d+$/);
    });
  });
});
