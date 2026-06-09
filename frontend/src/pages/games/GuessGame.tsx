import { useState, useEffect, useRef } from "react";
import { useLiveDistance } from "@/hooks/useLiveDistance";
import api from "@/api/client";
import MeasurementChart from "@/components/MeasurementChart";

type Phase = "waiting" | "playing" | "result";

function computeScore(target: number, actual: number): number {
  const diff = Math.abs(target - actual);
  if (diff === 0) return 1000;
  return Math.max(0, Math.round(1000 - diff * 10));
}

export default function GuessGame() {
  const [phase, setPhase] = useState<Phase>("waiting");
  const [target, setTarget] = useState(0);
  const [score, setScore] = useState(0);
  const [actualDist, setActualDist] = useState(0);
  const [playerName, setPlayerName] = useState("");
  const [saved, setSaved] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { measurement, history } = useLiveDistance(1, 500);

  function startGame() {
    const t = Math.round(Math.random() * 150 + 20);
    setTarget(t);
    setCountdown(3);
    setPhase("playing");
    setSaved(false);

    let c = 3;
    timerRef.current = setInterval(() => {
      c -= 1;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(timerRef.current!);
        setPhase("result");
      }
    }, 1000);
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  useEffect(() => {
    if (phase === "result" && measurement) {
      setActualDist(measurement.distance_cm);
      setScore(computeScore(target, measurement.distance_cm));
    }
  }, [phase]);

  async function saveScore() {
    if (!playerName.trim()) return;
    await api.post("/games/scores", {
      game_id: "guess",
      player_name: playerName.trim(),
      score,
      details: { target, actual: actualDist },
    });
    setSaved(true);
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Devine la distance</h1>
        <p className="text-slate-500 text-sm mt-1">Place un objet à la distance affichée. Score sur 1 000 selon ta précision.</p>
      </div>

      {phase === "waiting" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4">
          <p className="text-slate-600">Prépare-toi ! Quand tu lances, tu auras 3 secondes pour placer ton objet.</p>
          <button
            onClick={startGame}
            className="px-8 py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition text-lg"
          >
            Lancer
          </button>
        </div>
      )}

      {phase === "playing" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-6">
          <p className="text-slate-500 text-sm">Distance cible</p>
          <p className="text-6xl font-bold text-brand-600 tabular-nums">{target} cm</p>
          <div className={`text-5xl font-bold tabular-nums ${countdown <= 1 ? "text-red-500" : "text-slate-700"}`}>
            {countdown}
          </div>
          <p className="text-sm text-slate-400">Mesure actuelle : {measurement?.distance_cm.toFixed(1) ?? "…"} cm</p>
        </div>
      )}

      {phase === "result" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <p className="text-slate-500 text-sm">Résultat</p>
            <p className="text-5xl font-bold tabular-nums text-slate-800">{score} pts</p>
            <p className="text-sm text-slate-500">
              Cible : <strong>{target} cm</strong> — Mesuré : <strong>{actualDist.toFixed(1)} cm</strong> — Écart : {Math.abs(target - actualDist).toFixed(1)} cm
            </p>
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
              <button
                onClick={saveScore}
                disabled={!playerName.trim()}
                className="w-full bg-brand-600 text-white rounded-lg py-2.5 font-medium hover:bg-brand-700 transition disabled:opacity-40"
              >
                Sauvegarder
              </button>
            )}
          </div>

          <button onClick={startGame} className="w-full border border-slate-200 rounded-lg py-2.5 text-sm hover:bg-slate-50 transition">
            Rejouer
          </button>
        </div>
      )}

      {history.length > 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Courbe du capteur</h2>
          <MeasurementChart data={history} targetLine={phase !== "waiting" ? target : undefined} />
        </div>
      )}
    </div>
  );
}
