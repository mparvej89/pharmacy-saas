-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'TRIAL', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BarcodeType" AS ENUM ('EAN13', 'EAN8', 'UPC', 'CODE128', 'QR', 'INTERNAL');

-- CreateEnum
CREATE TYPE "SyncOperationType" AS ENUM ('SALE_CREATE', 'SALE_RETURN', 'PURCHASE_POST', 'STOCK_ADJUST', 'PAYMENT_RECORD', 'MEDICINE_UPSERT');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CONFLICT');

-- CreateEnum
CREATE TYPE "BankAccountType" AS ENUM ('CASH', 'BANK', 'UPI_SETTLEMENT', 'CHEQUE', 'OTHER');

-- CreateEnum
CREATE TYPE "BankTransactionType" AS ENUM ('RECEIPT', 'PAYMENT', 'DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'CUSTOMER_COLLECTION', 'SUPPLIER_PAYMENT', 'EXPENSE', 'REFUND', 'OPENING_BALANCE', 'CONTRA_TRANSFER');

-- CreateEnum
CREATE TYPE "StatementMatchStatus" AS ENUM ('UNMATCHED', 'MATCHED', 'MANUALLY_RECONCILED');

-- AlterTable: users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: tenant_stores
ALTER TABLE "tenant_stores" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

-- AlterTable: medicines
ALTER TABLE "medicines" ADD COLUMN IF NOT EXISTS "baseUnit" TEXT NOT NULL DEFAULT 'TABLET',
ADD COLUMN IF NOT EXISTS "purchaseUnit" TEXT NOT NULL DEFAULT 'STRIP',
ADD COLUMN IF NOT EXISTS "conversionFactor" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN IF NOT EXISTS "unitSellingPrice" DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS "isStripPriced" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "boxPackaging" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "stripsPerBox" INTEGER,
ADD COLUMN IF NOT EXISTS "packageVolume" DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS "allowPartialDispensing" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: purchase_items
ALTER TABLE "purchase_items" ADD COLUMN IF NOT EXISTS "freeLooseQuantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "purchaseUnit" TEXT DEFAULT 'STRIP',
ADD COLUMN IF NOT EXISTS "conversionFactor" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS "baseQuantity" INTEGER,
ADD COLUMN IF NOT EXISTS "rackLocation" TEXT;

-- AlterTable: sale_items
ALTER TABLE "sale_items" ADD COLUMN IF NOT EXISTS "saleUnit" TEXT DEFAULT 'STRIP',
ADD COLUMN IF NOT EXISTS "conversionFactor" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS "baseQuantity" INTEGER;

-- AlterTable: payments
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "salesInvoiceId" TEXT;

-- AlterTable: audit_logs
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

-- CreateTable: tenants
CREATE TABLE IF NOT EXISTS "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "legalName" TEXT,
    "gstin" TEXT,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "subscriptionPlan" TEXT NOT NULL DEFAULT 'PRO',
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable: stores
CREATE TABLE IF NOT EXISTS "stores" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "drugLicenseNumber" TEXT NOT NULL,
    "gstin" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL DEFAULT '27',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable: store_memberships
CREATE TABLE IF NOT EXISTS "store_memberships" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'BILLING_OPERATOR',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable: medicine_barcodes
CREATE TABLE IF NOT EXISTS "medicine_barcodes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "storeId" TEXT NOT NULL,
    "branchId" TEXT,
    "medicineId" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "barcodeType" "BarcodeType" NOT NULL DEFAULT 'EAN13',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medicine_barcodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: purchase_invoices
CREATE TABLE IF NOT EXISTS "purchase_invoices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "storeId" TEXT NOT NULL,
    "branchId" TEXT,
    "supplierId" TEXT NOT NULL,
    "purchaseNumber" TEXT NOT NULL,
    "supplierInvoiceNumber" TEXT NOT NULL,
    "supplierInvoiceDate" DATE NOT NULL,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'DRAFT',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "discountAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "taxAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "totalAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "notes" TEXT,
    "postedAt" TIMESTAMP(3),
    "postedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable: purchase_invoice_items
CREATE TABLE IF NOT EXISTS "purchase_invoice_items" (
    "id" TEXT NOT NULL,
    "purchaseInvoiceId" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "batchId" TEXT,
    "batchNumber" TEXT NOT NULL,
    "expiryDate" DATE NOT NULL,
    "manufacturingDate" DATE,
    "quantity" INTEGER NOT NULL,
    "freeQuantity" INTEGER NOT NULL DEFAULT 0,
    "freeLooseQuantity" INTEGER NOT NULL DEFAULT 0,
    "purchaseUnit" TEXT NOT NULL DEFAULT 'STRIP',
    "conversionFactor" INTEGER NOT NULL DEFAULT 1,
    "baseQuantity" INTEGER,
    "purchaseRate" DECIMAL(12,2) NOT NULL,
    "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "gstRate" DECIMAL(5,2) NOT NULL,
    "taxAmount" DECIMAL(12,2) NOT NULL,
    "netAmount" DECIMAL(12,2) NOT NULL,
    "mrp" DECIMAL(12,2) NOT NULL,
    "sellingPrice" DECIMAL(12,2) NOT NULL,
    "rackLocation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable: sales_invoices
CREATE TABLE IF NOT EXISTS "sales_invoices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "storeId" TEXT NOT NULL,
    "branchId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "idempotencyKey" TEXT,
    "saleDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "doctorName" TEXT,
    "doctorRegNo" TEXT,
    "patientName" TEXT,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "itemDiscountTotal" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "billDiscountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "billDiscountAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "taxableAmount" DECIMAL(14,2) NOT NULL,
    "cgstAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "sgstAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "igstAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "totalTax" DECIMAL(14,2) NOT NULL,
    "roundOff" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "grandTotal" DECIMAL(14,2) NOT NULL,
    "paidAmount" DECIMAL(14,2) NOT NULL,
    "changeAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PAID',
    "status" "SaleStatus" NOT NULL DEFAULT 'COMPLETED',
    "cashierId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable: sales_invoice_items
CREATE TABLE IF NOT EXISTS "sales_invoice_items" (
    "id" TEXT NOT NULL,
    "salesInvoiceId" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "expiryDate" DATE NOT NULL,
    "quantity" INTEGER NOT NULL,
    "saleUnit" TEXT NOT NULL DEFAULT 'STRIP',
    "conversionFactor" INTEGER NOT NULL DEFAULT 1,
    "baseQuantity" INTEGER,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "mrp" DECIMAL(12,2) NOT NULL,
    "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "taxableAmount" DECIMAL(12,2) NOT NULL,
    "gstRate" DECIMAL(5,2) NOT NULL,
    "cgstAmount" DECIMAL(12,2) NOT NULL,
    "sgstAmount" DECIMAL(12,2) NOT NULL,
    "igstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "returnedQuantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable: stock_ledgers
CREATE TABLE IF NOT EXISTS "stock_ledgers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "storeId" TEXT NOT NULL,
    "branchId" TEXT,
    "medicineId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "expiryDate" DATE NOT NULL,
    "movementType" "StockMovementType" NOT NULL,
    "quantityChange" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "unitCost" DECIMAL(12,2),
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_ledgers_pkey" PRIMARY KEY ("id")
);

-- CreateTable: sync_operations
CREATE TABLE IF NOT EXISTS "sync_operations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "storeId" TEXT NOT NULL,
    "branchId" TEXT,
    "userId" TEXT,
    "deviceId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "operationType" "SyncOperationType" NOT NULL,
    "entityName" TEXT NOT NULL,
    "entityId" TEXT,
    "payload" JSONB NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: cash_bank_accounts
CREATE TABLE IF NOT EXISTS "cash_bank_accounts" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountType" "BankAccountType" NOT NULL DEFAULT 'BANK',
    "accountNumber" TEXT,
    "bankName" TEXT,
    "ifscCode" TEXT,
    "branchName" TEXT,
    "upiId" TEXT,
    "openingBalance" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "openingDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentBalance" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: cash_bank_transactions
CREATE TABLE IF NOT EXISTS "cash_bank_transactions" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transactionType" "BankTransactionType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "balanceAfter" DECIMAL(14,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "referenceNumber" TEXT,
    "partyName" TEXT,
    "narration" TEXT NOT NULL,
    "category" TEXT,
    "transferAccountId" TEXT,
    "relatedSaleId" TEXT,
    "relatedPurchaseId" TEXT,
    "relatedSupplierId" TEXT,
    "relatedCustomerId" TEXT,
    "isReversed" BOOLEAN NOT NULL DEFAULT false,
    "reversedAt" TIMESTAMP(3),
    "reversalReason" TEXT,
    "reversalTxId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_bank_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: bank_statement_entries
CREATE TABLE IF NOT EXISTS "bank_statement_entries" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "statementDate" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "referenceNumber" TEXT,
    "withdrawalAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "depositAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "bankBalance" DECIMAL(14,2),
    "status" "StatementMatchStatus" NOT NULL DEFAULT 'UNMATCHED',
    "matchedTransactionId" TEXT,
    "matchedAt" TIMESTAMP(3),
    "matchedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_statement_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable: daily_cash_closings
CREATE TABLE IF NOT EXISTS "daily_cash_closings" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "closingDate" DATE NOT NULL,
    "openingCash" DECIMAL(14,2) NOT NULL,
    "cashReceipts" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "cashPayments" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    "expectedCash" DECIMAL(14,2) NOT NULL,
    "physicalCashCounted" DECIMAL(14,2) NOT NULL,
    "differenceAmount" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CLOSED',
    "closedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_cash_closings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "tenants_slug_key" ON "tenants"("slug");
CREATE INDEX IF NOT EXISTS "tenants_status_isActive_idx" ON "tenants"("status", "isActive");

CREATE UNIQUE INDEX IF NOT EXISTS "stores_code_key" ON "stores"("code");
CREATE INDEX IF NOT EXISTS "stores_tenantId_isActive_idx" ON "stores"("tenantId", "isActive");

CREATE UNIQUE INDEX IF NOT EXISTS "store_memberships_storeId_userId_key" ON "store_memberships"("storeId", "userId");
CREATE INDEX IF NOT EXISTS "store_memberships_tenantId_userId_idx" ON "store_memberships"("tenantId", "userId");

CREATE INDEX IF NOT EXISTS "tenant_stores_tenantId_idx" ON "tenant_stores"("tenantId");

CREATE UNIQUE INDEX IF NOT EXISTS "medicine_barcodes_storeId_barcode_key" ON "medicine_barcodes"("storeId", "barcode");
CREATE INDEX IF NOT EXISTS "medicine_barcodes_medicineId_idx" ON "medicine_barcodes"("medicineId");
CREATE INDEX IF NOT EXISTS "medicine_barcodes_tenantId_barcode_idx" ON "medicine_barcodes"("tenantId", "barcode");

CREATE UNIQUE INDEX IF NOT EXISTS "purchase_invoices_storeId_supplierId_supplierInvoiceNumber_key" ON "purchase_invoices"("storeId", "supplierId", "supplierInvoiceNumber");
CREATE INDEX IF NOT EXISTS "purchase_invoices_storeId_purchaseNumber_idx" ON "purchase_invoices"("storeId", "purchaseNumber");
CREATE INDEX IF NOT EXISTS "purchase_invoices_tenantId_storeId_supplierInvoiceDate_idx" ON "purchase_invoices"("tenantId", "storeId", "supplierInvoiceDate");

CREATE INDEX IF NOT EXISTS "purchase_invoice_items_purchaseInvoiceId_idx" ON "purchase_invoice_items"("purchaseInvoiceId");
CREATE INDEX IF NOT EXISTS "purchase_invoice_items_medicineId_batchNumber_idx" ON "purchase_invoice_items"("medicineId", "batchNumber");

CREATE UNIQUE INDEX IF NOT EXISTS "sales_invoices_idempotencyKey_key" ON "sales_invoices"("idempotencyKey");
CREATE UNIQUE INDEX IF NOT EXISTS "sales_invoices_storeId_invoiceNumber_key" ON "sales_invoices"("storeId", "invoiceNumber");
CREATE INDEX IF NOT EXISTS "sales_invoices_storeId_saleDate_idx" ON "sales_invoices"("storeId", "saleDate");
CREATE INDEX IF NOT EXISTS "sales_invoices_tenantId_storeId_saleDate_idx" ON "sales_invoices"("tenantId", "storeId", "saleDate");

CREATE INDEX IF NOT EXISTS "sales_invoice_items_salesInvoiceId_idx" ON "sales_invoice_items"("salesInvoiceId");
CREATE INDEX IF NOT EXISTS "sales_invoice_items_medicineId_batchId_idx" ON "sales_invoice_items"("medicineId", "batchId");

CREATE INDEX IF NOT EXISTS "payments_storeId_receivedAt_idx" ON "payments"("storeId", "receivedAt");

CREATE INDEX IF NOT EXISTS "stock_ledgers_storeId_medicineId_createdAt_idx" ON "stock_ledgers"("storeId", "medicineId", "createdAt");
CREATE INDEX IF NOT EXISTS "stock_ledgers_storeId_batchId_idx" ON "stock_ledgers"("storeId", "batchId");
CREATE INDEX IF NOT EXISTS "stock_ledgers_tenantId_storeId_createdAt_idx" ON "stock_ledgers"("tenantId", "storeId", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "sync_operations_idempotencyKey_key" ON "sync_operations"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "sync_operations_storeId_status_createdAt_idx" ON "sync_operations"("storeId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "sync_operations_tenantId_storeId_deviceId_idx" ON "sync_operations"("tenantId", "storeId", "deviceId");

CREATE INDEX IF NOT EXISTS "audit_logs_tenantId_timestamp_idx" ON "audit_logs"("tenantId", "timestamp");

CREATE UNIQUE INDEX IF NOT EXISTS "cash_bank_accounts_storeId_accountName_key" ON "cash_bank_accounts"("storeId", "accountName");
CREATE INDEX IF NOT EXISTS "cash_bank_accounts_storeId_accountType_idx" ON "cash_bank_accounts"("storeId", "accountType");

CREATE INDEX IF NOT EXISTS "cash_bank_transactions_storeId_transactionDate_idx" ON "cash_bank_transactions"("storeId", "transactionDate");
CREATE INDEX IF NOT EXISTS "cash_bank_transactions_storeId_accountId_transactionDate_idx" ON "cash_bank_transactions"("storeId", "accountId", "transactionDate");
CREATE INDEX IF NOT EXISTS "cash_bank_transactions_storeId_transactionType_idx" ON "cash_bank_transactions"("storeId", "transactionType");

CREATE INDEX IF NOT EXISTS "bank_statement_entries_storeId_accountId_statementDate_idx" ON "bank_statement_entries"("storeId", "accountId", "statementDate");
CREATE INDEX IF NOT EXISTS "bank_statement_entries_storeId_status_idx" ON "bank_statement_entries"("storeId", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "daily_cash_closings_storeId_accountId_closingDate_key" ON "daily_cash_closings"("storeId", "accountId", "closingDate");
CREATE INDEX IF NOT EXISTS "daily_cash_closings_storeId_closingDate_idx" ON "daily_cash_closings"("storeId", "closingDate");

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "store_memberships" ADD CONSTRAINT "store_memberships_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "store_memberships" ADD CONSTRAINT "store_memberships_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "store_memberships" ADD CONSTRAINT "store_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant_stores" ADD CONSTRAINT "tenant_stores_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "medicine_barcodes" ADD CONSTRAINT "medicine_barcodes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "medicine_barcodes" ADD CONSTRAINT "medicine_barcodes_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "tenant_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "medicine_barcodes" ADD CONSTRAINT "medicine_barcodes_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "medicine_barcodes" ADD CONSTRAINT "medicine_barcodes_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "tenant_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_invoices" ADD CONSTRAINT "purchase_invoices_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "purchase_invoice_items" ADD CONSTRAINT "purchase_invoice_items_purchaseInvoiceId_fkey" FOREIGN KEY ("purchaseInvoiceId") REFERENCES "purchase_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_invoice_items" ADD CONSTRAINT "purchase_invoice_items_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_invoice_items" ADD CONSTRAINT "purchase_invoice_items_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "medicine_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "tenant_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sales_invoice_items" ADD CONSTRAINT "sales_invoice_items_salesInvoiceId_fkey" FOREIGN KEY ("salesInvoiceId") REFERENCES "sales_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sales_invoice_items" ADD CONSTRAINT "sales_invoice_items_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sales_invoice_items" ADD CONSTRAINT "sales_invoice_items_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "medicine_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payments" ADD CONSTRAINT "payments_salesInvoiceId_fkey" FOREIGN KEY ("salesInvoiceId") REFERENCES "sales_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "stock_ledgers" ADD CONSTRAINT "stock_ledgers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_ledgers" ADD CONSTRAINT "stock_ledgers_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "tenant_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_ledgers" ADD CONSTRAINT "stock_ledgers_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_ledgers" ADD CONSTRAINT "stock_ledgers_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_ledgers" ADD CONSTRAINT "stock_ledgers_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "medicine_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_ledgers" ADD CONSTRAINT "stock_ledgers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "sync_operations" ADD CONSTRAINT "sync_operations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sync_operations" ADD CONSTRAINT "sync_operations_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "tenant_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sync_operations" ADD CONSTRAINT "sync_operations_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sync_operations" ADD CONSTRAINT "sync_operations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cash_bank_accounts" ADD CONSTRAINT "cash_bank_accounts_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "tenant_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cash_bank_transactions" ADD CONSTRAINT "cash_bank_transactions_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "tenant_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cash_bank_transactions" ADD CONSTRAINT "cash_bank_transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "cash_bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cash_bank_transactions" ADD CONSTRAINT "cash_bank_transactions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "bank_statement_entries" ADD CONSTRAINT "bank_statement_entries_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "tenant_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bank_statement_entries" ADD CONSTRAINT "bank_statement_entries_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "cash_bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bank_statement_entries" ADD CONSTRAINT "bank_statement_entries_matchedTransactionId_fkey" FOREIGN KEY ("matchedTransactionId") REFERENCES "cash_bank_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bank_statement_entries" ADD CONSTRAINT "bank_statement_entries_matchedById_fkey" FOREIGN KEY ("matchedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "daily_cash_closings" ADD CONSTRAINT "daily_cash_closings_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "tenant_stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "daily_cash_closings" ADD CONSTRAINT "daily_cash_closings_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "cash_bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "daily_cash_closings" ADD CONSTRAINT "daily_cash_closings_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

