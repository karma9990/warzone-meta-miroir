import sharp from 'sharp';
import fs from 'fs';

const samples = [
  'public/assets/attachments/bouche/fusil d\'assaut/ak27.png',
  'public/assets/attachments/canon/fusil d\'assaut/ak27.png',
  'public/assets/attachments/CHARGEUR/FUSIL D\'ASSAUT/AK27.png',
  'public/assets/attachments/crosse/fusil d\'assaut/AK27.png',
  'public/assets/attachments/poignée arrière/fusil d\'assaut/AK27.png',
  'public/assets/attachments/accesoir canon/fusil d\'assaut/ak27.png',
  'public/assets/attachments/mods de tir/fusil d\'assaut/tir.png',
];

for (const fp of samples) {
  if (!fs.existsSync(fp)) { console.log(`\n=== ${fp.split('/').slice(-3).join('/')}: NOT FOUND ===`); continue; }
  
  const buf = fs.readFileSync(fp);
  const meta = await sharp(buf).metadata();
  console.log(`\n=== ${fp.split('/').slice(-3).join('/')} (${meta.width}x${meta.height}) ===`);
  
  const rgba = await sharp(buf).raw().toBuffer();
  const w = meta.width, h = meta.height;
  
  // Find the background color (look at top-left corner)
  const bgIdx = 0 * 4;
  const bgR = rgba[bgIdx], bgG = rgba[bgIdx+1], bgB = rgba[bgIdx+2];
  console.log(`Background: rgb(${bgR},${bgG},${bgB})`);
  
  // Analyze horizontal strips to find where content is vs background
  const rowHasContent = [];
  for (let y = 0; y < h; y++) {
    let contentPixels = 0;
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const dr = Math.abs(rgba[idx] - bgR);
      const dg = Math.abs(rgba[idx+1] - bgG);
      const db = Math.abs(rgba[idx+2] - bgB);
      if (dr > 20 || dg > 20 || db > 20) contentPixels++;
    }
    rowHasContent.push(contentPixels > w * 0.05);
  }
  
  // Find the first and last content rows
  const contentRows = rowHasContent.map((v, i) => v ? i : -1).filter(i => i >= 0);
  const firstContent = contentRows[0];
  const lastContent = contentRows[contentRows.length - 1];
  const contentHeight = lastContent - firstContent + 1;
  console.log(`Content area: y=${firstContent}-${lastContent} (h=${contentHeight})`);
  
  // Analyze the bottom 40% and top 40% separately to identify attachment location
  const midY = Math.floor((firstContent + lastContent) / 2);
  
  // For each horizontal strip (25% sections), check average color and content density
  const sections = [
    { name: 'Top 25%', y1: firstContent, y2: firstContent + Math.floor(contentHeight * 0.25) },
    { name: 'Top-mid 25%', y1: firstContent + Math.floor(contentHeight * 0.25), y2: firstContent + Math.floor(contentHeight * 0.50) },
    { name: 'Bot-mid 25%', y1: firstContent + Math.floor(contentHeight * 0.50), y2: firstContent + Math.floor(contentHeight * 0.75) },
    { name: 'Bottom 25%', y1: firstContent + Math.floor(contentHeight * 0.75), y2: lastContent + 1 },
  ];
  
  console.log('Section analysis:');
  for (const sec of sections) {
    let rSum = 0, gSum = 0, bSum = 0, count = 0;
    for (let y = sec.y1; y < sec.y2; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        if (rgba[idx+3] > 10) {
          rSum += rgba[idx]; gSum += rgba[idx+1]; bSum += rgba[idx+2];
          count++;
        }
      }
    }
    const avgR = count > 0 ? (rSum / count).toFixed(0) : 0;
    const avgG = count > 0 ? (gSum / count).toFixed(0) : 0;
    const avgB = count > 0 ? (bSum / count).toFixed(0) : 0;
    const pct = (count / ((sec.y2 - sec.y1) * w) * 100).toFixed(0);
    console.log(`  ${sec.name}: avg rgb(${avgR},${avgG},${avgB}), density=${pct}%`);
  }
  
  // Check for brighter/highlighted areas that might indicate the attachment
  // The attachment might be highlighted with a brighter color or different hue
  console.log('Brightness hotspots (brightest 10px columns in each section):');
  for (const sec of sections.slice(1, 3)) { // skip top section (weapon body)
    const colBrightness = [];
    for (let x = 0; x < w; x++) {
      let sum = 0, cnt = 0;
      for (let y = sec.y1; y < sec.y2; y++) {
        const idx = (y * w + x) * 4;
        const bright = (rgba[idx] + rgba[idx+1] + rgba[idx+2]) / 3;
        if (bright > 80) { sum += bright; cnt++; }
      }
      colBrightness.push({ x, avg: cnt > 0 ? sum / cnt : 0, count: cnt });
    }
    const sorted = [...colBrightness].sort((a, b) => b.avg - a.avg).filter(c => c.count > 2);
    console.log(`  ${sec.name}: brightest columns: ${sorted.slice(0, 3).map(c => `x=${c.x} avg=${c.avg.toFixed(0)}`).join(', ')}`);
  }
  
  // Save a visualization to help understand
  const outName = `tmp_preview_${fp.split('/').slice(-3).join('_').replace(/[^a-z0-9._]/gi, '_')}.webp`;
  await sharp(fp)
    .resize(200)
    .webp({ quality: 70 })
    .toFile(outName);
  console.log(`  Preview saved: ${outName}`);
}
