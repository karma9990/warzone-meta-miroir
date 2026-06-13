import fs from 'node:fs';
import path from 'node:path';

const ROOTS = ['app', 'components', 'lib', 'data'];
const EXTENSIONS = new Set(['.tsx', '.ts', '.js', '.mjs', '.json', '.css']);
const PUBLIC_REF_PATTERN = /["'`](\/(?:assets|generated|fonts|file\.svg|globe\.svg|next\.svg|vercel\.svg|window\.svg)[^"'`\s)})]*)["'`]/g;
const MAX_PUBLIC_ASSET_BYTES = 1_000_000;
const ALLOWED_LARGE_ASSETS = new Set([
  'assets/3d/czbren2.glb',
  'assets/liquid/nomalMap.png',
  'assets/liquid/photo_studio_broadway_hall_4k.hdr',
  'assets/tools/pro-movement/map-haven.jpg',
  'assets/tools/pro-movement/map-rebirth.jpg',
  'assets/weapons/wzstats/vx-compact.png',
  'generated/loadouts-dark-glass-bg.png',
  'generated/operator-full-site-bg.webp',
  'generated/warzone-liquid-bg.png',
]);

const refs = new Map();

function isStaticAssetReference(ref) {
  if (ref.endsWith('/...')) return false;
  if (ref.endsWith('-')) return false;
  return true;
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (EXTENSIONS.has(path.extname(fullPath))) {
      scanFile(fullPath);
    }
  }
}

function scanFile(file) {
  const source = fs.readFileSync(file, 'utf8');
  let match;

  while ((match = PUBLIC_REF_PATTERN.exec(source))) {
    const ref = match[1];
    if (!isStaticAssetReference(ref)) continue;
    if (!refs.has(ref)) refs.set(ref, new Set());
    refs.get(ref).add(file);
  }
}

for (const root of ROOTS) walk(root);

const missing = [];

for (const [ref, files] of refs) {
  const cleanRef = decodeURIComponent(ref.split('?')[0].split('#')[0]);
  const localPath = path.join('public', cleanRef.replace(/^\//, ''));

  if (!fs.existsSync(localPath)) {
    missing.push({
      ref,
      files: [...files].sort(),
    });
  }
}

const oversized = [];
function walkPublic(dir = 'public') {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkPublic(fullPath);
      continue;
    }

    const rel = path.relative('public', fullPath).replaceAll(path.sep, '/');
    const size = fs.statSync(fullPath).size;
    if (size > MAX_PUBLIC_ASSET_BYTES && !ALLOWED_LARGE_ASSETS.has(rel)) {
      oversized.push({ rel, size });
    }
  }
}

walkPublic();

if (missing.length > 0) {
  console.error('Missing public asset references:');
  for (const item of missing) {
    console.error(`- ${item.ref}`);
    for (const file of item.files) console.error(`  ${file}`);
  }
  process.exit(1);
}

if (oversized.length > 0) {
  console.error(`Public assets over ${Math.round(MAX_PUBLIC_ASSET_BYTES / 1000)} KB must be optimized or allowlisted with a reason:`);
  for (const item of oversized.sort((a, b) => b.size - a.size)) {
    console.error(`- ${item.rel} (${Math.round(item.size / 1000)} KB)`);
  }
  process.exit(1);
}

console.log(`Asset audit passed (${refs.size} references checked, ${ALLOWED_LARGE_ASSETS.size} large assets allowlisted).`);
