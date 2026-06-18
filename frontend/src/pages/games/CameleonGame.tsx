import { useState, useEffect, useRef } from "react";
import { useLiveDistance } from "@/hooks/useLiveDistance";
import api from "@/api/client";
import { LedReading } from "@/types";
import Leaderboard from "@/components/Leaderboard";

type Phase = "waiting" | "playing" | "result";

interface Zone { couleur: string; hex: string; min: number; max: number; }

// Vocabulaire de couleurs de la LED RGB du groupe 8E → zones de distance.
const ZONES: Zone[] = [
  { couleur: "ROUGE", hex: "#ef4444", min: 15, max: 25 },
  { couleur: "JAUNE", hex: "#eab308", min: 25, max: 35 },
  { couleur: "VERT", hex: "#22c55e", min: 35, max: 45 },
  { couleur: "CYAN", hex: "#06b6d4", min: 45, max: 55 },
  { couleur: "BLEU", hex: "#3b82f6", min: 55, max: 65 },
  { couleur: "MAGENTA", hex: "#d946ef", min: 65, max: 75 },
];

export default function CameleonGame() {
  const [phase, setPhase] = useState<Phase>("waiting");
  const [zone, setZone] = useState<Zone | null>(null);
  const [led, setLed] = useState<LedReading | null>(null);
  const [actualDist, setActualDist] = useState(0);
  const [score, setScore] = useState(0);
  const [inBand, setInBand] = useState(false);
  const [countdown, setCountdown] = useState(6);
  const [playerName, setPlayerName] = useState("");
  const [saved, setSaved] = useState(false);
  const [lbKey, setLbKey] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { measurement } = useLiveDistance(1, 300);
  const latestRef = useRef<number | null>(null);
  useEffect(() => { if (measurement) latestRef.current = measurement.distance_cm; }, [measurement]);

  useEffect(() => {
    api.get<LedReading>("/external/led/latest").then(({ data }) => setLed(data)).catch(() => {});
  }, []);

  function startGame() {
    const z = ZONES[Math.floor(Math.random() * ZONES.length)];
    setZone(z);
    setCountdown(6);
    setPhase("playing");
    setSaved(false);

    let c = 6;
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
    if (phase === "result" && zone) {
      const d = latestRef.current ?? 0;
      setActualDist(d);
      const center = (zone.min + zone.max) / 2;
      const ok = d >= zone.min && d <= zone.max;
      setInBand(ok);
      setScore(Math.max(0, Math.round(1000 - Math.abs(d - center) * 40)));
    }
  }, [phase, zone]);

  async function saveScore() {
    if (!playerName.trim()) return;
    await api.post("/games/scores", {
      jeu: "color_zone",
      joueur: playerName.trim(),
      score,
      details: { couleur: zone?.couleur, zone: `${zone?.min}-${zone?.max}`, actual: actualDist },
    });
    setSaved(true);
    setLbKey((k) => k + 1);
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Caméléon</h1>
        <p className="text-slate-500 text-sm mt-1">
          Chaque couleur de la LED du groupe 8E correspond à une zone de distance.
          Une couleur s'affiche : place ta main dans la bonne zone.
        </p>
      </div>

      {/* LED voisine en direct */}
      <div className="rounded-2xl border border-slate-200 bg-slate-900 p-4 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-widest text-slate-400">LED voisine · g8e_led_control</span>
        <span className="flex items-center gap-2 text-slate-200 text-sm">
          <span className="w-4 h-4 rounded-full border border-slate-600" style={{ backgroundColor: led?.hex ?? "#111827" }} />
          {led?.couleur ?? "…"}{led?.expediteur ? ` (par ${led.expediteur})` : ""}
        </span>
      </div>

      {/* Légende couleur → zone */}
      <div className="grid grid-cols-3 gap-2">
        {ZONES.map((z) => (
          <div key={z.couleur} className="flex items-center gap-2 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg px-2 py-1.5">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: z.hex }} />
            {z.min}–{z.max} cm
          </div>
        ))}
      </div>

      {phase === "waiting" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4">
          <p className="text-slate-600">Une couleur va s'afficher. Tu as 6 secondes pour placer ta main dans la zone correspondante.</p>
          <button onClick={startGame} className="px-8 py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition text-lg">Lancer</button>
        </div>
      )}

      {phase === "playing" && zone && (
        <div className="rounded-2xl p-8 text-center space-y-5 transition-colors" style={{ backgroundColor: zone.hex }}>
          <p className="text-white/90 text-sm font-medium uppercase tracking-widest drop-shadow">Couleur cible</p>
          <p className="text-5xl font-black text-white drop-shadow">{zone.couleur}</p>
          <p className="text-white/90 text-sm drop-shadow">Zone {zone.min}–{zone.max} cm</p>
          <div className="text-6xl font-bold tabular-nums text-white drop-shadow">{countdown}</div>
          <p className="text-white/90 text-sm drop-shadow">Main : {measurement?.distance_cm.toFixed(0) ?? "…"} cm</p>
        </div>
      )}

      {phase === "result" && zone && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <p className="text-slate-500 text-sm">Résultat</p>
            <p className="text-5xl font-bold tabular-nums text-slate-800">{score} pts</p>
            <p className={`text-sm font-medium ${inBand ? "text-emerald-600" : "text-red-500"}`}>
              {inBand ? "Dans la zone !" : "Hors zone"} — {zone.couleur} ({zone.min}–{zone.max} cm) · mesuré {actualDist.toFixed(1)} cm
            </p>
          </div>
          <div className="space-y-2">
            <input type="text" placeholder="Ton pseudo" value={playerName} onChange={(e) => setPlayerName(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            {saved ? (
              <p className="text-emerald-600 text-sm text-center font-medium">Score sauvegardé ✓</p>
            ) : (
              <button onClick={saveScore} disabled={!playerName.trim()} className="w-full bg-brand-600 text-white rounded-lg py-2.5 font-medium hover:bg-brand-700 transition disabled:opacity-40">Sauvegarder</button>
            )}
          </div>
          <button onClick={startGame} className="w-full border border-slate-200 rounded-lg py-2.5 text-sm hover:bg-slate-50 transition">Rejouer</button>
        </div>
      )}

      <Leaderboard jeu="color_zone" refreshKey={lbKey} />
    </div>
  );
}
