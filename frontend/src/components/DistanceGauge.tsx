import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  max?: number;
  unit?: string;
  demo?: boolean;
}

export default function DistanceGauge({ value, max = 80, unit = "cm", demo = false }: Props) {
  // Valeur affichée lissée : glisse vers `value` à 60 fps (anti-saccade).
  // Le capteur débite ~5 mesures/s ; l'interpolation comble les intervalles.
  const [display, setDisplay] = useState(value);
  const targetRef = useRef(value);
  useEffect(() => { targetRef.current = value; }, [value]);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setDisplay((prev) => {
        const target = targetRef.current;
        const next = prev + (target - prev) * 0.18;     // easing exponentiel
        return Math.abs(target - next) < 0.03 ? target : next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const clamped = Math.min(Math.max(display, 0), max);
  const pct = clamped / max;

  // SVG horizontal scale geometry
  const W = 360;
  const PAD = 12;
  const axisY = 46;
  const usable = W - PAD * 2;
  const x = PAD + pct * usable;

  // Seuils relatifs à l'échelle (fonctionne quelle que soit la plage du capteur)
  const accent =
    display < max * 0.3 ? "#b24a2e" :
    display < max * 0.65 ? "#a8812e" :
    "#211f1b";

  const zone =
    display < max * 0.3 ? "Très proche" :
    display < max * 0.6 ? "Proche" :
    display < max * 0.85 ? "Distance moyenne" :
    "Éloigné";

  // 5 graduations principales réparties sur la plage (ex. 0,20,40,60,80)
  const majorTicks = Array.from({ length: 5 }, (_, i) => Math.round((i * max) / 4));
  const minorTicks = Array.from({ length: 41 }, (_, i) => (i * max) / 40);

  return (
    <div className="flex flex-col items-center gap-5 select-none w-full">

      {/* Big serif readout */}
      <div className="flex items-baseline gap-2">
        <span className="num text-7xl leading-none text-ink tracking-tight">
          {display.toFixed(1)}
        </span>
        <span className="font-serif italic text-2xl text-ink-muted">{unit}</span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-[11px] tracking-[0.16em] uppercase" style={{ color: accent }}>
          {zone}
        </span>
        {demo && (
          <>
            <span className="w-1 h-1 rounded-full bg-ink-faint" />
            <span className="text-[11px] tracking-[0.16em] uppercase text-ink-faint">
              Mode démo
            </span>
          </>
        )}
      </div>

      {/* Ruler scale */}
      <svg viewBox={`0 0 ${W} 64`} className="w-full max-w-md overflow-visible">
        {/* minor ticks */}
        {minorTicks.map((t, i) => {
          const tx = PAD + (t / max) * usable;
          const isMajor = i % 10 === 0;
          if (isMajor) return null;
          return (
            <line
              key={i}
              x1={tx} y1={axisY} x2={tx} y2={axisY - 5}
              stroke="#c4bca6" strokeWidth="1"
            />
          );
        })}

        {/* baseline */}
        <line x1={PAD} y1={axisY} x2={W - PAD} y2={axisY} stroke="#211f1b" strokeWidth="1" />

        {/* filled segment 0 → value */}
        <line x1={PAD} y1={axisY} x2={x} y2={axisY} stroke={accent} strokeWidth="2.5" />

        {/* major ticks + labels */}
        {majorTicks.map((t) => {
          const tx = PAD + (t / max) * usable;
          return (
            <g key={t}>
              <line x1={tx} y1={axisY} x2={tx} y2={axisY - 10} stroke="#211f1b" strokeWidth="1" />
              <text
                x={tx} y={axisY + 16}
                textAnchor="middle"
                fontSize="10"
                fontFamily="Hanken Grotesk, sans-serif"
                fill="#9c9685"
                letterSpacing="0.5"
              >
                {t}
              </text>
            </g>
          );
        })}

        {/* marker */}
        <g style={{ transition: "transform 0.4s cubic-bezier(0.2,0.7,0.2,1)" }}>
          <line x1={x} y1={axisY - 20} x2={x} y2={axisY} stroke={accent} strokeWidth="1.5" />
          <path
            d={`M ${x} ${axisY - 20} l -5 -7 l 10 0 z`}
            fill={accent}
          />
        </g>
      </svg>
    </div>
  );
}
