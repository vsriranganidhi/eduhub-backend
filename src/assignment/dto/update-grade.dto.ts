import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class UpdateGradeDto {
  @IsString()
  @IsNotEmpty()
  grade: string;

  @IsString()
  @IsOptional()
  feedback?: string;
}
