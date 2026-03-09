import { IsNotEmpty, IsString, MinLength, IsEnum } from 'class-validator';

export class CreateSubjectDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string; // e.g., "Data Structures"
  
  @IsEnum(['TEACHER_RESOURCE', 'STUDENT_RESOURCE'])
  @IsNotEmpty()
  category: 'TEACHER_RESOURCE' | 'STUDENT_RESOURCE'; // e.g., "TEACHER_RESOURCE"
}
