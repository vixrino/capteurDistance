// Plage réelle du capteur Sharp GP2Y0A21 : fiable seulement entre 10 et 80 cm.
// Toutes les cibles des jeux et les axes des graphiques s'appuient sur ces bornes.
export const SENSOR_MIN = 10;
export const SENSOR_MAX = 80;

// Marge intérieure pour les cibles : on évite les tout derniers cm,
// moins fiables, pour que les défis restent atteignables.
export const TARGET_MIN = 15;
export const TARGET_MAX = 75;

/** Tire une distance cible aléatoire dans la plage atteignable (bornes incluses). */
export function randomTarget(min = TARGET_MIN, max = TARGET_MAX): number {
  return Math.round(min + Math.random() * (max - min));
}
