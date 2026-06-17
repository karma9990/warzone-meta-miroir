'use client';

import { useState, useRef } from 'react';
import type { ProfileStatsEntry } from '@/lib/profileStore';

type GameEntry = ProfileStatsEntry;

const STORAGE_KEY = 'wzmeta_stats';
const BRAND_BLUE = '#163cff';
const BRAND_BLUE_SOFT = 'rgba(22,60,255,0.08)';

function loadEntries(): GameEntry[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function saveEntries(entries: GameEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

async function syncEntries(entries: GameEntry[]) {
  await fetch('/api/account/stats', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entries }),
  }).catch(() => undefined);
}

function avg(arr: number[]) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function extractAfter(text: string, keywords: string[]): number | null {
  const lines = text.toLowerCase().split('\n');
  for (const line of lines) {
    for (const kw of keywords) {
      if (line.includes(kw)) {
        const match = line.match(/\d+/g);
        if (match) return parseInt(match[match.length - 1]);
      }
    }
  }
  const full = text.toLowerCase();
  for (const kw of keywords) {
    const idx = full.indexOf(kw);
    if (idx !== -1) {
      const after = full.slice(idx, idx + 30);
      const match = after.match(/\d+/);
      if (match) return parseInt(match[0]);
    }
  }
  return null;
}

