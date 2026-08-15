import type { NewsItem } from "./news";

export type TensionLevel = "calm" | "steady" | "elevated" | "high";

export type Tension = {
  score: number; // 0..100
  level: TensionLevel;
  headline: string;
  drivers: { title: string; link: string; weight: number }[];
};

// Signals of friction vs. calm in recent coverage. Matching is done on
// lowercased text with naval false-positives ("strike group") removed.
const ESCALATING: [RegExp, number][] = [
  [/\battack(s|ed)?\b/, 8],
  [/\bmissile(s)? (fired|launch|struck)/, 8],
  [/\bshot down\b/, 8],
  [/\bsunk\b|\bsinking\b/, 8],
  [/\bkilled\b|\bcasualt/, 8],
  [/\bwar\b(?!game)/, 6],
  [/\bconflict\b/, 6],
  [/\bcombat\b/, 6],
  [/\bexplosion\b/, 6],
  [/\bseized?\b|\bblockade\b|\binvasion\b/, 6],
  [/\bcollision\b/, 5],
  [/\bescalat/, 5],
  [/\bstandoff\b|\bconfrontation\b/, 5],
  [/\bintercept(ed|s)?\b/, 4],
  [/\bharass/, 4],
  [/\bincursion\b/, 4],
  [/\btension(s)?\b/, 3],
  [/\bthreat(s|en)/, 3],
  [/\btrapped\b/, 3],
  [/\bdispute(d)?\b/, 2],
];

const CALMING: [RegExp, number][] = [
  [/\bceasefire\b|\btruce\b/, -6],
  [/\bde-?escalat/, -6],
  [/\bagreement\b|\bpeace talks\b|\bdiploma/, -3],
  [/\breturn(s|ed)? (home|from deployment)/, -3],
  [/\bport (visit|call)\b/, -2],
  [/\bcooperat/, -2],
  [/\bhumanitarian\b|\brescue(d)?\b/, -2],
];

const LEVELS: {
  level: TensionLevel;
  max: number;
  headline: string;
}[] = [
  {
    level: "calm",
    max: 35,
    headline: "Quiet right now — mostly routine training, exercises and port visits.",
  },
  {
    level: "steady",
    max: 55,
    headline: "Normal operations with the usual background friction in the region.",
  },
  {
    level: "elevated",
    max: 75,
    headline: "More friction than usual — recent coverage points to raised tensions.",
  },
  {
    level: "high",
    max: 101,
    headline: "A lot of activity — recent reporting describes serious tensions.",
  },
];

export function assessTension(news: NewsItem[]): Tension {
  let score = 28; // baseline: a carrier on patrol is never a zero
  const scored: { title: string; link: string; weight: number }[] = [];

  for (const item of news) {
    // Remove naval jargon and historical references that read as violent
    // to the keyword matcher but aren't.
    const text = `${item.title} ${item.summary}`
      .toLowerCase()
      .replace(
        /carrier strike group|strike group|strike fighter|engineering casualty|world war (ii|i|2|1)?|cold war|war(time)? memorial/g,
        ""
      );
    let weight = 0;
    for (const [re, w] of ESCALATING) if (re.test(text)) weight += w;
    for (const [re, w] of CALMING) if (re.test(text)) weight += w;
    if (weight !== 0) scored.push({ title: item.title, link: item.link, weight });
    score += weight;
  }

  score = Math.max(5, Math.min(95, score));
  const { level, headline } = LEVELS.find((l) => score < l.max)!;

  // Explain the reading: what pushed it up (or, when calm, what kept it down).
  const drivers = scored
    .filter((d) => (score >= 45 ? d.weight > 0 : d.weight !== 0))
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
    .slice(0, 4);

  return { score, level, headline, drivers };
}
