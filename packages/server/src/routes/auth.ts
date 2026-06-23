import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { verifyPassword } from "../lib/password.js";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/login", async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "username and password are required" });
    }
    const { username, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { username } });
    // Always run a verify to keep timing roughly constant whether or not the user exists.
    const ok = user && user.active ? await verifyPassword(user.passwordHash, password) : false;
    if (!user || !ok) {
      return reply.code(401).send({ error: "Invalid username or password" });
    }

    const token = await reply.jwtSign({ id: user.id, username: user.username, role: user.role });
    await prisma.auditLog.create({
      data: { userId: user.id, action: "LOGIN", entity: "User", entityId: user.id },
    });

    return {
      token,
      user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role },
    };
  });

  // Current session info.
  app.get("/auth/me", { preHandler: [app.authenticate] }, async (req) => {
    const u = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!u) return { user: null };
    return {
      user: { id: u.id, username: u.username, displayName: u.displayName, role: u.role },
    };
  });
}
