import { Router, Request, Response } from "express";
import pool from "../db/connection";

/**
 * Routes "inter-groupes".
 * ----------------------------------------------------------------------------
 * La base `hangardb_dade64253` est PARTAGÉE entre toutes les équipes du hangar.
 * Chaque groupe y crée ses propres tables (nous : `mesures`, `scores`).
 * Ce module permet de LIRE les tables des autres groupes — en particulier
 * celles du groupe « écran / afficheur » — pour alimenter des mini-jeux.
 *
 * Tout est en lecture seule. Aucune écriture dans les tables des voisins.
 *
 * Ces lectures NE dépendent PAS de DEMO_MODE (qui ne concerne que notre capteur) :
 * on lit toujours la vraie base. Un repli simulé n'est renvoyé que si la base
 * est injoignable ou si aucune table « écran » n'est trouvée.
 */
const router = Router();

// Nos propres tables : on les masque de l'explorateur "voisins".
const OWN_TABLES = new Set(["mesures", "scores", "users", "distance_users", "distance_sensors", "distance_measurements", "distance_game_scores"]);

// Mots-clés pour repérer la table de l'écran d'un autre groupe.
const SCREEN_TABLE_HINTS = ["ecran", "écran", "screen", "afficheur", "affichage", "display", "oled", "lcd", "matrice", "matrix", "panneau", "led", "message"];
// Colonnes susceptibles de contenir le texte affiché.
const TEXT_COLUMN_HINTS = ["message", "texte", "text", "contenu", "content", "msg", "valeur", "value", "mot", "phrase", "display", "affichage", "data"];
// Colonnes susceptibles d'être un horodatage (pour trier la "dernière" ligne).
const TIME_COLUMN_HINTS = ["_at", "horodatage", "created", "updated", "timestamp", "date", "time", "ts"];
// Colonnes à ignorer pour la détection d'un "nombre" pertinent (clé primaire…).
const NUMBER_SKIP_HINTS = ["id", "_at", "ts", "date", "time"];

const DEMO_SCREEN_MESSAGES = [
  "BONJOUR HANGAR",
  "42",
  "ISEP 2026",
  "TEMP 21C",
  "55",
  "GO !",
  "DISTANCE",
  "73",
  "SOUTENANCE",
  "18",
];

// ── Tables des autres capteurs (base partagée) — surchargeables via .env ──
const SOUND_TABLE = process.env.SOUND_TABLE || "g8c_mesures";   // groupe 8C : capteur de son
const COLOR_TABLE = process.env.COLOR_TABLE || "g8e_led_realtime"; // groupe 8E : LED couleur
const STATE_TABLE = process.env.STATE_TABLE || "g8b_etat_actuel"; // groupe 8B : capteur d'état

// Notes pour le repli démo + génération de distracteurs de quiz.
const NOTE_POOL = ["Do4", "Re4", "Mi4", "Fa4", "Sol4", "La4", "Si4", "Do5", "Re5", "Mi5", "Fa5", "Sol5", "La5", "Do#3", "Re#4", "Fa#4"];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function demoSound() {
  const note = NOTE_POOL[Math.floor(Math.random() * NOTE_POOL.length)];
  return {
    hertz: Math.round(80 + Math.random() * 1493),
    decibels: Math.round((70 + Math.random() * 37) * 10) / 10,
    note,
    ts: new Date().toISOString(),
  };
}

/** Identifiant SQL sûr : uniquement [a-zA-Z0-9_], sinon rejet. */
function safeIdentifier(name: string): string | null {
  return /^[a-zA-Z0-9_]+$/.test(name) ? name : null;
}

/** Liste les tables réellement présentes dans la base partagée. */
async function listTables(): Promise<string[]> {
  const [rows] = await pool.query(
    `SELECT table_name AS t
       FROM information_schema.tables
      WHERE table_schema = DATABASE()`
  );
  return (rows as { t: string }[]).map((r) => r.t);
}

/** Colonnes d'une table donnée (ordre du schéma). */
async function listColumns(table: string): Promise<{ name: string; type: string }[]> {
  const [rows] = await pool.query(
    `SELECT column_name AS name, data_type AS type
       FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = ?
      ORDER BY ordinal_position`,
    [table]
  );
  return rows as { name: string; type: string }[];
}

function pickByHints(columns: string[], hints: string[]): string | undefined {
  const lower = columns.map((c) => ({ orig: c, low: c.toLowerCase() }));
  for (const h of hints) {
    const hit = lower.find((c) => c.low === h) || lower.find((c) => c.low.includes(h));
    if (hit) return hit.orig;
  }
  return undefined;
}

