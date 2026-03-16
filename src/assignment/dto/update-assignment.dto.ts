import { IsNotEmpty, IsString, IsOptional, IsDateString, IsBoolean } from 'class-validator';

export class UpdateAssignmentDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsBoolean()
  @IsOptional()
  isLateAllowed?: boolean;
}
