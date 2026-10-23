import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import Decimal from 'decimal.js';
import {
  CreateCashBankAccountDto,
  UpdateCashBankAccountDto,
  CreateBankTransactionDto,
  ReverseTransactionDto,
  BankStatementImportDto,
  MatchStatementDto,
  CreateDailyCashClosingDto,
} from './dto/banking.dto';
import { BankAccountType, BankTransactionType, StatementMatchStatus } from '@prisma/client';

@Injectable()
export class BankingService {
  constructor(private prisma: PrismaService) {}

  // =========================================================================
  // 1. ACCOUNT MANAGEMENT
  // =========================================================================

  async getAccounts(storeId: string) {
    const accounts = await this.prisma.cashBankAccount.findMany({
      where: { storeId },
      orderBy: [{ isDefault: 'desc' }, { accountType: 'asc' }, { accountName: 'asc' }],
    });

    // Compute live book balance from posted transactions for strict integrity
    const enriched = await Promise.all(
      accounts.map(async (acc) => {
        const stats = await this.getAccountBalanceSummary(storeId, acc.id);
        return {
          ...acc,
          bookBalance: stats.calculatedBalance,
          totalInflows: stats.totalInflows,
          totalOutflows: stats.totalOutflows,
        };
      }),
    );

    return enriched;
  }

  async getAccount(storeId: string, id: string) {
    const acc = await this.prisma.cashBankAccount.findFirst({
      where: { id, storeId },
    });
    if (!acc) {
      throw new NotFoundException(`Cash/Bank Account "${id}" not found`);
    }

    const stats = await this.getAccountBalanceSummary(storeId, id);
    return {
      ...acc,
      bookBalance: stats.calculatedBalance,
      totalInflows: stats.totalInflows,
      totalOutflows: stats.totalOutflows,
    };
  }

  async createAccount(storeId: string, dto: CreateCashBankAccountDto) {
    const existing = await this.prisma.cashBankAccount.findFirst({
      where: { storeId, accountName: { equals: dto.accountName.trim(), mode: 'insensitive' } },
    });
    if (existing) {
      throw new ConflictException(`An account named "${dto.accountName.trim()}" already exists`);
    }

    const openingBalance = new Decimal(dto.openingBalance || 0);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.cashBankAccount.updateMany({
          where: { storeId, accountType: dto.accountType },
          data: { isDefault: false },
        });
      }

      const account = await tx.cashBankAccount.create({
        data: {
          storeId,
          accountName: dto.accountName.trim(),
          accountType: dto.accountType,
          accountNumber: dto.accountNumber ? dto.accountNumber.trim() : null,
          bankName: dto.bankName ? dto.bankName.trim() : null,
          ifscCode: dto.ifscCode ? dto.ifscCode.trim().toUpperCase() : null,
          branchName: dto.branchName ? dto.branchName.trim() : null,
          upiId: dto.upiId ? dto.upiId.trim().toLowerCase() : null,
          openingBalance: openingBalance.toNumber(),
          openingDate: dto.openingDate ? new Date(dto.openingDate) : new Date(),
          currentBalance: openingBalance.toNumber(),
          isDefault: !!dto.isDefault,
          isActive: true,
        },
      });

