import { NextResponse } from 'next/server';
import { generateMockMatches } from '@/lib/football-api';

// GET /api/football/matches?date=YYYY-MM-DD
// Returns available matches for a given date (uses mock data if no API key)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  if (!date) {
    return NextResponse.json({ error: 'date parameter is required' }, { status: 400 });
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: 'date must be in YYYY-MM-DD format' },
      { status: 400 }
    );
  }

  try {
    // Check if we have API key
    const hasApiKey = "c979fab2c3msh398461627fec9d9p1f19e5jsn248a1b8d3359";

    if (hasApiKey) {
      // Use real API
      const { fetchMatchesByDate } = await import('@/lib/football-api');
      const matches = await fetchMatchesByDate(date);
      return NextResponse.json({ matches, source: 'api' });
    } else {
      // Use mock data
      const matches = generateMockMatches(date);
      return NextResponse.json({ matches, source: 'mock' });
    }
  } catch (error) {
    console.error('Error fetching matches:', error);
    // Fallback to mock data on error
    const matches = generateMockMatches(date);
    return NextResponse.json({ matches, source: 'mock', error: 'API error, using mock data' });
  }
}
