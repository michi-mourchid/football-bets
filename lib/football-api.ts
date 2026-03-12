import type { FlashscoreMatch } from './types';

const FLASHSCORE_API_BASE = 'https://free-api-live-football-data.p.rapidapi.com';
const FOOTBALL_API_BASE = 'https://free-api-live-football-data.p.rapidapi.com'

// Supported league IDs for top leagues
export const SUPPORTED_LEAGUES = {
  PREMIER_LEAGUE: 47,
  CHAMPIONS_LEAGUE: 42,
  LA_LIGA: 87
} as const;

export type LeagueId = (typeof SUPPORTED_LEAGUES)[keyof typeof SUPPORTED_LEAGUES];

type PopularLeaguesResponse = {
  status: 'success' | string;
  response: {
    popular: Array<{
      id: number;
      name: string;
      localizedName?: string;
      ccode?: string;
      logo?: string;
    }>;
  };
};

interface ApiMatchesByLeagueResponse {
  status: 'success' | string;
  response: {
    matches: Array<{
      id: string; // eventid
      pageUrl?: string;
      home?: { id?: string | number; name: string; score?: number };
      away?: { id?: string | number; name: string; score?: number };
      status?: {
        utcTime?: string; // ISO in UTC
        finished?: boolean;
        started?: boolean;
        cancelled?: boolean;
        awarded?: boolean;
        scoreStr?: string;
        reason?: {
          short?: string; // e.g. FT
          long?: string;
        };
      };
      tournament?: { stage?: string };
    }>;
  };
}

interface ApiMatchScoreResponse {
  status: 'success' | string;
  response: {
    scores: Array<{
      id: number | string;
      name: string;
      score: number;
      imageUrl?: string;
    }>;
  };
}

function getApiHeaders(): HeadersInit {
  const apiKey = 'c979fab2c3msh398461627fec9d9p1f19e5jsn248a1b8d3359';
  if (!apiKey) {
    throw new Error('RAPIDAPI_KEY environment variable is not set');
  }
  return {
    'x-rapidapi-key': apiKey,
    'x-rapidapi-host': 'free-api-live-football-data.p.rapidapi.com',
  };
}

/**
 * Utility: check if an ISO UTC time belongs to date YYYY-MM-DD in UTC.
 * (If you want America/Montreal filtering, do it in UI or add a TZ lib.)
 */
