import { Controller, Get, Post, Put, Body, Param, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StoresService } from './stores.service';
import { CreateStoreDto, UpdateStoreDto } from './dto/store.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Stores (Multi-tenant)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all tenant pharmacy stores (Super Admin)' })
  async findAll() {
    return this.storesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific store (Super Admin or authorized store member)' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    if (user?.role !== UserRole.SUPER_ADMIN) {
      const isMember =
        user?.activeStoreId === id ||
        user?.storeRoles?.some((sr: any) => sr.storeId === id);
      if (!isMember) {
        throw new ForbiddenException('You do not have permission to access this pharmacy store');
      }
    }
    return this.storesService.findOne(id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Onboard a new pharmacy store tenant' })
  async create(@Body() createStoreDto: CreateStoreDto) {
    return this.storesService.create(createStoreDto);
  }

  @Put(':id')
  @Roles(UserRole.STORE_OWNER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update pharmacy store parameters' })
  async update(
    @Param('id') id: string,
    @Body() updateStoreDto: UpdateStoreDto,
    @CurrentUser() user: any,
  ) {
    if (user?.role !== UserRole.SUPER_ADMIN) {
      const isOwnerOfStore = user?.storeRoles?.some(
        (sr: any) => sr.storeId === id && sr.role === UserRole.STORE_OWNER,
      );
      if (!isOwnerOfStore) {
        throw new ForbiddenException('You can only update a pharmacy store that you own');
      }
    }
    return this.storesService.update(id, updateStoreDto);
  }
}
