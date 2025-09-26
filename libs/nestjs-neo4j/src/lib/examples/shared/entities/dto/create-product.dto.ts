import { IsString, IsNumber, IsBoolean, IsOptional, Min, Length } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @Length(1, 200)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  @Length(1, 100)
  category: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsBoolean()
  @IsOptional()
  inStock?: boolean = true;

  @IsNumber()
  @Min(0)
  @IsOptional()
  stockQuantity?: number;

  @IsOptional()
  tags?: string[];

  @IsBoolean()
  @IsOptional()
  featured?: boolean = false;

  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  rating?: number;
}