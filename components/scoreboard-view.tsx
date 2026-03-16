'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Session, PlayerScore, SessionMatch } from '@/lib/types';
import { Trophy, RefreshCw, Medal, Target, Check, X } from 'lucide-react';

interface ScoreboardViewProps {
  session: Session;
  sessionId: string;
}

interface ScoreboardData {
  session: Session;
  matches: (SessionMatch & {
    home_score: number | null;
    away_score: number | null;
    finished: boolean;
    started: boolean;
  })[];
  players: PlayerScore[];
  total_pot: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function ScoreboardView({ session, sessionId }: ScoreboardViewProps) {
  const { data, error, isLoading, mutate } = useSWR<ScoreboardData>(
    `/api/sessions/${sessionId}/scoreboard`,
    fetcher,
    { refreshInterval: 30000 } // Refresh every 30 seconds
  );

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshResults = async () => {
    setIsRefreshing(true);
    try {
      await fetch(`/api/sessions/${sessionId}/refresh-results`, {
        method: 'POST',
      });
      await mutate();
    } catch (err) {
      console.error('Error refreshing results:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="text-destructive">Failed to load scoreboard</p>
      </div>
    );
  }
  console.log("DATA", data);
  const { matches, players, total_pot } = data;
  const finishedMatches = matches.filter((m) => m.finished).length;
  const totalMatches = matches.length;
  console.log("MATCHES", matches);

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold text-foreground">{session.title}</h1>
        <p className="text-muted-foreground">
          {finishedMatches} of {totalMatches} matches completed
        </p>
        <div className="mt-2 flex items-center justify-center gap-2">
          <Badge variant="outline" className="text-lg">
            <Trophy className="mr-1 h-4 w-4" />
            ${total_pot.toFixed(2)} Pot
          </Badge>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="mb-6 flex justify-center">
        <Button
          variant="outline"
          onClick={handleRefreshResults}
          disabled={isRefreshing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Results
        </Button>
      </div>

      {/* Leaderboard */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Medal className="h-5 w-5" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          {players.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">
              No predictions submitted yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-center">Exact</TableHead>
                  <TableHead className="text-center">Result</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.map((player, index) => (
                  <TableRow key={player.entry_id}>
                    <TableCell className="font-medium">
                      {index === 0 && players.length > 1 && player.total_points > 0 ? (
                        <Trophy className="h-4 w-4 text-accent" />
                      ) : (
                        index + 1
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{player.player_name}</TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {player.correct_scores}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {player.correct_results}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {player.total_points}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Match Results */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Match Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {matches.map((match) => (
              <div
                key={match.event_id}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
              >
                <div className="flex-1">
                  <div className="mb-1 text-xs text-muted-foreground">
                    {match.competition_name}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{match.home_name}</span>
                    <span className="text-muted-foreground">vs</span>
                    <span className="font-medium text-foreground">{match.away_name}</span>
                  </div>
                </div>
                <div className="text-right">
                  {match.finished ? (
                    <div className="text-xl font-bold text-foreground">
                      {match.home_score} - {match.away_score}
                    </div>
                  ) : match.started ? (
                    <Badge variant="secondary">Live</Badge>
                  ) : (
                    <Badge variant="outline">Upcoming</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Predictions */}
      {players.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Predictions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-card">Match</TableHead>
                    <TableHead className="text-center">Result</TableHead>
                    {players.map((player) => (
                      <TableHead key={player.entry_id} className="text-center">
                        {player.player_name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matches.map((match) => (
                    <TableRow key={match.event_id}>
                      <TableCell className="sticky left-0 bg-card">
                        <div className="text-sm">
                          <span className="font-medium">{match.home_name}</span>
                          <span className="mx-1 text-muted-foreground">v</span>
                          <span className="font-medium">{match.away_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        {match.finished
                          ? `${match.home_score}-${match.away_score}`
                          : '-'}
                      </TableCell>
                      {players.map((player) => {
                        const pred = player.predictions.find(
                          (p) => p.event_id === match.event_id
                        );
                        if (!pred) return <TableCell key={player.entry_id}>-</TableCell>;

                        const isExact =
                          match.finished &&
                          pred.pred_home_goals === match.home_score &&
                          pred.pred_away_goals === match.away_score;

                        const isCorrectResult =
                          match.finished && pred.points > 0 && !isExact;

                        return (
                          <TableCell
                            key={player.entry_id}
                            className={`text-center ${isExact
                              ? 'bg-primary/20 font-bold text-primary'
                              : isCorrectResult
                                ? 'bg-accent/20 text-accent-foreground'
                                : ''
                              }`}
                          >
                            <div className="flex items-center justify-center gap-1">
                              {pred.pred_home_goals}-{pred.pred_away_goals}
                              {match.finished && (
                                <>
                                  {isExact && <Check className="h-3 w-3 text-primary" />}
                                  {isCorrectResult && <Check className="h-3 w-3 text-accent" />}
                                  {pred.points === 0 && <X className="h-3 w-3 text-destructive" />}
                                </>
                              )}
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
