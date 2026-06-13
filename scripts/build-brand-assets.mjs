// Generates all logo/icon assets from the source brand PNG.
//
//   node scripts/build-brand-assets.mjs
//
// Source files (PNG, transparent background preferred):
//   public/brand/wazonepro.png        -> full wordmark + dome (required)
//   public/brand/wazonepro-mark.png   -> compact square mark (optional, used for square icons)
//
// Outputs:
//   app/favicon.ico                   -> multi-size .ico (browser tab)
//   app/icon.png                      -> 512px PWA / generic icon
//   app/apple-icon.png                -> 180px Apple touch icon (paper background)
//   app/opengraph-image.png           -> 1200x630 social share card
//   scripts/wzpro-companion.ico       -> .exe file icon + systray icon
//   public/brand/wazonepro-512.png    -> normalized square logo (reused by manifest)

import sharp from "sharp";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const p = (...x) => path.join(root, ...x);

const PAPER = { r: 0xef, g: 0xee, b: 0xe8, alpha: 1 }; // #efeee8 brand paper

const fullSrc = p("public", "brand", "wazonepro.png");
const markSrc = p("public", "brand", "wazonepro-mark.png");

if (!existsSync(fullSrc)) {
  console.error(`Missing source logo: ${fullSrc}`);
  console.error("Save the WAZONEPRO logo there (PNG, transparent background) then re-run.");
  process.exit(1);
}

const ALPHA = 40; // alpha threshold for "ink" pixels

// Scan the full logo and return a square, centered PNG of just the dome
// (everything above the wordmark gap), padded with transparency. The full
// wordmark is illegible at favicon sizes, so the dome is the square mark.
async function deriveDomeMark() {
  const { data, info } = await sharp(fullSrc).raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  const a = (x, y) => data[(y * w + x) * c + 3];

  // Per-row ink coverage.
  const cov = new Array(h).fill(0);
  for (let y = 0; y < h; y++) {
    let n = 0;
    for (let x = 0; x < w; x++) if (a(x, y) > ALPHA) n++;
    cov[y] = n;
  }
  const top = cov.findIndex((n) => n > 0);
  const maxCov = Math.max(...cov);

  // Find the gap between dome and wordmark: first near-empty row in the
  // lower 60% that follows a substantial (dome) row.
  let gap = h;
  for (let y = Math.floor(h * 0.4); y < h; y++) {
    if (cov[y] < maxCov * 0.1 && cov[y - 1] > maxCov * 0.1) {
      gap = y;
      break;
    }
  }

  // Horizontal bounds of the dome region [top, gap).
  let minX = w, maxX = 0, minY = h, maxY = 0;
  for (let y = top; y < gap; y++) {
    for (let x = 0; x < w; x++) {
      if (a(x, y) > ALPHA) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const dw = maxX - minX + 1;
  const dh = maxY - minY + 1;
  const dome = await sharp(fullSrc).extract({ left: minX, top: minY, width: dw, height: dh }).png().toBuffer();

  // Center the dome on a transparent square (15% padding).
  const side = Math.round(Math.max(dw, dh) * 1.15);
  const square = await sharp({
    create: { width: side, height: side, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: dome, gravity: "center" }])
    .png()
    .toBuffer();

  const out = p("public", "brand", "wazonepro-mark.png");
  await writeFile(out, square);
  console.log(`Derived square mark from dome (${dw}x${dh}) -> ${path.relative(root, out)}`);
  return out;
}

// Square source for icons: prefer a hand-made mark, else derive the dome.
const squareSrc = existsSync(markSrc) ? markSrc : await deriveDomeMark();
console.log(`Square icon source: ${path.relative(root, squareSrc)}`);

// Fit the source into a transparent square of `size`px (contain, centered).
async function squarePng(src, size, background = { r: 0, g: 0, b: 0, alpha: 0 }) {
  return sharp(src)
    .resize(size, size, { fit: "contain", background })
    .flatten(background.alpha === 1 ? { background } : false)
    .png()
    .toBuffer();
}

// Build a .ico containing the given PNG buffers (PNG-compressed entries).
function buildIco(entries) {
  // entries: [{ size, buf }]
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = icon
  header.writeUInt16LE(entries.length, 4);

  const dir = Buffer.alloc(16 * entries.length);
  let offset = 6 + dir.length;
  const dirEntries = [];
  entries.forEach((e, i) => {
    const o = i * 16;
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, o + 0); // width (0 = 256)
    dir.writeUInt8(e.size >= 256 ? 0 : e.size, o + 1); // height
    dir.writeUInt8(0, o + 2); // palette
    dir.writeUInt8(0, o + 3); // reserved
    dir.writeUInt16LE(1, o + 4); // color planes
    dir.writeUInt16LE(32, o + 6); // bits per pixel
    dir.writeUInt32LE(e.buf.length, o + 8); // size of image data
    dir.writeUInt32LE(offset, o + 12); // offset
    offset += e.buf.length;
    dirEntries.push(e.buf);
  });

  return Buffer.concat([header, dir, ...dirEntries]);
}

async function main() {
  // 1) Normalized 512 square logo (transparent) -> reused everywhere
  const sq512 = await squarePng(squareSrc, 512);
  await writeFile(p("public", "brand", "wazonepro-512.png"), sq512);
  await writeFile(p("app", "icon.png"), sq512);
  console.log("Wrote app/icon.png + public/brand/wazonepro-512.png (512px)");

  // 1b) White variant of the full wordmark for dark backgrounds
  const white = await sharp(fullSrc).negate({ alpha: false }).png().toBuffer();
  await writeFile(p("public", "brand", "wazonepro-white.png"), white);
  console.log("Wrote public/brand/wazonepro-white.png (white variant)");

  // 2) favicon.ico (multi-size, transparent)
  const icoSizes = [16, 32, 48, 64, 128, 256];
  const icoEntries = [];
  for (const size of icoSizes) {
    icoEntries.push({ size, buf: await squarePng(squareSrc, size) });
  }
  await writeFile(p("app", "favicon.ico"), buildIco(icoEntries));
  console.log(`Wrote app/favicon.ico (${icoSizes.join("/")})`);

  // 3) .exe / systray icon (.ico, white-friendly sizes)
  const exeEntries = [];
  for (const size of [16, 32, 48, 64, 128, 256]) {
    exeEntries.push({ size, buf: await squarePng(squareSrc, size) });
  }
  await writeFile(p("scripts", "wzpro-companion.ico"), buildIco(exeEntries));
  console.log("Wrote scripts/wzpro-companion.ico");

  // 4) Apple touch icon (180px on paper, no transparency)
  const apple = await squarePng(squareSrc, 180, PAPER);
  await writeFile(p("app", "apple-icon.png"), apple);
  console.log("Wrote app/apple-icon.png (180px, paper bg)");

  // 5) Open Graph card 1200x630, full wordmark centered on paper
  const ogW = 1200;
  const ogH = 630;
  const logoTarget = 760;
  const logo = await sharp(fullSrc)
    .resize(logoTarget, Math.round(logoTarget * 0.62), { fit: "inside", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const og = await sharp({
    create: { width: ogW, height: ogH, channels: 4, background: PAPER },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toBuffer();
  await writeFile(p("app", "opengraph-image.png"), og);
  console.log("Wrote app/opengraph-image.png (1200x630)");

  console.log("\nDone. All brand assets regenerated.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
