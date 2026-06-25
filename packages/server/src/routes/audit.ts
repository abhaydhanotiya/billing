import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";

/** Read the audit trail (sensitive actions: finalize, void, discount, login, user changes). */
export async function auditRoutes(app: FastifyInstance) {
  app.get("/audit", { preHandler: [app.authorize(["ADMIN", "RECEPTION"])] }, async (req) => {
    const q = req.query as { take?: string; action?: string };
    const logs = await prisma.auditLog.findMany({
      where: { action: q.action || undefined },
      include: { user: { select: { username: true, displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: q.take ? Math.min(Number(q.take), 500) : 200,
    });
    return { logs };
  });
}
