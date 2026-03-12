import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { Session } from '@/lib/types';

// GET /api/sessions/[id] - Get session details with matches
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (sessionError) {
    if (sessionError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }

  const { data: matches, error: matchesError } = await supabase
    .from('session_matches')
    .select('*')
    .eq('session_id', id)
    .order('kickoff_utc', { ascending: true });

  if (matchesError) {
    return NextResponse.json({ error: matchesError.message }, { status: 500 });
  }

  const { data: entries, error: entriesError } = await supabase
    .from('entries')
    .select('*')
    .eq('session_id', id);

  if (entriesError) {
    return NextResponse.json({ error: entriesError.message }, { status: 500 });
  }

  return NextResponse.json({
    ...session,
    matches: matches || [],
    entries: entries || [],
  });
}

// PATCH /api/sessions/[id] - Update session (admin only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  // Allowed fields to update
  const allowedFields = ['title', 'session_date', 'stake_per_player', 'state'];
  const updates: Partial<Session> = {};

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      (updates as Record<string, unknown>)[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('sessions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data as Session);
}

// DELETE /api/sessions/[id] - Delete session (admin only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { error } = await supabase.from('sessions').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
