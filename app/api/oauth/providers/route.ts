import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    google: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    ),
    battlenet: Boolean(process.env.BATTLE_NET_CLIENT_ID && process.env.BATTLE_NET_CLIENT_SECRET),
    apple: false,
  });
}
