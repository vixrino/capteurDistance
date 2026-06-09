import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db/connection";

const router = Router();

/**
 * POST /api/auth/register
 * Body: { username, email, password }
 */
router.post("/register", async (req: Request, res: Response) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    res.status(400).json({ error: "Champs manquants" });
    return;
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      "INSERT INTO distance_users (username, email, password_hash) VALUES (?, ?, ?)",
      [username, email, hash]
    );
    const insertId = (result as { insertId: number }).insertId;
    const token = jwt.sign(
      { userId: insertId, username },
      process.env.JWT_SECRET!,
      { expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as `${number}${"s"|"m"|"h"|"d"}` }
    );
    res.status(201).json({ token, user: { id: insertId, username, email } });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e.code === "ER_DUP_ENTRY") {
      res.status(409).json({ error: "Nom d'utilisateur ou email déjà utilisé" });
    } else if (e.code === "ER_ACCESS_DENIED_ERROR" || e.code === "ECONNREFUSED" || e.code === "ENOTFOUND") {
      console.error("Erreur register BDD:", e.message);
      res.status(503).json({ error: "Base de données inaccessible. Vérifie backend/.env ou la connexion réseau." });
    } else {
      throw err;
    }
  }
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Champs manquants" });
    return;
  }
  try {
    const [rows] = await pool.execute(
      "SELECT id, username, email, password_hash FROM distance_users WHERE email = ?",
      [email]
    );
    const users = rows as { id: number; username: string; email: string; password_hash: string }[];
    if (users.length === 0) {
      res.status(401).json({ error: "Email ou mot de passe incorrect" });
      return;
    }
    const user = users[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Email ou mot de passe incorrect" });
      return;
    }
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET!,
      { expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as `${number}${"s"|"m"|"h"|"d"}` }
    );
    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    console.error("Erreur login BDD:", e.message);
    if (e.code === "ER_ACCESS_DENIED_ERROR" || e.code === "ECONNREFUSED" || e.code === "ENOTFOUND") {
      res.status(503).json({ error: "Base de données inaccessible. Vérifie backend/.env ou la connexion réseau." });
      return;
    }
    throw err;
  }
});

export default router;
