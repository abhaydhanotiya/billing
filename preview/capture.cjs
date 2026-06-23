// Render preview.html to an A4 PDF (full print output) so we can review the design.
const { app, BrowserWindow } = require("electron");
const fs = require("fs");
const path = require("path");

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 920, height: 1000, show: false });
  await win.loadFile(path.join(__dirname, "preview.html"));
  await new Promise((r) => setTimeout(r, 900));
  const pdf = await win.webContents.printToPDF({
    pageSize: "A4",
    printBackground: true,
    margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
  });
  fs.writeFileSync("D:/tmp/invoice-preview.pdf", pdf);
  console.log("Saved D:/tmp/invoice-preview.pdf");
  app.quit();
});
