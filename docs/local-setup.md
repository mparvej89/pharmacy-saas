# Local Development & Neon PostgreSQL Setup Guide

Follow these instructions to run the Pharmacy Billing & Stock Management SaaS with your **Neon PostgreSQL (`pharmacy_db`)** database or local Docker environment.

## Prerequisites
- **Node.js**: v22.x (Verified: `v22.22.3`)
- **npm**: 10.x (Verified: `10.9.8`)
- **Database**: Neon PostgreSQL (`pharmacy_db`) over TLS, or local PostgreSQL

## 1. Environment Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. In `.env`, configure `DATABASE_URL` with your Neon PostgreSQL connection string for `pharmacy_db`:
   ```env
   DATABASE_URL="postgresql://DB_USER:DB_PASSWORD@ep-your-project-pooler.region.aws.neon.tech/pharmacy_db?sslmode=require&connect_timeout=15&pool_timeout=15&connection_limit=10"
   PORT=3000
   NODE_ENV=development
   JWT_SECRET="replace-with-a-strong-random-jwt-secret-in-production"
   JWT_EXPIRES_IN="7d"
   CORS_ORIGIN="http://localhost:4200,http://localhost:8100"
   ```
   *Note: Never commit `.env` or real database credentials to Git.*

## 2. Install Dependencies

From the repository root:
```bash
npm install
```

## 3. Database Migration & Seeding (Non-Destructive)

Generate the Prisma Client:
```bash
npm run db:generate
```

Apply pending Prisma migrations safely to `pharmacy_db` on Neon:
```bash
npm run db:deploy
# Or during local schema development:
npm run db:migrate
```

Seed initial tenant, store, staff roles, medicines, barcodes, batches, and supplier records:
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
- Database Health Check: `http://localhost:3000/api/v1/health` (and `/api/v1/health/db`)
- Swagger OpenAPI Documentation: `http://localhost:3000/api/docs`

### Start with Docker Compose
```bash
docker compose up --build
```

### Start the Ionic Angular Frontend (`apps/web`)
```bash
npm run start:web
```
- Web Application: `http://localhost:4200` (or `http://localhost:8100`)

## 5. Verification & Testing

- Run backend automated unit tests:
  ```bash
  npm run test:api
  ```
- Run frontend unit tests:
  ```bash
  npm run test:web
  ```
