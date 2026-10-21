import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { StoreTenantGuard } from '@/common/guards/store-tenant.guard';
import { CurrentStore } from '@/common/decorators/current-store.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Reports & Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, StoreTenantGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Real-time dashboard metrics (sales, low stock, expiring, valuation)' })
  async getDashboardSummary(@CurrentStore() storeId: string) {
    return this.reportsService.getDashboardSummary(storeId);
  }

  @Get('gst-summary')
  @Roles(UserRole.STORE_OWNER, UserRole.PHARMACIST, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'GSTR-1 tax preparation summary and HSN breakdown' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getGstSummary(
    @CurrentStore() storeId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getGstSummary(storeId, startDate, endDate);
  }

  @Get('schedule-h1-register')
  @Roles(UserRole.STORE_OWNER, UserRole.PHARMACIST, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Statutory Schedule H1 and X prescription dispensing register' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getScheduleH1Register(
    @CurrentStore() storeId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getScheduleH1Register(storeId, startDate, endDate);
  }
}
