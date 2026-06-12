'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Loadout } from '@/lib/data';
import type { Locale } from '@/lib/i18n';
import { translateTerm } from '@/lib/i18n';
import { calculateMetaScore } from '@/lib/loadoutUtils';

const FUN_COPY = {
  en: {
    kicker: 'Fun zone',
    title: 'Fun',
    trollKicker: 'Random loadout',
    trollTitle: 'Troll build generator',
    trollLead: 'One click, one cursed build. Made for challenge videos: "I hit top 1 with a class picked by a website".',
    generate: 'Generate a troll build for my next challenge',
    reroll: 'Reroll',
    challengeLabel: 'Challenge',
    copy: 'Copy',
    copied: 'Copied',
    shareOnX: 'Share on X',
    challenges: [
      'Win without picking up a single armor plate',
      'Hipfire only - aiming down sights is forbidden',
      'No sprinting for the whole game',
      'Drop on the tallest building and loot nothing else',
      'Knife only as your secondary',
      'Finish the game without placing a single ping',
    ],
    recoilKicker: 'Recoil check',
    recoilTitle: 'Recoil comparator',
    recoilLead: 'Does it kick up or drift sideways? Quick visual check before you lock a build.',
    vertical: 'Vertical',
    horizontal: 'Horizontal',
    verdictVertical: 'Mostly vertical - pull down and hold',
    verdictHorizontal: 'Mostly horizontal - watch the drift',
    verdictBalanced: 'Balanced kick - easy to manage',
    estimateNote: 'Estimate derived from control stats and weapon class.',
    cursedKicker: 'Worst loadout of the week',
    cursedTitle: 'The cursed class',
    cursedLead: 'Everyone hunts the best class. Here is the opposite: one weapon, the worst possible attachments. Good luck getting a single kill.',
    cursedScore: 'Meta score',
    cursedTags: [
      'Uncontrollable recoil',
      'Ultra-slow ADS',
      'Fridge-tier mobility',
      'Guaranteed hitmarkers',
      'Eternal reload',
      'Random accuracy',
    ],
    voteTitle: 'Vote for the next weapon to destroy',
    voteLead: 'The most voted weapon becomes next week’s cursed class.',
    voteAction: 'Vote',
    voted: 'Vote saved. Come back next week for the result.',
  },
  fr: {
    kicker: 'Fun zone',
    title: 'Fun',
    trollKicker: 'Classe aleatoire',
    trollTitle: 'Generateur de build troll',
    trollLead: 'Un clic, un build maudit. Parfait pour les videos defi : "Je fais top 1 avec une classe choisie par un site internet".',
    generate: 'Genere un build troll pour mon prochain defi',
    reroll: 'Relancer',
    challengeLabel: 'Defi',
    copy: 'Copier',
    copied: 'Copie',
    shareOnX: 'Partager sur X',
    challenges: [
      'Top 1 sans ramasser une seule plaque',
      'Hipfire only - interdiction de viser',
      'Interdiction de sprinter de toute la partie',
      'Drop sur le plus haut batiment, aucun autre loot',
      'Couteau obligatoire en arme secondaire',
      'Toute la partie sans poser un seul ping',
    ],
    recoilKicker: 'Recoil check',
    recoilTitle: 'Comparateur de recul',
    recoilLead: 'Recul vertical ou horizontal ? Verification visuelle rapide avant de valider un build.',
    vertical: 'Vertical',
    horizontal: 'Horizontal',
    verdictVertical: 'Recul surtout vertical - tire vers le bas',
    verdictHorizontal: 'Recul surtout horizontal - surveille la derive',
    verdictBalanced: 'Recul equilibre - facile a gerer',
    estimateNote: 'Estimation basee sur la stat de controle et la classe de l arme.',
    cursedKicker: 'Le pire loadout de la semaine',
    cursedTitle: 'La classe maudite',
    cursedLead: 'Tout le monde cherche la meilleure classe. Voici l inverse : une arme, les pires accessoires possibles. Bonne chance pour faire un seul kill.',
    cursedScore: 'Score meta',
    cursedTags: [
      'Recul incontrolable',
      'Visee ultra-lente',
      'Mobilite de frigo',
      'Hitmarkers garantis',
      'Rechargement eternel',
      'Precision aleatoire',
    ],
    voteTitle: 'Vote pour la prochaine arme a detruire',
    voteLead: 'L arme la plus votee devient la classe maudite de la semaine prochaine.',
    voteAction: 'Voter',
    voted: 'Vote enregistre. Reviens la semaine prochaine pour le resultat.',
  },
  es: {
    kicker: 'Fun zone',
    title: 'Fun',
    trollKicker: 'Clase aleatoria',
    trollTitle: 'Generador de build troll',
    trollLead: 'Un clic, un build maldito. Ideal para videos de reto: "Top 1 con una clase elegida por una web".',
    generate: 'Genera un build troll para mi proximo reto',
    reroll: 'Otra vez',
    challengeLabel: 'Reto',
    copy: 'Copiar',
    copied: 'Copiado',
    shareOnX: 'Compartir en X',
    challenges: [
      'Top 1 sin recoger ni una placa',
      'Solo hipfire - prohibido apuntar',
      'Prohibido esprintar toda la partida',
      'Cae en el edificio mas alto y no lootees nada mas',
      'Cuchillo obligatorio como secundaria',
      'Toda la partida sin poner un solo ping',
    ],
    recoilKicker: 'Recoil check',
    recoilTitle: 'Comparador de retroceso',
    recoilLead: 'Sube o se va de lado? Chequeo visual rapido antes de fijar un build.',
    vertical: 'Vertical',
    horizontal: 'Horizontal',
    verdictVertical: 'Retroceso sobre todo vertical - tira hacia abajo',
    verdictHorizontal: 'Retroceso sobre todo horizontal - controla la deriva',
    verdictBalanced: 'Retroceso equilibrado - facil de manejar',
    estimateNote: 'Estimacion basada en la stat de control y la clase del arma.',
    cursedKicker: 'El peor loadout de la semana',
    cursedTitle: 'La clase maldita',
    cursedLead: 'Todos buscan la mejor clase. Aqui va lo contrario: un arma con los peores accesorios posibles. Suerte con conseguir un solo kill.',
    cursedScore: 'Puntuacion meta',
    cursedTags: [
      'Retroceso incontrolable',
      'ADS ultra-lento',
      'Movilidad de nevera',
      'Hitmarkers garantizados',
      'Recarga eterna',
      'Precision aleatoria',
    ],
    voteTitle: 'Vota la proxima arma a destruir',
    voteLead: 'El arma mas votada sera la clase maldita de la proxima semana.',
    voteAction: 'Votar',
    voted: 'Voto guardado. Vuelve la semana que viene para el resultado.',
  },
} as const;

