import { Router, Request, Response } from "express";

/**
 * WEB SERVICE EXTERNE — météo Open-Meteo (gratuit, sans clé API).
 * ----------------------------------------------------------------------------
 * Lien concret avec NOTRE capteur de distance :
 * un capteur à ultrasons (HC-SR04) calcule la distance à partir du temps de vol
 * d'une onde sonore. Or la vitesse du son dépend de la température de l'air :
 *      c(T) = 331.3 + 0.606 × T   (m/s, T en °C)
 * La plupart des capteurs supposent 20 °C (≈ 343 m/s). On récupère donc la
 * température extérieure réelle via Open-Meteo et on en déduit le facteur de
 * correction à appliquer aux mesures pour qu'elles restent précises.
 *
 * .env (optionnel) : WEATHER_LAT, WEATHER_LON, WEATHER_VILLE
 */
const router = Router();

const LAT = process.env.WEATHER_LAT || "48.8566";   // Paris (ISEP) par défaut
const LON = process.env.WEATHER_LON || "2.3522";
const VILLE = process.env.WEATHER_VILLE || "Paris";

const REF_TEMP = 20;                         // température de référence du capteur (°C)
const speedOfSound = (t: number) => 331.3 + 0.606 * t;
const REF_SPEED = speedOfSound(REF_TEMP);    // ≈ 343.4 m/s

interface OpenMeteoResponse {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    apparent_temperature?: number;
    wind_speed_10m?: number;
  };
}

/**
 * GET /api/weather
 * Renvoie la météo courante + l'impact sur la mesure de distance.
 */
router.get("/", async (_req: Request, res: Response) => {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m&timezone=auto`;

  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) throw new Error(`Open-Meteo HTTP ${r.status}`);
    const data = (await r.json()) as OpenMeteoResponse;
    const c = data.current ?? {};
    const temp = typeof c.temperature_2m === "number" ? c.temperature_2m : REF_TEMP;

    const speed = speedOfSound(temp);
    // Une mesure faite en supposant REF_SPEED est sur/sous-estimée du ratio des vitesses.
    const correctionFactor = speed / REF_SPEED;
    // Exemple : erreur sur une mesure brute de 50 cm.
    const exempleBrut = 50;
    const exempleCorrige = exempleBrut * correctionFactor;

    res.json({
      demo: false,
      ville: VILLE,
      temperature: temp,
      ressenti: c.apparent_temperature ?? null,
      humidite: c.relative_humidity_2m ?? null,
      vent: c.wind_speed_10m ?? null,
      vitesse_son: Math.round(speed * 100) / 100,
      vitesse_son_ref: Math.round(REF_SPEED * 100) / 100,
      facteur_correction: Math.round(correctionFactor * 100000) / 100000,
      ecart_pct: Math.round((correctionFactor - 1) * 1000) / 10,
      exemple: { brut_cm: exempleBrut, corrige_cm: Math.round(exempleCorrige * 10) / 10 },
      source: "Open-Meteo",
    });
  } catch (err) {
    // Repli : météo simulée pour que la démo reste fonctionnelle hors-ligne.
    const temp = Math.round((15 + Math.random() * 12) * 10) / 10;
    const speed = speedOfSound(temp);
    const correctionFactor = speed / REF_SPEED;
    res.json({
      demo: true,
      note: (err as Error).message,
      ville: VILLE,
      temperature: temp,
      ressenti: temp - 1,
      humidite: Math.round(50 + Math.random() * 40),
      vent: Math.round(Math.random() * 20),
      vitesse_son: Math.round(speed * 100) / 100,
      vitesse_son_ref: Math.round(REF_SPEED * 100) / 100,
      facteur_correction: Math.round(correctionFactor * 100000) / 100000,
      ecart_pct: Math.round((correctionFactor - 1) * 1000) / 10,
      exemple: { brut_cm: 50, corrige_cm: Math.round(50 * correctionFactor * 10) / 10 },
      source: "simulation",
    });
  }
});

export default router;
