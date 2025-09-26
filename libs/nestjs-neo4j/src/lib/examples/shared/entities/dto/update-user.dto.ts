/**
 * @fileoverview Update User DTO - Partial Update Validation
 * 
 * This DTO demonstrates:
 * - Partial update validation
 * - Optional field handling
 * - Business rule validation for updates
 * - Transformation of update data
 * 
 * Used with: User entity update operations
 */

import { IsEmail, IsString, IsOptional, IsBoolean, IsEnum, IsNumber, Min, Max, Length } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateUserDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }) => value?.toLowerCase()?.trim())
  @IsOptional()
  email?: string;

  @IsString({ message: 'First name must be a string' })
  @Length(1, 50, { message: 'First name must be between 1 and 50 characters' })
  @Transform(({ value }) => value?.trim())
  @IsOptional()
  firstName?: string;

  @IsString({ message: 'Last name must be a string' })
  @Length(1, 50, { message: 'Last name must be between 1 and 50 characters' })
  @Transform(({ value }) => value?.trim())
  @IsOptional()
  lastName?: string;

  @IsEnum(['admin', 'user', 'moderator'], { message: 'Role must be admin, user, or moderator' })
  @IsOptional()
  role?: 'admin' | 'user' | 'moderator';

  @IsBoolean({ message: 'isActive must be a boolean value' })
  @IsOptional()
  isActive?: boolean;

  @IsString({ message: 'Department must be a string' })
  @Length(1, 100, { message: 'Department must be between 1 and 100 characters' })
  @Transform(({ value }) => value?.trim())
  @IsOptional()
  department?: string;

  @IsNumber({}, { message: 'Salary must be a number' })
  @Min(0, { message: 'Salary cannot be negative' })
  @Max(10000000, { message: 'Salary cannot exceed 10,000,000' })
  @IsOptional()
  salary?: number;

  @IsString({ message: 'Profile image must be a string' })
  @IsOptional()
  profileImage?: string;

  @IsOptional()
  preferences?: {
    theme: 'light' | 'dark';
    notifications: boolean;
    language: string;
  };

  @IsOptional()
  lastLoginAt?: Date;
}