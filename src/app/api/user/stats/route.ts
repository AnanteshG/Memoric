// src/app/api/user/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient, getUserId } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function computeStats(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const [{ count: contentCount }, { count: chatCount }] = await Promise.all([
    supabase.from('content').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('chats').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ]);

  const totalContent = contentCount ?? 0;
  const aiQueries = chatCount ?? 0;
  // Rough heuristic: ~7 min saved per saved item, ~3.5 min per AI query.
  const minutes = totalContent * 7 + aiQueries * 3.5;

  return {
    totalContent,
    aiQueries,
    timeSavedHours: (minutes / 60).toFixed(1),
    favorites: 0,
  };
}

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const supabase = await createClient();
    const data = await computeStats(supabase, userId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Get user stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch user stats' }, { status: 500 });
  }
}

// Kept for API compatibility — stats are derived on demand, so this just
// returns the freshly computed values.
export async function POST(_request: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const supabase = await createClient();
    const data = await computeStats(supabase, userId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Update user stats error:', error);
    return NextResponse.json({ error: 'Failed to update user stats' }, { status: 500 });
  }
}
