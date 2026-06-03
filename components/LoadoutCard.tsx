'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import StatBar from './StatBar';
import type { Loadout } from '@/lib/data';
import type { Locale } from '@/lib/i18n';
import { DEFAULT_LOCALE, localizeLoadoutNote, translateTerm, withLocalePath } from '@/lib/i18n';
import { getLoadoutSlug } from '@/lib/loadoutUtils';

const IMAGE_SOURCES = [
  (slug: string) => `/assets/weapons/wzstats/${slug}.avif`,
  (slug: string) => `/assets/weapons/${slug}.avif`,
  (slug: string) => `/assets/weapons/${slug}.webp`,
  (slug: string) => `/assets/weapons/${slug}.png`,
];

const CARD_COPY = {
  en: {
    metaWatch: 'Meta watch',
    meta: 'Meta',
    saved: 'Saved',
    save: 'Save',
    copied: 'Copied',
    copy: 'Copy',
    open: 'Open',
    damage: 'Damage',
    range: 'Range',
    mobility: 'Mobility',
    control: 'Control',
    pairWith: 'Pair with',
    shareableBuild: 'Shareable build',
    attachments: 'Attachments',
    performance: 'Performance',
    advancedData: 'Advanced data',
    ttkClose: 'TTK close',
    ads: 'ADS',
    velocity: 'Velocity',
    reload: 'Reload',
    strengths: 'Strengths',
    weaknesses: 'Weaknesses',
    openBuild: 'Open build',
    updated: 'Updated',
    tier: 'Tier',
    metaScore: 'Meta score',
    note: 'Note',
  },
  fr: {
    metaWatch: 'Meta a surveiller',
    meta: 'Meta',
    saved: 'Enregistre',
    save: 'Sauver',
    copied: 'Copie',
    copy: 'Copier',
    open: 'Ouvrir',
    damage: 'Degats',
    range: 'Portee',
    mobility: 'Mobilite',
    control: 'Controle',
    pairWith: 'A jouer avec',
    shareableBuild: 'Classe partageable',
    attachments: 'Accessoires',
    performance: 'Performance',
    advancedData: 'Donnees avancees',
    ttkClose: 'TTK proche',
    ads: 'Visee',
    velocity: 'Vitesse balle',
    reload: 'Recharge',
    strengths: 'Forces',
    weaknesses: 'Faiblesses',
    openBuild: 'Ouvrir la classe',
    updated: 'Mis a jour',
    tier: 'Tier',
    metaScore: 'Score meta',
    note: 'Note',
  },
  es: {
    metaWatch: 'Meta en seguimiento',
    meta: 'Meta',
    saved: 'Guardado',
    save: 'Guardar',
    copied: 'Copiado',
    copy: 'Copiar',
    open: 'Abrir',
    damage: 'Dano',
    range: 'Alcance',
    mobility: 'Movilidad',
    control: 'Control',
    pairWith: 'Combinar con',
    shareableBuild: 'Clase compartible',
    attachments: 'Accesorios',
    performance: 'Rendimiento',
    advancedData: 'Datos avanzados',
    ttkClose: 'TTK cerca',
    ads: 'ADS',
    velocity: 'Velocidad bala',
    reload: 'Recarga',
    strengths: 'Fortalezas',
    weaknesses: 'Debilidades',
    openBuild: 'Abrir clase',
    updated: 'Actualizado',
    tier: 'Tier',
    metaScore: 'Puntuacion meta',
    note: 'Nota',
  },
  de: {
    metaWatch: 'Meta beobachten',
    meta: 'Meta',
    saved: 'Gespeichert',
    save: 'Speichern',
    copied: 'Kopiert',
    copy: 'Kopieren',
    open: 'Öffnen',
    damage: 'Schaden',
    range: 'Reichweite',
    mobility: 'Mobilität',
    control: 'Kontrolle',
    pairWith: 'Kombinieren mit',
    shareableBuild: 'Teilbarer Build',
    attachments: 'Aufsätze',
    performance: 'Leistung',
    advancedData: 'Erweiterte Daten',
    ttkClose: 'TTK nah',
    ads: 'ADS',
    velocity: 'Kugelgeschwindigkeit',
    reload: 'Nachladen',
    strengths: 'Stärken',
    weaknesses: 'Schwächen',
    openBuild: 'Build öffnen',
    updated: 'Aktualisiert',
    tier: 'Tier',
    metaScore: 'Meta-Score',
    note: 'Notiz',
  },
  it: {
    metaWatch: 'Meta da seguire',
    meta: 'Meta',
    saved: 'Salvato',
    save: 'Salva',
    copied: 'Copiato',
    copy: 'Copia',
    open: 'Apri',
    damage: 'Danno',
    range: 'Portata',
    mobility: 'Mobilità',
    control: 'Controllo',
    pairWith: 'Abbina con',
    shareableBuild: 'Build condivisibile',
    attachments: 'Accessori',
    performance: 'Prestazioni',
    advancedData: 'Dati avanzati',
    ttkClose: 'TTK vicino',
    ads: 'ADS',
    velocity: 'Velocità proiettile',
    reload: 'Ricarica',
    strengths: 'Punti forti',
    weaknesses: 'Debolezze',
    openBuild: 'Apri build',
    updated: 'Aggiornato',
    tier: 'Tier',
    metaScore: 'Punteggio meta',
    note: 'Nota',
  },
  pt: {
    metaWatch: 'Meta em análise',
    meta: 'Meta',
    saved: 'Salvo',
    save: 'Salvar',
    copied: 'Copiado',
    copy: 'Copiar',
    open: 'Abrir',
    damage: 'Dano',
    range: 'Alcance',
    mobility: 'Mobilidade',
    control: 'Controle',
    pairWith: 'Combinar com',
    shareableBuild: 'Build compartilhável',
    attachments: 'Acessórios',
    performance: 'Desempenho',
    advancedData: 'Dados avançados',
    ttkClose: 'TTK perto',
    ads: 'ADS',
    velocity: 'Velocidade da bala',
    reload: 'Recarga',
    strengths: 'Pontos fortes',
    weaknesses: 'Fraquezas',
    openBuild: 'Abrir build',
    updated: 'Atualizado',
    tier: 'Tier',
    metaScore: 'Pontuação meta',
    note: 'Nota',
  },
  nl: {
    metaWatch: 'Meta watch',
    meta: 'Meta',
    saved: 'Opgeslagen',
    save: 'Opslaan',
    copied: 'Gekopieerd',
    copy: 'Kopiëren',
    open: 'Openen',
    damage: 'Schade',
    range: 'Bereik',
    mobility: 'Mobiliteit',
    control: 'Controle',
    pairWith: 'Combineer met',
    shareableBuild: 'Deelbare build',
    attachments: 'Attachments',
    performance: 'Prestatie',
    advancedData: 'Geavanceerde data',
    ttkClose: 'TTK dichtbij',
    ads: 'ADS',
    velocity: 'Kogelsnelheid',
    reload: 'Herladen',
    strengths: 'Sterktes',
    weaknesses: 'Zwaktes',
    openBuild: 'Build openen',
    updated: 'Bijgewerkt',
    tier: 'Tier',
    metaScore: 'Meta-score',
    note: 'Notitie',
  },
  pl: {
    metaWatch: 'Meta do obserwacji',
    meta: 'Meta',
    saved: 'Zapisano',
    save: 'Zapisz',
    copied: 'Skopiowano',
    copy: 'Kopiuj',
    open: 'Otwórz',
    damage: 'Obrażenia',
    range: 'Zasięg',
    mobility: 'Mobilność',
    control: 'Kontrola',
    pairWith: 'Połącz z',
    shareableBuild: 'Build do udostępnienia',
    attachments: 'Dodatki',
    performance: 'Wydajność',
    advancedData: 'Dane zaawansowane',
    ttkClose: 'TTK blisko',
    ads: 'ADS',
    velocity: 'Prędkość pocisku',
    reload: 'Przeładowanie',
    strengths: 'Zalety',
    weaknesses: 'Wady',
    openBuild: 'Otwórz build',
    updated: 'Zaktualizowano',
    tier: 'Tier',
    metaScore: 'Wynik meta',
    note: 'Notatka',
  },
  ja: {
    metaWatch: 'メタ監視',
    meta: 'メタ',
    saved: '保存済み',
    save: '保存',
    copied: 'コピー済み',
    copy: 'コピー',
    open: '開く',
    damage: 'ダメージ',
    range: '射程',
    mobility: '機動性',
    control: '制御',
    pairWith: '組み合わせ',
    shareableBuild: '共有ビルド',
    attachments: 'アタッチメント',
    performance: '性能',
    advancedData: '詳細データ',
    ttkClose: '近距離TTK',
    ads: 'ADS',
    velocity: '弾速',
    reload: 'リロード',
    strengths: '強み',
    weaknesses: '弱点',
    openBuild: 'ビルドを開く',
    updated: '更新',
    tier: 'ティア',
    metaScore: 'メタスコア',
    note: 'メモ',
  },
} as const;

