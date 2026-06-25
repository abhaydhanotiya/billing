import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { config } from "../config.js";
import { decodeDataUri, uploadPublic } from "../lib/storage.js";

const profileSchema = z.object({
  legalName: z.string().min(1),
  tradeName: z.string().optional(),
  gstin: z.string().optional(),
  address: z.string().min(1),
  city: z.string().min(1),
  stateName: z.string().min(1),
  stateCode: z.string().min(1),
  pincode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  logo: z.string().optional(),
  invoiceNote: z.string().optional(),
  jurisdiction: z.string().optional(),
});

export async function businessRoutes(app: FastifyInstance) {
  app.get("/business-profile", { preHandler: [app.authenticate] }, async () => ({
    profile: await prisma.businessProfile.findUnique({ where: { id: 1 } }),
  }));

  app.put("/business-profile", { preHandler: [app.authorize(["ADMIN"])] }, async (req, reply) => {
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const profile = await prisma.businessProfile.upsert({
      where: { id: 1 },
      create: { id: 1, ...parsed.data },
      update: parsed.data,
    });
    return { profile };
  });

  // Upload the business logo. If Supabase Storage is configured, the image is
  // stored there and the profile keeps a public URL; otherwise it falls back to
  // an inline data URI so the feature still works without a storage key.
  const logoSchema = z.object({ dataUrl: z.string().min(1) });
  app.post("/business-profile/logo", { preHandler: [app.authorize(["ADMIN"])] }, async (req, reply) => {
    const parsed = logoSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "dataUrl is required" });

    let logo = parsed.data.dataUrl;
    let storage: "supabase" | "inline" = "inline";

    if (config.supabaseStorageEnabled) {
      try {
        const { buffer, contentType, ext } = decodeDataUri(parsed.data.dataUrl);
        logo = await uploadPublic(`business-logo-${Date.now()}.${ext}`, buffer, contentType);
        storage = "supabase";
      } catch (err) {
        req.log.error(err, "logo upload to Supabase Storage failed; storing inline");
      }
    }

    const profile = await prisma.businessProfile.upsert({
      where: { id: 1 },
      create: { id: 1, legalName: "Sanskar Palace", address: "", city: "", stateName: "", stateCode: "", logo },
      update: { logo },
    });
    return { url: logo, storage, profile };
  });
}
