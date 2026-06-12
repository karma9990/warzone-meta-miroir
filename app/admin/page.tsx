'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Loadout, Attachment, Tier } from '@/lib/data';
import type { CommunityPost } from '@/lib/communityStore';
import type { NextMetaAttachment, NextMetaConfig, NextMetaPatchSignal, NextMetaRangeRole } from '@/lib/nextMetaConfig';
import type { ProToolContentMap, ToolItem } from '@/lib/proToolContent';
import type { SiteContent } from '@/lib/siteContent';
import type { SiteControls, SetupBuild, EsportSource, LoadoutPairControl } from '@/lib/siteControls';
import weaponsData from '@/scripts/weapons.json';
import attachmentsData from '@/scripts/attachments-slots.json';

interface AttachmentEntry {
  slot: string;
  name: string;
  game: string;
}

function WImg({ id, style }: { id: string; style?: React.CSSProperties }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const tryLoad = (ext: string, fallback?: string) => {
      const img = new window.Image();
      img.onload = () => { if (!cancelled) setSrc(`/assets/weapons/${id}.${ext}`); };
      img.onerror = () => { if (!cancelled && fallback) tryLoad(fallback); };
      img.src = `/assets/weapons/${id}.${ext}`;
    };
    tryLoad('webp', 'avif');
    return () => { cancelled = true; };
  }, [id]);

  if (!src) return null;
  return <Image src={src} alt="" width={160} height={90} style={style} unoptimized />;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIERS: Tier[] = ['S', 'A', 'B', 'C'];
const TIER_COLORS: Record<Tier, string> = {
  S: 'var(--tier-s)',
  A: 'var(--tier-a)',
  B: 'var(--tier-b)',
  C: 'var(--tier-c)',
};

const CATEGORIES = [
  'Assault Rifle', 'Battle Rifle', 'SMG', 'LMG',
  'Sniper', 'Marksman', 'Shotgun', 'Pistol', 'Launcher', 'Melee', 'Special',
];

const PLAYSTYLES = ['Close-Range', 'Mid-Range', 'Long-Range', 'Versatile'];

const ATTACHMENT_SLOTS = [
  'Muzzle', 'Barrel', 'Laser', 'Optic', 'Stock',
  'Rear Grip', 'Magazine', 'Underbarrel', 'Comb', 'Guard',
];

const CAT_MAP: Record<string, string> = {
  'ASSAULT RIFLE': 'Assault Rifle',
  'BATTLE RIFLE':  'Battle Rifle',
  'SMG':           'SMG',
  'LMG':           'LMG',
  'SNIPER RIFLE':  'Sniper',
  'SNIPER':        'Sniper',
  'MARKSMAN RIFLE':'Marksman',
  'MARKSMAN':      'Marksman',
  'SHOTGUN':       'Shotgun',
  'PISTOL':        'Pistol',
  'LAUNCHER':      'Launcher',
  'MELEE':         'Melee',
  'SPECIAL':       'Special',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface WeaponEntry {
  id: string;
  name: string;
  category: string;
  game: string;
}

// ─── Empty form ───────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  weapon: '',
  weaponId: '',
  category: 'Assault Rifle',
  tier: 'B' as Tier,
  playstyle: 'Mid-Range',
  attachments: [{ slot: 'Muzzle', name: '' }] as Attachment[],
  stats: { damage: 50, range: 50, mobility: 50, control: 50 },
  notes: '',
};

// ─── Tools catalog ────────────────────────────────────────────────────────────

const TOOLS = [
  { id: 'aim-tools',       name: 'Aim Tools',       tag: 'PRECISION',   desc: 'Sensitivity, ADS, dead zone, crosshair placement, recoil.' },
  { id: 'next-meta',       name: 'Next Meta',        tag: 'INTEL',       desc: 'Meta forecasts, emerging weapons, pro trends.' },
  { id: 'pro-movement',    name: 'Pro Movement',     tag: 'MECHANICS',   desc: 'Slide cancel, bunny hop, repositioning, rotations.' },
  { id: 'how-to-be-a-pro', name: 'How To Be A Pro', tag: 'MINDSET',     desc: 'Discipline, routine, mindset, warm-up, gameplay review.' },
  { id: 'pro-spawn',       name: 'Pro Spawn',        tag: 'MAP CONTROL', desc: 'Spawn reading, positioning, map rotations.' },
  { id: 'pro-opti',        name: 'Pro Opti',         tag: 'PERFORMANCE', desc: 'FPS, graphics settings, network, PC optimization.' },
];

const NEXT_META_SIGNALS: NextMetaPatchSignal[] = ['buff', 'indirect-buff', 'unchanged', 'nerf'];
const NEXT_META_ROLES: NextMetaRangeRole[] = ['Close range', 'Sniper support', 'Long range', 'Flex'];
const DEFAULT_DUO_PERKS = ['Scavenger', 'Sprinter', 'Hunter'];
const PERK_OPTIONS = ['Scavenger', 'Sprinter', 'Hunter', 'Mountaineer', 'Tempered', 'Ghost', 'High Alert', 'Quick Fix', 'Tracker', 'Survivor', 'Field Medic'];

const EMPTY_NEXT_META_CONFIG: NextMetaConfig = {
  weaponOptions: ['MPC-25'],
  defaultWeapon: 'MPC-25',
  defaultCategory: 'SMG',
  defaultRole: 'Close range',
  defaultSignal: 'buff',
  defaultPatchNote: '',
  defaultReason: '',
  defaultConfidence: 70,
  priorityScore: 70,
  defaultAttachments: [{ slot: 'Muzzle', name: '' }],
  updatedAt: '',
};

const EMPTY_SITE_CONTENT: SiteContent = {
  home: {
    metaLeft: '',
    metaCenter: '',
    metaRight: '',
    titleTop: '',
    titleMiddle: '',
    titleBottom: '',
    eyebrow: '',
    description: '',
    primaryCta: '',
    secondaryCta: '',
  },
  proAccess: {
    backLabel: '',
    badge: '',
    tag: '',
    title: '',
    description: '',
    price: '',
    period: '',
    proofs: [],
    cta: '',
  },
  freePreview: {
    backLabel: '',
    kicker: '',
    title: '',
    lead: '',
    primaryCta: '',
    secondaryCta: '',
    features: [],
    currentKicker: '',
    currentTitle: '',
    patchChecked: '',
    patchUrl: 'https://example.com',
    patchLinkLabel: '',
    patchHighlights: [],
    metaKicker: '',
    metaTitle: '',
    metaSignals: [],
    mapKicker: '',
    mapTitle: '',
    mapNotes: [],
    checklistKicker: '',
    checklistTitle: '',
    weeklyChecklist: [],
    sampleKicker: '',
    sampleTitle: '',
    sampleBriefing: [],
  },
  community: {
    kicker: '',
    titleTop: '',
    titleBottom: '',
    description: '',
  },
  updatedAt: '',
};