function getCardCopy(locale: Locale) {
  return CARD_COPY[locale as keyof typeof CARD_COPY] ?? CARD_COPY.en;
}

interface LoadoutCardProps {
  loadout: Loadout;
  metaScore: number;
  confidence?: string;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  locale?: Locale;
}

export default function LoadoutCard({ loadout, metaScore, confidence, isFavorite = false, onToggleFavorite, locale = DEFAULT_LOCALE }: LoadoutCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const slug = getLoadoutSlug(loadout);
  const imageSrc = IMAGE_SOURCES[imageIndex](slug);
  const detailHref = withLocalePath(`/loadouts/${loadout.id}`, locale);
  const pairLabel = loadout.pairWith?.slice(0, 2).join(' / ');
  const copy = getCardCopy(locale);
  const displayNote = localizeLoadoutNote(loadout.weapon, loadout.playstyle, loadout.notes, locale);
  const topStats = useMemo(() => {
    return [
      [copy.damage, loadout.stats.damage],
      [copy.range, loadout.stats.range],
      [copy.mobility, loadout.stats.mobility],
      [copy.control, loadout.stats.control],
    ];
  }, [copy.control, copy.damage, copy.mobility, copy.range, loadout.stats]);

  async function copyLoadout() {
    const shareText = [
      `${loadout.weapon} (${loadout.category} / ${loadout.playstyle})`,
      `${copy.tier} ${loadout.tier} - ${copy.metaScore} ${metaScore}`,
      ...loadout.attachments.map((attachment) => `${attachment.slot}: ${attachment.name}`),
      displayNote ? `${copy.note}: ${displayNote}` : '',
    ].filter(Boolean).join('\n');

    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <article className="loadout-card" id={`loadout-${loadout.id}`}>
      <button type="button" className="loadout-summary" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
        <span className="tier-chip">{loadout.tier}</span>
        <span className="weapon-art">
          <Image
            src={imageSrc}
            alt=""
            width={160}
            height={80}
            unoptimized
            onError={() => setImageIndex((current) => current < IMAGE_SOURCES.length - 1 ? current + 1 : current)}
          />
        </span>
        <span className="loadout-title">
          <strong>{loadout.weapon}</strong>
          <small>{translateTerm(loadout.category, locale)} / {translateTerm(loadout.playstyle, locale)}</small>
        </span>
        <span className="loadout-score">
          <strong>{metaScore}</strong>
          <small>{copy.meta}</small>
        </span>
      </button>
      <div className="loadout-card-tools">
        <span>{confidence ?? copy.metaWatch}</span>
        <div>
          {onToggleFavorite && (
            <button type="button" onClick={onToggleFavorite} aria-pressed={isFavorite}>
              {isFavorite ? copy.saved : copy.save}
            </button>
          )}
          <button type="button" onClick={copyLoadout}>{copied ? copy.copied : copy.copy}</button>
          <Link href={detailHref}>{copy.open}</Link>
        </div>
      </div>

      <div className="quick-stats">
        {topStats.map(([label, value]) => (
          <span key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
          </span>
        ))}
      </div>

      <div className="loadout-share-strip">
        {pairLabel && <span>{copy.pairWith} {pairLabel}</span>}
        <Link href={detailHref}>{copy.shareableBuild}</Link>
      </div>

      {expanded && (
        <div className="loadout-details">
          <div className="attachment-panel">
            <div className="mini-heading">{copy.attachments}</div>
            <div className="attachment-list">
              {loadout.attachments.map((attachment) => (
                <div key={`${attachment.slot}-${attachment.name}`}>
                  <span>{attachment.slot}</span>
                  <strong>{attachment.name}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="stat-panel">
            <div className="mini-heading">{copy.performance}</div>
            <StatBar label={copy.damage} value={loadout.stats.damage} />
            <StatBar label={copy.range} value={loadout.stats.range} />
            <StatBar label={copy.mobility} value={loadout.stats.mobility} />
            <StatBar label={copy.control} value={loadout.stats.control} />
          </div>

          {loadout.advanced && (
            <div className="advanced-panel">
              <div className="mini-heading">{copy.advancedData}</div>
              <span><small>{copy.ttkClose}</small><strong>{loadout.advanced.ttkClose ? `${loadout.advanced.ttkClose} ms` : 'N/A'}</strong></span>
              <span><small>{copy.ads}</small><strong>{loadout.advanced.ads ? `${loadout.advanced.ads} ms` : 'N/A'}</strong></span>
              <span><small>{copy.velocity}</small><strong>{loadout.advanced.bulletVelocity ? `${loadout.advanced.bulletVelocity} m/s` : 'N/A'}</strong></span>
              <span><small>{copy.reload}</small><strong>{loadout.advanced.reload ? `${loadout.advanced.reload} ms` : 'N/A'}</strong></span>
            </div>
          )}

          {(loadout.strengths?.length || loadout.weaknesses?.length) && (
            <div className="loadout-pros-cons">
              {loadout.strengths?.length ? (
                <div>
                  <div className="mini-heading">{copy.strengths}</div>
                  {loadout.strengths.slice(0, 3).map((item) => <span key={item}>{item}</span>)}
                </div>
              ) : null}
              {loadout.weaknesses?.length ? (
                <div>
                  <div className="mini-heading">{copy.weaknesses}</div>
                  {loadout.weaknesses.slice(0, 3).map((item) => <span key={item}>{item}</span>)}
                </div>
              ) : null}
            </div>
          )}

          {displayNote && <p className="loadout-note">{displayNote}</p>}
          <div className="loadout-actions">
            <Link className="loadout-detail-link" href={detailHref}>
              {copy.openBuild}
            </Link>
            <button type="button" onClick={copyLoadout}>{copied ? copy.copied : copy.copy}</button>
          </div>
          <small className="updated-at">{copy.updated} {loadout.updatedAt}</small>
        </div>
      )}
    </article>
  );
}
