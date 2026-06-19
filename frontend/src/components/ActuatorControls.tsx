import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "@/api/client";
import { Actuator } from "@/types";

const TYPE_LABEL: Record<Actuator["type"], string> = {
  led: "LED", buzzer: "Buzzer", relais: "Relais", moteur: "Moteur",
};

/**
 * Contrôle rapide des actionneurs (affichage + bascule on/off) pour le Dashboard.
 * La configuration fine se fait sur la page Gestion.
 */
export default function ActuatorControls() {
  const [actuators, setActuators] = useState<Actuator[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    api.get<Actuator[]>("/actuators")
      .then(({ data }) => setActuators(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Rafraîchit l'état (utile pour voir les actionneurs auto bouger en direct).
  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  async function toggle(a: Actuator) {
    await api.post(`/actuators/${a.id}/toggle`);
    load();
  }

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="eyebrow">Actionneurs</span>
        <Link to="/manage" className="text-[11px] tracking-[0.14em] uppercase text-ink-faint hover:text-clay transition-colors">
          Configurer →
        </Link>
      </div>

      {loading ? (
        <div className="mt-6 space-y-2">
          {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-12 bg-paper-sunk animate-pulse" />)}
        </div>
      ) : actuators.length === 0 ? (
        <p className="mt-6 text-sm text-ink-faint font-serif italic">
          Aucun actionneur. <Link to="/manage" className="text-clay underline underline-offset-2">Ajoutez-en un</Link>.
        </p>
      ) : (
        <div className="mt-4 divide-y divide-line border-y border-line">
          {actuators.map((a) => (
            <div key={a.id} className="py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${a.etat === "on" ? "bg-moss animate-pulse" : "bg-line"}`}
                  role="img"
                  aria-label={a.etat === "on" ? "Allumé" : "Éteint"}
                />
                <div className="min-w-0">
                  <p className="font-serif text-base text-ink leading-tight truncate">{a.nom}</p>
                  <p className="text-[11px] tracking-[0.14em] uppercase text-ink-faint">
                    {TYPE_LABEL[a.type]} · {a.mode === "auto" ? `auto ${a.sens === "below" ? "<" : ">"} ${a.seuil_cm}cm` : "manuel"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => toggle(a)}
                aria-pressed={a.etat === "on"}
                aria-label={`${a.nom} : ${a.etat === "on" ? "allumé, cliquer pour éteindre" : "éteint, cliquer pour allumer"}`}
                className={`text-xs px-3 py-1.5 border transition-colors shrink-0 ${
                  a.etat === "on" ? "border-moss text-moss" : "border-line text-ink-muted hover:border-ink hover:text-ink"
                }`}
              >
                {a.etat === "on" ? "ON" : "OFF"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
