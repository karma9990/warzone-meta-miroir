import { jwtVerify, type JWTPayload } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import LocalizedLink from '@/components/LocalizedLink';
import ProtectedWatermark from '@/components/ProtectedWatermark';
import { ADMIN_PREVIEW_COOKIE, isAuthenticated } from '@/lib/auth';
import { consumeClaimToken, grantEntitlement, hasToolAccess } from '@/lib/entitlementStore';
import { getNextMetaConfig } from '@/lib/nextMetaConfig';
import { getJwtSecret } from '@/lib/security';
import { isProToolId } from '@/lib/toolAccess';
import { getUserSession, type UserSession } from '@/lib/userAuth';
import SettingsCalculator from '@/components/SettingsCalculator';
import SensitivityConverter from '@/components/SensitivityConverter';
import RecoilVisualizer from '@/components/RecoilVisualizer';
import FovOptimizer from '@/components/FovOptimizer';
import MetaDashboard from '@/components/MetaDashboard';
import NextMetaPredictor from '@/components/NextMetaPredictor';
import RotationTool from '@/components/RotationTool';
import SlideCancelTrainer from '@/components/SlideCancelTrainer';
import PeekAngleVisualizer from '@/components/PeekAngleVisualizer';
import MovementSpeedReference from '@/components/MovementSpeedReference';
import HighGroundAtlas from '@/components/HighGroundAtlas';
import TTKCalculator from '@/components/TTKCalculator';
import DamageChart from '@/components/DamageChart';
import LoadoutBuilder from '@/components/LoadoutBuilder';
import TeamCompAnalyzer from '@/components/TeamCompAnalyzer';
import StatsTracker from '@/components/StatsTracker';
import ContractPriorityGuide from '@/components/ContractPriorityGuide';
import SpawnMapSelector from '@/components/SpawnMapSelector';
import PatchNotesTracker from '@/components/PatchNotesTracker';
import ZonePredictor from '@/components/ZonePredictor';
import RingTimer from '@/components/RingTimer';
import LootTierMap from '@/components/LootTierMap';
import SessionTracker from '@/components/SessionTracker';
import DeathAnalyzer from '@/components/DeathAnalyzer';
import CalloutGenerator from '@/components/CalloutGenerator';
import GunfightSimulator from '@/components/GunfightSimulator';
import OptimizerBlock from '@/components/OptimizerBlock';
import { getProToolContent, getToolVideo, type ToolVideo } from '@/lib/proToolContent';

function ToolVideoBlock({ video }: { video: ToolVideo }) {
  return (
    <div className="mb-5 p-4 border border-black/12 bg-black/[0.025]">
      <div className="mb-3">
        <p className="font-mono text-[0.55rem] tracking-[0.18em] text-[blue] m-0 mb-1">VIDEO REFERENCE</p>
        <h3 className="font-mono text-[0.95rem] tracking-[0.08em] m-0 mb-2 uppercase">{video.title}</h3>
        <p className="font-mono text-[0.7rem] leading-[1.6] opacity-55 m-0">{video.note}</p>
      </div>
      <iframe
        src={video.url}
        title={video.title}
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        className="w-full aspect-video border border-black/16 bg-[#10100e] block"
      />
    </div>
  );
}

const ADMIN_WATERMARK_USER: UserSession = {
  sub: 'admin-preview',
  provider: 'email',
  name: 'Admin Preview',
  email: 'admin-preview@wzpro.local',
};

