/** API response shapes (money fields are integer paise as numbers). */

export type Role = "ADMIN" | "RECEPTION" | "RESTAURANT";

export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
  role: Role;
}

export type RoomStatus = "VACANT" | "OCCUPIED" | "RESERVED" | "CLEANING" | "MAINTENANCE";

export interface RoomType {
  id: string;
  name: string;
  baseRatePaise: number;
  gstRatePct: number;
  hsnSac?: string | null;
}

export interface Room {
  id: string;
  number: string;
  floor?: string | null;
  status: RoomStatus;
  roomTypeId: string;
  roomType?: RoomType;
}

export interface MenuItem {
  id: string;
  name: string;
  category: "FOOD" | "BEVERAGE" | "OTHER";
  pricePaise: number;
  gstRatePct: number;
  hsnSac?: string | null;
  active: boolean;
}

export interface Guest {
  id: string;
  name: string;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  gstin?: string | null;
  idType?: string | null;
  idNumber?: string | null;
}

export type StayStatus = "RESERVED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED";

export interface OrderItem {
  id: string;
  menuItemId: string;
  nameSnapshot: string;
  pricePaise: number;
  gstRatePct: number;
  qty: number;
}

export interface Order {
  id: string;
  tableNo?: string | null;
  status: "OPEN" | "BILLED" | "CANCELLED";
  items: OrderItem[];
}

/** Lightweight invoice summary attached to a stay (the linked bill). */
export interface StayInvoiceRef {
  id: string;
  number?: string | null;
  status: InvoiceStatus;
  grandTotalPaise: number;
}

export interface Stay {
  id: string;
  guestId: string;
  roomId: string;
  nightlyRatePaise: number;
  gstRatePct: number;
  checkIn: string;
  expectedOut?: string | null;
  checkOut?: string | null;
  status: StayStatus;
  adults?: number;
  children?: number;
  notes?: string | null;
  guest?: Guest;
  room?: Room;
  invoice?: StayInvoiceRef | null;
  orders?: Order[];
}

export type BillMode = "GST" | "NON_GST";
export type InvoiceStatus = "DRAFT" | "FINALIZED" | "VOID";

export interface InvoiceLine {
  id: string;
  category: "ROOM" | "FOOD" | "OTHER";
  description: string;
  hsnSac?: string | null;
  qty: number;
  unitPricePaise: number;
  grossPaise: number;
  discountPaise: number;
  taxableValuePaise: number;
  gstRatePct: number;
  cgstPaise: number;
  sgstPaise: number;
  lineTotalPaise: number;
}

export type PaymentMode = "CASH" | "UPI" | "CARD" | "BANK" | "OTHER";

export interface Payment {
  id: string;
  mode: PaymentMode;
  amountPaise: number;
  reference?: string | null;
  receivedAt: string;
}

export interface Invoice {
  id: string;
  number?: string | null;
  fySeries?: string | null;
  seq?: number | null;
  mode: BillMode;
  status: InvoiceStatus;
  billToName: string;
  billToCompany?: string | null;
  billToAddress?: string | null;
  billToGstin?: string | null;
  billToPhone?: string | null;
  grossPaise: number;
  totalDiscountPaise: number;
  taxableValuePaise: number;
  totalCgstPaise: number;
  totalSgstPaise: number;
  totalTaxPaise: number;
  roundOffPaise: number;
  grandTotalPaise: number;
  amountInWords: string;
  invoiceDate?: string | null;
  checkInDate?: string | null;
  checkOutDate?: string | null;
  manualNumber?: number | null;
  createdAt: string;
  finalizedAt?: string | null;
  lines?: InvoiceLine[];
  payments?: Payment[];
  guest?: Guest | null;
  stays?: Stay[];
}

export interface StaffUser {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  detail?: string | null;
  createdAt: string;
  user?: { username: string; displayName: string } | null;
}

export interface DayClose {
  date: string;
  invoiceCount: number;
  voidCount: number;
  totals: {
    taxableValuePaise: number | null;
    totalTaxPaise: number | null;
    totalDiscountPaise: number | null;
    grandTotalPaise: number | null;
  };
  collections: { mode: PaymentMode; amountPaise: number; count: number }[];
  collectedPaise: number;
}

export interface BusinessProfile {
  id: number;
  legalName: string;
  tradeName?: string | null;
  gstin?: string | null;
  address: string;
  city: string;
  stateName: string;
  stateCode: string;
  pincode?: string | null;
  phone?: string | null;
  email?: string | null;
  logo?: string | null;
  invoiceNote?: string | null;
  jurisdiction?: string | null;
}
