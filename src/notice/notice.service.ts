import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { UpdateNoticeDto } from './dto/update-notice.dto';
import { NotFoundException } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class NoticeService {
  constructor(private prisma: PrismaService) { }

  async create(dto: CreateNoticeDto, userId: string, institutionId: string) {
    return this.prisma.notice.create({
      data: {
        ...dto,
        authorId: userId,
        institutionId,
        updatedAt: new Date(),
      },
    });
  }

  async findAll(search?: string, subject?: string, teacherName?: string, institutionId?: string) {
    return this.prisma.notice.findMany({
      where: {
        AND: [
          // Filter by user's institution
          institutionId ? { institutionId } : {},
          // Only fetch active notices (not deleted)
          { deletedAt: null },
          // 1. Search in Title or Content
          search ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { content: { contains: search, mode: 'insensitive' } },
            ],
          } : {},
          // 2. Filter by Subject
          subject ? { subject: { equals: subject, mode: 'insensitive' } } : {},
          // 3. NEW: Filter by Teacher Name (Joining the User table)
          teacherName ? {
            author: {
              OR: [
                // 1. Check if the string is in the first name
                { firstName: { contains: teacherName, mode: 'insensitive' } },
                // 2. Check if the string is in the last name
                { lastName: { contains: teacherName, mode: 'insensitive' } },
                // 3. Handle "John Doe" by checking both together (Advanced)
                {
                  AND: [
                    { firstName: { contains: teacherName.split(' ')[0], mode: 'insensitive' } },
                    { lastName: { contains: teacherName.split(' ')[1] || '', mode: 'insensitive' } },
                  ]
                }
              ],
            },
          } : {},
          {
            OR: [
              { expiresAt: null },        // Show if no expiry set
              { expiresAt: { gt: new Date() } }, // Show if expiry is in the future
            ],
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { firstName: true, lastName: true },
        },
      },
    });
  }

  async update(id: string, userId: string, dto: UpdateNoticeDto) {
    // 1. Find the notice first
    const notice = await this.prisma.notice.findUnique({ where: { id } });

    if (!notice) throw new NotFoundException('Notice not found');

    // 2. Check Ownership
    if (notice.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own notices');
    }

    return this.prisma.notice.update({
      where: { id },
      data: dto,
    });
  }


  async remove(id: string, userId: string, userRole: string, institutionId: string) {
    const notice = await this.prisma.notice.findUnique({ where: { id } });

    if (!notice) throw new NotFoundException('Notice not found');

    if (notice.authorId !== userId && userRole !== 'COLLEGE_ADMIN' && notice.institutionId !== institutionId) {
      throw new ForbiddenException('No permission');
    }

    // Soft Delete: Just set the timestamp
    return this.prisma.notice.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findArchived(institutionId?: string) {
    return this.prisma.notice.findMany({
      where: {
        AND: [
          // Filter by user's institution
          institutionId ? { institutionId } : {},
          {
            OR: [
              { deletedAt: { not: null } }, // Manually deleted
              { expiresAt: { lt: new Date() } } // Naturally expired
            ],
          },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        author: {
          select: { firstName: true, lastName: true },
        },
      },
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handlePeriodicCleanup() {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - 1);

    const deleted = await this.prisma.notice.deleteMany({
      where: {
        OR: [
          { deletedAt: { lt: threshold } },
          {
            AND: [
              { expiresAt: { lt: threshold } },
              { expiresAt: { not: null } }
            ]
          }
        ]
      }
    });
    console.log(`Cleaned up ${deleted.count} old notices.`);
  }
}