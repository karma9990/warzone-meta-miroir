'use client';

import { useMemo } from 'react';
import type { NextMetaConfig, NextMetaPatchSignal, NextMetaRangeRole } from '@/lib/nextMetaConfig';

const SIGNAL_CONFIG: Record<NextMetaPatchSignal, { label: string; score: number; tone: string }> = {
  buff: { label: 'Direct buff', score: 36, tone: 'Positive patch signal' },
  'indirect-buff': { label: 'Indirect buff', score: 24, tone: 'Meta opening' },
  unchanged: { label: 'No direct change', score: 8, tone: 'Stable baseline' },
  nerf: { label: 'Nerf recovery', score: -14, tone: 'Risk check' },
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getVerdict(score: number) {
  if (score >= 82) return 'Priority next-meta candidate';
  if (score >= 66) return 'Strong watchlist pick';
  if (score >= 48) return 'Needs testing before calling meta';
  return 'Niche or risky prediction';
}

function getTestPlan(role: NextMetaRangeRole) {
  if (role === 'Close range') return 'Watch close-range fights first: ADS timing, sprint-to-fire, hipfire panic fights and first-shot consistency inside 15 meters.';
  if (role === 'Sniper support') return 'Watch 15-45 meter fights: recoil recovery, strafe speed, reload timing and how well it resets after a sniper crack.';
  if (role === 'Long range') return 'Watch 45-90 meter fights: bullet velocity feel, visual recoil, sustained tracking and whether the build still wins after armor breaks.';
  return 'Watch if the weapon can cover more than one role without becoming average everywhere.';
}

export default function NextMetaPredictor({ config }: { config: NextMetaConfig }) {
  const filledAttachments = useMemo(
    () => config.defaultAttachments.filter(item => item.slot.trim() || item.name.trim()),
    [config.defaultAttachments],
  );

  const score = clamp(config.priorityScore, 0, 100);

  return (
    <div className="border border-black/14 bg-white/28 font-mono mb-12">
      <div className="grid grid-cols-[1fr_170px] gap-6 items-end p-6 border-b border-black/12 bg-white/18">
        <div>
          <p className="text-[0.55rem] tracking-[0.16em] opacity-48 uppercase mb-1">Admin forecast / last update {config.updatedAt}</p>
          <h2 className="text-[clamp(1.4rem,5vw,2.6rem)] leading-[0.98] tracking-normal uppercase my-[0.45rem]">{config.defaultWeapon}</h2>
          <p className="text-[0.72rem] leading-relaxed opacity-68 mt-[0.9rem]">
            This is the current WZPRO forecast curated from patch direction, weapon tuning and practical lobby value.
          </p>
        </div>
        <div className="self-stretch grid content-center min-h-[150px] p-4 text-right"
          style={{ background: '#163cff', color: '#fff' }}
        >
          <span className="block text-5xl font-black leading-[0.9] text-white">{score}</span>
          <small className="block mt-[0.55rem] text-[0.58rem] leading-relaxed opacity-72 uppercase text-white">{getVerdict(score)}</small>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_300px] max-[760px]:grid-cols-1">
        <div className="p-6 border-r border-black/12 max-[760px]:border-r-0 max-[760px]:border-b border-black/12">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-[0.55rem] tracking-[0.16em] px-2 py-1.5 border border-black/12 opacity-72 uppercase">{config.defaultCategory}</span>
            <span className="text-[0.55rem] tracking-[0.16em] px-2 py-1.5 border border-black/12 opacity-72 uppercase">{config.defaultRole}</span>
            <span className="text-[0.55rem] tracking-[0.16em] px-2 py-1.5 border border-black/12 opacity-72 uppercase">{SIGNAL_CONFIG[config.defaultSignal].label}</span>
          </div>

          <div className="grid gap-[0.6rem] mt-5 mb-5 p-4 border border-black/10 bg-black/2.5">
            <div className="flex justify-between gap-4 items-center">
              <span className="text-[0.55rem] tracking-[0.16em] opacity-48 uppercase">Admin confidence</span>
              <strong className="text-lg" style={{ color: '#163cff' }}>{config.defaultConfidence}%</strong>
            </div>
            <div className="h-2" style={{ background: 'rgba(16,16,14,0.12)' }}>
              <i className="block h-full" style={{ width: `${clamp(config.defaultConfidence, 0, 100)}%`, background: '#163cff' }} />
            </div>
          </div>

          <section>
            <span className="text-[0.55rem] tracking-[0.16em] opacity-48 uppercase">Patch logic</span>
            <p className="text-[0.72rem] leading-relaxed opacity-68 mt-[0.9rem]">{config.defaultPatchNote}</p>
          </section>
          <section className="mt-5 pt-5 border-t border-black/10">
            <span className="text-[0.55rem] tracking-[0.16em] opacity-48 uppercase">Why it could become meta</span>
            <p className="text-[0.72rem] leading-relaxed opacity-68 mt-[0.9rem]">{config.defaultReason}</p>
          </section>
        </div>

        <div className="p-6">
          <span className="text-[0.55rem] tracking-[0.16em] opacity-48 uppercase">Recommended build</span>
          <div className="grid gap-[0.6rem] mt-3">
            {filledAttachments.map((attachment, index) => (
              <div key={`${attachment.slot}-${index}`} className="grid grid-cols-[0.75fr_1fr] gap-3 p-3 border border-black/10 bg-black/2.5">
                <span className="text-[0.58rem] opacity-48 uppercase">{attachment.slot}</span>
                <strong className="text-[0.68rem] text-right">{attachment.name || 'TBD'}</strong>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-5 border-t border-black/10">
            <span className="text-[0.55rem] tracking-[0.16em] opacity-48 uppercase">What to watch</span>
            <p className="text-[0.72rem] leading-relaxed opacity-68 mt-[0.9rem]">{getTestPlan(config.defaultRole)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
