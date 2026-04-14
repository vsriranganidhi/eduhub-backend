import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { DepartmentService } from './department.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { AuthGuard } from '../auth/auth.gaurd';
import { RolesGuard } from '../auth/roles.gaurd';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma/client';

@Controller('departments')
@UseGuards(AuthGuard, RolesGuard)
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Post()
  @Roles(Role.COLLEGE_ADMIN)
  @ApiBearerAuth('access-token')
  create(@Body() createDepartmentDto: CreateDepartmentDto, @Req() req: any) {
    return this.departmentService.create(createDepartmentDto, req.user.institutionId);
  }

  @Get()
  @ApiBearerAuth('access-token')
  findAll(@Req() req: any) {
    return this.departmentService.findAll(req.user.institutionId);
  }

  @Get(':id')
  @ApiBearerAuth('access-token')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.departmentService.findOne(id, req.user.institutionId);
  }

  @Patch(':id')
  @Roles(Role.COLLEGE_ADMIN)
  @ApiBearerAuth('access-token')
  update(@Param('id') id: string, @Body() updateDepartmentDto: UpdateDepartmentDto, @Req() req: any) {
    return this.departmentService.update(id, updateDepartmentDto, req.user.institutionId);
  }

  @Delete(':id')
  @Roles(Role.COLLEGE_ADMIN)
  @ApiBearerAuth('access-token')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.departmentService.remove(id, req.user.institutionId);
  }
}
