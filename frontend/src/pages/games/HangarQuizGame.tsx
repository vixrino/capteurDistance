import { useState, useEffect, useCallback } from "react";
import api from "@/api/client";
import { SensorsSnapshot } from "@/types";

interface Question {
  capteur: string;
  question: string;
  options: string[];
  answer: string;
}

const NOTE_POOL = ["Do4", "Re4", "Mi4", "Fa4", "Sol4", "La4", "Si4", "Do5", "Re5", "Mi5", "Sol5", "La5"];
const COLOR_POOL = ["OFF", "ROUGE", "VERT", "BLEU", "JAUNE", "VIOLET"];

function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

function pickDistractors(pool: string[], answer: string, n: number): string[] {
  return shuffle(pool.filter((x) => x !== answer)).slice(0, n);
}

function dbBracket(db: number): string {
  if (db < 80) return "70–80 dB";
  if (db < 90) return "80–90 dB";
  if (db < 100) return "90–100 dB";
  return "100 dB et +";
}

function buildQuestions(s: SensorsSnapshot): Question[] {
  const q: Question[] = [];

  if (s.sound) {
    q.push({
      capteur: "Son · groupe 8C",
      question: "Quelle note le capteur de son a-t-il mesurée en dernier ?",
      answer: s.sound.note,
      options: shuffle([s.sound.note, ...pickDistractors(NOTE_POOL, s.sound.note, 3)]),
    });
    const b = dbBracket(s.sound.decibels);
    q.push({
      capteur: "Son · groupe 8C",
      question: "Quel était le niveau sonore de cette dernière mesure ?",
      answer: b,
      options: shuffle([b, ...pickDistractors(["70–80 dB", "80–90 dB", "90–100 dB", "100 dB et +"], b, 2)]),
    });
  }

  if (s.color) {
    q.push({
      capteur: "LED · groupe 8E",
      question: "Quelle couleur affiche la LED en ce moment ?",
      answer: s.color.couleur,
      options: shuffle([s.color.couleur, ...pickDistractors(COLOR_POOL, s.color.couleur, 3)]),
    });
  }

  if (s.state) {
    const ans = s.state.etat === 1 ? "Actif (1)" : "Inactif (0)";
    q.push({
      capteur: "État · groupe 8B",
      question: "Quel est l'état actuel du capteur du groupe 8B ?",
      answer: ans,
      options: ["Actif (1)", "Inactif (0)"],
    });
  }

  if (s.screen) {
    q.push({
      capteur: "Écran · groupe 8D",
      question: "Qui a envoyé le dernier message affiché sur l'écran OLED ?",
      answer: s.screen.expediteur,
      options: shuffle([s.screen.expediteur, ...pickDistractors(["G8C", "Chrono Aveugle", "Applaudimetre", "G8A", "G8E", "Admin"], s.screen.expediteur, 3)]),
    });
  }

  return q;
}

export default function HangarQuizGame() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [playerName, setPlayerName] = useState("");
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setIdx(0); setCorrect(0); setPicked(null); setFinished(false); setSaved(false);
    try {
      const { data } = await api.get<SensorsSnapshot>("/external/sensors");
      setQuestions(buildQuestions(data));
    } catch {
      setQuestions([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function pick(opt: string) {
    if (picked) return;
    setPicked(opt);
    if (opt === questions[idx].answer) setCorrect((c) => c + 1);
  }

  function next() {
    if (idx + 1 >= questions.length) { setFinished(true); return; }
    setIdx((i) => i + 1);
    setPicked(null);
  }

  const score = questions.length ? Math.round((correct / questions.length) * 1000) : 0;

  async function saveScore() {
    if (!playerName.trim()) return;
    await api.post("/games/scores", {
      jeu: "hangar_quiz",
      joueur: playerName.trim(),
      score,
      details: { correct, total: questions.length },
    });
    setSaved(true);
  }

  const q = questions[idx];

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Quiz du Hangar</h1>
        <p className="text-slate-500 text-sm mt-1">
          Une question par capteur voisin (son 8C, LED 8E, état 8B, écran 8D),
          basée sur leurs <strong>vraies dernières mesures</strong> lues en direct.
        </p>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500">Lecture des capteurs voisins…</div>
      ) : questions.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4">
          <p className="text-slate-500">Aucun capteur voisin lisible pour l'instant.</p>
          <button onClick={load} className="px-6 py-2.5 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 transition">Réessayer</button>
        </div>
      ) : !finished ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-6">
          <div className="flex justify-between text-sm text-slate-500">
            <span>Question {idx + 1}/{questions.length}</span>
            <span>Score : <strong className="text-emerald-600">{correct}</strong></span>
          </div>

          <div>
            <span className="text-[11px] uppercase tracking-widest text-brand-600 font-semibold">{q.capteur}</span>
            <p className="text-lg text-slate-800 mt-2">{q.question}</p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {q.options.map((opt) => {
              const isAnswer = opt === q.answer;
              const isPicked = opt === picked;
              const cls = !picked
                ? "border-slate-200 hover:border-brand-400 hover:bg-brand-50"
                : isAnswer
                ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                : isPicked
                ? "border-red-300 bg-red-50 text-red-600"
                : "border-slate-200 opacity-60";
              return (
                <button key={opt} onClick={() => pick(opt)} disabled={!!picked}
                  className={`text-left px-4 py-3 rounded-xl border-2 transition ${cls}`}>
                  {opt}
                </button>
              );
            })}
          </div>

          {picked && (
            <button onClick={next} className="w-full bg-brand-600 text-white rounded-lg py-2.5 font-medium hover:bg-brand-700 transition">
              {idx + 1 >= questions.length ? "Voir le score" : "Question suivante"}
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <p className="text-slate-500 text-sm">Score final</p>
            <p className="text-5xl font-bold tabular-nums text-slate-800">{score} pts</p>
            <p className="text-sm text-slate-500">{correct} / {questions.length} bonnes réponses</p>
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
          <button onClick={load} className="w-full border border-slate-200 rounded-lg py-2.5 text-sm hover:bg-slate-50 transition">Rejouer</button>
        </div>
      )}
    </div>
  );
}
