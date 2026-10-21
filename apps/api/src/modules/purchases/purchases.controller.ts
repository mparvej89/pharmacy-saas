import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/purchase.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { StoreTenantGuard } from '@/common/guards/store-tenant.guard';
import { CurrentStore } from '@/common/decorators/current-store.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Purchases & Goods Receipt')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, StoreTenantGuard)
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Get()
  @ApiOperation({ summary: 'List all purchases' })
  async findAll(@CurrentStore() storeId: string) {
    return this.purchasesService.findAll(storeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get purchase details and batches' })
  async findOne(@CurrentStore() storeId: string, @Param('id') id: string) {
    return this.purchasesService.findOne(storeId, id);
  }

  @Post()
  @Roles(UserRole.STORE_OWNER, UserRole.INVENTORY_MANAGER, UserRole.PHARMACIST, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create draft purchase invoice' })
  async createDraft(
    @CurrentStore() storeId: string,
    @Body() createDto: CreatePurchaseDto,
  ) {
    return this.purchasesService.createDraft(storeId, createDto);
  }

  @Post(':id/post')
  @Roles(UserRole.STORE_OWNER, UserRole.PHARMACIST, UserRole.INVENTORY_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Post purchase, update inventory, and write stock ledger atomically' })
  async postPurchase(
    @CurrentStore() storeId: string,
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.purchasesService.postPurchase(storeId, id, userId);
  }
}
