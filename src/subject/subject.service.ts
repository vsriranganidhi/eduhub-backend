import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { SubjectCategory } from '../generated/prisma/client';
import * as fs from 'fs'; // Node.js File System
import { join } from 'path';

@Injectable()
export class SubjectService {
  constructor(private prisma: PrismaService) { }

  async create(dto: CreateSubjectDto, user: { id: string, role: string, institutionId: string }) {
    // Role-based validation for subject creation
    if (user.role === 'TEACHER' && !(dto.category == 'TEACHER_RESOURCE' || dto.category == 'ASSIGNMENT')) {
      throw new ForbiddenException('Teachers can only create Teacher Resource subjects or Assignments');
    }

    if (user.role === 'STUDENT' && dto.category !== 'STUDENT_RESOURCE') {
      throw new ForbiddenException('Students can only create Student Resource subjects');
    }

    // Check if subject already exists in the same category (case-insensitive)
    const existing = await this.prisma.subject.findFirst({
      where: { 
        name: { equals: dto.name, mode: 'insensitive' },
        category: dto.category 
      },
    });

    if (existing) {
      throw new ConflictException(`Subject with this name already exists in ${dto.category}`);
    }

    return this.prisma.subject.create({
      data: { 
        ...dto,
        institutionId: user.institutionId,
        createdBy: user.id,
      },
    });
  }

  async findAll(category?: SubjectCategory, institutionId?: string) {
    return this.prisma.subject.findMany({
      where: {
        // If a category is provided, filter by it. Otherwise, return all.
        ...(category ? { category } : {}),
        ...(institutionId ? { institutionId } : {}),
      },
      include: {
        _count: {
          select: { resources: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async update(id: string, dto: UpdateSubjectDto, user: { id: string, role: string }) {
    const subject = await this.prisma.subject.findUnique({ where: { id } });

    if (!subject) throw new NotFoundException('Subject not found');

    // Authorization: Only COLLEGE_ADMIN or the creator can update
    if (user.role !== 'COLLEGE_ADMIN' && subject.createdBy !== user.id) {
      throw new ForbiddenException('You can only update subjects you created');
    }

    // Check if new name already exists (excluding current subject)
    if (dto.name) {
      const existing = await this.prisma.subject.findFirst({
        where: {
          name: { equals: dto.name, mode: 'insensitive' },
          id: { not: id } // Exclude current subject
        },
      });

      if (existing) {
        throw new ConflictException('Subject with this name already exists');
      }
    }

    return this.prisma.subject.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, userId: string, userRole: string) {
    // 1. Fetch the subject and its resources
    const subject = await this.prisma.subject.findUnique({
      where: { id },
      include: { resources: true },
    });

    if (!subject) throw new NotFoundException('Subject not found');

    // 2. Authorization: Only COLLEGE_ADMIN or the creator can delete
    if (userRole !== 'COLLEGE_ADMIN' && subject.createdBy !== userId) {
      throw new ForbiddenException('You can only delete subjects you created');
    }

    // 3. Physical File Cleanup (Mass Delete)
    // We must delete the files from the disk before the DB rows disappear
    for (const resource of subject.resources) {
      try {
        const filePath = join(process.cwd(), resource.fileUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error(`Cleanup failed for: ${resource.fileUrl}`, err);
      }
    }

    // 4. Database Deletion
    // Cascade delete in Prisma handles the Resources, Comments, and Upvotes
    return this.prisma.subject.delete({
      where: { id },
    });
  }
}