import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { EmailModule } from 'src/email/email.module';

@Module({
  imports: [
    EmailModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'your_secret_key_change_in_production',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}