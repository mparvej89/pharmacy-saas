import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { StoreTenantGuard } from '@/common/guards/store-tenant.guard';
import { CurrentStore } from '@/common/decorators/current-store.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Customers & Patient Profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, StoreTenantGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'List all customers with optional name/phone search' })
  @ApiQuery({ name: 'search', required: false })
  async findAll(@CurrentStore() storeId: string, @Query('search') search?: string) {
    return this.customersService.findAll(storeId, search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer profile and recent prescription dispensing history' })
  async findOne(@CurrentStore() storeId: string, @Param('id') id: string) {
    return this.customersService.findOne(storeId, id);
  }

  @Post()
  @Roles(UserRole.STORE_OWNER, UserRole.PHARMACIST, UserRole.BILLING_OPERATOR, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create new customer / patient' })
  async create(@CurrentStore() storeId: string, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(storeId, dto);
  }

  @Put(':id')
  @Roles(UserRole.STORE_OWNER, UserRole.PHARMACIST, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update customer details' })
  async update(
    @CurrentStore() storeId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(storeId, id, dto);
  }
}
