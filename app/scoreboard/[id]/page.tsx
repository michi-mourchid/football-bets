import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Header } from '@/components/header';
import { ScoreboardView } from '@/components/scoreboard-view';
import type { Session } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface ScoreboardPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ submitted?: string }>;
}

export default async function ScoreboardPage({ params, searchParams }: ScoreboardPageProps) {
  const { id } = await params;
  const { submitted } = await searchParams;
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {submitted && (
          <div className="mx-auto mb-6 max-w-2xl rounded-lg bg-primary/10 p-4 text-center text-primary">
            Your predictions have been submitted successfully!
          </div>
        )}
        
        <ScoreboardView session={typedSession} sessionId={id} />
      </main>
    </div>
  );
}
