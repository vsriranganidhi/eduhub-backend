import { Module } from '@nestjs/common';
import { AssignmentService } from './assignment.service';
import { AssignmentController } from './assignment.controller';
import { PrismaService } from '../prisma/prisma.service';
import { S3StorageService } from '../library/s3-storage.service';

@Module({
  providers: [AssignmentService, PrismaService, S3StorageService],
  controllers: [AssignmentController]
})
export class AssignmentModule {}
