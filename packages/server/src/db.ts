import { PrismaClient } from "@prisma/client";

/**
 * Single shared Prisma client for the process. Reused across requests so we
 * don't exhaust the Postgres connection pool.
 */
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "production" ? ["warn", "error"] : ["warn", "error"],
});

export type Db = typeof prisma;
