// Database types
export interface Session {
  id: string;
  title: string;
  session_date: string;
  stake_per_player: number;
  state: "DRAFT" | "OPEN" | "LOCKED" | "COMPLETED";
  created_at: string;
}

export interface SessionMatch {
  id: string;
  session_id: string;
  event_id: string;
  league_id: number;
  kickoff_utc: string;
  home_name: string;
  away_name: string;
  competition_name: string | null;
  page_url: string | null;
  created_at: string;
}

export interface Entry {
  id: string;
  session_id: string;
  player_name: string;
  created_at: string;
}

export interface Prediction {
  id: string;
  entry_id: string;
  event_id: string;
  pred_home_goals: number;
  pred_away_goals: number;
  created_at: string;
}

export interface MatchCache {
  event_id: string;
  league_id: number;
  finished: boolean;
  started: boolean;
  reason_short: string | null;
  home_score: number | null;
  away_score: number | null;
  score_str: string | null;
  kickoff_utc: string | null;
  fetched_at: string;
}

// Football API types (Flashscore)
export interface FlashscoreMatch {
  id: string;
  home_name: string;
  away_name: string;
  home_score?: number;
  away_score?: number;
  status: string;
  kickoff_utc: string;
  league_id: number;
  competition_name: string;
  page_url?: string;
  finished: boolean;
  started: boolean;
}

// Scoring types
export interface PlayerScore {
  player_name: string;
  entry_id: string;
  total_points: number;
  correct_results: number;
  correct_scores: number;
  predictions: PredictionWithResult[];
}

export interface PredictionWithResult extends Prediction {
  home_name: string;
  away_name: string;
  actual_home_goals: number | null;
  actual_away_goals: number | null;
  points: number;
  match_finished: boolean;
}

// API request/response types
export interface CreateSessionRequest {
  title: string;
  session_date: string;
  stake_per_player?: number;
}

export interface AddMatchesRequest {
  matches: {
    event_id: string;
    league_id: number;
    kickoff_utc: string;
    home_name: string;
    away_name: string;
    competition_name?: string;
    page_url?: string;
  }[];
}

export interface SubmitPredictionsRequest {
  player_name: string;
  predictions: {
    event_id: string;
    pred_home_goals: number;
    pred_away_goals: number;
  }[];
}

// Scoring constants
export const POINTS = {
  CORRECT_SCORE: 2,
  CORRECT_RESULT: 1,
  WRONG: 0,
} as const;
