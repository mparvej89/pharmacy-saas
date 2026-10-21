# Database Schema Design: Pharmacy SaaS

PostgreSQL 18.6 Schema Definition using Prisma ORM.

## Entity Relationship Overview

```
[Store] ───< [UserStoreRole] >─── [User]
   │
   ├───< [Medicine] ───< [MedicineBatch] ───< [StockLedgerEntry]
   │         │                   │
   │         │                   ├───< [PurchaseItem] >─── [Purchase] >─── [Supplier]
   │         │                   │
   │         │                   └───< [SaleItem] >─── [Sale] >─── [Customer]
   │         │                                           │
   │         │                                           ├───< [Payment]
   │         │                                           │
   │         │                                           └───< [SaleReturn]
   │         └───< [StockAdjustment]
   │
   └───< [AuditLog]
```

## Tables & Models Specification

### 1. Tenancy & Access Control
- **`TenantStore`**:
  - `id` (UUID PK)
  - `name` (VARCHAR)
  - `code` (VARCHAR unique)
  - `drugLicenseNumber` (VARCHAR)
  - `gstin` (VARCHAR 15-char Indian GSTIN)
  - `address`, `city`, `state`, `pincode`, `phone`, `email`
  - `currency` (DEFAULT 'INR')
  - `stateCode` (2-digit GST state code, e.g. '27' for MH, '07' for DL, '19' for WB)
  - `isActive` (BOOLEAN)
  - `createdAt`, `updatedAt`

- **`User`**:
  - `id` (UUID PK)
  - `email` (VARCHAR unique)
  - `passwordHash` (VARCHAR)
  - `fullName` (VARCHAR)
  - `phone` (VARCHAR)
  - `isActive` (BOOLEAN)
  - `createdAt`, `updatedAt`

- **`UserStoreRole`**:
  - `id` (UUID PK)
  - `userId` (FK User)
  - `storeId` (FK TenantStore)
  - `role` (ENUM: `SUPER_ADMIN`, `STORE_OWNER`, `PHARMACIST`, `BILLING_OPERATOR`, `INVENTORY_MANAGER`)
  - Composite unique: `[userId, storeId]`

### 2. Medicine Catalogue & Batches
- **`Medicine`**:
  - `id` (UUID PK)
  - `storeId` (FK TenantStore)
  - `name` (VARCHAR)
  - `genericName` (VARCHAR)
  - `brandName` (VARCHAR)
  - `manufacturer` (VARCHAR)
  - `composition` (VARCHAR)
  - `dosageForm` (ENUM: `TABLET`, `CAPSULE`, `SYRUP`, `INJECTION`, `OINTMENT`, `DROPS`, `POWDER`, `INHALER`, `OTHER`)
  - `packSize` (INT, e.g., 10 for 10-tablets strip)
  - `unitOfMeasure` (VARCHAR, e.g., 'STRIP', 'BOTTLE', 'VIAL')
  - `hsnCode` (VARCHAR DEFAULT '3004')
  - `gstRate` (DECIMAL(5,2) DEFAULT 12.00)
  - `prescriptionCategory` (ENUM: `OTC`, `SCHEDULE_H`, `SCHEDULE_H1`, `SCHEDULE_X`)
  - `barcode` (VARCHAR optional indexed)
  - `sku` (VARCHAR optional)
  - `reorderLevel` (INT DEFAULT 20)
  - `purchaseCost` (DECIMAL(12,2))
  - `sellingPrice` (DECIMAL(12,2))
  - `mrp` (DECIMAL(12,2))
  - `isActive` (BOOLEAN DEFAULT true)
  - Indexes: `[storeId, barcode]`, `[storeId, name]`, `[storeId, genericName]`

- **`MedicineBatch`**:
  - `id` (UUID PK)
  - `storeId` (FK TenantStore)
  - `medicineId` (FK Medicine)
  - `batchNumber` (VARCHAR)
  - `expiryDate` (DATE)
  - `manufacturingDate` (DATE optional)
  - `quantityAvailable` (INT DEFAULT 0, CHECK >= 0)
  - `quantityReserved` (INT DEFAULT 0, CHECK >= 0)
  - `quantityDamaged` (INT DEFAULT 0, CHECK >= 0)
  - `quantityQuarantined` (INT DEFAULT 0, CHECK >= 0)
  - `mrp` (DECIMAL(12,2))
  - `purchasePrice` (DECIMAL(12,2))
  - `sellingPrice` (DECIMAL(12,2))
  - `rackLocation` (VARCHAR optional)
  - `status` (ENUM: `ACTIVE`, `QUARANTINED`, `EXPIRED`, `DEPLETED`, `RECALLED`)
  - Composite unique: `[storeId, medicineId, batchNumber]`
  - Indexes: `[storeId, medicineId, expiryDate]` (for FEFO query optimization)