export default async function ToolPage({
  params,
  searchParams,
}: {
  params: Promise<{ toolId: string }>;
  searchParams: Promise<{ token?: string; claimed?: string; preview?: string }>;
}) {
  const { toolId } = await params;
  const { token, claimed, preview } = await searchParams;
  const tool = await getProToolContent(toolId);

  if (!tool) return <InvalidPage message="Tool not found." />;
  if (!isProToolId(toolId)) return <InvalidPage message="Tool not found." />;

  const user = await getUserSession();
  const adminAuthenticated = await isAuthenticated();
  let watermarkUser: UserSession | null = user;
  let hasAccess = user ? await hasToolAccess(user.sub, toolId, user.email) : false;

  if (!hasAccess && adminAuthenticated) {
    hasAccess = true;
    watermarkUser = ADMIN_WATERMARK_USER;
  }

  if (preview === '1') {
    const cookieStore = await cookies();
    const previewToken = cookieStore.get(ADMIN_PREVIEW_COOKIE)?.value;

    if (!previewToken || !adminAuthenticated) {
      return <InvalidPage message="Invalid or expired admin preview." />;
    }

    let isValidPreview = false;
    try {
      const payload = (await jwtVerify(previewToken, getJwtSecret(), {
        algorithms: ['HS256'],
        issuer: 'wzpro-meta',
        audience: 'wzpro-meta-admin-preview',
      })).payload;
      isValidPreview = payload.adminPreview === true && payload.tokenUse === 'admin-preview' && payload.toolId === toolId;
    } catch {
      isValidPreview = false;
    }

    if (!isValidPreview) {
      return <InvalidPage message="Invalid or expired admin preview." />;
    }

    hasAccess = true;
    watermarkUser = ADMIN_WATERMARK_USER;
  }

  if (token) {
    let payload: JWTPayload | null = null;
    try {
      payload = (await jwtVerify(token, getJwtSecret(), {
        algorithms: ['HS256'],
        issuer: 'wzpro-meta',
        audience: 'wzpro-meta-tool-access',
      })).payload;
    } catch {
      return <InvalidPage message="Invalid or expired access link." />;
    }

    const tokenEmail = typeof payload.email === 'string' ? payload.email.toLowerCase() : '';
    const claimId = typeof payload.jti === 'string' ? payload.jti : '';

    if (payload.tokenUse !== 'tool-access-link' || payload.claim !== 'tool-access') {
      return <InvalidPage message="Invalid or expired access link." />;
    } else if (!user) {
      return <InvalidPage message="Sign in with the purchase email, then reopen this access link to claim the tool." />;
    } else if (tokenEmail && user.email?.toLowerCase() !== tokenEmail) {
      return <InvalidPage message="This purchase link belongs to another account email." />;
    } else if (payload.access === 'pro') {
      if (!await consumeClaimToken(claimId)) {
        return <InvalidPage message="This purchase link has already been used." />;
      }
      await grantEntitlement({ userId: user.sub, email: user.email, pro: true });
      redirect(`/tools/${toolId}?claimed=1`);
    } else if (payload.toolId === toolId) {
      if (!await consumeClaimToken(claimId)) {
        return <InvalidPage message="This purchase link has already been used." />;
      }
      await grantEntitlement({ userId: user.sub, email: user.email, toolId });
      redirect(`/tools/${toolId}?claimed=1`);
    } else {
      return <InvalidPage message="This purchase link is not valid for this tool." />;
    }
  }

  if (!hasAccess || !watermarkUser) {
    return <InvalidPage message="Sign in with an account that owns this Pro tool." />;
  }

  const nextMetaConfig = toolId === 'next-meta' ? await getNextMetaConfig() : null;

  return (
    <>
      <ProtectedWatermark user={watermarkUser} toolId={toolId} />
      <main className="max-w-[780px] mx-auto px-8 py-20 pb-24">
        <div className="mb-10">
          <LocalizedLink href="/pro-tools" className="font-mono text-[0.65rem] tracking-[0.18em] opacity-45 no-underline text-inherit">
            ← BACK TO TOOLS
          </LocalizedLink>
        </div>

        {claimed === '1' && (
          <div className="mb-6 border border-[rgba(22,60,255,0.22)] px-4 py-3 text-[#163cff] font-mono text-[0.68rem] tracking-[0.08em]">
            ACCESS CLAIMED ON THIS ACCOUNT
          </div>
        )}

        <p className="font-mono text-[0.6rem] tracking-[0.22em] opacity-40 m-0 mb-2">{tool.tag}</p>
        <h1 className="font-mono text-[clamp(1.8rem,5vw,3rem)] tracking-[0.1em] leading-none m-0 mb-12">
          {tool.name.toUpperCase()}
        </h1>

        {toolId === 'aim-tools' && <SettingsCalculator />}
        {toolId === 'aim-tools' && <SensitivityConverter />}
        {toolId === 'aim-tools' && <RecoilVisualizer />}
        {toolId === 'aim-tools' && <FovOptimizer />}
        {toolId === 'aim-tools' && <TTKCalculator />}
        {toolId === 'aim-tools' && <LoadoutBuilder />}
        {toolId === 'aim-tools' && <DamageChart />}
        {toolId === 'next-meta' && <MetaDashboard />}
        {toolId === 'next-meta' && <PatchNotesTracker />}
        {toolId === 'pro-movement' && <SlideCancelTrainer />}
        {toolId === 'pro-movement' && <PeekAngleVisualizer />}
        {toolId === 'pro-movement' && <MovementSpeedReference />}
        {toolId === 'pro-movement' && <HighGroundAtlas />}
        {toolId === 'pro-movement' && <RotationTool />}
        {toolId === 'how-to-be-a-pro' && <StatsTracker />}
        {toolId === 'how-to-be-a-pro' && <TeamCompAnalyzer />}
        {toolId === 'how-to-be-a-pro' && <ContractPriorityGuide />}
        {toolId === 'pro-spawn' && <SpawnMapSelector />}
        {toolId === 'pro-spawn' && <ZonePredictor />}
        {toolId === 'pro-spawn' && <RingTimer />}
        {toolId === 'pro-spawn' && <LootTierMap />}
        {toolId === 'how-to-be-a-pro' && <SessionTracker />}
        {toolId === 'how-to-be-a-pro' && <DeathAnalyzer />}
        {toolId === 'how-to-be-a-pro' && <CalloutGenerator />}
        {toolId === 'aim-tools' && <GunfightSimulator />}
        {toolId === 'next-meta' && nextMetaConfig && <NextMetaPredictor config={nextMetaConfig} />}

        <div className="flex flex-col gap-12">
          {tool.content.map((item, i) => (
            <div key={item.title} id={item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')} className="border-t border-black/12 pt-8">
              <div className="flex gap-3 items-center mb-4 flex-wrap">
                <span className="font-mono text-[0.55rem] tracking-[0.2em] opacity-35">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h2 className="font-mono text-[1rem] tracking-[0.08em] m-0">
                  {item.title.toUpperCase()}
                </h2>
                {item.difficulty && (
                  <span className="font-mono text-[0.42rem] tracking-[0.15em] px-2 py-[2px] rounded-sm"
                    style={{
                      border: `1px solid ${item.difficulty === 'hot' ? 'rgba(255,68,85,0.5)' : item.difficulty === 'medium' ? 'rgba(255,204,0,0.5)' : 'rgba(0,255,136,0.5)'}`,
                      color: item.difficulty === 'hot' ? '#ff4455' : item.difficulty === 'medium' ? '#ffcc00' : '#00ff88',
                      background: item.difficulty === 'hot' ? 'rgba(255,68,85,0.07)' : item.difficulty === 'medium' ? 'rgba(255,204,0,0.07)' : 'rgba(0,255,136,0.07)',
                    }}>
                    {item.difficulty === 'hot' ? '🔴 HOT DROP' : item.difficulty === 'medium' ? '🟡 MEDIUM' : '🟢 QUIET'}
                  </span>
                )}
                {item.category && (
                  <span className="font-mono text-[0.42rem] tracking-[0.15em] px-2 py-[2px] rounded-sm border border-[rgba(0,0,255,0.3)] text-[blue] bg-[rgba(0,0,255,0.05)]">
                    {item.category}
                  </span>
                )}
              </div>

              {getToolVideo(toolId, item) && <ToolVideoBlock video={getToolVideo(toolId, item)!} />}

              {item.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-auto block mb-5"
                />
              )}

              <p className="font-mono text-[0.78rem] leading-[1.85] opacity-70 m-0">
                {item.body}
              </p>

              {(item.pros || item.cons) && (
                <div className="grid grid-cols-2 gap-4 mt-5">
                  {item.pros && (
                    <div className="p-3 border border-[rgba(0,255,136,0.2)] rounded-sm bg-[rgba(0,255,136,0.03)]">
                      <div className="font-mono text-[0.45rem] tracking-[0.18em] text-[#00ff88] mb-2">ADVANTAGES</div>
                      {item.pros.map((p, j) => (
                        <div key={j} className="font-mono text-[0.65rem] leading-[1.7] opacity-75 flex gap-1">
                          <span className="text-[#00ff88] shrink-0">+</span>{p}
                        </div>
                      ))}
                    </div>
                  )}
                  {item.cons && (
                    <div className="p-3 border border-[rgba(255,70,70,0.2)] rounded-sm bg-[rgba(255,70,70,0.03)]">
                      <div className="font-mono text-[0.45rem] tracking-[0.18em] text-[#ff4455] mb-2">DISADVANTAGES</div>
                      {item.cons.map((c, j) => (
                        <div key={j} className="font-mono text-[0.65rem] leading-[1.7] opacity-75 flex gap-1">
                          <span className="text-[#ff4455] shrink-0">−</span>{c}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {item.sources && item.sources.length > 0 && (
                <div className="mt-5 pt-4 border-t border-black/7">
                  <p className="font-mono text-[0.55rem] tracking-[0.18em] opacity-35 m-0 mb-2">SOURCES</p>
                  <div className="flex flex-col gap-1">
                    {item.sources.map((src, j) => (
                      <a key={j} href={src.url} target="_blank" rel="noopener noreferrer" className="font-mono text-[0.65rem] opacity-50 text-[blue] no-underline">
                        → {src.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {toolId === 'pro-opti' && <OptimizerBlock />}

        <div className="mt-16 p-5 border border-black/10 bg-black/[0.02] flex justify-between items-center gap-4">
          <p className="font-mono text-[0.72rem] opacity-55 m-0">Want all 6 tools?</p>
          <LocalizedLink href="/pro-access" className="font-mono text-[0.7rem] tracking-[0.1em] text-[blue] no-underline">
            Upgrade to Pro — 50 € / month →
          </LocalizedLink>
        </div>
      </main>
    </>
  );
}

function InvalidPage({ message }: { message: string }) {
  return (
    <main className="max-w-[760px] mx-auto px-8 py-20">
      <p className="font-mono text-[0.65rem] tracking-[0.2em] opacity-42 m-0">PRO TOOL PREVIEW</p>
      <h1 className="font-mono text-[clamp(2rem,6vw,4rem)] tracking-[0.08em] leading-[0.95] my-2 mb-4">LOCKED ACCESS</h1>
      <p className="font-mono text-[0.82rem] opacity-66 leading-[1.75] max-w-[620px]">{message}</p>
      <div className="grid grid-cols-3 gap-px my-8 border border-black/14 bg-black/14">
        {[
          ['Interactive tools', 'calculators, trackers and drills'],
          ['Field guides', 'step-by-step practical routines'],
          ['Meta updates', 'patch reads and build adjustments'],
        ].map(([title, body]) => (
          <article key={title} className="bg-[rgba(239,238,232,0.74)] p-4">
            <strong className="block font-mono text-[0.78rem] tracking-[0.08em] mb-2">{title}</strong>
            <span className="block font-mono text-[0.68rem] leading-[1.55] opacity-56">{body}</span>
          </article>
        ))}
      </div>
      <LocalizedLink href="/tools-individual" className="inline-block mt-8 font-mono text-[0.7rem] tracking-[0.12em] text-[blue] no-underline">
        ← Back to tools
      </LocalizedLink>
      <div className="flex gap-3 flex-wrap mt-4">
        <LocalizedLink href="/sign-in" className="inline-flex items-center min-h-[42px] px-4 bg-[blue] text-white font-mono text-[0.7rem] tracking-[0.12em] no-underline">
          SIGN IN
        </LocalizedLink>
        <LocalizedLink href="/pro-access" className="inline-flex items-center min-h-[42px] px-4 border border-black/18 text-[blue] font-mono text-[0.7rem] tracking-[0.12em] no-underline">
          GET PRO
        </LocalizedLink>
      </div>
    </main>
  );
}
