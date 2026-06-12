const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const https = require('https');

const ATTACHMENTS_JSON = path.join(__dirname, 'attachments.json');
const ATTACHMENTS_DIR = path.join(__dirname, '..', 'public', 'assets', 'attachments');

const catalog = JSON.parse(fs.readFileSync(ATTACHMENTS_JSON, 'utf-8'));
console.log(`Catalog: ${catalog.length} entries`);

// Get existing files (all .webp in flat dir)
const existingFiles = new Set(
  fs.readdirSync(ATTACHMENTS_DIR)
    .filter(f => f.endsWith('.webp'))
    .map(f => f.replace(/\.webp$/, ''))
);
console.log(`Existing files: ${existingFiles.size}`);

// Check which are missing
const missing = catalog.filter(entry => !existingFiles.has(entry.id));
console.log(`Missing: ${missing.length} / ${catalog.length}`);

// Show some stats
const byGame = {};
for (const entry of catalog) {
  const game = entry.id.match(/mwiii?/)?.[0] || 'other';
  byGame[game] = byGame[game] || 0;
  if (missing.includes(entry)) byGame[game + '_missing'] = (byGame[game + '_missing'] || 0) + 1;
}
console.log('\nBy game:');
for (const [k, v] of Object.entries(byGame)) console.log(`  ${k}: ${v}`);

// Download function
function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/webp,image/png,image/jpeg,*/*'
      }
    }, resp => {
      if (resp.statusCode === 301 || resp.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        return download(resp.headers.location, dest).then(resolve).catch(reject);
      }
      if (resp.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${resp.statusCode} for ${url}`));
      }
      resp.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    });
    req.on('error', err => {
      file.close();
      fs.unlinkSync(dest, () => {});
      reject(err);
    });
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error(`Timeout: ${url}`));
    });
  });
}

async function convertToWebp(srcPath) {
  const webpPath = srcPath.replace(/\.\w+$/, '.webp');
  await sharp(srcPath).webp({ quality: 85 }).toFile(webpPath);
  fs.unlinkSync(srcPath);
  return path.basename(webpPath);
}

async function main() {
  const results = { success: 0, failed: 0, skipped: 0 };
  const limit = missing.length;

  for (let i = 0; i < limit; i++) {
    const entry = missing[i];
    const destPath = path.join(ATTACHMENTS_DIR, entry.id + '.' + entry.mime.split('/')[1]);
    
    process.stdout.write(`[${i + 1}/${limit}] ${entry.id}... `);
    
    try {
      await download(entry.url, destPath);
      const webpName = await convertToWebp(destPath);
      console.log(`OK (${webpName})`);
      results.success++;
    } catch (err) {
      console.log(`ERR: ${err.message.substring(0, 80)}`);
      results.failed++;
      // Clean up partial download if any
      try { if (fs.existsSync(destPath)) fs.unlinkSync(destPath); } catch(e) {}
    }

    // Small delay to avoid rate limiting
    if (i < limit - 1) await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\nDone: ${results.success} OK, ${results.failed} failed`);
}

main().catch(console.error);
