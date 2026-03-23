import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateInstitutionDto {
  
  //Institution information
  //Name of the institution
  @IsString()
  @IsNotEmpty()
  name: string;

  //Branch of the institution
  @IsString()
  branch: string;


  //Admin information
  //Email Id of the admin from the institution
  @IsEmail()
  email: string;

  //First name of the admin from the institution
  @IsString()
  @IsNotEmpty()
  firstName: string;

  //Last name of the admin from the institution
  @IsString()
  @IsNotEmpty()
  lastName: string;
}