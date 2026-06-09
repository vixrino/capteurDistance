import { useState, useEffect, useRef } from "react";
import { useLiveDistance } from "@/hooks/useLiveDistance";
import api from "@/api/client";

type Phase = "idle" | "waiting" | "signal" | "result";
const TRIGGER_DIST = 20;

export default function ReflexGame() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [reactionMs, setReactionMs] = useState(0);
  const [score, setScore] = useState(0);
  const [playerName, setPlayerName] = useState("");
  const [saved, setSaved] = useState(false);
  const [attempts, setAttempts] = useState<number[]>([]);

  const signalTimeRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { measurement } = useLiveDistance(1, 100);

  function startRound() {
    setPhase("waiting");
    setSaved(false);
    const delay = 2000 + Math.random() * 4000;
    timeoutRef.current = setTimeout(() => {
      signalTimeRef.current = Date.now();
      setPhase("signal");
    }, delay);
  }

  useEffect(() => {
    if (phase === "signal" && measurement && measurement.distance_cm < TRIGGER_DIST) {
      const ms = Date.now() - signalTimeRef.current;
      const s = Math.max(0, Math.round(2000 - ms));
      setReactionMs(ms);
      setScore(s);
      setAttempts((prev) => [...prev, ms]);
      setPhase("result");
    }
  }, [measurement, phase]);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  async function saveScore() {
    if (!playerName.trim()) return;
    const best = Math.min(...attempts);
    await api.post("/games/scores", {
      game_id: "reflex",
      player_name: playerName.trim(),
      score,
      details: { reaction_ms: reactionMs, best_ms: best, attempts: attempts.length },
    });
    setSaved(true);
  }

  const bgColor =
    phase === "waiting"
      ? "bg-slate-100"
      : phase === "signal"
      ? "bg-red-500"
      : "bg-white";

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Réflexes éclair</h1>
        <p className="text-slate-500 text-sm mt-1">
          Quand l'écran passe au rouge, rapproche ta main à moins de {TRIGGER_DIST} cm du capteur le plus vite possible.
        </p>
      </div>

      <div className={`rounded-2xl border border-slate-200 p-12 text-center transition-all duration-200 ${bgColor}`}>
        {phase === "idle" && (
          <div className="space-y-4">
            <p className="text-slate-600">Tiens ta main loin du capteur et attends le signal rouge.</p>
            <button onClick={startRound} className="px-8 py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition">
              Commencer
            </button>
          </div>
        )}

        {phase === "waiting" && (
          <div className="space-y-2">
            <p className="text-2xl font-bold text-slate-500">Attendez…</p>
            <p className="text-sm text-slate-400">Distance : {measurement?.distance_cm.toFixed(0) ?? "…"} cm</p>
          </div>
        )}

        {phase === "signal" && (
          <div className="space-y-2">
            <p className="text-4xl font-black text-white">MAINTENANT !</p>
            <p className="text-sm text-red-100">Rapproche ta main !</p>
          </div>
        )}

        {phase === "result" && (
          <div className="space-y-4">
            <p className="text-5xl font-bold tabular-nums text-slate-800">{reactionMs} ms</p>
            <p className="text-slate-500 text-sm">Score : <strong>{score}</strong> pts</p>
            {attempts.length > 1 && (
              <p className="text-xs text-slate-400">
                Meilleur : {Math.min(...attempts)} ms — Moyenne : {Math.round(attempts.reduce((a, b) => a + b, 0) / attempts.length)} ms
              </p>
            )}
          </div>
        )}
      </div>

      {phase === "result" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
          <input
            type="text"
            placeholder="Ton pseudo"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {saved ? (
            <p className="text-emerald-600 text-sm font-medium text-center">Score sauvegardé ✓</p>
          ) : (
            <button onClick={saveScore} disabled={!playerName.trim()} className="w-full bg-brand-600 text-white rounded-lg py-2.5 font-medium hover:bg-brand-700 transition disabled:opacity-40">
              Sauvegarder
            </button>
          )}
          <button onClick={startRound} className="w-full border border-slate-200 rounded-lg py-2.5 text-sm hover:bg-slate-50 transition">
            Rejouer
          </button>
        </div>
      )}
    </div>
  );
}
