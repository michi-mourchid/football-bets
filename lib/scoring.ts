import { POINTS } from './types';

export type MatchResult = 'HOME' | 'AWAY' | 'DRAW';

export function getResult(homeGoals: number, awayGoals: number): MatchResult {
  if (homeGoals > awayGoals) return 'HOME';
  if (awayGoals > homeGoals) return 'AWAY';
  return 'DRAW';
}

export function calculatePoints(
  predHome: number,
  predAway: number,
  actualHome: number | null,
  actualAway: number | null
): number {
  // If match not finished, no points yet
  if (actualHome === null || actualAway === null) {
    return 0;
  }

  // Exact score match
  if (predHome === actualHome && predAway === actualAway) {
    return POINTS.CORRECT_SCORE;
  }

  // Correct result (winner or draw)
  const predResult = getResult(predHome, predAway);
  const actualResult = getResult(actualHome, actualAway);

  if (predResult === actualResult) {
    return POINTS.CORRECT_RESULT;
  }

  return POINTS.WRONG;
}

export function isCorrectScore(
  predHome: number,
  predAway: number,
  actualHome: number | null,
  actualAway: number | null
): boolean {
  if (actualHome === null || actualAway === null) return false;
  return predHome === actualHome && predAway === actualAway;
}

export function isCorrectResult(
  predHome: number,
  predAway: number,
  actualHome: number | null,
  actualAway: number | null
): boolean {
  if (actualHome === null || actualAway === null) return false;
  const predResult = getResult(predHome, predAway);
  const actualResult = getResult(actualHome, actualAway);
  return predResult === actualResult;
}
