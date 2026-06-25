/**
 * Backend supervisor for the packaged app: on launch, make sure PostgreSQL is
 * running and start the bundled API server (under Electron's Node via
 * utilityProcess). In dev this is skipped — the dev orchestrator runs the
 * server itself — unless SP_EMBED_SERVER=1 forces it on for testing.
 */
import { app, utilityProcess, type UtilityProcess } from "electron";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";

const PG_DIR = process.env.SP_PG_DIR ?? "D:\\pg";
// Binaries live in <PG_DIR>\pgsql\bin; the data cluster in <PG_DIR>\data.
const PG_BIN = process.env.SP_PG_BIN ?? path.join(PG_DIR, "pgsql", "bin");
const PG_DATA = process.env.SP_PG_DATA ?? path.join(PG_DIR, "data");
const PG_PORT = process.env.SP_PG_PORT ?? "5433";
const API_PORT = process.env.PORT ?? "4000";

let serverProc: UtilityProcess | null = null;

function log(...args: unknown[]) {
  console.log("[backend]", ...args);
}

/** The server's config file (DATABASE_URL etc.) shipped beside the bundle. */
function envFilePath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, "server", ".env")
    : path.join(__dirname, "..", "..", "server", ".env");
}

/** Minimal KEY=VALUE parser for the shipped .env (handles quotes + # comments). */
function loadServerEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const content = fs.readFileSync(envFilePath(), "utf8").toString();
    for (const raw of content.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      out[key] = val;
    }
  } catch {
    /* no .env shipped — fall back to a local default below */
  }
  return out;
}

const fileEnv = loadServerEnv();
const DATABASE_URL =
  fileEnv.DATABASE_URL ??
  process.env.DATABASE_URL ??
  `postgresql://postgres:postgres@localhost:${PG_PORT}/sanskar?schema=public`;

/** A local DB means we manage Postgres ourselves; a cloud URL (Supabase) we don't. */
const usingLocalDb = /localhost|127\.0\.0\.1/.test(DATABASE_URL);

function pgCtl(args: string[], opts: Parameters<typeof spawnSync>[2] = {}) {
  return spawnSync(path.join(PG_BIN, "pg_ctl.exe"), args, {
    encoding: "utf8",
    windowsHide: true,
    ...opts,
  });
}

/** Start the portable PostgreSQL if it isn't already running (local DB only). */
export function ensurePostgres() {
  if (!usingLocalDb) {
    log("Using a cloud database (Supabase) — skipping local PostgreSQL.");
    return;
  }
  const status = pgCtl(["-D", PG_DATA, "status"]);
  if (status.status === 0) {
    log("PostgreSQL already running.");
    return;
  }
  log("Starting PostgreSQL…");
  // stdio:"ignore" is essential — pg_ctl launches a detached postgres that would
  // otherwise hold our stdout pipe open and make spawnSync hang forever.
  const res = pgCtl(
    ["-D", PG_DATA, "-l", path.join(PG_DIR, "log.txt"), "-o", `-p ${PG_PORT}`, "-w", "start"],
    { stdio: "ignore" },
  );
  if (res.status !== 0) {
    log("WARNING: could not start PostgreSQL:", res.error?.message || String(res.stderr || res.stdout || "").trim());
  } else {
    log("PostgreSQL started.");
  }
}

/** Resolve the bundled server entry + its node_modules root. */
function serverEntry(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "server", "dist", "server.cjs");
  }
  // dev/unpackaged: dist-electron → packages/desktop → packages → server
  return path.join(__dirname, "..", "..", "server", "dist", "server.cjs");
}

/** Fork the bundled API server under Electron's Node. */
export function startServer() {
  const entry = serverEntry();
  log("Starting API server:", entry);
  serverProc = utilityProcess.fork(entry, [], {
    stdio: "pipe",
    env: {
      ...process.env,
      // Values from the shipped .env (DATABASE_URL, DIRECT_URL, JWT_SECRET, prefixes)
      ...fileEnv,
      NODE_ENV: "production",
      PORT: API_PORT,
      HOST: "0.0.0.0",
      DATABASE_URL,
      JWT_SECRET: fileEnv.JWT_SECRET ?? process.env.JWT_SECRET ?? "sanskar-local-secret-change-me",
      INVOICE_PREFIX_GST: fileEnv.INVOICE_PREFIX_GST ?? "SR",
      INVOICE_PREFIX_NONGST: fileEnv.INVOICE_PREFIX_NONGST ?? "SRE",
    },
  });
  serverProc.stdout?.on("data", (d) => process.stdout.write(`[server] ${d}`));
  serverProc.stderr?.on("data", (d) => process.stderr.write(`[server] ${d}`));
  serverProc.on("exit", (code) => log(`API server exited (${code})`));
}

/** Poll the health endpoint until the server answers or we time out. */
export function waitForHealth(timeoutMs = 25000): Promise<boolean> {
  const start = Date.now();
  return new Promise((resolve) => {
    const tick = () => {
      const req = http.get(`http://localhost:${API_PORT}/health`, (res) => {
        res.resume();
        resolve(true);
      });
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) resolve(false);
        else setTimeout(tick, 400);
      });
    };
    tick();
  });
}

export function stopServer() {
  if (serverProc) {
    try {
      serverProc.kill();
    } catch {
      /* ignore */
    }
    serverProc = null;
  }
}
