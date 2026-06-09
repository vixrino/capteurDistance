import { Request } from "express";

export interface AuthPayload {
  userId: number;
  username: string;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export interface Measurement {
  id: number;
  sensor_id: number;
  distance_cm: number;
  measured_at: string;
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

export interface GameScore {
  id: number;
  game_id: string;
  player_name: string;
  score: number;
  details: Record<string, unknown> | null;
  played_at: string;
}
