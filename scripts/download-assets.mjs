/**
 * WZ_META — Script de téléchargement et d'optimisation d'assets
 * Usage :
 *   node scripts/download-assets.mjs --type weapons
 *   node scripts/download-assets.mjs --type attachments
 *   node scripts/download-assets.mjs --type all
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

// ─── Config ───────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');

const CONFIG = {
  weapons: {
    input:  path.join(__dirname, 'weapons.json'),
    output: path.join(ROOT, 'public', 'assets', 'weapons'),
  },
  attachments: {
    input:  path.join(__dirname, 'attachments.json'),
    output: path.join(ROOT, 'public', 'assets', 'attachments'),
  },
};

const IMAGE_OPTIONS = {
  maxWidth:  512,       // px — redimensionné si plus large
  maxHeight: 512,       // px
  quality:   85,        // qualité WebP (0–100)
  format:    'webp',    // sortie en WebP pour la perf
};

const ERRORS_LOG   = path.join(__dirname, 'errors.log');
const SUMMARY_LOG  = path.join(__dirname, 'summary.log');
const TIMEOUT_MS   = 15_000;
const CONCURRENCY  = 4;  // téléchargements en parallèle

// ─── Helpers ─────────────────────────────────────────────────────────────────

function log(msg)        { console.log(`  ${msg}`); }
function logOk(msg)      { console.log(`  \x1b[32m✓\x1b[0m ${msg}`); }
function logErr(msg)     { console.log(`  \x1b[31m✗\x1b[0m ${msg}`); }
function logInfo(msg)    { console.log(`  \x1b[36m→\x1b[0m ${msg}`); }
function logWarn(msg)    { console.log(`  \x1b[33m⚠\x1b[0m ${msg}`); }

function appendError(entry, reason) {
  const line = `[${new Date().toISOString()}] ${entry.id} | ${entry.url} | ${reason}\n`;
  fs.appendFileSync(ERRORS_LOG, line);
}

/** Télécharge une URL dans un Buffer avec timeout — retourne { buffer, contentType } */
function fetchBuffer(url, timeoutMs = TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const req = proto.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 WZ-Meta-Bot/1.0' } }, (res) => {
      // Suivi des redirections (max 5)
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        return fetchBuffer(res.headers.location, timeoutMs).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks = [];
      const contentType = res.headers['content-type'] || '';
      res.on('data', chunk => chunks.push(chunk));
      res.on('end',  () => resolve({ buffer: Buffer.concat(chunks), contentType }));
      res.on('error', reject);
    });
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error(`Timeout (${timeoutMs}ms)`));
    });
    req.on('error', reject);
  });
}

/** Optimise un Buffer image avec sharp et sauvegarde en WebP.
 *  Si sharp échoue (ex: AVIF non supporté), sauvegarde le fichier brut. */
