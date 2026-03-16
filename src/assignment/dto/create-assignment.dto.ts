import { IsNotEmpty, IsString, IsOptional, IsUUID, IsDateString, IsBoolean } from 'class-validator';

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

  @IsBoolean()
  @IsNotEmpty()
  isLateAllowed: boolean;
}