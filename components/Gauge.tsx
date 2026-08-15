// Semicircular dial: green (calm) on the left, red (high tension) on the right.

const SEGMENTS: { from: number; to: number; color: string }[] = [
  { from: 0, to: 35, color: "#2f9e44" },
  { from: 35, to: 55, color: "#d9a406" },
  { from: 55, to: 75, color: "#e8590c" },
  { from: 75, to: 100, color: "#c92a2a" },
];

const CX = 100;
const CY = 100;
const R = 78;

function point(score: number, radius: number): [number, number] {
  const angle = (Math.PI * (100 - score)) / 100; // 100 → 0 rad sweep
  return [CX + radius * Math.cos(angle), CY - radius * Math.sin(angle)];
}

function arc(from: number, to: number): string {
  const [x1, y1] = point(from, R);
  const [x2, y2] = point(to, R);
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${R} ${R} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

export default function Gauge({ score }: { score: number }) {
  const [nx, ny] = point(score, R - 22);

  return (
    <svg
      viewBox="0 0 200 116"
      className="gauge"
      role="img"
      aria-label={`Tension reading ${score} out of 100`}
    >
      {SEGMENTS.map((s) => (
        <path
          key={s.color}
          d={arc(s.from + (s.from ? 1 : 0), s.to - (s.to < 100 ? 1 : 0))}
          stroke={s.color}
          strokeWidth={12}
          strokeLinecap="round"
          fill="none"
        />
      ))}
      <line
        x1={CX}
        y1={CY}
        x2={nx.toFixed(1)}
        y2={ny.toFixed(1)}
        stroke="#1a1a1a"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <circle cx={CX} cy={CY} r={6} fill="#1a1a1a" />
      <text x={14} y={114} className="gauge-label">
        calm
      </text>
      <text x={158} y={114} className="gauge-label">
        tense
      </text>
    </svg>
  );
}
