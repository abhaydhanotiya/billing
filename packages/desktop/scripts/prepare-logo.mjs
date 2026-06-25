/**
 * Prepare the Sanskar Palace logo for use on the (light) invoice:
 *  - resize to a web-friendly width
 *  - knock out the near-black background to transparency so only the gold shows
 * Outputs a data URI (for upload) and a cream-composited preview (to eyeball).
 */
import fs from "node:fs";
import Jimp from "jimp";

const SRC = process.env.SP_LOGO ?? "D:\\SP\\logo\\logo.png";
const img = await Jimp.read(SRC);
img.scaleToFit(760, 760);

// Make near-black pixels transparent (soft edge: fade alpha as pixels darken).
img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
  const r = this.bitmap.data[idx];
  const g = this.bitmap.data[idx + 1];
  const b = this.bitmap.data[idx + 2];
  const lum = Math.max(r, g, b);
  if (lum < 40) this.bitmap.data[idx + 3] = 0;
  else if (lum < 90) this.bitmap.data[idx + 3] = Math.round(((lum - 40) / 50) * 255);
});

const dataUri = await img.getBase64Async(Jimp.MIME_PNG);
fs.writeFileSync("D:/tmp/logo-data.txt", dataUri);

// Preview composited on the invoice's cream so we can judge it.
const cream = new Jimp(img.bitmap.width + 80, img.bitmap.height + 60, 0xfffefbff);
cream.composite(img, 40, 30);
await cream.writeAsync("D:/tmp/logo-preview.png");
console.log(
  `Prepared logo ${img.bitmap.width}x${img.bitmap.height}, data URI ${(dataUri.length / 1024).toFixed(0)} KB`,
);
