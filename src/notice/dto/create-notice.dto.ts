import { IsNotEmpty, IsString, MinLength, IsOptional, IsDateString } from 'class-validator';

export class CreateNoticeDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsDateString() // Validates that the string is a proper ISO date
  @IsOptional()
  expiresAt?: string; 
}