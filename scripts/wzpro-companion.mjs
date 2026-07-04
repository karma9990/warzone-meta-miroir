import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir, setPriority, constants as osConstants } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createWorker } from 'tesseract.js';

const execFileAsync = promisify(execFile);
const DEFAULT_POLL_MS = 5000;
const UPLOAD_ATTEMPTS = 3;
const GAME_PROCESS_NAMES = new Set([
  'cod',
  'cod22-cod',
  'cod23-cod',
  'cod24-cod',
  'cod_launcher',
  'modernwarfare',
  'modernwarfareii',
  'modernwarfareiii',
  'blackops6',
  'bo6',
  's1_mp64_ship',
]);
const SCREENSHOT_PATH = path.join(tmpdir(), 'wzpro-companion-warzone-window.png');

function argValue(name, fallback = '') {
  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1 && process.argv[index + 1]) return process.argv[index + 1];
  return process.env[`WZPRO_${name.toUpperCase()}`] || fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function powershell(script) {
  const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-Command', script], {
    windowsHide: true,
    maxBuffer: 1024 * 1024,
  });
  return stdout.trim();
}

function parseJsonOutput(output, fallback = null) {
  if (!output) return fallback;
  try {
    return JSON.parse(output);
  } catch {
    return fallback;
  }
}

function isWarzoneProcessName(name) {
  const normalized = String(name || '').toLowerCase().replace(/\.exe$/, '');
  return GAME_PROCESS_NAMES.has(normalized);
}

async function getActiveWindowContext() {
  const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WzproWin32 {
  [DllImport("user32.dll")]
  public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")]
  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll")]
  public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
}
public struct RECT {
  public int Left;
  public int Top;
  public int Right;
  public int Bottom;
}
"@
$handle = [WzproWin32]::GetForegroundWindow()
[uint32]$pidNumber = 0
[void][WzproWin32]::GetWindowThreadProcessId($handle, [ref]$pidNumber)
$process = Get-Process -Id $pidNumber -ErrorAction SilentlyContinue
$rect = New-Object RECT
[void][WzproWin32]::GetWindowRect($handle, [ref]$rect)
if ($process) {
  [pscustomobject]@{
    processName = $process.ProcessName
    title = $process.MainWindowTitle
    left = $rect.Left
    top = $rect.Top
    width = [Math]::Max(0, $rect.Right - $rect.Left)
    height = [Math]::Max(0, $rect.Bottom - $rect.Top)
  } | ConvertTo-Json -Compress
}
`;
  return parseJsonOutput(await powershell(script), null);
}

async function getRunningGameProcesses() {
  const script = `
$names = @(${Array.from(GAME_PROCESS_NAMES).map((name) => `'${name.replaceAll("'", "''")}'`).join(',')})
Get-Process -ErrorAction SilentlyContinue |
  Where-Object { $names -contains $_.ProcessName.ToLowerInvariant() } |
  Select-Object -First 8 ProcessName, MainWindowTitle |
  ConvertTo-Json -Compress
`;
  const result = parseJsonOutput(await powershell(script), []);
  if (!result) return [];
  return Array.isArray(result) ? result : [result];
}

// The desktop app captures the focused game window natively (no PowerShell) and
// writes it here. Prefer that fresh frame to avoid spawning PowerShell each poll.
function nativeScreenshotIfFresh(maxAgeMs) {
  try {
    if (!existsSync(SCREENSHOT_PATH)) return '';
    if (Date.now() - statSync(SCREENSHOT_PATH).mtimeMs <= maxAgeMs) return SCREENSHOT_PATH;
  } catch {
    // ignore
  }
  return '';
}

async function captureActiveGameWindow(context) {
  const left = Math.max(0, Number(context.left) || 0);
  const top = Math.max(0, Number(context.top) || 0);
  const width = Math.max(1, Number(context.width) || 0);
  const height = Math.max(1, Number(context.height) || 0);
  if (width < 640 || height < 360) return '';

  const script = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$bounds = New-Object System.Drawing.Rectangle(${left}, ${top}, ${width}, ${height})
$bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$path = '${SCREENSHOT_PATH.replaceAll("'", "''")}'
$bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
Write-Output $path
`;
  const result = await powershell(script);
  return result && existsSync(result) ? result : '';
}

