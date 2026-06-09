import { Router, Response } from "express";
import pool from "../db/connection";
import { authenticate } from "../middleware/authMiddleware";
import { AuthRequest } from "../types";

const router = Router();

/** GET /api/sensors — liste tous les capteurs */
router.get("/", async (_req, res: Response) => {
  const [rows] = await pool.execute("SELECT * FROM distance_sensors ORDER BY id");
  res.json(rows);
});

/** GET /api/sensors/:id — détail d'un capteur */
router.get("/:id", async (req, res: Response) => {
  const [rows] = await pool.execute(
    "SELECT * FROM distance_sensors WHERE id = ?",
    [req.params.id]
  );
  const sensors = rows as unknown[];
  if (sensors.length === 0) {
    res.status(404).json({ error: "Capteur introuvable" });
    return;
  }
  res.json(sensors[0]);
});

/** POST /api/sensors — créer un capteur (authentifié) */
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  const { name, location, unit = "cm", min_range = 2, max_range = 400 } = req.body;
  if (!name) {
    res.status(400).json({ error: "Nom du capteur requis" });
    return;
  }
  const [result] = await pool.execute(
    "INSERT INTO distance_sensors (name, location, unit, min_range, max_range) VALUES (?, ?, ?, ?, ?)",
    [name, location ?? null, unit, min_range, max_range]
  );
  const insertId = (result as { insertId: number }).insertId;
  res.status(201).json({ id: insertId, name, location, unit, min_range, max_range });
});

/** PATCH /api/sensors/:id — modifier un capteur (authentifié) */
router.patch("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  const { name, location, active } = req.body;
  await pool.execute(
    "UPDATE distance_sensors SET name = COALESCE(?, name), location = COALESCE(?, location), active = COALESCE(?, active) WHERE id = ?",
    [name ?? null, location ?? null, active ?? null, req.params.id]
  );
  res.json({ success: true });
});

export default router;
