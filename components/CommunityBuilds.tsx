'use client';

import { useState } from 'react';
import type { CommunityBuild } from '@/lib/communityBuildStore';
import { withLocalePath, type Locale } from '@/lib/i18n';

type Props = {
  initialBuilds: CommunityBuild[];
  locale: Locale;
  isAuthed: boolean;
};

type Row = { slot: string; name: string };

const CATEGORIES = ['Assault Rifle', 'SMG', 'Sniper Rifle', 'Marksman Rifle', 'LMG', 'Shotgun', 'Battle Rifle'];
const SLOTS = ['Muzzle', 'Barrel', 'Optic', 'Underbarrel', 'Magazine', 'Stock', 'Rear Grip', 'Laser', 'Ammunition'];

const COPY = {
  en: {
    eyebrow: 'WZPRO // COMMUNITY', title: 'COMMUNITY BUILDS', intro: 'Share your loadout, vote on the best. The community leaderboard is ranked by votes.',
    create: 'Share a build', weapon: 'Weapon', category: 'Category', playstyle: 'Playstyle', attachments: 'Attachments', addRow: '+ Add attachment', notes: 'Notes (optional)', submit: 'Publish build', signin: 'Sign in to share and vote', leaderboard: 'Leaderboard', empty: 'No community builds yet. Be the first.', by: 'by', votes: 'votes', slot: 'Slot', name: 'Attachment',
    errWeapon: 'Add a weapon and at least one attachment.', errGeneric: 'Could not publish. Try again.',
  },
  fr: {
    eyebrow: 'WZPRO // COMMUNAUTE', title: 'CLASSES COMMUNAUTE', intro: 'Partage ta classe, vote pour les meilleures. Le classement est trie par votes.',
    create: 'Partager une classe', weapon: 'Arme', category: 'Categorie', playstyle: 'Style', attachments: 'Accessoires', addRow: '+ Ajouter un accessoire', notes: 'Notes (optionnel)', submit: 'Publier la classe', signin: 'Connecte-toi pour partager et voter', leaderboard: 'Classement', empty: 'Aucune classe communaute. Sois le premier.', by: 'par', votes: 'votes', slot: 'Emplacement', name: 'Accessoire',
    errWeapon: 'Ajoute une arme et au moins un accessoire.', errGeneric: 'Echec de publication. Reessaie.',
  },
  es: {
    eyebrow: 'WZPRO // COMUNIDAD', title: 'CLASES COMUNIDAD', intro: 'Comparte tu clase, vota las mejores. La clasificacion se ordena por votos.',
    create: 'Compartir una clase', weapon: 'Arma', category: 'Categoria', playstyle: 'Estilo', attachments: 'Accesorios', addRow: '+ Anadir accesorio', notes: 'Notas (opcional)', submit: 'Publicar clase', signin: 'Inicia sesion para compartir y votar', leaderboard: 'Clasificacion', empty: 'No hay clases de la comunidad. Se el primero.', by: 'por', votes: 'votos', slot: 'Ranura', name: 'Accesorio',
    errWeapon: 'Anade un arma y al menos un accesorio.', errGeneric: 'No se pudo publicar. Intenta de nuevo.',
  },
};

