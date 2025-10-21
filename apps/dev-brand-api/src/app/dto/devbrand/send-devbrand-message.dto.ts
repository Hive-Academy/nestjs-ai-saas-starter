import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsBoolean,
} from 'class-validator';

/**
 * Send DevBrand Message DTO
 *
 * Request schema for sending messages to running workflows.
 * Supports HITL interruption responses and general message injection.
 */
export class SendDevBrandMessageDto {
  @ApiProperty({
    description: 'Message to send to workflow',
    example: 'Yes, approve this content',
  })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiProperty({
    description: 'Message type',
    enum: ['approval', 'input', 'clarification'],
  })
  @IsEnum(['approval', 'input', 'clarification'])
  type!: 'approval' | 'input' | 'clarification';

  @ApiPropertyOptional({
    description: 'Interruption ID if responding to HITL',
  })
  @IsString()
  @IsOptional()
  interruptionId?: string;

  @ApiPropertyOptional({
    description: 'Whether to continue workflow after message',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  continueExecution?: boolean;
}
