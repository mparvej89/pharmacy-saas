#!/usr/bin/env bash
set -e

echo "=== Pharmacy SaaS Local Setup ==="

if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "Please update DATABASE_URL in .env with your local PostgreSQL password."
  fi
fi

echo "1. Generating Prisma Client..."
npm --workspace=apps/api run prisma:generate

echo "2. Building NestJS API..."
npm --workspace=apps/api run build

echo "3. Building Ionic Angular Frontend..."
npm --workspace=apps/web run build

echo "4. Running backend unit tests..."
npm --workspace=apps/api run test

echo "=== Build and validation completed successfully ==="
