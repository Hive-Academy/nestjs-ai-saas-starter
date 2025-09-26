/**
 * @fileoverview Create User DTO - Input Validation for User Creation
 * 
 * This DTO demonstrates:
 * - Input validation decorators
 * - Type-safe user creation data
 * - Business rule validation
 * - Transformation of input data to entity format
 * 
 * Used with: User entity creation operations
 */

import { IsEmail, IsString, IsOptional, IsBoolean, IsEnum, IsNumber, Min, Max, Length } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }) => value?.toLowerCase()?.trim())
  email: string;

  @IsString({ message: 'First name must be a string' })
  @Length(1, 50, { message: 'First name must be between 1 and 50 characters' })
  @Transform(({ value }) => value?.trim())
  firstName: string;

  @IsString({ message: 'Last name must be a string' })
  @Length(1, 50, { message: 'Last name must be between 1 and 50 characters' })
  @Transform(({ value }) => value?.trim())
  lastName: string;

  @IsEnum(['admin', 'user', 'moderator'], { message: 'Role must be admin, user, or moderator' })
  @IsOptional()
  role?: 'admin' | 'user' | 'moderator' = 'user';

  @IsBoolean({ message: 'isActive must be a boolean value' })
  @IsOptional()
  isActive?: boolean = true;

  @IsString({ message: 'Department must be a string' })
  @Length(1, 100, { message: 'Department must be between 1 and 100 characters' })
  @Transform(({ value }) => value?.trim())
  department: string;

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
}