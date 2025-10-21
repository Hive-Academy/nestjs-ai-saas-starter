import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DevBrandResultsResponseDto } from './devbrand-results-response.dto';

/**
 * Cancel DevBrand Response DTO
 *
 * Response schema for workflow cancellation.
 * Includes partial results if workflow was in progress.
 */
export class CancelDevBrandResponseDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  message!: string;

  @ApiProperty()
  cancelledAt!: string;

  @ApiPropertyOptional()
  partialResults?: Partial<DevBrandResultsResponseDto>;
}
