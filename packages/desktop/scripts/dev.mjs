/**
 * Desktop dev orchestrator — one command for the whole loop:
 *   1. Start the Vite dev server (renderer hot-reloads on save).
 *   2. Bundle electron/main + preload with esbuild in watch mode.
 *   3. Launch Electron pointed at the Vite server; restart it whenever the
 *      main/preload bundle changes. Renderer edits hot-update without a restart.
 *
 * Run: pnpm --filter @sanskar/desktop dev
 */
import { createServer } from "vite";
import esbuild from "esbuild";
import { spawn } from "node:child_process";
import electronPath from "electron";

// 1. Vite dev server for the renderer.
const viteServer = await createServer({ configFile: "vite.config.ts" });
await viteServer.listen();
viteServer.printUrls();
const devUrl = viteServer.resolvedUrls?.local?.[0] ?? "http://localhost:5273/";

let electronProc = null;
let shuttingDown = false;

function launchElectron() {
  electronProc = spawn(electronPath, ["."], {
    stdio: "inherit",
    env: { ...process.env, VITE_DEV_SERVER_URL: devUrl },
  });
  // When the user closes the window, tear the whole dev session down.
  electronProc.on("exit", () => {
    if (!shuttingDown) shutdown(0);
  });
}

function restartElectron() {
  if (!electronProc) {
    launchElectron();
    return;
  }
  // Detach the "exit -> shutdown" handler, relaunch after the old one dies.
  electronProc.removeAllListeners("exit");
  electronProc.once("exit", () => {
    electronProc = null;
    launchElectron();
  });
  electronProc.kill();
}

// 2. esbuild watch for the main process; restart Electron on every rebuild.
const ctx = await esbuild.context({
  entryPoints: { main: "electron/main.ts", preload: "electron/preload.ts" },
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outdir: "dist-electron",
  outExtension: { ".js": ".cjs" },
  external: ["electron"],
  sourcemap: true,
  logLevel: "error",
  plugins: [
    {
      name: "restart-electron",
      setup(build) {
        let first = true;
        build.onEnd((result) => {
          if (result.errors.length > 0) return; // keep the running window on a bad build
          console.log(first ? "[electron] starting…" : "[electron] main changed — restarting");
          first = false;
          restartElectron();
        });
      },
    },
  ],
});
await ctx.watch(); // initial build fires onEnd -> launches Electron

async function shutdown(code) {
  shuttingDown = true;
  try {
    electronProc?.removeAllListeners("exit");
    electronProc?.kill();
  } catch {
    /* ignore */
  }
  await ctx.dispose();
  await viteServer.close();
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
