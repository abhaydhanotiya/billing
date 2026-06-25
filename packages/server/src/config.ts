/** Runtime configuration, read once from the environment. */

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

/**
 * Derive the Supabase project URL (https://<ref>.supabase.co) from the database
 * URL, whose user is "postgres.<ref>". Lets us avoid a separate env var.
 */
function deriveSupabaseUrl(): string {
  if (process.env.SUPABASE_URL) return process.env.SUPABASE_URL.replace(/\/$/, "");
  const m = (process.env.DATABASE_URL ?? "").match(/postgres\.([a-z0-9]+)/i);
  return m ? `https://${m[1]}.supabase.co` : "";
}

export const config = {
  /** Port the API listens on. */
  port: Number(process.env.PORT ?? 4000),
  /** Bind host — 0.0.0.0 so client PCs on the LAN can reach the server. */
  host: process.env.HOST ?? "0.0.0.0",
  databaseUrl: required("DATABASE_URL", "postgresql://localhost:5432/sanskar"),
  /** Secret used to sign session JWTs. Must be set in production. */
  jwtSecret: required("JWT_SECRET", "dev-insecure-secret-change-me"),
  /** How long a login session stays valid. */
  jwtExpiry: process.env.JWT_EXPIRY ?? "12h",
  /** Comma-separated allowed origins for CORS; "*" in dev. */
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  /** Prefix for GST invoice numbers, e.g. "SR" -> "SR-1". */
  invoicePrefixGst: process.env.INVOICE_PREFIX_GST ?? process.env.INVOICE_PREFIX ?? "SR",
  /** Prefix for NON-GST invoice numbers (a separate series), e.g. "SRE" -> "SRE-1". */
  invoicePrefixNonGst: process.env.INVOICE_PREFIX_NONGST ?? "SRE",
  isProduction: process.env.NODE_ENV === "production",
  // Supabase Storage (for the business logo). If the service key is absent we
  // fall back to storing the logo inline as a data URI.
  supabaseUrl: deriveSupabaseUrl(),
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  supabaseBucket: process.env.SUPABASE_BUCKET ?? "assets",
  supabaseStorageEnabled: Boolean(deriveSupabaseUrl() && process.env.SUPABASE_SERVICE_ROLE_KEY),
} as const;