function extractAfter(text, keywords) {
  const lines = text.toLowerCase().split('\n');
  for (const line of lines) {
    for (const keyword of keywords) {
      if (line.includes(keyword)) {
        const match = line.match(/\d+/g);
        if (match) return parseInt(match[match.length - 1], 10);
      }
    }
  }

  const full = text.toLowerCase();
  for (const keyword of keywords) {
    const index = full.indexOf(keyword);
    if (index !== -1) {
      const after = full.slice(index, index + 44);
      const match = after.match(/\d+/);
      if (match) return parseInt(match[0], 10);
    }
  }
  return null;
}

function numberTokens(line) {
  return [...String(line || '').matchAll(/(?<![a-zA-Z])\d{1,6}(?![a-zA-Z])/g)]
    .map((match) => Number.parseInt(match[0], 10))
    .filter((value) => Number.isFinite(value));
}

function normalizePlayerText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\[[^\]]+\]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function playerLineScore(line, targetName) {
  const target = normalizePlayerText(targetName);
  if (!target || target.length < 3) return 0;
  const normalizedLine = normalizePlayerText(line);
  if (!normalizedLine) return 0;
  if (normalizedLine.includes(target)) return 100;
  if (target.includes(normalizedLine) && normalizedLine.length >= 4) return 85;

  const chunks = target.match(/[a-z0-9]{3,}/g) || [];
  const matched = chunks.filter((chunk) => normalizedLine.includes(chunk)).length;
  if (chunks.length && matched) return Math.min(80, Math.round((matched / chunks.length) * 80));
  return 0;
}

function scoreboardStatsFromNumbers(nums) {
  const candidates = [];
  if (nums.length >= 6) {
    const [score, eliminations, kills, assists, deaths, damage] = nums.slice(-6);
    candidates.push({ score, eliminations, kills, assists, deaths, damage });
  }
  if (nums.length >= 5) {
    // Sometimes OCR misses the score column but still reads the stat columns.
    const [eliminations, kills, assists, deaths, damage] = nums.slice(-5);
    candidates.push({ score: 0, eliminations, kills, assists, deaths, damage });
  }

  return candidates.find((stats) => stats.score >= 0 && stats.score <= 200000
    && stats.eliminations >= 0 && stats.eliminations <= 200
    && stats.kills >= 0 && stats.kills <= 100
    && stats.assists >= 0 && stats.assists <= 60
    && stats.deaths >= 0 && stats.deaths <= 80
    && stats.damage >= 0 && stats.damage <= 100000) || null;
}

function looksLikeScoreboardEndGame(text) {
  const normalized = String(text || '').toLowerCase();
  const anchors = [
    'post match summary',
    'match summary',
    'scoreboard',
    'squad totals',
    'eliminations',
    'kills',
    'assists',
    'deaths',
    'damage',
    'battle royale',
  ].filter((keyword) => normalized.includes(keyword)).length;

  if (anchors >= 2 && /\b(score|scoreboard|squad totals|post match summary|battle royale)\b/.test(normalized)) return true;

  // OCR can mangle the header text, but the end-game scoreboard still exposes rows
  // with the same trailing numeric columns: score, eliminations, kills, assists,
  // deaths, damage. Use that as a visual-layout fallback for screens like the refs.
  return String(text || '').split(/\r?\n/).some((line) => {
    if (/squad\s+totals/i.test(line)) return false;
    const nums = numberTokens(line);
    return scoreboardStatsFromNumbers(nums) != null;
  });
}

