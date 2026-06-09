import { Router, Response } from "express";

const router = Router();

// Architecture mono-capteur : la base ne contient qu'une table `mesures`
// (pas de table `distance_sensors`). On expose donc un capteur statique unique,
// que le mode démo soit actif ou non. Le frontend (Dashboard) attend cette forme.
const staticSensor = {
  id: 1,
  name: "Sharp GP2Y0A21",
  location: "TIVA C — PD3",
  unit: "cm",
  min_range: 10,
  max_range: 80,
  active: true,
};

/** GET /api/sensors — liste des capteurs (un seul) */
router.get("/", async (_req, res: Response) => {
  res.json([staticSensor]);
});

/** GET /api/sensors/:id — détail du capteur */
router.get("/:id", async (req, res: Response) => {
  if (Number(req.params.id) !== staticSensor.id) {
    res.status(404).json({ error: "Capteur introuvable" });
    return;
  }
  res.json(staticSensor);
});

export default router;
