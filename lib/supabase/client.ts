'use client';

import { createBrowserClient } from '@supabase/ssr';
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase/config';

export function createSupabaseBrowserClient() {
  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabasePublishableKey();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase public configuration is missing.');
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
}
