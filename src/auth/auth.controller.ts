import { Controller, Post, Delete, Get, Body, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { StudentRegisterDto } from './dto/student-register.dto';
import { TeacherRegisterDto } from './dto/teacher-register.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthGuard } from './auth.gaurd';
import { InviteTeacherDto } from './dto/invite-teacher.dto';
import { ResendInvitationDto } from './dto/resend-invitation.dto';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './roles.gaurd';

@Controller('auth') // All routes here start with /auth
export class AuthController {
  constructor(private readonly authService: AuthService) { }


  @Post('invite-teacher')
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('COLLEGE_ADMIN')
  @HttpCode(HttpStatus.OK)
  async inviteTeacher(@Body() dto: InviteTeacherDto, @Req() req: any) {
    return this.authService.inviteTeacher(dto, req.user.institutionId, req.user.sub);
  }

  @Post('resend-invitation')
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('COLLEGE_ADMIN')
  @HttpCode(HttpStatus.OK)
  async resendInvitation(@Body() dto: ResendInvitationDto, @Req() req: any) {
    return this.authService.resendTeacherInvitation(dto, req.user.institutionId, req.user.sub);
  }

  @Post('register/student')
  @Throttle({ register: { limit: 3, ttl: 3600000 } })
  async register(@Body() dto: StudentRegisterDto) {
    return this.authService.registerStudent(dto);
  }

  @Post('register/teacher')
  @Throttle({ register: { limit: 3, ttl: 3600000 } })
  async registerTeacher(@Body() dto: TeacherRegisterDto) {
    return this.authService.registerTeacher(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @Throttle({ login: { limit: 5, ttl: 900000 } })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('reset-password')
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() req: any) {
    return this.authService.resetPassword(req.user.sub, dto.oldPassword, dto.newPassword, dto.confirmPassword);
  }

  @Post('logout')
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any) {
    return this.authService.logout(req.user.sub);
  }

  @Delete('delete-account')
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteAccount(@Req() req: any) {
    return this.authService.deleteAccount(req.user.sub);
  }

  @Get('invitations')
  @ApiBearerAuth('access-token')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('COLLEGE_ADMIN', 'SUPER_ADMIN')
  async getAllInvitations(@Req() req: any) {
    return this.authService.getAllInvitations(req.user.institutionId);
  }
}