import { 
  Controller, Post, Get, Body, Param, UseGuards, Req, UseInterceptors, UploadedFile, BadRequestException 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AuthGuard } from '../auth/auth.gaurd';
import { RolesGuard } from '../auth/roles.gaurd';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma/client';
import { AssignmentService } from './assignment.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { CreateSubmissionDto } from './dto/create-submission.dto';

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

@Controller('assignments')
@UseGuards(AuthGuard, RolesGuard)
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Post('/createAssignment')
  @Roles(Role.TEACHER, Role.ADMIN)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/assignments/questions',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        callback(null, `task-${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
  }))
  createAssignment(
    @Body() dto: CreateAssignmentDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any
  ) {
    return this.assignmentService.createAssignment(dto, file, req.user.sub);
  }

  @Post('/createSubmission')
  @Roles(Role.TEACHER, Role.STUDENT, Role.ADMIN)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/assignments/submissions',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now + '-' + Math.round(Math.random()*1e9);
        callback(null, `task-${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
  }))
  createSubmission(
    @Body() dto: CreateSubmissionDto,
    @UploadedFile() file:Express.Multer.File,
    @Req() req: any
  ) {
    return this.assignmentService.createSubmission(dto, file, req.user.sub);
  }

  @Get('subject/:subjectId')
  findAllAssignmentsForASubject(@Param('subjectId') subjectId: string) {
    return this.assignmentService.findAllAssignmentsForASubject(subjectId);
  }

  @Get('assignement/:assignmentId')
  findAllSubmissionsForAssignment(@Param('assignmentId') assignmentId: string) {
    return this.assignmentService.findAllSubmissionsForAssignment(assignmentId);
  }
}