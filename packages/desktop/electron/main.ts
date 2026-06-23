import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { ensurePostgres, startServer, waitForHealth, stopServer } from "./backend.js";

// __dirname is provided natively in the CommonJS bundle (dist-electron/).
// In dev, Vite serves the renderer; in production we load the built bundle.
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

// In a packaged/standalone run the app brings up its own database + API.
// In `pnpm dev` the orchestrator already runs the server, so we skip it
// (unless SP_EMBED_SERVER=1 forces it on for testing the embedded path).
const EMBED_BACKEND = process.env.SP_EMBED_SERVER === "1" || (app.isPackaged && !DEV_SERVER_URL);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: "#f7f3ec",
    title: "Sanskar Palace",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (DEV_SERVER_URL) {
    void mainWindow.loadURL(DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    void mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Print the focused window to PDF (used for saving invoices as PDF).
ipcMain.handle("invoice:print-to-pdf", async () => {
  if (!mainWindow) return null;
  const data = await mainWindow.webContents.printToPDF({
    pageSize: "A4",
    printBackground: true,
    margins: { marginType: "default" },
  });
  return data.toString("base64");
});

// Open the native print dialog for the current page.
ipcMain.handle("invoice:print", async () => {
  if (!mainWindow) return false;
  return new Promise<boolean>((resolve) => {
    mainWindow!.webContents.print({ printBackground: true }, (success) => resolve(success));
  });
});

app.whenReady().then(async () => {
  if (EMBED_BACKEND) {
    ensurePostgres();
    startServer();
    const up = await waitForHealth();
    if (!up) console.error("[backend] API did not become healthy in time — UI may show 'server unreachable'.");
  }
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Tear the embedded server down when the app exits.
app.on("will-quit", stopServer);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
