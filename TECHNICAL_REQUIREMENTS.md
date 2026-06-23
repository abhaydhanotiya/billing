# Sanskar Palace — Technical Requirements

**Companion to REQUIREMENTS.md** — Version 0.1, 2026-06-12

This document lists everything needed (hardware, software, network, and the technology the app
is built with) to develop, run, and deploy the resort billing software on 2–5 networked PCs.

---

## 1. Technology Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Desktop client** | Electron + React + TypeScript | Modern UI, easy printing/PDF, same look on every PC, easy to update. |
| **Backend / API** | Node.js (Fastify) + TypeScript | Lightweight local service; handles business logic, GST math, invoice numbering. |
| **Database** | PostgreSQL 16 | Safe concurrent billing for 2–5 users; transactions; gap-free invoice sequences. |
| **ORM / DB access** | Prisma (or Knex) | Typed schema, migrations, fewer bugs. |
| **PDF / printing** | HTML invoice template → Electron print / PDF | A4 + 80mm thermal from one template. |
| **Reports export** | CSV / XLSX (SheetJS) | Hand off to the accountant. |
| **Packaging** | electron-builder | Produces a Windows `.exe` installer. |
| **Local network** | TCP over LAN/Wi-Fi | Clients reach the server PC's API + database. |

> Alternative if you prefer a single fully-native install: **.NET 8 (WPF) + PostgreSQL**. Same
> features; I recommend the Electron/Node/PostgreSQL stack for faster development and easier updates.

---

## 2. Architecture (how the pieces talk)

```
   Client PC (Electron app)
        │  HTTPS/HTTP over LAN (REST API)
        ▼
   Server PC ──► Node API service ──► PostgreSQL database
                     │
                     └─► daily backup files
```

- **One PC = "server"**: runs PostgreSQL + the Node API service (both as background Windows services).
- **Every PC** (including the server) runs the **Electron client**, which talks to the API by the
  server's LAN IP (e.g. `http://192.168.1.10:4000`).
- **Single-PC mode:** server + client on the same machine; no network involved.

---

## 3. Hardware Requirements

### 3.1 Server PC (the always-on machine that holds the data)
| | Minimum | Recommended |
|--|--|--|
| OS | Windows 10 64-bit | Windows 11 64-bit |
| CPU | Dual-core | Quad-core (i3/Ryzen 3 or better) |
| RAM | 4 GB | 8 GB |
| Storage | 128 GB SSD | 256 GB SSD |
| Power | — | **UPS** (so billing/DB isn't corrupted on power cut) |
| Backup target | — | External USB drive or cloud-synced folder |

### 3.2 Client PCs (reception, restaurant, manager)
| | Minimum | Recommended |
|--|--|--|
| OS | Windows 10 64-bit | Windows 11 64-bit |
| RAM | 4 GB | 8 GB |
| Storage | 5 GB free | SSD |
| Display | 1366×768 | 1920×1080 |

### 3.3 Peripherals
- **A4 printer** (laser/inkjet) for full GST tax invoices.
- **80mm thermal printer** (optional) for quick food/cash receipts — ESC/POS compatible.
- Optional: barcode/ID scanner, cash drawer (phase 4).

---

## 4. Network Requirements

- All PCs on the **same LAN / Wi-Fi** (one router/switch).
- **Server PC should have a static (or DHCP-reserved) local IP** so clients always find it.
- Open firewall ports on the server for the API and PostgreSQL (e.g. **4000** API, **5432** DB) on the **local network only** — not exposed to the internet.
- Wired Ethernet recommended for the server PC for reliability; Wi-Fi is fine for clients.
- **Internet is NOT required** for the app to run (only for optional cloud backup or future e-invoicing).

---

## 5. Software / Runtime Dependencies

### On the server PC
- PostgreSQL 16 (installed as a Windows service).
- Node.js LTS runtime (bundled with the API service, or installed).
- The API service registered to **auto-start on boot** (e.g. via NSSM / Windows service).

### On client PCs
- Just the **Sanskar Palace client installer** (`.exe`). Electron bundles its own runtime — no separate installs needed.

### For development (my side)
- Node.js LTS, npm/pnpm, PostgreSQL, Git, VS Code, electron-builder.

---

## 6. Data, Backup & Recovery

- **Automatic daily backup** of the PostgreSQL database to a local folder (`pg_dump`).
- **Second copy** to USB drive and/or a cloud-synced folder (Google Drive/OneDrive) — configurable.
- **Retention:** keep last N daily backups (e.g. 30) + monthly snapshots.
- **One-click restore** from a backup file.
- **UPS** on the server PC to avoid corruption during power cuts.
- Backups should be tested periodically (restore drill).

---

## 7. Security & Integrity

- **Per-user login** (username + PIN/password, hashed — never stored in plain text).
- **Role-based permissions** (Admin / Reception / Restaurant) — discounts, voids, settings restricted.
- **Audit log** of sensitive actions (void, edit finalized bill, discount, refund) with user + timestamp.
- **Invoice integrity:** sequential, gap-free numbering per FY series; finalized invoices are immutable (corrections via void/credit, not silent edits).
- Database and API reachable only on the **local network**, not the public internet.
- All amounts computed in integer paise / fixed-decimal to avoid floating-point rounding errors.

---

## 8. GST Calculation Rules (technical)

- Tax rate is **per line item** (from the room type / menu item / service master) — never hard-coded.
- Intra-state supply → split into **CGST = rate/2** and **SGST = rate/2**.
- Compute taxable value after line discount, then tax, then sum; bill-level **round-off** to nearest rupee with a round-off line.
- Store on each bill: subtotal, total discount, total CGST, total SGST, round-off, grand total, **amount in words**.
- Separate numbering series for **GST** vs **non-GST** bills.
- HSN/SAC stored per line for the GST report (grouped by rate and by HSN/SAC for filing prep).

---

## 9. Performance & Scale Targets

- Supports **2–5 concurrent users** comfortably (architecture scales further if needed).
- Bill creation, save, and print feel **instant** (< 1–2 seconds) on recommended hardware.
- Designed for a single resort property; data volume (bills, bookings) over years stays well within PostgreSQL's easy range.

---

## 10. Deployment & Maintenance

- **Installer (`.exe`)** for client PCs via electron-builder.
- Server setup: install PostgreSQL, deploy API service, run database migrations, configure backup.
- **Updates:** new client version distributed as an installer (or auto-update channel later).
- **Config file** per client holds the server's IP/port.
- Setup checklist + short staff training during Phase 4 deployment.

---

## 11. What I Need From You (technical setup inputs)

1. **Server PC** — which computer is usually on and will hold the database? Its specs?
2. **Network** — single router/Wi-Fi for all billing PCs? Can we set a static local IP on the server?
3. **Printers** — A4 model, and whether you want an 80mm thermal (which model)?
4. **Backup destination** — USB drive, or a cloud-synced folder (which one)?
5. **Stack confirmation** — Electron + Node + PostgreSQL (recommended) or .NET?
6. Number of client PCs and where (reception / restaurant / manager office).

---

*Once §11 is confirmed, I'll finalize the dev environment and begin Phase 1 (core billing).*
