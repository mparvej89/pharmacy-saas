# Pharmacy Billing & Stock Management SaaS (India)

A production-minded, multi-tenant Pharmacy Management and Point of Sale (POS) application tailored for Indian retail and wholesale pharmacies.

## Key Features
- **Strict Tenant Isolation**: Store-level data segregation validated server-side from JWT claims.
- **Indian GST Compliance**: Automated CGST, SGST, IGST tax breakdown, HSN classification, and printable tax invoices.
- **Drug Regulatory Classification**: Support for Schedule H, Schedule H1 (with daily dispensing register), and Schedule X controlled substances.
- **FEFO Inventory Engine**: First-Expiry, First-Out batch allocation, zero negative stock, quarantine inspection workflow for returns.
- **Atomic POS Checkout**: Concurrency-safe row locking (`FOR UPDATE`), idempotency key support, split payment options, thermal receipt formatting.
- **Double-Entry Stock Ledger**: Immutable historical audit trail for every purchase, sale, return, adjustment, and write-off.
- **Modern Tech Stack**: NestJS 11+, PostgreSQL 18.6, Prisma ORM, Ionic 9 + Angular standalone UI with keyboard-first POS terminal interactions.

## Architecture & Documentation
- [System Architecture](file:///Users/masudparvej/pharmacy-saas/docs/architecture.md)
- [Database Schema Design](file:///Users/masudparvej/pharmacy-saas/docs/database-schema.md)
- [REST API Endpoints](file:///Users/masudparvej/pharmacy-saas/docs/api-endpoints.md)
- [Local Development Setup](file:///Users/masudparvej/pharmacy-saas/docs/local-setup.md)

## Repository Layout
```
pharmacy-saas/
├── apps/
│   ├── api/          # NestJS REST API with Prisma ORM
│   └── web/          # Ionic Angular standalone application
├── docs/             # Technical architecture & specs
├── scripts/          # Helper setup scripts
├── .env.example      # Environment template
└── package.json      # Monorepo workspace configuration
```
