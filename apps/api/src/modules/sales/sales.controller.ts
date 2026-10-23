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

  @Get(':id/print')
  @ApiOperation({ summary: 'Get printable GST tax invoice (HTML) in thermal or A4 format' })
  @ApiQuery({ name: 'format', required: false, enum: ['a4', 'thermal'] })
  async printInvoice(
    @CurrentStore() storeId: string,
    @Param('id') id: string,
    @Query('format') format?: 'thermal' | 'a4',
  ) {
    return this.salesService.generateInvoiceHtml(storeId, id, format || 'a4');
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

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a finalized sales invoice and restore batch stock' })
  async cancelSale(
    @CurrentStore() storeId: string,
    @CurrentUser('userId') cashierId: string,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.salesService.cancelSale(storeId, id, cashierId, reason);
  }
}
