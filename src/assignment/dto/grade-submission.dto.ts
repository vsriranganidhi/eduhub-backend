import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class GradeSubmissionDto {
  @IsString()
  @IsNotEmpty()
  grade: string;

  @IsString()
  @IsOptional()
  feedback?: string;
}
