import Link from 'next/link';

export default function LegalFooter() {
  return (
    <footer className="legal-footer">
      <div>
        <strong>WZPRO Meta</strong>
        <span>Warzone tools, loadouts and PC optimization resources.</span>
      </div>
      <nav aria-label="Legal">
        <Link href="/legal">Legal Notice</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/refund">Refunds</Link>
        <Link href="/cancellation">Cancellation</Link>
        <Link href="/billing">Billing</Link>
        <Link href="/disclaimer">Disclaimer</Link>
        <Link href="/acceptable-use">Acceptable Use</Link>
        <Link href="/cookies">Cookies</Link>
        <Link href="/contact">Contact</Link>
      </nav>
    </footer>
  );
}
