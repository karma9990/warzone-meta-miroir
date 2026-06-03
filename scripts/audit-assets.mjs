import fs from 'node:fs';
import path from 'node:path';

const ROOTS = ['app', 'components', 'lib', 'data'];
const EXTENSIONS = new Set(['.tsx', '.ts', '.js', '.mjs', '.json', '.css']);
const PUBLIC_REF_PATTERN = /["'`](\/(?:assets|generated|fonts|file\.svg|globe\.svg|next\.svg|vercel\.svg|window\.svg)[^"'`\s)})]*)["'`]/g;

const refs = new Map();

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

if (missing.length > 0) {
  console.error('Missing public asset references:');
  for (const item of missing) {
    console.error(`- ${item.ref}`);
    for (const file of item.files) console.error(`  ${file}`);
  }
  process.exit(1);
}

console.log(`Asset audit passed (${refs.size} references checked).`);
