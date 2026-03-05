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

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'), // Points to your physical 'uploads' folder
      serveRoot: '/uploads', // The URL prefix (e.g., localhost:3000/uploads/...)
    }),ConfigModule.forRoot({ isGlobal: true }), 
    PrismaModule, 
    AuthModule, 
    NoticeModule, 
    ScheduleModule.forRoot(), 
    LibraryModule
  ],
  controllers: [AppController],
})
export class AppModule {}
