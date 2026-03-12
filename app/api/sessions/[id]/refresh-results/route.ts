import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { fetchMatchById, generateMockMatches } from '@/lib/football-api';
import type { SessionMatch } from '@/lib/types';

// POST /api/sessions/[id]/refresh-results - Refresh match results from API
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  // Get session matches
  const { data: matches, error: matchesError } = await supabase
    .from('session_matches')
    .select('*')
    .eq('session_id', id);

  if (matchesError) {
    return NextResponse.json({ error: matchesError.message }, { status: 500 });
  }

  if (!matches || matches.length === 0) {
    return NextResponse.json({ error: 'No matches found for session' }, { status: 404 });
  }

  const hasApiKey = 'c979fab2c3msh398461627fec9d9p1f19e5jsn248a1b8d3359';
  const updatedMatches: Array<{
    event_id: string;
    home_score: number | null;
    away_score: number | null;
    finished: boolean;
    started: boolean;
  }> = [];

  for (const match of matches as SessionMatch[]) {
    try {
      if (hasApiKey) {
        // Fetch real data
        const result = await fetchMatchById(match.event_id);
        if (result) {
          const cacheData = {
            event_id: match.event_id,
            league_id: match.league_id,
            finished: result.finished,
            started: result.started,
            home_score: result.home_score ?? null,
            away_score: result.away_score ?? null,
            score_str: result.home_score !== undefined && result.away_score !== undefined
              ? `${result.home_score}-${result.away_score}`
              : null,
            kickoff_utc: result.kickoff_utc,
            fetched_at: new Date().toISOString(),
          };

          await supabase
            .from('match_cache')
            .upsert(cacheData, { onConflict: 'event_id' });

          updatedMatches.push({
            event_id: match.event_id,
            home_score: result.home_score ?? null,
            away_score: result.away_score ?? null,
            finished: result.finished,
            started: result.started,
          });
        }
      } else {
        // Generate mock results for demo
        const mockFinished = Math.random() > 0.3; // 70% chance of being finished
        const mockStarted = mockFinished || Math.random() > 0.5;
        const homeScore = mockFinished ? Math.floor(Math.random() * 4) : null;
        const awayScore = mockFinished ? Math.floor(Math.random() * 4) : null;

        const cacheData = {
          event_id: match.event_id,
          league_id: match.league_id,
          finished: mockFinished,
          started: mockStarted,
          home_score: homeScore,
          away_score: awayScore,
          score_str: homeScore !== null && awayScore !== null
            ? `${homeScore}-${awayScore}`
            : null,
          kickoff_utc: match.kickoff_utc,
          fetched_at: new Date().toISOString(),
        };

        await supabase
          .from('match_cache')
          .upsert(cacheData, { onConflict: 'event_id' });

        updatedMatches.push({
          event_id: match.event_id,
          home_score: homeScore,
          away_score: awayScore,
          finished: mockFinished,
          started: mockStarted,
        });
      }
    } catch (error) {
      console.error(`Error fetching result for ${match.event_id}:`, error);
    }
  }

  return NextResponse.json({
    success: true,
    updated: updatedMatches.length,
    matches: updatedMatches,
    source: hasApiKey ? 'api' : 'mock',
  });
}
