import { IsEmail, IsNotEmpty } from 'class-validator';

export class ResendInvitationDto {
  @IsEmail()
  email: string;
}
