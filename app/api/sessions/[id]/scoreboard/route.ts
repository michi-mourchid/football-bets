import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { calculatePoints, isCorrectScore, isCorrectResult } from '@/lib/scoring';
import type { Entry, Prediction, SessionMatch, MatchCache, PlayerScore, PredictionWithResult } from '@/lib/types';

// GET /api/sessions/[id]/scoreboard - Get scoreboard with calculated points
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Get session
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  // Get session matches
  const { data: matches, error: matchesError } = await supabase
    .from('session_matches')
    .select('*')
    .eq('session_id', id)
    .order('kickoff_utc', { ascending: true });

  if (matchesError) {
    return NextResponse.json({ error: matchesError.message }, { status: 500 });
  }

  // Get entries
  const { data: entries, error: entriesError } = await supabase
    .from('entries')
    .select('*')
    .eq('session_id', id);

  if (entriesError) {
    return NextResponse.json({ error: entriesError.message }, { status: 500 });
  }

  // Get predictions
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

  // Get match results from cache
  const eventIds = matches.map((m: SessionMatch) => m.event_id);
  let matchResults: MatchCache[] = [];
  
  if (eventIds.length > 0) {
    const { data: cacheData } = await supabase
      .from('match_cache')
      .select('*')
      .in('event_id', eventIds);
    
    matchResults = cacheData || [];
  }

  // Build result lookup
  const resultLookup = new Map<string, MatchCache>();
  for (const result of matchResults) {
    resultLookup.set(result.event_id, result);
  }

  // Build match lookup
  const matchLookup = new Map<string, SessionMatch>();
  for (const match of matches) {
    matchLookup.set(match.event_id, match);
  }

  // Calculate scores for each player
  const playerScores: PlayerScore[] = entries.map((entry: Entry) => {
    const playerPredictions = predictions.filter((p: Prediction) => p.entry_id === entry.id);
    
    let totalPoints = 0;
    let correctResults = 0;
    let correctScores = 0;
    
    const predictionsWithResults: PredictionWithResult[] = playerPredictions.map((pred: Prediction) => {
      const match = matchLookup.get(pred.event_id);
      const result = resultLookup.get(pred.event_id);
      
      const actualHome = result?.home_score ?? null;
      const actualAway = result?.away_score ?? null;
      const matchFinished = result?.finished ?? false;
      
      const points = calculatePoints(
        pred.pred_home_goals,
        pred.pred_away_goals,
        actualHome,
        actualAway
      );
      
      if (matchFinished) {
        totalPoints += points;
        if (isCorrectScore(pred.pred_home_goals, pred.pred_away_goals, actualHome, actualAway)) {
          correctScores++;
        } else if (isCorrectResult(pred.pred_home_goals, pred.pred_away_goals, actualHome, actualAway)) {
          correctResults++;
        }
      }
      
      return {
        ...pred,
        home_name: match?.home_name || 'Unknown',
        away_name: match?.away_name || 'Unknown',
        actual_home_goals: actualHome,
        actual_away_goals: actualAway,
        points,
        match_finished: matchFinished,
      };
    });

    return {
      player_name: entry.player_name,
      entry_id: entry.id,
      total_points: totalPoints,
      correct_results: correctResults,
      correct_scores: correctScores,
      predictions: predictionsWithResults,
    };
  });

  // Sort by total points descending
  playerScores.sort((a, b) => b.total_points - a.total_points);

  // Build matches with results for display
  const matchesWithResults = matches.map((match: SessionMatch) => {
    const result = resultLookup.get(match.event_id);
    return {
      ...match,
      home_score: result?.home_score ?? null,
      away_score: result?.away_score ?? null,
      finished: result?.finished ?? false,
      started: result?.started ?? false,
      score_str: result?.score_str ?? null,
    };
  });

  return NextResponse.json({
    session,
    matches: matchesWithResults,
    players: playerScores,
    total_pot: entries.length * (session.stake_per_player || 5),
  });
}
