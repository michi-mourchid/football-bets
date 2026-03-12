import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function SessionNotFound() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto flex flex-col items-center justify-center px-4 py-24">
        <h1 className="mb-2 text-4xl font-bold text-foreground">Session Not Found</h1>
        <p className="mb-8 text-center text-muted-foreground">
          This session doesn't exist or has been deleted.
        </p>
        <Link href="/admin">
          <Button>Back to Admin</Button>
        </Link>
      </main>
    </div>
  );
}
