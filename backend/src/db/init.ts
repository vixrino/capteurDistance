import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

async function runSqlFile(conn: mysql.Connection, filePath: string, label: string) {
  const sql = fs.readFileSync(filePath, "utf-8");
  await conn.query(sql);
  console.log(`✅  ${label}`);
}

async function initDatabase() {
  // Connexion sans sélectionner de base (pour CREATE DATABASE)
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  });

  const publicSql  = path.join(__dirname, "../../../db/init.sql");
  const privateSql = path.join(__dirname, "../../../db/init_private.sql");

  try {
    await runSqlFile(conn, publicSql,  "Base publique  'capteur_distance'  → table mesures créée.");
    await runSqlFile(conn, privateSql, "Base privée    'capteur_private'   → tables utilisateurs + scores créées.");
  } finally {
    await conn.end();
  }

  process.exit(0);
}

initDatabase().catch((err) => {
  console.error("❌  Erreur init BDD :", err.message);
  process.exit(1);
});
