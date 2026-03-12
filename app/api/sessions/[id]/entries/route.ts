import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { SubmitPredictionsRequest, Entry, Prediction } from '@/lib/types';

// GET /api/sessions/[id]/entries - List all entries for a session
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: entries, error: entriesError } = await supabase
    .from('entries')
    .select('*')
    .eq('session_id', id)
    .order('created_at', { ascending: true });

  if (entriesError) {
    return NextResponse.json({ error: entriesError.message }, { status: 500 });
  }

  // Get predictions for all entries
  const entryIds = entries.map((e: Entry) => e.id);
  
  let predictions: Prediction[] = [];
  if (entryIds.length > 0) {
    const { data: predData, error: predError } = await supabase
      .from('predictions')
      .select('*')
      .in('entry_id', entryIds);

    if (predError) {
      return NextResponse.json({ error: predError.message }, { status: 500 });
    }
    predictions = predData || [];
  }

  // Combine entries with their predictions
  const entriesWithPredictions = entries.map((entry: Entry) => ({
    ...entry,
    predictions: predictions.filter((p: Prediction) => p.entry_id === entry.id),
  }));

  return NextResponse.json(entriesWithPredictions);
}

// POST /api/sessions/[id]/entries - Submit predictions (creates entry + predictions)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const body: SubmitPredictionsRequest = await request.json();

  // Validate required fields
  if (!body.player_name || !body.predictions || !Array.isArray(body.predictions)) {
    return NextResponse.json(
      { error: 'player_name and predictions array are required' },
      { status: 400 }
    );
  }

  // Check session exists and is OPEN
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('state')
    .eq('id', id)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  if (session.state !== 'OPEN') {
    return NextResponse.json(
      { error: 'Session is not open for predictions' },
      { status: 400 }
    );
  }

  // Check if player already has an entry
  const { data: existingEntry } = await supabase
    .from('entries')
    .select('id')
    .eq('session_id', id)
    .eq('player_name', body.player_name)
    .single();

  if (existingEntry) {
    return NextResponse.json(
      { error: 'Player has already submitted predictions for this session' },
      { status: 400 }
    );
  }

  // Get session matches to validate predictions
  const { data: matches, error: matchesError } = await supabase
    .from('session_matches')
    .select('event_id')
    .eq('session_id', id);

  if (matchesError) {
    return NextResponse.json({ error: matchesError.message }, { status: 500 });
  }

  const validEventIds = new Set(matches?.map((m) => m.event_id) || []);

  // Validate all predictions are for valid matches
  for (const pred of body.predictions) {
    if (!validEventIds.has(pred.event_id)) {
      return NextResponse.json(
        { error: `Invalid event_id: ${pred.event_id}` },
        { status: 400 }
      );
    }
    if (
      typeof pred.pred_home_goals !== 'number' ||
      typeof pred.pred_away_goals !== 'number' ||
      pred.pred_home_goals < 0 ||
      pred.pred_away_goals < 0
    ) {
      return NextResponse.json(
        { error: 'Invalid prediction values' },
        { status: 400 }
      );
    }
  }

  // Create entry
  const { data: entry, error: entryError } = await supabase
    .from('entries')
    .insert({
      session_id: id,
      player_name: body.player_name,
    })
    .select()
    .single();

  if (entryError) {
    return NextResponse.json({ error: entryError.message }, { status: 500 });
  }

  // Create predictions
  const predictionsToInsert = body.predictions.map((pred) => ({
    entry_id: entry.id,
    event_id: pred.event_id,
    pred_home_goals: pred.pred_home_goals,
    pred_away_goals: pred.pred_away_goals,
  }));

  const { error: predInsertError } = await supabase
    .from('predictions')
    .insert(predictionsToInsert);

  if (predInsertError) {
    // Rollback entry if predictions fail
    await supabase.from('entries').delete().eq('id', entry.id);
    return NextResponse.json({ error: predInsertError.message }, { status: 500 });
  }

  return NextResponse.json(
    { ...entry, predictions: predictionsToInsert },
    { status: 201 }
  );
}
