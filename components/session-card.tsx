'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Session } from '@/lib/types';
import { Calendar, Users, Trophy } from 'lucide-react';

interface SessionCardProps {
  session: Session;
  entryCount?: number;
}

function getStateBadgeVariant(state: Session['state']): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (state) {
    case 'DRAFT':
      return 'secondary';
    case 'OPEN':
      return 'default';
    case 'LOCKED':
      return 'outline';
    case 'COMPLETED':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function getStateLabel(state: Session['state']): string {
  switch (state) {
    case 'DRAFT':
      return 'Draft';
    case 'OPEN':
      return 'Open for Predictions';
    case 'LOCKED':
      return 'Locked';
    case 'COMPLETED':
      return 'Completed';
    default:
      return state;
  }
}

export function SessionCard({ session, entryCount = 0 }: SessionCardProps) {
  const formattedDate = new Date(session.session_date).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const potAmount = entryCount * session.stake_per_player;

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg leading-snug text-balance">{session.title}</CardTitle>
          <Badge variant={getStateBadgeVariant(session.state)}>
            {getStateLabel(session.state)}
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          {formattedDate}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {entryCount} players
            </span>
            <span className="flex items-center gap-1">
              <Trophy className="h-4 w-4" />
              ${potAmount.toFixed(2)} pot
            </span>
          </div>
          <div className="flex gap-2">
            {session.state === 'OPEN' && (
              <Link href={`/play/${session.id}`}>
                <Button size="sm">Play</Button>
              </Link>
            )}
            {(session.state === 'LOCKED' || session.state === 'COMPLETED') && (
              <Link href={`/scoreboard/${session.id}`}>
                <Button size="sm" variant="outline">
                  Scoreboard
                </Button>
              </Link>
            )}
            {session.state === 'OPEN' && (
              <Link href={`/scoreboard/${session.id}`}>
                <Button size="sm" variant="ghost">
                  View
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
