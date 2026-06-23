import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config.js";

export type UserRole = "ADMIN" | "RECEPTION" | "RESTAURANT";

/** Claims carried in the session JWT. */
export interface SessionUser {
  id: string;
  username: string;
  role: UserRole;
}

declare module "fastify" {
  interface FastifyInstance {
    /** preHandler: rejects the request unless a valid session JWT is present. */
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** preHandler factory: rejects unless the authenticated user has one of `roles`. */
    authorize: (
      roles: UserRole[],
    ) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: SessionUser;
    user: SessionUser;
  }
}

/**
 * Registers JWT support and two guards:
 *  - `authenticate` verifies the bearer token and populates `req.user`.
 *  - `authorize([roles])` additionally checks the user's role (ADMIN passes everything).
 */
export const authPlugin = fp(async (app) => {
  app.register(jwt, {
    secret: config.jwtSecret,
    sign: { expiresIn: config.jwtExpiry },
  });

  app.decorate("authenticate", async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
    } catch {
      await reply.code(401).send({ error: "Unauthorized" });
    }
  });

  app.decorate("authorize", (roles: UserRole[]) => {
    return async (req: FastifyRequest, reply: FastifyReply) => {
      try {
        await req.jwtVerify();
      } catch {
        return reply.code(401).send({ error: "Unauthorized" });
      }
      const role = req.user.role;
      if (role !== "ADMIN" && !roles.includes(role)) {
        return reply.code(403).send({ error: "Forbidden: insufficient role" });
      }
    };
  });
});
