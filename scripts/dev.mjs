/**
 * Run the API server and the desktop app together with one command:
 *   pnpm dev
 *
 * Each child's output is line-prefixed so you can tell them apart. Ctrl-C
 * (or closing the Electron window) tears both down.
 */
import { spawn, execSync } from "node:child_process";

// Portable Postgres isn't a Windows service, so it stops on reboot. Make sure
// it's running before we launch the server — otherwise the server can't reach
// the database. `pg-status.cmd` exits non-zero when Postgres is down.
function ensurePostgres() {
  try {
    execSync("scripts\\pg-status.cmd", { stdio: "ignore" });
    console.log("[db] PostgreSQL already running.");
  } catch {
    console.log("[db] PostgreSQL is down — starting it…");
    try {
      execSync("scripts\\pg-start.cmd", { stdio: "inherit" });
    } catch {
      console.error("[db] Could not auto-start PostgreSQL. Run `pnpm db:up` manually, then retry.");
    }
  }
}

ensurePostgres();

const procs = [
  { name: "server", color: "\x1b[36m", args: ["--filter", "@sanskar/server", "dev"] },
  { name: "desktop", color: "\x1b[33m", args: ["--filter", "@sanskar/desktop", "dev"] },
];

const RESET = "\x1b[0m";
const children = [];
let stopping = false;

function prefix(name, color, chunk) {
  const tag = `${color}[${name}]${RESET} `;
  return chunk
    .toString()
    .split(/\r?\n/)
    .filter((l) => l.length > 0)
    .map((l) => tag + l)
    .join("\n");
}

for (const p of procs) {
  const child = spawn("pnpm", p.args, { shell: true, env: process.env });
  children.push(child);
  child.stdout.on("data", (d) => console.log(prefix(p.name, p.color, d)));
  child.stderr.on("data", (d) => console.error(prefix(p.name, p.color, d)));
  child.on("exit", (code) => {
    console.log(prefix(p.name, p.color, `exited (${code})`));
    if (!stopping) stopAll(code ?? 0);
  });
}

function stopAll(code) {
  stopping = true;
  for (const c of children) {
    try {
      c.kill();
    } catch {
      /* ignore */
    }
  }
  process.exit(code);
}

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));

console.log("Starting server + desktop in dev mode. Press Ctrl-C to stop both.");
