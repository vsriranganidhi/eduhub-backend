import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcrypt';
import { Role } from '../generated/prisma/client';

@Injectable()
export class InstitutionService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  private generateJoinCode(): string {
    const length = 8;
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let joinCode = '';
    for (let i = 0; i < length; i++) {
      joinCode += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return joinCode;
  }

  private generatePassword(): string {
    const length = 6;
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  async createInstitution(dto: CreateInstitutionDto) {
    try {
      const joinCode = this.generateJoinCode();
      const tempPassword = this.generatePassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      const result = await this.prisma.$transaction(async (tx) => {
        // Create institution
        const institution = await tx.institution.create({
          data: {
            name: dto.name,
            branch: dto.branch,
            joinCode: joinCode,
          },
        });

        // Create college admin user
        const collegeAdmin = await tx.user.create({
          data: {
            email: dto.email,
            password: hashedPassword,
            firstName: dto.firstName,
            lastName: dto.lastName,
            role: Role.COLLEGE_ADMIN,
            institutionId: institution.id,
            requiresPasswordReset: true,
          },
        });

        // Store password in history
        await tx.passwordHistory.create({
          data: {
            userId: collegeAdmin.id,
            passwordHash: hashedPassword,
          },
        });

        return {
          institution,
          collegeAdmin: {
            ...collegeAdmin,
            tempPassword: tempPassword,
          },
        };
      });

      // Send welcome email after successful transaction
      try {
        await this.emailService.sendCollegeAdminWelcomeEmail(
          result.collegeAdmin.email,
          result.collegeAdmin.firstName,
          result.collegeAdmin.lastName,
          result.collegeAdmin.tempPassword,
          result.institution.name,
          result.institution.joinCode,
          process.env.LOGIN_URL || 'http://localhost:3000/login',
        );
      } catch (emailError) {
        console.error('Email sending failed, but institution creation succeeded:', emailError);
      }

      return result;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }
}