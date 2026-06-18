import { useState, useEffect, useRef } from "react";
import { useLiveDistance } from "@/hooks/useLiveDistance";
import api from "@/api/client";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { TARGET_MIN, TARGET_MAX } from "@/games/range";
import Leaderboard from "@/components/Leaderboard";

const DURATION = 30;
const SAMPLES = 150; // 5/s × 30s

function generateTarget(): number[] {
  const pts: number[] = [];
  let v = (TARGET_MIN + TARGET_MAX) / 2;
  for (let i = 0; i < SAMPLES; i++) {
    v += (Math.random() - 0.5) * 12;
    v = Math.max(TARGET_MIN, Math.min(TARGET_MAX, v));
    pts.push(Math.round(v));
  }
  return pts;
}

type Phase = "waiting" | "countdown" | "playing" | "result";

export default function MaestroGame() {
  const [phase, setPhase] = useState<Phase>("waiting");
  const [target, setTarget] = useState<number[]>([]);
  const [actual, setActual] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [countdown, setCountdown] = useState(3);
  const [playerName, setPlayerName] = useState("");
  const [saved, setSaved] = useState(false);
  const [lbKey, setLbKey] = useState(0);

  const { measurement } = useLiveDistance(1, 200);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sampleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const localActual = useRef<number[]>([]);

  // Dernière mesure connue (l'échantillonnage lisait sinon une mesure figée).
  const latestRef = useRef<number | null>(null);
  useEffect(() => {
    if (measurement) latestRef.current = measurement.distance_cm;
  }, [measurement]);

  function start() {
    const t = generateTarget();
    setTarget(t);
    setActual([]);
    localActual.current = [];
    setPhase("countdown");
    setSaved(false);
    let c = 3;
    setCountdown(3);
    const id = setInterval(() => {
      c -= 1;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(id);
        startPlaying(t);
      }
    }, 1000);
  }

  function startPlaying(t: number[]) {
    setPhase("playing");
    setTimeLeft(DURATION);
    const startMs = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startMs) / 1000;
      setTimeLeft(Math.max(0, DURATION - elapsed));
      if (elapsed >= DURATION) {
        clearInterval(intervalRef.current!);
        clearInterval(sampleRef.current!);
        const a = localActual.current;
        const minLen = Math.min(a.length, t.length);
        const mae = minLen > 0
          ? a.slice(0, minLen).reduce((sum, v, i) => sum + Math.abs(v - t[i]), 0) / minLen
          : 400;
        const s = Math.max(0, Math.round(1000 - mae * 3));
        setScore(s);
        setActual([...a]);
        setPhase("result");
      }
    }, 100);

    sampleRef.current = setInterval(() => {
      if (latestRef.current !== null) {
        localActual.current.push(latestRef.current);
        setActual([...localActual.current]);
      }
    }, 200);
  }

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (sampleRef.current) clearInterval(sampleRef.current);
  }, []);

  async function saveScore() {
    if (!playerName.trim()) return;
    const minLen = Math.min(actual.length, target.length);
    const mae = minLen > 0
      ? actual.slice(0, minLen).reduce((s, v, i) => s + Math.abs(v - target[i]), 0) / minLen
      : 0;
    await api.post("/games/scores", {
      jeu: "maestro",
      joueur: playerName.trim(),
      score,
      details: { mae: mae.toFixed(2), samples: actual.length },
    });
    setSaved(true);
    setLbKey((k) => k + 1);
  }

  const chartData = target.map((t, i) => ({
    i,
    target: t,
    actual: actual[i] ?? null,
  }));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Le Maestro</h1>
        <p className="text-slate-500 text-sm mt-1">
          Suis la courbe bleue avec ta main. Tu as {DURATION} secondes.
        </p>
      </div>

      {phase === "waiting" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4">
          <p className="text-slate-600">Une courbe cible aléatoire sera générée. Reproduis-la avec ta main !</p>
          <button onClick={start} className="px-8 py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition">
            Jouer
          </button>
        </div>
      )}

      {phase === "countdown" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
          <p className="text-slate-500">Prépare-toi…</p>
          <p className="text-6xl font-bold text-slate-800">{countdown}</p>
        </div>
      )}

      {(phase === "playing" || phase === "result") && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <p className="font-semibold text-slate-700">Courbe en temps réel</p>
            <p className="text-sm text-slate-500">{timeLeft.toFixed(1)} s</p>
          </div>

          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 transition-all duration-100"
              style={{ width: `${((DURATION - timeLeft) / DURATION) * 100}%` }}
            />
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="i" hide />
              <YAxis domain={[0, 90]} tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `${v}cm`} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend />
              <Line type="monotone" dataKey="target" stroke="#3b82f6" strokeWidth={2} dot={false} name="Cible" />
              <Line type="monotone" dataKey="actual" stroke="#ef4444" strokeWidth={2} dot={false} name="Ta main" isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>

          {phase === "result" && (
            <div className="text-center space-y-3 pt-4">
              <p className="text-5xl font-bold tabular-nums">{score} pts</p>
              <input
                type="text"
                placeholder="Ton pseudo"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              {saved ? (
                <p className="text-emerald-600 text-sm font-medium">Score sauvegardé ✓</p>
              ) : (
                <button onClick={saveScore} disabled={!playerName.trim()} className="w-full bg-brand-600 text-white rounded-lg py-2.5 font-medium hover:bg-brand-700 transition disabled:opacity-40">
                  Sauvegarder
                </button>
              )}
              <button onClick={start} className="w-full border border-slate-200 rounded-lg py-2.5 text-sm hover:bg-slate-50 transition">
                Rejouer
              </button>
            </div>
          )}
        </div>
      )}

      <Leaderboard jeu="maestro" refreshKey={lbKey} />
    </div>
  );
}
