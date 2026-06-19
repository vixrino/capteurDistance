import privatePool, { ALERTS_TABLE, ALERT_EVENTS_TABLE, ACTUATORS_TABLE } from "../db/connectionPrivate";
import { sendMail } from "./mailer";

interface AlertRule {
  id: number;
  label: string;
  comparateur: "below" | "above";
  seuil_cm: number;
  email: string;
  active: number;
  cooldown_s: number;
  derniere_alerte_at: string | null;
}

export interface TriggeredAlert {
  alerte_id: number;
  label: string;
  distance_cm: number;
  message: string;
  email: string;
  email_status: string;
}

function matches(rule: AlertRule, distance: number): boolean {
  return rule.comparateur === "below" ? distance < rule.seuil_cm : distance > rule.seuil_cm;
}

function cooldownOver(rule: AlertRule): boolean {
  if (!rule.derniere_alerte_at) return true;
  const last = new Date(rule.derniere_alerte_at).getTime();
  return Date.now() - last >= rule.cooldown_s * 1000;
}

/**
 * Évalue une distance contre toutes les règles d'alerte actives.
 * Pour chaque règle satisfaite (et hors cooldown), journalise un événement
 * et envoie (ou simule) un e-mail. Renvoie la liste des alertes déclenchées.
 */
export async function evaluateAlerts(distance: number): Promise<TriggeredAlert[]> {
  const [rows] = await privatePool.query(`SELECT * FROM \`${ALERTS_TABLE}\` WHERE active = 1`);
  const rules = rows as AlertRule[];
  const triggered: TriggeredAlert[] = [];

  for (const rule of rules) {
    if (!matches(rule, distance) || !cooldownOver(rule)) continue;

    const sens = rule.comparateur === "below" ? "sous" : "au-dessus de";
    const message = `Alerte « ${rule.label} » : distance ${distance.toFixed(1)} cm ${sens} le seuil de ${rule.seuil_cm} cm.`;
    const subject = `[Capteur Distance] ${rule.label}`;

    const mail = await sendMail(rule.email, subject, message);

    await privatePool.execute(
      `INSERT INTO \`${ALERT_EVENTS_TABLE}\` (alerte_id, label, distance_cm, message, email, email_status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [rule.id, rule.label, distance, message, rule.email, mail.status]
    );
    await privatePool.execute(
      `UPDATE \`${ALERTS_TABLE}\` SET derniere_alerte_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [rule.id]
    );

    triggered.push({
      alerte_id: rule.id,
      label: rule.label,
      distance_cm: distance,
      message,
      email: rule.email,
      email_status: mail.status,
    });
  }

  return triggered;
}

/**
 * Met à jour l'état des actionneurs en mode `auto` selon la distance courante.
 * Un actionneur auto passe à `on` si sa condition (below/above seuil) est vraie.
 */
export async function applyAutoActuators(distance: number): Promise<void> {
  const [rows] = await privatePool.query(
    `SELECT id, sens, seuil_cm FROM \`${ACTUATORS_TABLE}\` WHERE mode = 'auto'`
  );
  const actuators = rows as { id: number; sens: "below" | "above"; seuil_cm: number }[];

  for (const a of actuators) {
    const active = a.sens === "below" ? distance < a.seuil_cm : distance > a.seuil_cm;
    await privatePool.execute(
      `UPDATE \`${ACTUATORS_TABLE}\` SET etat = ? WHERE id = ?`,
      [active ? "on" : "off", a.id]
    );
  }
}

/** Évalue alertes + actionneurs auto en une passe (best-effort, ne jette pas). */
export async function processMeasurement(distance: number): Promise<TriggeredAlert[]> {
  let triggered: TriggeredAlert[] = [];
  try {
    triggered = await evaluateAlerts(distance);
  } catch (err) {
    console.error("evaluateAlerts:", (err as Error).message);
  }
  try {
    await applyAutoActuators(distance);
  } catch (err) {
    console.error("applyAutoActuators:", (err as Error).message);
  }
  return triggered;
}
