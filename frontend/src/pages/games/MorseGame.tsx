import { useState, useEffect, useRef } from "react";
import { useLiveDistance } from "@/hooks/useLiveDistance";
import api from "@/api/client";

const MORSE_TABLE: Record<string, string> = {
  A:".-", B:"-...", C:"-.-.", D:"-..", E:".", F:"..-.", G:"--.", H:"....",
  I:"..", J:".---", K:"-.-", L:".-..", M:"--", N:"-.", O:"---", P:".--.",
  Q:"--.-", R:".-.", S:"...", T:"-", U:"..-", V:"...-", W:".--", X:"-..-",
  Y:"-.--", Z:"--..",
};

const WORDS = ["ISEP", "TIVA", "LASER", "CODE", "SIGNAL", "ONDE", "RADAR"];

// Bandes calées sur la plage réelle du capteur (10–80 cm) :
const NEAR = 30;   // 10–30 cm  = point
const FAR = 60;    // 30–60 cm  = tiret
const SPACE = 60;  // > 60 cm   = espace (fin de lettre)

function distToSymbol(d: number): "." | "-" | " " | null {
  if (d < NEAR) return ".";
  if (d < FAR) return "-";
  if (d > SPACE) return " ";
  return null;
}

export default function MorseGame() {
  const [word, setWord] = useState("");
  const [expected, setExpected] = useState("");
  const [typed, setTyped] = useState("");
  const [decoded, setDecoded] = useState("");
  const [phase, setPhase] = useState<"waiting" | "playing" | "result">("waiting");
  const [score, setScore] = useState(0);
  const [playerName, setPlayerName] = useState("");
  const [saved, setSaved] = useState(false);
  const [lastSymbol, setLastSymbol] = useState<string | null>(null);

  const { measurement } = useLiveDistance(1, 200);
  const prevSymbolRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startGame() {
    const w = WORDS[Math.floor(Math.random() * WORDS.length)];
    const morse = w.split("").map((c) => MORSE_TABLE[c] ?? "").join(" ");
    setWord(w);
    setExpected(morse);
    setTyped("");
    setDecoded("");
    setPhase("playing");
    setSaved(false);
    prevSymbolRef.current = null;
  }

  useEffect(() => {
    if (phase !== "playing" || !measurement) return;
    const sym = distToSymbol(measurement.distance_cm);
    setLastSymbol(sym);

    if (sym !== null && sym !== prevSymbolRef.current) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        prevSymbolRef.current = sym;
        setTyped((prev) => {
          const next = prev + sym;
          const letters = next.split(" ").map((code) => {
            const entry = Object.entries(MORSE_TABLE).find(([, v]) => v === code.trim());
            return entry ? entry[0] : "?";
          });
          setDecoded(letters.join(""));
          return next;
        });
      }, 300);
    }
  }, [measurement, phase]);

  function submitResult() {
    const match = decoded.split("").filter((c, i) => c === word[i]).length;
    const s = Math.round((match / word.length) * 1000);
    setScore(s);
    setPhase("result");
  }

  async function saveScore() {
    if (!playerName.trim()) return;
    await api.post("/games/scores", {
      jeu: "morse",
      joueur: playerName.trim(),
      score,
      details: { word, typed, decoded },
    });
    setSaved(true);
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Distance Morse</h1>
        <p className="text-slate-500 text-sm mt-1">
          Encode le mot affiché en Morse avec ta main : &lt;{NEAR}cm = point · {NEAR}–{FAR}cm = tiret · &gt;{SPACE}cm = espace lettre
        </p>
      </div>

      {/* Legend */}
      <div className="flex gap-3 text-xs">
        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-mono">{"< " + NEAR + " cm → ."}</span>
        <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded-lg font-mono">{NEAR + "–" + FAR + " cm → –"}</span>
        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-mono">{">" + SPACE + " cm → espace"}</span>
      </div>

      {phase === "waiting" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4">
          <p className="text-slate-600">Encode un mot en Morse en bougeant ta main à différentes distances.</p>
          <button onClick={startGame} className="px-8 py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition">
            Lancer
          </button>
        </div>
      )}

      {phase === "playing" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <div className="text-center">
            <p className="text-xs text-slate-400 mb-1">Mot à encoder</p>
            <p className="text-4xl font-bold tracking-widest text-slate-800">{word}</p>
            <p className="text-sm font-mono text-slate-500 mt-1">{expected}</p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-24 shrink-0">Distance</span>
              <span className="font-mono text-sm font-bold">{measurement?.distance_cm.toFixed(0) ?? "…"} cm</span>
              {lastSymbol !== null && (
                <span className="ml-auto font-mono text-lg font-black text-brand-600">{lastSymbol === " " ? "[ ]" : lastSymbol}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-24 shrink-0">Morse tapé</span>
              <span className="font-mono text-sm break-all">{typed || "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-24 shrink-0">Décodé</span>
              <span className="font-bold text-lg tracking-widest">{decoded || "—"}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setTyped((p) => p.slice(0, -1))}
              className="flex-1 border border-slate-200 rounded-lg py-2 text-sm hover:bg-slate-50 transition"
            >
              Effacer dernier
            </button>
            <button
              onClick={submitResult}
              className="flex-1 bg-brand-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-brand-700 transition"
            >
              Valider
            </button>
          </div>
        </div>
      )}

      {phase === "result" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-4">
          <p className="text-slate-500 text-sm">
            Mot : <strong>{word}</strong> — Décodé : <strong>{decoded}</strong>
          </p>
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
          <button onClick={startGame} className="w-full border border-slate-200 rounded-lg py-2.5 text-sm hover:bg-slate-50 transition">
            Rejouer
          </button>
        </div>
      )}
    </div>
  );
}
