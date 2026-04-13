import {
  Controller, Post, Get, Query, UseInterceptors, UploadedFile,
  Body, UseGuards, Req, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator,
  BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '../auth/auth.gaurd';
import { RolesGuard } from '../auth/roles.gaurd';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma/client';
import { LibraryService } from './library.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { Param } from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { Delete } from '@nestjs/common';
import { Patch } from '@nestjs/common';

// Custom file type validator
const customFileTypeValidator = (file: Express.Multer.File): boolean => {
  const allowedMimeTypes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new BadRequestException(
      `Invalid file type: ${file.mimetype}. Allowed types: ${allowedMimeTypes.join(', ')}`
    );
  }

  return true;
};

@Controller('library')
export class LibraryController {
  //This line is for dependency injection and it allows the controller to use all methods of the library service
  //Private: property is accessible only within this class
  //readonly: prevents the property from being reassigned
  constructor(private readonly libraryService: LibraryService) { }

  @Post('upload')
  @Roles(Role.TEACHER, Role.COLLEGE_ADMIN, Role.STUDENT)
  @UseGuards(AuthGuard, RolesGuard)
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit (in bytes)
    },
  }))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateResourceDto,
    @Req() req: any
  ) {
    // Pass everything to the service, including the user's role from the token
    return this.libraryService.createResource(file, dto, req.user.sub, req.user.role);
  }

  @Get(':subjectId')
  @UseGuards(AuthGuard) // Everyone (Student, Teacher, Admin) can view the library
  findAll(
    @Param('subjectId') subjectId: string,
    @Query('search') search?: string,
    @Query('uploaderName') uploaderName?: string,
    @Query('cursor') cursor?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const parsedPageSize = pageSize ? Math.min(parseInt(pageSize, 10), 100) : 20;
    return this.libraryService.findAll(subjectId, search, uploaderName, cursor, parsedPageSize);
  }

  @Post(':id/upvote')
  @UseGuards(AuthGuard)
  async toggleUpvote(
    @Param('id') resourceId: string,
    @Req() req: any
  ) {
    return this.libraryService.toggleUpvote(resourceId, req.user.sub);
  }

  @Post(':id/comments')
  @UseGuards(AuthGuard)
  async addComment(
    @Param('id') resourceId: string,
    @Body() dto: CreateCommentDto,
    @Req() req: any,
  ) {
    return this.libraryService.addComment(resourceId, req.user.sub, dto);
  }

  @Get(':id/comments')
  @UseGuards(AuthGuard)
  async getComments(@Param('id') resourceId: string) {
    return this.libraryService.getComments(resourceId);
  }

  @Patch('comments/:commentId')
  @UseGuards(AuthGuard)
  async updateComment(
    @Param('commentId') commentId: string,
    @Body() dto: UpdateCommentDto,
    @Req() req: any,
  ) {
    return this.libraryService.updateComment(commentId, req.user.sub, dto);
  }

  @Delete('comments/:commentId')
  @UseGuards(AuthGuard)
  async deleteComment(
    @Param('commentId') commentId: string,
    @Req() req: any,
  ) {
    return this.libraryService.deleteComment(commentId, req.user.sub, req.user.role);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.libraryService.removeResource(id, req.user.sub, req.user.role);
  }
}