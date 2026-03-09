import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { LibraryCategory } from '../../generated/prisma/client';

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

  @IsEnum(LibraryCategory)
  @IsNotEmpty()
  category: LibraryCategory; // TEACHER_RESOURCE or STUDENT_RESOURCE
}