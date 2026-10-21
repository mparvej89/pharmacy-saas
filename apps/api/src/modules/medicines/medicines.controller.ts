import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MedicinesService } from './medicines.service';
import { CreateMedicineDto, UpdateMedicineDto, CheckDuplicateDto } from './dto/medicine.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { StoreTenantGuard } from '@/common/guards/store-tenant.guard';
import { CurrentStore } from '@/common/decorators/current-store.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Medicines Catalogue')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, StoreTenantGuard)
@Controller('medicines')
export class MedicinesController {
  constructor(private readonly medicinesService: MedicinesService) {}

  @Get()
  @ApiOperation({ summary: 'Search and paginate medicines catalogue' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @CurrentStore() storeId: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.medicinesService.findAll(storeId, { search, category, page, limit });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get medicine by ID with active batches' })
  async findOne(@CurrentStore() storeId: string, @Param('id') id: string) {
    return this.medicinesService.findOne(storeId, id);
  }

  @Post()
  @Roles(UserRole.STORE_OWNER, UserRole.PHARMACIST, UserRole.INVENTORY_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Add a new medicine to catalogue' })
  async create(@CurrentStore() storeId: string, @Body() createDto: CreateMedicineDto) {
    return this.medicinesService.create(storeId, createDto);
  }

  @Put(':id')
  @Roles(UserRole.STORE_OWNER, UserRole.PHARMACIST, UserRole.INVENTORY_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update medicine details' })
  async update(
    @CurrentStore() storeId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateMedicineDto,
  ) {
    return this.medicinesService.update(storeId, id, updateDto);
  }

  @Post('check-duplicate')
  @ApiOperation({ summary: 'Validate potential duplicate medicine name or barcode' })
  async checkDuplicate(@CurrentStore() storeId: string, @Body() checkDto: CheckDuplicateDto) {
    return this.medicinesService.checkDuplicate(storeId, checkDto);
  }

  @Patch(':id/toggle-status')
  @Roles(UserRole.STORE_OWNER, UserRole.PHARMACIST, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Toggle active/inactive status of a medicine' })
  async toggleStatus(@CurrentStore() storeId: string, @Param('id') id: string) {
    return this.medicinesService.toggleStatus(storeId, id);
  }
}
