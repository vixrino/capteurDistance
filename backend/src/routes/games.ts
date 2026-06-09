import { Router, Request, Response } from "express";
import privatePool from "../db/connectionPrivate";

const router = Router();

const VALID_GAMES = ["guess", "stability", "reflex", "maestro", "morse"];

/**
 * GET /api/games/scores?jeu=guess&limit=10
 */
router.get("/scores", async (req: Request, res: Response) => {
  const jeu = req.query.jeu as string | undefined;
  const limit = Math.min(Number(req.query.limit) || 10, 100);

  let query = "SELECT * FROM scores";
  const params: (string | number)[] = [];

  if (jeu) {
    query += " WHERE jeu = ?";
    params.push(jeu);
  }
  query += " ORDER BY score DESC LIMIT ?";
  params.push(limit);

  const [rows] = await privatePool.execute(query, params);
  res.json(rows);
});

/**
 * POST /api/games/scores
 * Body: { jeu, joueur, score, details? }
 */
router.post("/scores", async (req: Request, res: Response) => {
  const { jeu, joueur, score, details } = req.body;

  if (!jeu || !joueur || score === undefined) {
    res.status(400).json({ error: "jeu, joueur et score sont requis" });
    return;
  }
  if (!VALID_GAMES.includes(jeu)) {
    res.status(400).json({ error: `jeu invalide. Valeurs : ${VALID_GAMES.join(", ")}` });
    return;
  }

  const [result] = await privatePool.execute(
    "INSERT INTO scores (jeu, joueur, score, details) VALUES (?, ?, ?, ?)",
    [jeu, joueur, score, details ? JSON.stringify(details) : null]
  );
  const insertId = (result as { insertId: number }).insertId;
  res.status(201).json({ id: insertId, jeu, joueur, score });
});

export default router;
