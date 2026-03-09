import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from '../prisma/prisma.service';
import { CreateResourceDto } from './dto/create-resource.dto';

@Injectable()
export class LibraryService {
  constructor(private prisma: PrismaService) { }

  async createResource(
    file: Express.Multer.File,
    dto: CreateResourceDto,
    userId: string,
    userRole: string
  ) {
    // 1. Fetch the subject to verify its category
    const subject = await this.prisma.subject.findUnique({
      where: { id: dto.subjectId }
    });

    if (!subject) throw new NotFoundException('Subject not found');

    // 2. Logic Check: Ensure categories match user role
    // Students can only upload to STUDENT_RESOURCE subjects
    // Teachers can only upload to TEACHER_RESOURCE subjects
    // Admins can upload to any subject

    if (userRole === 'STUDENT' && subject.category !== 'STUDENT_RESOURCE') {
      throw new BadRequestException(
        `Students can only upload to STUDENT_RESOURCE subjects, not ${subject.category}.`
      );
    }

    if (userRole === 'TEACHER' && subject.category !== 'TEACHER_RESOURCE') {
      throw new BadRequestException(
        `Teachers can only upload to TEACHER_RESOURCE subjects, not ${subject.category}.`
      );
    }

    // For students, override the category to ensure consistency
    const finalCategory = userRole === 'STUDENT' ? 'STUDENT_RESOURCE' : dto.category;

    // 3. Create the resource
    return this.prisma.libraryResource.create({
      data: {
        title: dto.title,
        description: dto.description,
        fileUrl: file.path.replace(/\\/g, '/'),
        fileType: file.mimetype,
        fileSize: file.size,
        subjectId: dto.subjectId,
        uploaderId: userId,
      },
    });
  }

  async findAll(subject?: string, search?: string, uploaderName?: string) {
    const resources = await this.prisma.libraryResource.findMany({
      where: {
        AND: [
          // Filter by subject name through relation
          subject ? {
            subject: {
              name: { contains: subject, mode: 'insensitive' }
            }
          } : {},
          // Search in title and description
          search ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } }
            ]
          } : {},
          // Filter by uploader name
          uploaderName ? {
            uploader: {
              OR: [
                { firstName: { contains: uploaderName, mode: 'insensitive' } },
                { lastName: { contains: uploaderName, mode: 'insensitive' } },
                // Handle full name like "John Doe"
                {
                  AND: [
                    { firstName: { contains: uploaderName.split(' ')[0], mode: 'insensitive' } },
                    { lastName: { contains: uploaderName.split(' ')[1] || '', mode: 'insensitive' } }
                  ]
                }
              ]
            }
          } : {},
        ],
      },
      include: {
        uploader: { select: { firstName: true, lastName: true } },
        subject: { select: { name: true, category: true } },
        upvotes: true,
      },
      orderBy: {
        upvotes: {
          _count: 'desc'
        }
      }
    });

    // Use an environment variable for the base URL
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';

    return resources.map(res => ({
      ...res,
      // We map 'uploads/' to our static route '/static/'
      fileUrl: `${baseUrl}/static/${res.fileUrl.replace('uploads/', '')}`,
      upvoteCount: res.upvotes.length,
    }));
  }

  async toggleUpvote(resourceId: string, userId: string) {
    // 1. Verify the resource exists and fetch it with subject relation
    const resource = await this.prisma.libraryResource.findUnique({
      where: { id: resourceId },
      include: { subject: true },
    });

    if (!resource) throw new NotFoundException('Resource not found');

    // 2. Check if the resource's subject is a STUDENT_RESOURCE
    if (resource.subject.category !== 'STUDENT_RESOURCE') {
      throw new BadRequestException('Upvotes are only allowed for Student Library resources');
    }

    // 3. Check if the upvote already exists
    const existingUpvote = await this.prisma.upvote.findUnique({
      where: {
        userId_resourceId: { userId, resourceId },
      },
    });

    if (existingUpvote) {
      // 4. If it exists, REMOVE it (un-upvote)
      await this.prisma.upvote.delete({
        where: {
          userId_resourceId: { userId, resourceId },
        },
      });
      return { message: 'Upvote removed', upvoted: false };
    } else {
      // 5. If it doesn't exist, CREATE it
      await this.prisma.upvote.create({
        data: { userId, resourceId },
      });
      return { message: 'Upvote added', upvoted: true };
    }
  }
}