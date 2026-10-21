import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/sale.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { StoreTenantGuard } from '@/common/guards/store-tenant.guard';
import { CurrentStore } from '@/common/decorators/current-store.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('POS Billing & Sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, StoreTenantGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  @ApiOperation({ summary: 'List sales invoices with date/cashier filters' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'cashierId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @CurrentStore() storeId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('cashierId') cashierId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.salesService.findAll(storeId, { startDate, endDate, cashierId, page, limit });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get complete sale invoice details and tax breakdown' })
  async findOne(@CurrentStore() storeId: string, @Param('id') id: string) {
    return this.salesService.findOne(storeId, id);
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Atomically checkout POS invoice with FEFO allocation and GST tax breakdown' })
  async checkout(
    @CurrentStore() storeId: string,
    @CurrentUser('userId') cashierId: string,
    @Body() dto: CreateSaleDto,
  ) {
    return this.salesService.checkout(storeId, cashierId, dto);
  }
}
