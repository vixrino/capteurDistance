import { useState, useEffect, useRef } from "react";
import { useLiveDistance } from "@/hooks/useLiveDistance";
import api from "@/api/client";
import { TARGET_MIN, TARGET_MAX } from "@/games/range";
import { SoundReading } from "@/types";

type Phase = "waiting" | "playing" | "result";

const HZ_MIN = 80;
const HZ_MAX = 1573;

/** Fréquence du capteur de son (8C) → distance cible (grave = proche, aigu = loin). */
function hzToTarget(hz: number): number {
  const r = (Math.min(HZ_MAX, Math.max(HZ_MIN, hz)) - HZ_MIN) / (HZ_MAX - HZ_MIN);
  return Math.round(TARGET_MIN + r * (TARGET_MAX - TARGET_MIN));
}

function computeScore(target: number, actual: number): number {
  const diff = Math.abs(target - actual);
  return diff === 0 ? 1000 : Math.max(0, Math.round(1000 - diff * 10));
}

export default function DiapasonGame() {
  const [phase, setPhase] = useState<Phase>("waiting");
  const [sound, setSound] = useState<SoundReading | null>(null);
  const [target, setTarget] = useState(0);
  const [score, setScore] = useState(0);
  const [actualDist, setActualDist] = useState(0);
  const [playerName, setPlayerName] = useState("");
  const [saved, setSaved] = useState(false);
  const [countdown, setCountdown] = useState(4);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { measurement } = useLiveDistance(1, 300);
  const latestRef = useRef<number | null>(null);
  useEffect(() => { if (measurement) latestRef.current = measurement.distance_cm; }, [measurement]);

  async function startGame() {
    setSaved(false);
    let reading: SoundReading;
    try {
      const { data } = await api.get<{ rows: SoundReading[] }>("/external/sound/random?n=1");
      reading = data.rows[0];
    } catch {
      reading = { hertz: HZ_MIN + Math.random() * (HZ_MAX - HZ_MIN), decibels: 80, note: "?" };
    }
    setSound(reading);
    setTarget(hzToTarget(reading.hertz));
    setCountdown(4);
    setPhase("playing");

    let c = 4;
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
    if (phase === "result") {
      const d = latestRef.current;
      if (d === null) return;
      setActualDist(d);
      setScore(computeScore(target, d));
    }
  }, [phase, target]);

  async function saveScore() {
    if (!playerName.trim()) return;
    await api.post("/games/scores", {
      jeu: "sound_pitch",
      joueur: playerName.trim(),
      score,
      details: { note: sound?.note, hertz: sound?.hertz, target, actual: actualDist },
    });
    setSaved(true);
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Diapason</h1>
        <p className="text-slate-500 text-sm mt-1">
          Le capteur de son du groupe 8C fournit une vraie note. Son <strong>aigu</strong> = main loin,
          son <strong>grave</strong> = main proche. Place ta main à la bonne distance.
        </p>
      </div>

      {sound && (
        <div className="rounded-2xl border border-slate-200 bg-slate-900 p-5 text-center">
          <p className="text-[11px] uppercase tracking-widest text-slate-400 mb-2">Capteur son · g8c_mesures</p>
          <p className="font-mono text-4xl text-emerald-400">{sound.note}</p>
          <p className="text-slate-400 text-sm mt-1">{sound.hertz.toFixed(0)} Hz · {sound.decibels.toFixed(0)} dB</p>
        </div>
      )}

      {phase === "waiting" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4">
          <p className="text-slate-600">Au lancement, une note réelle du capteur 8C devient ta cible. 4 secondes pour te placer.</p>
          <button onClick={startGame} className="px-8 py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition text-lg">
            Lancer
          </button>
        </div>
      )}

      {phase === "playing" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-6">
          <p className="text-slate-500 text-sm">Distance cible (selon la note)</p>
          <p className="text-6xl font-bold text-brand-600 tabular-nums">{target} cm</p>
          <div className={`text-5xl font-bold tabular-nums ${countdown <= 1 ? "text-red-500" : "text-slate-700"}`}>{countdown}</div>
          <p className="text-sm text-slate-400">Mesure actuelle : {measurement?.distance_cm.toFixed(1) ?? "…"} cm</p>
        </div>
      )}

      {phase === "result" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <p className="text-slate-500 text-sm">Résultat</p>
            <p className="text-5xl font-bold tabular-nums text-slate-800">{score} pts</p>
            <p className="text-sm text-slate-500">
              Note <strong>{sound?.note}</strong> → cible <strong>{target} cm</strong> — mesuré <strong>{actualDist.toFixed(1)} cm</strong>
            </p>
          </div>
          <div className="space-y-2">
            <input type="text" placeholder="Ton pseudo" value={playerName} onChange={(e) => setPlayerName(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            {saved ? (
              <p className="text-emerald-600 text-sm text-center font-medium">Score sauvegardé ✓</p>
            ) : (
              <button onClick={saveScore} disabled={!playerName.trim()} className="w-full bg-brand-600 text-white rounded-lg py-2.5 font-medium hover:bg-brand-700 transition disabled:opacity-40">
                Sauvegarder
              </button>
            )}
          </div>
          <button onClick={startGame} className="w-full border border-slate-200 rounded-lg py-2.5 text-sm hover:bg-slate-50 transition">Rejouer</button>
        </div>
      )}
    </div>
  );
}
