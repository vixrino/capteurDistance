import fs from "fs";
import path from "path";
import pool from "./connection";

async function initDatabase() {
  const sqlPath = path.join(__dirname, "../../../db/init.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");

  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const conn = await pool.getConnection();
  try {
    for (const stmt of statements) {
      await conn.execute(stmt);
    }
    console.log("✅  Tables distance_* créées avec succès.");
  } finally {
    conn.release();
  }
  process.exit(0);
}

initDatabase().catch((err) => {
  console.error("❌  Erreur init BDD :", err);
  process.exit(1);
});
