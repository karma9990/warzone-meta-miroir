'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Loadout, Attachment, Tier } from '@/lib/data';
import type { CommunityPost } from '@/lib/communityStore';
import type { NextMetaAttachment, NextMetaConfig, NextMetaPatchSignal, NextMetaRangeRole } from '@/lib/nextMetaConfig';
import type { SiteContent } from '@/lib/siteContent';
import type { SiteControls, SetupBuild, EsportSource } from '@/lib/siteControls';
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

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: 'var(--text-dim)',
  fontSize: '12px',
  letterSpacing: '0',
  textTransform: 'uppercase',
  marginBottom: '6px',
};

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
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '9px 12px',
        borderRadius: '4px',
        border: 'none',
        background: active ? 'rgba(0,255,136,0.08)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text-dim)',
        fontSize: '12px',
        fontWeight: active ? 700 : 400,
        letterSpacing: '0',
        textTransform: 'uppercase',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.15s',
        fontFamily: 'inherit',
        borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--surface2)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <span style={{ fontSize: '14px', opacity: 0.8 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge !== undefined && (
        <span style={{
          fontSize: '10px',
          padding: '1px 6px',
          borderRadius: '10px',
          background: active ? 'rgba(0,255,136,0.15)' : 'var(--surface2)',
          color: active ? 'var(--accent)' : 'var(--text-dim)',
          fontWeight: 600,
        }}>
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
  const [view, setView]             = useState<'list' | 'form' | 'tools' | 'next-meta' | 'site-content' | 'site-controls' | 'community'>('list');
  const [nextMeta, setNextMeta]     = useState<NextMetaConfig>(EMPTY_NEXT_META_CONFIG);
  const [nextMetaWeaponsText, setNextMetaWeaponsText] = useState('');
  const [nextMetaSaving, setNextMetaSaving] = useState(false);
  const [siteContent, setSiteContent] = useState<SiteContent>(EMPTY_SITE_CONTENT);
  const [siteContentSaving, setSiteContentSaving] = useState(false);
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

  const weaponOptions = loadouts.map((loadout) => ({ id: loadout.id, label: `${loadout.weapon} (${loadout.id})` }));
  const setHomeControl = <K extends keyof SiteControls['home']>(key: K, value: SiteControls['home'][K]) => {
    setSiteControls(current => ({ ...current, home: { ...current.home, [key]: value } }));
  };
  const idsToText = (ids: string[]) => ids.join('\n');
  const textToIds = (value: string) => value.split('\n').map(item => item.trim()).filter(Boolean);
  const pairsToText = (pairs: string[][]) => pairs.map(pair => pair.join(', ')).join('\n');
  const textToPairs = (value: string) => value
    .split('\n')
    .map(line => line.split(',').map(item => item.trim()).filter(Boolean).slice(0, 2))
    .filter(pair => pair.length > 0);

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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '320px' }}>
          <div style={{ marginBottom: '32px', textAlign: 'center' }}>
            <div style={{ color: 'var(--text-dim)', fontSize: '12px', letterSpacing: '0', textTransform: 'uppercase', marginBottom: '6px' }}>
              warzone // admin
            </div>
            <div style={{ color: 'var(--text-bright)', fontSize: '20px', fontWeight: 800, letterSpacing: '0', textTransform: 'uppercase' }}>
              WZ<span style={{ color: 'var(--accent)' }}>_META</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ color: 'var(--text-dim)', fontSize: '12px', letterSpacing: '0', textTransform: 'uppercase' }}>
              Authentication required
            </div>
            <div>
              <div style={labelStyle}>Password</div>
              <input aria-label="Input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            {authError && (
              <div style={{ color: '#ff4455', fontSize: '12px', letterSpacing: '0' }}>
                ✗ {authError}
              </div>
            )}
            <button type="submit" className="btn-primary" style={{ width: '100%' }}>
              ACCESS
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <Link href="/" style={{ color: 'var(--text-dim)', fontSize: '12px', textDecoration: 'none', letterSpacing: '0' }}>
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
    <div className="admin-shell" style={{ display: 'flex', minHeight: '100vh' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: '220px',
        flexShrink: 0,
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        background: 'var(--surface)',
        zIndex: 10,
      }}>
        {/* Brand */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--text-dim)', fontSize: '10px', letterSpacing: '0', textTransform: 'uppercase', marginBottom: '4px' }}>
            Admin Panel
          </div>
          <div style={{ color: 'var(--text-bright)', fontSize: '17px', fontWeight: 800, letterSpacing: '0', textTransform: 'uppercase' }}>
            WZ<span style={{ color: 'var(--accent)' }}>_META</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ color: 'var(--text-dim)', fontSize: '9px', letterSpacing: '0', textTransform: 'uppercase', padding: '4px 12px 8px', opacity: 0.5 }}>
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
        <div style={{ padding: '16px 8px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <Link href="/"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              color: 'var(--text-dim)',
              textDecoration: 'none',
              fontSize: '12px',
              letterSpacing: '0',
              borderRadius: '4px',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ fontSize: '12px' }}>↗</span> Public site
          </Link>
          <button type="button"
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-dim)',
              fontSize: '12px',
              letterSpacing: '0',
              borderRadius: '4px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              textAlign: 'left',
              width: '100%',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ fontSize: '12px' }}>⇠</span> Log out
          </button>
        </div>
      </aside>

      {/* ── Content area ── */}
      <main style={{ marginLeft: '220px', flex: 1, padding: '32px 36px 60px', minWidth: 0 }}>

        {/* Flash message */}
        {msg && (
          <div style={{
            padding: '10px 14px',
            background: 'var(--accent-muted)',
            border: '1px solid rgba(0,255,136,0.2)',
            color: 'var(--accent)',
            fontSize: '12px',
            letterSpacing: '0',
            borderRadius: '2px',
            marginBottom: '24px',
          }}>
            {msg}
          </div>
        )}

        {/* ── LOADOUT LIST ── */}
        {view === 'list' && (
          <>
            {/* Page header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
              <div>
                <div style={{ color: 'var(--text-dim)', fontSize: '12px', letterSpacing: '0', textTransform: 'uppercase' }}>Loadouts</div>
                <div style={{ color: 'var(--text-bright)', fontSize: '20px', fontWeight: 800, letterSpacing: '0', marginTop: '2px', textTransform: 'uppercase' }}>
                  Weapon List
                </div>
              </div>
              <button type="button" className="btn-primary" onClick={startNew}>+ NEW</button>
            </div>

            {/* Tier counters */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
              {TIERS.map(tier => {
                const count = loadouts.filter(l => l.tier === tier).length;
                return (
                  <div key={tier} style={{
                    padding: '8px 16px',
                    border: `1px solid ${TIER_COLORS[tier]}30`,
                    background: `${TIER_COLORS[tier]}08`,
                    borderRadius: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <span style={{ color: TIER_COLORS[tier], fontWeight: 700, fontSize: '12px' }}>{tier}</span>
                    <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>{count}</span>
                  </div>
                );
              })}
              <div style={{ padding: '8px 16px', border: '1px solid var(--border)', borderRadius: '2px' }}>
                <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Total </span>
                <span style={{ color: 'var(--text-bright)', fontSize: '12px', fontWeight: 700 }}>{loadouts.length}</span>
              </div>
            </div>

            {/* Table */}
            {loadouts.length === 0 ? (
              <div style={{
                padding: '48px',
                border: '1px dashed var(--border)',
                borderRadius: '3px',
                color: 'var(--text-dim)',
                textAlign: 'center',
                fontSize: '13px',
                letterSpacing: '0',
              }}>
                No loadouts yet. Click <strong style={{ color: 'var(--accent)' }}>+ NEW</strong> to start.
              </div>
            ) : (
              <div className="card">
                {/* Table header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '52px 40px 1fr 130px 110px auto',
                  gap: '12px',
                  padding: '10px 16px',
                  borderBottom: '1px solid var(--border)',
                  color: 'var(--text-dim)',
                  fontSize: '12px',
                  letterSpacing: '0',
                  textTransform: 'uppercase',
                }}>
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
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '52px 40px 1fr 130px 110px auto',
                      gap: '12px',
                      padding: '10px 16px',
                      alignItems: 'center',
                      borderBottom: i < loadouts.length - 1 ? '1px solid var(--border)' : 'none',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span className="tag" style={{
                      background: `${TIER_COLORS[l.tier]}18`,
                      color: TIER_COLORS[l.tier],
                      border: `1px solid ${TIER_COLORS[l.tier]}40`,
                      fontWeight: 700,
                      fontSize: '12px',
                      textAlign: 'center',
                    }}>
                      {l.tier}
                    </span>

                    <div style={{ width: '36px', height: '28px', display: 'flex', alignItems: 'center' }}>
                      {l.weaponId && (
                        <WImg
                          id={l.weaponId}
                          style={{ maxHeight: '28px', maxWidth: '36px', objectFit: 'contain', opacity: 0.55 }}
                        />
                      )}
                    </div>

                    <div>
                      <div style={{ color: 'var(--text-bright)', fontWeight: 600, fontSize: '13px' }}>{l.weapon}</div>
                      <div style={{ color: 'var(--text-dim)', fontSize: '12px' }}>{l.playstyle}</div>
                    </div>
                    <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>{l.category}</span>
                    <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>{l.updatedAt}</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
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
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
              <div>
                <div style={{ color: 'var(--text-dim)', fontSize: '12px', letterSpacing: '0', textTransform: 'uppercase' }}>Loadouts</div>
                <div style={{ color: 'var(--text-bright)', fontSize: '20px', fontWeight: 800, letterSpacing: '0', marginTop: '2px', textTransform: 'uppercase' }}>
                  {editingId ? 'Edit' : 'New Loadout'}
                </div>
              </div>
              <button type="button" className="btn-ghost" onClick={cancelForm}>← Cancel</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '720px' }}>

              {/* Weapon preview */}
              {form.weaponId && (
                <div className="card" style={{
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  borderLeft: '2px solid var(--accent)',
                }}>
                  <WImg
                    id={form.weaponId}
                    style={{ height: '40px', maxWidth: '140px', objectFit: 'contain', opacity: 0.8, filter: 'brightness(1.3) saturate(0.4)' }}
                  />
                  <div>
                    <div style={{ color: 'var(--accent)', fontSize: '13px', fontWeight: 700 }}>{form.weapon}</div>
                    <div style={{ color: 'var(--text-dim)', fontSize: '12px', letterSpacing: '0' }}>
                      {form.weaponId} · {form.category}
                    </div>
                  </div>
                </div>
              )}

              {/* Row 1: weapon + category */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={labelStyle}>Weapon *</div>
                  <div style={{ position: 'relative' }}>
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
                      <div style={{
                        position: 'absolute',
                        zIndex: 200,
                        top: 'calc(100% + 4px)',
                        left: 0,
                        right: 0,
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '3px',
                        maxHeight: '260px',
                        overflowY: 'auto',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                      }}>
                        {filteredWeapons.map((w, idx) => (
                          <div
                            key={w.id}
                            onMouseDown={() => selectWeapon(w)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '8px 12px',
                              cursor: 'pointer',
                              background: idx === dropdownIdx ? 'var(--surface2)' : 'transparent',
                              borderBottom: idx < filteredWeapons.length - 1 ? '1px solid var(--border)' : 'none',
                              transition: 'background 0.1s',
                            }}
                            onMouseEnter={() => setDropdownIdx(idx)}
                          >
                            <WImg
                              id={w.id}
                              style={{ height: '28px', width: '60px', objectFit: 'contain', opacity: 0.65, flexShrink: 0 }}
                            />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ color: 'var(--text-bright)', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {w.name}
                              </div>
                              <div style={{ color: 'var(--text-dim)', fontSize: '10px', letterSpacing: '0' }}>
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
                  <div style={labelStyle}>Category</div>
                  <select aria-label="Select" value={form.category} onChange={e => setField('category', e.target.value)}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Row 2: tier + playstyle */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={labelStyle}>Tier</div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {TIERS.map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setField('tier', t)}
                        style={{
                          flex: 1,
                          padding: '8px',
                          border: `1px solid ${form.tier === t ? TIER_COLORS[t] : 'var(--border)'}`,
                          background: form.tier === t ? `${TIER_COLORS[t]}18` : 'var(--surface2)',
                          color: form.tier === t ? TIER_COLORS[t] : 'var(--text-dim)',
                          fontWeight: 700,
                          fontSize: '13px',
                          borderRadius: '2px',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          transition: 'all 0.15s',
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={labelStyle}>Playstyle</div>
                  <select aria-label="Select" value={form.playstyle} onChange={e => setField('playstyle', e.target.value)}>
                    {PLAYSTYLES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {/* Stats */}
              <div>
                <div style={labelStyle}>Stats (0–100)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {(['damage', 'range', 'mobility', 'control'] as const).map(key => (
                    <div key={key}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-dim)', fontSize: '12px', letterSpacing: '0', textTransform: 'uppercase' }}>{key}</span>
                        <span style={{ color: 'var(--text-bright)', fontSize: '12px' }}>{form.stats[key]}</span>
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={labelStyle}>Attachments ({form.attachments.length}/10)</div>
                  <button type="button" className="btn-ghost" onClick={addAttachment} style={{ padding: '4px 10px', fontSize: '12px' }}>
                    + Add
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {form.attachments.map((att, i) => {
                    const suggestions = getAttSuggestions(i, att.slot);
                    const isOpen = attDropdowns === i && suggestions.length > 0;
                    return (
                      <div key={`${att.slot}-${att.name || 'empty'}`} style={{ display: 'grid', gridTemplateColumns: '160px 1fr auto', gap: '8px', alignItems: 'start' }}>
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

                        <div style={{ position: 'relative' }}>
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
                            <div style={{
                              position: 'absolute',
                              zIndex: 300,
                              top: 'calc(100% + 2px)',
                              left: 0,
                              right: 0,
                              background: 'var(--surface)',
                              border: '1px solid var(--border)',
                              borderRadius: '3px',
                              maxHeight: '200px',
                              overflowY: 'auto',
                              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                            }}>
                              {suggestions.map((s, si) => (
                                <div
                                  key={s.name}
                                  onMouseDown={() => selectAttachment(i, s.name)}
                                  style={{
                                    padding: '7px 12px',
                                    cursor: 'pointer',
                                    borderBottom: si < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '8px',
                                  }}
                                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                  <span style={{ color: 'var(--text-bright)', fontSize: '12px' }}>{s.name}</span>
                                  <span style={{
                                    color: 'var(--text-dim)',
                                    fontSize: '10px',
                                    letterSpacing: '0',
                                    textTransform: 'uppercase',
                                    flexShrink: 0,
                                  }}>
                                    {s.game}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          className="btn-danger"
                          onClick={() => removeAttachment(i)}
                          style={{ width: '32px', padding: '8px', textAlign: 'center' }}
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
                <div style={labelStyle}>Notes / Context</div>
                <textarea aria-label="Textarea"
                  value={form.notes}
                  onChange={e => setField('notes', e.target.value)}
                  placeholder="Strengths, usage context..."
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
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
            <div style={{
              marginBottom: '24px',
              padding: '22px',
              border: '1px solid rgba(0,255,136,0.18)',
              background: 'linear-gradient(135deg, rgba(0,255,136,0.08), rgba(255,255,255,0.02) 48%, rgba(22,60,255,0.07))',
              borderRadius: '6px',
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: '20px',
              alignItems: 'center',
            }}>
              <div>
                <div style={{ color: 'var(--accent)', fontSize: '10px', letterSpacing: '0', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 800 }}>
                  Next Meta Control Room
                </div>
                <h1 style={{ color: 'var(--text-bright)', fontSize: '26px', lineHeight: 1, margin: 0, letterSpacing: '0', textTransform: 'uppercase' }}>
                  Official prediction baseline
                </h1>
                <p style={{ color: 'var(--text-dim)', fontSize: '12px', lineHeight: 1.7, margin: '12px 0 0', maxWidth: '680px' }}>
                  Manage the default values users see when they open Next Meta. Public users can draft local predictions, but only admin changes update the official baseline.
                </p>
              </div>
              <button type="button" className="btn-primary" onClick={() => openToolPreview('next-meta')} disabled={previewLoading === 'next-meta'} style={{ minWidth: '160px', height: '38px' }}>
                {previewLoading === 'next-meta' ? '...' : 'Preview Tool'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px', marginBottom: '18px' }}>
              {[
                { label: 'Weapon', value: nextMeta.defaultWeapon || 'Unset' },
                { label: 'Signal', value: nextMeta.defaultSignal },
                { label: 'Priority', value: `${nextMeta.priorityScore}%` },
                { label: 'Updated', value: nextMeta.updatedAt || 'Draft' },
              ].map(card => (
                <div key={card.label} style={{
                  padding: '14px 16px',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  borderRadius: '5px',
                  minHeight: '78px',
                }}>
                  <div style={{ color: 'var(--text-dim)', fontSize: '9px', letterSpacing: '0', textTransform: 'uppercase', marginBottom: '10px' }}>
                    {card.label}
                  </div>
                  <div style={{ color: 'var(--text-bright)', fontSize: '18px', fontWeight: 800, letterSpacing: '0', overflowWrap: 'anywhere' }}>
                    {card.value}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={saveNextMeta} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: '18px', alignItems: 'start' }}>
              <div className="card" style={{ padding: '18px', display: 'grid', gap: '18px', borderRadius: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ color: 'var(--text-bright)', fontSize: '14px', fontWeight: 800, letterSpacing: '0', textTransform: 'uppercase' }}>
                      Baseline setup
                    </div>
                    <div style={{ color: 'var(--text-dim)', fontSize: '12px', marginTop: '4px' }}>
                      Values injected into the paid Next Meta tool.
                    </div>
                  </div>
                  <span style={{ color: 'var(--accent)', fontSize: '10px', letterSpacing: '0', textTransform: 'uppercase', border: '1px solid rgba(0,255,136,0.2)', padding: '5px 8px', borderRadius: '999px' }}>
                    Admin only
                  </span>
                </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={labelStyle}>Default Weapon</div>
                  <input aria-label="Input" className="admin-field" value={nextMeta.defaultWeapon} onChange={e => setNextMetaField('defaultWeapon', e.target.value)} />
                </div>
                <div>
                  <div style={labelStyle}>Default Category</div>
                  <input aria-label="Input" className="admin-field" value={nextMeta.defaultCategory} onChange={e => setNextMetaField('defaultCategory', e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={labelStyle}>Role</div>
                  <select aria-label="Select" className="admin-field" value={nextMeta.defaultRole} onChange={e => setNextMetaField('defaultRole', e.target.value as NextMetaRangeRole)}>
                    {NEXT_META_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                  </select>
                </div>
                <div>
                  <div style={labelStyle}>Patch Signal</div>
                  <select aria-label="Select" className="admin-field" value={nextMeta.defaultSignal} onChange={e => setNextMetaField('defaultSignal', e.target.value as NextMetaPatchSignal)}>
                    {NEXT_META_SIGNALS.map(signal => <option key={signal} value={signal}>{signal}</option>)}
                  </select>
                </div>
                <div>
                  <div style={labelStyle}>Confidence</div>
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
                  <div style={labelStyle}>Priority Score</div>
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
                <div style={labelStyle}>Weapon Suggestions (one per line)</div>
                <textarea aria-label="Textarea"
                  className="admin-field"
                  value={nextMetaWeaponsText}
                  onChange={e => setNextMetaWeaponsText(e.target.value)}
                  rows={8}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ ...labelStyle, marginBottom: 0 }}>Default Attachments</div>
                  <button type="button" className="btn-ghost" onClick={addNextMetaAttachment} disabled={nextMeta.defaultAttachments.length >= 8}>
                    + Add
                  </button>
                </div>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {nextMeta.defaultAttachments.map((attachment, index) => (
                    <div key={`${attachment.slot}-${index}`} style={{ display: 'grid', gridTemplateColumns: '34px 1fr 1.4fr auto', gap: '8px', alignItems: 'center', padding: '8px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '4px' }}>
                      <span style={{ color: 'var(--accent)', fontSize: '10px', fontWeight: 800, textAlign: 'center' }}>{String(index + 1).padStart(2, '0')}</span>
                      <input aria-label="Input" className="admin-field" value={attachment.slot} onChange={e => setNextMetaAttachment(index, 'slot', e.target.value)} />
                      <input aria-label="Input" className="admin-field" value={attachment.name} onChange={e => setNextMetaAttachment(index, 'name', e.target.value)} placeholder="Attachment name" />
                      <button type="button" className="btn-ghost" onClick={() => removeNextMetaAttachment(index)} style={{ height: '36px' }}>Remove</button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div style={labelStyle}>Patch Logic</div>
                <textarea aria-label="Textarea"
                  className="admin-field"
                  value={nextMeta.defaultPatchNote}
                  onChange={e => setNextMetaField('defaultPatchNote', e.target.value)}
                  rows={4}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div>
                <div style={labelStyle}>Why It Could Become Meta</div>
                <textarea aria-label="Textarea"
                  className="admin-field"
                  value={nextMeta.defaultReason}
                  onChange={e => setNextMetaField('defaultReason', e.target.value)}
                  rows={4}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button type="submit" className="btn-primary" disabled={nextMetaSaving} style={{ minWidth: '190px', height: '38px' }}>
                  {nextMetaSaving ? 'SAVING...' : 'SAVE NEXT META VALUES'}
                </button>
                <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>
                  Last update: {nextMeta.updatedAt || 'not saved yet'}
                </span>
              </div>
              </div>

              <aside className="card" style={{ padding: '18px', borderRadius: '6px', position: 'sticky', top: '24px', display: 'grid', gap: '14px' }}>
                <div>
                  <div style={{ color: 'var(--text-dim)', fontSize: '10px', letterSpacing: '0', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Live Preview
                  </div>
                  <div style={{ color: 'var(--text-bright)', fontSize: '22px', lineHeight: 1.1, fontWeight: 900, letterSpacing: '0', textTransform: 'uppercase' }}>
                    {nextMeta.defaultWeapon || 'Weapon'}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ padding: '10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '4px' }}>
                    <span style={{ display: 'block', color: 'var(--text-dim)', fontSize: '9px', letterSpacing: '0', textTransform: 'uppercase' }}>Role</span>
                    <strong style={{ color: 'var(--text-bright)', fontSize: '12px' }}>{nextMeta.defaultRole}</strong>
                  </div>
                  <div style={{ padding: '10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '4px' }}>
                    <span style={{ display: 'block', color: 'var(--text-dim)', fontSize: '9px', letterSpacing: '0', textTransform: 'uppercase' }}>Signal</span>
                    <strong style={{ color: 'var(--accent)', fontSize: '12px' }}>{nextMeta.defaultSignal}</strong>
                  </div>
                </div>

                <div style={{ padding: '14px', background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.16)', borderRadius: '4px' }}>
                  <div style={{ color: 'var(--text-dim)', fontSize: '9px', letterSpacing: '0', textTransform: 'uppercase', marginBottom: '8px' }}>Priority score shown in blue box</div>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.max(0, Math.min(100, nextMeta.priorityScore))}%`, height: '100%', background: 'var(--accent)' }} />
                  </div>
                  <div style={{ color: 'var(--text-bright)', fontSize: '24px', fontWeight: 900, marginTop: '8px' }}>{nextMeta.priorityScore}%</div>
                </div>

                <div>
                  <div style={{ color: 'var(--text-dim)', fontSize: '10px', letterSpacing: '0', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Attachments
                  </div>
                  <div style={{ display: 'grid', gap: '6px' }}>
                    {nextMeta.defaultAttachments.map((attachment, index) => (
                      <div key={`preview-${attachment.slot}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', padding: '8px 10px', border: '1px solid var(--border)', background: 'var(--surface2)', borderRadius: '3px' }}>
                        <span style={{ color: 'var(--text-dim)', fontSize: '10px' }}>{attachment.slot}</span>
                        <strong style={{ color: 'var(--text-bright)', fontSize: '10px', textAlign: 'right' }}>{attachment.name || 'TBD'}</strong>
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
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
              <div>
                <div style={{ color: 'var(--text-dim)', fontSize: '12px', letterSpacing: '0', textTransform: 'uppercase' }}>Site Content</div>
                <div style={{ color: 'var(--text-bright)', fontSize: '20px', fontWeight: 800, letterSpacing: '0', marginTop: '2px', textTransform: 'uppercase' }}>
                  Editable public sections
                </div>
              </div>
              <Link href="/" target="_blank" rel="noreferrer" className="btn-ghost" style={{ textDecoration: 'none' }}>
                Preview site
              </Link>
            </div>

            <form onSubmit={saveSiteContent} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '18px', alignItems: 'start' }}>
              <div style={{ display: 'grid', gap: '18px' }}>
                <section className="card" style={{ padding: '18px', borderRadius: '6px', display: 'grid', gap: '14px' }}>
                  <div>
                    <div style={{ color: 'var(--accent)', fontSize: '10px', letterSpacing: '0', textTransform: 'uppercase', fontWeight: 800 }}>Home</div>
                    <p style={{ color: 'var(--text-dim)', fontSize: '12px', margin: '6px 0 0' }}>Hero labels, headline, short pitch and CTA buttons.</p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
                    <div><div style={labelStyle}>Meta left</div><input aria-label="Input" value={siteContent.home.metaLeft} onChange={e => setSiteSection('home', 'metaLeft', e.target.value)} /></div>
                    <div><div style={labelStyle}>Meta center</div><input aria-label="Input" value={siteContent.home.metaCenter} onChange={e => setSiteSection('home', 'metaCenter', e.target.value)} /></div>
                    <div><div style={labelStyle}>Meta right</div><input aria-label="Input" value={siteContent.home.metaRight} onChange={e => setSiteSection('home', 'metaRight', e.target.value)} /></div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
                    <div><div style={labelStyle}>Title top</div><input aria-label="Input" value={siteContent.home.titleTop} onChange={e => setSiteSection('home', 'titleTop', e.target.value)} /></div>
                    <div><div style={labelStyle}>Title middle</div><input aria-label="Input" value={siteContent.home.titleMiddle} onChange={e => setSiteSection('home', 'titleMiddle', e.target.value)} /></div>
                    <div><div style={labelStyle}>Title bottom</div><input aria-label="Input" value={siteContent.home.titleBottom} onChange={e => setSiteSection('home', 'titleBottom', e.target.value)} /></div>
                  </div>
                  <div><div style={labelStyle}>Hero description</div><textarea aria-label="Textarea" value={siteContent.home.description} onChange={e => setSiteSection('home', 'description', e.target.value)} rows={3} /></div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px' }}>
                    <div><div style={labelStyle}>Eyebrow</div><input aria-label="Input" value={siteContent.home.eyebrow} onChange={e => setSiteSection('home', 'eyebrow', e.target.value)} /></div>
                    <div><div style={labelStyle}>Primary CTA</div><input aria-label="Input" value={siteContent.home.primaryCta} onChange={e => setSiteSection('home', 'primaryCta', e.target.value)} /></div>
                    <div><div style={labelStyle}>Secondary CTA</div><input aria-label="Input" value={siteContent.home.secondaryCta} onChange={e => setSiteSection('home', 'secondaryCta', e.target.value)} /></div>
                  </div>
                </section>

                <section className="card" style={{ padding: '18px', borderRadius: '6px', display: 'grid', gap: '14px' }}>
                  <div>
                    <div style={{ color: 'var(--accent)', fontSize: '10px', letterSpacing: '0', textTransform: 'uppercase', fontWeight: 800 }}>Pro Access</div>
                    <p style={{ color: 'var(--text-dim)', fontSize: '12px', margin: '6px 0 0' }}>Purchase page headline, price text and proof points. Checkout logic stays locked in code.</p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '10px' }}>
                    <div><div style={labelStyle}>Back label</div><input aria-label="Input" value={siteContent.proAccess.backLabel} onChange={e => setSiteSection('proAccess', 'backLabel', e.target.value)} /></div>
                    <div><div style={labelStyle}>Badge</div><input aria-label="Input" value={siteContent.proAccess.badge} onChange={e => setSiteSection('proAccess', 'badge', e.target.value)} /></div>
                    <div><div style={labelStyle}>Tag</div><input aria-label="Input" value={siteContent.proAccess.tag} onChange={e => setSiteSection('proAccess', 'tag', e.target.value)} /></div>
                    <div><div style={labelStyle}>Price</div><input aria-label="Input" value={siteContent.proAccess.price} onChange={e => setSiteSection('proAccess', 'price', e.target.value)} /></div>
                  </div>
                  <div><div style={labelStyle}>Title</div><input aria-label="Input" value={siteContent.proAccess.title} onChange={e => setSiteSection('proAccess', 'title', e.target.value)} /></div>
                  <div><div style={labelStyle}>Description</div><textarea aria-label="Textarea" value={siteContent.proAccess.description} onChange={e => setSiteSection('proAccess', 'description', e.target.value)} rows={3} /></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div><div style={labelStyle}>Period</div><input aria-label="Input" value={siteContent.proAccess.period} onChange={e => setSiteSection('proAccess', 'period', e.target.value)} /></div>
                    <div><div style={labelStyle}>CTA</div><input aria-label="Input" value={siteContent.proAccess.cta} onChange={e => setSiteSection('proAccess', 'cta', e.target.value)} /></div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ ...labelStyle, marginBottom: 0 }}>Proof points</div>
                    <button type="button" className="btn-ghost" onClick={addProProof}>+ Add proof</button>
                  </div>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {siteContent.proAccess.proofs.map((proof, index) => (
                      <div key={`${proof.title}-${index}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr auto', gap: '8px', padding: '8px', border: '1px solid var(--border)', background: 'var(--surface2)', borderRadius: '4px' }}>
                        <input aria-label="Input" value={proof.title} onChange={e => setProProof(index, 'title', e.target.value)} />
                        <input aria-label="Input" value={proof.body} onChange={e => setProProof(index, 'body', e.target.value)} />
                        <button type="button" className="btn-ghost" onClick={() => removeProProof(index)}>Remove</button>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="card" style={{ padding: '18px', borderRadius: '6px', display: 'grid', gap: '14px' }}>
                  <div>
                    <div style={{ color: 'var(--accent)', fontSize: '10px', letterSpacing: '0', textTransform: 'uppercase', fontWeight: 800 }}>Free Preview & Community</div>
                    <p style={{ color: 'var(--text-dim)', fontSize: '12px', margin: '6px 0 0' }}>Public copy for the free tier and social hub entry point.</p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div style={{ display: 'grid', gap: '10px' }}>
                      <div><div style={labelStyle}>Free back label</div><input aria-label="Input" value={siteContent.freePreview.backLabel} onChange={e => setSiteSection('freePreview', 'backLabel', e.target.value)} /></div>
                      <div><div style={labelStyle}>Free kicker</div><input aria-label="Input" value={siteContent.freePreview.kicker} onChange={e => setSiteSection('freePreview', 'kicker', e.target.value)} /></div>
                      <div><div style={labelStyle}>Free title</div><input aria-label="Input" value={siteContent.freePreview.title} onChange={e => setSiteSection('freePreview', 'title', e.target.value)} /></div>
                      <div><div style={labelStyle}>Free lead</div><textarea aria-label="Textarea" value={siteContent.freePreview.lead} onChange={e => setSiteSection('freePreview', 'lead', e.target.value)} rows={4} /></div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div><div style={labelStyle}>Primary CTA</div><input aria-label="Input" value={siteContent.freePreview.primaryCta} onChange={e => setSiteSection('freePreview', 'primaryCta', e.target.value)} /></div>
                        <div><div style={labelStyle}>Secondary CTA</div><input aria-label="Input" value={siteContent.freePreview.secondaryCta} onChange={e => setSiteSection('freePreview', 'secondaryCta', e.target.value)} /></div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gap: '10px' }}>
                      <div><div style={labelStyle}>Community kicker</div><input aria-label="Input" value={siteContent.community.kicker} onChange={e => setSiteSection('community', 'kicker', e.target.value)} /></div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div><div style={labelStyle}>Title top</div><input aria-label="Input" value={siteContent.community.titleTop} onChange={e => setSiteSection('community', 'titleTop', e.target.value)} /></div>
                        <div><div style={labelStyle}>Title bottom</div><input aria-label="Input" value={siteContent.community.titleBottom} onChange={e => setSiteSection('community', 'titleBottom', e.target.value)} /></div>
                      </div>
                      <div><div style={labelStyle}>Community description</div><textarea aria-label="Textarea" value={siteContent.community.description} onChange={e => setSiteSection('community', 'description', e.target.value)} rows={7} /></div>
                    </div>
                  </div>
                </section>
              </div>

              <aside className="card" style={{ padding: '18px', borderRadius: '6px', position: 'sticky', top: '24px', display: 'grid', gap: '14px' }}>
                <div>
                  <div style={{ color: 'var(--text-dim)', fontSize: '10px', letterSpacing: '0', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Security model
                  </div>
                  <div style={{ color: 'var(--text-bright)', fontSize: '18px', fontWeight: 900, textTransform: 'uppercase' }}>
                    Structured CMS only
                  </div>
                  <p style={{ color: 'var(--text-dim)', fontSize: '12px', lineHeight: 1.65 }}>
                    No raw HTML, no scripts, no env secrets. Every field is size-limited and normalized server-side. Local saves create a JSON backup before writing.
                  </p>
                </div>
                <div style={{ padding: '12px', border: '1px solid var(--border)', background: 'var(--surface2)', borderRadius: '4px' }}>
                  <div style={{ color: 'var(--text-dim)', fontSize: '10px', letterSpacing: '0', textTransform: 'uppercase', marginBottom: '8px' }}>Last saved</div>
                  <strong style={{ color: 'var(--text-bright)', fontSize: '14px' }}>{siteContent.updatedAt || 'Not saved yet'}</strong>
                </div>
                <button type="submit" className="btn-primary" disabled={siteContentSaving} style={{ minHeight: '40px' }}>
                  {siteContentSaving ? 'SAVING...' : 'SAVE SITE CONTENT'}
                </button>
              </aside>
            </form>
          </>
        )}

        {view === 'site-controls' && (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
              <div>
                <div style={{ color: 'var(--text-dim)', fontSize: '12px', letterSpacing: '0', textTransform: 'uppercase' }}>Site Controls</div>
                <div style={{ color: 'var(--text-bright)', fontSize: '20px', fontWeight: 800, letterSpacing: '0', marginTop: '2px', textTransform: 'uppercase' }}>
                  Homepage, setup and esport editors
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Link href="/home#ranking" target="_blank" rel="noreferrer" className="btn-ghost" style={{ textDecoration: 'none' }}>Top weapons</Link>
                <Link href="/home#all-loadouts" target="_blank" rel="noreferrer" className="btn-ghost" style={{ textDecoration: 'none' }}>Loadouts</Link>
                <Link href="/set-up" target="_blank" rel="noreferrer" className="btn-ghost" style={{ textDecoration: 'none' }}>Setup</Link>
                <Link href="/esport" target="_blank" rel="noreferrer" className="btn-ghost" style={{ textDecoration: 'none' }}>Esport</Link>
              </div>
            </div>

            <form onSubmit={saveSiteControls} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '18px', alignItems: 'start' }}>
              <div style={{ display: 'grid', gap: '18px' }}>
                <section className="card" style={{ padding: '18px', borderRadius: '6px', display: 'grid', gap: '14px' }}>
                  <div>
                    <div style={{ color: 'var(--accent)', fontSize: '10px', letterSpacing: '0', textTransform: 'uppercase', fontWeight: 800 }}>Homepage weapons</div>
                    <p style={{ color: 'var(--text-dim)', fontSize: '12px', margin: '6px 0 0' }}>Use loadout IDs. Each public link above opens the exact section you are editing.</p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={labelStyle}>Top Weapons order - one loadout ID per line</div>
                      <textarea aria-label="Textarea" rows={8} value={idsToText(siteControls.home.rankingWeaponIds)} onChange={e => setHomeControl('rankingWeaponIds', textToIds(e.target.value))} />
                    </div>
                    <div>
                      <div style={labelStyle}>Loadout duos - two IDs per line separated by comma</div>
                      <textarea aria-label="Textarea" rows={8} value={pairsToText(siteControls.home.loadoutPairIds)} onChange={e => setHomeControl('loadoutPairIds', textToPairs(e.target.value))} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '10px' }}>
                    <div>
                      <div style={labelStyle}>Current long range</div>
                      <select aria-label="Select" value={siteControls.home.currentLongRangeId} onChange={e => setHomeControl('currentLongRangeId', e.target.value)}>
                        <option value="">Auto</option>
                        {weaponOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={labelStyle}>Close meta</div>
                      <select aria-label="Select" value={siteControls.home.closeMetaId} onChange={e => setHomeControl('closeMetaId', e.target.value)}>
                        <option value="">Auto</option>
                        {weaponOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={labelStyle}>Compare left</div>
                      <select aria-label="Select" value={siteControls.home.compareWeaponIds[0] ?? ''} onChange={e => setHomeControl('compareWeaponIds', [e.target.value, siteControls.home.compareWeaponIds[1] ?? ''].filter(Boolean))}>
                        <option value="">Auto</option>
                        {weaponOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={labelStyle}>Compare right</div>
                      <select aria-label="Select" value={siteControls.home.compareWeaponIds[1] ?? ''} onChange={e => setHomeControl('compareWeaponIds', [siteControls.home.compareWeaponIds[0] ?? '', e.target.value].filter(Boolean))}>
                        <option value="">Auto</option>
                        {weaponOptions.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <div style={labelStyle}>Daily duo - one or two loadout IDs</div>
                    <textarea aria-label="Textarea" rows={2} value={idsToText(siteControls.home.dailyDuoIds)} onChange={e => setHomeControl('dailyDuoIds', textToIds(e.target.value).slice(0, 2))} />
                  </div>
                </section>

                <section className="card" style={{ padding: '18px', borderRadius: '6px', display: 'grid', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                    <div>
                      <div style={{ color: 'var(--accent)', fontSize: '10px', letterSpacing: '0', textTransform: 'uppercase', fontWeight: 800 }}>Setup components</div>
                      <p style={{ color: 'var(--text-dim)', fontSize: '12px', margin: '6px 0 0' }}>Edit setup tiers, components, and Amazon links.</p>
                    </div>
                    <button type="button" className="btn-ghost" onClick={addSetupBuild}>+ Add setup</button>
                  </div>
                  <div>
                    <div style={labelStyle}>Baseline checklist - one item per line</div>
                    <textarea aria-label="Textarea" rows={5} value={idsToText(siteControls.setup.checklist)} onChange={e => setSetupChecklistText(e.target.value)} />
                  </div>
                  {siteControls.setup.builds.map((build, buildIndex) => (
                    <div key={build.id} style={{ display: 'grid', gap: '8px', padding: '12px', border: '1px solid var(--border)', background: 'var(--surface2)', borderRadius: '4px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px' }}>
                        <input aria-label="Input" value={build.label} onChange={e => setSetupBuild(buildIndex, 'label', e.target.value)} placeholder="Label" />
                        <input aria-label="Input" value={build.title} onChange={e => setSetupBuild(buildIndex, 'title', e.target.value)} placeholder="Title" />
                        <button type="button" className="btn-ghost" onClick={() => removeSetupBuild(buildIndex)}>Remove</button>
                      </div>
                      <textarea aria-label="Textarea" rows={2} value={build.note} onChange={e => setSetupBuild(buildIndex, 'note', e.target.value)} placeholder="Note" />
                      {build.specs.map((spec, specIndex) => (
                        <div key={spec.id} style={{ display: 'grid', gridTemplateColumns: '0.7fr 1.2fr 1.6fr auto', gap: '8px' }}>
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

                <section className="card" style={{ padding: '18px', borderRadius: '6px', display: 'grid', gap: '14px' }}>
                  <div>
                    <div style={{ color: 'var(--accent)', fontSize: '10px', letterSpacing: '0', textTransform: 'uppercase', fontWeight: 800 }}>Esport tables</div>
                    <p style={{ color: 'var(--text-dim)', fontSize: '12px', margin: '6px 0 0' }}>Edit the guide steps and source cards shown in the esport conversation.</p>
                  </div>
                  <div>
                    <div style={labelStyle}>Starter steps - one per line</div>
                    <textarea aria-label="Textarea" rows={6} value={idsToText(siteControls.esport.starterSteps)} onChange={e => setEsportStepsText(e.target.value)} />
                  </div>
                  {(['tournamentSources', 'discordSources'] as const).map((kind) => (
                    <div key={kind} style={{ display: 'grid', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ ...labelStyle, marginBottom: 0 }}>{kind === 'tournamentSources' ? 'Tournament sources' : 'Discord sources'}</div>
                        <button type="button" className="btn-ghost" onClick={() => addEsportSource(kind)}>+ Add</button>
                      </div>
                      {siteControls.esport[kind].map((source, index) => (
                        <div key={source.id} style={{ display: 'grid', gridTemplateColumns: '0.8fr 0.8fr 1.2fr auto', gap: '8px' }}>
                          <input aria-label="Input" value={source.name} onChange={e => setEsportSource(kind, index, 'name', e.target.value)} placeholder="Name" />
                          <input aria-label="Input" value={source.type} onChange={e => setEsportSource(kind, index, 'type', e.target.value)} placeholder="Type" />
                          <input aria-label="Input" value={source.url} onChange={e => setEsportSource(kind, index, 'url', e.target.value)} placeholder="URL" />
                          <button type="button" className="btn-ghost" onClick={() => removeEsportSource(kind, index)}>Delete</button>
                          <textarea aria-label="Textarea" rows={2} value={source.note} onChange={e => setEsportSource(kind, index, 'note', e.target.value)} placeholder="Note" style={{ gridColumn: '1 / -1' }} />
                        </div>
                      ))}
                    </div>
                  ))}
                </section>
              </div>

              <aside className="card" style={{ padding: '18px', borderRadius: '6px', position: 'sticky', top: '24px', display: 'grid', gap: '14px' }}>
                <div>
                  <div style={{ color: 'var(--text-dim)', fontSize: '10px', letterSpacing: '0', textTransform: 'uppercase', marginBottom: '6px' }}>Security</div>
                  <div style={{ color: 'var(--text-bright)', fontSize: '18px', fontWeight: 900, textTransform: 'uppercase' }}>Admin-only writes</div>
                  <p style={{ color: 'var(--text-dim)', fontSize: '12px', lineHeight: 1.65 }}>Public pages only read sanitized JSON. Admin saves are authenticated, size-limited, and normalized server-side.</p>
                </div>
                <div style={{ padding: '12px', border: '1px solid var(--border)', background: 'var(--surface2)', borderRadius: '4px' }}>
                  <div style={{ color: 'var(--text-dim)', fontSize: '10px', letterSpacing: '0', textTransform: 'uppercase', marginBottom: '8px' }}>Loadout IDs</div>
                  <div style={{ display: 'grid', gap: '5px', maxHeight: '260px', overflow: 'auto' }}>
                    {weaponOptions.map(option => <code key={option.id} style={{ color: 'var(--text-bright)', fontSize: '10px' }}>{option.label}</code>)}
                  </div>
                </div>
                <div style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Last saved: {siteControls.updatedAt || 'not saved yet'}</div>
                <button type="submit" className="btn-primary" disabled={siteControlsSaving} style={{ minHeight: '40px' }}>
                  {siteControlsSaving ? 'SAVING...' : 'SAVE SITE CONTROLS'}
                </button>
              </aside>
            </form>
          </>
        )}

        {view === 'community' && (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
              <div>
                <div style={{ color: 'var(--text-dim)', fontSize: '12px', letterSpacing: '0', textTransform: 'uppercase' }}>Community</div>
                <div style={{ color: 'var(--text-bright)', fontSize: '20px', fontWeight: 800, letterSpacing: '0', marginTop: '2px', textTransform: 'uppercase' }}>
                  Discussions moderation
                </div>
              </div>
              <Link href="/community" target="_blank" rel="noreferrer" className="btn-ghost" style={{ textDecoration: 'none' }}>Open community</Link>
            </div>
            <div className="card" style={{ display: 'grid' }}>
              {communityPosts.map((post, index) => (
                <div key={post.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '14px', padding: '16px', borderBottom: index < communityPosts.length - 1 ? '1px solid var(--border)' : 'none', background: post.hidden ? 'rgba(255,68,85,0.05)' : 'transparent' }}>
                  <div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--accent)', fontSize: '10px', letterSpacing: '0', textTransform: 'uppercase' }}>{post.type}</span>
                      <span style={{ color: 'var(--text-dim)', fontSize: '10px' }}>{post.hidden ? 'hidden' : 'visible'} - reports {post.reports || 0}</span>
                    </div>
                    <strong style={{ color: 'var(--text-bright)', fontSize: '14px' }}>{post.title}</strong>
                    <p style={{ color: 'var(--text-dim)', fontSize: '12px', lineHeight: 1.55, margin: '6px 0 0' }}>{post.body}</p>
                    <div style={{ color: 'var(--text-dim)', fontSize: '10px', marginTop: '8px' }}>
                      {post.authorPseudo || post.author} - {post.region} - {post.mode} - replies {post.replies.length}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button type="button" className="btn-ghost" onClick={() => toggleCommunityHidden(post)}>{post.hidden ? 'Unhide' : 'Hide'}</button>
                    <button type="button" className="btn-ghost" onClick={() => deleteCommunityEntry(post)}>Delete</button>
                  </div>
                </div>
              ))}
              {communityPosts.length === 0 && (
                <div style={{ padding: '18px', color: 'var(--text-dim)', fontSize: '12px' }}>No community posts yet.</div>
              )}
            </div>
          </>
        )}

        {view === 'tools' && (
          <>
            {/* Page header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
              <div>
                <div style={{ color: 'var(--text-dim)', fontSize: '12px', letterSpacing: '0', textTransform: 'uppercase' }}>Tools</div>
                <div style={{ color: 'var(--text-bright)', fontSize: '20px', fontWeight: 800, letterSpacing: '0', marginTop: '2px', textTransform: 'uppercase' }}>
                  Pro Tools
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Link href="/pro-tools"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: '12px',
                    padding: '6px 14px',
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--text-dim)',
                    textDecoration: 'none',
                    letterSpacing: '0',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  ↗ Public page
                </Link>
                <Link href="/tools-individual"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: '12px',
                    padding: '6px 14px',
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--text-dim)',
                    textDecoration: 'none',
                    letterSpacing: '0',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  ↗ Pick &amp; Choose
                </Link>
              </div>
            </div>

            <div style={{ color: 'var(--text-dim)', fontSize: '12px', letterSpacing: '0', marginBottom: '16px' }}>
              {TOOLS.length} tools available — click <strong style={{ color: 'var(--text-bright)' }}>Preview</strong> to open with full access in a new tab.
            </div>

            <div className="card">
              {TOOLS.map((tool, i) => (
                <div
                  key={tool.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '100px 1fr auto',
                    gap: '16px',
                    padding: '14px 16px',
                    alignItems: 'center',
                    borderBottom: i < TOOLS.length - 1 ? '1px solid var(--border)' : 'none',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{
                    fontSize: '10px',
                    letterSpacing: '0',
                    color: 'var(--accent)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    fontFamily: 'monospace',
                  }}>
                    {tool.tag}
                  </span>
                  <div>
                    <div style={{ color: 'var(--text-bright)', fontWeight: 700, fontSize: '13px', letterSpacing: '0', textTransform: 'uppercase' }}>
                      {tool.name}
                    </div>
                    <div style={{ color: 'var(--text-dim)', fontSize: '12px', marginTop: '2px' }}>{tool.desc}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <Link
                      href={`/tools/${tool.id}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontSize: '12px',
                        padding: '5px 12px',
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        color: 'var(--text-dim)',
                        textDecoration: 'none',
                        letterSpacing: '0',
                        display: 'inline-block',
                        whiteSpace: 'nowrap',
                      }}
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
            color: var(--text-bright);
            font-family: var(--tm-mono, monospace);
          }

          .admin-shell .card {
            border: 1px solid var(--border);
            background: rgba(255, 255, 255, 0.34);
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
            border: 1px solid #10100e;
            background: #10100e;
            color: #fff;
            padding: 8px 14px;
          }

          .admin-shell .btn-ghost {
            border: 1px solid var(--border);
            background: rgba(255, 255, 255, 0.24);
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
            border: 1px solid rgba(16, 16, 14, 0.18);
            border-radius: 4px;
            background: rgba(255, 255, 255, 0.46);
            color: #10100e;
            font-family: inherit;
            font-size: 13px;
            line-height: 1.35;
            outline: none;
            padding: 10px 11px;
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