      return account;
    });
  }

  async updateAccount(storeId: string, id: string, dto: UpdateCashBankAccountDto) {
    const acc = await this.getAccount(storeId, id);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault && dto.accountType) {
        await tx.cashBankAccount.updateMany({
          where: { storeId, accountType: dto.accountType },
          data: { isDefault: false },
        });
      }

      return tx.cashBankAccount.update({
        where: { id: acc.id },
        data: {
          ...(dto.accountName ? { accountName: dto.accountName.trim() } : {}),
          ...(dto.accountType ? { accountType: dto.accountType } : {}),
          ...(dto.accountNumber !== undefined ? { accountNumber: dto.accountNumber?.trim() || null } : {}),
          ...(dto.bankName !== undefined ? { bankName: dto.bankName?.trim() || null } : {}),
          ...(dto.ifscCode !== undefined ? { ifscCode: dto.ifscCode?.trim().toUpperCase() || null } : {}),
          ...(dto.branchName !== undefined ? { branchName: dto.branchName?.trim() || null } : {}),
          ...(dto.upiId !== undefined ? { upiId: dto.upiId?.trim().toLowerCase() || null } : {}),
          ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
      });
    });
  }

  async deleteAccount(storeId: string, id: string) {
    const acc = await this.getAccount(storeId, id);

    // Safety check: ensure account doesn't have active transactions
    const txCount = await this.prisma.cashBankTransaction.count({
      where: { storeId, accountId: id },
    });

    if (txCount > 0) {
      throw new BadRequestException(
        `Cannot delete account "${acc.accountName}" because it has ${txCount} posted transaction(s). You can mark it inactive instead.`,
      );
    }

    const statementCount = await this.prisma.bankStatementEntry.count({
      where: { storeId, accountId: id },
    });

    if (statementCount > 0) {
      throw new BadRequestException(
        `Cannot delete account "${acc.accountName}" because it has associated bank statements.`,
      );
    }

    return this.prisma.cashBankAccount.delete({
      where: { id: acc.id },
    });
  }

  // =========================================================================
  // 2. DASHBOARD & BALANCE CALCULATION
  // =========================================================================

  async getDashboardSummary(storeId: string, startDate?: string, endDate?: string) {
    const accounts = await this.prisma.cashBankAccount.findMany({
      where: { storeId, isActive: true },
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    let totalCashInHand = new Decimal(0);
    let totalBankBalances = new Decimal(0);
    let totalUpiSettlement = new Decimal(0);
    let totalOtherBalances = new Decimal(0);

    const accountBreakdown = await Promise.all(
      accounts.map(async (acc) => {
        const stats = await this.getAccountBalanceSummary(storeId, acc.id);
        const bal = new Decimal(stats.calculatedBalance);

        if (acc.accountType === BankAccountType.CASH) {
          totalCashInHand = totalCashInHand.plus(bal);
        } else if (acc.accountType === BankAccountType.BANK) {
          totalBankBalances = totalBankBalances.plus(bal);
        } else if (acc.accountType === BankAccountType.UPI_SETTLEMENT) {
          totalUpiSettlement = totalUpiSettlement.plus(bal);
        } else {
          totalOtherBalances = totalOtherBalances.plus(bal);
        }

        // Unreconciled bank statement differences
        const unreconciledStatements = await this.prisma.bankStatementEntry.findMany({
          where: { storeId, accountId: acc.id, status: StatementMatchStatus.UNMATCHED },
        });

        const statementDifference = unreconciledStatements.reduce((diff, entry) => {
          return diff.plus(new Decimal(entry.depositAmount)).minus(new Decimal(entry.withdrawalAmount));
        }, new Decimal(0));

        return {
          id: acc.id,
          accountName: acc.accountName,
          accountType: acc.accountType,
          bankName: acc.bankName,
          accountNumber: acc.accountNumber,
          bookBalance: bal.toNumber(),
          unreconciledDifference: statementDifference.toNumber(),
          unreconciledCount: unreconciledStatements.length,
          isDefault: acc.isDefault,
        };
      }),
    );

    const totalBookBalance = totalCashInHand
      .plus(totalBankBalances)
      .plus(totalUpiSettlement)
      .plus(totalOtherBalances);

    // Today's receipts & payments
    const todayReceipts = await this.prisma.cashBankTransaction.aggregate({
      where: {
        storeId,
        isReversed: false,
        transactionDate: { gte: todayStart, lte: todayEnd },
        transactionType: {
          in: [
            BankTransactionType.RECEIPT,
            BankTransactionType.CUSTOMER_COLLECTION,
          ],
        },
      },
      _sum: { amount: true },
    });

    const todayPayments = await this.prisma.cashBankTransaction.aggregate({
      where: {
        storeId,
        isReversed: false,
        transactionDate: { gte: todayStart, lte: todayEnd },
        transactionType: {
          in: [
            BankTransactionType.PAYMENT,
            BankTransactionType.SUPPLIER_PAYMENT,
            BankTransactionType.EXPENSE,
            BankTransactionType.REFUND,
          ],
        },
      },
      _sum: { amount: true },
    });

    return {
      totalBookBalance: totalBookBalance.toNumber(),
      cashInHand: totalCashInHand.toNumber(),
      bankBalances: totalBankBalances.toNumber(),
      upiSettlementBalances: totalUpiSettlement.toNumber(),
      otherBalances: totalOtherBalances.toNumber(),
      todayReceipts: Number(todayReceipts._sum.amount || 0),
      todayPayments: Number(todayPayments._sum.amount || 0),
      accounts: accountBreakdown,
      asOfDate: new Date().toISOString(),
    };
  }

  /**
   * Calculates strictly audited Account Balance:
   * Account balance = opening balance + posted inflows − posted outflows.
   */
  async getAccountBalanceSummary(storeId: string, accountId: string) {
    const account = await this.prisma.cashBankAccount.findFirst({
      where: { id: accountId, storeId },
    });
    if (!account) {
      throw new NotFoundException(`Account ${accountId} not found`);
    }

    const opening = new Decimal(account.openingBalance);

    // INFLOWS: Receipts, Deposits into this acct, Customer collections, Transfers INTO this acct
    const inflows = await this.prisma.cashBankTransaction.aggregate({
      where: {
        storeId,
        accountId,
        isReversed: false,
        transactionType: {
          in: [
            BankTransactionType.RECEIPT,
            BankTransactionType.DEPOSIT,
            BankTransactionType.CUSTOMER_COLLECTION,
            BankTransactionType.CONTRA_TRANSFER, // Inflow side of transfer
          ],
        },
      },
      _sum: { amount: true },
    });

    // OUTFLOWS: Payments, Withdrawals, Supplier payments, Expenses, Refunds, Transfers OUT of this acct
    const outflows = await this.prisma.cashBankTransaction.aggregate({
      where: {
        storeId,
        accountId,
        isReversed: false,
        transactionType: {
          in: [
            BankTransactionType.PAYMENT,
            BankTransactionType.WITHDRAWAL,
            BankTransactionType.SUPPLIER_PAYMENT,
            BankTransactionType.EXPENSE,
            BankTransactionType.REFUND,
            BankTransactionType.TRANSFER, // Outflow side of transfer
          ],
        },
      },
      _sum: { amount: true },
    });

    const sumIn = new Decimal(inflows._sum.amount || 0);
    const sumOut = new Decimal(outflows._sum.amount || 0);
    const currentCalculated = opening.plus(sumIn).minus(sumOut);

    return {
      openingBalance: opening.toNumber(),
      totalInflows: sumIn.toNumber(),
      totalOutflows: sumOut.toNumber(),
      calculatedBalance: currentCalculated.toNumber(),
    };
  }

  // =========================================================================
  // 3. TRANSACTION MANAGEMENT (ATOMIC POSTING & RULES)
  // =========================================================================

  async getTransactions(storeId: string, query: {
    accountId?: string;
    transactionType?: BankTransactionType;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) {
    const where: any = { storeId };

    if (query.accountId) {
      where.accountId = query.accountId;
    }
    if (query.transactionType) {
      where.transactionType = query.transactionType;
    }
    if (query.startDate || query.endDate) {
      where.transactionDate = {};
      if (query.startDate) where.transactionDate.gte = new Date(query.startDate);
      if (query.endDate) where.transactionDate.lte = new Date(query.endDate);
    }

    return this.prisma.cashBankTransaction.findMany({
      where,
      orderBy: { transactionDate: 'desc' },
      take: query.limit ? Number(query.limit) : 200,
      include: {
        account: {
          select: { id: true, accountName: true, accountType: true, bankName: true },
        },
        createdBy: {
          select: { id: true, fullName: true },
        },
      },
    });
  }

  async postTransaction(storeId: string, userId: string, dto: CreateBankTransactionDto) {
    const amount = new Decimal(dto.amount);
    if (amount.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Transaction amount must be strictly greater than zero');
    }

    return this.prisma.$transaction(async (tx) => {
      const sourceAccount = await tx.cashBankAccount.findFirst({
        where: { id: dto.accountId, storeId, isActive: true },
      });
      if (!sourceAccount) {
        throw new NotFoundException(`Source account "${dto.accountId}" not found or inactive`);
      }

      const txDate = dto.transactionDate ? new Date(dto.transactionDate) : new Date();

      // Handle Double-Entry Contra Transfers (Bank-to-Bank, Cash Deposit, Cash Withdrawal)
      const contraTypes: BankTransactionType[] = [
        BankTransactionType.TRANSFER,
        BankTransactionType.DEPOSIT,
        BankTransactionType.WITHDRAWAL,
      ];
      if (contraTypes.includes(dto.transactionType)) {
        if (!dto.transferAccountId) {
          throw new BadRequestException('Destination transferAccountId is mandatory for inter-account transfers');
        }
        if (dto.transferAccountId === dto.accountId) {
          throw new BadRequestException('Source and destination accounts cannot be identical');
        }

        const destAccount = await tx.cashBankAccount.findFirst({
          where: { id: dto.transferAccountId, storeId, isActive: true },
        });
        if (!destAccount) {
          throw new NotFoundException(`Destination account "${dto.transferAccountId}" not found or inactive`);
        }

        // 1. Deduct from Source Account (Outflow)
        const updatedSource = await tx.cashBankAccount.update({
          where: { id: sourceAccount.id },
          data: { currentBalance: { decrement: amount.toNumber() } },
        });

        // 2. Add to Destination Account (Inflow)
        const updatedDest = await tx.cashBankAccount.update({
          where: { id: destAccount.id },
          data: { currentBalance: { increment: amount.toNumber() } },
        });

        // 3. Post Source Outflow Transaction Entry
        const outTx = await tx.cashBankTransaction.create({
          data: {
            storeId,
            accountId: sourceAccount.id,
            transactionDate: txDate,
            transactionType: dto.transactionType,
            amount: amount.toNumber(),
            balanceAfter: updatedSource.currentBalance,
            paymentMethod: dto.paymentMethod || (sourceAccount.accountType === BankAccountType.CASH ? 'CASH' : 'UPI'),
            referenceNumber: dto.referenceNumber || null,
            partyName: destAccount.accountName,
            narration: dto.narration || `Transfer to ${destAccount.accountName}`,
            category: 'INTERNAL_CONTRA',
            transferAccountId: destAccount.id,
            createdById: userId,
          },
        });

        // 4. Post Destination Inflow Transaction Entry (Contra)
        await tx.cashBankTransaction.create({
          data: {
            storeId,
            accountId: destAccount.id,
            transactionDate: txDate,
            transactionType: BankTransactionType.CONTRA_TRANSFER,
            amount: amount.toNumber(),
            balanceAfter: updatedDest.currentBalance,
            paymentMethod: dto.paymentMethod || (destAccount.accountType === BankAccountType.CASH ? 'CASH' : 'UPI'),
            referenceNumber: dto.referenceNumber || null,
            partyName: sourceAccount.accountName,
            narration: `Received from ${sourceAccount.accountName}: ${dto.narration || ''}`,
            category: 'INTERNAL_CONTRA',
            transferAccountId: sourceAccount.id,
            createdById: userId,
          },
        });

        return outTx;
      }

      // Handle Standard Single Account Movements
      const inflowTypes: BankTransactionType[] = [
        BankTransactionType.RECEIPT,
        BankTransactionType.CUSTOMER_COLLECTION,
      ];
      const isInflow = inflowTypes.includes(dto.transactionType);

      let updatedAcc = await tx.cashBankAccount.update({
        where: { id: sourceAccount.id },
        data: isInflow
          ? { currentBalance: { increment: amount.toNumber() } }
          : { currentBalance: { decrement: amount.toNumber() } },
      });

      // Customer Collection reduces Customer Outstanding (Receivables)
      if (dto.transactionType === BankTransactionType.CUSTOMER_COLLECTION && dto.relatedCustomerId) {
        // Customer balance update if applicable
        await tx.auditLog.create({
          data: {
            storeId,
            userId,
            action: 'CUSTOMER_COLLECTION',
            entityName: 'CUSTOMER',
            entityId: dto.relatedCustomerId,
            newValues: { amount: amount.toNumber(), accountId: sourceAccount.id },
          },
        });
      }

      // Supplier Payment reduces Supplier Payables
      if (dto.transactionType === BankTransactionType.SUPPLIER_PAYMENT && dto.relatedSupplierId) {
        await tx.supplier.update({
          where: { id: dto.relatedSupplierId },
          data: {
            outstandingBalance: { decrement: amount.toNumber() },
          },
        });
      }

      // Record Ledger Transaction
      const record = await tx.cashBankTransaction.create({
        data: {
          storeId,
          accountId: sourceAccount.id,
          transactionDate: txDate,
          transactionType: dto.transactionType,
          amount: amount.toNumber(),
          balanceAfter: updatedAcc.currentBalance,
          paymentMethod: dto.paymentMethod || 'CASH',
          referenceNumber: dto.referenceNumber || null,
          partyName: dto.partyName || null,
          narration: dto.narration,
          category: dto.category || null,
          relatedSupplierId: dto.relatedSupplierId || null,
          relatedCustomerId: dto.relatedCustomerId || null,
          createdById: userId,
        },
      });

      return record;
    });
  }

  /**
   * Auditable Transaction Reversal:
   * Posted transactions are never silently deleted. Reversals post an equal and opposite
   * compensating transaction with full audit tracking.
   */
  async reverseTransaction(storeId: string, id: string, userId: string, dto: ReverseTransactionDto) {
    const original = await this.prisma.cashBankTransaction.findFirst({
      where: { id, storeId },
      include: { account: true },
    });

    if (!original) {
      throw new NotFoundException(`Transaction "${id}" not found`);
    }

    if (original.isReversed) {
      throw new BadRequestException('This transaction has already been reversed');
    }

    return this.prisma.$transaction(async (tx) => {
      const revAmount = new Decimal(original.amount);

      // Determine reversal direction
      const originalInflows: BankTransactionType[] = [
        BankTransactionType.RECEIPT,
        BankTransactionType.CUSTOMER_COLLECTION,
        BankTransactionType.CONTRA_TRANSFER,
        BankTransactionType.DEPOSIT,
      ];
      const wasInflow = originalInflows.includes(original.transactionType);

      // Update Account balance opposite to original
      const updatedAcc = await tx.cashBankAccount.update({
        where: { id: original.accountId },
        data: wasInflow
          ? { currentBalance: { decrement: revAmount.toNumber() } }
          : { currentBalance: { increment: revAmount.toNumber() } },
      });

      // Mark original as reversed
      const updatedOriginal = await tx.cashBankTransaction.update({
        where: { id: original.id },
        data: {
          isReversed: true,
          reversedAt: new Date(),
          reversalReason: dto.reason.trim(),
        },
      });

      // If original was a supplier payment, restore supplier outstanding balance
      if (original.relatedSupplierId && original.transactionType === BankTransactionType.SUPPLIER_PAYMENT) {
        await tx.supplier.update({
          where: { id: original.relatedSupplierId },
          data: {
            outstandingBalance: { increment: revAmount.toNumber() },
          },
        });
      }

      // Create Compensating Reversal Entry
      const reversalTx = await tx.cashBankTransaction.create({
        data: {
          storeId,
          accountId: original.accountId,
          transactionDate: new Date(),
          transactionType: BankTransactionType.REFUND,
          amount: revAmount.toNumber(),
          balanceAfter: updatedAcc.currentBalance,
          paymentMethod: original.paymentMethod,
          referenceNumber: `REV-${original.referenceNumber || original.id.slice(0, 8)}`,
          partyName: original.partyName,
          narration: `Reversal of Tx #${original.id.slice(0, 8)}: ${dto.reason.trim()}`,
          category: 'CORRECTION_REVERSAL',
          reversalTxId: original.id,
          createdById: userId,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          storeId,
          userId,
          action: 'REVERSE_BANK_TRANSACTION',
          entityName: 'CASH_BANK_TRANSACTION',
          entityId: original.id,
          newValues: {
            originalId: original.id,
            reversalTxId: reversalTx.id,
            reason: dto.reason.trim(),
            amount: revAmount.toNumber(),
          },
        },
      });

      return {
        message: 'Transaction reversed successfully',
        reversedTransactionId: updatedOriginal.id,
        compensatingTransactionId: reversalTx.id,
      };
    });
  }

  // =========================================================================
  // 4. BANK RECONCILIATION
  // =========================================================================

  async getReconciliation(storeId: string, accountId: string) {
    const account = await this.getAccount(storeId, accountId);

    const statementEntries = await this.prisma.bankStatementEntry.findMany({
      where: { storeId, accountId },
      orderBy: { statementDate: 'desc' },
      include: {
        matchedTransaction: true,
      },
    });

    const bookTransactions = await this.prisma.cashBankTransaction.findMany({
      where: { storeId, accountId, isReversed: false },
      orderBy: { transactionDate: 'desc' },
      take: 100,
    });

    const matchedEntries = statementEntries.filter((s) => s.status === StatementMatchStatus.MATCHED);
    const unmatchedEntries = statementEntries.filter((s) => s.status === StatementMatchStatus.UNMATCHED);

    // Latest statement balance from entries or null
    const latestWithBalance = statementEntries.find((s) => s.bankBalance !== null);
    const statementBalance = latestWithBalance?.bankBalance ? Number(latestWithBalance.bankBalance) : null;

    const bookBalance = account.bookBalance;
    const difference = statementBalance !== null ? Number((statementBalance - bookBalance).toFixed(2)) : null;

    return {
      accountId: account.id,
      accountName: account.accountName,
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      bookBalance,
      statementBalance,
      difference,
      matchedCount: matchedEntries.length,
      unmatchedCount: unmatchedEntries.length,
      unmatchedEntries,
      matchedEntries,
      bookTransactions,
    };
  }

  async importStatement(storeId: string, dto: BankStatementImportDto) {
    const account = await this.prisma.cashBankAccount.findFirst({
      where: { id: dto.accountId, storeId },
    });
    if (!account) {
      throw new NotFoundException(`Account ${dto.accountId} not found`);
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const records = [];
      for (const line of dto.entries) {
        const item = await tx.bankStatementEntry.create({
          data: {
            storeId,
            accountId: account.id,
            statementDate: new Date(line.statementDate),
            description: line.description.trim(),
            referenceNumber: line.referenceNumber?.trim() || null,
            withdrawalAmount: Number(line.withdrawalAmount || 0),
            depositAmount: Number(line.depositAmount || 0),
            bankBalance: line.bankBalance !== undefined ? Number(line.bankBalance) : null,
            status: StatementMatchStatus.UNMATCHED,
          },
        });
        records.push(item);
      }
      return records;
    });

    return {
      message: `Imported ${created.length} statement rows successfully`,
      count: created.length,
    };
  }

  async matchStatement(storeId: string, userId: string, dto: MatchStatementDto) {
    const entry = await this.prisma.bankStatementEntry.findFirst({
      where: { id: dto.statementId, storeId },
    });
    if (!entry) {
      throw new NotFoundException('Statement entry not found');
    }

    if (dto.transactionId) {
      const bookTx = await this.prisma.cashBankTransaction.findFirst({
        where: { id: dto.transactionId, storeId },
      });
      if (!bookTx) {
        throw new NotFoundException('Book transaction not found');
      }

      return this.prisma.bankStatementEntry.update({
        where: { id: entry.id },
        data: {
          status: StatementMatchStatus.MATCHED,
          matchedTransactionId: bookTx.id,
          matchedAt: new Date(),
          matchedById: userId,
        },
      });
    } else {
      // Manual match/sign-off
      return this.prisma.bankStatementEntry.update({
        where: { id: entry.id },
        data: {
          status: StatementMatchStatus.MANUALLY_RECONCILED,
          matchedAt: new Date(),
          matchedById: userId,
        },
      });
    }
  }

  async unmatchStatement(storeId: string, statementId: string) {
    const entry = await this.prisma.bankStatementEntry.findFirst({
      where: { id: statementId, storeId },
    });
    if (!entry) {
      throw new NotFoundException('Statement entry not found');
    }

    return this.prisma.bankStatementEntry.update({
      where: { id: entry.id },
      data: {
        status: StatementMatchStatus.UNMATCHED,
        matchedTransactionId: null,
        matchedAt: null,
        matchedById: null,
      },
    });
  }

  // =========================================================================
  // 5. DAILY CASH CLOSING (RECONCILING PHYSICAL REGISTER vs EXPECTED)
  // =========================================================================

  async getCashClosingStatus(storeId: string, dateStr?: string) {
    // 1. Get primary Cash account
    const cashAccount = await this.prisma.cashBankAccount.findFirst({
      where: { storeId, accountType: BankAccountType.CASH, isActive: true },
    });
    if (!cashAccount) {
      throw new NotFoundException('No active Cash account found for this store');
    }

    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    // Check if closing already performed for this date
    const existingClosing = await this.prisma.dailyCashClosing.findFirst({
      where: {
        storeId,
        accountId: cashAccount.id,
        closingDate: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      include: {
        closedBy: { select: { id: true, fullName: true } },
      },
    });

    // Opening cash at start of day (or opening balance if first day)
    const priorClosing = await this.prisma.dailyCashClosing.findFirst({
      where: {
        storeId,
        accountId: cashAccount.id,
        closingDate: { lt: dayStart },
      },
      orderBy: { closingDate: 'desc' },
    });

    const openingCash = priorClosing
      ? new Decimal(priorClosing.physicalCashCounted)
      : new Decimal(cashAccount.openingBalance);

    // Inflows for day
    const dayInflows = await this.prisma.cashBankTransaction.aggregate({
      where: {
        storeId,
        accountId: cashAccount.id,
        isReversed: false,
        transactionDate: { gte: dayStart, lte: dayEnd },
        transactionType: {
          in: [
            BankTransactionType.RECEIPT,
            BankTransactionType.DEPOSIT,
            BankTransactionType.CUSTOMER_COLLECTION,
            BankTransactionType.CONTRA_TRANSFER,
          ],
        },
      },
      _sum: { amount: true },
    });

    // Outflows for day
    const dayOutflows = await this.prisma.cashBankTransaction.aggregate({
      where: {
        storeId,
        accountId: cashAccount.id,
        isReversed: false,
        transactionDate: { gte: dayStart, lte: dayEnd },
        transactionType: {
          in: [
            BankTransactionType.PAYMENT,
            BankTransactionType.WITHDRAWAL,
            BankTransactionType.SUPPLIER_PAYMENT,
            BankTransactionType.EXPENSE,
            BankTransactionType.REFUND,
            BankTransactionType.TRANSFER,
          ],
        },
      },
      _sum: { amount: true },
    });

    const receipts = new Decimal(dayInflows?._sum?.amount || 0);
    const payments = new Decimal(dayOutflows?._sum?.amount || 0);
    const expectedCash = openingCash.plus(receipts).minus(payments);

    return {
      cashAccountId: cashAccount.id,
      cashAccountName: cashAccount.accountName,
      date: targetDate.toISOString().slice(0, 10),
      isClosed: !!existingClosing,
      closingRecord: existingClosing,
      openingCash: openingCash.toNumber(),
      cashReceipts: receipts.toNumber(),
      cashPayments: payments.toNumber(),
      expectedCash: expectedCash.toNumber(),
    };
  }

  async submitCashClosing(storeId: string, userId: string, dto: CreateDailyCashClosingDto) {
    const status = await this.getCashClosingStatus(storeId, dto.closingDate);

    const physical = new Decimal(dto.physicalCashCounted);
    const expected = new Decimal(status.expectedCash);
    const difference = physical.minus(expected);

    const closingDate = dto.closingDate ? new Date(dto.closingDate) : new Date();

    return this.prisma.$transaction(async (tx) => {
      // Upsert closing
      const closing = await tx.dailyCashClosing.upsert({
        where: {
          storeId_accountId_closingDate: {
            storeId,
            accountId: dto.accountId,
            closingDate,
          },
        },
        create: {
          storeId,
          accountId: dto.accountId,
          closingDate,
          openingCash: status.openingCash,
          cashReceipts: status.cashReceipts,
          cashPayments: status.cashPayments,
          expectedCash: status.expectedCash,
          physicalCashCounted: physical.toNumber(),
          differenceAmount: difference.toNumber(),
          notes: dto.notes || null,
          status: 'CLOSED',
          closedById: userId,
        },
        update: {
          openingCash: status.openingCash,
          cashReceipts: status.cashReceipts,
          cashPayments: status.cashPayments,
          expectedCash: status.expectedCash,
          physicalCashCounted: physical.toNumber(),
          differenceAmount: difference.toNumber(),
          notes: dto.notes || null,
          status: 'CLOSED',
          closedById: userId,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          storeId,
          userId,
          action: 'DAILY_CASH_CLOSING',
          entityName: 'DAILY_CASH_CLOSING',
          entityId: closing.id,
          newValues: {
            date: closingDate.toISOString().slice(0, 10),
            expected: expected.toNumber(),
            physical: physical.toNumber(),
            difference: difference.toNumber(),
          },
        },
      });

      return closing;
    });
  }

  async reopenCashClosing(storeId: string, userId: string, dateStr?: string) {
    const cashAccount = await this.prisma.cashBankAccount.findFirst({
      where: { storeId, accountType: BankAccountType.CASH, isActive: true },
    });
    if (!cashAccount) {
      throw new NotFoundException('No active Cash account found for this store');
    }

    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    const existingClosing = await this.prisma.dailyCashClosing.findFirst({
      where: {
        storeId,
        accountId: cashAccount.id,
        closingDate: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
    });

    if (!existingClosing) {
      throw new BadRequestException('No cash closing record found for this date to reopen');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.dailyCashClosing.delete({
        where: { id: existingClosing.id },
      });

      await tx.auditLog.create({
        data: {
          storeId,
          userId,
          action: 'DAILY_CASH_REOPEN',
          entityName: 'DAILY_CASH_CLOSING',
          entityId: existingClosing.id,
          newValues: {
            date: targetDate.toISOString().slice(0, 10),
            reason: 'Reopened cash counter for recount',
          },
        },
      });

      return { message: 'Cash counter reopened successfully for recounting.' };
    });
  }
}
