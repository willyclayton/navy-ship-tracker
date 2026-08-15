import type { NewsItem } from "./news";

export type IntensityLevel =
  | "calm"
  | "watchful"
  | "elevated"
  | "high"
  | "war"
  | "all-out";

export type Driver = {
  title: string;
  link: string;
  weight: number; // severity of this story (0-100 scale), not a raw keyword sum
  date: string;
};

export type Intensity = {
  score: number; // 0 (calm) .. 100 (all-out war)
  level: IntensityLevel;
  label: string;
  color: string;
  headline: string;
  drivers: Driver[];
};

export type IntensitySnapshot = Intensity & {
  asOf: string;
};

/**
 * Each story is scored by its *worst* matching tier, not the sum of every
 * keyword. 100 is reserved for all-out / nuclear / great-power world war.
 * A busy week of Iran-war headlines should land in High or War, not 98.
 */
const TIERS: { pattern: RegExp; severity: number }[] = [
  // 90–100  all-out war
  {
    pattern:
      /nuclear (strike|attack|war|weapon|detonat)|thermonuclear|world war|third world war|wwiii|all-?out war|declared war|great-?power war|invasion of (taiwan|japan|hawaii|the united states|guam)|u\.?s\. homeland (attack|struck|hit)/i,
    severity: 94,
  },
  // 75–88  shooting war between major powers
  {
    pattern:
      /war with (china|russia)|u\.?s\.?-china (war|clash|conflict)|china war|russian (attack on nato|invasion of)|article 5|nato (at war|article 5)|chinese invasion|taiwan (invasion|strait war)|prc invasion/i,
    severity: 80,
  },
  // 58–72  sustained regional war (Iran campaign, blockade, carriers in combat)
  {
    pattern:
      /iran war|war (with|on|against) iran|iran conflict|bombing campaign|blockade of|shipping .{0,20}paralyz|in combat|combat deployment|carriers? (in|into) (combat|the (war|fight))|strait of hormuz (closed|mined|blocked)/i,
    severity: 60,
  },
  // 46–56  kinetic attacks, not yet a world war
  {
    pattern:
      /air ?strike(?! group)|missile (attack|strike|barrage)|rocket attack|drone attack|ballistic missile (attack|strike)|shot down|shoot down|killed in (action|combat|an attack)|combat casualt|exchange of fire|open(?:ed)? fire|firefight/i,
    severity: 50,
  },
  // 36–46  dangerous encounters / ship damage
  {
    pattern:
      /collision at sea|rammed|seiz(?:e|ed|ure) (a |the )?(ship|vessel)|hijack|unsafe (maneuver|intercept)|laser(?:ed)? (a |the )?(aircraft|helo)|u\.?s\. (ship|destroyer|carrier) (hit|struck|damaged)/i,
    severity: 40,
  },
  // 26–36  tension, intercepts, tests
  {
    pattern:
      /confrontation|standoff|harass|scrambl(?:e|ed)|close encounter|incursion|escalat|provocat|test launch|missile test|ballistic missile/i,
    severity: 30,
  },
  // 18–26  warnings / contested waters
  {
    pattern: /\bthreat(?:en(?:ed|s|ing)?)?\b|warning shot|contested|tensions? rise/i,
    severity: 22,
  },
];

const ROUTINE =
  /port visit|port call|goodwill|friendship|\bexercise\b|\bdrill(s)?\b|training|ceremony|commission(?:ed|ing)|christen|humanitarian|disaster relief|homecoming|returns? home|partnership|cooperat|recruiting|shipbuilding|contract award|report to congress/i;

const IGNORE_CASUALTY =
  /recruit dies|during training|training accident|collapsed during|died after collapsing/i;

const BASELINE = 16;
const WINDOW_MS = 14 * 24 * 3600 * 1000;
const HISTORY_WEEKS = 26;

export function storySeverity(title: string, summary: string): number {
  const text = `${title} ${summary}`;
  if (IGNORE_CASUALTY.test(text)) return 0;

  let best = 0;
  for (const tier of TIERS) {
    if (tier.pattern.test(text)) best = Math.max(best, tier.severity);
  }

  // Procurement / test stories that mention "missile" or "strike" as a product
  // name should not ride the kinetic tier.
  if (
    best >= 50 &&
    /navy (tests|wants|to (buy|integrate|deploy))|PAC-3|long-range munition|contract|FY 20/i.test(
      text
    ) &&
    !/attack|in combat|war with|blockade/i.test(text)
  ) {
    best = Math.min(best, 22);
  }

  if (ROUTINE.test(text) && best < 40) return 0;
  return best;
}

function levelFor(score: number): {
  level: IntensityLevel;
  label: string;
  color: string;
} {
  if (score < 24) return { level: "calm", label: "Calm", color: "#16a34a" };
  if (score < 40) return { level: "watchful", label: "Watchful", color: "#ca8a04" };
  if (score < 55) return { level: "elevated", label: "Elevated", color: "#ea580c" };
  if (score < 70) return { level: "high", label: "High", color: "#dc2626" };
  if (score < 85) return { level: "war", label: "War", color: "#b91c1c" };
  return { level: "all-out", label: "All-out war", color: "#7f1d1d" };
}

function headlineFor(level: IntensityLevel, top: Driver | undefined): string {
  if (level === "all-out") {
    return "Top of the scale — headlines describe all-out or nuclear war.";
  }
  if (level === "war") {
    return "Major combat is underway. Serious, but not all-out war between great powers.";
  }
  if (level === "high") {
    return "Active regional fighting or a blockade — well short of all-out war.";
  }
  if (level === "elevated") {
    return "Strikes, intercepts, or a sharp rise in risk this week.";
  }
  if (level === "watchful") {
    return "Warnings, tests, or close calls. No major shooting war in this window.";
  }
  if (top && top.weight < 0) {
    return "Routine operations — exercises, port visits, and partnerships.";
  }
  return "Quiet stretch — nothing in Navy news that week points to a war.";
}

/**
 * Score from the worst story in the window, plus a small diminishing
 * boost for more stories at that level. Volume cannot push a regional
 * war to 100.
 */
export function computeIntensity(news: NewsItem[]): Intensity {
  const scored = news
    .map((item) => ({
      item,
      severity: storySeverity(item.title, item.summary),
    }))
    .filter((s) => s.severity > 0)
    .sort((a, b) => b.severity - a.severity);

  let score = BASELINE;
  const drivers: Driver[] = [];

  if (scored.length > 0) {
    const peak = scored[0].severity;
    let extra = 0;
    for (let i = 1; i < scored.length; i++) {
      extra += scored[i].severity / (10 * i);
    }
    extra = Math.min(12, extra);

    const shipInFight = scored.some(
      (s) => s.item.mentionsShip && s.severity >= 50
    );
    const shipBump = shipInFight ? 4 : 0;

    score = Math.round(peak + extra + shipBump);
  }

  score = Math.max(2, Math.min(100, score));
  const { level, label, color } = levelFor(score);

  for (const s of scored.slice(0, 5)) {
    drivers.push({
      title: s.item.title,
      link: s.item.link,
      weight: s.severity,
      date: s.item.date,
    });
  }

  return {
    score,
    level,
    label,
    color,
    headline: headlineFor(level, drivers[0]),
    drivers,
  };
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
