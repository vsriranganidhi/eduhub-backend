import { IsNotEmpty, IsString, MaxLength, MinLength, IsOptional, IsUUID } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(500)
  content: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}