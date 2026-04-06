import { Module } from '@nestjs/common';
import { LibraryService } from './library.service';
import { LibraryController } from './library.controller';
import { PrismaService } from '../prisma/prisma.service';
import { S3StorageService } from '../library/s3-storage.service';

@Module({
  controllers: [LibraryController],
  providers: [LibraryService, PrismaService, S3StorageService],
})
export class LibraryModule {}
