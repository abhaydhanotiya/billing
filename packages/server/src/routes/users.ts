import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { hashPassword } from "../lib/password.js";

const createSchema = z.object({
  username: z.string().min(3).max(40),
  displayName: z.string().min(1),
  role: z.enum(["ADMIN", "RECEPTION", "RESTAURANT"]),
  pin: z.string().min(4).max(64),
});

const updateSchema = z.object({
  displayName: z.string().min(1).optional(),
  role: z.enum(["ADMIN", "RECEPTION", "RESTAURANT"]).optional(),
  active: z.boolean().optional(),
});

const SAFE = { id: true, username: true, displayName: true, role: true, active: true, createdAt: true };

/** Staff management — admin only. Passwords are never returned. */
export async function userRoutes(app: FastifyInstance) {
  const admin = app.authorize(["ADMIN"]);

  app.get("/users", { preHandler: [admin] }, async () => ({
    users: await prisma.user.findMany({ select: SAFE, orderBy: { createdAt: "asc" } }),
  }));

  app.post("/users", { preHandler: [admin] }, async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { username, displayName, role, pin } = parsed.data;
    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) return reply.code(409).send({ error: "Username already taken" });
    const user = await prisma.user.create({
      data: { username, displayName, role, passwordHash: await hashPassword(pin) },
      select: SAFE,
    });
    await prisma.auditLog.create({
      data: { userId: req.user.id, action: "USER_CREATE", entity: "User", entityId: user.id, detail: JSON.stringify({ username, role }) },
    });
    return reply.code(201).send({ user });
  });

  app.patch("/users/:id", { preHandler: [admin] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    // Don't let an admin lock themselves out by deactivating their own account.
    if (id === req.user.id && parsed.data.active === false) {
      return reply.code(400).send({ error: "You cannot deactivate your own account." });
    }
    const user = await prisma.user.update({ where: { id }, data: parsed.data, select: SAFE });
    return { user };
  });

  app.post("/users/:id/reset-pin", { preHandler: [admin] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = z.object({ pin: z.string().min(4).max(64) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "pin must be at least 4 characters" });
    await prisma.user.update({ where: { id }, data: { passwordHash: await hashPassword(body.data.pin) } });
    await prisma.auditLog.create({
      data: { userId: req.user.id, action: "USER_RESET_PIN", entity: "User", entityId: id },
    });
    return { ok: true };
  });
}
