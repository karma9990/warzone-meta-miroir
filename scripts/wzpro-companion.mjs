import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { tmpdir, setPriority, constants as osConstants } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createWorker } from 'tesseract.js';

const execFileAsync = promisify(execFile);
const DEFAULT_POLL_MS = 5000;
const GAME_PROCESS_NAMES = new Set([
  'cod',
  'cod22-cod',
  'cod23-cod',
  'cod24-cod',
  'modernwarfare',
  'modernwarfareii',
  'modernwarfareiii',
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
  return GAME_PROCESS_NAMES.has(String(name || '').toLowerCase());
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

function parseWarzoneEndGame(text) {
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
  };
}

function detectMatchSignal(text) {
  const normalized = text.toLowerCase();
  if (/\b(match summary|after action report|scoreboard|placement|victory|defeat|rapport|statistiques|victoire)\b/.test(normalized)) {
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

async function uploadEntry(site, token, entry) {
  const response = await fetch(`${site.replace(/\/$/, '')}/api/companion/stats`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ entry }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Upload failed (${response.status})`);
  }
  return data;
}

const site = argValue('site', 'http://localhost:3000');
const token = argValue('token');
const pollMs = Math.max(3000, Number(argValue('poll_ms', String(DEFAULT_POLL_MS))) || DEFAULT_POLL_MS);
const highlightKills = Math.max(1, Number(argValue('highlight_kills', '4')) || 4);
const highlightDamage = Math.max(0, Number(argValue('highlight_damage', '6000')) || 6000);

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
let state = 'waiting-game';
let lastStatus = '';

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
        // Screen still changing (active gameplay): skip the heavy OCR entirely.
        prevFrameHash = imageHash;
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

      const entry = signal === 'summary' ? parseWarzoneEndGame(text) : null;
      if (!entry) {
        process.stdout.write('.');
        await sleep(pollMs);
        continue;
      }

      const uploadKey = `${entry.kills}:${entry.deaths}:${entry.damage}:${entry.placement}:${entry.won}`;
      if (uploadKey === lastUploadedKey) {
        await sleep(pollMs);
        continue;
      }
      lastUploadedKey = uploadKey;

      const result = await uploadEntry(site, token, entry);
      state = 'uploaded-summary';
      console.log(`\nUploaded game #${result.count}: ${entry.kills} kills, ${entry.damage} damage, place #${entry.placement}`);

      const reason = highlightReason(entry);
      if (reason) {
        // Structured line consumed by the desktop app to trigger a clip (premium).
        // deaths is sent for forward use (K/D labelling) even though the app ignores it today.
        console.log(`HIGHLIGHT ${JSON.stringify({ reason, kills: entry.kills, deaths: entry.deaths, damage: entry.damage, placement: entry.placement, won: entry.won })}`);
      }
    } catch (error) {
      console.log(`\nCompanion waiting: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
    await sleep(pollMs);
  }
} finally {
  await worker.terminate();
}
