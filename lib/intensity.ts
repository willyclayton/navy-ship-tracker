import type { NewsItem } from "./news";

export type IntensityLevel = "calm" | "watchful" | "elevated" | "high";

export type Driver = {
  title: string;
  link: string;
  weight: number; // positive = raises tension, negative = lowers it
  date: string;
};

export type Intensity = {
  score: number; // 0 (calm) .. 100 (high conflict)
  level: IntensityLevel;
  label: string;
  color: string;
  headline: string; // one-sentence plain-language readout
  drivers: Driver[]; // the stories that moved the needle, strongest first
};

export type IntensitySnapshot = Intensity & {
  asOf: string; // ISO, end of the 14-day window
};

/** Keyword weights applied to recent Navy headlines/summaries. */
const SIGNALS: { pattern: RegExp; weight: number }[] = [
  { pattern: /missile|rocket attack|air ?strike|drone attack/i, weight: 14 },
  { pattern: /\battack(s|ed|ing)?\b|\bstrike(s|d)? (on|against)\b/i, weight: 12 },
  { pattern: /shot down|shoot down|intercept(ed|s)?\b/i, weight: 10 },
  { pattern: /killed|casualt|wounded/i, weight: 12 },
  { pattern: /houthi|hezbollah|hostile/i, weight: 10 },
  { pattern: /escalat|retaliat/i, weight: 10 },
  { pattern: /collision|rammed|seiz(e|ed|ure)|hijack/i, weight: 9 },
  { pattern: /combat|firefight|exchange of fire|open(ed)? fire/i, weight: 10 },
  { pattern: /confrontation|standoff|harass/i, weight: 7 },
  { pattern: /tension|contested|provocat|incursion|aggress/i, weight: 6 },
  { pattern: /warning|threat(en)?/i, weight: 4 },
  { pattern: /scrambl(e|ed)|close encounter|unsafe (maneuver|intercept)/i, weight: 6 },
  { pattern: /port visit|port call|goodwill|friendship/i, weight: -6 },
  { pattern: /\bexercise\b|\bdrill(s)?\b|training/i, weight: -4 },
  { pattern: /ceremony|commission(ed|ing)|christen/i, weight: -5 },
  { pattern: /humanitarian|disaster relief|rescue/i, weight: -5 },
  { pattern: /returns? home|homecoming|welcomed home/i, weight: -5 },
  { pattern: /cease-?fire|de-?escalat|agreement|deal reached|truce/i, weight: -8 },
  { pattern: /partnership|cooperat|alliance|allied/i, weight: -4 },
];

const BASELINE = 22;
const WINDOW_MS = 14 * 24 * 3600 * 1000;
const HISTORY_WEEKS = 26;

function levelFor(score: number): { level: IntensityLevel; label: string; color: string } {
  if (score < 30) return { level: "calm", label: "Calm", color: "#16a34a" };
  if (score < 50) return { level: "watchful", label: "Watchful", color: "#ca8a04" };
  if (score < 72) return { level: "elevated", label: "Elevated", color: "#ea580c" };
  return { level: "high", label: "High tension", color: "#dc2626" };
}

/**
 * Score Navy news into a 0-100 "conflict intensity" reading.
 * Stories that mention the ship itself count double.
 */
export function computeIntensity(news: NewsItem[]): Intensity {
  let score = BASELINE;
  const drivers: Driver[] = [];

  for (const item of news) {
    const text = `${item.title} ${item.summary}`;
    let weight = 0;
    for (const signal of SIGNALS) {
      if (signal.pattern.test(text)) weight += signal.weight;
    }
    if (weight === 0) continue;
    if (item.mentionsShip) weight *= 2;
    score += weight;
    drivers.push({ title: item.title, link: item.link, weight, date: item.date });
  }

  score = Math.max(2, Math.min(98, Math.round(score)));
  const { level, label, color } = levelFor(score);
  drivers.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));

  const top = drivers[0];
  let headline: string;
  if (level === "calm") {
    headline = top && top.weight < 0
      ? "Routine operations — news is about exercises, port visits, and partnerships."
      : "Quiet stretch — nothing in Navy news that week points to active conflict.";
  } else if (level === "watchful") {
    headline = "Mostly routine, with a few stories worth keeping an eye on.";
  } else if (level === "elevated") {
    headline = "Multiple stories describe tension or confrontations in the region.";
  } else {
    headline = "News that week describes active strikes or attacks involving naval forces.";
  }

  return { score, level, label, color, headline, drivers: drivers.slice(0, 5) };
}

/** Weekly readings for the last ~6 months, oldest first. */
export function computeIntensityHistory(news: NewsItem[]): IntensitySnapshot[] {
  const now = Date.now();
  const snapshots: IntensitySnapshot[] = [];
  for (let i = HISTORY_WEEKS - 1; i >= 0; i--) {
    const end = now - i * 7 * 24 * 3600 * 1000;
    const start = end - WINDOW_MS;
    const window = news.filter((n) => {
      const t = new Date(n.date).getTime();
      return t <= end && t > start;
    });
    snapshots.push({
      asOf: new Date(end).toISOString(),
      ...computeIntensity(window),
    });
  }
  return snapshots;
}
