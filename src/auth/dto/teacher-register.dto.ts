import { IsEmail, IsNotEmpty, IsString, MinLength, IsUUID } from 'class-validator';

export class TeacherRegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  joinCode: string;

  @IsString()
  @IsNotEmpty()
  invitationToken: string;
}