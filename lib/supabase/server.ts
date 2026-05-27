import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { NextRequest, NextResponse } from 'next/server';
import { getSupabasePublishableKey, getSupabaseUrl, hasSupabaseConfig } from '@/lib/supabase/config';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabasePublishableKey();

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot set cookies; Proxy/API routes can.
        }
      },
    },
  });
}

export function createSupabaseProxyClient(request: NextRequest, response: NextResponse) {
  if (!hasSupabaseConfig()) {
    return null;
  }

  return createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });
}