export default function CommunityBuilds({ initialBuilds, locale, isAuthed }: Props) {
  const lang = locale === 'fr' ? 'fr' : locale === 'es' ? 'es' : 'en';
  const t = COPY[lang];
  const [builds, setBuilds] = useState<CommunityBuild[]>(initialBuilds);
  const [weapon, setWeapon] = useState('');
  const [category, setCategory] = useState('Assault Rifle');
  const [playstyle, setPlaystyle] = useState('');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState<Row[]>([{ slot: 'Muzzle', name: '' }, { slot: 'Barrel', name: '' }]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    const attachments = rows.filter((row) => row.slot && row.name.trim());
    if (!weapon.trim() || attachments.length === 0) { setError(t.errWeapon); return; }

    setBusy(true);
    try {
      const res = await fetch('/api/builds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weapon: weapon.trim(), category, playstyle: playstyle.trim(), notes: notes.trim(), attachments }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || t.errGeneric);
        return;
      }
      const created: CommunityBuild = await res.json();
      setBuilds((current) => [created, ...current]);
      setWeapon(''); setPlaystyle(''); setNotes('');
      setRows([{ slot: 'Muzzle', name: '' }, { slot: 'Barrel', name: '' }]);
    } catch {
      setError(t.errGeneric);
    } finally {
      setBusy(false);
    }
  }

  async function vote(id: string, delta: number) {
    if (!isAuthed) return;
    const res = await fetch(`/api/builds/${id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta }),
    });
    if (!res.ok) return;
    const updated: CommunityBuild = await res.json();
    setBuilds((current) =>
      [...current.map((build) => (build.id === updated.id ? updated : build))].sort(
        (a, b) => b.score - a.score || b.createdAt.localeCompare(a.createdAt),
      ),
    );
  }

  return (
    <main className="cb-page">
      <header>
        <span>{t.eyebrow}</span>
        <h1>{t.title}</h1>
        <p>{t.intro}</p>
      </header>

      {isAuthed ? (
        <form className="cb-form" onSubmit={submit}>
          <h2>{t.create}</h2>
          <div className="cb-grid">
            <label><span>{t.weapon}</span><input value={weapon} onChange={(e) => setWeapon(e.currentTarget.value)} maxLength={48} required /></label>
            <label><span>{t.category}</span>
              <select value={category} onChange={(e) => setCategory(e.currentTarget.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label><span>{t.playstyle}</span><input value={playstyle} onChange={(e) => setPlaystyle(e.currentTarget.value)} maxLength={32} /></label>
          </div>

          <span className="cb-section">{t.attachments}</span>
          <div className="cb-rows">
            {rows.map((row, index) => (
              <div className="cb-row" key={index}>
                <select value={row.slot} onChange={(e) => updateRow(index, { slot: e.currentTarget.value })} aria-label={t.slot}>
                  {SLOTS.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
                </select>
                <input value={row.name} onChange={(e) => updateRow(index, { name: e.currentTarget.value })} placeholder={t.name} maxLength={48} />
                {rows.length > 1 && <button type="button" className="cb-x" onClick={() => setRows((c) => c.filter((_, i) => i !== index))} aria-label="remove">×</button>}
              </div>
            ))}
          </div>
          {rows.length < 8 && <button type="button" className="cb-add" onClick={() => setRows((c) => [...c, { slot: SLOTS[c.length % SLOTS.length], name: '' }])}>{t.addRow}</button>}

          <label className="cb-notes"><span>{t.notes}</span><textarea value={notes} onChange={(e) => setNotes(e.currentTarget.value)} maxLength={600} rows={3} /></label>
          {error && <p className="cb-error">{error}</p>}
          <button type="submit" className="cb-submit" disabled={busy}>{t.submit}</button>
        </form>
      ) : (
        <a className="cb-signin" href={withLocalePath('/sign-in', locale)}>{t.signin} →</a>
      )}

      <section className="cb-board">
        <h2>{t.leaderboard}</h2>
        {builds.length === 0 ? (
          <p className="cb-empty">{t.empty}</p>
        ) : (
          <ol className="cb-list">
            {builds.map((build, index) => (
              <li className="cb-item" key={build.id}>
                <span className="cb-rank">{index + 1}</span>
                <button type="button" className="cb-vote" onClick={() => vote(build.id, 1)} disabled={!isAuthed} aria-label="upvote">▲</button>
                <span className="cb-score">{build.score}</span>
                <div className="cb-body">
                  <div className="cb-head">
                    <strong>{build.weapon}</strong>
                    <span className="cb-cat">{build.category}{build.playstyle ? ` · ${build.playstyle}` : ''}</span>
                  </div>
                  <div className="cb-atts">
                    {build.attachments.map((a) => <span key={`${a.slot}-${a.name}`}>{a.name}</span>)}
                  </div>
                  {build.notes && <p className="cb-note">{build.notes}</p>}
                  <span className="cb-author">{t.by} {build.authorPseudo || build.author}</span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <style>{`
        .cb-page { max-width: 820px; margin: 0 auto; padding: 4.5rem 1.5rem 6rem; font-family: var(--font-mono, monospace); color: var(--tm-ink, #10100e); }
        .cb-page header span { color: #163cff; font-size: 0.7rem; font-weight: 900; letter-spacing: 0.18em; text-transform: uppercase; }
        .cb-page header h1 { margin: 0.4rem 0 0; font-size: clamp(2rem, 7vw, 3.4rem); letter-spacing: 0.04em; line-height: 0.95; }
        .cb-page header p { margin: 0.8rem 0 0; max-width: 56ch; color: rgba(16,16,14,0.6); line-height: 1.6; }
        .cb-form { margin-top: 2rem; border: 1px solid rgba(22,60,255,0.28); background: var(--theme-panel, rgba(239,238,232,0.82)); padding: 1.4rem; }
        .cb-form h2, .cb-board h2 { margin: 0 0 1rem; font-size: 1rem; letter-spacing: 0.04em; text-transform: uppercase; }
        .cb-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.7rem; }
        .cb-form label { display: grid; gap: 0.3rem; }
        .cb-form label span { font-size: 0.64rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(16,16,14,0.55); }
        .cb-form input, .cb-form select, .cb-form textarea { border: 1px solid rgba(16,16,14,0.2); background: transparent; color: inherit; font: inherit; font-size: 0.85rem; padding: 0.5rem 0.6rem; }
        .cb-section { display: block; margin: 1.2rem 0 0.6rem; font-size: 0.64rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(16,16,14,0.55); }
        .cb-rows { display: grid; gap: 0.5rem; }
        .cb-row { display: grid; grid-template-columns: 150px 1fr auto; gap: 0.5rem; }
        .cb-x { border: 1px solid rgba(16,16,14,0.2); background: transparent; color: inherit; cursor: pointer; font-size: 1rem; line-height: 1; width: 34px; }
        .cb-add { margin-top: 0.6rem; border: none; background: none; color: #163cff; cursor: pointer; font: inherit; font-size: 0.74rem; font-weight: 800; }
        .cb-notes { margin-top: 1rem; }
        .cb-error { color: #c0392b; font-size: 0.78rem; margin: 0.8rem 0 0; }
        .cb-submit { margin-top: 1rem; border: 1px solid #163cff; background: #163cff; color: #fff; cursor: pointer; font: inherit; font-size: 0.74rem; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; padding: 0.7rem 1.3rem; }
        .cb-submit:disabled { opacity: 0.6; cursor: default; }
        .cb-signin { display: inline-block; margin-top: 2rem; color: #163cff; font-weight: 800; text-decoration: none; }
        .cb-board { margin-top: 2.6rem; }
        .cb-empty { color: rgba(16,16,14,0.55); }
        .cb-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.7rem; }
        .cb-item { display: grid; grid-template-columns: auto auto auto 1fr; align-items: start; gap: 0.7rem; border: 1px solid rgba(16,16,14,0.14); padding: 0.9rem; }
        .cb-rank { font-size: 0.8rem; font-weight: 900; color: rgba(16,16,14,0.4); min-width: 1.4rem; }
        .cb-vote { border: 1px solid rgba(16,16,14,0.2); background: transparent; color: #163cff; cursor: pointer; font-size: 0.8rem; padding: 0.2rem 0.5rem; }
        .cb-vote:disabled { opacity: 0.4; cursor: default; }
        .cb-score { font-weight: 900; color: #163cff; min-width: 1.5rem; text-align: center; }
        .cb-head { display: flex; align-items: baseline; gap: 0.6rem; flex-wrap: wrap; }
        .cb-head strong { font-size: 1.05rem; text-transform: uppercase; letter-spacing: 0.02em; }
        .cb-cat { font-size: 0.72rem; color: rgba(16,16,14,0.5); text-transform: uppercase; letter-spacing: 0.04em; }
        .cb-atts { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.55rem; }
        .cb-atts span { border: 1px solid rgba(16,16,14,0.14); padding: 0.22rem 0.5rem; font-size: 0.72rem; color: rgba(16,16,14,0.7); }
        .cb-note { margin: 0.6rem 0 0; font-size: 0.8rem; color: rgba(16,16,14,0.65); line-height: 1.5; }
        .cb-author { display: block; margin-top: 0.5rem; font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.06em; color: rgba(16,16,14,0.45); }
        @media (max-width: 560px) { .cb-grid { grid-template-columns: 1fr; } .cb-row { grid-template-columns: 120px 1fr auto; } }
        :global(:root[data-theme="dark"]) .cb-page header p, :global(:root[data-theme="dark"]) .cb-empty, :global(:root[data-theme="dark"]) .cb-cat, :global(:root[data-theme="dark"]) .cb-atts span, :global(:root[data-theme="dark"]) .cb-note, :global(:root[data-theme="dark"]) .cb-author, :global(:root[data-theme="dark"]) .cb-form label span, :global(:root[data-theme="dark"]) .cb-section { color: rgba(255,255,255,0.6); }
        :global(:root[data-theme="dark"]) .cb-form input, :global(:root[data-theme="dark"]) .cb-form select, :global(:root[data-theme="dark"]) .cb-form textarea, :global(:root[data-theme="dark"]) .cb-item, :global(:root[data-theme="dark"]) .cb-atts span, :global(:root[data-theme="dark"]) .cb-x, :global(:root[data-theme="dark"]) .cb-vote { border-color: rgba(255,255,255,0.18); }
      `}</style>
    </main>
  );
}
