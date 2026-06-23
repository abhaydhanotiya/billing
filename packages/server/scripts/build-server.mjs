import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve paths from this script's location so it works from any cwd.
const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Bundle the whole API server into a single CommonJS file (dist/server.cjs) so
 * it can ship inside the Electron app and run under Electron's Node.
 *
 * - @sanskar/shared is inlined (fixes the dev-only ".ts source" resolution).
 * - @prisma/client stays external (loads the Prisma query-engine N-API module
 *   at runtime; N-API is ABI-stable, so it works under Electron's Node).
 * - Everything else (fastify, pino, zod, bcryptjs…) is inlined. Production
 *   logging uses no pino transport, so pino bundles cleanly.
 */
await build({
  absWorkingDir: serverRoot,
  entryPoints: [path.join(serverRoot, "src/index.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile: path.join(serverRoot, "dist/server.cjs"),
  sourcemap: true,
  logLevel: "info",
  external: ["@prisma/client", ".prisma/client"],
  banner: {
    // Some bundled deps expect a CJS-style import.meta.url shim.
    js: "const importMetaUrl = require('url').pathToFileURL(__filename).href;",
  },
  define: {
    "import.meta.url": "importMetaUrl",
  },
});

console.log("Built dist/server.cjs");
