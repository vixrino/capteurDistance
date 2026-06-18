import { Link } from "react-router-dom";
import { GAMES, TAG } from "@/games/catalog";

export default function GameHub() {
  return (
    <div className="animate-rise">

      {/* ── Header ── */}
      <header className="pb-8 border-b border-line">
        <span className="eyebrow">Arcade capteur</span>
        <h1 className="font-serif text-5xl text-ink mt-3 leading-none">Mini-jeux</h1>
        <p className="text-base text-ink-muted mt-4 max-w-lg">
          {GAMES.length} épreuves qui transforment les mesures du capteur — et celles
          des capteurs voisins — en défis de précision et de réflexes.
        </p>
      </header>

      {/* ── List ── */}
      <div className="divide-y divide-line">
        {GAMES.map((g) => (
          <Link
            key={g.id}
            to={`/games/${g.id}`}
            className="group grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-6 py-8 items-baseline transition-colors hover:bg-paper-raised -mx-3 px-3"
          >
            <span className="num text-2xl text-ink-faint sm:col-span-1">{g.n}</span>

            <div className="sm:col-span-8">
              <div className="flex items-center gap-3">
                <h2 className="font-serif text-2xl text-ink group-hover:text-clay transition-colors">
                  {g.name}
                </h2>
              </div>
              <p className="text-sm text-ink-muted mt-2 max-w-xl leading-relaxed">{g.desc}</p>
            </div>

            <div className="sm:col-span-3 flex items-center justify-between sm:justify-end gap-6">
              <span className={TAG[g.diff]}>{g.diff}</span>
              <span className="text-ink-faint group-hover:text-clay group-hover:translate-x-1 transition-all text-lg">
                →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
