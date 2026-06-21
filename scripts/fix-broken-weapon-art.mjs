// One-off: re-fetch and re-encode the corrupt weapon art that breaks OG images.
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const WEAPONS = JSON.parse(fs.readFileSync(path.join(__dirname, 'weapons.json'), 'utf-8'));
const dir = path.join(ROOT, 'public', 'assets', 'weapons');
const wzstatsDir = path.join(dir, 'wzstats');

const SLUGS = ['vst', 'mk-78', 'dravec-45', 'm15-mod-0'];

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 WZ-Meta-Bot/1.0' } }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        return fetchBuffer(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
  });
}

for (const slug of SLUGS) {
  const entry = (Array.isArray(WEAPONS) ? WEAPONS : Object.values(WEAPONS)).find((w) => w.id === slug);
  if (!entry?.url) { console.log(slug, 'NO URL'); continue; }
  try {
    const buffer = await fetchBuffer(entry.url);
    const img = sharp(buffer, { failOn: 'none' }).resize(512, 512, { fit: 'inside', withoutEnlargement: true });
    // Validate we can decode by producing a PNG, then write all targets.
    const png = await img.clone().png().toBuffer();
    const avif = await img.clone().avif({ quality: 60 }).toBuffer();
    const webp = await img.clone().webp({ quality: 85 }).toBuffer();
    fs.writeFileSync(path.join(dir, `${slug}.avif`), avif);
    fs.writeFileSync(path.join(wzstatsDir, `${slug}.avif`), avif);
    fs.writeFileSync(path.join(dir, `${slug}.webp`), webp);
    fs.writeFileSync(path.join(wzstatsDir, `${slug}.png`), png);
    console.log(`${slug} OK — png ${(png.length / 1024).toFixed(1)}KB, avif ${(avif.length / 1024).toFixed(1)}KB`);
  } catch (err) {
    console.log(`${slug} FAIL — ${err.message}`);
  }
}
