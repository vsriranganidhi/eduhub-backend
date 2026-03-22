import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { InstitutionService } from './institution.service';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/roles.gaurd';
import { Role } from '../generated/prisma/client';
import { AuthGuard } from '../auth/auth.gaurd';

@Controller('/institutions')
export class InstitutionController {
  constructor(private readonly institutionService: InstitutionService) {}

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  async createInstitution(@Body() dto: CreateInstitutionDto) {
    return this.institutionService.createInstitution(dto);
  }
}