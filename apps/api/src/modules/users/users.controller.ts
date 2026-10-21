import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserRoleDto } from './dto/user.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { StoreTenantGuard } from '@/common/guards/store-tenant.guard';
import { CurrentStore } from '@/common/decorators/current-store.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Staff & User Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, StoreTenantGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.STORE_OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all staff members for current store' })
  async findAll(@CurrentStore() storeId: string) {
    return this.usersService.findAll(storeId);
  }

  @Post()
  @Roles(UserRole.STORE_OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Add a new staff member with specific role' })
  async create(@CurrentStore() storeId: string, @Body() dto: CreateUserDto) {
    return this.usersService.create(storeId, dto);
  }

  @Put(':id/role')
  @Roles(UserRole.STORE_OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update staff member role' })
  async updateRole(
    @CurrentStore() storeId: string,
    @Param('id') userId: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateRole(storeId, userId, dto);
  }
}