/** Vrai si une colonne doit être ignorée pour la détection d'un nombre "utile". */
function isSkippedNumberColumn(name: string): boolean {
  const low = name.toLowerCase();
  return NUMBER_SKIP_HINTS.some((h) => low === h || low.endsWith(h) || low.includes(h));
}

/**
 * Nombre "utile" d'une ligne : on parse d'abord les colonnes texte (ex. titre
 * "CIBLE: 6s" → 6), puis les colonnes numériques — en ignorant les id/dates.
 */
function extractNumber(row: Record<string, unknown>): number | null {
  for (const [k, v] of Object.entries(row)) {
    if (isSkippedNumberColumn(k)) continue;
    if (typeof v === "string") {
      const m = v.match(/-?\d+(\.\d+)?/);
      if (m) return Number(m[0]);
    }
  }
  for (const [k, v] of Object.entries(row)) {
    if (isSkippedNumberColumn(k)) continue;
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

/**
 * GET /api/external/tables
 * Liste toutes les tables des autres groupes (utile pour découvrir l'écran).
 */
router.get("/tables", async (_req: Request, res: Response) => {
  try {
    const tables = await listTables();
    const others = tables.filter((t) => !OWN_TABLES.has(t.toLowerCase()));
    res.json({ demo: false, tables: others, own: tables.filter((t) => OWN_TABLES.has(t.toLowerCase())) });
  } catch (err) {
    res.json({ demo: true, error: (err as Error).message, tables: ["ecran_messages", "temperature_releves"] });
  }
});

/**
 * GET /api/external/peek/:table?limit=5
 * Aperçu des dernières lignes d'une table voisine (lecture seule).
 */
router.get("/peek/:table", async (req: Request, res: Response) => {
  const table = safeIdentifier(req.params.table);
  if (!table) {
    res.status(400).json({ error: "Nom de table invalide" });
    return;
  }
  const limit = Math.min(Number(req.query.limit) || 5, 50);

  try {
    const tables = await listTables();
    if (!tables.includes(table)) {
      res.status(404).json({ error: `Table introuvable : ${table}` });
      return;
    }
    const columns = await listColumns(table);
    const timeCol = pickByHints(columns.map((c) => c.name), TIME_COLUMN_HINTS);
    const order = timeCol ? `\`${timeCol}\` DESC` : `1 DESC`;
    const [rows] = await pool.query(
      `SELECT * FROM \`${table}\` ORDER BY ${order} LIMIT ?`,
      [limit]
    );
    res.json({ demo: false, table, columns: columns.map((c) => c.name), rows });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * GET /api/external/screen/latest
 * Dernière info affichée par le groupe « écran ».
 * Auto-détection de la table (ou via SCREEN_TABLE dans .env) + repli démo.
 *
 * Réponse :
 *   { table, text, number, raw, updated_at, demo }
 */
router.get("/screen/latest", async (_req: Request, res: Response) => {
  try {
    const tables = await listTables();

    // 1) Table explicite via .env, sinon auto-détection par mots-clés.
    const forced = process.env.SCREEN_TABLE && safeIdentifier(process.env.SCREEN_TABLE);
    let table = forced && tables.includes(forced) ? forced : undefined;
    if (!table) {
      table = tables.find((t) => {
        const low = t.toLowerCase();
        return !OWN_TABLES.has(low) && SCREEN_TABLE_HINTS.some((h) => low.includes(h));
      });
    }
    if (!table) {
      res.json({ ...demoScreen(), note: "Aucune table 'écran' détectée — données simulées. Renseigne SCREEN_TABLE dans backend/.env." });
      return;
    }

    const columns = await listColumns(table);
    const colNames = columns.map((c) => c.name);
    const timeCol = process.env.SCREEN_TIME_COLUMN || pickByHints(colNames, TIME_COLUMN_HINTS);
    const textCol = process.env.SCREEN_TEXT_COLUMN || pickByHints(colNames, TEXT_COLUMN_HINTS);
    const order = timeCol && colNames.includes(timeCol) ? `\`${timeCol}\` DESC` : `1 DESC`;

    const [rows] = await pool.query(`SELECT * FROM \`${table}\` ORDER BY ${order} LIMIT 1`);
    const list = rows as Record<string, unknown>[];
    if (list.length === 0) {
      res.json({ ...demoScreen(), note: `Table '${table}' vide — données simulées.` });
      return;
    }

    const row = list[0];
    const text = textCol && row[textCol] != null ? String(row[textCol]) : firstStringValue(row);
    const number = extractNumber(row);
    const updated_at = timeCol && row[timeCol] != null ? row[timeCol] : null;

    res.json({ demo: false, table, text, number, updated_at, raw: row });
  } catch (err) {
    res.json({ ...demoScreen(), note: `Base injoignable (${(err as Error).message}) — données simulées.` });
  }
});

/**
 * GET /api/external/sound/random?n=1
 * Tire n mesures RÉELLES au hasard du capteur de son (groupe 8C).
 * Le flux n'étant plus alimenté en direct, on s'appuie sur l'historique réel.
 */
router.get("/sound/random", async (req: Request, res: Response) => {
  const n = Math.min(Number(req.query.n) || 1, 20);
  try {
    const [rows] = await pool.query(
      `SELECT hertz, decibels, note, ts FROM \`${SOUND_TABLE}\`
        WHERE note IS NOT NULL ORDER BY RAND() LIMIT ?`,
      [n]
    );
    const list = rows as Record<string, unknown>[];
    if (list.length === 0) {
      res.json({ demo: true, table: SOUND_TABLE, rows: Array.from({ length: n }, demoSound) });
      return;
    }
    res.json({ demo: false, table: SOUND_TABLE, rows: list });
  } catch (err) {
    res.json({ demo: true, table: SOUND_TABLE, note: (err as Error).message, rows: Array.from({ length: n }, demoSound) });
  }
});

/** GET /api/external/sound/latest — dernière mesure du capteur de son. */
router.get("/sound/latest", async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(`SELECT hertz, decibels, note, ts FROM \`${SOUND_TABLE}\` ORDER BY ts DESC LIMIT 1`);
    const list = rows as Record<string, unknown>[];
    res.json(list.length ? { demo: false, table: SOUND_TABLE, ...list[0] } : { demo: true, table: SOUND_TABLE, ...demoSound() });
  } catch (err) {
    res.json({ demo: true, table: SOUND_TABLE, error: (err as Error).message, ...demoSound() });
  }
});

/**
 * GET /api/external/sound/quiz
 * Une question prête à l'emploi : une fréquence réelle + 4 notes au choix.
 */
router.get("/sound/quiz", async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(
      `SELECT hertz, decibels, note FROM \`${SOUND_TABLE}\` WHERE note IS NOT NULL ORDER BY RAND() LIMIT 1`
    );
    const list = rows as { hertz: number; decibels: number; note: string }[];
    if (list.length === 0) throw new Error("table vide");
    const answer = list[0].note;

    const [noteRows] = await pool.query(
      `SELECT DISTINCT note FROM \`${SOUND_TABLE}\` WHERE note IS NOT NULL AND note <> ? LIMIT 50`,
      [answer]
    );
    const others = (noteRows as { note: string }[]).map((r) => r.note);
    const distractors = shuffle(others.length >= 3 ? others : NOTE_POOL.filter((x) => x !== answer)).slice(0, 3);
    const options = shuffle([answer, ...distractors]);
    res.json({ demo: false, hertz: list[0].hertz, decibels: list[0].decibels, answer, options });
  } catch (err) {
    const d = demoSound();
    const distractors = shuffle(NOTE_POOL.filter((x) => x !== d.note)).slice(0, 3);
    res.json({ demo: true, note: (err as Error).message, hertz: d.hertz, decibels: d.decibels, answer: d.note, options: shuffle([d.note, ...distractors]) });
  }
});

// Mapping RGB (HIGH/LOW) → couleur, pour la LED du groupe 8E (g8e_led_control).
const RGB_COLORS: Record<string, { couleur: string; hex: string }> = {
  "HIGH,LOW,LOW": { couleur: "ROUGE", hex: "#ef4444" },
  "LOW,HIGH,LOW": { couleur: "VERT", hex: "#22c55e" },
  "LOW,LOW,HIGH": { couleur: "BLEU", hex: "#3b82f6" },
  "HIGH,HIGH,LOW": { couleur: "JAUNE", hex: "#eab308" },
  "LOW,HIGH,HIGH": { couleur: "CYAN", hex: "#06b6d4" },
  "HIGH,LOW,HIGH": { couleur: "MAGENTA", hex: "#d946ef" },
  "HIGH,HIGH,HIGH": { couleur: "BLANC", hex: "#f8fafc" },
  "LOW,LOW,LOW": { couleur: "OFF", hex: "#111827" },
};

/** GET /api/external/led/latest — dernière commande LED RGB (groupe 8E). */
router.get("/led/latest", async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(`SELECT expediteur, r, g, b, date_envoi FROM g8e_led_control ORDER BY id DESC LIMIT 1`);
    const list = rows as { expediteur: string; r: string; g: string; b: string; date_envoi: string }[];
    if (list.length === 0) throw new Error("table vide");
    const row = list[0];
    const key = `${row.r},${row.g},${row.b}`;
    const col = RGB_COLORS[key] || { couleur: "?", hex: "#64748b" };
    res.json({ demo: false, expediteur: row.expediteur, r: row.r, g: row.g, b: row.b, ...col, date_envoi: row.date_envoi });
  } catch (err) {
    res.json({ demo: true, error: (err as Error).message, expediteur: "demo", r: "HIGH", g: "LOW", b: "LOW", couleur: "ROUGE", hex: "#ef4444", date_envoi: null });
  }
});

