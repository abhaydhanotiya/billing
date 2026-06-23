import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The renderer is loaded by Electron from the local filesystem in production,
// so assets must use relative paths (base: "./").
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "chrome120",
  },
  server: {
    port: 5273,
    strictPort: true,
  },
});
