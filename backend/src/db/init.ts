import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

async function initDatabase() {
  // Connexion sans sélectionner la base (pour pouvoir faire CREATE DATABASE)
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  });

  const sqlPath = path.join(__dirname, "../../../db/init.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");

  try {
    await conn.query(sql);
    console.log("✅  Base 'capteur_distance' et table 'mesures' créées.");
  } finally {
    await conn.end();
  }
  process.exit(0);
}

initDatabase().catch((err) => {
  console.error("❌  Erreur init BDD :", err.message);
  process.exit(1);
});
