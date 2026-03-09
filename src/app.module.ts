import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { NoticeModule } from './notice/notice.module';
import { ScheduleModule } from '@nestjs/schedule';
import { LibraryModule } from './library/library.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { SubjectModule } from './subject/subject.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'), // Points to your physical 'uploads' folder
      serveRoot: '/static', // The URL prefix (e.g., localhost:3000/uploads/...)
    }),ConfigModule.forRoot({ isGlobal: true }), 
    PrismaModule, 
    AuthModule, 
    NoticeModule, 
    ScheduleModule.forRoot(), 
    LibraryModule, SubjectModule
  ],
  controllers: [AppController],
})
export class AppModule {}
