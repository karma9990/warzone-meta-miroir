import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const BASE = 'public/assets/attachments';
const OUT = path.join(BASE, 'converted');

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

function sanitize(name) {
  return name.replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').toLowerCase().replace(/^-|-$/g, '');
}

// Collect all PNGs
const files = [];
const walk = (dir, depth = 0) => {
  if (depth > 3) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'season-04' || e.name === 'converted' || e.name === 'cropped') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, depth + 1);
    else if (e.name.endsWith('.png')) files.push(full);
  }
};
walk(BASE);

let total = 0;
const byCat = {};
for (const f of files) {
  const cat = path.relative(BASE, f).split(path.sep)[0];
  (byCat[cat] = byCat[cat] || []).push(f);
}

for (const [cat, catFiles] of Object.entries(byCat)) {
  console.log(`\n=== ${cat} (${catFiles.length}) ===`);

  for (const f of catFiles) {
    const rel = path.relative(BASE, f);
    const parts = rel.split(path.sep);
    const weaponClass = parts[1] || '';
    let weaponName = path.basename(f).replace(/\.\w+$/, '');
    if (weaponName.startsWith('Capture')) weaponName = weaponClass;

    const buf = fs.readFileSync(f);
    const meta = await sharp(buf).metadata();
    const w = meta.width, h = meta.height;

    const baseName = `${cat}-${sanitize(weaponClass)}-${sanitize(weaponName)}`;

    // For wide images, split first
    const subImages = w > 500
      ? [{ left: 0, top: 0, width: Math.floor(w / 2), height: h, suffix: 'g' },
         { left: Math.floor(w / 2), top: 0, width: w - Math.floor(w / 2), height: h, suffix: 'd' }]
      : [{ left: 0, top: 0, width: w, height: h, suffix: '' }];

    for (const si of subImages) {
      const outPath = path.join(OUT, si.suffix ? `${baseName}-${si.suffix}.webp` : `${baseName}.webp`);

      try {
        await sharp(buf)
          .extract({ left: si.left, top: si.top, width: si.width, height: si.height })
          .webp({ quality: 85 })
          .toFile(outPath);
        total++;
      } catch (err) {
        // Skip if fails
      }
    }
  }
}

console.log(`\n=== Total: ${total} images in ${OUT} ===`);
