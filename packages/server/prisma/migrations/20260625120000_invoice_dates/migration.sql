-- Optional bill/check-in/check-out dates the user can set on an invoice.
ALTER TABLE "Invoice" ADD COLUMN "invoiceDate" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN "checkInDate" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN "checkOutDate" TIMESTAMP(3);
