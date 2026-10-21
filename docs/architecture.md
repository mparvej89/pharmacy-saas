# System Architecture: Pharmacy Billing & Stock Management SaaS

## 1. High-Level Architecture Overview

The system is designed as a secure, scalable multi-tenant SaaS for Indian retail and wholesale pharmacies, with desktop POS terminals, tablets, and mobile devices as target clients.

```
┌──────────────────────────────────────────────────────────────┐
│                    Client Layer                              │
│  Ionic Angular Standalone UI (POS Terminal, Mobile, Tablet) │
│  - Keyboard shortcuts, Barcode scanner, Receipt printing    │
│  - Reactive Forms, Ionic Design System, Offline-resilient   │
└──────────────────────────────┬───────────────────────────────┘
                               │ HTTPS (REST /api/v1 + JWT)
┌──────────────────────────────▼───────────────────────────────┐
│                    NestJS API Layer                          │
│  - Tenant Resolution Interceptor & Store Membership Guard    │
│  - Authentication & RBAC Guards (Super Admin, Owner, etc.)  │
│  - Rate Limiter, Helmet, CORS, Swagger Docs                  │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│                   Domain Engine Layer                        │
│  - POS Billing Engine (Atomic Transactions, Idempotency)     │
│  - FEFO Batch Allocation (First-Expiry, First-Out)           │
│  - Indian GST Engine (CGST + SGST or IGST based on state)    │
│  - Controlled Substances (Schedule H/H1/X tracking)          │
│  - Purchase & Goods Receipt with Free-Quantity Economics     │
│  - Controlled Returns & Quarantine Inspection Workflow       │
│  - Immutable Double-Entry Stock Movement Ledger              │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│                 Data Layer (PostgreSQL 18.6)                 │
│  - Prisma ORM with strict decimal precision (Decimal(12,2))  │
│  - Row-level store tenant isolation                          │
│  - Concurrency control & row locking (SELECT FOR UPDATE)     │
│  - Audit log journal for security & compliance               │
└──────────────────────────────────────────────────────────────┘
```

## 2. Multi-Tenant Model & Data Isolation

### Tenancy Strategy
- **Logical Store-Level Isolation**: Every transactional record (`Medicine`, `MedicineBatch`, `Supplier`, `Purchase`, `Sale`, `StockLedger`, `AuditLog`) belongs to a `StoreId`.
- **Tenant Resolution**:
  1. The authenticated user receives a signed JWT token containing `userId` and active `storeId`.
  2. For users associated with multiple stores (e.g. pharmacy chains), the active working session specifies the target store via an authorized store-switch endpoint.
  3. **Never trust client-supplied tenant ID**: The server derives and enforces the store ID directly from verified JWT claims and database membership validation.
  4. Cross-store queries are strictly barred at the repository/service layer.

## 3. Core Pharmacy Domain Engines

### A. FEFO Inventory Engine
- **First-Expiry, First-Out**: Medicines have distinct batches with unique batch numbers and expiry dates. When dispensing or billing, the algorithm automatically picks batches with the earliest expiry dates among sellable batches.
- **Stock Statuses**:
  - `AVAILABLE`: Eligible for sale.
  - `RESERVED`: Temporarily held for checkout in progress.
  - `DAMAGED` / `RECALLED` / `QUARANTINED`: Barred from dispensing.
  - `EXPIRED`: Filtered out automatically from billing.
- **Zero-Negative-Stock**: The inventory engine rejects any sale where eligible available stock is insufficient.
- **Immutable Stock Ledger**: Any quantity increment or decrement creates a permanent `StockLedgerEntry` row recording:
  - Timestamp, StoreId, MedicineId, BatchId, QuantityChange (+/-), BalanceAfter, MovementType (`PURCHASE_RECEIPT`, `SALE`, `SALE_RETURN`, `STOCK_ADJUSTMENT`, `DAMAGE_WRITE_OFF`), ReferenceType & Id, UserId, and Reason.

### B. Indian Pharmacy Regulations & GST Tax Engine
- **Drug Schedules**:
  - `SCHEDULE_H` & `SCHEDULE_H1`: Requires prescribing doctor's name, patient name, and prescription reference. H1 registers require separate daily register logging.
  - `SCHEDULE_X`: Strictest narcotic / psychotropic drugs requiring duplicate prescription retention.
  - `OTC`: Over-the-counter drugs requiring no prescription.
- **Indian GST (Goods and Services Tax)**:
  - Medicines classified with standard Indian HSN codes (e.g., `3004` for medicaments).
  - Tax rates supported: 0%, 5%, 12%, 18%, 28% (commonly 12% or 5% in pharma).
  - Intra-state sales: Split equally into **CGST** (Central GST) and **SGST** (State GST).
  - Inter-state sales: Assessed as **IGST** (Integrated GST).
  - Reverse calculation from MRP or forward addition from base selling price.
  - Free quantities from suppliers are treated with zero cost addition while correctly adjusting per-unit landed cost without corrupting tax liability.

### C. POS Atomic Transaction Engine
When an invoice is submitted:
1. **Idempotency Key Check**: Prevents double-charging or duplicate invoices upon rapid clicking or network retries.
2. **Lock Rows**: Target `MedicineBatch` rows are locked in PostgreSQL transaction (`FOR UPDATE`).
3. **Validate Availability**: Ensure unexpired, undamaged stock >= requested quantity.
4. **Allocate FEFO**: Decrement available stock on batches.
5. **Ledger Entries**: Write immutable stock movements.
6. **Financials**: Calculate Base, Discount, CGST, SGST, Cess, Round-off, and Net Payable using exact decimal math.
7. **Payment**: Create payment records (`CASH`, `UPI`, `CARD`, `CREDIT`, or `SPLIT`).
8. **Commit**: Return invoice metadata for immediate thermal or laser receipt printing.

### D. Returns & Quarantine Inspection Workflow
- When a customer returns medicine, the stock is **not** immediately returned to sellable inventory.
- It is placed into `QUARANTINE_RETURN` status.
- An authorized pharmacist inspects the batch (unopened seal, valid strip condition, not expired) and signs off an inspection log to transition stock to `AVAILABLE` or `DAMAGED_DISPOSAL`.

## 4. Security & Role-Based Access Control (RBAC)

| Role | Permissions |
|---|---|
| **SaaS Super Admin** | Platform-level tenant onboarding, platform analytics, global audit |
| **Pharmacy Owner / Admin** | Full store control, financial reports, user management, tax configuration |
| **Pharmacist** | Dispensing, prescription verification, stock adjustments, supplier receiving |
| **Inventory Manager** | Purchase order creation, goods receipt, batch tracking, expiry management |
| **Billing Operator** | Fast POS billing, customer lookup, reprint invoice; no stock adjustments or price tampering |

## 5. Technology Standards
- **Backend**: NestJS, TypeScript strict mode, Prisma ORM, Class-Validator, Swagger OpenAPI.
- **Frontend**: Ionic 9 + Angular 19/20 standalone components, Ionicons, Reactive Forms, SCSS design tokens, thermal receipt print formatter.
- **Database**: PostgreSQL 18.6 with B-Tree indexes on `[storeId, barcode]`, `[storeId, medicineId, expiryDate]`, and unique composite keys.
