import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // 1. Hash the password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    try {
      // 2. Save user to DB
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: dto.role,
          institutionId: dto.institutionId,
        },
      });

      // Don't return the password to the client!
      return user;
    } catch (error) {
      if (error.code === 'P2002') { // Prisma code for unique constraint (email)
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  async login(dto: any) {
    // 1. Find user
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    // 2. Check password
    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    // 3. Generate JWT
    const payload = { sub: user.id, email: user.email, role: user.role };
    const response: any = {
      access_token: await this.jwtService.signAsync(payload),
    };

    // 4. Include requiresPasswordReset flag if true
    if (user.requiresPasswordReset) {
      response.requiresPasswordReset = true;
    }

    return response;
  }

  async resetPassword(userId: string, oldPassword: string, newPassword: string, confirmPassword: string) {
    // 1. Validate passwords match
    if (newPassword !== confirmPassword) {
      throw new ConflictException('New password and confirm password do not match');
    }

    // 2. Find user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new UnauthorizedException('User not found');

    // 3. Verify old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) throw new UnauthorizedException('Old password is incorrect');

    // 4. Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 5. Update password and reset flag
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        requiresPasswordReset: false,
      },
    });
  }
}