"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { Stop } from "@/lib/geo";

const ShipMap = dynamic(() => import("./ShipMap"), {
  ssr: false,
  loading: () => <div className="map-loading">Loading map…</div>,
});

const RANGES = [
  { label: "4 wk", weeks: 4 },
  { label: "8 wk", weeks: 8 },
  { label: "12 wk", weeks: 12 },
  { label: "All", weeks: Infinity },
];

export default function MapPanel({ stops }: { stops: Stop[] }) {
  const [weeks, setWeeks] = useState(12);

  const visible = useMemo(() => {
    if (!isFinite(weeks)) return stops;
    const cutoff = Date.now() - weeks * 7 * 24 * 3600 * 1000;
    const filtered = stops.filter(
      (s) => new Date(s.endDate).getTime() >= cutoff || s.isCurrent
    );
    return filtered.length > 0 ? filtered : stops.slice(-1);
  }, [stops, weeks]);

  return (
    <div className="map-card">
      <div className="map-toolbar">
        <span className="map-title">Track history</span>
        <div className="range-btns" role="group" aria-label="History range">
          {RANGES.map((r) => (
            <button
              key={r.label}
              className={weeks === r.weeks ? "active" : ""}
              onClick={() => setWeeks(r.weeks)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div className="map-body">
        <ShipMap stops={visible} />
      </div>
      <p className="map-hint">
        Click a numbered dot for that week&apos;s report. Current position
        uses the newest USNI Pulse or Fleet Tracker; Pulse map pins when
        available.
      </p>
    </div>
  );
}
