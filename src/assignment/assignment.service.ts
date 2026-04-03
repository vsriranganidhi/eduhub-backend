import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { promises as fs } from 'fs';

@Injectable()
export class AssignmentService {
  constructor(private prisma: PrismaService) { }

  async createAssignment(dto: CreateAssignmentDto, file: Express.Multer.File | undefined, teacherId: string) {
    try {
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
          isLateAllowed: dto.isLateAllowed,
          fileUrl: file ? file.path.replace(/\\/g, '/') : null, // Store question paper path
          subjectId: dto.subjectId,
          creatorId: teacherId,
        },
        include: {
          subject: { select: { name: true } }
        }
      });
    } catch (error) {
      // Clean up uploaded file if any error occurs
      if (file) {
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          // Log but don't throw - file cleanup failure shouldn't mask the original error
        }
      }
      throw error;
    }
  }

  async updateAssignment(assignmentId: string, dto: UpdateAssignmentDto, file: Express.Multer.File | undefined, teacherId: string, userRole: string) {
    // 1. Verify assignment exists and belongs to the teacher
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { creatorId: true, fileUrl: true, dueDate: true }
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (assignment.creatorId !== teacherId && userRole !== 'COLLEGE_ADMIN') {
      throw new BadRequestException('You can only update your own assignments');
    }

    // 2. Prepare update data
    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.dueDate !== undefined) updateData.dueDate = new Date(dto.dueDate);
    if (dto.isLateAllowed !== undefined) updateData.isLateAllowed = dto.isLateAllowed;

    // 3. Handle file update
    if (file) {
      // Delete old file if it exists
      if (assignment.fileUrl) {
        try {
          await fs.unlink(assignment.fileUrl);
        } catch (error: any) {
          if (error.code !== 'ENOENT') {
            throw error;
          }
        }
      }
      updateData.fileUrl = file.path.replace(/\\/g, '/');
    }

    // 4. Update assignment
    const updatedAssignment = await this.prisma.assignment.update({
      where: { id: assignmentId },
      data: updateData,
      include: {
        subject: { select: { name: true } }
      }
    });

    // 5. If due date was updated, recalculate isLate only if postponed (moved later)
    if (dto.dueDate !== undefined) {
      const newDueDate = new Date(dto.dueDate);
      const oldDueDate = assignment.dueDate;

      // Only recalculate if due date is postponed (moved later)
      // If preponed (moved earlier), lock existing submissions' isLate status
      if (newDueDate > oldDueDate) {
        const submissions = await this.prisma.submission.findMany({
          where: { assignmentId },
          select: { id: true, submittedAt: true }
        });

        // Separate submissions into two groups: late and on-time based on new due date
        const lateSubmissionIds = submissions
          .filter(s => s.submittedAt > newDueDate)
          .map(s => s.id);
        
        const onTimeSubmissionIds = submissions
          .filter(s => s.submittedAt <= newDueDate)
          .map(s => s.id);

        // Execute both updates atomically in a transaction
        await this.prisma.$transaction([
          // Mark submissions submitted after new due date as late
          this.prisma.submission.updateMany({
            where: { id: { in: lateSubmissionIds } },
            data: { isLate: true }
          }),
          // Mark submissions submitted before or on new due date as on-time
          this.prisma.submission.updateMany({
            where: { id: { in: onTimeSubmissionIds } },
            data: { isLate: false }
          })
        ]);
      }
    }

    return updatedAssignment;
  }

  async deleteAssignment(assignmentId: string, teacherId: string, userRole: string) {
    // 1. Verify assignment exists and belongs to the teacher
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { creatorId: true, fileUrl: true }
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (assignment.creatorId !== teacherId && userRole !== 'COLLEGE_ADMIN') {
      throw new BadRequestException('You can only delete your own assignments');
    }

    // 2. Get all submissions for this assignment before deletion
    const submissions = await this.prisma.submission.findMany({
      where: { assignmentId },
      select: { id: true, fileUrl: true }
    });

    // 3. Delete assignment from database first (cascade will automatically delete all submissions)
    await this.prisma.assignment.delete({
      where: { id: assignmentId },
      select: { id: true }
    });

    // 4. Delete assignment file if it exists
    if (assignment.fileUrl) {
      try {
        await fs.unlink(assignment.fileUrl);
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          console.error('Failed to delete assignment file:', error);
        }
      }
    }

    // 5. Delete submission files
    for (const submission of submissions) {
      if (submission.fileUrl) {
        try {
          await fs.unlink(submission.fileUrl);
        } catch (error: any) {
          if (error.code !== 'ENOENT') {
            console.error('Failed to delete submission file:', error);
          }
        }
      }
    }
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

    // 3. Determine if submission is late
    const now = new Date();
    const isLate = now > assignment.dueDate;

    // 4. Check if late submission is allowed
    if (isLate && !assignment.isLateAllowed) {
      throw new BadRequestException('Late submissions are not allowed for this assignment');
    }

    // 5. Create the Submission
    try {
      return await this.prisma.submission.create({
        data: {
          assignmentId: dto.assignmentId,
          submitterId: studentId,
          fileUrl: file.path.replace(/\\/g, '/'),
          submissionStatus: 'SUBMITTED',
          reviewStatus: 'PENDING_REVIEW',
          isLate: isLate,
        },
        include: {
          assignment: { select: { title: true, dueDate: true } }
        }
      });
    } catch (error: any) {
      //'P2002' is Prisma's error code for unique constraint violation
      //'23505' is PostgreSQL's error code for unique constraint violation
      if (error.code === 'P2002' || (error.meta?.cause?.originalCode === '23505' && error.meta?.cause?.constraint?.fields?.includes('"submitterId"'))) {
        throw new BadRequestException('You have already submitted this assignment. Only one submission per assignment is allowed.');
      }
      throw error;
    }
  }

  async deleteSubmission(submissionId: string, studentId: string) {
    // 1. Verify submission exists and belongs to the student
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      select: { submitterId: true, fileUrl: true, assignment: { select: { dueDate: true } } }
    });
    if (!submission) {
      throw new NotFoundException('Submission not found');
    }
    if (submission.submitterId !== studentId) {
      throw new BadRequestException('You can only delete your own submission');
    }

    // 2. Delete submission from database first
    await this.prisma.submission.delete({
      where: { id: submissionId },
      select: {
        id: true
      }
    });

    // 3. Delete file from filesystem after database deletion succeeds
    if (submission.fileUrl) {
      try {
        await fs.unlink(submission.fileUrl);
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          console.error('Failed to delete submission file:', error);
        }
      }
    }
  }

  async updateSubmission(submissionId: string, studentId: string, fileUrl: string) {
    // 1. Verify submission exists and belongs to the student
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: { assignment: { select: { dueDate: true, isLateAllowed: true } } }
    });
    if (!submission) {
      throw new NotFoundException('Submission not found');
    }
    if (submission.submitterId !== studentId) {
      throw new BadRequestException('You can only update your own submission');
    }
    // 2. Check if due date has passed
    const now = new Date();
    if (now > submission.assignment.dueDate && !submission.assignment.isLateAllowed) {
      throw new BadRequestException('Cannot update submission after due date');
    }
    // 3. Delete old file if it exists
    if (submission.fileUrl) {
      try {
        await fs.unlink(submission.fileUrl);
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
    }
    // 4. Determine if update is late
    const isLate = now > submission.assignment.dueDate;
    // 5. Update submission with new file and timestamp
    return this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        fileUrl: fileUrl,
        submittedAt: new Date(),
        submissionStatus: 'SUBMITTED',
        isLate: isLate
      },
      select: {
        id: true,
        fileUrl: true,
        submittedAt: true,
        submissionStatus: true,
        reviewStatus: true,
        isLate: true
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

  async findAllSubmissionsForAssignment(assignmentId: string, userId: string, userRole: string) {
    // 1. Verify assignment exists
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { creatorId: true }
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    // 2. If teacher/admin, return all submissions for the assignment
    if (userRole === 'TEACHER' || userRole === 'COLLEGE_ADMIN') {
      if (assignment.creatorId !== userId && userRole !== 'COLLEGE_ADMIN') {
        throw new BadRequestException('You can only view submissions for your own assignments');
      }
      return this.prisma.submission.findMany({
        where: { assignmentId },
        include: {
          submitter: { select: { id: true, firstName: true, lastName: true } }
        }
      });
    }

    // 3. If student, return only their own submission
    if (userRole === 'STUDENT') {
      return this.prisma.submission.findMany({
        where: { assignmentId, submitterId: userId },
        include: {
          submitter: { select: { id: true, firstName: true, lastName: true } }
        }
      });
    }

    throw new BadRequestException('Invalid user role');
  }

  async gradeSubmission(submissionId: string, grade: string, feedback: string | undefined, teacherId: string, userRole: string) {
    // 1. Verify submission exists and get assignment creator
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: { assignment: { select: { dueDate: true, creatorId: true } } }
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    // 2. Verify teacher is the creator of the assignment or is a college admin
    if (submission.assignment.creatorId !== teacherId && userRole !== 'COLLEGE_ADMIN') {
      throw new BadRequestException('You can only grade submissions for your own assignments');
    }

    // 3. Check if due date has passed
    const now = new Date();
    if (now <= submission.assignment.dueDate) {
      throw new BadRequestException('Cannot grade submission before due date');
    }

    // 4. Update submission with grade and feedback
    return this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        grade,
        feedback: feedback || null,
        reviewStatus: 'GRADED'
      },
      select: {
        id: true,
        grade: true,
        feedback: true,
        reviewStatus: true
      }
    });
  }

}