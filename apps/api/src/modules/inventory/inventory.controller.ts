import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateAdjustmentDto } from './dto/inventory.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { StoreTenantGuard } from '@/common/guards/store-tenant.guard';
import { CurrentStore } from '@/common/decorators/current-store.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Batch Inventory & FEFO Engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, StoreTenantGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('batches')
  @ApiOperation({ summary: 'Get all batches with status and rack positions' })
  @ApiQuery({ name: 'medicineId', required: false })
  async getBatches(
    @CurrentStore() storeId: string,
    @Query('medicineId') medicineId?: string,
  ) {
    return this.inventoryService.getBatches(storeId, medicineId);
  }

  @Get('fefo-preview/:medicineId')
  @ApiOperation({ summary: 'Preview FEFO batch allocation for requested quantity' })
  @ApiQuery({ name: 'quantity', required: true })
  async getFefoAllocation(
    @CurrentStore() storeId: string,
    @Param('medicineId') medicineId: string,
    @Query('quantity') quantity: number,
  ) {
    return this.inventoryService.getFefoAllocation(storeId, medicineId, Number(quantity));
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'List medicines below reorder threshold' })
  async getLowStock(@CurrentStore() storeId: string) {
    return this.inventoryService.getLowStock(storeId);
  }

  @Get('expiring')
  @ApiOperation({ summary: 'List batches expiring soon or already expired' })
  @ApiQuery({ name: 'days', required: false, example: 90 })
  async getExpiringBatches(
    @CurrentStore() storeId: string,
    @Query('days') days?: number,
  ) {
    return this.inventoryService.getExpiringBatches(storeId, days);
  }

  @Post('adjustments')
  @Roles(UserRole.STORE_OWNER, UserRole.PHARMACIST, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Record physical stock count variance or damage write-off' })
  async createAdjustment(
    @CurrentStore() storeId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateAdjustmentDto,
  ) {
    return this.inventoryService.createStockAdjustment(storeId, userId, dto);
  }

  @Get('ledger')
  @Roles(UserRole.STORE_OWNER, UserRole.PHARMACIST, UserRole.INVENTORY_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Query immutable stock ledger movements' })
  @ApiQuery({ name: 'medicineId', required: false })
  @ApiQuery({ name: 'batchId', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getLedger(
    @CurrentStore() storeId: string,
    @Query('medicineId') medicineId?: string,
    @Query('batchId') batchId?: string,
    @Query('limit') limit?: number,
  ) {
    return this.inventoryService.getStockLedger(storeId, { medicineId, batchId, limit });
  }
}
