import { useEffect, useState } from "react";
import api from "@/api/client";
import { SoundPoint, LedPoint, LedDistribution, StatePoint } from "@/types";
import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar, Cell,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";

/**
 * Graphiques des capteurs & actionneurs voisins lus dans la base partagée :
 *  - Micro G8C (g8c_mesures)        → niveau sonore (dB) dans le temps
 *  - LED G8E  (g8e_led_control)     → répartition des couleurs commandées
 *  - État G8B (g8b_valeurs)         → transitions 0/1 dans le temps
 */
export default function NeighborCharts() {
  const [sound, setSound] = useState<{ rows: SoundPoint[]; demo: boolean } | null>(null);
  const [led, setLed] = useState<{ distribution: LedDistribution[]; rows: LedPoint[]; demo: boolean } | null>(null);
  const [state, setState] = useState<{ rows: StatePoint[]; demo: boolean } | null>(null);

  useEffect(() => {
    api.get("/external/sound/history?limit=60").then(({ data }) => setSound(data)).catch(() => {});
    api.get("/external/led/history?limit=150").then(({ data }) => setLed(data)).catch(() => {});
    api.get("/external/state/history?limit=60").then(({ data }) => setState(data)).catch(() => {});
  }, []);

  const fmtTime = (s: string | null) =>
    s ? new Date(s).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—";

  const soundData = (sound?.rows ?? []).map((r) => ({
    t: fmtTime(r.ts),
    decibels: r.decibels,
    hertz: r.hertz,
    note: r.note,
  }));

  const stateData = (state?.rows ?? []).map((r, i) => ({
    t: r.last_change ? fmtTime(r.last_change) : `#${i}`,
    etat: r.etat,
  }));

  const latestSound = sound?.rows?.[sound.rows.length - 1];

  return (
    <section className="space-y-8">
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-3xl text-ink">Capteurs & actionneurs voisins</h2>
        <span className="eyebrow">Base partagée du hangar</span>
      </div>
      <p className="text-sm text-ink-muted max-w-2xl -mt-2">
        Données lues en direct dans la base commune : le micro du groupe 8C, la LED
        RGB du groupe 8E et le capteur d'état du groupe 8B.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

        {/* ── Micro G8C : niveau sonore ── */}
        <div className="lg:col-span-7">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="font-serif text-xl text-ink">Micro · niveau sonore</h3>
            <span className="text-[11px] tracking-[0.14em] uppercase text-ink-faint">
              G8C{sound?.demo ? " · simulé" : ""}
            </span>
          </div>
          {soundData.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={soundData} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="soundGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a8812e" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#a8812e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 6" stroke="#d8d1c0" vertical={false} />
                <XAxis dataKey="t" tick={{ fontSize: 10, fill: "#9c9685", fontFamily: "Hanken Grotesk, sans-serif" }} interval="preserveStartEnd" tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9c9685", fontFamily: "Hanken Grotesk, sans-serif" }} tickLine={false} axisLine={false} width={30} unit="" />
                <Tooltip
                  contentStyle={{ background: "#faf7f0", border: "1px solid #211f1b", fontFamily: "Hanken Grotesk, sans-serif", fontSize: 12, color: "#211f1b" }}
                  formatter={(v: number, n: string) => [n === "decibels" ? `${v} dB` : `${v} Hz`, n === "decibels" ? "Niveau" : "Fréquence"]}
                />
                <Area type="monotone" dataKey="decibels" stroke="#a8812e" strokeWidth={1.5} fill="url(#soundGrad)" dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty />
          )}
          {latestSound && (
            <p className="text-sm text-ink-muted mt-3">
              Dernière mesure : <span className="num text-ink">{latestSound.decibels} dB</span> ·{" "}
              <span className="num text-ink">{latestSound.hertz} Hz</span> · note{" "}
              <span className="font-serif italic text-ink">{latestSound.note}</span>
            </p>
          )}
        </div>

        {/* ── LED G8E : répartition des couleurs ── */}
        <div className="lg:col-span-5 lg:border-l lg:border-line lg:pl-10">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="font-serif text-xl text-ink">LED · couleurs commandées</h3>
            <span className="text-[11px] tracking-[0.14em] uppercase text-ink-faint">
              G8E{led?.demo ? " · simulé" : ""}
            </span>
          </div>
          {led && led.distribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={led.distribution} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 6" stroke="#d8d1c0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#9c9685", fontFamily: "Hanken Grotesk, sans-serif" }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="couleur" tick={{ fontSize: 11, fill: "#76705f", fontFamily: "Hanken Grotesk, sans-serif" }} tickLine={false} axisLine={false} width={64} />
                <Tooltip
                  cursor={{ fill: "rgba(178,74,46,0.06)" }}
                  contentStyle={{ background: "#faf7f0", border: "1px solid #211f1b", fontFamily: "Hanken Grotesk, sans-serif", fontSize: 12, color: "#211f1b" }}
                  formatter={(v: number) => [`${v} commandes`, "Total"]}
                />
                <Bar dataKey="count" radius={[0, 2, 2, 0]}>
                  {led.distribution.map((d) => (
                    <Cell key={d.couleur} fill={d.hex} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty />
          )}
        </div>

        {/* ── État G8B : transitions 0/1 ── */}
        <div className="lg:col-span-12 lg:border-t lg:border-line lg:pt-8">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="font-serif text-xl text-ink">Capteur d'état · activité</h3>
            <span className="text-[11px] tracking-[0.14em] uppercase text-ink-faint">
              G8B{state?.demo ? " · simulé" : ""}
            </span>
          </div>
          {stateData.length > 1 ? (
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={stateData} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 6" stroke="#d8d1c0" vertical={false} />
                <XAxis dataKey="t" tick={{ fontSize: 10, fill: "#9c9685", fontFamily: "Hanken Grotesk, sans-serif" }} interval="preserveStartEnd" tickLine={false} axisLine={false} />
                <YAxis domain={[0, 1]} ticks={[0, 1]} tickFormatter={(v) => (v === 1 ? "Actif" : "Repos")} tick={{ fontSize: 10, fill: "#9c9685", fontFamily: "Hanken Grotesk, sans-serif" }} tickLine={false} axisLine={false} width={48} />
                <Tooltip
                  contentStyle={{ background: "#faf7f0", border: "1px solid #211f1b", fontFamily: "Hanken Grotesk, sans-serif", fontSize: 12, color: "#211f1b" }}
                  formatter={(v: number) => [v === 1 ? "Actif" : "Repos", "État"]}
                />
                <Line type="stepAfter" dataKey="etat" stroke="#4f6a52" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty />
          )}
        </div>
      </div>
    </section>
  );
}

function ChartEmpty() {
  return (
    <div className="h-44 flex items-center justify-center text-sm text-ink-faint font-serif italic">
      En attente de données…
    </div>
  );
}
