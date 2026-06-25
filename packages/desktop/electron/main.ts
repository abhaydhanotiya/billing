import { app, BrowserWindow, ipcMain, dialog, shell } from "electron";
import electronUpdater from "electron-updater";
import fs from "node:fs";
import path from "node:path";
import { ensurePostgres, startServer, waitForHealth, stopServer } from "./backend.js";

const { autoUpdater } = electronUpdater;

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

// Save the current page to a PDF file the user chooses; returns the saved path.
ipcMain.handle("invoice:save-pdf", async (_e, suggestedName: string) => {
  if (!mainWindow) return null;
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: "Save invoice as PDF",
    defaultPath: suggestedName || "invoice.pdf",
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });
  if (canceled || !filePath) return null;
  const data = await mainWindow.webContents.printToPDF({ pageSize: "A4", printBackground: true });
  await fs.promises.writeFile(filePath, data);
  return filePath;
});

// Open a URL (WhatsApp wa.me, mailto:, etc.) in the OS default handler.
ipcMain.handle("app:open-external", async (_e, url: string) => {
  await shell.openExternal(url);
  return true;
});

app.whenReady().then(async () => {
  if (EMBED_BACKEND) {
    ensurePostgres();
    startServer();
    const up = await waitForHealth();
    if (!up) console.error("[backend] API did not become healthy in time — UI may show 'server unreachable'.");
  }
  createWindow();

  // Check GitHub Releases for a newer version and download/notify (packaged only).
  if (app.isPackaged) {
    autoUpdater.autoDownload = true;
    autoUpdater.checkForUpdatesAndNotify().catch((err) => console.error("[update] check failed:", err));
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Tear the embedded server down when the app exits.
app.on("will-quit", stopServer);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