export default function StatsTracker({ initialEntries = [], syncToAccount = false, initialActivisionId = '', locale = 'en' }: {
  initialEntries?: GameEntry[];
  syncToAccount?: boolean;
  initialActivisionId?: string;
  locale?: string;
}) {
  const t = locale === 'fr'
    ? {
        scanning: 'Scan en cours...',
        noStats: 'Aucune stat detectee. Remplis manuellement.',
        ocrError: 'Erreur OCR. Remplis manuellement.',
        performanceTracking: 'SUIVI PERFORMANCE',
        statsTracker: 'TRACKER STATS',
        cancel: 'ANNULER',
        addGame: '+ AJOUTER UNE PARTIE',
        activisionIdentity: 'IDENTITE ACTIVISION',
        noActivision: 'Aucun ID Activision lie',
        activisionDesc: 'Les stats Activision ne sont plus publiques. WZPRO utilise cet ID comme identite joueur, puis construit ton vrai suivi avec les parties importees et les captures.',
        editId: 'MODIFIER ID',
        addId: 'AJOUTER ID',
        kdRatio: 'RATIO K/D',
        killsGame: 'ELIMS / PARTIE',
        damageGame: 'DEGATS / PARTIE',
        winRate: 'TAUX VICTOIRE',
        games: 'PARTIES',
        importScreenshot: 'IMPORTER UNE CAPTURE',
        uploadDesc: 'Envoie un ecran de fin de game. WZPRO lit les elims, morts, degats et placement, puis tu valides.',
        scan: 'SCAN...',
        upload: 'IMPORTER',
        manualEntry: 'SAISIE MANUELLE',
        kills: 'ELIMS',
        deaths: 'MORTS',
        damage: 'DEGATS',
        placement: 'PLACEMENT',
        win: 'VICTOIRE',
        yes: 'OUI',
        no: 'NON',
        save: 'SAUVER',
        noGames: 'AUCUNE PARTIE - CLIQUE SUR + AJOUTER UNE PARTIE',
        date: 'DATE',
        place: 'PLACE',
        synced: 'DONNEES SYNCHRONISEES AU COMPTE',
        local: 'DONNEES STOCKEES EN LOCAL',
        averages: 'MOYENNES SUR LES 20 DERNIERES PARTIES',
      }
    : {
        scanning: 'Scanning...',
        noStats: 'No stats detected. Fill in manually.',
        ocrError: 'OCR error. Fill in manually.',
        performanceTracking: 'PERFORMANCE TRACKING',
        statsTracker: 'STATS TRACKER',
        cancel: 'CANCEL',
        addGame: '+ ADD A GAME',
        activisionIdentity: 'ACTIVISION IDENTITY',
        noActivision: 'No Activision ID linked',
        activisionDesc: 'Activision stats are not public anymore. WZPRO uses this ID as your player identity, then builds your real tracker from imported games and screenshots.',
        editId: 'EDIT ID',
        addId: 'ADD ID',
        kdRatio: 'K/D RATIO',
        killsGame: 'KILLS / GAME',
        damageGame: 'DAMAGE / GAME',
        winRate: 'WIN RATE',
        games: 'GAMES',
        importScreenshot: 'IMPORT SCREENSHOT',
        uploadDesc: 'Upload an end-of-game screen. WZPRO reads kills, deaths, damage and placement, then you validate.',
        scan: 'SCAN...',
        upload: 'UPLOAD',
        manualEntry: 'MANUAL ENTRY',
        kills: 'KILLS',
        deaths: 'DEATHS',
        damage: 'DAMAGE',
        placement: 'PLACEMENT',
        win: 'WIN',
        yes: 'YES',
        no: 'NO',
        save: 'SAVE',
        noGames: 'NO GAMES - CLICK + ADD A GAME',
        date: 'DATE',
        place: 'PLACE',
        synced: 'DATA SYNCED TO ACCOUNT',
        local: 'DATA STORED LOCALLY',
        averages: 'AVERAGES OVER LAST 20 GAMES',
      };
  const [entries, setEntries] = useState<GameEntry[]>(() => initialEntries.length ? initialEntries : loadEntries());
  const [form, setForm] = useState({ kills: '', deaths: '', damage: '', placement: '', won: false });
  const [adding, setAdding] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrHint, setOcrHint] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleOCR = async (file: File) => {
    setOcrLoading(true);
    setOcrHint(t.scanning);
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      const kills     = extractAfter(text, ['kills', 'kill', 'eliminations']);
      const deaths    = extractAfter(text, ['deaths', 'death', 'morts', 'mort']);
      const damage    = extractAfter(text, ['damage', 'degats', 'dmg']);
      const placement = extractAfter(text, ['place', 'placement', 'rank', 'position', '#']);

      setForm(f => ({
        ...f,
        kills:     kills     !== null ? String(kills)     : f.kills,
        deaths:    deaths    !== null ? String(deaths)    : f.deaths,
        damage:    damage    !== null ? String(damage)    : f.damage,
        placement: placement !== null ? String(placement) : f.placement,
      }));

      const found = [kills, deaths, damage, placement].filter(v => v !== null).length;
      setOcrHint(found > 0
        ? `${found}/4 ${locale === 'fr' ? 'champs detectes automatiquement - verifie et corrige si besoin.' : 'fields auto-detected - verify and correct if needed.'}`
        : t.noStats);
    } catch {
      setOcrHint(t.ocrError);
    } finally {
      setOcrLoading(false);
    }
  };

  const addEntry = () => {
    const entry: GameEntry = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('en-GB'),
      kills: parseInt(form.kills) || 0,
      deaths: parseInt(form.deaths) || 1,
      damage: parseInt(form.damage) || 0,
      placement: parseInt(form.placement) || 0,
      won: form.won,
    };
    const updated = [entry, ...entries];
    setEntries(updated);
    saveEntries(updated);
    if (syncToAccount) void syncEntries(updated);
    setForm({ kills: '', deaths: '', damage: '', placement: '', won: false });
    setOcrHint('');
    setAdding(false);
  };

  const removeEntry = (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    saveEntries(updated);
    if (syncToAccount) void syncEntries(updated);
  };

  const last20 = entries.slice(0, 20);
  const kd = avg(last20.map(e => e.kills / e.deaths));
  const avgDmg = avg(last20.map(e => e.damage));
  const avgKills = avg(last20.map(e => e.kills));
  const winRate = last20.length ? (last20.filter(e => e.won).length / last20.length) * 100 : 0;
  const kdColor = kd >= 2 ? BRAND_BLUE : kd >= 1 ? '#ffcc00' : '#ff4455';

  return (
    <div className="border border-black/12 rounded mb-8 overflow-hidden font-mono">
      <div className="px-6 py-5 border-b border-black/10 bg-black/2 flex justify-between items-center">
        <div>
          <div className="text-xs tracking-normal opacity-40 mb-1">{t.performanceTracking}</div>
          <div className="text-base font-bold tracking-normal">{t.statsTracker}</div>
        </div>
        <button type="button" onClick={() => { setAdding(a => !a); setOcrHint(''); }}
          className="font-mono text-xs tracking-normal cursor-pointer rounded-sm"
          style={{
            padding: '6px 16px',
            border: `1px solid ${adding ? 'rgba(255,70,70,0.4)' : BRAND_BLUE}`,
            background: adding ? 'rgba(255,70,70,0.06)' : BRAND_BLUE_SOFT,
            color: adding ? 'rgba(255,80,80,0.9)' : BRAND_BLUE,
          }}
        >
          {adding ? `X ${t.cancel}` : t.addGame}
        </button>
      </div>

      <div className="px-6 py-4 border-b border-black/8 bg-black/[0.015]">
        <div className="grid gap-3 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] md:items-center">
          <div>
            <div className="text-xs tracking-normal opacity-40 mb-1">{t.activisionIdentity}</div>
            <div className="text-sm font-bold tracking-normal">
              {initialActivisionId || t.noActivision}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="m-0 flex-1 min-w-[220px] text-xs leading-relaxed opacity-55">
              {t.activisionDesc}
            </p>
            <a href="#public-profile-settings"
              className="font-mono text-xs tracking-normal rounded-sm no-underline"
              style={{
                padding: '6px 12px',
                border: `1px solid ${BRAND_BLUE}`,
                background: initialActivisionId ? 'transparent' : BRAND_BLUE_SOFT,
                color: BRAND_BLUE,
                whiteSpace: 'nowrap',
              }}
            >
              {initialActivisionId ? t.editId : t.addId}
            </a>
          </div>
        </div>
      </div>

      {/* Stats summary */}
      {entries.length > 0 && (
        <div className="grid grid-cols-4 border-b border-black/8">
          {[
            { label: t.kdRatio, value: kd.toFixed(2), color: kdColor },
            { label: t.killsGame, value: avgKills.toFixed(1), color: 'inherit' },
            { label: t.damageGame, value: Math.round(avgDmg).toLocaleString(), color: 'inherit' },
            { label: t.winRate, value: `${winRate.toFixed(0)}%`, color: winRate >= 20 ? BRAND_BLUE : winRate >= 10 ? '#ffcc00' : 'inherit' },
          ].map((s, i) => (
            <div key={s.label} className="p-4 text-center" style={{ borderRight: i < 3 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
              <div className="text-xs tracking-normal opacity-35 mb-1.5">{s.label}</div>
              <div className="text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs opacity-30 mt-0.5">{last20.length} {t.games}</div>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {adding && (
        <div className="px-6 py-5 border-b border-black/8 bg-[rgba(0,255,136,0.02)]">
          {/* OCR upload */}
          <div className="mb-4 p-3 border border-dashed border-black/15 rounded-sm flex items-center gap-4">
            <div className="flex-1">
              <div className="text-xs font-bold tracking-normal mb-0.5">{t.importScreenshot}</div>
              <div className="text-xs opacity-45">{t.uploadDesc}</div>
              {ocrHint && (
                <div className="text-xs mt-1.5" style={{ color: ocrHint.includes('error') || ocrHint.includes('No ') ? '#ff6644' : BRAND_BLUE }}>
                  {ocrLoading ? '⏳ ' : '✓ '}{ocrHint}
                </div>
              )}
            </div>
            <input aria-label="Input" ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleOCR(e.target.files[0]); }} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={ocrLoading}
              className="font-mono text-xs tracking-normal rounded-sm border border-black/20 bg-transparent cursor-pointer"
              style={{ padding: '6px 14px', opacity: ocrLoading ? 0.5 : 1, whiteSpace: 'nowrap' }}
            >
              {ocrLoading ? t.scan : t.upload}
            </button>
          </div>

          {/* Manual fields */}
          <div className="text-xs tracking-normal opacity-40 mb-2.5">{t.manualEntry}</div>
          <div className="grid grid-cols-4 gap-[0.6rem] items-end auto-cols-max"
            style={{ gridTemplateColumns: 'repeat(4, 1fr) auto auto' }}
          >
            {[
              { key: 'kills', label: t.kills, placeholder: '0' },
              { key: 'deaths', label: t.deaths, placeholder: '1' },
              { key: 'damage', label: t.damage, placeholder: '0' },
              { key: 'placement', label: t.placement, placeholder: '1' },
            ].map(f => (
              <div key={f.key}>
                <div className="text-xs tracking-normal opacity-40 mb-1">{f.label}</div>
                <input aria-label="Input" type="number" min="0" placeholder={f.placeholder}
                  value={form[f.key as keyof typeof form] as string}
                  onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                  className="w-full font-mono text-xs font-bold px-2 py-1.5 border border-black/15 rounded-sm bg-transparent box-border"
                />
              </div>
            ))}
            <div>
              <div className="text-xs tracking-normal opacity-40 mb-1">{t.win}</div>
              <button type="button" onClick={() => setForm(v => ({ ...v, won: !v.won }))}
                className="font-mono text-xs cursor-pointer rounded-sm"
                style={{
                  width: '100%', padding: '6px 8px',
                  border: `1px solid ${form.won ? BRAND_BLUE : 'rgba(0,0,0,0.15)'}`,
                  background: form.won ? BRAND_BLUE_SOFT : 'transparent',
                  color: form.won ? BRAND_BLUE : 'rgba(0,0,0,0.4)',
                }}
              >
                {form.won ? t.yes : t.no}
              </button>
            </div>
            <div>
              <div className="text-xs opacity-0 mb-1">_</div>
              <button type="button" onClick={addEntry}
                className="font-mono text-xs tracking-normal cursor-pointer rounded-sm"
                style={{ padding: '6px 18px', background: BRAND_BLUE_SOFT, border: `1px solid ${BRAND_BLUE}`, color: BRAND_BLUE }}
              >
                {t.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {entries.length === 0 ? (
        <div className="p-8 text-center opacity-35 text-xs tracking-normal">
          {t.noGames}
        </div>
      ) : (
        <div>
          <div className="grid gap-2 px-6 py-2.5 border-b border-black/6 text-xs tracking-normal opacity-35 grid-cols-[5rem_3.5rem_3.5rem_4.5rem_5rem_4rem_1.5rem]"
          >
            <span>{t.date}</span><span>{t.kills}</span><span>{t.deaths}</span><span>K/D</span><span>{t.damage}</span><span>{t.place}</span><span></span>
          </div>
          {entries.slice(0, 15).map(e => {
            const ekd = e.kills / e.deaths;
            const ekdColor = ekd >= 2 ? BRAND_BLUE : ekd >= 1 ? '#ffcc00' : '#ff4455';
            return (
              <div key={e.id} className="grid gap-2 px-6 py-[0.55rem] border-b border-black/4 items-center text-xs grid-cols-[5rem_3.5rem_3.5rem_4.5rem_5rem_4rem_1.5rem]"
              >
                <span className="opacity-45">{e.date}</span>
                <span className="font-bold">{e.kills}</span>
                <span className="opacity-60">{e.deaths}</span>
                <span className="font-bold" style={{ color: ekdColor }}>{ekd.toFixed(2)}</span>
                <span className="opacity-75">{e.damage.toLocaleString()}</span>
                <span className="opacity-60">#{e.placement}{e.won ? ' 🏆' : ''}</span>
                <button type="button" onClick={() => removeEntry(e.id)}
                  className="font-mono text-xs cursor-pointer bg-transparent border-none p-0 text-black/25"
                >×</button>
              </div>
            );
          })}
        </div>
      )}

      <div className="px-6 py-2.5 border-t border-black/8 text-xs tracking-normal opacity-28">
        {syncToAccount ? t.synced : t.local} - {t.averages}
      </div>
    </div>
  );
}
