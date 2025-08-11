import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';

export class QueryGraphDto {
  @ApiProperty({ description: 'Cypher query' })
  @IsString()
  query: string;

  @ApiPropertyOptional({ description: 'Query parameters' })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;
}