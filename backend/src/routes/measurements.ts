import { Router, Request, Response } from "express";
import pool from "../db/connection";

const router = Router();

/**
 * GET /api/measurements/latest?sensor_id=1
 * Retourne la dernière mesure d'un capteur.
 * En mode démo (DEMO_MODE=true), renvoie une valeur simulée.
 */
router.get("/latest", async (req: Request, res: Response) => {
  const sensorId = Number(req.query.sensor_id) || 1;

  if (process.env.DEMO_MODE === "true") {
    const distance = Math.round(Math.random() * 150 + 10);
    res.json({ sensor_id: sensorId, distance_cm: distance, measured_at: new Date().toISOString(), demo: true });
    return;
  }

  const [rows] = await pool.execute(
    "SELECT * FROM distance_measurements WHERE sensor_id = ? ORDER BY measured_at DESC LIMIT 1",
    [sensorId]
  );
  const measurements = rows as unknown[];
  if (measurements.length === 0) {
    res.status(404).json({ error: "Aucune mesure disponible" });
    return;
  }
  res.json(measurements[0]);
});

/**
 * GET /api/measurements/history?sensor_id=1&limit=50&offset=0
 */
router.get("/history", async (req: Request, res: Response) => {
  const sensorId = Number(req.query.sensor_id) || 1;
  const limit = Math.min(Number(req.query.limit) || 50, 500);
  const offset = Number(req.query.offset) || 0;

  const [rows] = await pool.execute(
    "SELECT * FROM distance_measurements WHERE sensor_id = ? ORDER BY measured_at DESC LIMIT ? OFFSET ?",
    [sensorId, limit, offset]
  );
  const [countRows] = await pool.execute(
    "SELECT COUNT(*) as total FROM distance_measurements WHERE sensor_id = ?",
    [sensorId]
  );
  const total = (countRows as { total: number }[])[0].total;
  res.json({ data: rows, total, limit, offset });
});

/**
 * POST /api/measurements
 * Body: { sensor_id, distance_cm }
 * Appelé par la carte Tiva (ou en simulation).
 */
router.post("/", async (req: Request, res: Response) => {
  const { sensor_id = 1, distance_cm } = req.body;
  if (distance_cm === undefined || distance_cm === null) {
    res.status(400).json({ error: "distance_cm requis" });
    return;
  }
  const [result] = await pool.execute(
    "INSERT INTO distance_measurements (sensor_id, distance_cm) VALUES (?, ?)",
    [sensor_id, distance_cm]
  );
  const insertId = (result as { insertId: number }).insertId;
  res.status(201).json({ id: insertId, sensor_id, distance_cm });
});

export default router;
