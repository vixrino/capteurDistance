import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

// Pool dédié aux données PRIVÉES de notre groupe (comptes + scores).
// Par défaut on réutilise la base partagée (hangardb), avec des tables
// préfixées `g8a_` pour ne pas entrer en conflit avec les autres équipes.
// Un vrai serveur privé peut être configuré via les variables DB_PRIVATE_*.
const privatePool = mysql.createPool({
  host: process.env.DB_PRIVATE_HOST || process.env.DB_HOST,
  port: Number(process.env.DB_PRIVATE_PORT || process.env.DB_PORT) || 3306,
  database: process.env.DB_PRIVATE_NAME || process.env.DB_NAME,
  user: process.env.DB_PRIVATE_USER || process.env.DB_USER,
  password: process.env.DB_PRIVATE_PASSWORD || process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  charset: "utf8mb4",
});

/** Nos tables privées (préfixées pour la base partagée). Surchargeables via .env. */
const ID_RE = /^[a-zA-Z0-9_]+$/;
function safeTable(name: string | undefined, fallback: string): string {
  return name && ID_RE.test(name) ? name : fallback;
}
export const USERS_TABLE = safeTable(process.env.USERS_TABLE, "g8a_users");
export const SCORES_TABLE = safeTable(process.env.SCORES_TABLE, "g8a_scores");

export default privatePool;
