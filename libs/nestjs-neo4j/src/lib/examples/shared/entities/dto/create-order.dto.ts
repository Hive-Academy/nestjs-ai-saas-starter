import { IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  userId: string;

  @IsEnum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'])
  @IsOptional()
  status?: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' = 'pending';

  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsString()
  @IsOptional()
  currency?: string = 'USD';

  @IsString()
  @IsOptional()
  shippingAddress?: string;

  @IsOptional()
  items?: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
}