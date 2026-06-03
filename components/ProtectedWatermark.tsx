import type { UserSession } from '@/lib/userAuth';

function maskEmail(email?: string) {
  if (!email || !email.includes('@')) return 'account-protected';
  const [name, domain] = email.split('@');
  const visibleName = name.slice(0, 2);
  const domainParts = domain.split('.');
  const visibleDomain = domainParts[0]?.slice(0, 2) || 'id';
  const suffix = domainParts.length > 1 ? domainParts.at(-1) : 'mail';
  return `${visibleName}***@${visibleDomain}***.${suffix}`;
}

export default function ProtectedWatermark({ user, toolId }: { user: UserSession; toolId: string }) {
  const label = `${maskEmail(user.email)} / ${toolId} / ${new Date().toISOString().slice(0, 10)}`;

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[2147483000] pointer-events-none opacity-[0.075]"
        style={{
          backgroundImage: `repeating-linear-gradient(-28deg, transparent 0 92px, rgba(16,16,14,0.18) 92px 94px, transparent 94px 188px)`,
        }}
      />
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[2147483001] pointer-events-none grid grid-cols-3 items-center gap-[12vh_8vw] p-[8vh_6vw] text-[#10100e] font-mono text-[12px] font-extrabold tracking-normal leading-[1.4] opacity-[0.12] uppercase -rotate-[18deg]"
      >
        {Array.from({ length: 18 }).map((_, index) => (
          <span key={index}>{label}</span>
        ))}
      </div>
      <meta name="wzpro-watermark" content={`${toolId} / protected`} />
    </>
  );
}