async function processAndSave(buffer, contentType, outputPath) {
  const outputWebP = outputPath.replace(/\.(png|jpg|jpeg|gif|webp|avif)$/i, '.webp');

  try {
    const img  = sharp(buffer, { failOn: 'none' });
    const meta = await img.metadata();
    let pipeline = img;

    // Redimensionner si trop grand (garde le ratio)
    if (meta.width > IMAGE_OPTIONS.maxWidth || meta.height > IMAGE_OPTIONS.maxHeight) {
      pipeline = pipeline.resize(IMAGE_OPTIONS.maxWidth, IMAGE_OPTIONS.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    await pipeline.webp({ quality: IMAGE_OPTIONS.quality }).toFile(outputWebP);
    const stats = fs.statSync(outputWebP);
    return {
      path: outputWebP,
      size: (stats.size / 1024).toFixed(1) + ' KB',
      width: meta.width,
      height: meta.height,
      converted: true,
    };
  } catch {
    // Fallback : sauvegarder le fichier brut avec la bonne extension
    const ext  = contentType.includes('avif') ? 'avif'
               : contentType.includes('png')  ? 'png'
               : contentType.includes('webp') ? 'webp'
               : 'png';
    const rawOut = outputPath.replace(/\.(png|jpg|jpeg|gif|webp|avif)$/i, `.${ext}`);
    fs.writeFileSync(rawOut, buffer);
    const stats = fs.statSync(rawOut);
    return {
      path: rawOut,
      size: (stats.size / 1024).toFixed(1) + ' KB',
      width: null,
      height: null,
      converted: false,
    };
  }
}

/** Traite un lot d'entrées avec concurrence limitée */
async function processBatch(entries, outputDir, label) {
  let done = 0, errors = 0;
  const results = [];

  // Traitement par chunks de CONCURRENCY
  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const chunk = entries.slice(i, i + CONCURRENCY);
    await Promise.all(chunk.map(async (entry) => {
      const rawPath = path.join(outputDir, `${entry.id}.png`); // temporaire
      try {
        logInfo(`Téléchargement : ${entry.id}`);
        const { buffer, contentType } = await fetchBuffer(entry.url);
        const result = await processAndSave(buffer, contentType, rawPath);
        done++;
        const dims = result.width ? `${result.width}×${result.height}px` : 'brut';
        const tag  = result.converted ? 'WebP' : result.path.split('.').pop().toUpperCase();
        logOk(`${entry.id}  →  ${result.size}  (${dims}) [${tag}]`);
        results.push({ id: entry.id, status: 'ok', ...result });
      } catch (err) {
        errors++;
        logErr(`${entry.id}  →  ${err.message}`);
        appendError(entry, err.message);
        results.push({ id: entry.id, status: 'error', reason: err.message });
      }
    }));
  }

  return { done, errors, results };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  const args  = process.argv.slice(2);
  const typeArg = args.find(a => a.startsWith('--type=') || args[args.indexOf('--type') + 1])
    || 'all';
  const type = args.includes('--type') ? args[args.indexOf('--type') + 1] : 'all';

  const targets = type === 'all'
    ? Object.entries(CONFIG)
    : Object.entries(CONFIG).filter(([k]) => k === type);

  if (targets.length === 0) {
    console.error(`Type inconnu : "${type}". Utilisez weapons | attachments | all`);
    process.exit(1);
  }

  // Effacer l'ancien log d'erreurs
  if (fs.existsSync(ERRORS_LOG)) fs.unlinkSync(ERRORS_LOG);

  console.log('\n\x1b[1m  WZ_META — Asset Downloader\x1b[0m');
  console.log('  ─────────────────────────────────────────');
  console.log(`  Format de sortie : WebP ${IMAGE_OPTIONS.quality}%  |  Max : ${IMAGE_OPTIONS.maxWidth}×${IMAGE_OPTIONS.maxHeight}px`);
  console.log(`  Concurrence      : ${CONCURRENCY} téléchargements simultanés`);
  console.log('  ─────────────────────────────────────────\n');

  const summary = [];

  for (const [name, cfg] of targets) {
    console.log(`\x1b[1m  [ ${name.toUpperCase()} ]\x1b[0m`);

    if (!fs.existsSync(cfg.input)) {
      logWarn(`Fichier introuvable : ${cfg.input}`);
      continue;
    }

    const entries = JSON.parse(fs.readFileSync(cfg.input, 'utf-8'));
    logInfo(`${entries.length} entrée(s) à traiter → ${cfg.output}\n`);

    // Créer le dossier de sortie si nécessaire
    fs.mkdirSync(cfg.output, { recursive: true });

    const { done, errors, results } = await processBatch(entries, cfg.output, name);
    summary.push({ type: name, total: entries.length, done, errors });

    console.log(`\n  ┌ ${name} ─────────────────────`);
    console.log(`  │ ✓ Réussi  : ${done}`);
    console.log(`  │ ✗ Erreurs : ${errors}`);
    console.log(`  └────────────────────────────\n`);
  }

  // Rapport final
  const timestamp = new Date().toISOString();
  const report = summary.map(s =>
    `[${timestamp}] ${s.type} — ${s.done}/${s.total} OK, ${s.errors} erreurs`
  ).join('\n');
  fs.writeFileSync(SUMMARY_LOG, report + '\n');

  if (summary.some(s => s.errors > 0)) {
    logWarn(`Certaines images ont échoué. Consultez : scripts/errors.log`);
  }

  console.log('  \x1b[32m✓ Terminé.\x1b[0m Rapport : scripts/summary.log\n');
}

run().catch(err => {
  console.error('\n  \x1b[31mErreur fatale :\x1b[0m', err.message);
  process.exit(1);
});
