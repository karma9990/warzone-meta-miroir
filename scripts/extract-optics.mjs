import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const OPTIC_DIR = 'public/assets/attachments/optic';
const OUT_DIR = 'public/assets/attachments/optic-extracted';
const EXPECTED_HEIGHT = 55; // Expected height per optic item in px
const MIN_GAP_HEIGHT = 2;

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

function walkPngs(dir, depth = 0) {
  if (depth > 2) return [];
  const results = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) results.push(...walkPngs(full, depth + 1));
    else if (e.name.endsWith('.png')) results.push(full);
  }
  return results;
}

async function extractOpticItems(buf, width, height) {
  const rgba = await sharp(buf).raw().toBuffer();
  const leftW = Math.floor(width * 0.3);

  // Per-row activity score: bright pixel count in left 30% (icon area)
  const rowScore = new Array(height).fill(0);
  for (let y = 0; y < height; y++) {
    let activePx = 0;
    for (let x = 0; x < leftW; x++) {
      const idx = (y * width + x) * 4;
      const a = rgba[idx + 3];
      if (a > 10) {
        const r = rgba[idx], g = rgba[idx + 1], b = rgba[idx + 2];
        const bright = (r + g + b) / 3;
        if (bright > 25) activePx++;
      }
    }
    rowScore[y] = activePx;
  }

  // Find gaps = rows where score is very low
  const gaps = [];
  let inGap = false;
  let gapStart = 0;
  for (let y = 0; y < height; y++) {
    const isGapRow = rowScore[y] < 3;
    if (isGapRow && !inGap) { inGap = true; gapStart = y; }
    else if (!isGapRow && inGap) {
      if (y - gapStart >= MIN_GAP_HEIGHT) {
        gaps.push({ start: gapStart, end: y });
      }
      inGap = false;
    }
  }
  if (inGap && height - gapStart >= MIN_GAP_HEIGHT) {
    gaps.push({ start: gapStart, end: height });
  }

  // Build items from gaps
  const items = [];
  let prev = 0;
  for (const g of gaps) {
    const h = g.start - prev;
    if (h > 10) items.push({ y: prev, h });
    prev = g.end;
  }
  if (height - prev > 10) items.push({ y: prev, h: height - prev });

  // For very large items (> 1.6x expected), try to split at expected height intervals
  const final = [];
  for (const it of items) {
    if (it.h > EXPECTED_HEIGHT * 1.6) {
      const count = Math.round(it.h / EXPECTED_HEIGHT);
      const splitH = Math.floor(it.h / count);
      for (let i = 0; i < count; i++) {
        final.push({ y: it.y + i * splitH, h: splitH });
      }
    } else {
      final.push(it);
    }
  }

  return final;
}

function sanitize(name) {
  return name.replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').toLowerCase().replace(/^-|-$/g, '');
}

async function main() {
  const files = walkPngs(OPTIC_DIR);
  let total = 0;

  for (const src of files) {
    const rel = path.relative(OPTIC_DIR, src);
    const parts = rel.split(path.sep);
    const weaponClass = sanitize(parts[0]);
    const gridName = path.basename(src).replace(/\.png$/, '');

    const buf = fs.readFileSync(src);
    const meta = await sharp(buf).metadata();
    const { width, height } = meta;

    const items = await extractOpticItems(buf, width, height);

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      // Guard: don't exceed image bounds
      const cropY = Math.max(0, it.y);
      const cropH = Math.min(it.h, height - cropY);
      if (cropH < 20) continue;

      const outName = `optic-${weaponClass}-${gridName}-${String(i + 1).padStart(2, '0')}.webp`;
      const outPath = path.join(OUT_DIR, outName);

      try {
        await sharp(buf)
          .extract({ left: 0, top: cropY, width, height: cropH })
          .webp({ quality: 85 })
          .toFile(outPath);
        total++;
      } catch { /* skip failed crops */ }
    }

    console.log(`${rel}: ${items.length} items extracted`);
  }

  console.log(`\nTotal: ${total} optic images in ${OUT_DIR}`);
}

main().catch(e => console.error(e));
