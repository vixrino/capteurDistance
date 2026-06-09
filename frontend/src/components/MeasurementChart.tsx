import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";

interface Props {
  data: number[];
  targetLine?: number;
}

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
        color: "#211f1b",
      }}
    >
      {Number(payload[0].value).toFixed(1)} cm
    </div>
  );
}

export default function MeasurementChart({ data, targetLine }: Props) {
  const chartData = data.map((v, i) => ({ t: i, distance_cm: v }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={chartData} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="2 6" stroke="#d8d1c0" vertical={false} />
        <XAxis dataKey="t" hide />
        <YAxis
          domain={[0, 90]}
          tick={{ fontSize: 10, fill: "#9c9685", fontFamily: "Hanken Grotesk, sans-serif" }}
          tickFormatter={(v) => `${v}`}
          tickLine={false}
          axisLine={false}
          width={30}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#c4bca6", strokeWidth: 1 }} />
        {targetLine !== undefined && (
          <ReferenceLine
            y={targetLine}
            stroke="#b24a2e"
            strokeDasharray="3 3"
            label={{
              value: `cible ${targetLine}`,
              fontSize: 10,
              fill: "#b24a2e",
              fontFamily: "Hanken Grotesk, sans-serif",
              position: "insideTopRight",
            }}
          />
        )}
        <Line
          type="monotone"
          dataKey="distance_cm"
          stroke="#211f1b"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