const EMPTY_SITE_CONTROLS: SiteControls = {
  home: {
    rankingWeaponIds: [],
    loadoutPairIds: [],
    compareWeaponIds: [],
    currentLongRangeId: '',
    closeMetaId: '',
    dailyDuoIds: [],
  },
  setup: {
    checklist: [],
    builds: [],
  },
  esport: {
    starterSteps: [],
    tournamentSources: [],
    discordSources: [],
  },
  updatedAt: '',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const LABEL_CLASS = 'block text-[var(--text-dim)] text-[12px] tracking-normal uppercase mb-1.5';

// ─── Sidebar nav item ─────────────────────────────────────────────────────────

function NavItem({
  label, badge, active, onClick, icon,
}: {
  label: string;
  badge?: number | string;
  active: boolean;
  onClick: () => void;
  icon: string;
}) {
  return (
    <button type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-[9px] rounded border-none text-[12px] tracking-normal uppercase cursor-pointer text-left transition-all duration-150 font-[inherit]"
      style={{
        background: active ? 'rgba(0,255,136,0.08)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text-dim)',
        fontWeight: active ? 700 : 400,
        borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--surface2)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <span className="text-[14px] opacity-80">{icon}</span>
      <span className="flex-1">{label}</span>
      {badge !== undefined && (
        <span className="text-[10px] px-1.5 py-[1px] rounded-[10px] font-semibold"
          style={{
            background: active ? 'rgba(0,255,136,0.15)' : 'var(--surface2)',
            color: active ? 'var(--accent)' : 'var(--text-dim)',
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [authed, setAuthed]         = useState(false);
  const [password, setPassword]     = useState('');
  const [authError, setAuthError]   = useState('');
  const [loadouts, setLoadouts]     = useState<Loadout[]>([]);
  const [form, setForm]             = useState({ ...EMPTY_FORM, attachments: [{ slot: 'Muzzle', name: '' }] });
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [saving, setSaving]         = useState(false);
  const [msg, setMsg]               = useState('');
  const [view, setView]             = useState<'list' | 'form' | 'tools' | 'next-meta' | 'site-content' | 'free-preview' | 'site-controls' | 'community'>('list');
  const [nextMeta, setNextMeta]     = useState<NextMetaConfig>(EMPTY_NEXT_META_CONFIG);
  const [nextMetaWeaponsText, setNextMetaWeaponsText] = useState('');
  const [nextMetaSaving, setNextMetaSaving] = useState(false);
  const [siteContent, setSiteContent] = useState<SiteContent>(EMPTY_SITE_CONTENT);
  const [siteContentSaving, setSiteContentSaving] = useState(false);
  const [toolContent, setToolContent] = useState<ProToolContentMap>({});
  const [toolContentSaving, setToolContentSaving] = useState(false);
  const [selectedToolId, setSelectedToolId] = useState(TOOLS[0]?.id ?? 'aim-tools');
  const [patchNotesSyncing, setPatchNotesSyncing] = useState(false);
  const [newsSyncing, setNewsSyncing] = useState(false);
  const [openAiHealth, setOpenAiHealth] = useState<{
    ok: boolean;
    message: string;
    providers: Array<{ provider: string; ok: boolean; hasKey: boolean; status: number | null; model: string; message: string }>;
  } | null>(null);
  const [openAiChecking, setOpenAiChecking] = useState(false);
  const [siteControls, setSiteControls] = useState<SiteControls>(EMPTY_SITE_CONTROLS);
  const [siteControlsSaving, setSiteControlsSaving] = useState(false);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);

  // Tools preview
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);

  // Weapon autocomplete
  const [allWeapons]                          = useState<WeaponEntry[]>(weaponsData as WeaponEntry[]);
  const [weaponQuery, setWeaponQuery]         = useState('');
  const [showDropdown, setShowDropdown]       = useState(false);

  // Attachment autocomplete
  const [allAttachments]                      = useState<AttachmentEntry[]>(attachmentsData as AttachmentEntry[]);
  const [attQueries, setAttQueries]           = useState<string[]>([]);
  const [attDropdowns, setAttDropdowns]       = useState<number | null>(null);
  const [dropdownIdx, setDropdownIdx]         = useState(0);
  const weaponInputRef                        = useRef<HTMLInputElement>(null);

  const filteredWeapons = weaponQuery.length >= 1
    ? allWeapons
        .filter(w =>
          w.name.toLowerCase().includes(weaponQuery.toLowerCase()) ||
          w.id.toLowerCase().includes(weaponQuery.toLowerCase())
        )
        .slice(0, 8)
    : [];

  const fetchLoadouts = useCallback(async () => {
    const res = await fetch('/api/loadouts');
    if (res.ok) setLoadouts(await res.json());
  }, []);

  const applyNextMetaConfig = (config: NextMetaConfig) => {
    setNextMeta(config);
    setNextMetaWeaponsText(config.weaponOptions.join('\n'));
  };

  const fetchNextMetaConfig = useCallback(async () => {
    const res = await fetch('/api/admin/next-meta');
    if (res.ok) applyNextMetaConfig(await res.json());
  }, []);

  const fetchSiteContent = useCallback(async () => {
    const res = await fetch('/api/admin/site-content');
    if (res.ok) setSiteContent(await res.json());
  }, []);

  const fetchToolContent = useCallback(async () => {
    const res = await fetch('/api/admin/tool-content');
    if (res.ok) setToolContent(await res.json());
  }, []);

  const fetchSiteControls = useCallback(async () => {
    const res = await fetch('/api/admin/site-controls');
    if (res.ok) setSiteControls(await res.json());
  }, []);

  const fetchCommunityPosts = useCallback(async () => {
    const res = await fetch('/api/admin/community');
    if (res.ok) setCommunityPosts(await res.json());
  }, []);

  const flash = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 3000);
  };

  // ─── Auth ─────────────────────────────────────────────────────────────────

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setAuthed(true);
      await fetchLoadouts();
      await fetchNextMetaConfig();
      await fetchSiteContent();
      await fetchToolContent();
      await fetchSiteControls();
      await fetchCommunityPosts();
    } else {
      setAuthError('Incorrect password');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    setAuthed(false);
  };

  // ─── Form helpers ─────────────────────────────────────────────────────────

  const setField = (key: string, value: unknown) =>
    setForm(f => ({ ...f, [key]: value }));

  const setStat = (key: string, value: number) =>
    setForm(f => ({ ...f, stats: { ...f.stats, [key]: Math.max(0, Math.min(100, value)) } }));

  const setAttQuery = (i: number, v: string) =>
    setAttQueries(q => { const a = [...q]; a[i] = v; return a; });

  const selectAttachment = (i: number, name: string) => {
    setAttachment(i, 'name', name);
    setAttQuery(i, '');
    setAttDropdowns(null);
  };

  const getAttSuggestions = (i: number, slot: string) => {
    const q = (attQueries[i] || '').toLowerCase();
    if (!q) return [];
    return allAttachments
      .filter(a => a.slot === slot && a.name.toLowerCase().includes(q))
      .slice(0, 8);
  };

  const setAttachment = (i: number, field: 'slot' | 'name', value: string) =>
    setForm(f => {
      const atts = [...f.attachments];
      atts[i] = { ...atts[i], [field]: value };
      return { ...f, attachments: atts };
    });

  const addAttachment = () => {
    if (form.attachments.length >= 10) return;
    setForm(f => ({ ...f, attachments: [...f.attachments, { slot: 'Muzzle', name: '' }] }));
  };

  const removeAttachment = (i: number) =>
    setForm(f => ({ ...f, attachments: f.attachments.filter((_, idx) => idx !== i) }));

  const selectWeapon = (w: WeaponEntry) => {
    const cat = CAT_MAP[w.category] || w.category;
    setField('weapon', w.name);
    setField('weaponId', w.id);
    setField('category', CATEGORIES.includes(cat) ? cat : form.category);
    setWeaponQuery('');
    setShowDropdown(false);
    setDropdownIdx(0);
  };

  const handleWeaponKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || filteredWeapons.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setDropdownIdx(i => Math.min(i + 1, filteredWeapons.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setDropdownIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      selectWeapon(filteredWeapons[dropdownIdx]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  // ─── Actions ──────────────────────────────────────────────────────────────

  const startEdit = (loadout: Loadout) => {
    setEditingId(loadout.id);
    setForm({
      weapon:      loadout.weapon,
      weaponId:    loadout.weaponId || '',
      category:    loadout.category,
      tier:        loadout.tier,
      playstyle:   loadout.playstyle,
      attachments: loadout.attachments.length > 0 ? loadout.attachments : [{ slot: 'Muzzle', name: '' }],
      stats:       { ...loadout.stats },
      notes:       loadout.notes,
    });
    setWeaponQuery('');
    setView('form');
  };

  const startNew = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, attachments: [{ slot: 'Muzzle', name: '' }] });
    setWeaponQuery('');
    setView('form');
  };

  const cancelForm = () => {
    setView('list');
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.weapon.trim()) return;
    setSaving(true);

    const payload = {
      ...form,
      attachments: form.attachments.filter(a => a.name.trim()),
    };

    const res = editingId
      ? await fetch(`/api/loadouts/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await fetch('/api/loadouts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

    setSaving(false);
    if (res.ok) {
      flash(editingId ? '✓ Loadout updated' : '✓ Loadout created');
      await fetchLoadouts();
      setView('list');
      setEditingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this loadout?')) return;
    const res = await fetch(`/api/loadouts/${id}`, { method: 'DELETE' });
    if (res.ok) {
      flash('✓ Deleted');
      fetchLoadouts();
    }
  };

  const openToolPreview = async (toolId: string) => {
    setPreviewLoading(toolId);
    try {
      const res = await fetch('/api/admin/preview-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolId }),
      });
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      flash('Error while generating the preview token.');
    } finally {
      setPreviewLoading(null);
    }
  };

  const setNextMetaField = <K extends keyof NextMetaConfig>(key: K, value: NextMetaConfig[K]) => {
    setNextMeta(current => ({ ...current, [key]: value }));
  };

  const setNextMetaAttachment = (index: number, key: keyof NextMetaAttachment, value: string) => {
    setNextMeta(current => ({
      ...current,
      defaultAttachments: current.defaultAttachments.map((attachment, itemIndex) => (
        itemIndex === index ? { ...attachment, [key]: value } : attachment
      )),
    }));
  };

  const addNextMetaAttachment = () => {
    setNextMeta(current => {
      if (current.defaultAttachments.length >= 8) return current;
      return {
        ...current,
        defaultAttachments: [...current.defaultAttachments, { slot: 'Attachment', name: '' }],
      };
    });
  };

  const removeNextMetaAttachment = (index: number) => {
    setNextMeta(current => ({
      ...current,
      defaultAttachments: current.defaultAttachments.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const saveNextMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    setNextMetaSaving(true);
    const payload: NextMetaConfig = {
      ...nextMeta,
      weaponOptions: nextMetaWeaponsText.split('\n').map(item => item.trim()).filter(Boolean),
      defaultAttachments: nextMeta.defaultAttachments.filter(item => item.slot.trim() || item.name.trim()),
    };
    const res = await fetch('/api/admin/next-meta', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setNextMetaSaving(false);
    if (res.ok) {
      applyNextMetaConfig(await res.json());
      flash('Next Meta config updated');
    } else {
      flash('Error while saving Next Meta config.');
    }
  };

  const setSiteSection = <S extends keyof SiteContent, K extends keyof SiteContent[S]>(
    section: S,
    key: K,
    value: SiteContent[S][K]
  ) => {
    setSiteContent(current => ({
      ...current,
      [section]: {
        ...(current[section] as object),
        [key]: value,
      },
    }));
  };

  const setProProof = (index: number, key: 'title' | 'body', value: string) => {
    setSiteContent(current => ({
      ...current,
      proAccess: {
        ...current.proAccess,
        proofs: current.proAccess.proofs.map((proof, itemIndex) => (
          itemIndex === index ? { ...proof, [key]: value } : proof
        )),
      },
    }));
  };

  const addProProof = () => {
    setSiteContent(current => {
      if (current.proAccess.proofs.length >= 6) return current;
      return {
        ...current,
        proAccess: {
          ...current.proAccess,
          proofs: [...current.proAccess.proofs, { title: 'New proof', body: 'Describe this proof point.' }],
        },
      };
    });
  };

  const removeProProof = (index: number) => {
    setSiteContent(current => ({
      ...current,
      proAccess: {
        ...current.proAccess,
        proofs: current.proAccess.proofs.filter((_, itemIndex) => itemIndex !== index),
      },
    }));
  };

  const setFreeFeature = (index: number, key: 'eyebrow' | 'title' | 'body', value: string) => {
    setSiteContent(current => ({
      ...current,
      freePreview: {
        ...current.freePreview,
        features: current.freePreview.features.map((item, itemIndex) => (
          itemIndex === index ? { ...item, [key]: value } : item
        )),
      },
    }));
  };

  const addFreeFeature = () => {
    setSiteContent(current => ({
      ...current,
      freePreview: {
        ...current.freePreview,
        features: [...current.freePreview.features, { eyebrow: 'New label', title: 'New feature', body: 'Describe this free preview item.' }].slice(0, 8),
      },
    }));
  };

  const removeFreeFeature = (index: number) => {
    setSiteContent(current => ({
      ...current,
      freePreview: {
        ...current.freePreview,
        features: current.freePreview.features.filter((_, itemIndex) => itemIndex !== index),
      },
    }));
  };

  const setFreeTextPair = (list: 'patchHighlights' | 'sampleBriefing', index: number, key: 'title' | 'body', value: string) => {
    setSiteContent(current => ({
      ...current,
      freePreview: {
        ...current.freePreview,
        [list]: current.freePreview[list].map((item, itemIndex) => (
          itemIndex === index ? { ...item, [key]: value } : item
        )),
      },
    }));
  };

  const addFreeTextPair = (list: 'patchHighlights' | 'sampleBriefing') => {
    const item = list === 'patchHighlights'
      ? { title: 'New highlight', body: 'Describe this patch highlight.' }
      : { title: 'New sample line', body: 'Describe this briefing line.' };
    setSiteContent(current => ({
      ...current,
      freePreview: {
        ...current.freePreview,
        [list]: [...current.freePreview[list], item].slice(0, 6),
      },
    }));
  };

  const removeFreeTextPair = (list: 'patchHighlights' | 'sampleBriefing', index: number) => {
    setSiteContent(current => ({
      ...current,
      freePreview: {
        ...current.freePreview,
        [list]: current.freePreview[list].filter((_, itemIndex) => itemIndex !== index),
      },
    }));
  };

  const setFreeMetaSignal = (index: number, key: 'weapon' | 'status' | 'note', value: string) => {
    setSiteContent(current => ({
      ...current,
      freePreview: {
        ...current.freePreview,
        metaSignals: current.freePreview.metaSignals.map((item, itemIndex) => (
          itemIndex === index ? { ...item, [key]: value } : item
        )),
      },
    }));
  };

  const addFreeMetaSignal = () => {
    setSiteContent(current => ({
      ...current,
      freePreview: {
        ...current.freePreview,
        metaSignals: [...current.freePreview.metaSignals, { weapon: 'Weapon', status: 'Status', note: 'Describe the signal to test.' }].slice(0, 10),
      },
    }));
  };

  const removeFreeMetaSignal = (index: number) => {
    setSiteContent(current => ({
      ...current,
      freePreview: {
        ...current.freePreview,
        metaSignals: current.freePreview.metaSignals.filter((_, itemIndex) => itemIndex !== index),
      },
    }));
  };

  const setFreeListText = (key: 'mapNotes' | 'weeklyChecklist', value: string) => {
    setSiteContent(current => ({
      ...current,
      freePreview: {
        ...current.freePreview,
        [key]: textToIds(value),
      },
    }));
  };

  const saveSiteContent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSiteContentSaving(true);
    const res = await fetch('/api/admin/site-content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(siteContent),
    });
    setSiteContentSaving(false);
    if (res.ok) {
      setSiteContent(await res.json());
      flash('Site content updated. Backup created before write.');
    } else {
      flash('Error while saving site content.');
    }
  };

  const setToolField = (toolId: string, key: 'name' | 'tag', value: string) => {
    setToolContent(current => ({
      ...current,
      [toolId]: {
        ...current[toolId],
        [key]: value,
      },
    }));
  };

  const setToolItemField = (toolId: string, index: number, key: 'title' | 'body' | 'image' | 'category', value: string) => {
    setToolContent(current => {
      const tool = current[toolId];
      if (!tool) return current;
      return {
        ...current,
        [toolId]: {
          ...tool,
          content: tool.content.map((item, itemIndex) => (
            itemIndex === index ? { ...item, [key]: value } : item
          )),
        },
      };
    });
  };

  const setToolItemList = (toolId: string, index: number, key: 'pros' | 'cons', value: string) => {
    setToolContent(current => {
      const tool = current[toolId];
      if (!tool) return current;
      return {
        ...current,
        [toolId]: {
          ...tool,
          content: tool.content.map((item, itemIndex) => (
            itemIndex === index ? { ...item, [key]: textToIds(value) } : item
          )),
        },
      };
    });
  };

  const saveToolContent = async (e: React.FormEvent) => {
    e.preventDefault();
    setToolContentSaving(true);
    const res = await fetch('/api/admin/tool-content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toolContent),
    });
    setToolContentSaving(false);
    if (res.ok) {
      setToolContent(await res.json());
      flash('Tool content updated. Backup created before write.');
    } else {
      flash('Error while saving tool content.');
    }
  };

  const syncPatchNotesNow = async () => {
    setPatchNotesSyncing(true);
    const res = await fetch('/api/admin/patch-notes-sync', { method: 'POST' });
    setPatchNotesSyncing(false);
    if (res.ok) {
      const result = await res.json();
      if (result.siteContent) setSiteContent(result.siteContent);
      flash(result.status === 'updated' ? 'Patch notes synced to Free Preview.' : 'Patch notes already checked.');
    } else {
      flash('Error while syncing patch notes.');
    }
  };

  const syncNewsNow = async () => {
    setNewsSyncing(true);
    const res = await fetch('/api/admin/news-sync', { method: 'POST' });
    setNewsSyncing(false);
    if (res.ok) {
      const result = await res.json();
      flash(result.status === 'updated' ? `News pages updated${result.usedAi ? ' (AI)' : ' (fallback)'}.` : 'News already up to date.');
    } else {
      flash('Error while syncing news.');
    }
  };

  const checkOpenAiHealth = async () => {
    setOpenAiChecking(true);
    const res = await fetch('/api/admin/ai-health');
    setOpenAiChecking(false);
    if (res.ok) {
      const result = await res.json();
      setOpenAiHealth(result);
      flash(result.ok ? 'AI provider ready.' : 'AI provider check failed.');
    } else {
      flash('Error while checking AI providers.');
    }
  };

  const weaponOptions = loadouts.map((loadout) => ({ id: loadout.id, label: `${loadout.weapon} (${loadout.id})` }));
  const availableWeaponId = (usedIds: string[] = []) => weaponOptions.find(option => !usedIds.includes(option.id))?.id ?? weaponOptions[0]?.id ?? '';
  const selectedToolContent = toolContent[selectedToolId];
  const moveEntry = <T,>(items: T[], index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return items;
    const next = [...items];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    return next;
  };
  const loadoutOptionLabel = (id: string) => weaponOptions.find(option => option.id === id)?.label ?? id;
  const normalizePairControl = (pair: LoadoutPairControl | string[]): LoadoutPairControl => (
    Array.isArray(pair)
      ? { weaponIds: pair, perks: DEFAULT_DUO_PERKS }
      : { weaponIds: pair.weaponIds ?? [], perks: pair.perks?.length ? pair.perks : DEFAULT_DUO_PERKS }
  );
  const loadoutSelect = (value: string, onChange: (value: string) => void, allowEmpty = false) => (
    <select aria-label="Select" value={value} onChange={e => onChange(e.target.value)}>
      {allowEmpty && <option value="">Auto</option>}
      {value && !weaponOptions.some(option => option.id === value) && <option value={value}>{loadoutOptionLabel(value)}</option>}
      {weaponOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
    </select>
  );
  const setRankingWeapon = (index: number, id: string) => {
    setHomeControl('rankingWeaponIds', siteControls.home.rankingWeaponIds.map((entry, itemIndex) => itemIndex === index ? id : entry).filter(Boolean));
  };
  const addRankingWeapon = () => {
    const id = availableWeaponId(siteControls.home.rankingWeaponIds);
    if (id) setHomeControl('rankingWeaponIds', [...siteControls.home.rankingWeaponIds, id].slice(0, 8));
  };
  const setLoadoutPairWeapon = (pairIndex: number, weaponIndex: number, id: string) => {
    setHomeControl('loadoutPairIds', siteControls.home.loadoutPairIds.map((pair, itemIndex) => (
      itemIndex === pairIndex
        ? {
            ...normalizePairControl(pair),
            weaponIds: [normalizePairControl(pair).weaponIds[0] ?? '', normalizePairControl(pair).weaponIds[1] ?? ''].map((entry, currentIndex) => currentIndex === weaponIndex ? id : entry).filter(Boolean).slice(0, 2),
          }
        : normalizePairControl(pair)
    )).filter(pair => pair.weaponIds.length > 0));
  };
  const setLoadoutPairPerk = (pairIndex: number, perkIndex: number, perk: string) => {
    setHomeControl('loadoutPairIds', siteControls.home.loadoutPairIds.map((pair, itemIndex) => {
      const normalizedPair = normalizePairControl(pair);
      return itemIndex === pairIndex
        ? { ...normalizedPair, perks: [normalizedPair.perks[0] ?? '', normalizedPair.perks[1] ?? '', normalizedPair.perks[2] ?? ''].map((entry, currentIndex) => currentIndex === perkIndex ? perk : entry).filter(Boolean).slice(0, 3) }
        : normalizedPair;
    }).filter(pair => pair.weaponIds.length > 0));
  };
  const addLoadoutPair = () => {
    const first = availableWeaponId();
    const second = availableWeaponId(first ? [first] : []);
    const weaponIds = [first, second].filter(Boolean);
    if (weaponIds.length) setHomeControl('loadoutPairIds', [...siteControls.home.loadoutPairIds.map(normalizePairControl), { weaponIds, perks: DEFAULT_DUO_PERKS }].slice(0, 6));
  };
  const setHomeControl = <K extends keyof SiteControls['home']>(key: K, value: SiteControls['home'][K]) => {
    setSiteControls(current => ({ ...current, home: { ...current.home, [key]: value } }));
  };
  const idsToText = (ids: string[]) => ids.join('\n');
  const textToIds = (value: string) => value.split('\n').map(item => item.trim()).filter(Boolean);

  const setSetupChecklistText = (value: string) => {
    setSiteControls(current => ({
      ...current,
      setup: { ...current.setup, checklist: textToIds(value) },
    }));
  };

  const setSetupBuild = (index: number, key: keyof SetupBuild, value: string) => {
    setSiteControls(current => ({
      ...current,
      setup: {
        ...current.setup,
        builds: current.setup.builds.map((build, itemIndex) => (
          itemIndex === index ? { ...build, [key]: value } : build
        )),
      },
    }));
  };

  const setSetupSpec = (buildIndex: number, specIndex: number, key: 'name' | 'value' | 'amazonUrl', value: string) => {
    setSiteControls(current => ({
      ...current,
      setup: {
        ...current.setup,
        builds: current.setup.builds.map((build, itemIndex) => (
          itemIndex === buildIndex
            ? {
                ...build,
                specs: build.specs.map((spec, currentSpecIndex) => (
                  currentSpecIndex === specIndex ? { ...spec, [key]: value } : spec
                )),
              }
            : build
        )),
      },
    }));
  };

  const addSetupBuild = () => {
    setSiteControls(current => ({
      ...current,
      setup: {
        ...current.setup,
        builds: [
          ...current.setup.builds,
          {
            id: `setup-${Date.now().toString(36)}`,
            label: 'New setup',
            title: 'Setup title',
            note: 'Describe this setup tier.',
            specs: [{ id: 'item', name: 'Item', value: 'Recommended component', amazonUrl: 'https://www.amazon.fr/s?k=gaming' }],
          },
        ],
      },
    }));
  };

  const addSetupSpec = (buildIndex: number) => {
    setSiteControls(current => ({
      ...current,
      setup: {
        ...current.setup,
        builds: current.setup.builds.map((build, itemIndex) => (
          itemIndex === buildIndex
            ? { ...build, specs: [...build.specs, { id: `spec-${Date.now().toString(36)}`, name: 'Item', value: 'Recommended component', amazonUrl: 'https://www.amazon.fr/s?k=gaming' }] }
            : build
        )),
      },
    }));
  };

  const removeSetupBuild = (index: number) => {
    setSiteControls(current => ({
      ...current,
      setup: { ...current.setup, builds: current.setup.builds.filter((_, itemIndex) => itemIndex !== index) },
    }));
  };

  const removeSetupSpec = (buildIndex: number, specIndex: number) => {
    setSiteControls(current => ({
      ...current,
      setup: {
        ...current.setup,
        builds: current.setup.builds.map((build, itemIndex) => (
          itemIndex === buildIndex ? { ...build, specs: build.specs.filter((_, currentSpecIndex) => currentSpecIndex !== specIndex) } : build
        )),
      },
    }));
  };

  const setEsportStepsText = (value: string) => {
    setSiteControls(current => ({
      ...current,
      esport: { ...current.esport, starterSteps: textToIds(value) },
    }));
  };

  const setEsportSource = (kind: 'tournamentSources' | 'discordSources', index: number, key: keyof EsportSource, value: string) => {
    setSiteControls(current => ({
      ...current,
      esport: {
        ...current.esport,
        [kind]: current.esport[kind].map((source, itemIndex) => (
          itemIndex === index ? { ...source, [key]: value } : source
        )),
      },
    }));
  };

  const addEsportSource = (kind: 'tournamentSources' | 'discordSources') => {
    setSiteControls(current => ({
      ...current,
      esport: {
        ...current.esport,
        [kind]: [...current.esport[kind], { id: `source-${Date.now().toString(36)}`, name: 'New source', type: kind === 'discordSources' ? 'Discord' : 'Tournament', url: 'https://example.com', note: 'Describe this source.' }],
      },
    }));
  };

  const removeEsportSource = (kind: 'tournamentSources' | 'discordSources', index: number) => {
    setSiteControls(current => ({
      ...current,
      esport: { ...current.esport, [kind]: current.esport[kind].filter((_, itemIndex) => itemIndex !== index) },
    }));
  };

  const saveSiteControls = async (e: React.FormEvent) => {
    e.preventDefault();
    setSiteControlsSaving(true);
    const res = await fetch('/api/admin/site-controls', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(siteControls),
    });
    setSiteControlsSaving(false);
    if (res.ok) {
      setSiteControls(await res.json());
      flash('Site controls updated. Public sections now use this order/content.');
    } else {
      flash('Error while saving site controls.');
    }
  };

  const toggleCommunityHidden = async (post: CommunityPost) => {
    const res = await fetch(`/api/admin/community/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hidden: !post.hidden }),
    });
    if (res.ok) {
      await fetchCommunityPosts();
      flash(!post.hidden ? 'Discussion hidden.' : 'Discussion visible again.');
    }
  };

  const deleteCommunityEntry = async (post: CommunityPost) => {
    if (!confirm(`Delete "${post.title}" permanently?`)) return;
    const res = await fetch(`/api/admin/community/${post.id}`, { method: 'DELETE' });
    if (res.ok) {
      await fetchCommunityPosts();
      flash('Discussion deleted.');
    }
  };

  // =====================================================================
  // LOGIN SCREEN
  // =====================================================================
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-[320px]">
          <div className="mb-8 text-center">
            <div className="text-[var(--text-dim)] text-[12px] tracking-normal uppercase mb-1.5">
              warzone // admin
            </div>
            <div className="text-[var(--text-bright)] text-[20px] font-extrabold tracking-normal uppercase">
              WZ<span style={{ color: 'var(--accent)' }}>_META</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="card p-6 flex flex-col gap-4">
            <div className="text-[var(--text-dim)] text-[12px] tracking-normal uppercase">
              Authentication required
            </div>
            <div>
              <div className={LABEL_CLASS}>Password</div>
              <input aria-label="Input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            {authError && (
              <div className="text-[#ff4455] text-[12px] tracking-normal">
                ✗ {authError}
              </div>
            )}
            <button type="submit" className="btn-primary w-full">
              ACCESS
            </button>
          </form>

          <div className="text-center mt-4">
            <Link href="/" className="text-[var(--text-dim)] text-[12px] no-underline tracking-normal">
              ← Back to site
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // =====================================================================
  // ADMIN LAYOUT (sidebar + content)
  // =====================================================================
  return (
    <div className="admin-shell flex min-h-screen">

      {/* ── Sidebar ── */}
      <aside className="w-[220px] shrink-0 border-r border-[var(--border)] flex flex-col fixed top-0 left-0 bottom-0 z-10 bg-[var(--surface)]"
      >
        {/* Brand */}
        <div className="px-5 pt-6 pb-5 border-b border-[var(--border)]">
          <div className="text-[var(--text-dim)] text-[10px] tracking-normal uppercase mb-1">
            Admin Panel
          </div>
          <div className="text-[var(--text-bright)] text-[17px] font-extrabold tracking-normal uppercase">
            WZ<span style={{ color: 'var(--accent)' }}>_META</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
          <div className="text-[var(--text-dim)] text-[9px] tracking-normal uppercase px-3 pt-1 pb-2 opacity-50">
            Gestion
          </div>
          <NavItem
            icon="◈"
            label="Loadouts"
            badge={loadouts.length}
            active={view === 'list' || view === 'form'}
            onClick={() => { setView('list'); setEditingId(null); }}
          />
          <NavItem
            icon="⚙"
            label="Tools"
            badge={TOOLS.length}
            active={view === 'tools'}
            onClick={() => setView('tools')}
          />
          <NavItem
            icon="N"
            label="Next Meta"
            active={view === 'next-meta'}
            onClick={() => setView('next-meta')}
          />
          <NavItem
            icon="S"
            label="Site Content"
            active={view === 'site-content'}
            onClick={() => setView('site-content')}
          />
          <NavItem
            icon="P"
            label="Free Preview"
            active={view === 'free-preview'}
            onClick={() => setView('free-preview')}
          />
          <NavItem
            icon="H"
            label="Site Controls"
            active={view === 'site-controls'}
            onClick={() => setView('site-controls')}
          />
          <NavItem
            icon="C"
            label="Community"
            badge={communityPosts.length}
            active={view === 'community'}
            onClick={() => setView('community')}
          />
        </nav>

        {/* Bottom */}
        <div className="p-4 px-2 border-t border-[var(--border)] flex flex-col gap-1">
          <Link href="/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3 py-2 text-[var(--text-dim)] no-underline text-[12px] tracking-normal rounded transition-colors duration-150"
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span className="text-[12px]">↗</span> Public site
          </Link>
          <button type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 bg-transparent border-none text-[var(--text-dim)] text-[12px] tracking-normal rounded cursor-pointer font-[inherit] text-left w-full transition-colors duration-150"
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span className="text-[12px]">⇠</span> Log out
          </button>
        </div>
      </aside>

      {/* ── Content area ── */}
      <main className="ml-[220px] flex-1 p-8 pb-[60px] px-9 min-w-0">

        {/* Flash message */}
        {msg && (
          <div className="px-3.5 py-2.5 border border-[rgba(0,255,136,0.2)] text-[var(--accent)] text-[12px] tracking-normal rounded-sm mb-6 bg-[var(--accent-muted)]"
          >
            {msg}
          </div>
        )}

        {/* ── LOADOUT LIST ── */}
        {view === 'list' && (
          <>
            {/* Page header */}
            <div className="flex items-start justify-between mb-7">
              <div>
                <div className="text-[var(--text-dim)] text-[12px] tracking-normal uppercase">Loadouts</div>
                <div className="text-[var(--text-bright)] text-[20px] font-extrabold tracking-normal mt-0.5 uppercase">
                  Weapon List
                </div>
              </div>
              <button type="button" className="btn-primary" onClick={startNew}>+ NEW</button>
            </div>

            {/* Tier counters */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {TIERS.map(tier => {
                const count = loadouts.filter(l => l.tier === tier).length;
                return (
                  <div key={tier} className="px-4 py-2 rounded-sm flex items-center gap-2"
                    style={{
                      border: `1px solid ${TIER_COLORS[tier]}30`,
                      background: `${TIER_COLORS[tier]}08`,
                    }}
                  >
                    <span style={{ color: TIER_COLORS[tier], fontWeight: 700, fontSize: '12px' }}>{tier}</span>
                    <span className="text-[var(--text-dim)] text-[12px]">{count}</span>
                  </div>
                );
              })}
              <div className="px-4 py-2 border border-[var(--border)] rounded-sm">
                <span className="text-[var(--text-dim)] text-[12px]">Total </span>
                <span className="text-[var(--text-bright)] text-[12px] font-bold">{loadouts.length}</span>
              </div>
            </div>

            {/* Table */}
            {loadouts.length === 0 ? (
              <div className="p-12 border border-dashed border-[var(--border)] rounded-[3px] text-[var(--text-dim)] text-center text-[13px] tracking-normal">
                No loadouts yet. Click <strong style={{ color: 'var(--accent)' }}>+ NEW</strong> to start.
              </div>
            ) : (
              <div className="card">
                {/* Table header */}
                <div className="grid gap-3 px-4 py-2.5 border-b border-[var(--border)] text-[var(--text-dim)] text-[12px] tracking-normal uppercase"
                  style={{ gridTemplateColumns: '52px 40px 1fr 130px 110px auto' }}
                >
                  <span>Tier</span>
                  <span></span>
                  <span>Weapon</span>
                  <span>Category</span>
                  <span>Updated</span>
                  <span></span>
                </div>

                {loadouts.map((l, i) => (
                  <div
                    key={l.id}
                    className="grid gap-3 px-4 py-2.5 items-center transition-colors duration-100"
                    style={{
                      gridTemplateColumns: '52px 40px 1fr 130px 110px auto',
                      borderBottom: i < loadouts.length - 1 ? '1px solid var(--border)' : 'none',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span className="tag font-bold text-[12px] text-center"
                      style={{
                        background: `${TIER_COLORS[l.tier]}18`,
                        color: TIER_COLORS[l.tier],
                        border: `1px solid ${TIER_COLORS[l.tier]}40`,
                      }}
                    >
                      {l.tier}
                    </span>

                    <div className="w-[36px] h-[28px] flex items-center">
                      {l.weaponId && (
                        <WImg
                          id={l.weaponId}
                          style={{ maxHeight: '28px', maxWidth: '36px', objectFit: 'contain', opacity: 0.55 }}
                        />
                      )}
                    </div>

                    <div>
                      <div className="text-[var(--text-bright)] font-semibold text-[13px]">{l.weapon}</div>
                      <div className="text-[var(--text-dim)] text-[12px]">{l.playstyle}</div>
                    </div>
                    <span className="text-[var(--text-dim)] text-[12px]">{l.category}</span>
                    <span className="text-[var(--text-dim)] text-[12px]">{l.updatedAt}</span>
                    <div className="flex gap-1.5">
                      <button type="button"
                        className="btn-ghost"
                        onClick={() => startEdit(l)}
                        style={{ fontSize: '12px', padding: '5px 12px' }}
                      >
                        Edit
                      </button>
                      <button type="button"
                        className="btn-danger"
                        onClick={() => handleDelete(l.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── LOADOUT FORM ── */}
        {view === 'form' && (
          <>
            {/* Page header */}
            <div className="flex items-start justify-between mb-7">
              <div>
                <div className="text-[var(--text-dim)] text-[12px] tracking-normal uppercase">Loadouts</div>
                <div className="text-[var(--text-bright)] text-[20px] font-extrabold tracking-normal mt-0.5 uppercase">
                  {editingId ? 'Edit' : 'New Loadout'}
                </div>
              </div>
              <button type="button" className="btn-ghost" onClick={cancelForm}>← Cancel</button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-[720px]">

              {/* Weapon preview */}
              {form.weaponId && (
                <div className="card px-4 py-3 flex items-center gap-4"
                  style={{ borderLeft: '2px solid var(--accent)' }}>
                  <WImg
                    id={form.weaponId}
                    style={{ height: '40px', maxWidth: '140px', objectFit: 'contain', opacity: 0.8, filter: 'brightness(1.3) saturate(0.4)' }}
                  />
                  <div>
                    <div className="text-[var(--accent)] text-[13px] font-bold">{form.weapon}</div>
                    <div className="text-[var(--text-dim)] text-[12px] tracking-normal">
                      {form.weaponId} · {form.category}
                    </div>
                  </div>
                </div>
              )}

              {/* Row 1: weapon + category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className={LABEL_CLASS}>Weapon *</div>
                  <div className="relative">
                    <input aria-label="Input"
                      ref={weaponInputRef}
                      value={weaponQuery || form.weapon}
                      onChange={e => {
                        const v = e.target.value;
                        setWeaponQuery(v);
                        setField('weapon', v);
                        setField('weaponId', '');
                        setShowDropdown(true);
                        setDropdownIdx(0);
                      }}
                      onFocus={() => {
                        if (form.weapon) setWeaponQuery(form.weapon);
                        setShowDropdown(true);
                        setDropdownIdx(0);
                      }}
                      onBlur={() => setTimeout(() => {
                        setShowDropdown(false);
                        setWeaponQuery('');
                      }, 160)}
                      onKeyDown={handleWeaponKeyDown}
                      placeholder="Search for a weapon..."
                      required
                      autoComplete="off"
                    />
                    {showDropdown && filteredWeapons.length > 0 && (
                      <div className="absolute z-[200] left-0 right-0 border border-[var(--border)] rounded-[3px] max-h-[260px] overflow-y-auto"
                        style={{
                          top: 'calc(100% + 4px)',
                          background: 'var(--surface)',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                        }}>
                        {filteredWeapons.map((w, idx) => (
                          <div
                            key={w.id}
                            onMouseDown={() => selectWeapon(w)}
                            className="flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors duration-100"
                            style={{
                              background: idx === dropdownIdx ? 'var(--surface2)' : 'transparent',
                              borderBottom: idx < filteredWeapons.length - 1 ? '1px solid var(--border)' : 'none',
                            }}
                            onMouseEnter={() => setDropdownIdx(idx)}
                          >
                            <WImg
                              id={w.id}
                              style={{ height: '28px', width: '60px', objectFit: 'contain', opacity: 0.65, flexShrink: 0 }}
                            />
                            <div className="min-w-0">
                              <div className="text-[var(--text-bright)] text-[12px] font-semibold whitespace-nowrap overflow-hidden truncate">
                                {w.name}
                              </div>
                              <div className="text-[var(--text-dim)] text-[10px] tracking-normal">
                                {CAT_MAP[w.category] || w.category} · {w.game.toUpperCase()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className={LABEL_CLASS}>Category</div>
                  <select aria-label="Select" value={form.category} onChange={e => setField('category', e.target.value)}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Row 2: tier + playstyle */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className={LABEL_CLASS}>Tier</div>
                  <div className="flex gap-1.5">
                    {TIERS.map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setField('tier', t)}
                        className="flex-1 p-2 text-[13px] font-bold rounded-sm cursor-pointer font-[inherit] transition-all duration-150"
                        style={{
                          border: `1px solid ${form.tier === t ? TIER_COLORS[t] : 'var(--border)'}`,
                          background: form.tier === t ? `${TIER_COLORS[t]}18` : 'var(--surface2)',
                          color: form.tier === t ? TIER_COLORS[t] : 'var(--text-dim)',
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className={LABEL_CLASS}>Playstyle</div>
                  <select aria-label="Select" value={form.playstyle} onChange={e => setField('playstyle', e.target.value)}>
                    {PLAYSTYLES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {/* Stats */}
              <div>
                <div className={LABEL_CLASS}>Stats (0–100)</div>
                <div className="grid grid-cols-2 gap-2.5">
                  {(['damage', 'range', 'mobility', 'control'] as const).map(key => (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[var(--text-dim)] text-[12px] tracking-normal uppercase">{key}</span>
                        <span className="text-[var(--text-bright)] text-[12px]">{form.stats[key]}</span>
                      </div>
                      <input aria-label="Input"
                        type="range"
                        min={0}
                        max={100}
                        value={form.stats[key]}
                        onChange={e => setStat(key, parseInt(e.target.value))}
                        style={{ padding: 0, height: '4px', cursor: 'pointer', accentColor: 'var(--accent)' }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Attachments */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className={LABEL_CLASS}>Attachments ({form.attachments.length}/10)</div>
                  <button type="button" className="btn-ghost" onClick={addAttachment} style={{ padding: '4px 10px', fontSize: '12px' }}>
                    + Add
                  </button>
                </div>
                <div className="flex flex-col gap-1.5">
                  {form.attachments.map((att, i) => {
                    const suggestions = getAttSuggestions(i, att.slot);
                    const isOpen = attDropdowns === i && suggestions.length > 0;
                    return (
                      <div key={`${att.slot}-${i}`} className="grid items-start gap-2" style={{ gridTemplateColumns: '160px 1fr auto' }}>
                        <select aria-label="Select"
                          value={att.slot}
                          onChange={e => {
                            setAttachment(i, 'slot', e.target.value);
                            setAttQuery(i, '');
                            setAttDropdowns(null);
                          }}
                        >
                          {ATTACHMENT_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>

                        <div className="relative">
                          <input aria-label="Input"
                            value={attQueries[i] !== undefined ? attQueries[i] : att.name}
                            onChange={e => {
                              setAttQuery(i, e.target.value);
                              setAttachment(i, 'name', e.target.value);
                              setAttDropdowns(i);
                            }}
                            onFocus={() => {
                              setAttQuery(i, att.name);
                              setAttDropdowns(i);
                            }}
                            onBlur={() => setTimeout(() => {
                              setAttDropdowns(null);
                              setAttQuery(i, '');
                            }, 160)}
                            onKeyDown={e => {
                              if (e.key === 'Escape') { setAttDropdowns(null); setAttQuery(i, ''); }
                            }}
                            placeholder={`Search for a ${att.slot.toLowerCase()}...`}
                            autoComplete="off"
                          />
                          {isOpen && (
                            <div className="absolute z-[300] left-0 right-0 border border-[var(--border)] rounded-[3px] max-h-[200px] overflow-y-auto"
                              style={{
                                top: 'calc(100% + 2px)',
                                background: 'var(--surface)',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                              }}>
                              {suggestions.map((s, si) => (
                                <div
                                  key={s.name}
                                  onMouseDown={() => selectAttachment(i, s.name)}
                                  className="px-3 py-[7px] cursor-pointer flex items-center justify-between gap-2"
                                  style={{
                                    borderBottom: si < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
                                  }}
                                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                  <span className="text-[var(--text-bright)] text-[12px]">{s.name}</span>
                                  <span className="text-[var(--text-dim)] text-[10px] tracking-normal uppercase shrink-0">
                                    {s.game}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          className="btn-danger w-[32px] p-2 text-center"
                          onClick={() => removeAttachment(i)}
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <div className={LABEL_CLASS}>Notes / Context</div>
                <textarea aria-label="Textarea"
                  value={form.notes}
                  onChange={e => setField('notes', e.target.value)}
                  placeholder="Strengths, usage context..."
                  rows={3}
                  className="resize-y"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2.5 pt-1">
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'SAVING...' : editingId ? 'UPDATE' : 'CREATE LOADOUT'}
                </button>
                <button type="button" className="btn-ghost" onClick={cancelForm}>
                  Cancel
                </button>
              </div>
            </form>
          </>
        )}

        {/* ── TOOLS ── */}
        {view === 'next-meta' && (
          <>
            <div className="mb-6 p-[22px] rounded-[6px] items-center gap-5"
              style={{
                border: '1px solid rgba(0,255,136,0.18)',
                background: 'linear-gradient(135deg, rgba(0,255,136,0.08), rgba(255,255,255,0.02) 48%, rgba(22,60,255,0.07))',
                display: 'grid',
                gridTemplateColumns: '1fr auto',
              }}
            >
              <div>
                <div className="text-[var(--accent)] text-[10px] tracking-normal uppercase mb-2 font-extrabold">
                  Next Meta Control Room
                </div>
                <h1 className="text-[var(--text-bright)] text-[26px] leading-none m-0 tracking-normal uppercase">
                  Official prediction baseline
                </h1>
                <p className="text-[var(--text-dim)] text-[12px] leading-[1.7] mt-3 max-w-[680px]">
                  Manage the default values users see when they open Next Meta. Public users can draft local predictions, but only admin changes update the official baseline.
                </p>
              </div>
              <button type="button" className="btn-primary" onClick={() => openToolPreview('next-meta')} disabled={previewLoading === 'next-meta'} style={{ minWidth: '160px', height: '38px' }}>
                {previewLoading === 'next-meta' ? '...' : 'Preview Tool'}
              </button>
            </div>

                  <div className="grid mb-[18px] gap-3" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
              {[
                { label: 'Weapon', value: nextMeta.defaultWeapon || 'Unset' },
                { label: 'Signal', value: nextMeta.defaultSignal },
                { label: 'Priority', value: `${nextMeta.priorityScore}%` },
                { label: 'Updated', value: nextMeta.updatedAt || 'Draft' },
              ].map(card => (
                  <div key={card.label} className="px-4 py-3.5 border border-[var(--border)] rounded-[5px] min-h-[78px] bg-[var(--surface)]"
                >
                  <div className="text-[var(--text-dim)] text-[9px] tracking-normal uppercase mb-2.5">
                    {card.label}
                  </div>
                  <div className="text-[var(--text-bright)] text-[18px] font-extrabold tracking-normal [overflow-wrap:anywhere]">
                    {card.value}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={saveNextMeta} className="items-start gap-[18px]" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', alignItems: 'start' }}>
              <div className="card p-[18px] grid gap-[18px] rounded-[6px]">
                <div className="flex justify-between gap-4 items-center pb-3 border-b border-[var(--border)]">
                  <div>
                    <div className="text-[var(--text-bright)] text-[14px] font-extrabold tracking-normal uppercase">
                      Baseline setup
                    </div>
                    <div className="text-[var(--text-dim)] text-[12px] mt-1">
                      Values injected into the paid Next Meta tool.
                    </div>
                  </div>
                  <span className="text-[var(--accent)] text-[10px] tracking-normal uppercase border border-[rgba(0,255,136,0.2)] px-2 py-1 rounded-full">
                    Admin only
                  </span>
                </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className={LABEL_CLASS}>Default Weapon</div>
                  <input aria-label="Input" className="admin-field" value={nextMeta.defaultWeapon} onChange={e => setNextMetaField('defaultWeapon', e.target.value)} />
                </div>
                <div>
                  <div className={LABEL_CLASS}>Default Category</div>
                  <input aria-label="Input" className="admin-field" value={nextMeta.defaultCategory} onChange={e => setNextMetaField('defaultCategory', e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <div className={LABEL_CLASS}>Role</div>
                  <select aria-label="Select" className="admin-field" value={nextMeta.defaultRole} onChange={e => setNextMetaField('defaultRole', e.target.value as NextMetaRangeRole)}>
                    {NEXT_META_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                  </select>
                </div>
                <div>
                  <div className={LABEL_CLASS}>Patch Signal</div>
                  <select aria-label="Select" className="admin-field" value={nextMeta.defaultSignal} onChange={e => setNextMetaField('defaultSignal', e.target.value as NextMetaPatchSignal)}>
                    {NEXT_META_SIGNALS.map(signal => <option key={signal} value={signal}>{signal}</option>)}
                  </select>
                </div>
                <div>
                  <div className={LABEL_CLASS}>Confidence</div>
                  <input aria-label="Input"
                    className="admin-field"
                    type="number"
                    min={0}
                    max={100}
                    value={nextMeta.defaultConfidence}
                    onChange={e => setNextMetaField('defaultConfidence', Number(e.target.value))}
                  />
                </div>
                <div>
                  <div className={LABEL_CLASS}>Priority Score</div>
                  <input aria-label="Input"
                    className="admin-field"
                    type="number"
                    min={0}
                    max={100}
                    value={nextMeta.priorityScore}
                    onChange={e => setNextMetaField('priorityScore', Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <div className={LABEL_CLASS}>Weapon Suggestions (one per line)</div>
                <textarea aria-label="Textarea"
                  className="admin-field resize-y"
                  value={nextMetaWeaponsText}
                  onChange={e => setNextMetaWeaponsText(e.target.value)}
                  rows={8}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2.5">
                  <div className={LABEL_CLASS} style={{ marginBottom: 0 }}>Default Attachments</div>
                  <button type="button" className="btn-ghost" onClick={addNextMetaAttachment} disabled={nextMeta.defaultAttachments.length >= 8}>
                    + Add
                  </button>
                </div>
                <div className="grid gap-2">
                  {nextMeta.defaultAttachments.map((attachment, index) => (
                    <div key={`${attachment.slot}-${index}`} className="grid items-center gap-2 p-2 border border-[var(--border)] rounded bg-[var(--surface2)]"
                      style={{ gridTemplateColumns: '34px 1fr 1.4fr auto' }}
                    >
                      <span className="text-[var(--accent)] text-[10px] font-extrabold text-center">{String(index + 1).padStart(2, '0')}</span>
                      <input aria-label="Input" className="admin-field" value={attachment.slot} onChange={e => setNextMetaAttachment(index, 'slot', e.target.value)} />
                      <input aria-label="Input" className="admin-field" value={attachment.name} onChange={e => setNextMetaAttachment(index, 'name', e.target.value)} placeholder="Attachment name" />
                      <button type="button" className="btn-ghost" onClick={() => removeNextMetaAttachment(index)} style={{ height: '36px' }}>Remove</button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className={LABEL_CLASS}>Patch Logic</div>
                <textarea aria-label="Textarea"
                  className="admin-field resize-y"
                  value={nextMeta.defaultPatchNote}
                  onChange={e => setNextMetaField('defaultPatchNote', e.target.value)}
                  rows={4}
                />
              </div>

              <div>
                <div className={LABEL_CLASS}>Why It Could Become Meta</div>
                <textarea aria-label="Textarea"
                  className="admin-field resize-y"
                  value={nextMeta.defaultReason}
                  onChange={e => setNextMetaField('defaultReason', e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex gap-2.5 items-center">
                <button type="submit" className="btn-primary" disabled={nextMetaSaving} style={{ minWidth: '190px', height: '38px' }}>
                  {nextMetaSaving ? 'SAVING...' : 'SAVE NEXT META VALUES'}
                </button>
                <span className="text-[var(--text-dim)] text-[12px]">
                  Last update: {nextMeta.updatedAt || 'not saved yet'}
                </span>
              </div>
              </div>

              <aside className="card p-[18px] rounded-[6px] sticky top-[24px] grid gap-[14px]">
                <div>
                  <div className="text-[var(--text-dim)] text-[10px] tracking-normal uppercase mb-1.5">
                    Live Preview
                  </div>
                  <div className="text-[var(--text-bright)] text-[22px] leading-[1.1] font-black tracking-normal uppercase">
                    {nextMeta.defaultWeapon || 'Weapon'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 border border-[var(--border)] rounded bg-[var(--surface2)]"
                  >
                    <span className="block text-[var(--text-dim)] text-[9px] tracking-normal uppercase">Role</span>
                    <strong className="text-[var(--text-bright)] text-[12px]">{nextMeta.defaultRole}</strong>
                  </div>
                  <div className="p-2.5 border border-[var(--border)] rounded bg-[var(--surface2)]"
                  >
                    <span className="block text-[var(--text-dim)] text-[9px] tracking-normal uppercase">Signal</span>
                    <strong className="text-[var(--accent)] text-[12px]">{nextMeta.defaultSignal}</strong>
                  </div>
                </div>

                <div className="p-3.5 border border-[rgba(0,255,136,0.16)] rounded"
                  style={{ background: 'rgba(0,255,136,0.06)' }}
                >
                  <div className="text-[var(--text-dim)] text-[9px] tracking-normal uppercase mb-2">Priority score shown in blue box</div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div style={{ width: `${Math.max(0, Math.min(100, nextMeta.priorityScore))}%`, height: '100%', background: 'var(--accent)' }} />
                  </div>
                  <div className="text-[var(--text-bright)] text-[24px] font-black mt-2">{nextMeta.priorityScore}%</div>
                </div>

                <div>
                  <div className="text-[var(--text-dim)] text-[10px] tracking-normal uppercase mb-2">
                    Attachments
                  </div>
                  <div className="grid gap-1.5">
                    {nextMeta.defaultAttachments.map((attachment, index) => (
                      <div key={`${attachment.slot}-${index}`} className="flex justify-between gap-2.5 px-2.5 py-2 border border-[var(--border)] rounded-[3px] bg-[var(--surface2)]"
                      >
                        <span className="text-[var(--text-dim)] text-[10px]">{attachment.slot}</span>
                        <strong className="text-[var(--text-bright)] text-[10px] text-right">{attachment.name || 'TBD'}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </form>
          </>
        )}

        {view === 'site-content' && (
          <>
            <div className="flex items-start justify-between mb-7">
              <div>
                <div className="text-[var(--text-dim)] text-[12px] tracking-normal uppercase">Site Content</div>
                <div className="text-[var(--text-bright)] text-[20px] font-extrabold tracking-normal mt-0.5 uppercase">
                  Editable public sections
                </div>
              </div>
              <Link href="/" target="_blank" rel="noreferrer" className="btn-ghost no-underline">
                Preview site
              </Link>
            </div>

            <form onSubmit={saveSiteContent} className="items-start gap-[18px]" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', alignItems: 'start' }}>
              <div className="grid gap-[18px]">
                <section className="card p-[18px] rounded-[6px] grid gap-[14px]">
                  <div>
                    <div className="text-[var(--accent)] text-[10px] tracking-normal uppercase font-extrabold">Home</div>
                    <p className="text-[var(--text-dim)] text-[12px] mt-1.5">Hero labels, headline, short pitch and CTA buttons.</p>
                  </div>
                  <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                    <div><div className={LABEL_CLASS}>Meta left</div><input aria-label="Input" value={siteContent.home.metaLeft} onChange={e => setSiteSection('home', 'metaLeft', e.target.value)} /></div>
                    <div><div className={LABEL_CLASS}>Meta center</div><input aria-label="Input" value={siteContent.home.metaCenter} onChange={e => setSiteSection('home', 'metaCenter', e.target.value)} /></div>
                    <div><div className={LABEL_CLASS}>Meta right</div><input aria-label="Input" value={siteContent.home.metaRight} onChange={e => setSiteSection('home', 'metaRight', e.target.value)} /></div>
                  </div>
                  <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                    <div><div className={LABEL_CLASS}>Title top</div><input aria-label="Input" value={siteContent.home.titleTop} onChange={e => setSiteSection('home', 'titleTop', e.target.value)} /></div>
                    <div><div className={LABEL_CLASS}>Title middle</div><input aria-label="Input" value={siteContent.home.titleMiddle} onChange={e => setSiteSection('home', 'titleMiddle', e.target.value)} /></div>
                    <div><div className={LABEL_CLASS}>Title bottom</div><input aria-label="Input" value={siteContent.home.titleBottom} onChange={e => setSiteSection('home', 'titleBottom', e.target.value)} /></div>
                  </div>
                  <div><div className={LABEL_CLASS}>Hero description</div><textarea aria-label="Textarea" value={siteContent.home.description} onChange={e => setSiteSection('home', 'description', e.target.value)} rows={3} /></div>
                  <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                    <div><div className={LABEL_CLASS}>Eyebrow</div><input aria-label="Input" value={siteContent.home.eyebrow} onChange={e => setSiteSection('home', 'eyebrow', e.target.value)} /></div>
                    <div><div className={LABEL_CLASS}>Primary CTA</div><input aria-label="Input" value={siteContent.home.primaryCta} onChange={e => setSiteSection('home', 'primaryCta', e.target.value)} /></div>
                    <div><div className={LABEL_CLASS}>Secondary CTA</div><input aria-label="Input" value={siteContent.home.secondaryCta} onChange={e => setSiteSection('home', 'secondaryCta', e.target.value)} /></div>
                  </div>
                </section>

                <section className="card p-[18px] rounded-[6px] grid gap-[14px]">
                  <div>
                    <div className="text-[var(--accent)] text-[10px] tracking-normal uppercase font-extrabold">Pro Access</div>
                    <p className="text-[var(--text-dim)] text-[12px] mt-1.5">Purchase page headline, price text and proof points. Checkout logic stays locked in code.</p>
                  </div>
                  <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                    <div><div className={LABEL_CLASS}>Back label</div><input aria-label="Input" value={siteContent.proAccess.backLabel} onChange={e => setSiteSection('proAccess', 'backLabel', e.target.value)} /></div>
                    <div><div className={LABEL_CLASS}>Badge</div><input aria-label="Input" value={siteContent.proAccess.badge} onChange={e => setSiteSection('proAccess', 'badge', e.target.value)} /></div>
                    <div><div className={LABEL_CLASS}>Tag</div><input aria-label="Input" value={siteContent.proAccess.tag} onChange={e => setSiteSection('proAccess', 'tag', e.target.value)} /></div>
                    <div><div className={LABEL_CLASS}>Price</div><input aria-label="Input" value={siteContent.proAccess.price} onChange={e => setSiteSection('proAccess', 'price', e.target.value)} /></div>
                  </div>
                  <div><div className={LABEL_CLASS}>Title</div><input aria-label="Input" value={siteContent.proAccess.title} onChange={e => setSiteSection('proAccess', 'title', e.target.value)} /></div>
                  <div><div className={LABEL_CLASS}>Description</div><textarea aria-label="Textarea" value={siteContent.proAccess.description} onChange={e => setSiteSection('proAccess', 'description', e.target.value)} rows={3} /></div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div><div className={LABEL_CLASS}>Period</div><input aria-label="Input" value={siteContent.proAccess.period} onChange={e => setSiteSection('proAccess', 'period', e.target.value)} /></div>
                    <div><div className={LABEL_CLASS}>CTA</div><input aria-label="Input" value={siteContent.proAccess.cta} onChange={e => setSiteSection('proAccess', 'cta', e.target.value)} /></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className={LABEL_CLASS} style={{ marginBottom: 0 }}>Proof points</div>
                    <button type="button" className="btn-ghost" onClick={addProProof}>+ Add proof</button>
                  </div>
                  <div className="grid gap-2">
                    {siteContent.proAccess.proofs.map((proof, index) => (
                      <div key={`${proof.title}-${index}`} className="grid gap-2 p-2 border border-[var(--border)] rounded bg-[var(--surface2)]"
                        style={{ gridTemplateColumns: '1fr 1.8fr auto' }}
                      >
                        <input aria-label="Input" value={proof.title} onChange={e => setProProof(index, 'title', e.target.value)} />
                        <input aria-label="Input" value={proof.body} onChange={e => setProProof(index, 'body', e.target.value)} />
                        <button type="button" className="btn-ghost" onClick={() => removeProProof(index)}>Remove</button>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="card p-[18px] rounded-[6px] grid gap-[14px]">
                  <div>
                    <div className="text-[var(--accent)] text-[10px] tracking-normal uppercase font-extrabold">Community</div>
                    <p className="text-[var(--text-dim)] text-[12px] mt-1.5">Public copy for the social hub entry point.</p>
                  </div>
                  <div className="grid gap-2.5">
                    <div><div className={LABEL_CLASS}>Community kicker</div><input aria-label="Input" value={siteContent.community.kicker} onChange={e => setSiteSection('community', 'kicker', e.target.value)} /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><div className={LABEL_CLASS}>Title top</div><input aria-label="Input" value={siteContent.community.titleTop} onChange={e => setSiteSection('community', 'titleTop', e.target.value)} /></div>
                      <div><div className={LABEL_CLASS}>Title bottom</div><input aria-label="Input" value={siteContent.community.titleBottom} onChange={e => setSiteSection('community', 'titleBottom', e.target.value)} /></div>
                    </div>
                    <div><div className={LABEL_CLASS}>Community description</div><textarea aria-label="Textarea" value={siteContent.community.description} onChange={e => setSiteSection('community', 'description', e.target.value)} rows={5} /></div>
                  </div>
                </section>
              </div>

              <aside className="card p-[18px] rounded-[6px] sticky top-[24px] grid gap-[14px]">
                <div>
                  <div className="text-[var(--text-dim)] text-[10px] tracking-normal uppercase mb-1.5">
                    Security model
                  </div>
                  <div className="text-[var(--text-bright)] text-[18px] font-black uppercase">
                    Structured CMS only
                  </div>
                  <p className="text-[var(--text-dim)] text-[12px] leading-[1.65]">
                    No raw HTML, no scripts, no env secrets. Every field is size-limited and normalized server-side. Local saves create a JSON backup before writing.
                  </p>
                </div>
                  <div className="p-3 border border-[var(--border)] rounded bg-[var(--surface2)]"
                  >
                  <div className="text-[var(--text-dim)] text-[10px] tracking-normal uppercase mb-2">Last saved</div>
                  <strong className="text-[var(--text-bright)] text-[14px]">{siteContent.updatedAt || 'Not saved yet'}</strong>
                </div>
                <button type="submit" className="btn-primary" disabled={siteContentSaving} style={{ minHeight: '40px' }}>
                  {siteContentSaving ? 'SAVING...' : 'SAVE SITE CONTENT'}
                </button>
              </aside>
            </form>
          </>
        )}

        {view === 'free-preview' && (
          <>
            <div className="flex items-start justify-between mb-7">
              <div>
                <div className="text-[var(--text-dim)] text-[12px] tracking-normal uppercase">Free Preview</div>
                <div className="text-[var(--text-bright)] text-[20px] font-extrabold tracking-normal mt-0.5 uppercase">
                  Newsletter preview page editor
                </div>
              </div>
              <Link href="/free-preview" target="_blank" rel="noreferrer" className="btn-ghost no-underline">
                Preview page
              </Link>
            </div>

            <form onSubmit={saveSiteContent} className="items-start gap-[18px]" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', alignItems: 'start' }}>
              <div className="grid gap-[18px]">
                <section className="card p-[18px] rounded-[6px] grid gap-[14px]">
                  <div>
                    <div className="text-[var(--accent)] text-[10px] tracking-normal uppercase font-extrabold">Hero</div>
                    <p className="text-[var(--text-dim)] text-[12px] mt-1.5">Main intro and CTA copy at the top of /free-preview.</p>
                  </div>
                  <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                    <div><div className={LABEL_CLASS}>Back label</div><input aria-label="Input" value={siteContent.freePreview.backLabel} onChange={e => setSiteSection('freePreview', 'backLabel', e.target.value)} /></div>
                    <div><div className={LABEL_CLASS}>Kicker</div><input aria-label="Input" value={siteContent.freePreview.kicker} onChange={e => setSiteSection('freePreview', 'kicker', e.target.value)} /></div>
                    <div><div className={LABEL_CLASS}>Title</div><input aria-label="Input" value={siteContent.freePreview.title} onChange={e => setSiteSection('freePreview', 'title', e.target.value)} /></div>
                  </div>
                  <div><div className={LABEL_CLASS}>Lead</div><textarea aria-label="Textarea" value={siteContent.freePreview.lead} onChange={e => setSiteSection('freePreview', 'lead', e.target.value)} rows={4} /></div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div><div className={LABEL_CLASS}>Primary CTA</div><input aria-label="Input" value={siteContent.freePreview.primaryCta} onChange={e => setSiteSection('freePreview', 'primaryCta', e.target.value)} /></div>
                    <div><div className={LABEL_CLASS}>Secondary CTA</div><input aria-label="Input" value={siteContent.freePreview.secondaryCta} onChange={e => setSiteSection('freePreview', 'secondaryCta', e.target.value)} /></div>
                  </div>
                </section>

                <section className="card p-[18px] rounded-[6px] grid gap-[14px]">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-[var(--accent)] text-[10px] tracking-normal uppercase font-extrabold">Top cards</div>
                      <p className="text-[var(--text-dim)] text-[12px] mt-1.5">The five cards under the hero. You can add up to 8.</p>
                    </div>
                    <button type="button" className="btn-ghost" onClick={addFreeFeature}>+ Add card</button>
                  </div>
                  <div className="grid gap-2">
                    {siteContent.freePreview.features.map((item, index) => (
                      <div key={`${item.title}-${index}`} className="grid gap-2 p-3 border border-[var(--border)] rounded bg-[var(--surface2)]">
                        <div className="grid gap-2" style={{ gridTemplateColumns: '0.8fr 1.2fr auto' }}>
                          <input aria-label="Input" value={item.eyebrow} onChange={e => setFreeFeature(index, 'eyebrow', e.target.value)} placeholder="Eyebrow" />
                          <input aria-label="Input" value={item.title} onChange={e => setFreeFeature(index, 'title', e.target.value)} placeholder="Title" />
                          <button type="button" className="btn-ghost" onClick={() => removeFreeFeature(index)}>Remove</button>
                        </div>
                        <textarea aria-label="Textarea" value={item.body} onChange={e => setFreeFeature(index, 'body', e.target.value)} rows={2} placeholder="Body" />
                      </div>
                    ))}
                  </div>
                </section>

                <section className="card p-[18px] rounded-[6px] grid gap-[14px]">
                  <div>
                    <div className="text-[var(--accent)] text-[10px] tracking-normal uppercase font-extrabold">Current briefing</div>
                    <p className="text-[var(--text-dim)] text-[12px] mt-1.5">Header, patch date/link and highlight cards.</p>
                  </div>
                  <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                    <div><div className={LABEL_CLASS}>Section kicker</div><input aria-label="Input" value={siteContent.freePreview.currentKicker} onChange={e => setSiteSection('freePreview', 'currentKicker', e.target.value)} /></div>
                    <div><div className={LABEL_CLASS}>Section title</div><input aria-label="Input" value={siteContent.freePreview.currentTitle} onChange={e => setSiteSection('freePreview', 'currentTitle', e.target.value)} /></div>
                    <div><div className={LABEL_CLASS}>Patch checked</div><input aria-label="Input" value={siteContent.freePreview.patchChecked} onChange={e => setSiteSection('freePreview', 'patchChecked', e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div><div className={LABEL_CLASS}>Patch link label</div><input aria-label="Input" value={siteContent.freePreview.patchLinkLabel} onChange={e => setSiteSection('freePreview', 'patchLinkLabel', e.target.value)} /></div>
                    <div><div className={LABEL_CLASS}>Patch URL</div><input aria-label="Input" value={siteContent.freePreview.patchUrl} onChange={e => setSiteSection('freePreview', 'patchUrl', e.target.value)} /></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className={LABEL_CLASS} style={{ marginBottom: 0 }}>Patch highlights</div>
                    <button type="button" className="btn-ghost" onClick={() => addFreeTextPair('patchHighlights')}>+ Add highlight</button>
                  </div>
                  {siteContent.freePreview.patchHighlights.map((item, index) => (
                    <div key={`${item.title}-${index}`} className="grid gap-2 p-3 border border-[var(--border)] rounded bg-[var(--surface2)]">
                      <div className="grid gap-2" style={{ gridTemplateColumns: '1fr auto' }}>
                        <input aria-label="Input" value={item.title} onChange={e => setFreeTextPair('patchHighlights', index, 'title', e.target.value)} placeholder="Title" />
                        <button type="button" className="btn-ghost" onClick={() => removeFreeTextPair('patchHighlights', index)}>Remove</button>
                      </div>
                      <textarea aria-label="Textarea" value={item.body} onChange={e => setFreeTextPair('patchHighlights', index, 'body', e.target.value)} rows={2} placeholder="Body" />
                    </div>
                  ))}
                </section>

                <section className="card p-[18px] rounded-[6px] grid gap-[14px]">
                  <div>
                    <div className="text-[var(--accent)] text-[10px] tracking-normal uppercase font-extrabold">Meta and map notes</div>
                    <p className="text-[var(--text-dim)] text-[12px] mt-1.5">Weapon alerts table and regain/map bullet list.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div><div className={LABEL_CLASS}>Meta kicker</div><input aria-label="Input" value={siteContent.freePreview.metaKicker} onChange={e => setSiteSection('freePreview', 'metaKicker', e.target.value)} /></div>
                    <div><div className={LABEL_CLASS}>Meta title</div><input aria-label="Input" value={siteContent.freePreview.metaTitle} onChange={e => setSiteSection('freePreview', 'metaTitle', e.target.value)} /></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className={LABEL_CLASS} style={{ marginBottom: 0 }}>Meta signals</div>
                    <button type="button" className="btn-ghost" onClick={addFreeMetaSignal}>+ Add signal</button>
                  </div>
                  {siteContent.freePreview.metaSignals.map((item, index) => (
                    <div key={`${item.weapon}-${index}`} className="grid gap-2 p-3 border border-[var(--border)] rounded bg-[var(--surface2)]">
                      <div className="grid gap-2" style={{ gridTemplateColumns: '0.8fr 0.8fr auto' }}>
                        <input aria-label="Input" value={item.weapon} onChange={e => setFreeMetaSignal(index, 'weapon', e.target.value)} placeholder="Weapon" />
                        <input aria-label="Input" value={item.status} onChange={e => setFreeMetaSignal(index, 'status', e.target.value)} placeholder="Status" />
                        <button type="button" className="btn-ghost" onClick={() => removeFreeMetaSignal(index)}>Remove</button>
                      </div>
                      <textarea aria-label="Textarea" value={item.note} onChange={e => setFreeMetaSignal(index, 'note', e.target.value)} rows={2} placeholder="Note" />
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div><div className={LABEL_CLASS}>Map kicker</div><input aria-label="Input" value={siteContent.freePreview.mapKicker} onChange={e => setSiteSection('freePreview', 'mapKicker', e.target.value)} /></div>
                    <div><div className={LABEL_CLASS}>Map title</div><input aria-label="Input" value={siteContent.freePreview.mapTitle} onChange={e => setSiteSection('freePreview', 'mapTitle', e.target.value)} /></div>
                  </div>
                  <div><div className={LABEL_CLASS}>Map notes - one per line</div><textarea aria-label="Textarea" value={idsToText(siteContent.freePreview.mapNotes)} onChange={e => setFreeListText('mapNotes', e.target.value)} rows={5} /></div>
                </section>

                <section className="card p-[18px] rounded-[6px] grid gap-[14px]">
                  <div>
                    <div className="text-[var(--accent)] text-[10px] tracking-normal uppercase font-extrabold">Checklist and sample email</div>
                    <p className="text-[var(--text-dim)] text-[12px] mt-1.5">The final action checklist and sample briefing lines.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div><div className={LABEL_CLASS}>Checklist kicker</div><input aria-label="Input" value={siteContent.freePreview.checklistKicker} onChange={e => setSiteSection('freePreview', 'checklistKicker', e.target.value)} /></div>
                    <div><div className={LABEL_CLASS}>Checklist title</div><input aria-label="Input" value={siteContent.freePreview.checklistTitle} onChange={e => setSiteSection('freePreview', 'checklistTitle', e.target.value)} /></div>
                  </div>
                  <div><div className={LABEL_CLASS}>Weekly checklist - one per line</div><textarea aria-label="Textarea" value={idsToText(siteContent.freePreview.weeklyChecklist)} onChange={e => setFreeListText('weeklyChecklist', e.target.value)} rows={5} /></div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div><div className={LABEL_CLASS}>Sample kicker</div><input aria-label="Input" value={siteContent.freePreview.sampleKicker} onChange={e => setSiteSection('freePreview', 'sampleKicker', e.target.value)} /></div>
                    <div><div className={LABEL_CLASS}>Sample title</div><input aria-label="Input" value={siteContent.freePreview.sampleTitle} onChange={e => setSiteSection('freePreview', 'sampleTitle', e.target.value)} /></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className={LABEL_CLASS} style={{ marginBottom: 0 }}>Sample briefing lines</div>
                    <button type="button" className="btn-ghost" onClick={() => addFreeTextPair('sampleBriefing')}>+ Add line</button>
                  </div>
                  {siteContent.freePreview.sampleBriefing.map((item, index) => (
                    <div key={`${item.title}-${index}`} className="grid gap-2 p-3 border border-[var(--border)] rounded bg-[var(--surface2)]" style={{ gridTemplateColumns: '0.75fr 1.75fr auto' }}>
                      <input aria-label="Input" value={item.title} onChange={e => setFreeTextPair('sampleBriefing', index, 'title', e.target.value)} placeholder="Label" />
                      <input aria-label="Input" value={item.body} onChange={e => setFreeTextPair('sampleBriefing', index, 'body', e.target.value)} placeholder="Body" />
                      <button type="button" className="btn-ghost" onClick={() => removeFreeTextPair('sampleBriefing', index)}>Remove</button>
                    </div>
                  ))}
                </section>
              </div>

              <aside className="card p-[18px] rounded-[6px] sticky top-[24px] grid gap-[14px]">
                <div>
                  <div className="text-[var(--text-dim)] text-[10px] tracking-normal uppercase mb-1.5">Page</div>
                  <div className="text-[var(--text-bright)] text-[18px] font-black uppercase">Free preview</div>
                  <p className="text-[var(--text-dim)] text-[12px] leading-[1.65]">Every field is saved as sanitized JSON. Public /free-preview reads this content directly.</p>
                </div>
                <div className="p-3 border border-[var(--border)] rounded bg-[var(--surface2)]">
                  <div className="text-[var(--text-dim)] text-[10px] tracking-normal uppercase mb-2">Quick stats</div>
                  <div className="grid gap-1 text-[var(--text-bright)] text-[11px]">
                    <span>{siteContent.freePreview.features.length} cards</span>
                    <span>{siteContent.freePreview.patchHighlights.length} highlights</span>
                    <span>{siteContent.freePreview.metaSignals.length} signals</span>
                    <span>{siteContent.freePreview.weeklyChecklist.length} checklist items</span>
                  </div>
                </div>
                <button type="button" className="btn-ghost" onClick={syncPatchNotesNow} disabled={patchNotesSyncing} style={{ minHeight: '38px' }}>
                  {patchNotesSyncing ? 'SYNCING...' : 'SYNC PATCH NOTES NOW'}
                </button>
                <button type="button" className="btn-ghost" onClick={syncNewsNow} disabled={newsSyncing} style={{ minHeight: '38px' }}>
                  {newsSyncing ? 'SYNCING...' : 'SYNC ACTUALITES NOW'}
                </button>
                <button type="button" className="btn-ghost" onClick={checkOpenAiHealth} disabled={openAiChecking} style={{ minHeight: '38px' }}>
                  {openAiChecking ? 'CHECKING...' : 'CHECK AI KEYS'}
                </button>
                {openAiHealth && (
                  <div className="p-3 border border-[var(--border)] rounded bg-[var(--surface2)]">
                    <div className="text-[var(--text-dim)] text-[10px] tracking-normal uppercase mb-2">AI health</div>
                    <div className="grid gap-3 text-[11px]">
                      {openAiHealth.providers.map(provider => (
                        <div key={provider.provider} className="grid gap-1">
                          <span className="text-[var(--text-bright)]">{provider.provider}</span>
                          <span className={provider.ok ? 'text-[var(--accent)]' : 'text-[#ff4455]'}>{provider.ok ? 'OK' : 'NOT OK'}</span>
                          <span className="text-[var(--text-dim)]">Status: {provider.status ?? 'n/a'}</span>
                          <span className="text-[var(--text-dim)]">Model: {provider.model}</span>
                          <span className="text-[var(--text-dim)]">{provider.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="text-[var(--text-dim)] text-[12px]">Last saved: {siteContent.updatedAt || 'not saved yet'}</div>
                <button type="submit" className="btn-primary" disabled={siteContentSaving} style={{ minHeight: '40px' }}>
                  {siteContentSaving ? 'SAVING...' : 'SAVE FREE PREVIEW'}
                </button>
              </aside>
            </form>
          </>
        )}

        {view === 'site-controls' && (
          <>
            <div className="flex items-start justify-between mb-7">
              <div>
                <div className="text-[var(--text-dim)] text-[12px] tracking-normal uppercase">Site Controls</div>
                <div className="text-[var(--text-bright)] text-[20px] font-extrabold tracking-normal mt-0.5 uppercase">
                  Homepage, setup and esport editors
                </div>
              </div>
              <div className="flex gap-2">
                <Link href="/home#ranking" target="_blank" rel="noreferrer" className="btn-ghost no-underline">Top weapons</Link>
                <Link href="/home#all-loadouts" target="_blank" rel="noreferrer" className="btn-ghost no-underline">Loadouts</Link>
                <Link href="/set-up" target="_blank" rel="noreferrer" className="btn-ghost no-underline">Setup</Link>
                <Link href="/esport" target="_blank" rel="noreferrer" className="btn-ghost no-underline">Esport</Link>
              </div>
            </div>

            <form onSubmit={saveSiteControls} className="items-start gap-[18px]" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', alignItems: 'start' }}>
              <div className="grid gap-[18px]">
                <section className="card p-[18px] rounded-[6px] grid gap-[14px]">
                  <div>
                    <div className="text-[var(--accent)] text-[10px] tracking-normal uppercase font-extrabold">Homepage weapons</div>
                    <p className="text-[var(--text-dim)] text-[12px] mt-1.5">Choose from existing loadouts. Saves store the correct class IDs for the public homepage.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <div className={LABEL_CLASS} style={{ marginBottom: 0 }}>Top Weapons order</div>
                        <button type="button" className="btn-ghost" onClick={addRankingWeapon}>+ Add</button>
                      </div>
                      <div className="grid gap-2">
                        {siteControls.home.rankingWeaponIds.map((id, index) => (
                          <div key={`${id}-${index}`} className="grid gap-2" style={{ gridTemplateColumns: 'minmax(0, 1fr) auto auto auto' }}>
                            {loadoutSelect(id, value => setRankingWeapon(index, value))}
                            <button type="button" className="btn-ghost" onClick={() => setHomeControl('rankingWeaponIds', moveEntry(siteControls.home.rankingWeaponIds, index, -1))}>Up</button>
                            <button type="button" className="btn-ghost" onClick={() => setHomeControl('rankingWeaponIds', moveEntry(siteControls.home.rankingWeaponIds, index, 1))}>Down</button>
                            <button type="button" className="btn-ghost" onClick={() => setHomeControl('rankingWeaponIds', siteControls.home.rankingWeaponIds.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
                          </div>
                        ))}
                        {siteControls.home.rankingWeaponIds.length === 0 && (
                          <div className="text-[var(--text-dim)] text-[12px] p-3 border border-[var(--border)] rounded bg-[var(--surface2)]">No top weapons selected.</div>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <div className={LABEL_CLASS} style={{ marginBottom: 0 }}>Loadout duos</div>
                        <button type="button" className="btn-ghost" onClick={addLoadoutPair}>+ Add duo</button>
                      </div>
                      <div className="grid gap-2">
                        {siteControls.home.loadoutPairIds.map((pair, index) => (
                          <div key={`${normalizePairControl(pair).weaponIds.join('-')}-${index}`} className="grid gap-2 p-2 border border-[var(--border)] rounded bg-[var(--surface2)]">
                            <div className="grid gap-2" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) auto auto auto' }}>
                              {loadoutSelect(normalizePairControl(pair).weaponIds[0] ?? '', value => setLoadoutPairWeapon(index, 0, value))}
                              {loadoutSelect(normalizePairControl(pair).weaponIds[1] ?? '', value => setLoadoutPairWeapon(index, 1, value))}
                              <button type="button" className="btn-ghost" onClick={() => setHomeControl('loadoutPairIds', moveEntry(siteControls.home.loadoutPairIds.map(normalizePairControl), index, -1))}>Up</button>
                              <button type="button" className="btn-ghost" onClick={() => setHomeControl('loadoutPairIds', moveEntry(siteControls.home.loadoutPairIds.map(normalizePairControl), index, 1))}>Down</button>
                              <button type="button" className="btn-ghost" onClick={() => setHomeControl('loadoutPairIds', siteControls.home.loadoutPairIds.filter((_, itemIndex) => itemIndex !== index).map(normalizePairControl))}>Remove</button>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              {[0, 1, 2].map(perkIndex => (
                                <div key={perkIndex}>
                                  <div className={LABEL_CLASS}>Perk {perkIndex + 1}</div>
                                  <input
                                    aria-label={`Duo perk ${perkIndex + 1}`}
                                    list="duo-perk-options"
                                    value={normalizePairControl(pair).perks[perkIndex] ?? ''}
                                    onChange={e => setLoadoutPairPerk(index, perkIndex, e.target.value)}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        <datalist id="duo-perk-options">
                          {PERK_OPTIONS.map(perk => <option key={perk} value={perk} />)}
                        </datalist>
                        {siteControls.home.loadoutPairIds.length === 0 && (
                          <div className="text-[var(--text-dim)] text-[12px] p-3 border border-[var(--border)] rounded bg-[var(--surface2)]">No homepage duos selected.</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                    <div>
                      <div className={LABEL_CLASS}>Current long range</div>
                      {loadoutSelect(siteControls.home.currentLongRangeId, value => setHomeControl('currentLongRangeId', value), true)}
                    </div>
                    <div>
                      <div className={LABEL_CLASS}>Close meta</div>
                      {loadoutSelect(siteControls.home.closeMetaId, value => setHomeControl('closeMetaId', value), true)}
                    </div>
                    <div>
                      <div className={LABEL_CLASS}>Compare left</div>
                      {loadoutSelect(siteControls.home.compareWeaponIds[0] ?? '', value => setHomeControl('compareWeaponIds', [value, siteControls.home.compareWeaponIds[1] ?? ''].filter(Boolean)), true)}
                    </div>
                    <div>
                      <div className={LABEL_CLASS}>Compare right</div>
                      {loadoutSelect(siteControls.home.compareWeaponIds[1] ?? '', value => setHomeControl('compareWeaponIds', [siteControls.home.compareWeaponIds[0] ?? '', value].filter(Boolean)), true)}
                    </div>
                  </div>
                  <div>
                    <div className={LABEL_CLASS}>Daily duo</div>
                    <div className="grid grid-cols-2 gap-2">
                      {loadoutSelect(siteControls.home.dailyDuoIds[0] ?? '', value => setHomeControl('dailyDuoIds', [value, siteControls.home.dailyDuoIds[1] ?? ''].filter(Boolean).slice(0, 2)), true)}
                      {loadoutSelect(siteControls.home.dailyDuoIds[1] ?? '', value => setHomeControl('dailyDuoIds', [siteControls.home.dailyDuoIds[0] ?? '', value].filter(Boolean).slice(0, 2)), true)}
                    </div>
                  </div>
                </section>

                <section className="card p-[18px] rounded-[6px] grid gap-[14px]">
                  <div className="flex justify-between gap-2.5 items-center">
                    <div>
                      <div className="text-[var(--accent)] text-[10px] tracking-normal uppercase font-extrabold">Setup components</div>
                      <p className="text-[var(--text-dim)] text-[12px] mt-1.5">Edit setup tiers, components, and Amazon links.</p>
                    </div>
                    <button type="button" className="btn-ghost" onClick={addSetupBuild}>+ Add setup</button>
                  </div>
                  <div>
                    <div className={LABEL_CLASS}>Baseline checklist - one item per line</div>
                    <textarea aria-label="Textarea" rows={5} value={idsToText(siteControls.setup.checklist)} onChange={e => setSetupChecklistText(e.target.value)} />
                  </div>
                  {siteControls.setup.builds.map((build, buildIndex) => (
                    <div key={build.id} className="grid gap-2 p-3 border border-[var(--border)] rounded bg-[var(--surface2)]"
                    >
                      <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                        <input aria-label="Input" value={build.label} onChange={e => setSetupBuild(buildIndex, 'label', e.target.value)} placeholder="Label" />
                        <input aria-label="Input" value={build.title} onChange={e => setSetupBuild(buildIndex, 'title', e.target.value)} placeholder="Title" />
                        <button type="button" className="btn-ghost" onClick={() => removeSetupBuild(buildIndex)}>Remove</button>
                      </div>
                      <textarea aria-label="Textarea" rows={2} value={build.note} onChange={e => setSetupBuild(buildIndex, 'note', e.target.value)} placeholder="Note" />
                      {build.specs.map((spec, specIndex) => (
                        <div key={`${spec.id}-${specIndex}`} className="grid gap-2" style={{ gridTemplateColumns: '0.7fr 1.2fr 1.6fr auto' }}>
                          <input aria-label="Input" value={spec.name} onChange={e => setSetupSpec(buildIndex, specIndex, 'name', e.target.value)} placeholder="Component" />
                          <input aria-label="Input" value={spec.value} onChange={e => setSetupSpec(buildIndex, specIndex, 'value', e.target.value)} placeholder="Value" />
                          <input aria-label="Input" value={spec.amazonUrl} onChange={e => setSetupSpec(buildIndex, specIndex, 'amazonUrl', e.target.value)} placeholder="Amazon link" />
                          <button type="button" className="btn-ghost" onClick={() => removeSetupSpec(buildIndex, specIndex)}>Delete</button>
                        </div>
                      ))}
                      <button type="button" className="btn-ghost" onClick={() => addSetupSpec(buildIndex)}>+ Add component</button>
                    </div>
                  ))}
                </section>

                <section className="card p-[18px] rounded-[6px] grid gap-[14px]">
                  <div>
                    <div className="text-[var(--accent)] text-[10px] tracking-normal uppercase font-extrabold">Esport tables</div>
                    <p className="text-[var(--text-dim)] text-[12px] mt-1.5">Edit the guide steps and source cards shown in the esport conversation.</p>
                  </div>
                  <div>
                    <div className={LABEL_CLASS}>Starter steps - one per line</div>
                    <textarea aria-label="Textarea" rows={6} value={idsToText(siteControls.esport.starterSteps)} onChange={e => setEsportStepsText(e.target.value)} />
                  </div>
                  {(['tournamentSources', 'discordSources'] as const).map((kind) => (
                    <div key={kind} className="grid gap-2">
                      <div className="flex justify-between items-center">
                        <div className={LABEL_CLASS} style={{ marginBottom: 0 }}>{kind === 'tournamentSources' ? 'Tournament sources' : 'Discord sources'}</div>
                        <button type="button" className="btn-ghost" onClick={() => addEsportSource(kind)}>+ Add</button>
                      </div>
                      {siteControls.esport[kind].map((source, index) => (
                        <div key={source.id} className="grid gap-2" style={{ gridTemplateColumns: '0.8fr 0.8fr 1.2fr auto' }}>
                          <input aria-label="Input" value={source.name} onChange={e => setEsportSource(kind, index, 'name', e.target.value)} placeholder="Name" />
                          <input aria-label="Input" value={source.type} onChange={e => setEsportSource(kind, index, 'type', e.target.value)} placeholder="Type" />
                          <input aria-label="Input" value={source.url} onChange={e => setEsportSource(kind, index, 'url', e.target.value)} placeholder="URL" />
                          <button type="button" className="btn-ghost" onClick={() => removeEsportSource(kind, index)}>Delete</button>
                          <textarea aria-label="Textarea" rows={2} value={source.note} onChange={e => setEsportSource(kind, index, 'note', e.target.value)} placeholder="Note" className="[grid-column:1/-1]" />
                        </div>
                      ))}
                    </div>
                  ))}
                </section>
              </div>

              <aside className="card p-[18px] rounded-[6px] sticky top-[24px] grid gap-[14px]">
                <div>
                  <div className="text-[var(--text-dim)] text-[10px] tracking-normal uppercase mb-1.5">Security</div>
                  <div className="text-[var(--text-bright)] text-[18px] font-black uppercase">Admin-only writes</div>
                  <p className="text-[var(--text-dim)] text-[12px] leading-[1.65]">Public pages only read sanitized JSON. Admin saves are authenticated, size-limited, and normalized server-side.</p>
                </div>
                  <div className="p-3 border border-[var(--border)] rounded bg-[var(--surface2)]"
                  >
                  <div className="text-[var(--text-dim)] text-[10px] tracking-normal uppercase mb-2">Loadout IDs</div>
                  <div className="grid gap-[5px] max-h-[260px] overflow-auto">
                    {weaponOptions.map(option => <code key={option.id} className="text-[var(--text-bright)] text-[10px]">{option.label}</code>)}
                  </div>
                </div>
                <div className="text-[var(--text-dim)] text-[12px]">Last saved: {siteControls.updatedAt || 'not saved yet'}</div>
                <button type="submit" className="btn-primary" disabled={siteControlsSaving} style={{ minHeight: '40px' }}>
                  {siteControlsSaving ? 'SAVING...' : 'SAVE SITE CONTROLS'}
                </button>
              </aside>
            </form>
          </>
        )}

        {view === 'community' && (
          <>
            <div className="flex items-start justify-between mb-7">
              <div>
                <div className="text-[var(--text-dim)] text-[12px] tracking-normal uppercase">Community</div>
                <div className="text-[var(--text-bright)] text-[20px] font-extrabold tracking-normal mt-0.5 uppercase">
                  Discussions moderation
                </div>
              </div>
              <Link href="/community" target="_blank" rel="noreferrer" className="btn-ghost no-underline">Open community</Link>
            </div>
            <div className="card grid">
              {communityPosts.map((post, index) => (
                <div key={post.id} className="grid gap-[14px] p-4"
                  style={{
                    gridTemplateColumns: '1fr auto',
                    borderBottom: index < communityPosts.length - 1 ? '1px solid var(--border)' : 'none',
                    background: post.hidden ? 'rgba(255,68,85,0.05)' : 'transparent',
                  }}
                >
                  <div>
                    <div className="flex gap-2 items-center mb-1.5">
                      <span className="text-[var(--accent)] text-[10px] tracking-normal uppercase">{post.type}</span>
                      <span className="text-[var(--text-dim)] text-[10px]">{post.hidden ? 'hidden' : 'visible'} - reports {post.reports || 0}</span>
                    </div>
                    <strong className="text-[var(--text-bright)] text-[14px]">{post.title}</strong>
                    <p className="text-[var(--text-dim)] text-[12px] leading-[1.55] mt-1.5">{post.body}</p>
                    <div className="text-[var(--text-dim)] text-[10px] mt-2">
                      {post.authorPseudo || post.author} - {post.region} - {post.mode} - replies {post.replies.length}
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <button type="button" className="btn-ghost" onClick={() => toggleCommunityHidden(post)}>{post.hidden ? 'Unhide' : 'Hide'}</button>
                    <button type="button" className="btn-ghost" onClick={() => deleteCommunityEntry(post)}>Delete</button>
                  </div>
                </div>
              ))}
              {communityPosts.length === 0 && (
                <div className="p-[18px] text-[var(--text-dim)] text-[12px]">No community posts yet.</div>
              )}
            </div>
          </>
        )}

        {view === 'tools' && (
          <>
            {/* Page header */}
            <div className="flex items-start justify-between mb-7">
              <div>
                <div className="text-[var(--text-dim)] text-[12px] tracking-normal uppercase">Tools</div>
                <div className="text-[var(--text-bright)] text-[20px] font-extrabold tracking-normal mt-0.5 uppercase">
                  Pro Tools
                </div>
              </div>
              <div className="flex gap-2">
                <Link href="/pro-tools"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[12px] px-3.5 py-1.5 bg-transparent border border-[var(--border)] text-[var(--text-dim)] no-underline tracking-normal inline-flex items-center gap-1.5"
                >
                  ↗ Public page
                </Link>
                <Link href="/tools-individual"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[12px] px-3.5 py-1.5 bg-transparent border border-[var(--border)] text-[var(--text-dim)] no-underline tracking-normal inline-flex items-center gap-1.5"
                >
                  ↗ Pick &amp; Choose
                </Link>
              </div>
            </div>

            <div className="text-[var(--text-dim)] text-[12px] tracking-normal mb-4">
              {TOOLS.length} tools available — click <strong style={{ color: 'var(--text-bright)' }}>Preview</strong> to open with full access in a new tab.
            </div>

            <div className="card mb-6">
              {TOOLS.map((tool, i) => (
                <div
                  key={tool.id}
                  className="grid items-center gap-4 px-4 py-3.5 transition-colors duration-100"
                  style={{
                    gridTemplateColumns: '100px 1fr auto',
                    borderBottom: i < TOOLS.length - 1 ? '1px solid var(--border)' : 'none',
                    background: selectedToolId === tool.id ? 'var(--surface2)' : 'transparent',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = selectedToolId === tool.id ? 'var(--surface2)' : 'transparent')}
                >
                  <span className="text-[10px] tracking-normal text-[var(--accent)] font-bold uppercase font-mono">
                    {toolContent[tool.id]?.tag || tool.tag}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedToolId(tool.id)}
                    className="text-left bg-transparent border-0 p-0 cursor-pointer font-inherit"
                  >
                    <div className="text-[var(--text-bright)] font-bold text-[13px] tracking-normal uppercase">
                      {toolContent[tool.id]?.name || tool.name}
                    </div>
                    <div className="text-[var(--text-dim)] text-[12px] mt-0.5">{toolContent[tool.id]?.content[0]?.body.slice(0, 140) || tool.desc}</div>
                  </button>
                  <div className="flex gap-1.5">
                    <Link
                      href={`/tools/${tool.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[12px] px-3 py-1.25 bg-transparent border border-[var(--border)] text-[var(--text-dim)] no-underline tracking-normal inline-block whitespace-nowrap"
                    >
                      ↗ Page
                    </Link>
                    <button type="button"
                      className="btn-primary"
                      onClick={() => openToolPreview(tool.id)}
                      disabled={previewLoading === tool.id}
                      style={{ fontSize: '12px', padding: '5px 12px', opacity: previewLoading === tool.id ? 0.6 : 1, whiteSpace: 'nowrap' }}
                    >
                      {previewLoading === tool.id ? '...' : 'Preview'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {selectedToolContent && (
              <form onSubmit={saveToolContent} className="card p-[18px] grid gap-[18px]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[var(--text-dim)] text-[12px] tracking-normal uppercase">Edit selected tool</div>
                    <strong className="text-[var(--text-bright)] text-[18px] uppercase">{selectedToolContent.name}</strong>
                  </div>
                  <button type="submit" className="btn-primary" disabled={toolContentSaving} style={{ minHeight: '40px' }}>
                    {toolContentSaving ? 'SAVING...' : 'SAVE TOOL CONTENT'}
                  </button>
                </div>

                <div className="grid gap-3" style={{ gridTemplateColumns: 'minmax(0, 1fr) 180px' }}>
                  <div>
                    <div className={LABEL_CLASS}>Tool name</div>
                    <input aria-label="Input" value={selectedToolContent.name} onChange={e => setToolField(selectedToolId, 'name', e.target.value)} />
                  </div>
                  <div>
                    <div className={LABEL_CLASS}>Tag</div>
                    <input aria-label="Input" value={selectedToolContent.tag} onChange={e => setToolField(selectedToolId, 'tag', e.target.value)} />
                  </div>
                </div>

                <div className="grid gap-4">
                  {selectedToolContent.content.map((item: ToolItem, index: number) => (
                    <div key={`${selectedToolId}-${index}`} className="p-4 border border-[var(--border)] bg-[rgba(255,255,255,0.22)] grid gap-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[var(--accent)] text-[10px] tracking-normal uppercase font-bold">Section {String(index + 1).padStart(2, '0')}</span>
                        <span className="text-[var(--text-dim)] text-[10px]">{item.body.length} chars</span>
                      </div>
                      <div className="grid gap-3" style={{ gridTemplateColumns: 'minmax(0, 1fr) 180px' }}>
                        <div>
                          <div className={LABEL_CLASS}>Title</div>
                          <input aria-label="Input" value={item.title} onChange={e => setToolItemField(selectedToolId, index, 'title', e.target.value)} />
                        </div>
                        <div>
                          <div className={LABEL_CLASS}>Category</div>
                          <input aria-label="Input" value={item.category || ''} onChange={e => setToolItemField(selectedToolId, index, 'category', e.target.value)} placeholder="Optional" />
                        </div>
                      </div>
                      <div>
                        <div className={LABEL_CLASS}>Image path</div>
                        <input aria-label="Input" value={item.image || ''} onChange={e => setToolItemField(selectedToolId, index, 'image', e.target.value)} placeholder="/assets/tools/..." />
                      </div>
                      <div>
                        <div className={LABEL_CLASS}>Body</div>
                        <textarea aria-label="Textarea" value={item.body} onChange={e => setToolItemField(selectedToolId, index, 'body', e.target.value)} rows={8} />
                      </div>
                      {(item.pros || item.cons) && (
                        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                          <div>
                            <div className={LABEL_CLASS}>Advantages - one per line</div>
                            <textarea aria-label="Textarea" value={idsToText(item.pros || [])} onChange={e => setToolItemList(selectedToolId, index, 'pros', e.target.value)} rows={4} />
                          </div>
                          <div>
                            <div className={LABEL_CLASS}>Disadvantages - one per line</div>
                            <textarea aria-label="Textarea" value={idsToText(item.cons || [])} onChange={e => setToolItemList(selectedToolId, index, 'cons', e.target.value)} rows={4} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </form>
            )}
          </>
        )}

        <style>{`
          .admin-shell {
            --surface: #f7f6f0;
            --surface2: #ecebe4;
            --surface3: #e3e1d8;
            --border: rgba(16, 16, 14, 0.16);
            --text-bright: #10100e;
            --text-dim: rgba(16, 16, 14, 0.56);
            --accent: #0f7d4f;
            --accent-muted: rgba(15, 125, 79, 0.08);
            --card-bg: rgba(255, 255, 255, 0.34);
            --field-bg: rgba(255, 255, 255, 0.46);
            --ghost-bg: rgba(255, 255, 255, 0.24);
            --primary-bg: #10100e;
            --primary-text: #fff;
            color: var(--text-bright);
            font-family: var(--tm-mono, monospace);
          }

          :root[data-theme="dark"] .admin-shell {
            --surface: #0c0c10;
            --surface2: #121218;
            --surface3: #17171f;
            --border: rgba(243, 246, 239, 0.18);
            --text-bright: #f3f6ef;
            --text-dim: rgba(243, 246, 239, 0.6);
            --accent: #4fd39a;
            --accent-muted: rgba(79, 211, 154, 0.12);
            --card-bg: rgba(243, 246, 239, 0.04);
            --field-bg: rgba(243, 246, 239, 0.06);
            --ghost-bg: rgba(243, 246, 239, 0.06);
            --primary-bg: #163cff;
            --primary-text: #fff;
          }

          .admin-shell .card {
            border: 1px solid var(--border);
            background: var(--card-bg);
            box-shadow: 0 18px 45px rgba(16, 16, 14, 0.06);
          }

          .admin-shell .btn-primary,
          .admin-shell .btn-ghost {
            border-radius: 4px;
            cursor: pointer;
            font-family: inherit;
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            transition: transform 0.12s ease, opacity 0.12s ease, background 0.12s ease;
          }

          .admin-shell .btn-primary {
            border: 1px solid var(--primary-bg);
            background: var(--primary-bg);
            color: var(--primary-text);
            padding: 8px 14px;
          }

          .admin-shell .btn-ghost {
            border: 1px solid var(--border);
            background: var(--ghost-bg);
            color: var(--text-bright);
            padding: 7px 11px;
          }

          .admin-shell .btn-primary:hover,
          .admin-shell .btn-ghost:hover {
            transform: translateY(-1px);
            opacity: 0.86;
          }

          .admin-shell .btn-primary:disabled,
          .admin-shell .btn-ghost:disabled {
            cursor: not-allowed;
            opacity: 0.45;
            transform: none;
          }

          .admin-shell .admin-field,
          .admin-shell input,
          .admin-shell select,
          .admin-shell textarea {
            box-sizing: border-box;
            width: 100%;
            border: 1px solid var(--border);
            border-radius: 4px;
            background: var(--field-bg);
            color: var(--text-bright);
            font-family: inherit;
            font-size: 13px;
            line-height: 1.35;
            outline: none;
            padding: 10px 11px;
          }

          .admin-shell select option {
            background: var(--surface);
            color: var(--text-bright);
          }

          .admin-shell textarea {
            min-height: 96px;
          }

          .admin-shell .admin-field:focus,
          .admin-shell input:focus,
          .admin-shell select:focus,
          .admin-shell textarea:focus {
            border-color: rgba(15, 125, 79, 0.62);
            box-shadow: 0 0 0 3px rgba(15, 125, 79, 0.09);
          }

          @media (max-width: 1100px) {
            .admin-shell main form {
              grid-template-columns: 1fr !important;
            }

            .admin-shell main aside {
              position: static !important;
            }
          }
        `}</style>

      </main>
    </div>
  );
}
