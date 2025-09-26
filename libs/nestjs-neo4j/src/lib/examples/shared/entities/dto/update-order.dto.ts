import { IsString, IsNumber, IsOptional, IsEnum, Min, IsObject } from 'class-validator';
import { ShippingAddress } from '../basic/order.entity';

export class UpdateOrderDto {
  @IsEnum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'])
  @IsOptional()
  status?: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

  @IsNumber()
  @Min(0)
  @IsOptional()
  totalAmount?: number;

  @IsObject()
  @IsOptional()
  shippingAddress?: ShippingAddress;

  @IsString()
  @IsOptional()
  trackingNumber?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsOptional()
  items?: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
}