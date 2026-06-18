import { useState, useEffect, useRef } from "react";
import { useLiveDistance } from "@/hooks/useLiveDistance";
import api from "@/api/client";
import { StateReading } from "@/types";
import Leaderboard from "@/components/Leaderboard";

type Phase = "idle" | "armed" | "alert" | "result";
const TRIGGER_DIST = 20;

export default function VeilleurGame() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [reactionMs, setReactionMs] = useState(0);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState<number[]>([]);
  const [etat, setEtat] = useState<StateReading | null>(null);
  const [simulated, setSimulated] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [saved, setSaved] = useState(false);
  const [lbKey, setLbKey] = useState(0);

  const phaseRef = useRef<Phase>("idle");
  const alertTimeRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevEtatRef = useRef<number | null>(null);

  const { measurement } = useLiveDistance(1, 100);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // Lecture en direct de l'état réel du capteur 8B.
  useEffect(() => {
    let alive = true;
    const fetchState = async () => {
      try {
        const { data } = await api.get<StateReading>("/external/state/latest");
        if (!alive) return;
        setEtat(data);
        // Si le vrai capteur passe en alerte pendant la phase armée → déclenche.
        if (phaseRef.current === "armed" && data.etat === 1 && prevEtatRef.current !== 1) {
          triggerAlert(false);
        }
        prevEtatRef.current = data.etat;
      } catch { /* ignore */ }
    };
    fetchState();
    const id = setInterval(fetchState, 700);
    return () => { alive = false; clearInterval(id); };
  }, []);

  function triggerAlert(isSimulated: boolean) {
    if (phaseRef.current !== "armed") return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setSimulated(isSimulated);
    alertTimeRef.current = Date.now();
    setPhase("alert");
  }

  function startRound() {
    setSaved(false);
    setPhase("armed");
    const delay = 2500 + Math.random() * 4000;
    // Le capteur 8B étant au repos, on programme une alerte simulée.
    timeoutRef.current = setTimeout(() => triggerAlert(true), delay);
  }

  useEffect(() => {
    if (phase === "alert" && measurement && measurement.distance_cm < TRIGGER_DIST) {
      const ms = Date.now() - alertTimeRef.current;
      setReactionMs(ms);
      setScore(Math.max(0, Math.round(2000 - ms)));
      setAttempts((p) => [...p, ms]);
      setPhase("result");
    }
  }, [measurement, phase]);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  async function saveScore() {
    if (!playerName.trim()) return;
    await api.post("/games/scores", {
      jeu: "state_watch",
      joueur: playerName.trim(),
      score,
      details: { reaction_ms: reactionMs, best_ms: Math.min(...attempts), simule: simulated },
    });
    setSaved(true);
    setLbKey((k) => k + 1);
  }

  const bg = phase === "armed" ? "bg-slate-100" : phase === "alert" ? "bg-red-500" : "bg-white";

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Le Veilleur</h1>
        <p className="text-slate-500 text-sm mt-1">
          Surveille le capteur d'état du groupe 8B. Quand le système passe en
          <strong> ALERTE</strong>, rapproche ta main à moins de {TRIGGER_DIST} cm le plus vite possible.
        </p>
      </div>

      {/* État réel du capteur 8B en direct */}
      <div className="rounded-2xl border border-slate-200 bg-slate-900 p-4 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-widest text-slate-400">Capteur état · g8b_etat_actuel</span>
        <span className="flex items-center gap-2 text-sm">
          <span className={`w-2.5 h-2.5 rounded-full ${etat?.etat === 1 ? "bg-red-400" : "bg-emerald-400"}`} />
          <span className="text-slate-200">{etat ? (etat.etat === 1 ? "ALERTE (1)" : "Repos (0)") : "…"}</span>
        </span>
      </div>

      <div className={`rounded-2xl border border-slate-200 p-12 text-center transition-all duration-200 ${bg}`}>
        {phase === "idle" && (
          <div className="space-y-4">
            <p className="text-slate-600">Garde ta main loin du capteur et attends le passage en alerte.</p>
            <button onClick={startRound} className="px-8 py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition">Prendre la garde</button>
          </div>
        )}
        {phase === "armed" && (
          <div className="space-y-2">
            <p className="text-2xl font-bold text-slate-500">Surveillance…</p>
            <p className="text-sm text-slate-400">Main : {measurement?.distance_cm.toFixed(0) ?? "…"} cm</p>
          </div>
        )}
        {phase === "alert" && (
          <div className="space-y-2">
            <p className="text-4xl font-black text-white">ALERTE !</p>
            <p className="text-sm text-red-100">Rapproche ta main !</p>
          </div>
        )}
        {phase === "result" && (
          <div className="space-y-3">
            <p className="text-5xl font-bold tabular-nums text-slate-800">{reactionMs} ms</p>
            <p className="text-slate-500 text-sm">Score : <strong>{score}</strong> pts {simulated && <span className="text-slate-400">· alerte simulée</span>}</p>
            {attempts.length > 1 && (
              <p className="text-xs text-slate-400">Meilleur : {Math.min(...attempts)} ms · Moyenne : {Math.round(attempts.reduce((a, b) => a + b, 0) / attempts.length)} ms</p>
            )}
          </div>
        )}
      </div>

      {phase === "result" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
          <input type="text" placeholder="Ton pseudo" value={playerName} onChange={(e) => setPlayerName(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          {saved ? (
            <p className="text-emerald-600 text-sm font-medium text-center">Score sauvegardé ✓</p>
          ) : (
            <button onClick={saveScore} disabled={!playerName.trim()} className="w-full bg-brand-600 text-white rounded-lg py-2.5 font-medium hover:bg-brand-700 transition disabled:opacity-40">Sauvegarder</button>
          )}
          <button onClick={startRound} className="w-full border border-slate-200 rounded-lg py-2.5 text-sm hover:bg-slate-50 transition">Reprendre la garde</button>
        </div>
      )}

      {etat?.etat === 0 && (
        <p className="text-xs text-slate-400 text-center">
          Le capteur 8B est actuellement au repos : les alertes sont simulées en attendant qu'il s'active réellement.
        </p>
      )}

      <Leaderboard jeu="state_watch" refreshKey={lbKey} />
    </div>
  );
}