function parseScoreboardEndGame(text, targetName = '') {
  if (!looksLikeScoreboardEndGame(text)) return null;

  const candidates = [];
  for (const rawLine of String(text || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || /squad\s+totals|total\s+team|post match|match summary|scoreboard/i.test(line)) continue;

    const nums = numberTokens(line);
    const stats = scoreboardStatsFromNumbers(nums);
    if (!stats) continue;

    const playerScore = playerLineScore(line, targetName);
    const noTargetName = !normalizePlayerText(targetName);
    const hasHeader = /\b(score|scoreboard|squad totals|post match summary|battle royale|eliminations|kills|damage)\b/i.test(text);
    const confidence = Math.min(100, 45 + (hasHeader ? 20 : 0) + (playerScore ? 30 : noTargetName ? 15 : 0) + (stats.damage > 0 ? 5 : 0));
    candidates.push({ stats, line, confidence, playerScore });
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => (b.playerScore - a.playerScore) || (b.confidence - a.confidence));
  const picked = candidates[0];
  if (targetName && picked.playerScore === 0 && candidates.length > 1) {
    // If we know the player name but OCR cannot match it, avoid guessing another
    // teammate row when multiple valid rows are present.
    return null;
  }

  return {
    id: `companion-${Date.now()}`,
    date: new Date().toLocaleDateString('en-GB'),
    kills: picked.stats.kills,
    deaths: picked.stats.deaths,
    damage: picked.stats.damage,
    placement: 0,
    won: /\b(victory|victoire|winner|gagne|win)\b/i.test(text),
    _confidence: picked.confidence,
    _matchedPlayer: picked.playerScore > 0,
    _sourceLine: picked.line,
    _method: 'scoreboard',
  };
}

function parseWarzoneEndGame(text, targetName = '') {
  const scoreboardEntry = parseScoreboardEndGame(text, targetName);
  if (scoreboardEntry) return scoreboardEntry;

  const normalized = text.toLowerCase();
  const looksLikeEndGame = [
    'kills',
    'damage',
    'placement',
    'scoreboard',
    'match summary',
    'victory',
    'defeat',
    'eliminations',
    'degats',
    'victoire',
    'after action report',
    'rapport',
    'statistiques',
    'stats',
  ].filter((keyword) => normalized.includes(keyword)).length >= 2;

  if (!looksLikeEndGame) return null;

  const kills = extractAfter(text, ['kills', 'kill', 'eliminations']);
  const deaths = extractAfter(text, ['deaths', 'death', 'morts', 'mort']);
  const damage = extractAfter(text, ['damage', 'degats', 'dmg']);
  const placement = extractAfter(text, ['place', 'placement', 'rank', 'position', '#']);
  const found = [kills, deaths, damage, placement].filter((value) => value !== null).length;

  if (found < 2) return null;

  // OCR can merge digits or read a neighbouring scoreboard row, producing impossible
  // values. Clamp to physical Warzone ceilings so garbage never triggers a false
  // highlight (e.g. a spurious 'bigdamage') nor pollutes the dedup key.
  const clamp = (value, max, fallback) => (value != null && value >= 0 && value <= max ? value : fallback);

  return {
    id: `companion-${Date.now()}`,
    date: new Date().toLocaleDateString('en-GB'),
    kills: clamp(kills, 60, 0),
    deaths: clamp(deaths, 40, 1),
    damage: clamp(damage, 30000, 0),
    placement: clamp(placement, 200, 0),
    won: /\b(victory|victoire|winner|gagne|win)\b/i.test(text),
    _confidence: 70,
    _matchedPlayer: false,
    _sourceLine: '',
    _method: 'keyword',
  };
}

function detectMatchSignal(text) {
  const normalized = text.toLowerCase();
  if (looksLikeScoreboardEndGame(text) || /\b(post match summary|match summary|after action report|scoreboard|placement|victory|defeat|rapport|statistiques|victoire)\b/.test(normalized)) {
    return 'summary';
  }
  if (/\b(deploy|deployment|warmup|gulag|resurgence|loadout|circle closing|zone|redeploy|deploiement)\b/.test(normalized)) {
    return 'match';
  }
  if (/\b(play|weapons|operators|battle pass|store|lobby|salon|armurerie)\b/.test(normalized)) {
    return 'lobby';
  }
  return 'unknown';
}

class UploadError extends Error {
  constructor(message, status, transient) {
    super(message);
    this.status = status;
    this.transient = transient;
  }
}

