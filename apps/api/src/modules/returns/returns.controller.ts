import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReturnsService } from './returns.service';
import { CreateSaleReturnDto, InspectReturnItemDto } from './dto/return.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { StoreTenantGuard } from '@/common/guards/store-tenant.guard';
import { CurrentStore } from '@/common/decorators/current-store.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Returns & Quarantine Inspection')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, StoreTenantGuard)
@Controller('returns')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Get()
  @ApiOperation({ summary: 'List customer sales returns' })
  async findAll(@CurrentStore() storeId: string) {
    return this.returnsService.findAll(storeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get return details with item inspection statuses' })
  async findOne(@CurrentStore() storeId: string, @Param('id') id: string) {
    return this.returnsService.findOne(storeId, id);
  }

  @Post()
  @Roles(UserRole.STORE_OWNER, UserRole.PHARMACIST, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Process sale return and place items into quarantine' })
  async processReturn(
    @CurrentStore() storeId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateSaleReturnDto,
  ) {
    return this.returnsService.processReturn(storeId, userId, dto);
  }

  @Post('items/:itemId/inspect')
  @Roles(UserRole.STORE_OWNER, UserRole.PHARMACIST, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Inspect quarantined returned medicine; restock or write off as damaged' })
  async inspectItem(
    @CurrentStore() storeId: string,
    @Param('itemId') itemId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: InspectReturnItemDto,
  ) {
    return this.returnsService.inspectItem(storeId, itemId, userId, dto);
  }
}
