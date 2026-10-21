# Local Development Setup Guide

Follow these instructions to run the Pharmacy Billing & Stock Management SaaS on macOS with your local PostgreSQL 18.6 installation.

## Prerequisites
- **Node.js**: v22.x (Verified: `v22.22.3`)
- **npm**: 10.x (Verified: `10.9.8`)
- **PostgreSQL**: 18.6 running locally on port 5000 (Path: `/Library/PostgreSQL/18/`)

## 1. Environment Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. In `.env`, ensure the `DATABASE_URL` is configured:
   ```env
   DATABASE_URL="postgresql://pharmacy_app:YOUR_ACTUAL_PASSWORD@localhost:5000/pharmacy_dev"
   PORT=3000
   NODE_ENV=development
   JWT_SECRET="pharmacy-jwt-secret-dev-2026"
   JWT_EXPIRES_IN="7d"
   CORS_ORIGIN="http://localhost:4200,http://localhost:8100"
   ```
   *Note: Ensure the password is URL-encoded if it contains special characters.*

## 2. Install Dependencies

From the repository root:
```bash
npm install
```

## 3. Database Migration & Seeding

Run the Prisma migrations against your local PostgreSQL 18.6 instance:
```bash
npm run db:migrate
```

Generate Prisma client:
```bash
npm run db:generate
```

Seed initial store, admin user, pharmacist, medicines, batches, and supplier records:
```bash
npm run db:seed
```

### Seed Accounts Created
- **Pharmacy Admin / Owner**:
  - Email: `admin@apollopharmacy.local`
  - Password: `Password@123`
- **Pharmacist**:
  - Email: `pharmacist@apollopharmacy.local`
  - Password: `Password@123`
- **Billing Cashier**:
  - Email: `cashier@apollopharmacy.local`
  - Password: `Password@123`

## 4. Running the Development Servers

### Start the NestJS Backend (`apps/api`)
```bash
npm run start:api
```
- API Base URL: `http://localhost:3000/api/v1`
- Swagger OpenAPI Documentation: `http://localhost:3000/api/docs`

### Start the Ionic Angular Frontend (`apps/web`)
```bash
npm run start:web
```
- Web Application: `http://localhost:4200` (or `http://localhost:8100`)

## 5. Verification & Testing

- Run backend automated tests:
  ```bash
  npm run test:api
  ```
- Run frontend unit tests:
  ```bash
  npm run test:web
  ```
