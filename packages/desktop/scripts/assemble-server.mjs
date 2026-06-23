/**
 * Assemble a self-contained copy of the API server for packaging into the app.
 * Produces packages/desktop/resources/server/ with:
 *   dist/server.cjs              — the bundled server
 *   node_modules/@prisma/client  — the Prisma client package
 *   node_modules/.prisma/client  — the generated client + query-engine binary
 *
 * pnpm symlinks are dereferenced so electron-builder ships real files.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const desktop = path.resolve(here, "..");
const serverPkg = path.resolve(desktop, "..", "server");
const out = path.join(desktop, "resources", "server");

// Clean output.
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, "dist"), { recursive: true });

// 1. The bundled server.
fs.copyFileSync(path.join(serverPkg, "dist", "server.cjs"), path.join(out, "dist", "server.cjs"));

// 2. Prisma client + generated client (follow the pnpm symlink to the real dir).
const clientReal = fs.realpathSync(path.join(serverPkg, "node_modules", "@prisma", "client"));
const realNodeModules = path.resolve(clientReal, "..", ".."); // .../node_modules
const dotPrisma = path.join(realNodeModules, ".prisma", "client");

const skip = (src) => /\.(tmp\d*|map)$/.test(src) || src.endsWith(".tmp");
const copy = (src, dest) =>
  fs.cpSync(src, dest, { recursive: true, dereference: true, filter: (s) => !skip(s) });

copy(clientReal, path.join(out, "node_modules", "@prisma", "client"));
copy(dotPrisma, path.join(out, "node_modules", ".prisma", "client"));

// Report size.
function dirSize(p) {
  let total = 0;
  for (const e of fs.readdirSync(p, { withFileTypes: true })) {
    const fp = path.join(p, e.name);
    total += e.isDirectory() ? dirSize(fp) : fs.statSync(fp).size;
  }
  return total;
}
console.log(`Assembled ${out} (${(dirSize(out) / 1e6).toFixed(1)} MB)`);
