# @sanskar/server

Fastify + Prisma + PostgreSQL API for Sanskar Palace billing.

## What it does

- Per-user login (Argon2id PIN/password) issuing JWT sessions, with ADMIN / RECEPTION / RESTAURANT roles.
- Rooms & room types, restaurant menu, guests, stays (check-in/out), restaurant orders.
- Invoices computed by the shared GST engine, **gap-free FY-series numbering** (`SP/2026-27/0001`)
  assigned atomically on finalize. Finalized invoices are immutable; corrections go through VOID.
- Payments + outstanding-balance lookup.
- GST summary and sales reports over a date range.
- Audit log of sensitive actions (login, finalize, void).

All money is stored as integer **paise** (`BigInt`) and serialized to JSON as a number.

## Prerequisites

- Node.js 20+
- PostgreSQL 16 reachable via `DATABASE_URL`

## Setup

```bash
cp .env.example .env          # then edit DATABASE_URL + JWT_SECRET
pnpm install                  # from the repo root
pnpm prisma:generate          # generate the Prisma client
pnpm prisma:migrate           # create the schema (dev)
pnpm seed                     # business profile + admin/1234 + sample data
pnpm dev                      # start with hot reload on :4000
```

Health check: `GET /health`. All API routes are under `/api` and (except `/api/auth/login`)
require a `Authorization: Bearer <token>` header.

## Tests

```bash
pnpm test    # fiscal-year + invoice-number unit tests
```

> Note: PostgreSQL must be running before `prisma migrate`, `seed`, or `dev`. The pure
> logic (GST math, fiscal-year numbering) is unit-tested without a database.
