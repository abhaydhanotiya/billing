const { app, BrowserWindow } = require("electron");
const fs = require("fs");
const path = require("path");
const file = process.argv[2] || "shell.html";
const out = process.argv[3] || "D:/tmp/shell.png";
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1280, height: 860, show: false });
  await win.loadFile(path.join(__dirname, file));
  await new Promise((r) => setTimeout(r, 900));
  const img = await win.webContents.capturePage();
  fs.writeFileSync(out, img.toPNG());
  console.log("Saved", out);
  app.quit();
});