async function uploadEntry(site, token, entry) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  let response;
  try {
    response = await fetch(`${site.replace(/\/$/, '')}/api/companion/stats`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ entry }),
      signal: controller.signal,
    });
  } catch (error) {
    // Network failure or timeout — transient, worth retrying.
    const message = error && error.name === 'AbortError' ? 'Upload timed out' : (error instanceof Error ? error.message : 'Network error');
    throw new UploadError(message, 0, true);
  } finally {
    clearTimeout(timer);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // 5xx and 429 are transient; 4xx (bad token/entry) will never succeed on retry.
    const transient = response.status >= 500 || response.status === 429;
    throw new UploadError(data.error || `Upload failed (${response.status})`, response.status, transient);
  }
  return data;
}

const site = argValue('site', 'http://localhost:3000');
const token = argValue('token');
const pollMs = Math.max(3000, Number(argValue('poll_ms', String(DEFAULT_POLL_MS))) || DEFAULT_POLL_MS);
const playerName = argValue('player', '');
const debugDir = argValue('debug_dir', path.join(tmpdir(), 'wzpro-companion-debug'));
const highlightKills = Math.max(1, Number(argValue('highlight_kills', '4')) || 4);
const highlightDamage = Math.max(0, Number(argValue('highlight_damage', '6000')) || 6000);
const uploadAttempts = Math.max(1, Number(argValue('upload_attempts', String(UPLOAD_ATTEMPTS))) || UPLOAD_ATTEMPTS);

// Classify an end-game entry into the single most notable clip-worthy reason.
// Reasons are checked best-first and the first match wins, so 'bigdamage' only fires
// when nothing more prestigious did (e.g. a high-damage loss outside the top 3).
// Only end-of-game stats are available (the engine intentionally skips OCR during
// live gameplay), so mid-match events like gulag/clutch are out of scope here.
function highlightReason(entry) {
  if (entry.won && entry.kills >= highlightKills * 2) return 'dominant';
  if (entry.won) return 'win';
  if (entry.kills >= highlightKills) return 'multikill';
  if (entry.placement > 0 && entry.placement <= 3) return 'top3';
  // Require some kills so a damage-only OCR misread cannot drive a highlight alone.
  if (highlightDamage > 0 && entry.kills > 0 && entry.damage >= highlightDamage) return 'bigdamage';
  return '';
}

function liveHighlightReason(text) {
  const normalized = String(text || '').toLowerCase();
  if (!normalized.trim()) return '';

  const deathPatterns = [
    /\bkilled\s+by\b/i,
    /\byou\s+died\b/i,
    /\byou\s+are\s+dead\b/i,
    /\bsquad\s+eliminated\b/i,
    /\beliminated\s+by\b/i,
    /\bdowned\s+by\b/i,
    /\bdeath\s+cam\b/i,
    /\bgulag\b/i,
    /\bredeploying\b/i,
  ];
  if (deathPatterns.some((pattern) => pattern.test(normalized))) return 'death';

  const killPatterns = [
    /\+\s*\d+\s*xp[^\n]{0,28}\b(elimination|eliminated|downed|kill)\b/i,
    /\b(elimination|eliminated|enemy\s+downed|team\s+wiped|squad\s+wiped|longshot|headshot|revenge)\b/i,
    /\b(avenger|bloodthirsty|merciless|kingslayer)\b/i,
  ];
  if (killPatterns.some((pattern) => pattern.test(normalized))) return 'kill';

  return '';
}

function publicEntry(entry) {
  return {
    id: entry.id,
    date: entry.date,
    kills: entry.kills,
    deaths: entry.deaths,
    damage: entry.damage,
    placement: entry.placement,
    won: entry.won,
  };
}

function entryKey(entry) {
  return `${entry.kills}:${entry.deaths}:${entry.damage}:${entry.placement}:${entry.won}`;
}

