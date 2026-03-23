import { IsEmail, IsNotEmpty } from 'class-validator';

export class InviteTeacherDto {
  @IsEmail()
  email: string;
}