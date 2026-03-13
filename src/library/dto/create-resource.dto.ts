import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { SubjectCategory } from '../../generated/prisma/client';

export class CreateResourceDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  @IsNotEmpty()
  subjectId: string; // The ID of the Subject (Folder)

  @IsEnum(SubjectCategory)
  @IsNotEmpty()
  category: SubjectCategory; // TEACHER_RESOURCE or STUDENT_RESOURCE
}