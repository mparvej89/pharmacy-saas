import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { StoreTenantGuard } from '@/common/guards/store-tenant.guard';
import { CurrentStore } from '@/common/decorators/current-store.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { BankingService } from './banking.service';
import {
  CreateCashBankAccountDto,
  UpdateCashBankAccountDto,
  CreateBankTransactionDto,
  ReverseTransactionDto,
  BankStatementImportDto,
  MatchStatementDto,
  CreateDailyCashClosingDto,
} from './dto/banking.dto';
import { BankTransactionType } from '@prisma/client';

@ApiTags('Banking & Cash Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, StoreTenantGuard)
@Controller('banking')
export class BankingController {
  constructor(private readonly bankingService: BankingService) {}

  // 1. Dashboard & Balances
  @Get('dashboard')
  @ApiOperation({ summary: 'Get Cash & Bank available balance overview, receipts, payments & unreconciled items' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getDashboardSummary(
    @CurrentStore() storeId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.bankingService.getDashboardSummary(storeId, startDate, endDate);
  }

  // 2. Accounts
  @Get('accounts')
  @ApiOperation({ summary: 'List all cash in hand, bank and UPI accounts with book balances' })
  async getAccounts(@CurrentStore() storeId: string) {
    return this.bankingService.getAccounts(storeId);
  }

  @Get('accounts/:id')
  @ApiOperation({ summary: 'Get specific account details with ledger inflows & outflows' })
  async getAccount(@CurrentStore() storeId: string, @Param('id') id: string) {
    return this.bankingService.getAccount(storeId, id);
  }

  @Post('accounts')
  @ApiOperation({ summary: 'Create new Cash, Bank, or UPI account' })
  async createAccount(
    @CurrentStore() storeId: string,
    @Body() dto: CreateCashBankAccountDto,
  ) {
    return this.bankingService.createAccount(storeId, dto);
  }

  @Put('accounts/:id')
  @ApiOperation({ summary: 'Update Cash or Bank account details' })
  async updateAccount(
    @CurrentStore() storeId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCashBankAccountDto,
  ) {
    return this.bankingService.updateAccount(storeId, id, dto);
  }

  @Delete('accounts/:id')
  @ApiOperation({ summary: 'Delete a Cash or Bank account (if no posted transactions exist)' })
  async deleteAccount(
    @CurrentStore() storeId: string,
    @Param('id') id: string,
  ) {
    return this.bankingService.deleteAccount(storeId, id);
  }

  // 3. Transactions
  @Get('transactions')
  @ApiOperation({ summary: 'List audited cash & bank ledger transactions' })
  @ApiQuery({ name: 'accountId', required: false })
  @ApiQuery({ name: 'transactionType', required: false, enum: BankTransactionType })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getTransactions(
    @CurrentStore() storeId: string,
    @Query('accountId') accountId?: string,
    @Query('transactionType') transactionType?: BankTransactionType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
  ) {
    return this.bankingService.getTransactions(storeId, {
      accountId,
      transactionType,
      startDate,
      endDate,
      limit,
    });
  }

  @Post('transactions')
  @ApiOperation({ summary: 'Post cash/bank receipt, payment, deposit, withdrawal, or transfer' })
  async postTransaction(
    @CurrentStore() storeId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateBankTransactionDto,
  ) {
    return this.bankingService.postTransaction(storeId, userId, dto);
  }

  @Post('transactions/:id/reverse')
  @ApiOperation({ summary: 'Atomically reverse a transaction with mandatory audit reason' })
  async reverseTransaction(
    @CurrentStore() storeId: string,
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: ReverseTransactionDto,
  ) {
    return this.bankingService.reverseTransaction(storeId, id, userId, dto);
  }

  // 4. Bank Reconciliation
  @Get('reconciliation/:accountId')
  @ApiOperation({ summary: 'Get reconciliation view (book balance vs statement entries, matched & unmatched)' })
  async getReconciliation(
    @CurrentStore() storeId: string,
    @Param('accountId') accountId: string,
  ) {
    return this.bankingService.getReconciliation(storeId, accountId);
  }

  @Post('statements/import')
  @ApiOperation({ summary: 'Import bank statement rows for reconciliation' })
  async importStatement(
    @CurrentStore() storeId: string,
    @Body() dto: BankStatementImportDto,
  ) {
    return this.bankingService.importStatement(storeId, dto);
  }

  @Post('statements/match')
  @ApiOperation({ summary: 'Match a statement entry with book transaction or manual sign-off' })
  async matchStatement(
    @CurrentStore() storeId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: MatchStatementDto,
  ) {
    return this.bankingService.matchStatement(storeId, userId, dto);
  }

  @Post('statements/:id/unmatch')
  @ApiOperation({ summary: 'Unmatch a statement entry' })
  async unmatchStatement(
    @CurrentStore() storeId: string,
    @Param('id') id: string,
  ) {
    return this.bankingService.unmatchStatement(storeId, id);
  }

  // 5. Daily Cash Closing
  @Get('cash-closing/status')
  @ApiOperation({ summary: 'Get daily cash register closing status and expected cash calculation' })
  @ApiQuery({ name: 'date', required: false })
  async getCashClosingStatusAlias(
    @CurrentStore() storeId: string,
    @Query('date') date?: string,
  ) {
    return this.bankingService.getCashClosingStatus(storeId, date);
  }

  @Get('cash-closing')
  @ApiOperation({ summary: 'Get daily cash register closing status and expected cash calculation' })
  @ApiQuery({ name: 'date', required: false })
  async getCashClosingStatus(
    @CurrentStore() storeId: string,
    @Query('date') date?: string,
  ) {
    return this.bankingService.getCashClosingStatus(storeId, date);
  }

  @Post('cash-closing')
  @ApiOperation({ summary: 'Submit end-of-day physical cash count and record variance/closing' })
  async submitCashClosing(
    @CurrentStore() storeId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateDailyCashClosingDto,
  ) {
    return this.bankingService.submitCashClosing(storeId, userId, dto);
  }

  @Post('cash-closing/reopen')
  @ApiOperation({ summary: 'Reopen / unlock cash counter closing for recounting' })
  @ApiQuery({ name: 'date', required: false })
  async reopenCashClosing(
    @CurrentStore() storeId: string,
    @CurrentUser('userId') userId: string,
    @Query('date') date?: string,
  ) {
    return this.bankingService.reopenCashClosing(storeId, userId, date);
  }
}
