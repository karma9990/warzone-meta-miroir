import type { Metadata } from 'next';
import AiClassBuilder from '@/components/AiClassBuilder';
import LocalizedSafariBar from '@/components/LocalizedSafariBar';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'IA WZPRO Warzone Saison 04 - WZPRO Meta',
  description: 'Discute avec IA WZPRO pour creer une classe Warzone personnalisee selon ton profil, ton mode et les armes de la Saison 04 actuelle.',
};

export default function AiClassesPage() {
  return (
    <>
      <LocalizedSafariBar
        active="ai-classes"
        readout={['IA WZPRO // BUILDER', 'STATUS: LIVE', 'TRACKING: ACTIVE']}
      />
      <main className="ai-classes-page">
        <AiClassBuilder />
      </main>
    </>
  );
}
