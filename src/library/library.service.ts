import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from '../prisma/prisma.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ForbiddenException } from "@nestjs/common";
import { UpdateCommentDto } from './dto/update-comment.dto';
import { S3StorageService } from './s3-storage.service';

@Injectable()
export class LibraryService {
  constructor(
    private prisma: PrismaService,
    private s3StorageService: S3StorageService
  ) { }

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
    const finalCategory = userRole === 'STUDENT' ? 'STUDENT_RESOURCE' : subject.category;

    // 3. Upload file to S3
    const fileUrl = await this.s3StorageService.uploadFile(file);

    // 4. Create the resource with S3 URL
    return this.prisma.libraryResource.create({
      data: {
        title: dto.title,
        description: dto.description,
        fileUrl: fileUrl,
        fileType: file.mimetype,
        fileSize: file.size,
        subjectId: dto.subjectId,
        uploaderId: userId,
      },
    });
  }

  async findAll(subjectId: string, search?: string, uploaderName?: string, cursor?: string, pageSize: number = 20) {
    const resources = await this.prisma.libraryResource.findMany({
      where: {
        AND: [
          // Filter by subject ID
          { subjectId },
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
        comments: true,
      },
      orderBy: {
        upvotes: {
          _count: 'desc'
        }
      },
      take: pageSize + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
    });

    // Use an environment variable for the base URL
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';

    const hasNextPage = resources.length > pageSize;
    const items = hasNextPage ? resources.slice(0, -1) : resources;
    const nextCursor = hasNextPage ? items[items.length - 1]?.id : null;

    return {
      items: items.map(res => ({
        ...res,
        // We map 'uploads/' to our static route '/static/'
        fileUrl: `${baseUrl}/static/${res.fileUrl.replace('uploads/', '')}`,
        upvoteCount: res.upvotes.length,
        commentCount: res.comments.length,
      })),
      nextCursor,
      hasNextPage,
    };
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

  async addComment(resourceId: string, userId: string, dto: CreateCommentDto) {
    // 1. Verify resource exists
    const resource = await this.prisma.libraryResource.findUnique({
      where: { id: resourceId },
    });

    if (!resource) throw new NotFoundException('Resource not found');

    // 2. If parentId is provided, validate it's a valid root comment
    if (dto.parentId) {
      const parentComment = await this.prisma.comment.findUnique({
        where: { id: dto.parentId },
      });

      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }

      // Ensure parent comment belongs to the same resource
      if (parentComment.resourceId !== resourceId) {
        throw new BadRequestException('Parent comment must belong to the same resource');
      }

      // Enforce strict 2-level threading: parent must be a root comment (parentId === null)
      if (parentComment.parentId !== null) {
        throw new BadRequestException('Cannot reply to a reply. Replies can only be added to root comments');
      }
    }

    // 3. Create the comment
    return this.prisma.comment.create({
      data: {
        content: dto.content,
        resourceId: resourceId,
        authorId: userId,
        parentId: dto.parentId || null,
      },
      include: {
        author: {
          select: { firstName: true, lastName: true },
        },
      },
    });
  }

  async getComments(resourceId: string) {
    // Fetch all comments (root and child) with parent IDs for frontend hierarchy
    const allComments = await this.prisma.comment.findMany({
      where: { resourceId },
      include: {
        author: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return allComments;
  }

  async updateComment(commentId: string, userId: string, dto: UpdateCommentDto) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });

    if (!comment) throw new NotFoundException('Comment not found');

    // Security: Only the author can edit
    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    return this.prisma.comment.update({
      where: { id: commentId },
      data: { content: dto.content },
    });
  }

  async deleteComment(commentId: string, userId: string, userRole: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });

    if (!comment) throw new NotFoundException('Comment not found');

    // Security: Author can delete, OR an Admin can delete (for moderation)
    if (comment.authorId !== userId && userRole !== 'COLLEGE_ADMIN') {
      throw new ForbiddenException('You do not have permission to delete this comment');
    }

    return this.prisma.comment.delete({ where: { id: commentId } });
  }

  async removeResource(id: string, userId: string, userRole: string) {
    const resource = await this.prisma.libraryResource.findUnique({
      where: { id },
    });

    if (!resource) throw new NotFoundException('Resource not found');

    // Security: Only the uploader or an Admin can delete the file
    if (resource.uploaderId !== userId && userRole !== 'COLLEGE_ADMIN') {
      throw new ForbiddenException('You do not have permission to delete this file');
    }

    // Delete the file from S3
    if (resource.fileUrl) {
      await this.s3StorageService.deleteFile(resource.fileUrl);
    }

    // Delete the Database Row
    // (Prisma will automatically delete comments/upvotes if you set up 'onDelete: Cascade' in schema)
    await this.prisma.libraryResource.delete({ where: { id } });
  }
}