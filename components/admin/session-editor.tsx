'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import type { Session, SessionMatch, FlashscoreMatch } from '@/lib/types';
import { ArrowLeft, Plus, Trash2, Loader2, Calendar, Search } from 'lucide-react';
import Link from 'next/link';

interface SessionEditorProps {
  session: Session;
  existingMatches: SessionMatch[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function SessionEditor({ session, existingMatches }: SessionEditorProps) {
  const router = useRouter();
  const [matches, setMatches] = useState<SessionMatch[]>(existingMatches);
  const [searchDate, setSearchDate] = useState(session.session_date);
  const [selectedMatches, setSelectedMatches] = useState<Set<string>>(new Set());
  const [isAddingMatches, setIsAddingMatches] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { data: availableMatches, isLoading: isLoadingMatches } = useSWR<{
    matches: FlashscoreMatch[];
    source: string;
  }>(
    searchDate ? `/api/football/matches?date=${searchDate}` : null,
    fetcher
  );

  const existingEventIds = new Set(matches.map(m => m.event_id));

  const handleToggleMatch = (match: FlashscoreMatch) => {
    const newSelected = new Set(selectedMatches);
    if (newSelected.has(match.id)) {
      newSelected.delete(match.id);
    } else {
      newSelected.add(match.id);
    }
    setSelectedMatches(newSelected);
  };

  const handleAddSelectedMatches = async () => {
    if (selectedMatches.size === 0 || !availableMatches) return;

    setIsAddingMatches(true);
    try {
      const matchesToAdd = availableMatches.matches
        .filter(m => selectedMatches.has(m.id))
        .map(m => ({
          event_id: m.id,
          league_id: m.league_id,
          kickoff_utc: m.kickoff_utc,
          home_name: m.home_name,
          away_name: m.away_name,
          competition_name: m.competition_name,
        }));

      const response = await fetch(`/api/sessions/${session.id}/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matches: matchesToAdd }),
      });

      if (!response.ok) {
        throw new Error('Failed to add matches');
      }

      const newMatches = await response.json();
      setMatches([...matches, ...newMatches]);
      setSelectedMatches(new Set());
    } catch (error) {
      console.error('Error adding matches:', error);
    } finally {
      setIsAddingMatches(false);
    }
  };

  const handleRemoveMatch = async (matchId: string) => {
    setIsDeleting(matchId);
    try {
      // For now, we'll remove from local state
      // In production, you'd have an API endpoint to remove individual matches
      setMatches(matches.filter(m => m.id !== matchId));
    } finally {
      setIsDeleting(null);
    }
  };

  const handleStateChange = async (newState: Session['state']) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: newState }),
      });

      if (!response.ok) {
        throw new Error('Failed to update session');
      }

      router.refresh();
    } catch (error) {
      console.error('Error updating session:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const formatKickoff = (kickoffUtc: string) => {
    const date = new Date(kickoffUtc);
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const canEditMatches = session.state === 'DRAFT';

  return (
    <div className="mx-auto max-w-4xl">
      {/* Back Button */}
      <div className="mb-6">
        <Link href="/admin">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sessions
          </Button>
        </Link>
      </div>

      {/* Session Info */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>{session.title}</CardTitle>
              <CardDescription>
                {new Date(session.session_date).toLocaleDateString('en-GB', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </CardDescription>
            </div>
            <Badge variant={session.state === 'DRAFT' ? 'secondary' : session.state === 'OPEN' ? 'default' : 'outline'}>
              {session.state}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {session.state === 'DRAFT' && matches.length > 0 && (
              <Button onClick={() => handleStateChange('OPEN')} disabled={isSaving}>
                Open for Predictions
              </Button>
            )}
            {session.state === 'OPEN' && (
              <Button variant="outline" onClick={() => handleStateChange('LOCKED')} disabled={isSaving}>
                Lock Session
              </Button>
            )}
            {session.state === 'LOCKED' && (
              <Button variant="outline" onClick={() => handleStateChange('COMPLETED')} disabled={isSaving}>
                Mark Completed
              </Button>
            )}
            <Link href={`/scoreboard/${session.id}`}>
              <Button variant="outline">View Scoreboard</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Current Matches */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Selected Matches ({matches.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {matches.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">
              No matches added yet. Search for matches below to add them.
            </p>
          ) : (
            <div className="space-y-2">
              {matches.map((match) => (
                <div
                  key={match.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div>
                    <div className="text-xs text-muted-foreground">
                      {match.competition_name} - {formatKickoff(match.kickoff_utc)}
                    </div>
                    <div className="font-medium">
                      {match.home_name} vs {match.away_name}
                    </div>
                  </div>
                  {canEditMatches && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveMatch(match.id)}
                      disabled={isDeleting === match.id}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Matches */}
      {canEditMatches && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Find Matches
            </CardTitle>
            <CardDescription>
              Search for matches by date to add to this session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-end gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="searchDate">Match Date</Label>
                <Input
                  id="searchDate"
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                />
              </div>
              {selectedMatches.size > 0 && (
                <Button onClick={handleAddSelectedMatches} disabled={isAddingMatches}>
                  {isAddingMatches ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add {selectedMatches.size} Match{selectedMatches.size > 1 ? 'es' : ''}
                    </>
                  )}
                </Button>
              )}
            </div>

            {isLoadingMatches ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : availableMatches?.matches && availableMatches.matches.length > 0 ? (
              <div className="space-y-2">
                {availableMatches.source === 'mock' && (
                  <p className="mb-4 rounded-lg bg-muted p-2 text-center text-sm text-muted-foreground">
                    Using demo data. Add RAPIDAPI_KEY for real matches.
                  </p>
                )}
                {availableMatches.matches
                  .filter(m => !existingEventIds.has(m.id))
                  .map((match) => (
                    <label
                      key={match.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={selectedMatches.has(match.id)}
                        onCheckedChange={() => handleToggleMatch(match)}
                      />
                      <div className="flex-1">
                        <div className="text-xs text-muted-foreground">
                          {match.competition_name} - {formatKickoff(match.kickoff_utc)}
                        </div>
                        <div className="font-medium">
                          {match.home_name} vs {match.away_name}
                        </div>
                      </div>
                    </label>
                  ))}
                {availableMatches.matches.filter(m => !existingEventIds.has(m.id)).length === 0 && (
                  <p className="py-4 text-center text-muted-foreground">
                    All available matches have been added
                  </p>
                )}
              </div>
            ) : (
              <p className="py-4 text-center text-muted-foreground">
                No matches found for this date
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
