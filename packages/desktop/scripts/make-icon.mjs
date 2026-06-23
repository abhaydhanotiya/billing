/**
 * Build the Windows app icon (build/icon.ico) from the Sanskar Palace logo.
 * The logo is a wide gold-on-black image; we fit it onto a square black canvas
 * (the black blends with the logo background) and emit a multi-resolution ICO.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Jimp from "jimp";
import pngToIco from "png-to-ico";

const here = path.dirname(fileURLToPath(import.meta.url));
const desktop = path.resolve(here, "..");
const SRC = process.env.SP_LOGO ?? "D:\\SP\\logo\\logo.png";
const buildDir = path.join(desktop, "build");
fs.mkdirSync(buildDir, { recursive: true });

const sizes = [256, 128, 64, 48, 32, 16];

const src = await Jimp.read(SRC);
const buffers = [];
for (const s of sizes) {
  const canvas = new Jimp(s, s, 0x000000ff); // opaque black square
  const fitted = src.clone().scaleToFit(s, s);
  const x = Math.round((s - fitted.bitmap.width) / 2);
  const y = Math.round((s - fitted.bitmap.height) / 2);
  canvas.composite(fitted, x, y);
  buffers.push(await canvas.getBufferAsync(Jimp.MIME_PNG));
}

// A 256px PNG too (handy for Linux / general use).
fs.writeFileSync(path.join(buildDir, "icon.png"), buffers[0]);

const ico = await pngToIco(buffers);
fs.writeFileSync(path.join(buildDir, "icon.ico"), ico);
console.log(`Wrote build/icon.ico (${(ico.length / 1024).toFixed(1)} KB) and build/icon.png`);
