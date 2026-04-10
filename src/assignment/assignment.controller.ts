import {
  Controller, Post, Get, Delete, Put, Body, Param, UseGuards, Req, UseInterceptors, UploadedFile, BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '../auth/auth.gaurd';
import { RolesGuard } from '../auth/roles.gaurd';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma/client';
import { AssignmentService } from './assignment.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';

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
  constructor(private readonly assignmentService: AssignmentService) { }

  @Post('/createAssignment')
  @Roles(Role.TEACHER, Role.COLLEGE_ADMIN)
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
  }))
  createAssignment(
    @Body() dto: CreateAssignmentDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any
  ) {
    return this.assignmentService.createAssignment(dto, file, req.user.sub);
  }

  @Put('/assignment/:assignmentId')
  @Roles(Role.TEACHER, Role.COLLEGE_ADMIN)
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
  }))
  updateAssignment(
    @Param('assignmentId') assignmentId: string,
    @Body() dto: UpdateAssignmentDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: any
  ) {
    return this.assignmentService.updateAssignment(assignmentId, dto, file, req.user.sub, req.user.role);
  }

  @Delete('/assignment/:assignmentId')
  @Roles(Role.TEACHER, Role.COLLEGE_ADMIN)
  deleteAssignment(
    @Param('assignmentId') assignmentId: string,
    @Req() req: any
  ) {
    return this.assignmentService.deleteAssignment(assignmentId, req.user.sub, req.user.role);
  }

  @Post('/createSubmission')
  @Roles(Role.STUDENT, Role.COLLEGE_ADMIN)
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
  }))
  createSubmission(
    @Body() dto: CreateSubmissionDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any
  ) {
    return this.assignmentService.createSubmission(dto, file, req.user.sub);
  }

  @Delete('/submission/:submissionId')
  @Roles(Role.STUDENT, Role.COLLEGE_ADMIN)
  deleteSubmission(
    @Param('submissionId') submissionId: string,
    @Req() req: any
  ) {
    return this.assignmentService.deleteSubmission(submissionId, req.user.sub);
  }

  @Put('/submission/:submissionId')
  @Roles(Role.STUDENT, Role.COLLEGE_ADMIN)
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
  }))
  updateSubmission(
    @Param('submissionId') submissionId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any
  ) {
    if (!file) {
      throw new BadRequestException('File is required for submission update');
    }
    return this.assignmentService.updateSubmission(submissionId, req.user.sub, file);
  }

  @Get('subject/:subjectId')
  findAllAssignmentsForASubject(@Param('subjectId') subjectId: string) {
    return this.assignmentService.findAllAssignmentsForASubject(subjectId);
  }

  @Get('assignment/:assignmentId')
  @UseGuards(AuthGuard)
  findAllSubmissionsForAssignment(
    @Param('assignmentId') assignmentId: string,
    @Req() req: any
  ) {
    return this.assignmentService.findAllSubmissionsForAssignment(assignmentId, req.user.sub, req.user.role);
  }

  @Put('/submission/:submissionId/grade')
  @Roles(Role.TEACHER, Role.COLLEGE_ADMIN)
  gradeSubmission(
    @Param('submissionId') submissionId: string,
    @Body() dto: GradeSubmissionDto,
    @Req() req: any
  ) {
    return this.assignmentService.gradeSubmission(submissionId, dto.grade, dto.feedback, req.user.sub, req.user.role);
  }
}