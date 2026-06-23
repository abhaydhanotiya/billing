# @sanskar/desktop

Electron + React + TypeScript client for Sanskar Palace.

## What's inside

- **Login** with server-address configuration + live reachability check.
- **Dashboard** — room-status board and today's occupancy / sales / GST stats.
- **New Bill** — the core flow: room/food/other lines, quick-add from rooms & menu,
  per-line and bill-level discounts, round-off, and a **live GST preview** computed by the
  same `@sanskar/shared` engine the server uses (so the preview matches the saved bill).
- **Invoices** — list with status filters; a print-ready A4 tax-invoice document with
  finalize / void / record-payment actions and native printing.
- **Masters** — rooms (live status), restaurant menu, guest directory.
- **Reports** — GST summary by rate + sales totals over a date range.
- **Settings** — server address + business profile (admin).

Design: warm "palace" hospitality theme, serif display + tabular monospace numerals,
role-aware navigation (ADMIN / RECEPTION / RESTAURANT).

## Architecture

- `electron/main.ts` — main process (window, native print / print-to-PDF over IPC).
- `electron/preload.ts` — minimal context-isolated bridge (`window.desktop`).
- `src/` — React renderer (Vite). Talks to the API over HTTP; the JWT and the server
  URL are stored in `localStorage`, so each client PC points at the server PC's LAN IP.

## Develop

One command runs the whole live-reload loop — Vite renderer (hot module reload),
esbuild watch on the main process, and Electron (auto-restarts when main/preload change):

```bash
pnpm install                          # from repo root
pnpm --filter @sanskar/desktop dev    # Vite + esbuild watch + Electron
```

Edit anything under `src/` and the window hot-updates; edit `electron/` and Electron
restarts automatically. Closing the window stops the dev session.

(The server package must be running and reachable for data to load — or run both at
once from the repo root with `pnpm dev`.)

## Build & package

```bash
pnpm --filter @sanskar/desktop build     # dist/ (renderer) + dist-electron/ (main)
pnpm --filter @sanskar/desktop dist      # Windows .exe installer via electron-builder
```

> The renderer imports `@sanskar/shared` from source; Vite bundles it, so no separate
> build step is needed for the shared package when building the desktop app.
