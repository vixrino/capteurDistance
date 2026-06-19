import { Router, Request, Response } from "express";
import privatePool, { ACTUATORS_TABLE } from "../db/connectionPrivate";

/**
 * Gestion des ACTIONNEURS (LED, buzzer, relais…).
 * CRUD + bascule d'état + mode auto/manuel piloté par la distance.
 */
const router = Router();

const TYPES = ["led", "buzzer", "relais", "moteur"];
const MODES = ["manuel", "auto"];
const SENS = ["below", "above"];

/** GET /api/actuators — liste tous les actionneurs */
router.get("/", async (_req: Request, res: Response) => {
  const [rows] = await privatePool.query(`SELECT * FROM \`${ACTUATORS_TABLE}\` ORDER BY id`);
  res.json(rows);
});

/** POST /api/actuators — créer un actionneur */
router.post("/", async (req: Request, res: Response) => {
  const { nom, type = "led", mode = "manuel", sens = "below", seuil_cm = 20 } = req.body;
  if (!nom) {
    res.status(400).json({ error: "Le nom est requis" });
    return;
  }
  if (!TYPES.includes(type) || !MODES.includes(mode) || !SENS.includes(sens)) {
    res.status(400).json({ error: "type, mode ou sens invalide" });
    return;
  }
  const [result] = await privatePool.execute(
    `INSERT INTO \`${ACTUATORS_TABLE}\` (nom, type, mode, sens, seuil_cm) VALUES (?, ?, ?, ?, ?)`,
    [nom, type, mode, sens, Number(seuil_cm)]
  );
  const id = (result as { insertId: number }).insertId;
  res.status(201).json({ id, nom, type, etat: "off", mode, sens, seuil_cm: Number(seuil_cm) });
});

/** PATCH /api/actuators/:id — modifier (nom, mode, sens, seuil, etat) */
router.patch("/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { nom, type, mode, sens, seuil_cm, etat } = req.body;

  if (type && !TYPES.includes(type)) { res.status(400).json({ error: "type invalide" }); return; }
  if (mode && !MODES.includes(mode)) { res.status(400).json({ error: "mode invalide" }); return; }
  if (sens && !SENS.includes(sens)) { res.status(400).json({ error: "sens invalide" }); return; }
  if (etat && !["on", "off"].includes(etat)) { res.status(400).json({ error: "etat invalide" }); return; }

  await privatePool.execute(
    `UPDATE \`${ACTUATORS_TABLE}\`
        SET nom = COALESCE(?, nom),
            type = COALESCE(?, type),
            mode = COALESCE(?, mode),
            sens = COALESCE(?, sens),
            seuil_cm = COALESCE(?, seuil_cm),
            etat = COALESCE(?, etat)
      WHERE id = ?`,
    [nom ?? null, type ?? null, mode ?? null, sens ?? null,
     seuil_cm !== undefined ? Number(seuil_cm) : null, etat ?? null, id]
  );
  const [rows] = await privatePool.query(`SELECT * FROM \`${ACTUATORS_TABLE}\` WHERE id = ?`, [id]);
  const list = rows as unknown[];
  if (list.length === 0) { res.status(404).json({ error: "Actionneur introuvable" }); return; }
  res.json(list[0]);
});

/** POST /api/actuators/:id/toggle — bascule on/off (force le mode manuel) */
router.post("/:id/toggle", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const [rows] = await privatePool.query(`SELECT etat FROM \`${ACTUATORS_TABLE}\` WHERE id = ?`, [id]);
  const list = rows as { etat: string }[];
  if (list.length === 0) { res.status(404).json({ error: "Actionneur introuvable" }); return; }

  const next = list[0].etat === "on" ? "off" : "on";
  // Une commande manuelle reprend la main sur le mode auto.
  await privatePool.execute(
    `UPDATE \`${ACTUATORS_TABLE}\` SET etat = ?, mode = 'manuel' WHERE id = ?`,
    [next, id]
  );
  res.json({ id, etat: next, mode: "manuel" });
});

/** DELETE /api/actuators/:id */
router.delete("/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  await privatePool.execute(`DELETE FROM \`${ACTUATORS_TABLE}\` WHERE id = ?`, [id]);
  res.json({ success: true });
});

export default router;
