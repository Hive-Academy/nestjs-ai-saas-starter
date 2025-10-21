import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Execute DevBrand Workflow Response DTO
 *
 * Response schema for DevBrand workflow execution.
 * Includes session ID, status, and optional results/errors.
 */
export class ExecuteDevBrandResponseDto {
  @ApiProperty({
    description: 'Execution session ID',
    example: 'devbrand-1697456789',
  })
  sessionId!: string;

  @ApiProperty({
    description: 'Execution status',
    enum: ['queued', 'running', 'completed', 'failed', 'interrupted'],
  })
  status!: 'queued' | 'running' | 'completed' | 'failed' | 'interrupted';

  @ApiPropertyOptional({
    description: 'Workflow results (only when completed)',
  })
  results?: {
    achievements: Array<{
      id: string;
      description: string;
      technologies: string[];
      impact: string;
    }>;
    strategy: {
      positioning: string;
      targetAudience: string;
      uniqueValue: string;
    };
    content: {
      linkedin: string;
      devto: string;
    };
    confidence: number;
  };

  @ApiPropertyOptional({
    description: 'Current workflow stage',
  })
  currentStage?: {
    agentId: string;
    agentName: string;
    progress: number;
  };

  @ApiPropertyOptional({
    description: 'Error details if failed',
  })
  error?: {
    code: string;
    message: string;
    agentId?: string;
  };
}
