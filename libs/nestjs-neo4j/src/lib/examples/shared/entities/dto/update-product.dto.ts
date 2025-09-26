import { IsString, IsNumber, IsBoolean, IsOptional, Min, Max, Length } from 'class-validator';

export class UpdateProductDto {
  @IsString()
  @Length(1, 200)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsString()
  @Length(1, 100)
  @IsOptional()
  category?: string;

  @IsBoolean()
  @IsOptional()
  inStock?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  stockQuantity?: number;

  @IsOptional()
  tags?: string[];

  @IsBoolean()
  @IsOptional()
  featured?: boolean;

  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  rating?: number;
}