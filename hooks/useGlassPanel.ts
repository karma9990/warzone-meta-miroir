'use client';

import { useEffect, useId, useRef } from 'react';
import { registerPanel, unregisterPanel } from '@/lib/glassStore';

export function useGlassPanel(borderRadius = 22) {
  const ref = useRef<HTMLElement>(null);
  const id = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    registerPanel(id, el, borderRadius);
    return () => unregisterPanel(id);
  }, [id, borderRadius]);

  return ref;
}
