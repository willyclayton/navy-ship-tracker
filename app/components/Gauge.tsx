import type { Intensity } from "@/lib/intensity";

/** Semicircular dial, green (calm) on the left to red (conflict) on the right. */
export default function Gauge({ intensity }: { intensity: Intensity }) {
  // Needle angle: score 0 -> -90deg (far left), 100 -> +90deg (far right)
  const angle = -90 + (intensity.score / 100) * 180;

  return (
    <div className="gauge">
      <svg viewBox="0 0 200 118" role="img" aria-label={`Conflict intensity ${intensity.score} out of 100: ${intensity.label}`}>
        <defs>
          <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#16a34a" />
            <stop offset="40%" stopColor="#eab308" />
            <stop offset="70%" stopColor="#ea580c" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
        </defs>
        <path
          d="M 16 100 A 84 84 0 0 1 184 100"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="15"
          strokeLinecap="round"
        />
        <path
          d="M 16 100 A 84 84 0 0 1 184 100"
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="15"
          strokeLinecap="round"
          opacity="0.9"
        />
        {/* tick labels */}
        <text x="16" y="115" className="gauge-tick">calm</text>
        <text x="184" y="115" className="gauge-tick" textAnchor="end">all-out war</text>
        {/* needle */}
        <g transform={`rotate(${angle} 100 100)`}>
          <line x1="100" y1="100" x2="100" y2="28" stroke="#1f2937" strokeWidth="3.5" strokeLinecap="round" />
        </g>
        <circle cx="100" cy="100" r="7" fill="#1f2937" />
      </svg>
      <div className="gauge-readout">
        <span className="gauge-label" style={{ color: intensity.color }}>
          {intensity.label}
        </span>
        <span className="gauge-score">{intensity.score}/100</span>
      </div>
    </div>
  );
}
