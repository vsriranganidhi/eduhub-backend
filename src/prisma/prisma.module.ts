import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // This makes the service available everywhere!
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // Export it so other modules can use it
})
export class PrismaModule {}