function isSameUtcDate(utcIso: string | undefined, dateYYYYMMDD: string): boolean {
  if (!utcIso) return false;
  const d = new Date(utcIso);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}` === dateYYYYMMDD;
}

/**
 * Optional: fetch popular leagues to populate UI dynamically.
 */
export async function fetchPopularLeagues() {
  const url = `${FOOTBALL_API_BASE}/football-popular-leagues`;

  const response = await fetch(url, {
    headers: getApiHeaders(),
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`Football API error: ${response.status}`);
  }

  const data = (await response.json()) as PopularLeaguesResponse;
  return data.response?.popular ?? [];
}

/**
 * Fetch all matches for a league (FotMob league id).
 */
export async function fetchAllMatchesByLeague(leagueId: number) {
  const url = new URL(`${FOOTBALL_API_BASE}/football-get-all-matches-by-league`);
  url.searchParams.set('leagueid', String(42));

  const response = await fetch(url.toString(), {
    headers: getApiHeaders(),
    next: { revalidate: 300 }, // 5 min cache
  });

  if (!response.ok) {
    throw new Error(`Football API error: ${response.status}`);
  }

  const data = (await response.json()) as ApiMatchesByLeagueResponse;
  return data.response?.matches ?? [];
}

/**
 * Your original function name kept:
 * fetch matches by date (YYYY-MM-DD), by fetching league lists and filtering.
 */
export async function fetchMatchesByDate(
  date: string, // YYYY-MM-DD
  leagueIds?: number[]
): Promise<FlashscoreMatch[]> {
  const leaguesToFetch = leagueIds?.length
    ? leagueIds
    : Object.values(SUPPORTED_LEAGUES);

  const all = await Promise.all(leaguesToFetch.map((lid) => fetchAllMatchesByLeague(lid)));

  // flatten + filter by UTC date
  const matches = all
    .flat()
    .filter((m) => isSameUtcDate(m.status?.utcTime, date));

  return matches.map((m) => ({
    id: m.id,
    home_name: m.home?.name ?? 'Home',
    away_name: m.away?.name ?? 'Away',
    home_score: typeof m.home?.score === 'number' ? m.home.score : undefined,
    away_score: typeof m.away?.score === 'number' ? m.away.score : undefined,
    status: m.status?.reason?.short ?? (m.status?.started ? 'LIVE' : 'SCHEDULED'),
    kickoff_utc: m.status?.utcTime ?? new Date().toISOString(),
    league_id: leagueIds?.[0] ?? 0, // optional: you can enrich by passing leagueId in mapping (see note below)
    competition_name: '', // optional: not provided directly here
    finished: Boolean(m.status?.finished),
    started: Boolean(m.status?.started),
  }));
}

/**
 * Fetch score for one match by event ID (fallback or lightweight score check).
 * Note: This endpoint only gives scores, not finished/started status.
 */
export async function fetchMatchScoreById(eventId: string): Promise<{ home?: number; away?: number } | null> {
  const url = new URL(`${FOOTBALL_API_BASE}/football-get-match-score`);
  url.searchParams.set('eventid', eventId);

  const response = await fetch(url.toString(), {
    headers: getApiHeaders(),
    next: { revalidate: 60 }, // 1 min cache
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Football API error: ${response.status}`);
  }

  const data = (await response.json()) as ApiMatchScoreResponse;
  const scores = data.response?.scores;

  if (!scores || scores.length < 2) return null;

  // Usually [home, away]
  return {
    home: scores[0]?.score,
    away: scores[1]?.score,
  };
}

/**
 * Fetch a match "full-ish" by id:
 * Since the API doesn't provide a direct "match details" endpoint besides score,
 * the reliable approach is: find it inside its league listing.
 *
 * This function expects leagueId as well (best practice).
 */
export async function fetchMatchById(eventId: string, leagueId: number): Promise<FlashscoreMatch | null> {
  const matches = await fetchAllMatchesByLeague(42);
  const m = matches.find((x) => x.id === eventId);
  if (!m) return null;

  return {
    id: m.id,
    home_name: m.home?.name ?? 'Home',
    away_name: m.away?.name ?? 'Away',
    home_score: typeof m.home?.score === 'number' ? m.home.score : undefined,
    away_score: typeof m.away?.score === 'number' ? m.away.score : undefined,
    status: m.status?.reason?.short ?? (m.status?.started ? 'LIVE' : 'SCHEDULED'),
    kickoff_utc: m.status?.utcTime ?? new Date().toISOString(),
    league_id: leagueId,
    competition_name: '',
    finished: Boolean(m.status?.finished),
    started: Boolean(m.status?.started),
  };
}

// For demo/testing without API key - generates mock matches
export function generateMockMatches(date: string): FlashscoreMatch[] {
  const teams = [
    { home: 'Manchester United', away: 'Liverpool', league: 47, comp: 'Premier League' },
    { home: 'Arsenal', away: 'Chelsea', league: 47, comp: 'Premier League' },
    { home: 'Real Madrid', away: 'Barcelona', league: 87, comp: 'LaLiga' },
  ];

  const baseDate = new Date(date);

  return teams.map((team, index) => {
    const kickoff = new Date(baseDate);
    kickoff.setHours(14 + index, 0, 0, 0);

    return {
      id: `mock_${date}_${index}`,
      home_name: team.home,
      away_name: team.away,
      status: 'SCHEDULED',
      kickoff_utc: kickoff.toISOString(),
      league_id: team.league,
      competition_name: team.comp,
      finished: false,
      started: false,
    };
  });
}
