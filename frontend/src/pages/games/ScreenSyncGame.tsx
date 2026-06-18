import { useState, useEffect, useRef } from "react";
import { useLiveDistance } from "@/hooks/useLiveDistance";
import { useScreenData } from "@/hooks/useScreenData";
import api from "@/api/client";
import { TARGET_MIN, TARGET_MAX, SENSOR_MIN, SENSOR_MAX } from "@/games/range";
import Leaderboard from "@/components/Leaderboard";

type Phase = "idle" | "playing" | "result";
const DURATION_MS = 15000;

/** Ramène la valeur de l'écran voisin dans la plage atteignable du capteur. */
function toTarget(n: number): number {
  const span = TARGET_MAX - TARGET_MIN;
  const wrapped = (Math.round(Math.abs(n)) % (span + 1)) + TARGET_MIN;
  return Math.min(TARGET_MAX, Math.max(TARGET_MIN, wrapped));
}

function pct(cm: number): number {
  return ((cm - SENSOR_MIN) / (SENSOR_MAX - SENSOR_MIN)) * 100;
}

export default function ScreenSyncGame() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [timeLeft, setTimeLeft] = useState(DURATION_MS / 1000);
  const [target, setTarget] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [avgError, setAvgError] = useState(0);
  const [playerName, setPlayerName] = useState("");
  const [saved, setSaved] = useState(false);
  const [lbKey, setLbKey] = useState(0);

  const { measurement } = useLiveDistance(1, 200);
  const { screen } = useScreenData(1000);

  const distRef = useRef<number | null>(null);
  const targetRef = useRef<number | null>(null);
  const errorsRef = useRef<number[]>([]);
  const sampleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (measurement) distRef.current = measurement.distance_cm;
  }, [measurement]);

  // Cible vivante : suit le nombre de l'écran voisin (ou la longueur de son texte).
  useEffect(() => {
    let base: number | null = null;
    if (screen?.number != null) base = screen.number;
    else if (screen?.text) base = screen.text.length * 7;
    const t = base != null ? toTarget(base) : null;
    targetRef.current = t;
    setTarget(t);
  }, [screen]);

  function start() {
    errorsRef.current = [];
    setSaved(false);
    setTimeLeft(DURATION_MS / 1000);
    setPhase("playing");

    sampleRef.current = setInterval(() => {
      const d = distRef.current;
      const t = targetRef.current;
      if (d != null && t != null) errorsRef.current.push(Math.abs(d - t));
    }, 200);

    tickRef.current = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) {
          finish();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  function finish() {
    if (sampleRef.current) clearInterval(sampleRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    const errs = errorsRef.current;
    const avg = errs.length ? errs.reduce((a, b) => a + b, 0) / errs.length : SENSOR_MAX;
    setAvgError(avg);
    setScore(Math.max(0, Math.round(1000 - avg * 15)));
    setPhase("result");
  }

  useEffect(() => () => {
    if (sampleRef.current) clearInterval(sampleRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
  }, []);

  async function saveScore() {
    if (!playerName.trim()) return;
    await api.post("/games/scores", {
      jeu: "screen_sync",
      joueur: playerName.trim(),
      score,
      details: { avg_error_cm: Number(avgError.toFixed(2)), duration_s: DURATION_MS / 1000 },
    });
    setSaved(true);
    setLbKey((k) => k + 1);
  }

  const dist = measurement?.distance_cm ?? null;
  const onTarget = dist != null && target != null && Math.abs(dist - target) < 4;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Synchro Écran</h1>
        <p className="text-slate-500 text-sm mt-1">
          L'écran du groupe voisin pilote une cible mouvante. Garde ta main dessus
          pendant 15 secondes. Plus tu colles à la cible, plus le score est haut.
        </p>
      </div>

      {/* Écran voisin en direct */}
      <div className="rounded-2xl border border-slate-200 bg-slate-900 p-4 text-center">
        <p className="text-[11px] uppercase tracking-widest text-slate-400 mb-1">
          Écran voisin · {screen?.table ?? "…"}{screen?.demo ? " (démo)" : ""}
        </p>
        <p className="font-mono text-2xl text-emerald-400 break-words min-h-[2rem]">
          {screen?.text ?? "—"}
        </p>
      </div>

      {/* Piste cible / position */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div className="flex justify-between text-sm text-slate-500">
          <span>Cible : <strong className="text-brand-600">{target != null ? `${target} cm` : "…"}</strong></span>
          <span>Toi : <strong className={onTarget ? "text-emerald-600" : "text-slate-700"}>{dist != null ? `${dist.toFixed(0)} cm` : "…"}</strong></span>
        </div>
        <div className="relative h-10 rounded-lg bg-slate-100 overflow-hidden">
          {target != null && (
            <div className="absolute top-0 bottom-0 w-1.5 bg-brand-500 rounded" style={{ left: `${pct(target)}%` }} />
          )}
          {dist != null && (
            <div
              className={`absolute top-1 bottom-1 w-4 rounded-full transition-all duration-150 ${onTarget ? "bg-emerald-500" : "bg-slate-400"}`}
              style={{ left: `calc(${Math.min(100, Math.max(0, pct(dist)))}% - 8px)` }}
            />
          )}
        </div>
        <div className="flex justify-between text-[10px] text-slate-400">
          <span>{SENSOR_MIN} cm</span>
          <span>{SENSOR_MAX} cm</span>
        </div>
      </div>

      {phase === "idle" && (
        <button onClick={start} className="w-full px-8 py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition text-lg">
          Lancer les 15 secondes
        </button>
      )}

      {phase === "playing" && (
        <div className="text-center">
          <p className="text-4xl font-bold tabular-nums text-slate-700">{timeLeft}s</p>
          <p className="text-sm text-slate-400 mt-1">Suis la cible !</p>
        </div>
      )}

      {phase === "result" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <p className="text-slate-500 text-sm">Résultat</p>
            <p className="text-5xl font-bold tabular-nums text-slate-800">{score} pts</p>
            <p className="text-sm text-slate-500">Écart moyen : <strong>{avgError.toFixed(1)} cm</strong></p>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              placeholder="Ton pseudo"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {saved ? (
              <p className="text-emerald-600 text-sm text-center font-medium">Score sauvegardé ✓</p>
            ) : (
              <button onClick={saveScore} disabled={!playerName.trim()} className="w-full bg-brand-600 text-white rounded-lg py-2.5 font-medium hover:bg-brand-700 transition disabled:opacity-40">
                Sauvegarder
              </button>
            )}
          </div>

          <button onClick={start} className="w-full border border-slate-200 rounded-lg py-2.5 text-sm hover:bg-slate-50 transition">
            Rejouer
          </button>
        </div>
      )}

      <Leaderboard jeu="screen_sync" refreshKey={lbKey} />
    </div>
  );
}
