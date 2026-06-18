import { useEffect, useState } from "react";
import api from "@/api/client";

interface ScoreRow {
  id: number;
  jeu: string;
  joueur: string;
  score: number;
  details: string | null;
  created_at: string;
}

const MEDALS = ["🥇", "🥈", "🥉"];

interface Props {
  /** Identifiant du jeu (ex. "maestro"). */
  jeu: string;
  /** Incrémente cette valeur pour forcer un rafraîchissement (ex. après un score). */
  refreshKey?: number;
  limit?: number;
}

export default function Leaderboard({ jeu, refreshKey = 0, limit = 10 }: Props) {
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .get<ScoreRow[]>(`/games/scores?jeu=${encodeURIComponent(jeu)}&limit=${limit}`)
      .then(({ data }) => {
        if (alive) {
          setRows(data);
          setError(false);
        }
      })
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [jeu, refreshKey, limit]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800">Classement</h2>
        <span className="text-[11px] uppercase tracking-widest text-slate-400">
          Top {limit}
        </span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-9 bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-slate-400 text-center py-6">Classement indisponible</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">
          Aucun score pour l'instant — sois le premier !
        </p>
      ) : (
        <ol className="divide-y divide-slate-100">
          {rows.map((r, i) => (
            <li key={r.id} className="flex items-center gap-3 py-2.5">
              <span className="w-7 text-center text-sm font-semibold text-slate-500">
                {i < 3 ? MEDALS[i] : i + 1}
              </span>
              <span className="flex-1 min-w-0 truncate text-sm font-medium text-slate-700">
                {r.joueur}
              </span>
              <span className="text-[11px] text-slate-400 hidden sm:block">
                {new Date(r.created_at).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "2-digit",
                })}
              </span>
              <span className="tabular-nums text-sm font-bold text-brand-600 w-16 text-right">
                {r.score}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
