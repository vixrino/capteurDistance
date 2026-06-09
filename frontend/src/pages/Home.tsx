import { Link } from "react-router-dom";
import DistanceGauge from "@/components/DistanceGauge";
import MeasurementChart from "@/components/MeasurementChart";
import { useLiveDistance } from "@/hooks/useLiveDistance";

const GAMES = [
  { id: "guess", n: "01", name: "Devine la distance", desc: "Place un objet à la distance cible exacte.", diff: "Facile" as const },
  { id: "stability", n: "02", name: "Stabilité", desc: "Maintiens ta main immobile pendant 10 secondes.", diff: "Moyen" as const },
  { id: "reflex", n: "03", name: "Réflexes éclair", desc: "Réagis vite quand le signal apparaît.", diff: "Moyen" as const },
  { id: "maestro", n: "04", name: "Le Maestro", desc: "Suis une courbe cible avec ta main sur 30 s.", diff: "Difficile" as const },
  { id: "morse", n: "05", name: "Distance Morse", desc: "Encode un mot en Morse avec tes mouvements.", diff: "Difficile" as const },
];

const TAG: Record<string, string> = {
  Facile: "tag tag-easy",
  Moyen: "tag tag-medium",
  Difficile: "tag tag-hard",
};

export default function Home() {
  const { measurement, history, error } = useLiveDistance(1, 1000);

  return (
    <div className="animate-rise">

      {/* ── Hero ── */}
      <header className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end pb-12 border-b border-line">
        <div className="lg:col-span-7 space-y-6">
          <span className="eyebrow">Mesure ultrasonique en temps réel</span>
          <h1 className="font-serif text-6xl sm:text-7xl leading-[0.95] text-ink tracking-tight">
            Mesurer la
            <br />
            <span className="italic text-clay">distance</span>, autrement.
          </h1>
          <p className="text-base text-ink-muted leading-relaxed max-w-md">
            Un capteur <span className="text-ink">HC-SR04</span> relié à une carte{" "}
            <span className="text-ink">Tiva C</span>. Visualisation live, archive
            des mesures et cinq mini-jeux qui transforment vos gestes en score.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link to="/dashboard" className="btn-ink">Ouvrir le dashboard</Link>
            <Link to="/games" className="btn-line">Voir les jeux</Link>
          </div>
        </div>

        {/* Live reading */}
        <div className="lg:col-span-5">
          <div className="flex items-center justify-between mb-5">
            <span className="eyebrow">En direct</span>
            <span className="flex items-center gap-2 text-[11px] tracking-[0.14em] uppercase text-ink-muted">
              <span className={`w-1.5 h-1.5 rounded-full ${error ? "bg-clay" : "bg-moss animate-pulse"}`} />
              {error ? "Hors ligne" : "Capteur actif"}
            </span>
          </div>

          {error ? (
            <p className="py-12 text-center text-sm text-clay font-serif italic">{error}</p>
          ) : measurement ? (
            <DistanceGauge value={measurement.distance_cm} demo={measurement.demo} />
          ) : (
            <div className="py-12 text-center text-sm text-ink-faint font-serif italic">
              Connexion au capteur…
            </div>
          )}
        </div>
      </header>

      {/* ── Sparkline ── */}
      {history.length > 1 && (
        <section className="py-12 border-b border-line">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="font-serif text-2xl text-ink">Tendance — 60 dernières secondes</h2>
            <span className="text-[11px] tracking-[0.14em] uppercase text-ink-faint">
              {history.length} points
            </span>
          </div>
          <MeasurementChart data={history} />
        </section>
      )}

      {/* ── Games ── */}
      <section className="pt-12">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="font-serif text-3xl text-ink">Cinq mini-jeux</h2>
          <span className="eyebrow">Arcade capteur</span>
        </div>

        <div className="divide-y divide-line border-y border-line">
          {GAMES.map((g) => (
            <Link
              key={g.id}
              to={`/games/${g.id}`}
              className="group flex items-center gap-6 py-6 transition-colors hover:bg-paper-raised -mx-2 px-2"
            >
              <span className="num text-xl text-ink-faint w-10 shrink-0">{g.n}</span>
              <div className="flex-1 min-w-0">
                <h3 className="font-serif text-xl text-ink group-hover:text-clay transition-colors">
                  {g.name}
                </h3>
                <p className="text-sm text-ink-muted mt-0.5">{g.desc}</p>
              </div>
              <span className={`${TAG[g.diff]} hidden sm:inline-flex`}>{g.diff}</span>
              <span className="text-ink-faint group-hover:text-clay group-hover:translate-x-1 transition-all text-lg shrink-0">
                →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
