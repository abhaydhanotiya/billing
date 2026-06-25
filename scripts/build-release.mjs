/**
 * Build the Windows installer in one step:  pnpm release
 *
 * Runs each step directly (no nested pnpm scripts, which lose `node` from PATH
 * on Windows) and points all caches/temp at D: because this PC's C: is full.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const server = path.join(root, "packages", "server");
const desktop = path.join(root, "packages", "desktop");

// Keep heavy caches/temp off the full C: drive.
const caches = {
  TMP: "D:\\tmp",
  TEMP: "D:\\tmp",
  npm_config_cache: "D:\\.npm-cache",
  ELECTRON_CACHE: "D:\\.cache\\electron",
  ELECTRON_BUILDER_CACHE: "D:\\.cache\\electron-builder",
  PRISMA_ENGINES_CACHE_DIR: "D:\\.cache\\prisma",
  CSC_IDENTITY_AUTO_DISCOVERY: "false",
};
for (const d of [caches.TMP, caches.npm_config_cache, caches.ELECTRON_CACHE, caches.ELECTRON_BUILDER_CACHE, caches.PRISMA_ENGINES_CACHE_DIR]) {
  fs.mkdirSync(d, { recursive: true });
}
const env = { ...process.env, ...caches };

function run(label, cmd, cwd) {
  console.log(`\n=== ${label} ===\n› ${cmd}`);
  execSync(cmd, { cwd, env, stdio: "inherit" });
}

try {
  run("1/5 Bundle API server", `node "${path.join(server, "scripts/build-server.mjs")}"`, root);
  run("2/5 Assemble server resources", `node "${path.join(desktop, "scripts/assemble-server.mjs")}"`, root);
  run("3/5 Build Electron main", `node "${path.join(desktop, "scripts/build-main.mjs")}"`, desktop);
  run("4/5 Build UI", "pnpm exec vite build", desktop);
  run("5/5 Package installer", "pnpm exec electron-builder --publish never", desktop);
  console.log("\n✅ Done. Installer at: packages\\desktop\\release\\Sanskar Palace-Setup-<version>.exe");
} catch (err) {
  console.error("\n❌ Build failed:", err.message);
  process.exit(1);
}
