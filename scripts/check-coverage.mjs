const fs = require('fs');

// Load existing webp files
const existing = new Set(
  fs.readdirSync('public/assets/attachments')
    .filter(f => f.endsWith('.webp'))
    .map(f => f.replace(/\.webp$/, ''))
);

// Load ATTACHMENT_IMAGE_BANK from AiClassBuilder.tsx
const src = fs.readFileSync('components/AiClassBuilder.tsx', 'utf-8');
const bankStart = src.indexOf('const ATTACHMENT_IMAGE_BANK');
const bankEnd = src.indexOf('};', bankStart) + 1;
const bankBlock = src.slice(bankStart, bankEnd);

// Parse entries
const entries = bankBlock.match(/'([^']+)':\s*'([^']+)'/g);
console.log('ATTACHMENT_IMAGE_BANK (' + entries.length + ' entries):');
for (const e of entries) {
  const m = e.match(/'([^']+)':\s*'([^']+)'/);
  const file = m[2].split('/').pop().replace(/\.webp$/, '');
  const exists = existing.has(file);
  console.log('  "' + m[1] + '" -> ' + file + (exists ? '' : ' [FILE MISSING!]'));
}

// Check fallback images
const fbStart = src.indexOf("const ATTACHMENT_SLOT_FALLBACKS");
const fbEnd = src.indexOf('};', fbStart) + 1;
const fbBlock = src.slice(fbStart, fbEnd);
const fbEntries = fbBlock.match(/'([^']+)':\s*'([^']+)'/g);
console.log('\nATTACHMENT_SLOT_FALLBACKS:');
for (const e of fbEntries) {
  const m = e.match(/'([^']+)':\s*'([^']+)'/);
  const file = m[2].split('/').pop().replace(/\.webp$/, '');
  const exists = existing.has(file);
  console.log('  ' + m[1] + ' -> ' + file + (exists ? '' : ' [FILE MISSING!]'));
}

// Check which image files in public/assets/attachments/ are NOT referenced by either bank
// (orphaned files)
const allReferenced = new Set();
for (const e of entries) {
  const m = e.match(/'([^']+)':\s*'([^']+)'/);
  const file = m[2].split('/').pop().replace(/\.webp$/, '');
  allReferenced.add(file);
}
for (const e of fbEntries) {
  const m = e.match(/'([^']+)':\s*'([^']+)'/);
  const file = m[2].split('/').pop().replace(/\.webp$/, '');
  allReferenced.add(file);
}

const orphaned = [...existing].filter(f => !allReferenced.has(f));
console.log('\nOrphaned files (exist but unreferenced): ' + orphaned.length);
orphaned.slice(0, 20).forEach(f => console.log('  ' + f));
if (orphaned.length > 20) console.log('  ... and ' + (orphaned.length - 20) + ' more');
