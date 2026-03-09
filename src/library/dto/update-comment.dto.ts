import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateCommentDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(500)
  content: string;
}