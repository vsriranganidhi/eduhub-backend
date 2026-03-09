import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { LibraryCategory } from '../generated/prisma/client';

@Injectable()
export class SubjectService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSubjectDto, user: { id: string, role: string }) {
    // Role-based validation for subject creation
    if (user.role === 'TEACHER' && dto.category !== 'TEACHER_RESOURCE') {
      throw new ForbiddenException('Teachers can only create Teacher Resource subjects');
    }
    
    if (user.role === 'STUDENT' && dto.category !== 'STUDENT_RESOURCE') {
      throw new ForbiddenException('Students can only create Student Resource subjects');
    }

    // Check if subject already exists (case-insensitive)
    const existing = await this.prisma.subject.findFirst({
      where: { name: { equals: dto.name, mode: 'insensitive' } },
    });

    if (existing) {
      throw new ConflictException('Subject already exists');
    }

    return this.prisma.subject.create({
      data: { ...dto },
    });
  }

  async findAll(category?: LibraryCategory) {
    return this.prisma.subject.findMany({
      where: {
        // If a category is provided, filter by it. Otherwise, return all.
        ...(category ? { category } : {}),
      },
      include: {
        _count: {
          select: { resources: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async remove(id: string, user: { id: string, role: string }) {
    const subject = await this.prisma.subject.findUnique({ 
      where: { id },
      include: { resources: true } 
    });

    if (!subject) throw new NotFoundException('Subject not found');

    // 1. Admin Rule (God Mode)
    if (user.role === 'ADMIN') {
      return this.prisma.subject.delete({ where: { id } });
    }

    // 2. Cross-Category Rule
    if (user.role === 'TEACHER' && subject.category !== 'TEACHER_RESOURCE') {
      throw new ForbiddenException('Teachers can only manage Teacher Library subjects');
    }

    if (user.role === 'STUDENT' && subject.category !== 'STUDENT_RESOURCE') {
      throw new ForbiddenException('Students can only manage Student Library subjects');
    }

    // 3. Prevent deletion if files exist (Safety Rule)
    if (subject.resources.length > 0) {
      throw new BadRequestException('Cannot delete subject that still contains files!');
    }

    return this.prisma.subject.delete({ where: { id } });
  }

  async update(id: string, dto: UpdateSubjectDto, user: { id: string, role: string }) {
    const subject = await this.prisma.subject.findUnique({ where: { id } });

    if (!subject) throw new NotFoundException('Subject not found');

    // 1. Admin Rule (God Mode) - Can update any subject
    if (user.role === 'ADMIN') {
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

    // 2. Cross-Category Rule for Teachers and Students
    if (user.role === 'TEACHER' && subject.category !== 'TEACHER_RESOURCE') {
      throw new ForbiddenException('Teachers can only update Teacher Resource subjects');
    }

    if (user.role === 'STUDENT' && subject.category !== 'STUDENT_RESOURCE') {
      throw new ForbiddenException('Students can only update Student Resource subjects');
    }

    // 3. Check if new name already exists (excluding current subject)
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
}