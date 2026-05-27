import type { UserSession } from '@/lib/userAuth';

export default function ProtectedWatermark({ toolId }: { user: UserSession; toolId: string }) {
  const label = `wzprometa@gmail.com / ${toolId} / ${new Date().toISOString().slice(0, 10)}`;

  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 2147483000,
          pointerEvents: 'none',
          opacity: 0.075,
          backgroundImage: `repeating-linear-gradient(-28deg, transparent 0 92px, rgba(16,16,14,0.18) 92px 94px, transparent 94px 188px)`,
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 2147483001,
          pointerEvents: 'none',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          alignItems: 'center',
          gap: '12vh 8vw',
          padding: '8vh 6vw',
          color: '#10100e',
          fontFamily: 'monospace',
          fontSize: '10px',
          fontWeight: 800,
          letterSpacing: '0.16em',
          lineHeight: 1.4,
          opacity: 0.12,
          textTransform: 'uppercase',
          transform: 'rotate(-18deg)',
        }}
      >
        {Array.from({ length: 18 }).map((_, index) => (
          <span key={index}>{label}</span>
        ))}
      </div>
      <meta name="wzpro-watermark" content={label} />
    </>
  );
}
