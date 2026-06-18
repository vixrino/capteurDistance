import { Link } from "react-router-dom";
import { GAMES, TAG } from "@/games/catalog";

const STEPS = [
  {
    n: "01",
    title: "On capte le réel",
    body: "Un capteur de distance relié à une carte Tiva C mesure en continu et envoie ses données au site en temps réel.",
  },
  {
    n: "02",
    title: "On partage entre groupes",
    body: "Le site lit aussi les capteurs des groupes voisins (écran, son, LED…) via une base de données commune. Plusieurs sources, un seul terrain de jeu.",
  },
  {
    n: "03",
    title: "On transforme en jeu",
    body: "Chaque mini-jeu détourne ces mesures en défi : viser une distance, réagir au bon moment, reproduire une séquence… Vos gestes deviennent un score.",
  },
];

export default function Home() {
  return (
    <div className="animate-rise">

      {/* ── Hero ── */}
      <header className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end pb-12 border-b border-line">
        <div className="lg:col-span-8 space-y-6">
          <span className="eyebrow">Une arcade pilotée par les capteurs</span>
          <h1 className="font-serif text-6xl sm:text-7xl leading-[0.95] text-ink tracking-tight">
            Jouer avec
            <br />
            le <span className="italic text-clay">monde réel</span>.
          </h1>
          <p className="text-base text-ink-muted leading-relaxed max-w-xl">
            WebKit transforme les mesures de capteurs physiques en mini-jeux. Un
            geste devant le capteur, un son, une lumière chez le groupe voisin :
            tout devient une mécanique de jeu et un score à battre.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link to="/games" className="btn-ink">Jouer maintenant</Link>
            <Link to="/dashboard" className="btn-line">Voir les capteurs</Link>
          </div>
        </div>

        <div className="lg:col-span-4 lg:border-l lg:border-line lg:pl-10">
          <span className="eyebrow">En bref</span>
          <p className="num text-6xl text-ink mt-4 leading-none">{GAMES.length}</p>
          <p className="text-sm text-ink-muted mt-2">
            mini-jeux alimentés par de vrais capteurs, jouables tout de suite
            depuis le navigateur.
          </p>
        </div>
      </header>

      {/* ── Le principe ── */}
      <section className="py-14 border-b border-line">
        <div className="flex items-baseline justify-between mb-10">
          <h2 className="font-serif text-3xl text-ink">Le principe</h2>
          <span className="eyebrow">Comment ça marche</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {STEPS.map((s) => (
            <div key={s.n} className="space-y-3">
              <span className="num text-2xl text-clay">{s.n}</span>
              <h3 className="font-serif text-xl text-ink">{s.title}</h3>
              <p className="text-sm text-ink-muted leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Games ── */}
      <section className="pt-14">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="font-serif text-3xl text-ink">Les {GAMES.length} mini-jeux</h2>
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
                <p className="text-sm text-ink-muted mt-0.5">{g.short}</p>
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