/** GET /api/external/color/latest — couleur LED en direct (groupe 8E). */
router.get("/color/latest", async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(`SELECT couleur, couleur_html, updated_at FROM \`${COLOR_TABLE}\` ORDER BY updated_at DESC LIMIT 1`);
    const list = rows as Record<string, unknown>[];
    res.json(list.length ? { demo: false, table: COLOR_TABLE, ...list[0] } : { demo: true, table: COLOR_TABLE, couleur: "OFF", couleur_html: "#000000", updated_at: null });
  } catch (err) {
    res.json({ demo: true, table: COLOR_TABLE, note: (err as Error).message, couleur: "OFF", couleur_html: "#000000", updated_at: null });
  }
});

/** GET /api/external/state/latest — état courant (groupe 8B). */
router.get("/state/latest", async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(`SELECT etat, last_change FROM \`${STATE_TABLE}\` ORDER BY id DESC LIMIT 1`);
    const list = rows as Record<string, unknown>[];
    res.json(list.length ? { demo: false, table: STATE_TABLE, ...list[0] } : { demo: true, table: STATE_TABLE, etat: 0, last_change: null });
  } catch (err) {
    res.json({ demo: true, table: STATE_TABLE, note: (err as Error).message, etat: 0, last_change: null });
  }
});

