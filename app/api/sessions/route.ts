import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { CreateSessionRequest, Session } from '@/lib/types';

// GET /api/sessions - List all sessions
export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .order('session_date', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data as Session[]);
}

// POST /api/sessions - Create a new session (admin only)
export async function POST(request: Request) {
  const supabase = await createClient();
  const body: CreateSessionRequest = await request.json();

  // Validate required fields
  if (!body.title || !body.session_date) {
    return NextResponse.json(
      { error: 'title and session_date are required' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      title: body.title,
      session_date: body.session_date,
      stake_per_player: body.stake_per_player || 5.0,
      state: 'DRAFT',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data as Session, { status: 201 });
}
