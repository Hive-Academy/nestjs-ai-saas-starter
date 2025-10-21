import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Send DevBrand Message Response DTO
 *
 * Response schema for message send operations.
 * Indicates success/failure and workflow resumption status.
 */
export class SendDevBrandMessageResponseDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  message!: string;

  @ApiPropertyOptional()
  workflowResumed?: boolean;

  @ApiPropertyOptional()
  error?: string;
}
