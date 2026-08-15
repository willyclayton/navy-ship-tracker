"use client";

import { useMemo, useState } from "react";
import type { IntensitySnapshot } from "@/lib/intensity";
import Gauge from "./Gauge";

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function IntensityPanel({
  history,
}: {
  history: IntensitySnapshot[];
}) {
  const last = Math.max(0, history.length - 1);
  const [idx, setIdx] = useState(last);
  const snap = history[idx] ?? history[last];
  const isNow = idx === last;

  const spark = useMemo(() => {
    if (history.length === 0) return "";
    const w = 260;
    const h = 36;
    const max = Math.max(40, ...history.map((s) => s.score));
    const pts = history.map((s, i) => {
      const x = (i / Math.max(1, history.length - 1)) * w;
      const y = h - (s.score / max) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return `M ${pts.join(" L ")}`;
  }, [history]);

  if (!snap) return null;

  return (
    <section className="card">
      <h2 className="card-title">Conflict intensity</h2>
      <Gauge intensity={snap} />
      <p className="blurb">{snap.headline}</p>
      <p className="intensity-when">
        {isNow ? "Now" : shortDate(snap.asOf)} · last 14 days of Navy headlines
      </p>
      {history.length > 1 && (
        <div className="intensity-scrub">
          <svg
            className="intensity-spark"
            viewBox="0 0 260 36"
            aria-hidden
          >
            <path d={spark} fill="none" stroke="#0b4f9e" strokeWidth="2" />
            {history[idx] && (
              <circle
                cx={(idx / Math.max(1, history.length - 1)) * 260}
                cy={
                  36 -
                  (snap.score / Math.max(40, ...history.map((s) => s.score))) *
                    32 -
                  2
                }
                r="4"
                fill="#dc2626"
              />
            )}
          </svg>
          <input
            type="range"
            min={0}
            max={last}
            value={idx}
            onChange={(e) => setIdx(Number(e.target.value))}
            aria-label="Scrub conflict intensity over the last six months"
          />
          <div className="intensity-ends">
            <span>{shortDate(history[0].asOf)}</span>
            <span>today</span>
          </div>
        </div>
      )}
      {snap.drivers.length > 0 && (
        <details>
          <summary>What&apos;s moving the needle</summary>
          <ul className="drivers">
            {snap.drivers.map((d) => (
              <li key={d.link}>
                <span className={d.weight > 0 ? "up" : "down"}>
                  {d.weight > 0 ? "▲" : "▼"}
                </span>
                <a href={d.link}>{d.title}</a>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
