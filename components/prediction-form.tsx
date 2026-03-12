'use client';

import React from "react"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SessionMatch } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface PredictionFormProps {
  sessionId: string;
  matches: SessionMatch[];
}

interface PredictionState {
  [eventId: string]: {
    home: string;
    away: string;
  };
}

export function PredictionForm({ sessionId, matches }: PredictionFormProps) {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');
  const [predictions, setPredictions] = useState<PredictionState>(() => {
    const initial: PredictionState = {};
    for (const match of matches) {
      initial[match.event_id] = { home: '', away: '' };
    }
    return initial;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScoreChange = (eventId: string, team: 'home' | 'away', value: string) => {
    // Only allow numbers 0-99
    if (value !== '' && !/^\d{1,2}$/.test(value)) return;
    
    setPredictions((prev) => ({
      ...prev,
      [eventId]: {
        ...prev[eventId],
        [team]: value,
      },
    }));
  };

  const isFormValid = () => {
    if (!playerName.trim()) return false;
    for (const match of matches) {
      const pred = predictions[match.event_id];
      if (pred.home === '' || pred.away === '') return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const predictionsArray = matches.map((match) => ({
        event_id: match.event_id,
        pred_home_goals: parseInt(predictions[match.event_id].home, 10),
        pred_away_goals: parseInt(predictions[match.event_id].away, 10),
      }));

      const response = await fetch(`/api/sessions/${sessionId}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_name: playerName.trim(),
          predictions: predictionsArray,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit predictions');
      }

      router.push(`/scoreboard/${sessionId}?submitted=true`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatKickoff = (kickoffUtc: string) => {
    const date = new Date(kickoffUtc);
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Player Name */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Your Name</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="max-w-xs"
            required
          />
        </CardContent>
      </Card>

      {/* Match Predictions */}
      <div className="space-y-4">
        {matches.map((match) => (
          <Card key={match.event_id}>
            <CardContent className="py-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {match.competition_name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatKickoff(match.kickoff_utc)}
                </span>
              </div>
              
              <div className="flex items-center gap-4">
                {/* Home Team */}
                <div className="flex flex-1 items-center justify-end gap-2">
                  <span className="text-sm font-medium text-foreground text-right">
                    {match.home_name}
                  </span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="h-10 w-14 text-center text-lg font-semibold"
                    value={predictions[match.event_id]?.home || ''}
                    onChange={(e) => handleScoreChange(match.event_id, 'home', e.target.value)}
                    placeholder="-"
                    required
                  />
                </div>

                <span className="text-muted-foreground font-medium">vs</span>

                {/* Away Team */}
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="h-10 w-14 text-center text-lg font-semibold"
                    value={predictions[match.event_id]?.away || ''}
                    onChange={(e) => handleScoreChange(match.event_id, 'away', e.target.value)}
                    placeholder="-"
                    required
                  />
                  <span className="text-sm font-medium text-foreground">
                    {match.away_name}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <div className="mt-6">
        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={!isFormValid() || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Predictions'
          )}
        </Button>
      </div>
    </form>
  );
}
