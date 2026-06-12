const fs = require('fs');
const existing = new Set(fs.readdirSync('public/assets/attachments').filter(f=>f.endsWith('.webp')).map(f=>f.replace(/\.webp$/,'')));
const src = fs.readFileSync('components/AiClassBuilder.tsx','utf-8');
const bankStart = src.indexOf('const ATTACHMENT_IMAGE_BANK');
const bankEnd = src.indexOf('};',bankStart)+1;
const bankBlock = src.slice(bankStart,bankEnd);
const entries = bankBlock.match(/'([^']+)':\s*'([^']+)'/g);
console.log('ATTACHMENT_IMAGE_BANK ('+entries.length+' entries):');
for(const e of entries){
  const m=e.match(/'([^']+)':\s*'([^']+)'/);
  const f=m[2].split('/').pop().replace(/\.webp$/,'');
  console.log('  "'+m[1]+'" -> '+f+(existing.has(f)?'':' [FILE MISSING!]'));
}
const fbStart=src.indexOf('const ATTACHMENT_SLOT_FALLBACKS');
const fbEnd=src.indexOf('};',fbStart)+1;
const fbBlock=src.slice(fbStart,fbEnd);
const fbEntries=fbBlock.match(/'([^']+)':\s*'([^']+)'/g);
console.log('\nATTACHMENT_SLOT_FALLBACKS:');
for(const e of fbEntries){
  const m=e.match(/'([^']+)':\s*'([^']+)'/);
  const f=m[2].split('/').pop().replace(/\.webp$/,'');
  console.log('  '+m[1]+' -> '+f+(existing.has(f)?'':' [FILE MISSING!]'));
}
const refd=new Set();
for(const e of entries){const m=e.match(/'([^']+)':\s*'([^']+)'/);refd.add(m[2].split('/').pop().replace(/\.webp$/,''));}
for(const e of fbEntries){const m=e.match(/'([^']+)':\s*'([^']+)'/);refd.add(m[2].split('/').pop().replace(/\.webp$/,''));}
const orphan=[...existing].filter(f=>!refd.has(f));
console.log('\nOrphaned (exist but unreferenced): '+orphan.length);
orphan.slice(0,20).forEach(f=>console.log('  '+f));
if(orphan.length>20)console.log('  ... and '+(orphan.length-20)+' more');
