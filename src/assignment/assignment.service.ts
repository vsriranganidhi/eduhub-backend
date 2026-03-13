import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { CreateSubmissionDto } from './dto/create-submission.dto';

@Injectable()
export class AssignmentService {
  constructor(private prisma: PrismaService) {}

  async createAssignment(dto: CreateAssignmentDto, file: Express.Multer.File | undefined, teacherId: string) {
    // 1. Verify Subject exists and is an ASSIGNMENT category
    const subject = await this.prisma.subject.findUnique({
      where: { id: dto.subjectId },
    });

    if (!subject || subject.category !== 'ASSIGNMENT') {
      throw new BadRequestException('Invalid subject: Assignment must be linked to an ASSIGNMENT category subject');
    }

    // 2. Create the Assignment
    return this.prisma.assignment.create({
      data: {
        title: dto.title,
        description: dto.description,
        dueDate: new Date(dto.dueDate),
        fileUrl: file ? file.path.replace(/\\/g, '/') : null, // Store question paper path
        subjectId: dto.subjectId,
        creatorId: teacherId,
      },
      include: {
        subject: { select: { name: true } }
      }
    });
  }

  async createSubmission(dto: CreateSubmissionDto, file: Express.Multer.File | undefined, studentId: string) {
    // 1. Verify file is provided
    if (!file) {
      throw new BadRequestException('File is required for submission');
    }

    // 2. Verify if the assignment exists
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: dto.assignmentId },
    });

    if (!assignment) {
      throw new BadRequestException('No assignment is existing');
    }

    // 3. Create the Submission
    return this.prisma.submission.create({
      data: {
        assignmentId: dto.assignmentId,
        submitterId: studentId,
        fileUrl: file.path.replace(/\\/g, '/'),
      },
      include: {
        assignment: { select: { title: true, dueDate: true } }
      }
    });
  }

  async findAllAssignmentsForASubject(subjectId: string) {
    return this.prisma.assignment.findMany({
      where: { subjectId },
      include: {
        _count: { select: { submissions: true } }
      },
      orderBy: { dueDate: 'asc' }
    });
  }

  async findAllSubmissionsForAssignment(assignmentId: string) {
    return this.prisma.submission.findMany({
      where: { assignmentId },
      include: {
        submitter: { select: { id: true, firstName: true, lastName: true } }
      }
    });
  }
}