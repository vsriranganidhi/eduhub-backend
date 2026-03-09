import { Controller, Get, Post, Body, Param, Delete, UseGuards, Patch } from '@nestjs/common';
import { SubjectService } from './subject.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { AuthGuard } from '../auth/auth.gaurd';
import { RolesGuard } from '../auth/roles.gaurd';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, LibraryCategory } from '../generated/prisma/client';
import { Req } from '@nestjs/common';
import { Query } from '@nestjs/common';

@Controller('subjects')
@UseGuards(AuthGuard, RolesGuard)
export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  @Post()
  @Roles(Role.TEACHER, Role.ADMIN, Role.STUDENT)
  @UseGuards(AuthGuard, RolesGuard)
  create(@Body() createSubjectDto: CreateSubjectDto, @Req() req: any) {
    return this.subjectService.create(createSubjectDto, req.user);
  }
  
  @Get() // Everyone can see the list of subjects
  @UseGuards(AuthGuard)
  findAll(@Query('category') category?: LibraryCategory) {
    return this.subjectService.findAll(category);
  }

  @Patch(':id')
  @Roles(Role.TEACHER, Role.ADMIN, Role.STUDENT)
  @UseGuards(AuthGuard, RolesGuard)
  update(@Param('id') id: string, @Body() dto: UpdateSubjectDto, @Req() req: any) {
    return this.subjectService.update(id, dto, req.user);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  // We removed @Roles here because the logic is now handled in the Service
  remove(@Param('id') id: string, @Req() req: any) {
    return this.subjectService.remove(id, req.user);
  }
}