function writeDebugCapture(screenshot, text, entry, signal, imageHash) {
  try {
    mkdirSync(debugDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const base = path.join(debugDir, `scoreboard_${stamp}_${imageHash.slice(0, 8)}`);
    copyFileSync(screenshot, `${base}.png`);
    writeFileSync(`${base}.txt`, text, 'utf8');
    writeFileSync(`${base}.json`, JSON.stringify({
      signal,
      playerName,
      confidence: entry?._confidence ?? 0,
      matchedPlayer: entry?._matchedPlayer ?? false,
      method: entry?._method ?? '',
      sourceLine: entry?._sourceLine ?? '',
      entry: entry ? publicEntry(entry) : null,
    }, null, 2), 'utf8');
    console.log(`\nScoreboard debug saved: ${base}`);
  } catch (error) {
    console.log(`\nScoreboard debug save failed: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
}

if (!token) {
  console.error('Missing companion token. Copy the command from your WZPRO account page.');
  process.exit(1);
}

console.log('WZPRO Companion started.');
console.log('This visible tool watches for the active Call of Duty / Warzone window.');
console.log('It ignores browser/video windows and captures only the active game window.');
console.log('It uploads stats only when OCR detects a Warzone end-of-game summary.');
console.log(`Site: ${site}`);
console.log(`Interval: ${pollMs}ms`);

// Run below normal priority so the engine never steals CPU from the game.
try {
  setPriority(osConstants?.priority?.PRIORITY_BELOW_NORMAL ?? 10);
} catch {
  // setPriority may be unavailable/denied; ignore.
}

const worker = await createWorker('eng');
let lastUploadedKey = '';
let lastOcrHash = '';
let prevFrameHash = '';
let pendingConfirmedKey = '';
let pendingConfirmedEntry = null;
let pendingConfirmedReads = 0;
let state = 'waiting-game';
let lastStatus = '';
let lastLiveOcrAt = 0;
let lastLiveHighlightKey = '';
let lastLiveHighlightAt = 0;
const liveOcrIntervalMs = Math.max(3500, Math.min(7000, pollMs));
const liveHighlightCooldownMs = 8000;

function status(message) {
  if (message !== lastStatus) {
    console.log(`\n${message}`);
    lastStatus = message;
  }
}

try {
  while (true) {
    try {
      const activeWindow = await getActiveWindowContext();
      const activeName = activeWindow?.processName || '';
      if (!isWarzoneProcessName(activeName)) {
        const runningGames = await getRunningGameProcesses();
        state = runningGames.length ? 'waiting-focus' : 'waiting-game';
        status(runningGames.length
          ? `Warzone is open, waiting for the game window to be active. Current window: ${activeName || 'unknown'}`
          : 'Waiting for Call of Duty / Warzone to open.'
        );
        // No game at all: poll slower to stay light in the background.
        await sleep(runningGames.length ? pollMs : pollMs * 2);
        continue;
      }

      status(`Watching active game window: ${activeName}${activeWindow.title ? ` - ${activeWindow.title}` : ''}`);
      // Prefer the app's native capture; fall back to PowerShell only if it is stale.
      let screenshot = nativeScreenshotIfFresh(pollMs * 1.5);
      if (!screenshot) screenshot = await captureActiveGameWindow(activeWindow);
      if (!screenshot) {
        await sleep(pollMs);
        continue;
      }

      const bytes = readFileSync(screenshot);
      const imageHash = createHash('sha256').update(bytes).digest('hex');
      if (imageHash === lastOcrHash) {
        // Same screen already analyzed (e.g. a static menu): no OCR.
        await sleep(pollMs);
        continue;
      }
      if (imageHash !== prevFrameHash) {
        // Screen still changing (active gameplay): run a light periodic OCR pass for
        // live kill/death highlights, then skip the heavier scoreboard upload flow.
        prevFrameHash = imageHash;
        const now = Date.now();
        if (now - lastLiveOcrAt >= liveOcrIntervalMs) {
          lastLiveOcrAt = now;
          const { data } = await worker.recognize(screenshot);
          const liveText = data.text || '';
          const liveReason = liveHighlightReason(liveText);
          if (liveReason) {
            const liveKey = `${liveReason}:${createHash('sha1').update(liveText.toLowerCase().replace(/\s+/g, ' ').slice(0, 240)).digest('hex').slice(0, 12)}`;
            if (liveKey !== lastLiveHighlightKey || now - lastLiveHighlightAt >= liveHighlightCooldownMs) {
              lastLiveHighlightKey = liveKey;
              lastLiveHighlightAt = now;
              console.log(`HIGHLIGHT ${JSON.stringify({ reason: liveReason, live: true, source: 'live-ocr' })}`);
            }
          }
        }
        process.stdout.write('~');
        await sleep(pollMs);
        continue;
      }
      // Frame stable across two polls -> likely a menu / end-game screen: safe to OCR.
      lastOcrHash = imageHash;

      const { data } = await worker.recognize(screenshot);
      const text = data.text || '';
      const signal = detectMatchSignal(text);
      if (signal === 'match' && state !== 'in-match') {
        state = 'in-match';
        status('Match detected. Waiting for the end-game summary.');
      } else if (signal === 'lobby' && state !== 'lobby') {
        state = 'lobby';
        status('Lobby/menu detected. No upload.');
      }

      const entry = signal === 'summary' ? parseWarzoneEndGame(text, playerName) : null;
      if (!entry) {
        process.stdout.write('.');
        await sleep(pollMs);
        continue;
      }

      writeDebugCapture(screenshot, text, entry, signal, imageHash);

      if ((entry._confidence || 0) < 75) {
        console.log(`\nScoreboard detected but confidence is low (${entry._confidence || 0}). Waiting for a clearer read.`);
        lastOcrHash = '';
        await sleep(pollMs);
        continue;
      }

      const uploadKey = entryKey(entry);
      if (uploadKey === lastUploadedKey) {
        await sleep(pollMs);
        continue;
      }

      if (uploadKey === pendingConfirmedKey) {
        pendingConfirmedReads++;
      } else {
        pendingConfirmedKey = uploadKey;
        pendingConfirmedEntry = entry;
        pendingConfirmedReads = 1;
        console.log(`\nScoreboard read 1/2: ${entry.kills} kills, ${entry.deaths} deaths, ${entry.damage} damage${entry._matchedPlayer ? ' (player matched)' : ''}.`);
        lastOcrHash = '';
        await sleep(pollMs);
        continue;
      }

      if (pendingConfirmedReads < 2) {
        lastOcrHash = '';
        await sleep(pollMs);
        continue;
      }

      const uploadEntryPayload = publicEntry(pendingConfirmedEntry || entry);

      // Retry transient upload failures; only mark the game uploaded on success so a
      // network blip no longer drops the stats permanently. console.log (not status)
      // is used so repeated failures across polls are never deduped away.
      let result = null;
      let permanentFailure = false;
      for (let attempt = 1; attempt <= uploadAttempts; attempt++) {
        try {
          result = await uploadEntry(site, token, uploadEntryPayload);
          break;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'unknown error';
          const transient = !(error instanceof UploadError) || error.transient;
          if (!transient) {
            console.log(`\nUpload rejected: ${message}. Not retrying (check token/account).`);
            permanentFailure = true;
            break;
          }
          if (attempt < uploadAttempts) {
            console.log(`\nUpload failed (try ${attempt}/${uploadAttempts}): ${message}. Retrying...`);
            await sleep(1000 * attempt);
          } else {
            console.log(`\nUpload failed (try ${attempt}/${uploadAttempts}): ${message}. Stats not saved this time.`);
          }
        }
      }
      if (result === null) {
        // Permanent rejection: mark the game done so we stop hammering the endpoint.
        // Transient failure: re-OCR the still-visible summary so a later poll retries.
        if (permanentFailure) lastUploadedKey = uploadKey;
        else lastOcrHash = '';
        await sleep(pollMs);
        continue;
      }
      lastUploadedKey = uploadKey;
      pendingConfirmedKey = '';
      pendingConfirmedEntry = null;
      pendingConfirmedReads = 0;
      state = 'uploaded-summary';
      console.log(`\nUploaded game #${result.count}: ${uploadEntryPayload.kills} kills, ${uploadEntryPayload.damage} damage, place #${uploadEntryPayload.placement}`);

      const reason = highlightReason(uploadEntryPayload);
      if (reason) {
        // Structured line consumed by the desktop app to trigger a clip (premium).
        // deaths is sent for forward use (K/D labelling) even though the app ignores it today.
        console.log(`HIGHLIGHT ${JSON.stringify({ reason, kills: uploadEntryPayload.kills, deaths: uploadEntryPayload.deaths, damage: uploadEntryPayload.damage, placement: uploadEntryPayload.placement, won: uploadEntryPayload.won })}`);
      }
    } catch (error) {
      console.log(`\nCompanion waiting: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
    await sleep(pollMs);
  }
} finally {
  await worker.terminate();
}
