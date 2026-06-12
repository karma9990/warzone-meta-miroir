import type { Metadata } from 'next';
import LocalizedSafariBar from '@/components/LocalizedSafariBar';

export const metadata: Metadata = {
  title: 'Tournois WZPROMETA - Warzone | WZPRO Meta',
  description: 'WZPROMETA community Warzone tournaments: formats, rules, registration and results.',
};

export default function TournoisPage() {
  return (
    <>
      <div className="pt-technical-backdrop" aria-hidden="true" />

      <LocalizedSafariBar
        active="tournois"
        readout={['TOURNAMENTS // WZPROMETA', 'STATUS: LIVE', 'TRACKING: ACTIVE']}
      />

      <main className="tournois-construction-main" aria-labelledby="tournois-construction-title">
        <section className="tournois-construction-stage">
          <h1 id="tournois-construction-title">En construction</h1>
          <div className="tournois-gear" aria-hidden="true">⚙</div>
        </section>
      </main>
    </>
  );
}
