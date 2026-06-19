import { Router, Request, Response } from "express";
import privatePool, { ALERTS_TABLE, ALERT_EVENTS_TABLE } from "../db/connectionPrivate";
import { evaluateAlerts } from "../services/alertEngine";
import { mailerConfigured, sendMail } from "../services/mailer";

/**
 * Gestion des ALERTES + notifications e-mail.
 * CRUD des règles + journal des déclenchements + test d'évaluation manuel.
 */
const router = Router();

const COMP = ["below", "above"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const demoAlert = {
  id: 1,
  label: "Alerte proximite",
  comparateur: "below",
  seuil_cm: 15,
  email: "demo@example.com",
  active: 1,
  cooldown_s: 60,
  derniere_alerte_at: null,
  created_at: new Date().toISOString(),
};

/** GET /api/alerts/config — état du service mail (configuré ou simulé) */
router.get("/config", (_req: Request, res: Response) => {
  res.json({ mail_configured: mailerConfigured() });
});

/** GET /api/alerts — liste des règles d'alerte */
router.get("/", async (_req: Request, res: Response) => {
  if (process.env.DEMO_MODE === "true") {
    res.json([demoAlert]);
    return;
  }

  const [rows] = await privatePool.query(`SELECT * FROM \`${ALERTS_TABLE}\` ORDER BY id`);
  res.json(rows);
});

/** GET /api/alerts/events?limit=20 — journal des déclenchements */
router.get("/events", async (req: Request, res: Response) => {
  if (process.env.DEMO_MODE === "true") {
    res.json([]);
    return;
  }

  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const [rows] = await privatePool.query(
    `SELECT * FROM \`${ALERT_EVENTS_TABLE}\` ORDER BY created_at DESC LIMIT ?`,
    [limit]
  );
  res.json(rows);
});

/** POST /api/alerts — créer une règle */
router.post("/", async (req: Request, res: Response) => {
  if (process.env.DEMO_MODE === "true") {
    res.status(201).json({ ...demoAlert, ...req.body, id: Date.now(), created_at: new Date().toISOString() });
    return;
  }

  const { label, comparateur = "below", seuil_cm = 15, email, cooldown_s = 60 } = req.body;
  if (!label || !email) {
    res.status(400).json({ error: "label et email sont requis" });
    return;
  }
  if (!EMAIL_RE.test(email)) { res.status(400).json({ error: "email invalide" }); return; }
  if (!COMP.includes(comparateur)) { res.status(400).json({ error: "comparateur invalide" }); return; }

  const [result] = await privatePool.execute(
    `INSERT INTO \`${ALERTS_TABLE}\` (label, comparateur, seuil_cm, email, cooldown_s) VALUES (?, ?, ?, ?, ?)`,
    [label, comparateur, Number(seuil_cm), email, Number(cooldown_s)]
  );
  const id = (result as { insertId: number }).insertId;
  res.status(201).json({ id, label, comparateur, seuil_cm: Number(seuil_cm), email, active: 1, cooldown_s: Number(cooldown_s) });
});

/** PATCH /api/alerts/:id — modifier une règle */
router.patch("/:id", async (req: Request, res: Response) => {
  if (process.env.DEMO_MODE === "true") {
    res.json({ ...demoAlert, ...req.body, id: Number(req.params.id) });
    return;
  }

  const id = Number(req.params.id);
  const { label, comparateur, seuil_cm, email, active, cooldown_s } = req.body;

  if (comparateur && !COMP.includes(comparateur)) { res.status(400).json({ error: "comparateur invalide" }); return; }
  if (email && !EMAIL_RE.test(email)) { res.status(400).json({ error: "email invalide" }); return; }

  await privatePool.execute(
    `UPDATE \`${ALERTS_TABLE}\`
        SET label = COALESCE(?, label),
            comparateur = COALESCE(?, comparateur),
            seuil_cm = COALESCE(?, seuil_cm),
            email = COALESCE(?, email),
            active = COALESCE(?, active),
            cooldown_s = COALESCE(?, cooldown_s)
      WHERE id = ?`,
    [label ?? null, comparateur ?? null,
     seuil_cm !== undefined ? Number(seuil_cm) : null,
     email ?? null,
     active !== undefined ? (active ? 1 : 0) : null,
     cooldown_s !== undefined ? Number(cooldown_s) : null, id]
  );
  const [rows] = await privatePool.query(`SELECT * FROM \`${ALERTS_TABLE}\` WHERE id = ?`, [id]);
  const list = rows as unknown[];
  if (list.length === 0) { res.status(404).json({ error: "Alerte introuvable" }); return; }
  res.json(list[0]);
});

/** DELETE /api/alerts/:id */
router.delete("/:id", async (req: Request, res: Response) => {
  if (process.env.DEMO_MODE === "true") {
    res.json({ success: true, demo: true });
    return;
  }

  const id = Number(req.params.id);
  await privatePool.execute(`DELETE FROM \`${ALERTS_TABLE}\` WHERE id = ?`, [id]);
  res.json({ success: true });
});

/**
 * POST /api/alerts/test
 * Body: { email } — envoie un e-mail de test (vérifier la config SMTP/simulation).
 */
router.post("/test", async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || !EMAIL_RE.test(email)) { res.status(400).json({ error: "email invalide" }); return; }
  const result = await sendMail(
    email,
    "[Capteur Distance] E-mail de test",
    "Ceci est un e-mail de test du système d'alerte du capteur de distance. Si vous le recevez, la configuration fonctionne."
  );
  res.json(result);
});

/**
 * POST /api/alerts/evaluate
 * Body: { distance_cm } — évalue une distance contre les règles (déclenche si besoin).
 * Permet de tester les alertes sans capteur branché.
 */
router.post("/evaluate", async (req: Request, res: Response) => {
  const { distance_cm } = req.body;
  if (typeof distance_cm !== "number") {
    res.status(400).json({ error: "distance_cm (number) requis" });
    return;
  }
  if (process.env.DEMO_MODE === "true") {
    const triggered = distance_cm < demoAlert.seuil_cm
      ? [{ ...demoAlert, distance_cm, message: `Distance sous ${demoAlert.seuil_cm} cm`, email_status: "simule" }]
      : [];
    res.json({ distance_cm, triggered, demo: true });
    return;
  }
  const triggered = await evaluateAlerts(distance_cm);
  res.json({ distance_cm, triggered });
});

export default router;
