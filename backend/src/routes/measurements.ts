import { Router, Request, Response } from "express";
import pool from "../db/connection";
import { processMeasurement } from "../services/alertEngine";

const router = Router();

// Plage fiable du capteur Sharp GP2Y0A21 (cm). On n'accepte/affiche que cette zone.
const SENSOR_MIN = 10;
const SENSOR_MAX = 80;

// Table des mesures. Sur la base partagée, notre table est `g8a_mesures` ;
// en local (XAMPP/MAMP) c'est `mesures`. Surchargeable via .env.
const ID_RE = /^[a-zA-Z0-9_]+$/;
const MEASURES_TABLE = (process.env.MEASURES_TABLE && ID_RE.test(process.env.MEASURES_TABLE))
  ? process.env.MEASURES_TABLE
  : "mesures";

type DemoMeasurement = {
  id: number;
  distance_cm: number;
  mesure_at: string;
  demo: true;
};

const demoMeasurements: DemoMeasurement[] = [];

function createDemoMeasurement(distance_cm: number): DemoMeasurement {
  const measurement = {
    id: demoMeasurements.length + 1,
    distance_cm,
    mesure_at: new Date().toISOString(),
    demo: true as const,
  };
  demoMeasurements.unshift(measurement);
  demoMeasurements.splice(120);
  return measurement;
}

/**
 * GET /api/measurements/latest
 * Retourne la dernière mesure.
 * En mode démo (DEMO_MODE=true), renvoie une valeur simulée.
 */
router.get("/latest", async (_req: Request, res: Response) => {
  if (process.env.DEMO_MODE === "true") {
    const latest = demoMeasurements[0] ?? createDemoMeasurement(Math.round(SENSOR_MIN + Math.random() * (SENSOR_MAX - SENSOR_MIN)));
    res.json(latest);
    return;
  }

  const [rows] = await pool.execute(
    `SELECT * FROM \`${MEASURES_TABLE}\` ORDER BY mesure_at DESC LIMIT 1`
  );
  const list = rows as unknown[];
  if (list.length === 0) {
    res.status(404).json({ error: "Aucune mesure disponible" });
    return;
  }
  res.json(list[0]);
});

/**
 * GET /api/measurements/history?limit=50&offset=0
 */
router.get("/history", async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 50, 500);
  const offset = Number(req.query.offset) || 0;

  if (process.env.DEMO_MODE === "true") {
    if (demoMeasurements.length === 0) {
      createDemoMeasurement(Math.round(SENSOR_MIN + Math.random() * (SENSOR_MAX - SENSOR_MIN)));
    }
    const data = demoMeasurements.slice(offset, offset + limit);
    res.json({ data, total: demoMeasurements.length, limit, offset, demo: true });
    return;
  }

  const [rows] = await pool.execute(
    `SELECT * FROM \`${MEASURES_TABLE}\` ORDER BY mesure_at DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  const [countRows] = await pool.execute(
    `SELECT COUNT(*) as total FROM \`${MEASURES_TABLE}\``
  );
  const total = (countRows as { total: number }[])[0].total;
  res.json({ data: rows, total, limit, offset });
});

/**
 * POST /api/measurements
 * Body: { distance_cm: number }
 * Appelé par la carte Tiva C via USB/série ou HTTP.
 *
 * Exemple curl :
 *   curl -X POST http://localhost:3001/api/measurements \
 *        -H "Content-Type: application/json" \
 *        -d '{"distance_cm": 42.5}'
 */
router.post("/", async (req: Request, res: Response) => {
  const { distance_cm } = req.body;

  if (distance_cm === undefined || distance_cm === null) {
    res.status(400).json({ error: "distance_cm requis" });
    return;
  }
  if (typeof distance_cm !== "number" || distance_cm < SENSOR_MIN || distance_cm > SENSOR_MAX) {
    res.status(400).json({ error: `distance_cm doit être un nombre entre ${SENSOR_MIN} et ${SENSOR_MAX} cm` });
    return;
  }

  if (process.env.DEMO_MODE === "true") {
    res.status(201).json({ ...createDemoMeasurement(distance_cm), alerts: [] });
    return;
  }

  const [result] = await pool.execute(
    `INSERT INTO \`${MEASURES_TABLE}\` (distance_cm) VALUES (?)`,
    [distance_cm]
  );
  const insertId = (result as { insertId: number }).insertId;

  // Évalue les alertes + actionneurs auto sur cette nouvelle mesure.
  const triggered = await processMeasurement(distance_cm);

  res.status(201).json({ id: insertId, distance_cm, mesure_at: new Date().toISOString(), alerts: triggered });
});

export default router;
