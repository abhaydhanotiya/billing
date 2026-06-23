# Sanskar Palace — Billing & Management Software

Windows desktop billing software for Sanskar Palace resort. GST-compliant and non-GST bills
covering room, food, and other services, plus bookings/check-in, masters, reports, and history.

See [`../REQUIREMENTS.md`](../REQUIREMENTS.md) and
[`../TECHNICAL_REQUIREMENTS.md`](../TECHNICAL_REQUIREMENTS.md) for the full spec.

## Structure (pnpm monorepo)

| Package | What it is |
|---------|-----------|
| `packages/shared` | Shared TypeScript types + the **GST calculation engine** (with tests). |
| `packages/server` | Fastify REST API + Prisma + PostgreSQL. Runs on the "server" PC. |
| `packages/desktop` | Electron + React + Vite desktop client. Runs on each billing PC. |

## Architecture

One PC runs `server` (API) + PostgreSQL. Each PC runs the `desktop` client, which talks to the
server over the LAN. Single-PC setups run both on one machine.

## Getting started (development)

```bash
pnpm install
# 1. configure packages/server/.env with your PostgreSQL DATABASE_URL
pnpm db:migrate        # create the schema
pnpm db:seed           # load demo masters (rooms, menu, tax rates)
pnpm dev:server        # start the API
pnpm dev:desktop       # start the Electron client
```

## Status

Phase 1 (core billing) — in progress.
