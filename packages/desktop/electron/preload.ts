import { contextBridge, ipcRenderer } from "electron";

// Minimal, explicit bridge. The renderer talks to the API server over HTTP
// directly; this only exposes desktop-native capabilities (printing, sharing).
const api = {
  platform: process.platform,
  /** Render the current page to a base64-encoded A4 PDF. */
  printToPdf: (): Promise<string | null> => ipcRenderer.invoke("invoice:print-to-pdf"),
  /** Open the native print dialog for the current page. */
  print: (): Promise<boolean> => ipcRenderer.invoke("invoice:print"),
  /** Save the current page as a PDF (shows a Save dialog); returns the path. */
  savePdf: (suggestedName: string): Promise<string | null> =>
    ipcRenderer.invoke("invoice:save-pdf", suggestedName),
  /** Open a URL (WhatsApp / email) in the OS default app. */
  openExternal: (url: string): Promise<boolean> => ipcRenderer.invoke("app:open-external", url),
};

contextBridge.exposeInMainWorld("desktop", api);

export type DesktopBridge = typeof api;
