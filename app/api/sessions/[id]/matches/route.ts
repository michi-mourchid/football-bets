import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { AddMatchesRequest, SessionMatch } from '@/lib/types';

// GET /api/sessions/[id]/matches - List matches for a session
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('session_matches')
    .select('*')
    .eq('session_id', id)
    .order('kickoff_utc', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data as SessionMatch[]);
}

// POST /api/sessions/[id]/matches - Add matches to a session (admin only)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const body: AddMatchesRequest = await request.json();

  // Check session exists and is in DRAFT state
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('state')
    .eq('id', id)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  if (session.state !== 'DRAFT') {
    return NextResponse.json(
      { error: 'Cannot add matches to a session that is not in DRAFT state' },
      { status: 400 }
    );
  }

  if (!body.matches || !Array.isArray(body.matches) || body.matches.length === 0) {
    return NextResponse.json({ error: 'matches array is required' }, { status: 400 });
  }

  const matchesToInsert = body.matches.map((match) => ({
    session_id: id,
    event_id: match.event_id,
    league_id: match.league_id,
    kickoff_utc: match.kickoff_utc,
    home_name: match.home_name,
    away_name: match.away_name,
    competition_name: match.competition_name || null,
    page_url: match.page_url || null,
  }));

  const { data, error } = await supabase
    .from('session_matches')
    .insert(matchesToInsert)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data as SessionMatch[], { status: 201 });
}

// DELETE /api/sessions/[id]/matches - Remove all matches from a session (admin only)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Check session exists and is in DRAFT state
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('state')
    .eq('id', id)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  if (session.state !== 'DRAFT') {
    return NextResponse.json(
      { error: 'Cannot remove matches from a session that is not in DRAFT state' },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from('session_matches')
    .delete()
    .eq('session_id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
