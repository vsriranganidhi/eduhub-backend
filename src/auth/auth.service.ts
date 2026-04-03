import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StudentRegisterDto } from './dto/student-register.dto';
import { TeacherRegisterDto } from './dto/teacher-register.dto';
import { InviteTeacherDto } from './dto/invite-teacher.dto'
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) { }

  private async storePasswordHistory(userId: string, passwordHash: string) {
    await this.prisma.passwordHistory.create({
      data: {
        userId,
        passwordHash,
      },
    });
  }

  async inviteTeacher(dto: InviteTeacherDto, institutionId: string, userId: string) {
    // 1. Generate a unique token
    const token = crypto.randomBytes(32).toString('hex');

    // 2. Hash the token for storage
    const tokenHash = await bcrypt.hash(token, 10);

    // 3. Set expiration (7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    try {
      // 4. Create invitation record with hashed token
      const invitation = await this.prisma.invitation.create({
        data: {
          email: dto.email,
          token: tokenHash,
          role: 'TEACHER',
          institutionId: institutionId,
          expiresAt: expiresAt,
        },
      });

      // 5. Get institution to retrieve join code
      const institution = await this.prisma.institution.findUnique({
        where: { id: institutionId },
      });

      const collegeAdmin = await this.prisma.user.findUnique({
        where: { id: userId }, // This would need to be passed from controller
      });

      // 6. Send email to teacher with plain-text token (not the hash)

      await this.emailService.sendTeacherInvitation(
        dto.email,
        token,
        institution?.joinCode || '',
        institution?.name || '',
        collegeAdmin?.email || '',
      );

      return {
        message: 'Invitation sent successfully',
        expiresAt: expiresAt,
      };
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('An active invitation already exists for this email');
      }
      throw error;
    }
  }

  async resendTeacherInvitation(dto: any, institutionId: string, userId: string) {
    // 1. Find existing invitation for this email and institution
    const existingInvitation = await this.prisma.invitation.findFirst({
      where: {
        email: dto.email,
        institutionId: institutionId,
      },
    });

    if (!existingInvitation) {
      throw new UnauthorizedException('No invitation found for this email in your institution');
    }

    // 2. Generate a new token
    const newToken = crypto.randomBytes(32).toString('hex');

    // 3. Hash the new token for storage
    const newTokenHash = await bcrypt.hash(newToken, 10);

    // 4. Set new expiration (7 days from now)
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    try {
      // 5. Update the invitation with new token hash and expiration
      const updatedInvitation = await this.prisma.invitation.update({
        where: { id: existingInvitation.id },
        data: {
          token: newTokenHash,
          expiresAt: newExpiresAt,
          isUsed: false,
        },
      });

      // 6. Get institution and college admin details
      const institution = await this.prisma.institution.findUnique({
        where: { id: institutionId },
      });

      const collegeAdmin = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      // 7. Send email with new plain-text token (not the hash)
      await this.emailService.sendTeacherInvitation(
        dto.email,
        newToken,
        institution?.joinCode || '',
        institution?.name || '',
        collegeAdmin?.email || '',
      );

      return {
        message: 'Invitation resent successfully',
        expiresAt: newExpiresAt,
      };
    } catch (error) {
      throw error;
    }
  }

  async registerStudent(dto: StudentRegisterDto) {
    // 1. Validate join code exists and belongs to institution
    const institution = await this.prisma.institution.findFirst({
      where: {
        joinCode: dto.joinCode,
      },
    });

    if (!institution) {
      throw new UnauthorizedException('Invalid join code or institution');
    }

    // 2. Check if student with same registration number already exists in this institution
    const existingStudent = await this.prisma.user.findFirst({
      where: {
        registrationNumber: dto.registrationNumber,
        institutionId: institution.id,
      },
    });

    if (existingStudent) {
      throw new ConflictException('A student with this registration number already exists in this institution');
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    try {
      // 4. Create student user and store password history in a transaction
      const user = await this.prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            email: dto.email,
            password: hashedPassword,
            firstName: dto.firstName,
            lastName: dto.lastName,
            role: 'STUDENT',
            registrationNumber: dto.registrationNumber,
            institutionId: institution.id,
          },
        });

        // 5. Store password in history
        await tx.passwordHistory.create({
          data: {
            userId: createdUser.id,
            passwordHash: hashedPassword,
          },
        });

        return createdUser;
      });

      return user;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Email already exists in this institution');
      }
      throw error;
    }
  }

  async registerTeacher(dto: TeacherRegisterDto) {
    // 1. Validate join code exists and belongs to institution
    const institution = await this.prisma.institution.findFirst({
      where: {
        joinCode: dto.joinCode,
      },
    });

    if (!institution) {
      throw new UnauthorizedException('Invalid join code or institution');
    }

    // 2. Find invitation by email and institution (not used and not expired)
    const invitation = await this.prisma.invitation.findFirst({
      where: {
        email: dto.email,
        institutionId: institution.id,
        isUsed: false,
        expiresAt: {
          gt: new Date(), // Greater than current time (not expired)
        },
      },
    });

    if (!invitation) {
      throw new UnauthorizedException('Invalid or expired invitation');
    }

    // 3. Validate the provided token against the stored hash
    const isTokenValid = await bcrypt.compare(dto.invitationToken, invitation.token);
    if (!isTokenValid) {
      throw new UnauthorizedException('Invalid invitation token');
    }

    // 4. Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    try {
      // 5. Create teacher user, store password history, and mark invitation as used in a transaction
      const user = await this.prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            email: dto.email,
            password: hashedPassword,
            firstName: dto.firstName,
            lastName: dto.lastName,
            role: 'TEACHER',
            institutionId: institution.id,
          },
        });

        // 6. Store password in history
        await tx.passwordHistory.create({
          data: {
            userId: createdUser.id,
            passwordHash: hashedPassword,
          },
        });

        // 7. Mark invitation as used
        await tx.invitation.update({
          where: { id: invitation.id },
          data: { isUsed: true },
        });

        return createdUser;
      });

      return user;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Email already exists in this institution');
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
    const payload = { sub: user.id, email: user.email, role: user.role, institutionId: user.institutionId };
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

    // 5. Check if new password matches any previously used passwords
    const passwordHistory = await this.prisma.passwordHistory.findMany({
      where: { userId },
    });

    for (const history of passwordHistory) {
      const isPasswordUsedBefore = await bcrypt.compare(newPassword, history.passwordHash);
      if (isPasswordUsedBefore) {
        throw new ConflictException('This password was used previously. Please choose a different password');
      }
    }

    // 6. Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 7. Store old password in history and update password in a transaction
    return this.prisma.$transaction(async (tx) => {
      await tx.passwordHistory.create({
        data: {
          userId,
          passwordHash: user.password,
        },
      });

      // 8. Update password and reset flag
      return tx.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
          requiresPasswordReset: false,
        },
      });
    });
  }

  async logout(userId: string) {
    return { message: 'Logged out successfully' };
  }

  async deleteAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new UnauthorizedException('User not found');

    await this.prisma.user.delete({
      where: { id: userId },
    });

    return { message: 'Account deleted successfully' };
  }
}