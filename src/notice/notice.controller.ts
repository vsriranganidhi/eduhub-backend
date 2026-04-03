import { Controller, Get, Post, Body, UseGuards, Req, Query, Patch, Param, Delete } from '@nestjs/common';
import { NoticeService } from './notice.service';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { AuthGuard } from '../auth/auth.gaurd';
import { RolesGuard } from '../auth/roles.gaurd';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma/client';
import { UpdateNoticeDto } from './dto/update-notice.dto';

@Controller('notice')
export class NoticeController {
  constructor(private readonly noticeService: NoticeService) { }

  @Post()
  @Roles(Role.TEACHER, Role.COLLEGE_ADMIN) // Label: Only Teachers allowed
  @UseGuards(AuthGuard, RolesGuard) // Bouncers: 1. Logged in? 2. Correct Role?
  create(@Body() dto: CreateNoticeDto, @Req() req: any) {
    return this.noticeService.create(dto, req.user.sub, req.user.institutionId);
  }

  @Get()
  @Roles(Role.TEACHER, Role.COLLEGE_ADMIN, Role.STUDENT)
  @UseGuards(AuthGuard)
  findAll(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('subject') subject?: string,
    @Query('teacherName') teacherName?: string, // Renamed from teacherId
  ) {
    return this.noticeService.findAll(search, subject, teacherName, req.user.institutionId);
  }

  @Patch(':id') // Edit
  @Roles(Role.TEACHER, Role.COLLEGE_ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateNoticeDto,
    @Req() req: any
  ) {
    // We pass BOTH the notice ID and the logged-in Teacher's ID
    return this.noticeService.update(id, req.user.sub, dto, req.user.role);
  }

  @Get('archived')
  @Roles(Role.TEACHER, Role.COLLEGE_ADMIN, Role.STUDENT)
  @UseGuards(AuthGuard)
  findArchived(@Req() req: any) {
    return this.noticeService.findArchived(req.user.institutionId);
  }

  @Delete(':id')
  @Roles(Role.TEACHER, Role.COLLEGE_ADMIN) // Both can hit this route
  @UseGuards(AuthGuard, RolesGuard)
  remove(@Param('id') id: string, @Req() req: any) {
    // Pass the ID, the UserID, AND the Role to the service
    return this.noticeService.remove(id, req.user.sub, req.user.role, req.user.institutionId);
  }
}