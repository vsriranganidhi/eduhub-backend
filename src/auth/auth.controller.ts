import { Controller, Post, Delete, Body, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { StudentRegisterDto } from './dto/student-register.dto';
import { TeacherRegisterDto } from './dto/teacher-register.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthGuard } from './auth.gaurd';
import { ForbiddenException } from '@nestjs/common';
import { InviteTeacherDto } from './dto/invite-teacher.dto';
import { ResendInvitationDto } from './dto/resend-invitation.dto';

@Controller('auth') // All routes here start with /auth
export class AuthController {
  constructor(private readonly authService: AuthService) { }


  @Post('invite-teacher')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async inviteTeacher(@Body() dto: InviteTeacherDto, @Req() req: any) {
    if (req.user.role !== 'COLLEGE_ADMIN') {
      throw new ForbiddenException('Only college admins can invite teachers');
    }
    return this.authService.inviteTeacher(dto, req.user.institutionId, req.user.sub);
  }

  @Post('resend-invitation')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async resendInvitation(@Body() dto: ResendInvitationDto, @Req() req: any) {
    if (req.user.role !== 'COLLEGE_ADMIN') {
      throw new ForbiddenException('Only college admins can resend invitations');
    }
    return this.authService.resendTeacherInvitation(dto, req.user.institutionId, req.user.sub);
  }

  @Post('register/student')
  async register(@Body() dto: StudentRegisterDto) {
    return this.authService.registerStudent(dto);
  }

  @Post('register/teacher')
  async registerTeacher(@Body() dto: TeacherRegisterDto) {
    return this.authService.registerTeacher(dto);
  }

  @HttpCode(HttpStatus.OK) // Login usually returns 200 OK instead of 201 Created
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('reset-password')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() req: any) {
    return this.authService.resetPassword(req.user.sub, dto.oldPassword, dto.newPassword, dto.confirmPassword);
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any) {
    return this.authService.logout(req.user.sub);
  }

  @Delete('delete-account')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteAccount(@Req() req: any) {
    return this.authService.deleteAccount(req.user.sub);
  }
}