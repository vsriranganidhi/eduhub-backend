import { IsNotEmpty, IsString, MinLength, IsEnum, IsUUID } from 'class-validator';

export class CreateSubjectDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string; // e.g., "Data Structures"
  
  @IsEnum(['TEACHER_RESOURCE', 'STUDENT_RESOURCE', 'ASSIGNMENT'])
  @IsNotEmpty()
  category: 'TEACHER_RESOURCE' | 'STUDENT_RESOURCE' | 'ASSIGNMENT'; // e.g., "TEACHER_RESOURCE"

  @IsUUID()
  @IsNotEmpty()
  departmentId: string; // Department this subject belongs to
}