### 3. Suppliers & Purchases
- **`Supplier`**:
  - `id` (UUID PK)
  - `storeId` (FK TenantStore)
  - `name` (VARCHAR)
  - `contactPerson` (VARCHAR)
  - `phone` (VARCHAR)
  - `email` (VARCHAR)
  - `gstin` (VARCHAR)
  - `dlNumber` (VARCHAR)
  - `address`, `city`, `state`, `pincode`
  - `paymentTermsDays` (INT DEFAULT 30)
  - `outstandingBalance` (DECIMAL(14,2) DEFAULT 0.00)
  - `isActive` (BOOLEAN DEFAULT true)

- **`Purchase`**:
  - `id` (UUID PK)
  - `storeId` (FK TenantStore)
  - `supplierId` (FK Supplier)
  - `purchaseNumber` (VARCHAR unique per store)
  - `supplierInvoiceNumber` (VARCHAR)
  - `supplierInvoiceDate` (DATE)
  - `status` (ENUM: `DRAFT`, `POSTED`, `CANCELLED`)
  - `subtotal` (DECIMAL(14,2))
  - `discountAmount` (DECIMAL(14,2) DEFAULT 0.00)
  - `taxAmount` (DECIMAL(14,2) DEFAULT 0.00)
  - `totalAmount` (DECIMAL(14,2))
  - `notes` (TEXT)
  - `postedAt` (TIMESTAMP)
  - `postedBy` (FK User)
  - Unique: `[storeId, supplierId, supplierInvoiceNumber]` (prevents double posting)

- **`PurchaseItem`**:
  - `id` (UUID PK)
  - `purchaseId` (FK Purchase)
  - `medicineId` (FK Medicine)
  - `batchNumber` (VARCHAR)
  - `expiryDate` (DATE)
  - `quantity` (INT)
  - `freeQuantity` (INT DEFAULT 0)
  - `purchaseRate` (DECIMAL(12,2))
  - `discountPercent` (DECIMAL(5,2) DEFAULT 0.00)
  - `gstRate` (DECIMAL(5,2))
  - `taxAmount` (DECIMAL(12,2))
  - `netAmount` (DECIMAL(12,2))
  - `mrp` (DECIMAL(12,2))
  - `sellingPrice` (DECIMAL(12,2))

### 4. POS Sales & Billing
- **`Customer`**:
  - `id` (UUID PK)
  - `storeId` (FK TenantStore)
  - `name` (VARCHAR)
  - `phone` (VARCHAR)
  - `email` (VARCHAR)
  - `doctorName` (VARCHAR optional)
  - `doctorRegNo` (VARCHAR optional)

- **`Sale`**:
  - `id` (UUID PK)
  - `storeId` (FK TenantStore)
  - `invoiceNumber` (VARCHAR unique per store)
  - `customerId` (FK Customer optional)
  - `idempotencyKey` (VARCHAR unique)
  - `saleDate` (TIMESTAMP DEFAULT NOW())
  - `doctorName` (VARCHAR)
  - `doctorRegNo` (VARCHAR)
  - `patientName` (VARCHAR)
  - `subtotal` (DECIMAL(14,2))
  - `itemDiscountTotal` (DECIMAL(14,2) DEFAULT 0.00)
  - `billDiscountPercent` (DECIMAL(5,2) DEFAULT 0.00)
  - `billDiscountAmount` (DECIMAL(14,2) DEFAULT 0.00)
  - `taxableAmount` (DECIMAL(14,2))
  - `cgstAmount` (DECIMAL(14,2) DEFAULT 0.00)
  - `sgstAmount` (DECIMAL(14,2) DEFAULT 0.00)
  - `igstAmount` (DECIMAL(14,2) DEFAULT 0.00)
  - `totalTax` (DECIMAL(14,2))
  - `roundOff` (DECIMAL(5,2) DEFAULT 0.00)
  - `grandTotal` (DECIMAL(14,2))
  - `paidAmount` (DECIMAL(14,2))
  - `changeAmount` (DECIMAL(14,2) DEFAULT 0.00)
  - `paymentStatus` (ENUM: `PAID`, `PARTIAL`, `UNPAID`)
  - `status` (ENUM: `COMPLETED`, `RETURNED_PARTIAL`, `RETURNED_FULL`, `CANCELLED`)
  - `cashierId` (FK User)
  - `notes` (VARCHAR)

