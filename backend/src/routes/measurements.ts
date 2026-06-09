import { Router, Request, Response } from "express";
import pool from "../db/connection";

const router = Router();

/**
 * GET /api/measurements/latest
 * Retourne la dernière mesure.
 * En mode démo (DEMO_MODE=true), renvoie une valeur simulée.
 */
router.get("/latest", async (_req: Request, res: Response) => {
  if (process.env.DEMO_MODE === "true") {
    const distance = Math.round(Math.random() * 150 + 10);
    res.json({
      id: 0,
      distance_cm: distance,
      mesure_at: new Date().toISOString(),
      demo: true,
    });
    return;
  }

  const [rows] = await pool.execute(
    "SELECT * FROM mesures ORDER BY mesure_at DESC LIMIT 1"
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

  const [rows] = await pool.execute(
    "SELECT * FROM mesures ORDER BY mesure_at DESC LIMIT ? OFFSET ?",
    [limit, offset]
  );
  const [countRows] = await pool.execute(
    "SELECT COUNT(*) as total FROM mesures"
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
  if (typeof distance_cm !== "number" || distance_cm < 0 || distance_cm > 500) {
    res.status(400).json({ error: "distance_cm doit être un nombre entre 0 et 500" });
    return;
  }

  const [result] = await pool.execute(
    "INSERT INTO mesures (distance_cm) VALUES (?)",
    [distance_cm]
  );
  const insertId = (result as { insertId: number }).insertId;
  res.status(201).json({ id: insertId, distance_cm, mesure_at: new Date().toISOString() });
});

export default router;
