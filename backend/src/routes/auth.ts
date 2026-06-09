import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import privatePool from "../db/connectionPrivate";

const router = Router();

function createToken(userId: number, username: string) {
  return jwt.sign(
    { userId, username },
    process.env.JWT_SECRET!,
    { expiresIn: (process.env.JWT_EXPIRES_IN || "7d") as `${number}${"s"|"m"|"h"|"d"}` }
  );
}

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

  if (process.env.DEMO_MODE === "true") {
    const user = { id: 1, username, email };
    res.status(201).json({ token: createToken(user.id, user.username), user, demo: true });
    return;
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await privatePool.execute(
      "INSERT INTO utilisateurs (username, email, password_hash) VALUES (?, ?, ?)",
      [username, email, hash]
    );
    const insertId = (result as { insertId: number }).insertId;
    res.status(201).json({ token: createToken(insertId, username), user: { id: insertId, username, email } });
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

  if (process.env.DEMO_MODE === "true") {
    const username = email.split("@")[0] || "demo";
    const user = { id: 1, username, email };
    res.json({ token: createToken(user.id, user.username), user, demo: true });
    return;
  }

  try {
    const [rows] = await privatePool.execute(
      "SELECT id, username, email, password_hash FROM utilisateurs WHERE email = ?",
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
    res.json({ token: createToken(user.id, user.username), user: { id: user.id, username: user.username, email: user.email } });
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
