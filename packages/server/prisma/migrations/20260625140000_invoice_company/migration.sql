-- Optional company / business name on the bill-to (separate from the contact name).
ALTER TABLE "Invoice" ADD COLUMN "billToCompany" TEXT;
