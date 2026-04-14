import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentService {
  constructor(private prisma: PrismaService) {}

  async create(createDepartmentDto: CreateDepartmentDto, institutionId: string) {
    const existing = await this.prisma.department.findFirst({
      where: {
        name: { equals: createDepartmentDto.name, mode: 'insensitive' },
        institutionId,
      },
    });

    if (existing) {
      throw new ConflictException('Department with this name already exists in your institution');
    }

    return this.prisma.department.create({
      data: {
        name: createDepartmentDto.name,
        institutionId,
      },
    });
  }

  async findAll(institutionId: string) {
    return this.prisma.department.findMany({
      where: { institutionId },
      include: {
        subjects: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, institutionId: string) {
    const department = await this.prisma.department.findFirst({
      where: {
        id,
        institutionId,
      },
      include: {
        subjects: true,
      },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return department;
  }

  async update(id: string, updateDepartmentDto: UpdateDepartmentDto, institutionId: string) {
    const department = await this.prisma.department.findFirst({
      where: {
        id,
        institutionId,
      },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    if (updateDepartmentDto.name) {
      const existing = await this.prisma.department.findFirst({
        where: {
          name: { equals: updateDepartmentDto.name, mode: 'insensitive' },
          institutionId,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException('Department with this name already exists in your institution');
      }
    }

    return this.prisma.department.update({
      where: { id },
      data: updateDepartmentDto,
      include: {
        subjects: true,
      },
    });
  }

  async remove(id: string, institutionId: string) {
    const department = await this.prisma.department.findFirst({
      where: {
        id,
        institutionId,
      },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return this.prisma.department.delete({
      where: { id },
    });
  }
}
