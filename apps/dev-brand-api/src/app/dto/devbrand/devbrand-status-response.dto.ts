import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DevBrand Status Response DTO
 *
 * Response schema for polling workflow status.
 * Includes progress tracking and active interruption information.
 */
export class DevBrandStatusResponseDto {
  @ApiProperty()
  sessionId!: string;

  @ApiProperty({
    enum: [
      'queued',
      'running',
      'completed',
      'failed',
      'interrupted',
      'cancelled',
    ],
  })
  status!:
    | 'queued'
    | 'running'
    | 'completed'
    | 'failed'
    | 'interrupted'
    | 'cancelled';

  @ApiPropertyOptional()
  progress?: {
    currentAgent: string;
    completedAgents: string[];
    overallProgress: number; // 0-1
  };

  @ApiPropertyOptional()
  interruption?: {
    interruptionId: string;
    agentId: string;
    type: 'question' | 'approval_request' | 'clarification';
    message: string;
    expiresAt: string;
  };

  @ApiProperty()
  createdAt!: string;

  @ApiPropertyOptional()
  completedAt?: string;

  @ApiPropertyOptional()
  error?: {
    code: string;
    message: string;
  };
}
