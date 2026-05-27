'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import type { Loadout, Attachment, Tier } from '@/lib/data';

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
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" style={style} />;
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: 'var(--text-dim)',
  fontSize: '11px',
  letterSpacing: '0.08em',
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
    <button
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
        letterSpacing: '0.06em',
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
  const [view, setView]             = useState<'list' | 'form' | 'tools'>('list');

  // Tools preview
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);

  // Weapon autocomplete
  const [allWeapons, setAllWeapons]           = useState<WeaponEntry[]>([]);
  const [weaponQuery, setWeaponQuery]         = useState('');
  const [showDropdown, setShowDropdown]       = useState(false);

  // Attachment autocomplete
  const [allAttachments, setAllAttachments]   = useState<AttachmentEntry[]>([]);
  const [attQueries, setAttQueries]           = useState<string[]>([]);
  const [attDropdowns, setAttDropdowns]       = useState<number | null>(null);
  const [dropdownIdx, setDropdownIdx]         = useState(0);
  const weaponInputRef                        = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/weapons')
      .then(r => r.json())
      .then((data: WeaponEntry[]) => setAllWeapons(data))
      .catch(() => {});
    fetch('/api/attachments')
      .then(r => r.json())
      .then((data: AttachmentEntry[]) => setAllAttachments(data))
      .catch(() => {});
  }, []);

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

  // =====================================================================
  // LOGIN SCREEN
  // =====================================================================
  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '320px' }}>
          <div style={{ marginBottom: '32px', textAlign: 'center' }}>
            <div style={{ color: 'var(--text-dim)', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '6px' }}>
              warzone // admin
            </div>
            <div style={{ color: 'var(--text-bright)', fontSize: '20px', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              WZ<span style={{ color: 'var(--accent)' }}>_META</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ color: 'var(--text-dim)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Authentication required
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoFocus
              />
            </div>
            {authError && (
              <div style={{ color: '#ff4455', fontSize: '12px', letterSpacing: '0.04em' }}>
                ✗ {authError}
              </div>
            )}
            <button type="submit" className="btn-primary" style={{ width: '100%' }}>
              ACCESS
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <Link href="/" style={{ color: 'var(--text-dim)', fontSize: '11px', textDecoration: 'none', letterSpacing: '0.04em' }}>
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
    <div style={{ display: 'flex', minHeight: '100vh' }}>

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
          <div style={{ color: 'var(--text-dim)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '4px' }}>
            Admin Panel
          </div>
          <div style={{ color: 'var(--text-bright)', fontSize: '17px', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            WZ<span style={{ color: 'var(--accent)' }}>_META</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ color: 'var(--text-dim)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 12px 8px', opacity: 0.5 }}>
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
        </nav>

        {/* Bottom */}
        <div style={{ padding: '16px 8px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              color: 'var(--text-dim)',
              textDecoration: 'none',
              fontSize: '11px',
              letterSpacing: '0.04em',
              borderRadius: '4px',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ fontSize: '12px' }}>↗</span> Public site
          </a>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-dim)',
              fontSize: '11px',
              letterSpacing: '0.04em',
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
            letterSpacing: '0.04em',
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
                <div style={{ color: 'var(--text-dim)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Loadouts</div>
                <div style={{ color: 'var(--text-bright)', fontSize: '20px', fontWeight: 800, letterSpacing: '0.04em', marginTop: '2px', textTransform: 'uppercase' }}>
                  Weapon List
                </div>
              </div>
              <button className="btn-primary" onClick={startNew}>+ NEW</button>
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
                letterSpacing: '0.04em',
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
                  fontSize: '11px',
                  letterSpacing: '0.08em',
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
                      fontSize: '11px',
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
                      <div style={{ color: 'var(--text-dim)', fontSize: '11px' }}>{l.playstyle}</div>
                    </div>
                    <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>{l.category}</span>
                    <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>{l.updatedAt}</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="btn-ghost"
                        onClick={() => startEdit(l)}
                        style={{ fontSize: '11px', padding: '5px 12px' }}
                      >
                        Edit
                      </button>
                      <button
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
                <div style={{ color: 'var(--text-dim)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Loadouts</div>
                <div style={{ color: 'var(--text-bright)', fontSize: '20px', fontWeight: 800, letterSpacing: '0.04em', marginTop: '2px', textTransform: 'uppercase' }}>
                  {editingId ? 'Edit' : 'New Loadout'}
                </div>
              </div>
              <button className="btn-ghost" onClick={cancelForm}>← Cancel</button>
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
                    <div style={{ color: 'var(--text-dim)', fontSize: '11px', letterSpacing: '0.04em' }}>
                      {form.weaponId} · {form.category}
                    </div>
                  </div>
                </div>
              )}

              {/* Row 1: weapon + category */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Weapon *</label>
                  <div style={{ position: 'relative' }}>
                    <input
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
                              <div style={{ color: 'var(--text-dim)', fontSize: '10px', letterSpacing: '0.04em' }}>
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
                  <label style={labelStyle}>Category</label>
                  <select value={form.category} onChange={e => setField('category', e.target.value)}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Row 2: tier + playstyle */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Tier</label>
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
                  <label style={labelStyle}>Playstyle</label>
                  <select value={form.playstyle} onChange={e => setField('playstyle', e.target.value)}>
                    {PLAYSTYLES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {/* Stats */}
              <div>
                <label style={labelStyle}>Stats (0–100)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {(['damage', 'range', 'mobility', 'control'] as const).map(key => (
                    <div key={key}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-dim)', fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{key}</span>
                        <span style={{ color: 'var(--text-bright)', fontSize: '11px' }}>{form.stats[key]}</span>
                      </div>
                      <input
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
                  <label style={labelStyle}>Attachments ({form.attachments.length}/10)</label>
                  <button type="button" className="btn-ghost" onClick={addAttachment} style={{ padding: '4px 10px', fontSize: '11px' }}>
                    + Add
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {form.attachments.map((att, i) => {
                    const suggestions = getAttSuggestions(i, att.slot);
                    const isOpen = attDropdowns === i && suggestions.length > 0;
                    return (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '160px 1fr auto', gap: '8px', alignItems: 'start' }}>
                        <select
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
                          <input
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
                                  key={si}
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
                                    letterSpacing: '0.06em',
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
                <label style={labelStyle}>Notes / Context</label>
                <textarea
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
        {view === 'tools' && (
          <>
            {/* Page header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
              <div>
                <div style={{ color: 'var(--text-dim)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Tools</div>
                <div style={{ color: 'var(--text-bright)', fontSize: '20px', fontWeight: 800, letterSpacing: '0.04em', marginTop: '2px', textTransform: 'uppercase' }}>
                  Pro Tools
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <a
                  href="/pro-tools"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: '11px',
                    padding: '6px 14px',
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--text-dim)',
                    textDecoration: 'none',
                    letterSpacing: '0.04em',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  ↗ Public page
                </a>
                <a
                  href="/tools-individual"
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: '11px',
                    padding: '6px 14px',
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--text-dim)',
                    textDecoration: 'none',
                    letterSpacing: '0.04em',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  ↗ Pick &amp; Choose
                </a>
              </div>
            </div>

            <div style={{ color: 'var(--text-dim)', fontSize: '11px', letterSpacing: '0.06em', marginBottom: '16px' }}>
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
                    letterSpacing: '0.1em',
                    color: 'var(--accent)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    fontFamily: 'monospace',
                  }}>
                    {tool.tag}
                  </span>
                  <div>
                    <div style={{ color: 'var(--text-bright)', fontWeight: 700, fontSize: '13px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      {tool.name}
                    </div>
                    <div style={{ color: 'var(--text-dim)', fontSize: '11px', marginTop: '2px' }}>{tool.desc}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <a
                      href={`/tools/${tool.id}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontSize: '11px',
                        padding: '5px 12px',
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        color: 'var(--text-dim)',
                        textDecoration: 'none',
                        letterSpacing: '0.04em',
                        display: 'inline-block',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ↗ Page
                    </a>
                    <button
                      className="btn-primary"
                      onClick={() => openToolPreview(tool.id)}
                      disabled={previewLoading === tool.id}
                      style={{ fontSize: '11px', padding: '5px 12px', opacity: previewLoading === tool.id ? 0.6 : 1, whiteSpace: 'nowrap' }}
                    >
                      {previewLoading === tool.id ? '...' : 'Preview'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

      </main>
    </div>
  );
}
