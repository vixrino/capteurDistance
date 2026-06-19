import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import sensorRoutes from "./routes/sensors";
import measurementRoutes from "./routes/measurements";
import gameRoutes from "./routes/games";
import externalRoutes from "./routes/external";
import actuatorRoutes from "./routes/actuators";
import alertRoutes from "./routes/alerts";
import weatherRoutes from "./routes/weather";
import { errorHandler } from "./middleware/errorHandler";
import pool from "./db/connection";
import { ensureSchema } from "./db/ensureSchema";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || /^http:\/\/localhost:\d+$/.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS non autorisé"));
      }
    },
    credentials: true,
  })
);
app.use(express.json());

app.get("/api/health", async (_req, res) => {
  let db = "ok";
  let db_error: string | undefined;
  try {
    await pool.query("SELECT 1");
  } catch (err: unknown) {
    db = "error";
    db_error = err instanceof Error ? err.message : "Erreur inconnue";
  }
  res.json({
    status: db === "ok" ? "ok" : "degraded",
    db,
    db_error,
    demo_mode: process.env.DEMO_MODE === "true",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/sensors", sensorRoutes);
app.use("/api/measurements", measurementRoutes);
app.use("/api/games", gameRoutes);
app.use("/api/external", externalRoutes);
app.use("/api/actuators", actuatorRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/weather", weatherRoutes);

app.use(errorHandler);

app.listen(PORT, async () => {
  console.log(`🚀  Backend démarré sur http://localhost:${PORT}`);
  console.log(`📡  Mode démo : ${process.env.DEMO_MODE === "true" ? "activé" : "désactivé"}`);
  try {
    await ensureSchema();
    console.log("🗄️   Schéma vérifié (actionneurs, alertes, events).");
  } catch (err) {
    console.error("⚠️   ensureSchema:", (err as Error).message);
  }
});
