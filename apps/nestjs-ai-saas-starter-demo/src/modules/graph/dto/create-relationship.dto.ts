import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateRelationshipDto {
  @ApiProperty({ description: 'Source node ID' })
  @IsString()
  fromNodeId: string;

  @ApiProperty({ description: 'Target node ID' })
  @IsString()
  toNodeId: string;

  @ApiProperty({ description: 'Relationship type' })
  @IsString()
  type: string;

  @ApiPropertyOptional({ description: 'Relationship properties' })
  @IsOptional()
  @IsObject()
  properties?: Record<string, any>;
}