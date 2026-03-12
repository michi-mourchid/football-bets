import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Header } from '@/components/header';
import { PredictionForm } from '@/components/prediction-form';
import type { Session, SessionMatch } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface PlayPageProps {
  params: Promise<{ id: string }>;
}

export default async function PlayPage({ params }: PlayPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (sessionError || !session) {
    notFound();
  }

  const typedSession = session as Session;

  if (typedSession.state !== 'OPEN') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-md text-center">
            <h1 className="mb-2 text-2xl font-bold text-foreground">Session Not Open</h1>
            <p className="text-muted-foreground">
              This session is currently {typedSession.state.toLowerCase()} and not accepting predictions.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const { data: matches, error: matchesError } = await supabase
    .from('session_matches')
    .select('*')
    .eq('session_id', id)
    .order('kickoff_utc', { ascending: true });

  if (matchesError || !matches || matches.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-md text-center">
            <h1 className="mb-2 text-2xl font-bold text-foreground">No Matches</h1>
            <p className="text-muted-foreground">
              This session has no matches configured yet.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-foreground">{typedSession.title}</h1>
            <p className="text-muted-foreground">
              Enter your predictions for all {matches.length} matches
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Stake: ${typedSession.stake_per_player.toFixed(2)} per player
            </p>
          </div>

          <PredictionForm
            sessionId={id}
            matches={matches as SessionMatch[]}
          />
        </div>
      </main>
    </div>
  );
}
