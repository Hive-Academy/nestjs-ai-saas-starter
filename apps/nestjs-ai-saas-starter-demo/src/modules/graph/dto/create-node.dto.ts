import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateNodeDto {
  @ApiProperty({ description: 'Node label' })
  @IsString()
  label: string;

  @ApiPropertyOptional({ description: 'Node properties' })
  @IsOptional()
  @IsObject()
  properties?: Record<string, any>;
}