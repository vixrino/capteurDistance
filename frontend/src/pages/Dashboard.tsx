import { useEffect, useState } from "react";
import api from "@/api/client";
import DistanceGauge from "@/components/DistanceGauge";
import MeasurementChart from "@/components/MeasurementChart";
import WeatherPanel from "@/components/WeatherPanel";
import ActuatorControls from "@/components/ActuatorControls";
import { useLiveDistance } from "@/hooks/useLiveDistance";
import { Sensor, AlertEvent } from "@/types";

export default function Dashboard() {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [activeSensorId, setActiveSensorId] = useState(1);
  const [recentAlert, setRecentAlert] = useState<AlertEvent | null>(null);
  const { measurement, history, error } = useLiveDistance(activeSensorId, 1000);

  useEffect(() => {
    api.get<Sensor[]>("/sensors").then(({ data }) => {
      setSensors(data);
      if (data.length > 0) setActiveSensorId(data[0].id);
    });
  }, []);

  // Dernier déclenchement d'alerte (bannière), rafraîchi périodiquement.
  useEffect(() => {
    const load = () => {
      api.get<AlertEvent[]>("/alerts/events?limit=1")
        .then(({ data }) => setRecentAlert(data[0] ?? null))
        .catch(() => {});
    };
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const activeSensor = sensors.find((s) => s.id === activeSensorId);
  const recentIsFresh = recentAlert
    ? Date.now() - new Date(recentAlert.created_at).getTime() < 120000
    : false;

  const stats =
    history.length > 0
      ? {
          min: Math.min(...history).toFixed(1),
          max: Math.max(...history).toFixed(1),
          avg: (history.reduce((a, b) => a + b, 0) / history.length).toFixed(1),
        }
      : null;

  return (
    <div className="animate-rise space-y-12">

      {/* ── Header ── */}
      <header className="flex items-end justify-between pb-6 border-b border-line">
        <div className="space-y-2">
          <span className="eyebrow">Panneau de contrôle</span>
          <h1 className="font-serif text-5xl text-ink leading-none">Dashboard</h1>
        </div>
        <span className="flex items-center gap-2 text-[11px] tracking-[0.14em] uppercase text-ink-muted pb-1">
          <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${error ? "bg-clay" : "bg-moss animate-pulse"}`} />
          {error ? "Hors ligne" : measurement?.demo ? "Démo" : "Live"}
        </span>
      </header>

      {/* ── Bannière d'alerte récente ── */}
      {recentIsFresh && recentAlert && (
        <div role="alert" className="flex items-start gap-3 border-l-2 border-clay bg-clay/5 px-4 py-3">
          <span aria-hidden="true" className="w-2 h-2 rounded-full bg-clay mt-1.5 animate-pulse shrink-0" />
          <div>
            <p className="text-sm text-ink">
              <span className="font-medium">{recentAlert.label}</span> — {recentAlert.message}
            </p>
            <p className="text-[11px] tracking-[0.14em] uppercase text-ink-faint mt-0.5">
              {new Date(recentAlert.created_at).toLocaleString("fr-FR")} · e-mail {recentAlert.email_status}
            </p>
          </div>
        </div>
      )}

      {/* ── Sensor selector ── */}
      {sensors.length > 1 && (
        <div className="flex gap-6 -mt-4">
          {sensors.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSensorId(s.id)}
              className={`text-sm pb-1 border-b transition-colors ${
                s.id === activeSensorId
                  ? "border-clay text-ink"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Reading + Info ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

        {/* Gauge */}
        <div className="lg:col-span-7">
          <span className="eyebrow">Mesure actuelle</span>
          <div className="mt-8">
            {error ? (
              <p className="py-12 text-center text-sm text-clay font-serif italic">{error}</p>
            ) : measurement ? (
              <DistanceGauge value={measurement.distance_cm} max={activeSensor?.max_range ?? 80} demo={measurement.demo} />
            ) : (
              <p className="py-12 text-center text-sm text-ink-faint font-serif italic">
                En attente du capteur…
              </p>
            )}
          </div>
        </div>

        {/* Sensor info */}
        <div className="lg:col-span-5 lg:border-l lg:border-line lg:pl-10">
          <span className="eyebrow">Fiche capteur</span>
          {activeSensor ? (
            <dl className="mt-6">
              {[
                ["Désignation", activeSensor.name, "text-ink"],
                ["Emplacement", activeSensor.location ?? "—", "text-ink"],
                ["Unité", activeSensor.unit, "text-ink"],
                ["Plage", `${activeSensor.min_range} – ${activeSensor.max_range} ${activeSensor.unit}`, "text-ink"],
                ["Statut", activeSensor.active ? "Actif" : "Inactif", activeSensor.active ? "text-moss" : "text-clay"],
              ].map(([label, val, cls]) => (
                <div key={label} className="flex items-baseline justify-between py-3 border-b border-line">
                  <dt className="text-[11px] tracking-[0.14em] uppercase text-ink-faint">{label}</dt>
                  <dd className={`text-sm font-medium ${cls}`}>{val}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <div className="mt-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 bg-paper-sunk animate-pulse" />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Actionneurs + Météo externe ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-6">
          <ActuatorControls />
        </div>
        <div className="lg:col-span-6 lg:border-l lg:border-line lg:pl-10">
          <WeatherPanel />
        </div>
      </div>

      {/* ── Chart ── */}
      <section className="pt-2">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="font-serif text-2xl text-ink">Flux de données</h2>
          <span className="text-[11px] tracking-[0.14em] uppercase text-ink-faint">
            {history.length} mesures · capteur #{activeSensorId}
          </span>
        </div>
        {history.length > 1 ? (
          <MeasurementChart data={history} />
        ) : (
          <div className="h-44 flex items-center justify-center text-sm text-ink-faint font-serif italic">
            En attente de données…
          </div>
        )}
      </section>

      {/* ── Stats ── */}
      {stats && (
        <div className="grid grid-cols-3 border-y border-line divide-x divide-line">
          {[
            { label: "Minimum", value: stats.min, color: "text-clay" },
            { label: "Moyenne", value: stats.avg, color: "text-ink" },
            { label: "Maximum", value: stats.max, color: "text-ochre" },
          ].map(({ label, value, color }) => (
            <div key={label} className="py-6 px-2 text-center">
              <p className="text-[11px] tracking-[0.14em] uppercase text-ink-faint mb-2">{label}</p>
              <p className={`num text-4xl ${color}`}>
                {value}
                <span className="text-base text-ink-faint italic font-serif ml-1">cm</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
