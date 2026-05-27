import Link from 'next/link';
import type { ReactNode } from 'react';

type Section = {
  title: string;
  body: ReactNode;
};

export default function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: string;
  sections: Section[];
}) {
  return (
    <main className="legal-page">
      <div className="legal-back">
        <Link href="/">BACK TO WZ META</Link>
      </div>
      <p className="legal-kicker">LEGAL / WZPRO META</p>
      <h1>{title}</h1>
      <p className="legal-updated">Last updated: {updated}</p>
      <p className="legal-intro">{intro}</p>

      <div className="legal-stack">
        {sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            <div>{section.body}</div>
          </section>
        ))}
      </div>

      <nav className="legal-nav" aria-label="Legal links">
        <Link href="/legal">Legal Notice</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/refund">Refund</Link>
        <Link href="/cancellation">Cancellation</Link>
        <Link href="/billing">Billing</Link>
        <Link href="/disclaimer">Disclaimer</Link>
        <Link href="/acceptable-use">Acceptable Use</Link>
        <Link href="/cookies">Cookies</Link>
        <Link href="/contact">Contact</Link>
      </nav>
    </main>
  );
}
