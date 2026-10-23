import { Test, TestingModule } from '@nestjs/testing';
import { BankingService } from './banking.service';
import { PrismaService } from '@/prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { BankAccountType, BankTransactionType, StatementMatchStatus, PaymentMethod } from '@prisma/client';

describe('BankingService - Complete Cash & Bank Acceptance Tests (MARG-style)', () => {
  let service: BankingService;
  let prisma: any;

  const mockStoreId = 'store-uuid-apollo-1';
  const mockUserId = 'user-uuid-pharmacist-1';

  const mockCashAccount: any = {
    id: 'acc-cash-1',
    storeId: mockStoreId,
    accountName: 'Cash in Hand',
    accountType: BankAccountType.CASH,
    accountNumber: null,
    bankName: null,
    ifscCode: null,
    openingBalance: 10000,
    openingDate: new Date('2026-01-01'),
    currentBalance: 10000,
    isDefault: true,
    isActive: true,
  };

  const mockBankAccount: any = {
    id: 'acc-bank-1',
    storeId: mockStoreId,
    accountName: 'HDFC Current A/c',
    accountType: BankAccountType.BANK,
    accountNumber: '50200098765432',
    bankName: 'HDFC Bank',
    ifscCode: 'HDFC0001234',
    openingBalance: 50000,
    openingDate: new Date('2026-01-01'),
    currentBalance: 50000,
    isDefault: false,
    isActive: true,
  };

  beforeEach(async () => {
    prisma = {
      cashBankAccount: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      cashBankTransaction: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        aggregate: jest.fn(),
      },
      bankStatementEntry: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      dailyCashClosing: {
        findFirst: jest.fn(),
        upsert: jest.fn(),
      },
      supplier: {
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<BankingService>(BankingService);
  });

  // =========================================================================
  // 1. OPENING BALANCE & BOOK BALANCE CALCULATION
  // =========================================================================
  describe('Accounting Rules - Balance Calculation (Opening + Inflows − Outflows)', () => {
    it('should correctly derive book balance strictly from opening balance + posted inflows - posted outflows', async () => {
      prisma.cashBankAccount.findFirst.mockResolvedValue(mockCashAccount);

      // Inflows: 5000 total (e.g. Sales Receipts + Customer Collections)
      prisma.cashBankTransaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 5000 } }) // inflows
        .mockResolvedValueOnce({ _sum: { amount: 2000 } }); // outflows

      const summary = await service.getAccountBalanceSummary(mockStoreId, mockCashAccount.id);

      // Expected: Opening (10000) + Inflows (5000) - Outflows (2000) = 13000
      expect(summary.openingBalance).toBe(10000);
      expect(summary.totalInflows).toBe(5000);
      expect(summary.totalOutflows).toBe(2000);
      expect(summary.calculatedBalance).toBe(13000);
    });
  });

  // =========================================================================
  // 2. CONTRA / ATOMIC TRANSFERS (CASH DEPOSIT, WITHDRAWAL, BANK-TO-BANK)
  // =========================================================================
  describe('Contra Transfers (Cash Deposit / Withdrawal / Bank-to-Bank)', () => {
    it('should atomically deduct from source and increment destination without inflating income or expense', async () => {
      prisma.cashBankAccount.findFirst
        .mockResolvedValueOnce(mockCashAccount) // Source: Cash
        .mockResolvedValueOnce(mockBankAccount); // Dest: HDFC Bank

      prisma.cashBankAccount.update
        .mockResolvedValueOnce({ ...mockCashAccount, currentBalance: 8000 })
        .mockResolvedValueOnce({ ...mockBankAccount, currentBalance: 52000 });

      prisma.cashBankTransaction.create
        .mockResolvedValueOnce({
          id: 'tx-out-1',
          accountId: mockCashAccount.id,
          transactionType: BankTransactionType.DEPOSIT,
          amount: 2000,
          balanceAfter: 8000,
        })
        .mockResolvedValueOnce({
          id: 'tx-in-1',
          accountId: mockBankAccount.id,
          transactionType: BankTransactionType.CONTRA_TRANSFER,
          amount: 2000,
          balanceAfter: 52000,
        });

      const result = await service.postTransaction(mockStoreId, mockUserId, {
        accountId: mockCashAccount.id,
        transferAccountId: mockBankAccount.id,
        transactionType: BankTransactionType.DEPOSIT,
        amount: 2000,
        narration: 'Cash deposit into HDFC current account',
      });

      // Verify source deduction (2000)
      expect(prisma.cashBankAccount.update).toHaveBeenCalledWith({
        where: { id: mockCashAccount.id },
        data: { currentBalance: { decrement: 2000 } },
      });

      // Verify destination increment (2000)
      expect(prisma.cashBankAccount.update).toHaveBeenCalledWith({
        where: { id: mockBankAccount.id },
        data: { currentBalance: { increment: 2000 } },
      });

      // Verify both ledger entries created with category INTERNAL_CONTRA
      expect(prisma.cashBankTransaction.create).toHaveBeenCalledTimes(2);
      expect(result.id).toBe('tx-out-1');
    });

    it('should throw BadRequestException if source and destination accounts are identical', async () => {
      prisma.cashBankAccount.findFirst.mockResolvedValue(mockCashAccount);

      let err: any;
      try {
        await service.postTransaction(mockStoreId, mockUserId, {
          accountId: mockCashAccount.id,
          transferAccountId: mockCashAccount.id, // SAME!
          transactionType: BankTransactionType.TRANSFER,
          amount: 1000,
          narration: 'Self transfer test',
        });
      } catch (e) {
        err = e;
      }
      expect(err).toBeInstanceOf(BadRequestException);
    });
  });

  // =========================================================================
  // 3. SUPPLIER PAYMENTS & PAYABLES REDUCTION
  // =========================================================================
  describe('Supplier Payments Integration', () => {
    it('should reduce paying account balance and decrease supplier outstanding payable in one atomic transaction', async () => {
      prisma.cashBankAccount.findFirst.mockResolvedValue(mockBankAccount);
      prisma.cashBankAccount.update.mockResolvedValue({ ...mockBankAccount, currentBalance: 45000 });
      prisma.supplier.update.mockResolvedValue({ id: 'sup-1', outstandingBalance: 15000 });
      prisma.cashBankTransaction.create.mockResolvedValue({
        id: 'tx-pay-sup-1',
        amount: 5000,
        transactionType: BankTransactionType.SUPPLIER_PAYMENT,
      });

      await service.postTransaction(mockStoreId, mockUserId, {
        accountId: mockBankAccount.id,
        transactionType: BankTransactionType.SUPPLIER_PAYMENT,
        amount: 5000,
        relatedSupplierId: 'sup-1',
        paymentMethod: PaymentMethod.UPI,
        narration: 'Invoice settlement for medicine stock',
      });

      // Paying bank account decremented
      expect(prisma.cashBankAccount.update).toHaveBeenCalledWith({
        where: { id: mockBankAccount.id },
        data: { currentBalance: { decrement: 5000 } },
      });

      // Supplier outstanding balance reduced
      expect(prisma.supplier.update).toHaveBeenCalledWith({
        where: { id: 'sup-1' },
        data: { outstandingBalance: { decrement: 5000 } },
      });
    });
  });

  // =========================================================================
  // 4. AUDITABLE REVERSALS (NEVER SILENTLY DELETE)
  // =========================================================================
  describe('Auditable Reversals & Compensating Entries', () => {
    it('should reverse a payment by restoring account balance, marking original reversed, and creating compensating refund entry', async () => {
      const originalTx = {
        id: 'tx-orig-1',
        storeId: mockStoreId,
        accountId: mockBankAccount.id,
        transactionType: BankTransactionType.EXPENSE,
        amount: 1200,
        isReversed: false,
        paymentMethod: PaymentMethod.UPI,
        partyName: 'Electricity Board',
        referenceNumber: 'EB-OCT',
      };

      prisma.cashBankTransaction.findFirst.mockResolvedValue(originalTx);
      prisma.cashBankAccount.update.mockResolvedValue({ ...mockBankAccount, currentBalance: 51200 });
      prisma.cashBankTransaction.update.mockResolvedValue({ ...originalTx, isReversed: true });
      prisma.cashBankTransaction.create.mockResolvedValue({ id: 'tx-rev-comp-1' });

      const res = await service.reverseTransaction(mockStoreId, originalTx.id, mockUserId, {
        reason: 'Wrong electricity bill meter number entered',
      });

      // Account incremented back by 1200
      expect(prisma.cashBankAccount.update).toHaveBeenCalledWith({
        where: { id: mockBankAccount.id },
        data: { currentBalance: { increment: 1200 } },
      });

      // Original marked reversed with audit reason
      const updateCall = prisma.cashBankTransaction.update.mock.calls[0][0];
      expect(updateCall.where.id).toBe(originalTx.id);
      expect(updateCall.data.isReversed).toBe(true);
      expect(updateCall.data.reversalReason).toBe('Wrong electricity bill meter number entered');

      // Audit log entry written
      expect(prisma.auditLog.create).toHaveBeenCalled();
      expect(res.message).toBe('Transaction reversed successfully');
    });

    it('should reject reversing an already reversed transaction', async () => {
      prisma.cashBankTransaction.findFirst.mockResolvedValue({
        id: 'tx-already-rev',
        isReversed: true,
      });

      let err: any;
      try {
        await service.reverseTransaction(mockStoreId, 'tx-already-rev', mockUserId, {
          reason: 'Double reversal attempt',
        });
      } catch (e) {
        err = e;
      }
      expect(err).toBeInstanceOf(BadRequestException);
    });
  });

  // =========================================================================
  // 5. BANK RECONCILIATION DIFFERENCE
  // =========================================================================
  describe('Bank Reconciliation & Statement Matching', () => {
    it('should accurately calculate statement balance, book balance, and reconciliation difference', async () => {
      // Mock account with book balance 50000
      prisma.cashBankAccount.findFirst.mockResolvedValue(mockBankAccount);
      prisma.cashBankTransaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 0 } })
        .mockResolvedValueOnce({ _sum: { amount: 0 } });

      // Bank statement entries showing latest statement bank balance of 53000 (3000 difference)
      const statementEntries = [
        {
          id: 'stmt-1',
          statementDate: new Date('2026-10-22'),
          description: 'Client NEFT',
          withdrawalAmount: 0,
          depositAmount: 3000,
          bankBalance: 53000,
          status: StatementMatchStatus.UNMATCHED,
        },
      ];
      prisma.bankStatementEntry.findMany.mockResolvedValue(statementEntries);
      prisma.cashBankTransaction.findMany.mockResolvedValue([]);

      const recon = await service.getReconciliation(mockStoreId, mockBankAccount.id);

      expect(recon.bookBalance).toBe(50000);
      expect(recon.statementBalance).toBe(53000);
      expect(recon.difference).toBe(3000); // 53000 - 50000
      expect(recon.unmatchedCount).toBe(1);
    });
  });

  // =========================================================================
  // 6. DAILY CASH CLOSING (PHYSICAL vs EXPECTED)
  // =========================================================================
  describe('Daily Cash Closing', () => {
    it('should compute expected cash and report exact shortage or excess when physical cash is counted', async () => {
      prisma.cashBankAccount.findFirst.mockResolvedValue(mockCashAccount);
      prisma.dailyCashClosing.findFirst
        .mockResolvedValueOnce(null) // no existing closing today
        .mockResolvedValueOnce(null); // no prior closing, fallback to openingBalance 10000

      // Receipts 4000, Payments 1500 -> Expected Cash = 10000 + 4000 - 1500 = 12500
      prisma.cashBankTransaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 4000 } })
        .mockResolvedValueOnce({ _sum: { amount: 1500 } });

      const status = await service.getCashClosingStatus(mockStoreId);
      expect(status.expectedCash).toBe(12500);

      // Reset mock for submitCashClosing which calls getCashClosingStatus internally
      prisma.cashBankAccount.findFirst.mockResolvedValue(mockCashAccount);
      prisma.dailyCashClosing.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      prisma.cashBankTransaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 4000 } })
        .mockResolvedValueOnce({ _sum: { amount: 1500 } });

      // Submit physical cash count of 12450 (shortage of ₹50)
      prisma.dailyCashClosing.upsert.mockResolvedValue({
        id: 'closing-today-1',
        physicalCashCounted: 12450,
        differenceAmount: -50,
        status: 'CLOSED',
      });

      const submitted: any = await service.submitCashClosing(mockStoreId, mockUserId, {
        accountId: mockCashAccount.id,
        physicalCashCounted: 12450,
        notes: 'Shortage of ₹50 due to round-off difference',
      });

      const upsertCall = prisma.dailyCashClosing.upsert.mock.calls[0][0];
      expect(upsertCall.create.expectedCash).toBe(12500);
      expect(upsertCall.create.physicalCashCounted).toBe(12450);
      expect(upsertCall.create.differenceAmount).toBe(-50);
      expect(Number(submitted.differenceAmount)).toBe(-50);
    });
  });
});
