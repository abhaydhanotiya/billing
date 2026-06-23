# Sanskar Palace — Resort Billing & Management Software

**Requirements & Project Plan**
Version 0.1 — 2026-06-12

---

## 1. Overview

A Windows desktop application for **Sanskar Palace** to handle all billing and front-desk
operations for the resort. It produces **GST-compliant** and **non-GST** bills covering
**rooms, food, and other services**, and supports day-to-day operations: room booking and
check-in/check-out, menu & rate management, reporting, and per-room history.

### Goals
- Generate accurate, professional, **GST-compliant tax invoices** and simple non-GST bills.
- Let reception bill **room charges, food, and miscellaneous services** on a single guest folio.
- Run on **2–5 networked computers** (reception, restaurant, manager) sharing one set of data.
- Give the owner **daily and date-range reports** of revenue and GST collected.
- Keep a **history of every room** and every guest stay.

### Non-Goals (for now)
- Online/OTA booking integration (Booking.com, MakeMyTrip, etc.).
- E-invoicing / IRN generation via the government portal (can be added later if turnover requires it).
- Payroll, accounting ledgers, or full ERP. (We export data for the accountant instead.)

---

## 2. Users & Roles

| Role | Who | Can do |
|------|-----|--------|
| **Admin / Owner** | Owner / Manager | Everything: settings, rates, GST config, user management, all reports, void/edit bills, discounts. |
| **Reception** | Front desk staff | Create bookings, check-in/out, create & print bills, take payments. |
| **Restaurant** | Restaurant staff | Add food orders to a room folio or create a standalone food bill. |

> Each user logs in with a username + PIN/password. Actions like discounts, voids, and
> editing a finalized bill are restricted to Admin (or require an Admin override).

---

## 3. Functional Requirements

### 3.1 Billing (core)

- Create a **bill / invoice** containing multiple line items across categories:
  - **Room** — room charge per night × nights, room type, rate.
  - **Food** — items from the restaurant menu, qty × price.
  - **Other** — laundry, extra bed, pickup/drop, hall/banquet, damage, misc. (admin-definable list).
- Each line item carries: description, **HSN/SAC code**, quantity, unit price, discount, GST rate, taxable value, CGST, SGST, line total.
- Two bill modes:
  - **GST invoice** — full tax invoice with GSTIN, HSN/SAC, CGST/SGST breakup. (See §4.)
  - **Non-GST bill** — simple bill / estimate with no tax breakup (e.g. for B2C cash sales where no GST invoice is requested, or non-taxable items).
- **Guest folio**: all charges for a staying guest accumulate; a single final bill is generated at check-out. Food/other charges can be **posted to the room** during the stay.
- Discounts: per-line and/or bill-level (flat amount or %), Admin-controlled.
- **Rounding** of the final amount (round off to nearest rupee) with a round-off line.
- Multiple **payment modes**: Cash, UPI, Card, Bank transfer. Split payment supported. Track **advance/deposit** taken at check-in and adjust at final bill.
- **Print** to A4 and/or thermal (80mm) printer; **save as PDF**.
- Sequential, gap-free **invoice numbering** per financial year (e.g. `SP/2026-27/0001`), separate series for GST vs non-GST.
- Edit/void with audit trail (who, when, why). Voided numbers are retained, not reused.

### 3.2 Room Booking & Check-in

- **Room master**: room number, type (e.g. Standard / Deluxe / Suite), floor, max occupancy, base tariff.
- **Booking**: guest details (name, phone, address, ID type & number, GSTIN if business), check-in date, expected check-out, number of guests, room(s) assigned, advance paid.
- **Room status** board: Vacant / Occupied / Reserved / Cleaning / Maintenance.
- **Check-in** → marks room occupied, opens a folio.
- **Check-out** → generates final bill, settles payment, frees the room.
- Multiple rooms on one booking (group/family).

### 3.3 Menu & Inventory / Masters

- **Menu items**: name, category (food/beverage/etc.), price, SAC, GST rate, active/inactive.
- **Room types & tariffs**: base rate, GST slab (GST on rooms is rate-dependent — see §4.3).
- **Other services**: name, price, SAC, GST rate.
- **Tax rates** master (0%, 5%, 12%, 18%).
- Optional light **stock tracking** for food/bar items (phase 2): quantity on hand, low-stock alert. (Not full inventory accounting.)

### 3.4 Reports & Summaries

