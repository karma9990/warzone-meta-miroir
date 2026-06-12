import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const BASE = 'public/assets/attachments';
const CATS = ['bouche', 'accesoir canon', 'canon', 'CHARGEUR', 'crosse', 'mods de tir', 'poignée arrière'];

async function main() {
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

    const sample = files.find(f => path.basename(f).toLowerCase().includes('ak27')) || files[0];
    const buf = fs.readFileSync(sample);
    const meta = await sharp(buf).metadata();
    const { width, height } = meta;
    const rgba = await sharp(buf).raw().toBuffer();

    // Focus on the right 50% (card area)
    const cardLeft = Math.floor(width * 0.45);
    const cardW = width - cardLeft;

    // Row analysis of the card area: find distinctive color regions
    console.log(`\n=== ${cat}: ${path.basename(sample)} (cardArea: ${cardLeft}-${width}) ===`);
    
    // For each row in the card area, find the row with the MOST color variety
    // (the icon should have the highest color variance)
    const rowVariance = [];
    for (let y = 0; y < height; y++) {
      let sumR = 0, sumG = 0, sumB = 0, count = 0;
      for (let x = cardLeft; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (rgba[idx + 3] > 10) {
          sumR += rgba[idx]; sumG += rgba[idx+1]; sumB += rgba[idx+2];
          count++;
        }
      }
      if (count > 0) {
        const avgR = sumR / count, avgG = sumG / count, avgB = sumB / count;
        let variance = 0;
        for (let x = cardLeft; x < width; x++) {
          const idx = (y * width + x) * 4;
          if (rgba[idx + 3] > 10) {
            variance += Math.pow(rgba[idx] - avgR, 2) + Math.pow(rgba[idx+1] - avgG, 2) + Math.pow(rgba[idx+2] - avgB, 2);
          }
        }
        rowVariance.push({ y, variance: variance / count, count });
      }
    }

    // Sort by variance to find the most colorful rows (likely the icon)
    rowVariance.sort((a, b) => b.variance - a.variance);
    const topRows = rowVariance.slice(0, 10).sort((a, b) => a.y - b.y);
    console.log(`  Top variance rows (icon area):`);
    let startY = 0, endY = 0;
    if (topRows.length > 0) {
      startY = topRows[0].y - 5;
      endY = topRows[topRows.length - 1].y + 5;
      // Look for a cluster of high-variance rows
      let clusterStart = topRows[0].y, clusterEnd = topRows[0].y;
      for (let i = 1; i < topRows.length; i++) {
        if (topRows[i].y - clusterEnd < 15) {
          clusterEnd = topRows[i].y;
        }
      }
      startY = Math.max(0, clusterStart - 5);
      endY = Math.min(height, clusterEnd + 5);
      topRows.forEach(r => console.log(`    y=${r.y}: variance=${r.variance.toFixed(0)}`));
      console.log(`  → Icon region: y=${startY}-${endY}, x=${cardLeft}-${width}`);
    }
  }
}

main().catch(e => console.error(e));
