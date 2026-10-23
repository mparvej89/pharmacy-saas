export interface StoreInfo {
  id: string;
  name: string;
  code: string;
  gstin: string;
  drugLicenseNumber: string;
  stateCode: string;
  role: string;
}

export interface UserSession {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  isSuperAdmin?: boolean;
  activeStore: StoreInfo | null;
  stores: Array<{ id: string; name: string; code: string; role: string }>;
}

export interface MedicineBatch {
  id: string;
  batchNumber: string;
  expiryDate: string;
  quantityAvailable: number;
  mrp: number;
  purchasePrice: number;
  sellingPrice: number;
  rackLocation?: string;
  status: string;
}

export interface Medicine {
  id: string;
  name: string;
  genericName: string;
  brandName?: string;
  manufacturer?: string;
  composition?: string;
  dosageForm: string;
  packSize: number;
  unitOfMeasure: string;
  baseUnit?: string;
  purchaseUnit?: string;
  conversionFactor?: number;
  unitSellingPrice?: number;
  boxPackaging?: boolean;
  stripsPerBox?: number;
  packageVolume?: number;
  allowPartialDispensing?: boolean;
  hsnCode: string;
  gstRate: number;
  prescriptionCategory: 'OTC' | 'SCHEDULE_H' | 'SCHEDULE_H1' | 'SCHEDULE_X';
  barcode?: string;
  sku?: string;
  reorderLevel: number;
  purchaseCost: number;
  sellingPrice: number;
  mrp: number;
  isActive: boolean;
  totalAvailableStock?: number;
  nearestExpiry?: string;
  batches?: MedicineBatch[];
}

export interface CartItem {
  medicine: Medicine;
  selectedBatch?: MedicineBatch;
  quantity: number;
  saleUnit?: string;
  conversionFactor?: number;
  unitPrice: number;
  mrp: number;
  discountPercent: number;
  gstRate: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  totalAmount: number;
}

export type BankAccountType = 'CASH' | 'BANK' | 'UPI_SETTLEMENT' | 'CHEQUE' | 'OTHER';

export type BankTransactionType =
  | 'RECEIPT'
  | 'PAYMENT'
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'TRANSFER'
  | 'CUSTOMER_COLLECTION'
  | 'SUPPLIER_PAYMENT'
  | 'EXPENSE'
  | 'REFUND'
  | 'OPENING_BALANCE'
  | 'CONTRA_TRANSFER';

export type StatementMatchStatus = 'UNMATCHED' | 'MATCHED' | 'MANUALLY_RECONCILED';

export interface CashBankAccount {
  id: string;
  storeId: string;
  accountName: string;
  accountType: BankAccountType;
  accountNumber?: string | null;
  bankName?: string | null;
  ifscCode?: string | null;
  branchName?: string | null;
  upiId?: string | null;
  openingBalance: number;
  openingDate: string;
  currentBalance: number;
  bookBalance?: number;
  totalInflows?: number;
  totalOutflows?: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CashBankTransaction {
  id: string;
  storeId: string;
  accountId: string;
  account?: { id: string; accountName: string; accountType: BankAccountType; bankName?: string };
  transactionDate: string;
  transactionType: BankTransactionType;
  amount: number;
  balanceAfter: number;
  paymentMethod: string;
  referenceNumber?: string | null;
  partyName?: string | null;
  narration?: string | null;
  category?: string | null;
  transferAccountId?: string | null;
  transferAccount?: { id: string; accountName: string };
  isReversed: boolean;
  reversedAt?: string | null;
  reversalReason?: string | null;
  createdById: string;
  createdBy?: { id: string; fullName: string };
  createdAt: string;
}

export interface BankDashboardSummary {
  totalBookBalance: number;
  cashInHand: number;
  bankBalances: number;
  upiSettlementBalances: number;
  otherBalances: number;
  todayReceipts: number;
  todayPayments: number;
  accounts: Array<{
    id: string;
    accountName: string;
    accountType: BankAccountType;
    bankName?: string;
    accountNumber?: string;
    bookBalance: number;
    unreconciledDifference: number;
    unreconciledCount: number;
    isDefault: boolean;
  }>;
  asOfDate: string;
}

export interface BankStatementEntry {
  id: string;
  accountId: string;
  statementDate: string;
  description: string;
  referenceNumber?: string | null;
  withdrawalAmount: number;
  depositAmount: number;
  bankBalance?: number | null;
  status: StatementMatchStatus;
  matchedTransactionId?: string | null;
  matchedTransaction?: CashBankTransaction;
  matchedAt?: string | null;
}

export interface BankReconciliationSummary {
  accountId: string;
  accountName: string;
  bankName?: string;
  accountNumber?: string;
  bookBalance: number;
  statementBalance: number | null;
  difference: number | null;
  matchedCount: number;
  unmatchedCount: number;
  unmatchedEntries: BankStatementEntry[];
  matchedEntries: BankStatementEntry[];
  bookTransactions: CashBankTransaction[];
}

export interface DailyCashClosingStatus {
  cashAccountId: string;
  cashAccountName: string;
  date: string;
  isClosed: boolean;
  closingRecord?: {
    id: string;
    openingCash: number;
    cashReceipts: number;
    cashPayments: number;
    expectedCash: number;
    physicalCashCounted: number;
    differenceAmount: number;
    notes?: string;
    closedAt: string;
    closedBy?: { id: string; fullName: string };
  } | null;
  openingCash: number;
  cashReceipts: number;
  cashPayments: number;
  expectedCash: number;
}

