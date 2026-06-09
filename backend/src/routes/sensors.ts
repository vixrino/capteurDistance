import { Router, Response } from "express";

const router = Router();

// Capteur unique et fixe — plus besoin d'une table dédiée
const SENSOR = {
  id: 1,
  name: "Capteur HC-SR04",
  location: "Salle de projet",
  unit: "cm",
  min_range: 2,
  max_range: 400,
  active: true,
};

router.get("/", (_req, res: Response) => {
  res.json([SENSOR]);
});

router.get("/:id", (_req, res: Response) => {
  res.json(SENSOR);
});

export default router;
