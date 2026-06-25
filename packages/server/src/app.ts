import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config.js";
import { authPlugin } from "./plugins/auth.js";
import { authRoutes } from "./routes/auth.js";
import { businessRoutes } from "./routes/business.js";
import { roomRoutes } from "./routes/rooms.js";
import { menuRoutes } from "./routes/menu.js";
import { guestRoutes } from "./routes/guests.js";
import { stayRoutes } from "./routes/stays.js";
import { orderRoutes } from "./routes/orders.js";
import { invoiceRoutes } from "./routes/invoices.js";
import { paymentRoutes } from "./routes/payments.js";
import { reportRoutes } from "./routes/reports.js";
import { userRoutes } from "./routes/users.js";
import { auditRoutes } from "./routes/audit.js";
import { HttpError } from "./services/invoiceService.js";
import { prisma } from "./db.js";

// Money is stored as BigInt; emit it as a JSON number (paise stay within safe-int
// range for any realistic bill). The desktop client treats every *Paise field as paise.
(BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function (this: bigint) {
  return Number(this);
};

export async function buildApp() {
  const app = Fastify({
    // Logos are sent as base64 data URIs, so allow a larger JSON body (8 MB).
    bodyLimit: 8 * 1024 * 1024,
    logger: {
      level: config.isProduction ? "info" : "debug",
      transport: config.isProduction
        ? undefined
        : { target: "pino-pretty", options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" } },
    },
  });

  // Tolerate an empty body on application/json requests — several endpoints
  // (finalize, cancel, check-out) take no body. The default parser would 400.
  app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (_req, body, done) => {
      const text = typeof body === "string" ? body.trim() : "";
      if (text === "") return done(null, undefined);
      try {
        done(null, JSON.parse(text));
      } catch (err) {
        (err as { statusCode?: number }).statusCode = 400;
        done(err as Error, undefined);
      }
    },
  );

  await app.register(cors, {
    origin: config.corsOrigin === "*" ? true : config.corsOrigin.split(","),
  });
  await app.register(authPlugin);

  app.get("/health", async () => ({ status: "ok" }));

  // DB reachability — used by the client's connection indicator, and the periodic
  // ping doubles as a keep-alive that helps prevent Supabase free-tier auto-pause.
  app.get("/health/db", async (_req, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { db: "ok" };
    } catch {
      return reply.code(503).send({ db: "down" });
    }
  });

  // All API routes under /api.
  await app.register(
    async (api) => {
      await api.register(authRoutes);
      await api.register(businessRoutes);
      await api.register(roomRoutes);
      await api.register(menuRoutes);
      await api.register(guestRoutes);
      await api.register(stayRoutes);
      await api.register(orderRoutes);
      await api.register(invoiceRoutes);
      await api.register(paymentRoutes);
      await api.register(reportRoutes);
      await api.register(userRoutes);
      await api.register(auditRoutes);
    },
    { prefix: "/api" },
  );

  // Central error handler: our HttpError, Prisma's known errors, then a generic 500.
  app.setErrorHandler((err, req, reply) => {
    if (err instanceof HttpError) {
      return reply.code(err.statusCode).send({ error: err.message });
    }
    // Prisma "record not found" on update/delete.
    const code = (err as { code?: string }).code;
    if (code === "P2025") return reply.code(404).send({ error: "Record not found" });
    if (code === "P2002") return reply.code(409).send({ error: "Duplicate value" });
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode && statusCode < 500) {
      return reply.code(statusCode).send({ error: err.message });
    }
    req.log.error(err);
    return reply.code(500).send({ error: "Internal server error" });
  });

  return app;
}
