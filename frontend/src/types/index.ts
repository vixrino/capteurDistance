export interface User {
  id: number;
  username: string;
  email: string;
}

export interface Sensor {
  id: number;
  name: string;
  location: string | null;
  unit: string;
  min_range: number;
  max_range: number;
  active: boolean;
  created_at: string;
}

export interface Measurement {
  id?: number;
  sensor_id: number;
  distance_cm: number;
  measured_at: string;
  demo?: boolean;
}

export interface GameScore {
  id: number;
  game_id: string;
  player_name: string;
  score: number;
  details: Record<string, unknown> | null;
  played_at: string;
}

export type GameId = "guess" | "stability" | "reflex" | "maestro" | "morse";
