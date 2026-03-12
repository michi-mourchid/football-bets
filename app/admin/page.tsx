import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminHeader } from '@/components/admin/admin-header';
import { SessionsList } from '@/components/admin/sessions-list';
import type { Session, Entry } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  const { data: sessions } = await supabase
    .from('sessions')
    .select('*')
    .order('created_at', { ascending: false });

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

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader user={user} />
      <main className="container mx-auto px-4 py-8">
        <SessionsList 
          sessions={(sessions as Session[]) || []} 
          entryCounts={entryCounts}
        />
      </main>
    </div>
  );
}
