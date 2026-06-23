import { build } from "esbuild";

// Bundle the Electron main + preload into CommonJS. `electron` is provided by
// the runtime, so it stays external. Output goes to dist-electron/.
await build({
  entryPoints: {
    main: "electron/main.ts",
    preload: "electron/preload.ts",
  },
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outdir: "dist-electron",
  outExtension: { ".js": ".cjs" },
  external: ["electron"],
  sourcemap: true,
  logLevel: "info",
});

console.log("Built dist-electron/main.cjs + preload.cjs");
