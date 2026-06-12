import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const BASE = 'public/assets/attachments';
const OUT = path.join(BASE, 'converted');
const CATS = ['bouche', 'accesoir canon', 'canon', 'CHARGEUR', 'crosse', 'mods de tir', 'poignée arrière'];

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

function sanitize(name) {
  return name
    .replace(/é|è|ê/g, 'e')
    .replace(/à|â/g, 'a')
    .replace(/ô/g, 'o')
    .replace(/û/g, 'u')
    .replace(/ï/g, 'i')
    .replace(/[^a-z0-9-]/gi, '-')
    .replace(/-+/g, '-')
    .toLowerCase()
    .replace(/^-|-$/g, '');
}

async function findIcon(buf, cardLeft) {
  const meta = await sharp(buf).metadata();
  const { width, height } = meta;
  const rgba = await sharp(buf).raw().toBuffer();

  const blockSize = 24;
  const step = 8;
  let bestScore = 0, bestCX = 0, bestCY = 0;

  for (let by = 0; by <= height - blockSize; by += step) {
    for (let bx = cardLeft; bx <= width - blockSize; bx += step) {
      let totalR = 0, totalG = 0, totalB = 0, count = 0;
      for (let y = by; y < by + blockSize; y++) {
        for (let x = bx; x < bx + blockSize; x++) {
          const idx = (y * width + x) * 4;
          if (rgba[idx + 3] > 10) {
            totalR += rgba[idx]; totalG += rgba[idx+1]; totalB += rgba[idx+2];
            count++;
          }
        }
      }
      if (count < 5) continue;

      const avgR = totalR / count, avgG = totalG / count, avgB = totalB / count;
      let variance = 0;
      for (let y = by; y < by + blockSize; y++) {
        for (let x = bx; x < bx + blockSize; x++) {
          const idx = (y * width + x) * 4;
          if (rgba[idx + 3] > 10) {
            variance += Math.pow(rgba[idx] - avgR, 2) + Math.pow(rgba[idx+1] - avgG, 2) + Math.pow(rgba[idx+2] - avgB, 2);
          }
        }
      }
      const score = count > 0 ? variance / count : 0;
      if (score > bestScore) { bestScore = score; bestCX = bx; bestCY = by; }
    }
  }

  const expandHalf = 16;
  const cropLeft = Math.max(cardLeft, bestCX - expandHalf);
  const cropTop = Math.max(0, bestCY - expandHalf);
  const cropW = Math.min(width - cropLeft, blockSize + expandHalf * 2);
  const cropH = Math.min(height - cropTop, blockSize + expandHalf * 2);

  return { left: cropLeft, top: cropTop, width: cropW, height: cropH, score: bestScore };
}

async function main() {
  let total = 0;
  for (const cat of CATS) {
    const catDir = path.join(BASE, cat);
    if (!fs.existsSync(catDir)) continue;

    const files = [];
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.name.endsWith('.png')) files.push(full);
      }
    };
    walk(catDir);
    if (files.length === 0) continue;

    let catSuccess = 0;
    for (const f of files) {
      const rel = path.relative(BASE, f);
      const weaponClass = rel.split(path.sep).slice(1, -1).join('-') || '';
      let weaponName = path.basename(f).replace(/\.\w+$/, '');
      if (weaponName.startsWith('Capture')) weaponName = weaponClass;

      const buf = fs.readFileSync(f);
      const meta = await sharp(buf).metadata();
      const cardLeft = Math.floor(meta.width * 0.45);

      const icon = await findIcon(buf, cardLeft);
      if (icon.score < 100) {
        icon.left = cardLeft;
        icon.top = 0;
        icon.width = meta.width - cardLeft;
        icon.height = meta.height;
      }

      const baseName = `${sanitize(cat)}-${sanitize(weaponClass)}-${sanitize(weaponName)}`;
      const outPath = path.join(OUT, `${baseName}.webp`);

      try {
        await sharp(buf)
          .extract(icon)
          .webp({ quality: 85 })
          .toFile(outPath);
        catSuccess++; total++;
      } catch { }
    }
    console.log(`${cat}: ${catSuccess}/${files.length}`);
  }
  console.log(`\nTotal: ${total} icons in ${OUT}`);
}

main().catch(e => console.error(e));