- **Daily summary**: total sales, by category (room/food/other), GST collected (CGST/SGST), payments by mode, number of bills, discounts given.
- **Date-range reports**: revenue, GST liability summary (for filing GSTR-1 / GSTR-3B prep), occupancy.
- **GST report**: taxable value and tax grouped by GST rate and by HSN/SAC — exportable to **Excel/CSV** for the accountant.
- **Room history**: every stay per room — guest, dates, amount, with search.
- **Guest history**: lookup a guest by phone/name to see past stays.
- **Outstanding/credit** report (unpaid or partially paid bills).

### 3.5 Settings

- Business profile: name, address, phone, **GSTIN**, state & state code, logo, invoice footer/terms.
- Invoice number formats and starting numbers.
- Printer settings (A4 / thermal), default copies.
- User management (add/disable users, set roles & PINs).
- Backup configuration (see §6).

---

## 4. GST Requirements (full compliance)

A valid **Tax Invoice** for Sanskar Palace will include:

- Supplier **name, address, GSTIN, state + state code**.
- Invoice **number** (consecutive, unique per FY series) and **date**.
- Recipient name; for B2B: recipient **GSTIN** and address (place of supply).
- **HSN/SAC** code per line item.
- Per item: taxable value, GST **rate**, **CGST** amount, **SGST** amount.
- (IGST is generally not needed — restaurant supply is intra-state. Field kept available for completeness.)
- **Total taxable value, total CGST, total SGST, grand total**, and **amount in words**.
- "Whether tax is payable on **reverse charge**" — No (default).
- Declaration / signature line.

### 4.1 Tax split
Intra-state supply → tax splits into **CGST + SGST** (e.g. 18% → 9% CGST + 9% SGST).

### 4.2 SAC / HSN codes (typical — to be confirmed with your accountant)
- **Accommodation (room)** — SAC `9963`.
- **Restaurant / food service** — SAC `9963` (restaurant service).
- **Other services** — relevant SAC per service.

### 4.3 GST rates — important note on rooms & restaurant
GST rates on hotel rooms and restaurant service depend on **room tariff and the
declared-tariff/registration rules**, and these rules change. The software will **not
hard-code** rates — instead, each room type / menu item / service carries its **own
configurable GST rate**, so you (with your accountant) set the correct slab and can update it
anytime. The app just applies whatever rate is configured.

> ⚠️ **Action for you:** confirm with your CA the exact GST rates to apply to room tariffs and
> restaurant food at Sanskar Palace, and the correct SAC/HSN codes. We'll enter those into the
> masters during setup.

---

## 5. Architecture & Technology

### 5.1 Shape of the system
Because 2–5 computers must **share the same data**, the design is:

