import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

/**
 * Execute DevBrand Workflow Request DTO
 *
 * Request schema for executing the DevBrand supervisor workflow.
 * Supports both non-streaming and streaming modes.
 */
export class ExecuteDevBrandRequestDto {
  @ApiProperty({
    description: 'GitHub username to analyze',
    example: 'johnsmith',
  })
  @IsString()
  @IsNotEmpty()
  githubUsername!: string;

  @ApiPropertyOptional({
    description: 'User ID for personalization',
    example: 'user-123',
  })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Session ID for resuming workflow',
    example: 'session-456',
  })
  @IsString()
  @IsOptional()
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Execution options',
  })
  @IsObject()
  @IsOptional()
  options?: {
    timeframe?: 'week' | 'month' | 'quarter';
    enableStreamingToWebSocket?: boolean;
  };
}
