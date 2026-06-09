import { useState, useEffect, useRef } from "react";
import { useLiveDistance } from "@/hooks/useLiveDistance";
import api from "@/api/client";
import MeasurementChart from "@/components/MeasurementChart";
import { randomTarget } from "@/games/range";

type Phase = "waiting" | "countdown" | "playing" | "result";
const DURATION = 10;

export default function StabilityGame() {
  const [phase, setPhase] = useState<Phase>("waiting");
  const [target, setTarget] = useState(80);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [readings, setReadings] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [playerName, setPlayerName] = useState("");
  const [saved, setSaved] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const { measurement, history } = useLiveDistance(1, 200);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Dernière mesure connue, lue par l'échantillonnage (la closure du setInterval
  // capturait sinon une valeur figée → variance/score faux).
  const latestRef = useRef<number | null>(null);
  useEffect(() => {
    if (measurement) latestRef.current = measurement.distance_cm;
  }, [measurement]);

  function startCountdown() {
    const t = randomTarget();
    setTarget(t);
    setReadings([]);
    setSaved(false);
    setPhase("countdown");
    setCountdown(3);

    let c = 3;
    const id = setInterval(() => {
      c -= 1;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(id);
        startPlaying();
      }
    }, 1000);
  }

  function startPlaying() {
    setPhase("playing");
    setTimeLeft(DURATION);
    const start = Date.now();
    const local: number[] = [];

    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      setTimeLeft(Math.max(0, DURATION - elapsed));
      if (elapsed >= DURATION) {
        clearInterval(intervalRef.current!);
        const variance =
          local.length > 1
            ? local.reduce((sum, v) => sum + (v - target) ** 2, 0) / local.length
            : 0;
        const s = Math.max(0, Math.round(1000 - variance * 2));
        setScore(s);
        setPhase("result");
      }
    }, 100);

    // Sample readings
    const sampleId = setInterval(() => {
      if (latestRef.current !== null) local.push(latestRef.current);
      setReadings([...local]);
    }, 200);

    setTimeout(() => clearInterval(sampleId), DURATION * 1000 + 500);
  }

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  async function saveScore() {
    if (!playerName.trim()) return;
    const variance = readings.length > 1
      ? readings.reduce((s, v) => s + (v - target) ** 2, 0) / readings.length
      : 0;
    await api.post("/games/scores", {
      jeu: "stability",
      joueur: playerName.trim(),
      score,
      details: { target, variance: variance.toFixed(2), samples: readings.length },
    });
    setSaved(true);
  }

  const progressPct = ((DURATION - timeLeft) / DURATION) * 100;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Stabilité</h1>
        <p className="text-slate-500 text-sm mt-1">
          Maintiens ta main exactement à la distance cible pendant {DURATION} secondes.
        </p>
      </div>

      {phase === "waiting" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4">
          <p className="text-slate-600">Une distance cible aléatoire sera générée. Tiens ta main stable !</p>
          <button onClick={startCountdown} className="px-8 py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition text-lg">
            Jouer
          </button>
        </div>
      )}

      {phase === "countdown" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4">
          <p className="text-4xl font-bold text-brand-600">{target} cm</p>
          <p className="text-slate-500">Prépare ta main à cette distance…</p>
          <p className="text-6xl font-bold text-slate-700">{countdown}</p>
        </div>
      )}

      {(phase === "playing" || phase === "result") && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-slate-500 text-sm">Cible : <span className="font-bold text-slate-800">{target} cm</span></p>
            <p className="text-slate-500 text-sm">
              {phase === "playing" ? `${timeLeft.toFixed(1)} s` : "Terminé"}
            </p>
          </div>

          {/* Timer bar */}
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 transition-all duration-100"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Live value */}
          {phase === "playing" && measurement && (
            <div className="text-center">
              <p className="text-5xl font-bold tabular-nums text-slate-800">{measurement.distance_cm.toFixed(1)} cm</p>
              <p className={`text-sm mt-1 font-medium ${
                Math.abs(measurement.distance_cm - target) < 5 ? "text-emerald-600" : "text-orange-500"
              }`}>
                Écart : {(measurement.distance_cm - target).toFixed(1)} cm
              </p>
            </div>
          )}

          {phase === "result" && (
            <div className="text-center space-y-3">
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
              <button onClick={startCountdown} className="w-full border border-slate-200 rounded-lg py-2.5 text-sm hover:bg-slate-50 transition">
                Rejouer
              </button>
            </div>
          )}
        </div>
      )}

      {history.length > 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <MeasurementChart data={history} targetLine={target} />
        </div>
      )}
    </div>
  );
}
