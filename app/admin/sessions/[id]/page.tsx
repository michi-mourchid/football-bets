import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { AdminHeader } from '@/components/admin/admin-header';
import { SessionEditor } from '@/components/admin/session-editor';
import type { Session, SessionMatch } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface SessionEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function SessionEditPage({ params }: SessionEditPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  const { data: session, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !session) {
    notFound();
  }

  const { data: matches } = await supabase
    .from('session_matches')
    .select('*')
    .eq('session_id', id)
    .order('kickoff_utc', { ascending: true });

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader user={user} />
      <main className="container mx-auto px-4 py-8">
        <SessionEditor 
          session={session as Session} 
          existingMatches={(matches as SessionMatch[]) || []}
        />
      </main>
    </div>
  );
}