/**
 * GET /api/external/sensors
 * Photo instantanée de TOUS les capteurs voisins (son, LED, état, écran).
 * Utilisé par le « Quiz du Hangar » et un panneau de supervision.
 */
router.get("/sensors", async (_req: Request, res: Response) => {
  const out: Record<string, unknown> = {};
  try {
    const [s] = await pool.query(`SELECT hertz, decibels, note, ts FROM \`${SOUND_TABLE}\` ORDER BY ts DESC LIMIT 1`);
    out.sound = (s as unknown[])[0] ?? null;
  } catch { out.sound = null; }
  try {
    const [c] = await pool.query(`SELECT couleur, couleur_html, updated_at FROM \`${COLOR_TABLE}\` ORDER BY updated_at DESC LIMIT 1`);
    out.color = (c as unknown[])[0] ?? null;
  } catch { out.color = null; }
  try {
    const [e] = await pool.query(`SELECT etat, last_change FROM \`${STATE_TABLE}\` ORDER BY id DESC LIMIT 1`);
    out.state = (e as unknown[])[0] ?? null;
  } catch { out.state = null; }
  try {
    const [d] = await pool.query(`SELECT expediteur, titre, message, ts FROM \`g8d_oled_messages\` ORDER BY ts DESC LIMIT 1`);
    out.screen = (d as unknown[])[0] ?? null;
  } catch { out.screen = null; }
  res.json(out);
});

function firstStringValue(row: Record<string, unknown>): string | null {
  for (const v of Object.values(row)) {
    if (typeof v === "string" && v.trim() !== "") return v;
  }
  return null;
}

function demoScreen() {
  const text = DEMO_SCREEN_MESSAGES[Math.floor(Math.random() * DEMO_SCREEN_MESSAGES.length)];
  const m = text.match(/-?\d+(\.\d+)?/);
  return {
    demo: true,
    table: "ecran_messages (démo)",
    text,
    number: m ? Number(m[0]) : null,
    updated_at: new Date().toISOString(),
    raw: { id: Math.floor(Math.random() * 1000), message: text, cree_at: new Date().toISOString() },
  };
}

export default router;
