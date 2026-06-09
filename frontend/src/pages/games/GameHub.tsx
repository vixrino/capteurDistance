import { Link } from "react-router-dom";

const GAMES = [
  {
    id: "guess",
    n: "01",
    name: "Devine la distance",
    desc: "Une distance cible s'affiche. Placez un objet devant le capteur à cette distance exacte. Le score dépend de votre précision.",
    diff: "Facile" as const,
  },
  {
    id: "stability",
    n: "02",
    name: "Stabilité",
    desc: "Maintenez votre main exactement à la distance indiquée pendant dix secondes. Le score diminue avec la variance.",
    diff: "Moyen" as const,
  },
  {
    id: "reflex",
    n: "03",
    name: "Réflexes éclair",
    desc: "Surveillez l'écran. Quand le signal passe au rouge, rapprochez votre main à moins de 20 cm. Temps de réaction mesuré.",
    diff: "Moyen" as const,
  },
  {
    id: "maestro",
    n: "04",
    name: "Le Maestro",
    desc: "Une courbe cible défile à l'écran. Reproduisez-la avec votre main sur trente secondes. Score basé sur l'écart moyen.",
    diff: "Difficile" as const,
  },
  {
    id: "morse",
    n: "05",
    name: "Distance Morse",
    desc: "Encodez un mot en Morse : main proche pour un point, loin pour un tiret, très loin pour séparer les lettres.",
    diff: "Difficile" as const,
  },
];

const TAG: Record<string, string> = {
  Facile: "tag tag-easy",
  Moyen: "tag tag-medium",
  Difficile: "tag tag-hard",
};

export default function GameHub() {
  return (
    <div className="animate-rise">

      {/* ── Header ── */}
      <header className="pb-8 border-b border-line">
        <span className="eyebrow">Arcade capteur</span>
        <h1 className="font-serif text-5xl text-ink mt-3 leading-none">Mini-jeux</h1>
        <p className="text-base text-ink-muted mt-4 max-w-lg">
          Cinq épreuves qui transforment les mesures du capteur en temps réel
          en défis de précision et de réflexes.
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
