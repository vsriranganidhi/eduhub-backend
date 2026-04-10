import { IsNotEmpty, IsString, IsOptional, IsUUID, IsDateString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateAssignmentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString() // Validates ISO 8601 strings (e.g., "2026-05-01T10:00:00Z")
  @IsNotEmpty()
  dueDate: string;

  @IsUUID()
  @IsNotEmpty()
  subjectId: string;

  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return value;
  })
  @IsBoolean()
  @IsNotEmpty()
  isLateAllowed: boolean;
}