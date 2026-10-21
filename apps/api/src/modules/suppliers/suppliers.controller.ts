import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { StoreTenantGuard } from '@/common/guards/store-tenant.guard';
import { CurrentStore } from '@/common/decorators/current-store.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, StoreTenantGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @ApiOperation({ summary: 'List all suppliers for active pharmacy' })
  async findAll(@CurrentStore() storeId: string) {
    return this.suppliersService.findAll(storeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get supplier details and recent purchases' })
  async findOne(@CurrentStore() storeId: string, @Param('id') id: string) {
    return this.suppliersService.findOne(storeId, id);
  }

  @Post()
  @Roles(UserRole.STORE_OWNER, UserRole.INVENTORY_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create new supplier' })
  async create(@CurrentStore() storeId: string, @Body() createDto: CreateSupplierDto) {
    return this.suppliersService.create(storeId, createDto);
  }

  @Put(':id')
  @Roles(UserRole.STORE_OWNER, UserRole.INVENTORY_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update supplier details' })
  async update(
    @CurrentStore() storeId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(storeId, id, updateDto);
  }
}
