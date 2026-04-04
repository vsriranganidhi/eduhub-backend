import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { NoticeModule } from './notice/notice.module';
import { ScheduleModule } from '@nestjs/schedule';
import { LibraryModule } from './library/library.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { join } from 'path';
import { SubjectModule } from './subject/subject.module';
import { AssignmentModule } from './assignment/assignment.module';
import { InstitutionModule } from './institution/institution.module';
import { EmailModule } from './email/email.module';
import { throttleConfig } from './config/throttle.config';

@Module({
  imports: [
    ThrottlerModule.forRoot(throttleConfig),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'), // Points to your physical 'uploads' folder
      serveRoot: '/static', // The URL prefix (e.g., localhost:3000/uploads/...)
    }),
    ConfigModule.forRoot({ isGlobal: true }), 
    PrismaModule, 
    AuthModule, 
    NoticeModule, 
    ScheduleModule.forRoot(), 
    LibraryModule, SubjectModule, AssignmentModule, InstitutionModule, EmailModule
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
