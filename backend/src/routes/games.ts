import { Router, Request, Response } from "express";
import pool from "../db/connection";

const router = Router();

const VALID_GAMES = ["guess", "stability", "reflex", "maestro", "morse"];

/**
 * GET /api/games/scores?game_id=guess&limit=10
 */
router.get("/scores", async (req: Request, res: Response) => {
  const gameId = req.query.game_id as string | undefined;
  const limit = Math.min(Number(req.query.limit) || 10, 100);

  let query = "SELECT * FROM distance_game_scores";
  const params: (string | number)[] = [];

  if (gameId) {
    query += " WHERE game_id = ?";
    params.push(gameId);
  }
  query += " ORDER BY score DESC LIMIT ?";
  params.push(limit);

  const [rows] = await pool.execute(query, params);
  res.json(rows);
});

/**
 * POST /api/games/scores
 * Body: { game_id, player_name, score, details? }
 */
router.post("/scores", async (req: Request, res: Response) => {
  const { game_id, player_name, score, details } = req.body;

  if (!game_id || !player_name || score === undefined) {
    res.status(400).json({ error: "game_id, player_name et score sont requis" });
    return;
  }
  if (!VALID_GAMES.includes(game_id)) {
    res.status(400).json({ error: `game_id invalide. Valeurs : ${VALID_GAMES.join(", ")}` });
    return;
  }

  const [result] = await pool.execute(
    "INSERT INTO distance_game_scores (game_id, player_name, score, details) VALUES (?, ?, ?, ?)",
    [game_id, player_name, score, details ? JSON.stringify(details) : null]
  );
  const insertId = (result as { insertId: number }).insertId;
  res.status(201).json({ id: insertId, game_id, player_name, score });
});

export default router;