function getFunCopy(locale: Locale) {
  return FUN_COPY[locale as keyof typeof FUN_COPY] ?? FUN_COPY.en;
}

const HORIZONTAL_SHARE: Record<string, number> = {
  SMG: 0.55,
  'Mid-Range SMG': 0.5,
  LMG: 0.5,
  'Assault Rifle': 0.35,
  'Burst Rifle': 0.3,
  'Marksman Rifle': 0.28,
  'Sniper Rifle': 0.22,
  Sniper: 0.22,
};

function recoilProfile(loadout: Loadout) {
  const kick = Math.min(95, Math.max(8, 100 - loadout.stats.control));
  const share = HORIZONTAL_SHARE[loadout.category] ?? 0.4;
  return {
    vertical: Math.round(Math.min(100, kick * (1 - share) * 2)),
    horizontal: Math.round(Math.min(100, kick * share * 2)),
  };
}

function randomItem<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededItem<T>(items: readonly T[], random: () => number) {
  return items[Math.floor(random() * items.length)];
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type TrollBuild = {
  weapon: Loadout;
  attachments: { slot: string; name: string }[];
  challenge: string;
};

export default function FunZone({ loadouts, locale }: { loadouts: Loadout[]; locale: Locale }) {
  const copy = getFunCopy(locale);
  const [build, setBuild] = useState<TrollBuild | null>(null);
  const [copied, setCopied] = useState(false);
  const [recoilA, setRecoilA] = useState(loadouts[0]?.id ?? '');
  const [recoilB, setRecoilB] = useState(loadouts[1]?.id ?? '');

  const attachmentPool = useMemo(() => {
    const pool = new Map<string, string[]>();
    for (const loadout of loadouts) {
      for (const attachment of loadout.attachments) {
        const names = pool.get(attachment.slot) ?? [];
        if (!names.includes(attachment.name)) names.push(attachment.name);
        pool.set(attachment.slot, names);
      }
    }
    return pool;
  }, [loadouts]);

  function generateBuild() {
    if (loadouts.length === 0) return;
    const weapon = randomItem(loadouts);
    const attachments = weapon.attachments.map((attachment) => {
      const names = attachmentPool.get(attachment.slot);
      return { slot: attachment.slot, name: names?.length ? randomItem(names) : attachment.name };
    });
    setBuild({ weapon, attachments, challenge: randomItem(copy.challenges) });
    setCopied(false);
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://wzprometa.com').replace(/\/$/, '');
  const shareText = build
    ? `${build.weapon.weapon} - ${copy.trollTitle} - ${copy.challengeLabel}: ${build.challenge}`
    : '';
  const xShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(siteUrl)}`;

  async function copyBuild() {
    if (!build) return;
    const lines = [
      `${build.weapon.weapon} (${translateTerm(build.weapon.category, locale)})`,
      ...build.attachments.map((attachment) => `${translateTerm(attachment.slot, locale)}: ${attachment.name}`),
      `${copy.challengeLabel}: ${build.challenge}`,
      siteUrl,
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  const recoilEntries = [recoilA, recoilB]
    .map((id) => loadouts.find((loadout) => loadout.id === id))
    .filter((loadout): loadout is Loadout => Boolean(loadout));

  const [weekIndex] = useState(() => Math.floor(Date.now() / WEEK_MS));
  const cursed = useMemo(() => {
    if (loadouts.length === 0) return null;
    const worstFirst = [...loadouts].sort((a, b) => calculateMetaScore(a) - calculateMetaScore(b));
    const weapon = worstFirst[weekIndex % Math.min(6, worstFirst.length)];
    const random = mulberry32(weekIndex * 1000 + weapon.weapon.length);
    const attachments = weapon.attachments.map((attachment) => {
      const names = (attachmentPool.get(attachment.slot) ?? []).filter((name) => name !== attachment.name);
      return { slot: attachment.slot, name: names.length ? seededItem(names, random) : attachment.name };
    });
    const tags = [...copy.cursedTags].sort(() => random() - 0.5).slice(0, 3);
    const candidates = worstFirst.filter((entry) => entry.id !== weapon.id).slice(0, 4);
    return { weapon, attachments, tags, candidates };
  }, [loadouts, weekIndex, attachmentPool, copy]);

  const [cursedVote, setCursedVote] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(`wzpro-cursed-vote-${weekIndex}`);
    } catch {
      return null;
    }
  });
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    let cancelled = false;
    fetch('/api/fun/cursed-vote')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && data?.counts) setVoteCounts(data.counts);
      })
      .catch(() => {
        // Vote counts are an enhancement only.
      });
    return () => {
      cancelled = true;
    };
  }, [weekIndex]);

  function voteCursed(weaponId: string) {
    setCursedVote(weaponId);
    setVoteCounts((current) => ({ ...current, [weaponId]: (current[weaponId] ?? 0) + 1 }));
    try {
      window.localStorage.setItem(`wzpro-cursed-vote-${weekIndex}`, weaponId);
    } catch {
      // Local vote is an enhancement only.
    }
    fetch('/api/fun/cursed-vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weaponId }),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.counts) setVoteCounts(data.counts);
      })
      .catch(() => {
        // Vote counts are an enhancement only.
      });
  }

  function verdictFor(profile: { vertical: number; horizontal: number }) {
    if (profile.vertical > profile.horizontal * 1.25) return copy.verdictVertical;
    if (profile.horizontal > profile.vertical * 1.25) return copy.verdictHorizontal;
    return copy.verdictBalanced;
  }

  return (
    <section className="content-layer fun-zone" id="fun">
      <div className="section-heading">
        <span>{copy.kicker}</span>
        <h2>{copy.title}</h2>
      </div>
      <div className="fun-grid">
        <article className="fun-panel">
          <span className="fun-eyebrow">{copy.trollKicker}</span>
          <h3>{copy.trollTitle}</h3>
          <p className="fun-lead">{copy.trollLead}</p>
          <button type="button" className="fun-generate" onClick={generateBuild}>
            {build ? copy.reroll : copy.generate}
          </button>
          {build && (
            <div className="fun-troll-result">
              <strong>{build.weapon.weapon}</strong>
              <small>{translateTerm(build.weapon.category, locale)}</small>
              <ul>
                {build.attachments.map((attachment) => (
                  <li key={attachment.slot}>
                    <span>{translateTerm(attachment.slot, locale)}</span>
                    <b>{attachment.name}</b>
                  </li>
                ))}
              </ul>
              <p className="fun-challenge"><span>{copy.challengeLabel}:</span> {build.challenge}</p>
              <div className="fun-troll-actions">
                <button type="button" onClick={copyBuild}>{copied ? copy.copied : copy.copy}</button>
                <a href={xShareUrl} target="_blank" rel="noreferrer">{copy.shareOnX}</a>
              </div>
            </div>
          )}
        </article>

        <article className="fun-panel">
          <span className="fun-eyebrow">{copy.recoilKicker}</span>
          <h3>{copy.recoilTitle}</h3>
          <p className="fun-lead">{copy.recoilLead}</p>
          <div className="fun-recoil-controls">
            <select value={recoilA} onChange={(event) => setRecoilA(event.currentTarget.value)}>
              {loadouts.map((loadout) => <option key={loadout.id} value={loadout.id}>{loadout.weapon}</option>)}
            </select>
            <select value={recoilB} onChange={(event) => setRecoilB(event.currentTarget.value)}>
              {loadouts.map((loadout) => <option key={loadout.id} value={loadout.id}>{loadout.weapon}</option>)}
            </select>
          </div>
          <div className="fun-recoil-grid">
            {recoilEntries.map((loadout) => {
              const profile = recoilProfile(loadout);
              return (
                <div key={loadout.id} className="fun-recoil-card">
                  <strong>{loadout.weapon}</strong>
                  <div className="compare-bars" aria-label={`${loadout.weapon} recoil`}>
                    {[
                      [copy.vertical, profile.vertical],
                      [copy.horizontal, profile.horizontal],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <span>{label}</span>
                        <i style={{ '--value': `${value}%` } as CSSProperties} />
                        <b>{value}</b>
                      </div>
                    ))}
                  </div>
                  <small>{verdictFor(profile)}</small>
                </div>
              );
            })}
          </div>
          <p className="fun-note">{copy.estimateNote}</p>
        </article>

        {cursed && (
          <article className="fun-panel fun-panel--cursed">
            <span className="fun-eyebrow">{copy.cursedKicker}</span>
            <h3>{copy.cursedTitle}</h3>
            <p className="fun-lead">{copy.cursedLead}</p>
            <div className="fun-cursed-grid">
              <div className="fun-cursed-build">
                <strong>{cursed.weapon.weapon}</strong>
                <small>{translateTerm(cursed.weapon.category, locale)} - {copy.cursedScore} {calculateMetaScore(cursed.weapon)}</small>
                <div className="fun-cursed-tags">
                  {cursed.tags.map((tag) => <span key={tag}>{tag}</span>)}
                </div>
                <ul>
                  {cursed.attachments.map((attachment) => (
                    <li key={attachment.slot}>
                      <span>{translateTerm(attachment.slot, locale)}</span>
                      <b>{attachment.name}</b>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="fun-cursed-vote">
                <strong>{copy.voteTitle}</strong>
                <p>{copy.voteLead}</p>
                <div className="fun-vote-list">
                  {cursed.candidates.map((candidate) => {
                    const count = voteCounts[candidate.id] ?? 0;
                    if (cursedVote) {
                      return (
                        <div key={candidate.id} className={`fun-vote-row${cursedVote === candidate.id ? ' is-voted' : ''}`}>
                          <span>{candidate.weapon}</span>
                          <b>{count}</b>
                        </div>
                      );
                    }
                    return (
                      <button key={candidate.id} type="button" onClick={() => voteCursed(candidate.id)}>
                        <span>{candidate.weapon}{count > 0 ? ` (${count})` : ''}</span>
                        <b>{copy.voteAction}</b>
                      </button>
                    );
                  })}
                </div>
                {cursedVote && <p className="fun-vote-done">{copy.voted}</p>}
              </div>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
