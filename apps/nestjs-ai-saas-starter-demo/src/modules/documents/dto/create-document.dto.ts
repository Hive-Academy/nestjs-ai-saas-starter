import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateDocumentDto {
  @ApiPropertyOptional({ description: 'Document ID' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ description: 'Document content' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Collection name', default: 'default' })
  @IsOptional()
  @IsString()
  collection?: string;

  @ApiPropertyOptional({ description: 'Document metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}