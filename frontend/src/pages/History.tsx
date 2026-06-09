import { useEffect, useState } from "react";
import api from "@/api/client";
import { Measurement } from "@/types";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#faf7f0",
        border: "1px solid #211f1b",
        padding: "5px 10px",
        fontFamily: "Fraunces, Georgia, serif",
        fontSize: "13px",
        lineHeight: 1.45,
        color: "#211f1b",
      }}
    >
      <div>{Number(payload[0].value).toFixed(1)} cm</div>
      <div style={{ fontSize: "10px", color: "#9c9685", fontFamily: "Hanken Grotesk, sans-serif" }}>
        {payload[0]?.payload?.time}
      </div>
    </div>
  );
}

function distColor(d: number) {
  if (d < 30) return "text-clay";
  if (d < 100) return "text-ochre";
  return "text-ink";
}

export default function History() {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const limit = 50;

  useEffect(() => {
    setLoading(true);
    api
      .get<{ data: Measurement[]; total: number }>(
        `/measurements/history?sensor_id=1&limit=${limit}&offset=${page * limit}`
      )
      .then(({ data }) => {
        setMeasurements(data.data);
        setTotal(data.total);
      })
      .finally(() => setLoading(false));
  }, [page]);

  const chartData = [...measurements].reverse().map((m, i) => ({
    i,
    distance_cm: m.distance_cm,
    time: new Date(m.measured_at).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));

  return (
    <div className="animate-rise space-y-12">

      {/* ── Header ── */}
      <header className="pb-6 border-b border-line">
        <span className="eyebrow">Archive des mesures</span>
        <h1 className="font-serif text-5xl text-ink mt-3 leading-none">Historique</h1>
      </header>

      {/* ── Chart ── */}
      <section>
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="font-serif text-2xl text-ink">
            Évolution — {limit} dernières mesures
          </h2>
          <span className="text-[11px] tracking-[0.14em] uppercase text-ink-faint">
            {total} entrées
          </span>
        </div>

        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#b24a2e" stopOpacity={0.14} />
                  <stop offset="100%" stopColor="#b24a2e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 6" stroke="#d8d1c0" vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: "#9c9685", fontFamily: "Hanken Grotesk, sans-serif" }}
                interval="preserveStartEnd"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 400]}
                tick={{ fontSize: 10, fill: "#9c9685", fontFamily: "Hanken Grotesk, sans-serif" }}
                tickFormatter={(v) => `${v}`}
                tickLine={false}
                axisLine={false}
                width={28}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#c4bca6", strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="distance_cm"
                stroke="#211f1b"
                strokeWidth={1.5}
                fill="url(#histGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : loading ? (
          <div className="h-48 bg-paper-sunk animate-pulse" />
        ) : (
          <p className="h-48 flex items-center justify-center text-sm text-ink-faint font-serif italic">
            Aucune donnée en base
          </p>
        )}
      </section>

      {/* ── Table ── */}
      <section>
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="font-serif text-2xl text-ink">Enregistrements</h2>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="text-sm text-ink-muted hover:text-ink disabled:opacity-30 transition-colors"
            >
              ← Précédent
            </button>
            <span className="num text-sm text-ink-faint">{page + 1}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={(page + 1) * limit >= total}
              className="text-sm text-ink-muted hover:text-ink disabled:opacity-30 transition-colors"
            >
              Suivant →
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 bg-paper-sunk animate-pulse" />
            ))}
          </div>
        ) : measurements.length === 0 ? (
          <p className="py-16 text-center text-sm text-ink-faint font-serif italic">
            Aucune mesure enregistrée. Le mode démo ne sauvegarde pas en base.
          </p>
        ) : (
          <table className="w-full border-t border-line">
            <thead>
              <tr>
                {["Réf.", "Distance", "Horodatage"].map((h) => (
                  <th
                    key={h}
                    className="text-left py-3 text-[11px] tracking-[0.14em] uppercase text-ink-faint font-medium border-b border-line"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {measurements.map((m) => (
                <tr key={m.id} className="border-b border-line hover:bg-paper-raised transition-colors">
                  <td className="py-3 num text-sm text-ink-faint">{m.id}</td>
                  <td className="py-3">
                    <span className={`num text-base ${distColor(m.distance_cm)}`}>
                      {m.distance_cm.toFixed(1)}
                    </span>
                    <span className="text-xs text-ink-faint ml-1">cm</span>
                  </td>
                  <td className="py-3 text-sm text-ink-muted">
                    {new Date(m.measured_at).toLocaleString("fr-FR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
