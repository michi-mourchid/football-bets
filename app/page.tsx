import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/header';
import { SessionCard } from '@/components/session-card';
import { Card, CardContent } from '@/components/ui/card';
import type { Session, Entry } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = await createClient();

  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('*')
    .order('session_date', { ascending: false });

  // Get entry counts for all sessions
  const { data: entries } = await supabase
    .from('entries')
    .select('session_id');

  const entryCounts = new Map<string, number>();
  if (entries) {
    for (const entry of entries as Pick<Entry, 'session_id'>[]) {
      const count = entryCounts.get(entry.session_id) || 0;
      entryCounts.set(entry.session_id, count + 1);
    }
  }

  const openSessions = (sessions as Session[] || []).filter(s => s.state === 'OPEN');
  const pastSessions = (sessions as Session[] || []).filter(s => s.state !== 'OPEN' && s.state !== 'DRAFT');

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <h1 className="mb-3 text-4xl font-bold tracking-tight text-foreground">
            Football Score Predictor
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground text-pretty">
            Predict match scores, compete with friends, and win the pot. 
            3 points for exact score, 1 point for correct result.
          </p>
        </div>

        {/* Open Sessions */}
        {openSessions.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-4 text-2xl font-semibold text-foreground">Open Sessions</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {openSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  entryCount={entryCounts.get(session.id) || 0}
                />
              ))}
            </div>
          </section>
        )}

        {/* Past Sessions */}
        {pastSessions.length > 0 && (
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-foreground">Past Sessions</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pastSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  entryCount={entryCounts.get(session.id) || 0}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {(!sessions || sessions.length === 0) && (
          <Card className="mx-auto max-w-md">
            <CardContent className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <svg
                  className="h-6 w-6 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h3 className="mb-1 font-semibold text-foreground">No Sessions Yet</h3>
              <p className="text-sm text-muted-foreground">
                Check back later or ask an admin to create a session.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
