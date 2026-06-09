import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

// Pool dédié à la base PRIVÉE (utilisateurs, scores)
const privatePool = mysql.createPool({
  host: process.env.DB_PRIVATE_HOST || process.env.DB_HOST,
  port: Number(process.env.DB_PRIVATE_PORT || process.env.DB_PORT) || 3306,
  database: process.env.DB_PRIVATE_NAME,
  user: process.env.DB_PRIVATE_USER || process.env.DB_USER,
  password: process.env.DB_PRIVATE_PASSWORD || process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  charset: "utf8mb4",
});

export default privatePool;
