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
  sensor_id?: number;
  distance_cm: number;
  mesure_at: string;
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

export type GameId =
  | "maestro" | "screen_sync"
  | "color_zone" | "state_watch" | "hangar_quiz";

/** État courant du capteur du groupe 8B. */
export interface StateReading {
  demo: boolean;
  etat: number;
  last_change: string | null;
}

/** Dernière commande LED RGB du groupe 8E. */
export interface LedReading {
  demo: boolean;
  expediteur: string;
  r: string;
  g: string;
  b: string;
  couleur: string;
  hex: string;
  date_envoi: string | null;
}

/** Donnée renvoyée par /api/external/screen/latest (groupe « écran » voisin). */
export interface ScreenData {
  demo: boolean;
  table: string;
  text: string | null;
  number: number | null;
  updated_at: string | null;
  raw: Record<string, unknown>;
  note?: string;
}

/** Capteur de son du groupe voisin (g8c_mesures). */
export interface SoundReading {
  hertz: number;
  decibels: number;
  note: string;
  ts?: string;
}

/** Question prête à l'emploi du quiz sonore. */
export interface SoundQuiz {
  demo: boolean;
  hertz: number;
  decibels: number;
  answer: string;
  options: string[];
}

/** Actionneur piloté depuis le site (LED, buzzer, relais…). */
export interface Actuator {
  id: number;
  nom: string;
  type: "led" | "buzzer" | "relais" | "moteur";
  etat: "on" | "off";
  mode: "manuel" | "auto";
  sens: "below" | "above";
  seuil_cm: number;
  updated_at: string;
}

/** Règle d'alerte avec notification e-mail. */
export interface AlertRule {
  id: number;
  label: string;
  comparateur: "below" | "above";
  seuil_cm: number;
  email: string;
  active: number;
  cooldown_s: number;
  derniere_alerte_at: string | null;
  created_at: string;
}

/** Déclenchement d'alerte journalisé. */
export interface AlertEvent {
  id: number;
  alerte_id: number | null;
  label: string;
  distance_cm: number;
  message: string;
  email: string;
  email_status: "envoye" | "simule" | "echec";
  created_at: string;
}

/** Météo Open-Meteo + impact sur la mesure de distance. */
export interface Weather {
  demo: boolean;
  note?: string;
  ville: string;
  temperature: number;
  ressenti: number | null;
  humidite: number | null;
  vent: number | null;
  vitesse_son: number;
  vitesse_son_ref: number;
  facteur_correction: number;
  ecart_pct: number;
  exemple: { brut_cm: number; corrige_cm: number };
  source: string;
}

/** Photo instantanée de tous les capteurs voisins. */
export interface SensorsSnapshot {
  sound: { hertz: number; decibels: number; note: string; ts: string } | null;
  color: { couleur: string; couleur_html: string; updated_at: string } | null;
  state: { etat: number; last_change: string | null } | null;
  screen: { expediteur: string; titre: string; message: string; ts: string } | null;
}