- **One PC acts as the "server"** (e.g. the reception/manager PC that's usually on). It runs the
  **database** and a small **local API service**.
- **Each computer** runs the **desktop client app**, connecting to the server over the local
  network (Wi-Fi/LAN).
- If you only ever use one PC, the server and client run on the same machine — no network needed.

```
 ┌───────────────┐     LAN      ┌───────────────┐
 │  Reception PC │◄────────────►│  Restaurant PC │
 │  (client)     │              │  (client)      │
 └──────┬────────┘              └───────────────┘
        │ also hosts
        ▼
 ┌───────────────────────────┐
 │  Server PC                │
 │  • Database (PostgreSQL)  │
 │  • Local API service      │
 └───────────────────────────┘
```

### 5.2 Recommended stack
- **Desktop client:** Electron + React + TypeScript (modern UI, easy printing/PDF, cross-PC consistent).
- **Backend API:** Node.js (Fastify) on the server PC.
- **Database:** PostgreSQL (handles 2–5 concurrent users reliably; gap-free invoice numbering, transactions).
- **PDF/printing:** HTML invoice template → print to A4 or 80mm thermal, or export PDF.
- **Reports export:** CSV/Excel.

*Alternative if you prefer a single self-contained install over a network setup:* a .NET (WPF)
app with PostgreSQL — same capabilities. I recommend the Electron + Node + PostgreSQL stack for
speed of development and easy updates, but I'll confirm with you before building.

### 5.3 Why not a single-file/SQLite-only app?
SQLite is great for one machine but weak for several PCs writing at once over a network.
PostgreSQL on the server PC gives safe concurrent billing and correct invoice number sequencing.

---

## 6. Non-Functional Requirements

- **Reliability:** a bill must never be lost; finalizing a bill is a single safe transaction.
- **Invoice integrity:** numbers are sequential and never reused; finalized invoices are immutable (changes go through credit/void with audit trail).
- **Backups:** automatic **daily database backup** to a local folder + optional copy to a USB/second drive or cloud folder. One-click restore.
- **Security:** login per user, role-based permissions, audit log of sensitive actions.
- **Performance:** bill creation and printing feel instant on typical resort PCs.
- **Usability:** fast keyboard-friendly billing screen; minimal clicks for a common check-out.
- **Data ownership:** all data stays on your hardware (no mandatory cloud).
- **Localisation:** ₹ currency, Indian date format, amount-in-words in English (Hindi optional later).

---

## 7. Data Model (high level)

- **business_profile** — name, address, GSTIN, state code, logo, terms.
- **users** — name, role, login, pin/hash.
- **rooms** — number, type_id, floor, status.
- **room_types** — name, base_tariff, gst_rate, sac.
- **menu_items** — name, category, price, gst_rate, sac, active.
- **services** (other) — name, price, gst_rate, sac, active.
- **guests** — name, phone, address, id_type, id_number, gstin (optional).
- **bookings** — guest_id, check_in, check_out_expected, status, advance.
- **booking_rooms** — booking_id, room_id, tariff, nights.
- **folios / bills** — number, series (gst/non-gst), date, guest_id, booking_id, mode (gst/non-gst), subtotal, discount, cgst, sgst, round_off, grand_total, status.
- **bill_items** — bill_id, category (room/food/other), description, hsn_sac, qty, unit_price, discount, gst_rate, taxable_value, cgst, sgst, line_total.
- **payments** — bill_id, mode, amount, reference, date.
- **audit_log** — user, action, entity, before/after, timestamp.

---

## 8. Key Screens (UI)

1. **Login**
2. **Dashboard** — today's sales, occupancy, quick actions.
3. **Room status board** — grid of rooms by status; click to book/check-in/view folio.
4. **New booking / Check-in** — guest details, room selection, advance.
5. **Billing screen** — add room/food/other lines, live GST calculation, discount, payment, print. Toggle **GST / non-GST**.
6. **Restaurant order** — quick menu grid, post to room or standalone bill.
7. **Check-out** — review folio, settle, generate final invoice.
8. **Masters** — rooms, room types, menu, services, tax rates.
9. **Reports** — daily summary, date range, GST report, room/guest history.
10. **Settings** — business profile/GSTIN, users, invoice numbering, printer, backup.

---

## 9. Implementation Plan (phased)

### Phase 0 — Setup & confirmation (this stage)
- Confirm tech stack, GST rates/SAC codes (with your CA), invoice format & logo.
- Set up project skeleton, database schema, dev environment.

### Phase 1 — Core billing (MVP)
- Masters: rooms, room types, menu items, services, tax rates, business profile/GSTIN.
- Billing screen with room/food/other line items, GST + non-GST modes, CGST/SGST calc, discounts, rounding.
- Payments, invoice numbering, **print A4 + PDF**.
- Login & roles.
> **Outcome:** you can produce correct GST and non-GST bills and print them.

### Phase 2 — Front desk operations
- Room status board, bookings, check-in/check-out, guest folio (post charges to room), advances.
- Restaurant order screen posting to folios.

### Phase 3 — Reports & history
- Daily summary, date-range, GST report (Excel/CSV export), room history, guest history, outstanding.

### Phase 4 — Polish & deploy
- Thermal printer support, automatic backups + restore, multi-PC network setup at the resort, user training, installer.
- Optional: light stock tracking, Hindi invoice, e-invoicing (if required later).

---

## 10. Open Decisions (need your input before building)

1. **Tech stack** — OK to go with Electron + Node + PostgreSQL (recommended), or do you prefer .NET?
2. **GST rates & SAC codes** — confirm with your CA the slabs for rooms and restaurant food.
3. **Invoice design** — do you have an existing bill format / logo / GSTIN to match?
4. **Printers** — A4 laser/inkjet, 80mm thermal, or both? Which models?
5. **The "server" PC** — which computer is usually on and can hold the database?
6. **Room list** — how many rooms and what room types/tariffs?
7. **Menu** — do you have a current food menu with prices to load in?

---

*Next step: once you confirm §10 (at least the stack and a rough room/menu list), I'll set up
the project and start Phase 1.*
