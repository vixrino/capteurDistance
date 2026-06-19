import { useEffect, useState } from "react";
import api from "@/api/client";
import { Weather } from "@/types";

/**
 * Panneau « contexte environnemental » : météo réelle (Open-Meteo) + impact
 * sur la mesure de distance via la vitesse du son. Web service externe relié
 * à notre capteur.
 */
export default function WeatherPanel() {
  const [w, setW] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Weather>("/weather")
      .then(({ data }) => setW(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="eyebrow">Contexte · météo externe</span>
        {w && (
          <span className="text-[11px] tracking-[0.14em] uppercase text-ink-faint">
            {w.source}{w.demo ? " (simulé)" : ""}
          </span>
        )}
      </div>

      {loading || !w ? (
        <div className="mt-6 h-24 bg-paper-sunk animate-pulse" />
      ) : (
        <div className="mt-6 space-y-5">
          <div className="flex items-baseline gap-3">
            <span className="num text-5xl text-ink leading-none">{w.temperature.toFixed(1)}</span>
            <span className="font-serif italic text-xl text-ink-muted">°C</span>
            <span className="text-sm text-ink-faint ml-2">{w.ville}</span>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            {w.humidite != null && (
              <Row label="Humidité" value={`${w.humidite}%`} />
            )}
            {w.vent != null && (
              <Row label="Vent" value={`${w.vent} km/h`} />
            )}
            <Row label="Vitesse du son" value={`${w.vitesse_son} m/s`} />
            <Row label="Référence (20°C)" value={`${w.vitesse_son_ref} m/s`} />
          </div>

          {/* Impact sur la mesure */}
          <div className="border-t border-line pt-4">
            <p className="text-[11px] tracking-[0.14em] uppercase text-ink-faint mb-2">
              Impact sur le capteur à ultrasons
            </p>
            <p className="text-sm text-ink-muted leading-relaxed">
              À {w.temperature.toFixed(1)} °C, une mesure brute de{" "}
              <span className="num text-ink">{w.exemple.brut_cm} cm</span> devrait être lue{" "}
              <span className="num text-clay">{w.exemple.corrige_cm} cm</span> une fois corrigée
              (écart de <span className="num">{w.ecart_pct > 0 ? "+" : ""}{w.ecart_pct}%</span>).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-line/60 pb-1">
      <span className="text-ink-faint">{label}</span>
      <span className="num text-ink">{value}</span>
    </div>
  );
}