- **`SaleItem`**:
  - `id` (UUID PK)
  - `saleId` (FK Sale)
  - `medicineId` (FK Medicine)
  - `batchId` (FK MedicineBatch)
  - `quantity` (INT CHECK > 0)
  - `unitPrice` (DECIMAL(12,2))
  - `mrp` (DECIMAL(12,2))
  - `discountPercent` (DECIMAL(5,2) DEFAULT 0.00)
  - `discountAmount` (DECIMAL(12,2) DEFAULT 0.00)
  - `taxableAmount` (DECIMAL(12,2))
  - `gstRate` (DECIMAL(5,2))
  - `cgstAmount` (DECIMAL(12,2))
  - `sgstAmount` (DECIMAL(12,2))
  - `igstAmount` (DECIMAL(12,2))
  - `totalAmount` (DECIMAL(12,2))
  - `returnedQuantity` (INT DEFAULT 0)

- **`Payment`**:
  - `id` (UUID PK)
  - `storeId` (FK TenantStore)
  - `saleId` (FK Sale)
  - `paymentMethod` (ENUM: `CASH`, `UPI`, `CARD`, `CREDIT`, `CHEQUE`)
  - `amount` (DECIMAL(14,2))
  - `referenceNumber` (VARCHAR optional, e.g. UPI txn ID)
  - `receivedAt` (TIMESTAMP DEFAULT NOW())

### 5. Returns, Adjustments, and Stock Movements
- **`SaleReturn`**:
  - `id` (UUID PK)
  - `storeId` (FK TenantStore)
  - `saleId` (FK Sale)
  - `returnNumber` (VARCHAR unique per store)
  - `returnDate` (TIMESTAMP DEFAULT NOW())
  - `reason` (VARCHAR)
  - `totalRefundAmount` (DECIMAL(14,2))
  - `refundMethod` (ENUM: `CASH`, `UPI`, `CREDIT_NOTE`)
  - `processedBy` (FK User)

- **`SaleReturnItem`**:
  - `id` (UUID PK)
  - `saleReturnId` (FK SaleReturn)
  - `saleItemId` (FK SaleItem)
  - `batchId` (FK MedicineBatch)
  - `quantityReturned` (INT)
  - `refundAmount` (DECIMAL(12,2))
  - `initialStockDisposition` (ENUM: `QUARANTINE_FOR_INSPECTION`, `DAMAGED_DISPOSAL`)
  - `isInspected` (BOOLEAN DEFAULT false)
  - `inspectionNotes` (VARCHAR)

- **`StockLedgerEntry`**:
  - `id` (UUID PK)
  - `storeId` (FK TenantStore)
  - `medicineId` (FK Medicine)
  - `batchId` (FK MedicineBatch)
  - `movementType` (ENUM: `PURCHASE_RECEIPT`, `SALE`, `SALE_RETURN`, `STOCK_ADJUSTMENT`, `DAMAGE_WRITE_OFF`, `QUARANTINE_TRANSFER`)
  - `quantityChange` (INT) -- positive or negative
  - `balanceAfter` (INT)
  - `referenceType` (VARCHAR) -- 'PURCHASE', 'SALE', 'RETURN', 'ADJUSTMENT'
  - `referenceId` (UUID)
  - `userId` (FK User)
  - `notes` (VARCHAR)
  - `createdAt` (TIMESTAMP DEFAULT NOW())
  - Immutable: No UPDATE or DELETE allowed.

- **`StockAdjustment`**:
  - `id` (UUID PK)
  - `storeId` (FK TenantStore)
  - `medicineId` (FK Medicine)
  - `batchId` (FK MedicineBatch)
  - `adjustmentType` (ENUM: `INCREASE`, `DECREASE`, `PHYSICAL_COUNT_VARIANCE`, `DAMAGE`)
  - `previousQuantity` (INT)
  - `adjustedQuantity` (INT)
  - `variance` (INT)
  - `reason` (VARCHAR NOT NULL)
  - `performedBy` (FK User)
  - `createdAt` (TIMESTAMP DEFAULT NOW())

- **`AuditLog`**:
  - `id` (UUID PK)
  - `storeId` (FK TenantStore optional for superadmin)
  - `userId` (FK User optional)
  - `action` (VARCHAR)
  - `entityName` (VARCHAR)
  - `entityId` (VARCHAR)
  - `oldValues` (JSONB)
  - `newValues` (JSONB)
  - `ipAddress` (VARCHAR)
  - `userAgent` (VARCHAR)
  - `timestamp` (TIMESTAMP DEFAULT NOW())
