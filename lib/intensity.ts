import type { NewsItem } from "./news";

export type IntensityLevel =
  | "calm"
  | "watchful"
  | "elevated"
  | "high"
  | "war"
  | "all-out";

export type StoryClass =
  | "ignore"
  | "watch"
  | "kinetic"
  | "regional"
  | "great-power"
  | "all-out";

export type Driver = {
  title: string;
  link: string;
  weight: number; // contribution after recency, 0-100
  date: string;
  why: string;
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

export type ClassifiedStory = {
  cls: StoryClass;
  severity: number;
  why: string;
};

const WINDOW_MS = 14 * 24 * 3600 * 1000;
const PERSIST_MS = 50 * 24 * 3600 * 1000;
const HISTORY_WEEKS = 26;

/** Quiet baseline when nothing is happening. Not high enough to look like tension. */
const CALM_BASELINE = 8;
/** Floor while a U.S. regional war is still the last word in the lookback. */
const REGIONAL_FLOOR = 58;
const GREAT_POWER_FLOOR = 74;

const CLASS_SEVERITY: Record<Exclude<StoryClass, "ignore">, number> = {
  watch: 24,
  kinetic: 46,
  regional: 62,
  "great-power": 78,
  "all-out": 94,
};

const CLASS_CAP: Record<StoryClass, number> = {
  ignore: 20,
  watch: 38,
  kinetic: 54,
  regional: 68,
  "great-power": 84,
  "all-out": 100,
};

const CLASS_WHY: Record<Exclude<StoryClass, "ignore">, string> = {
  watch: "warning / close call",
  kinetic: "strikes or combat",
  regional: "regional war",
  "great-power": "great-power war",
  "all-out": "all-out / nuclear war",
};

/** Museum / history — never a current war, even if the word “war” appears. */
const HISTORICAL_IGNORE = [
  /world war (i|ii|one|two|1|2)\b/i,
  /\bww(?:iii|ii|i|3|2|1)\b/i,
  /\bcold war\b/i,
  /korean war|vietnam war|wreck hunter|torpedo plane|sea floor|commemorat|\bmuseum\b|anniversary|reborn as|dedicates .{0,60} (to|ww)/i,
];

/** SSN jargon and admin copy. Overridden when the same story describes live combat. */
const PLATFORM_IGNORE = [
  /nuclear[- ]?(powered[- ])?(attack[- ])?(submarine|boat|sub)\b/i,
  /\battack boat\b|\bssn\b|\bssbn\b|virginia.class|columbia.class/i,
  /recruit dies|during training|training accident|collapsed during|died after collapsing/i,
  /shipbuilding industrial|inactivate|christen(?:ed|ing)|commission(?:ed|ing) ceremony/i,
  /nuclear weapons (and missile )?programs?|nuclear[- ]powered submarine initiative/i,
];

const ROUTINE =
  /\bexercise\b|\bdrill(s)?\b|\btraining\b|\bRIMPAC\b|Valiant Shield|Han Kuang|port visit|port call|goodwill|friendship|homecoming|returns? home|partnership|cooperat|recruiting|ceremony|humanitarian|disaster relief/i;

const LIVE_COMBAT =
  /shot down|shoots down|drone(?:s)? attack|killed in|blockade|war with|war on|in combat against|torpedo(?:es|ed)?|\bfrigate\b|resume attacks|iranian attacks|ships damaged/i;

const CRS_OR_BUDGET =
  /report to congress|crs report|from the report|navy budget|awards? \$\d|billion .{0,30}contract|contract award|wants \$\d/i;

/** A broken ceasefire is the war continuing, not the war ending. */
const WAR_ENDED =
  /(?:reached|agreed(?: to)?|signed) (?:a |the )?(?:cease-?fire|truce|peace (?:deal|agreement|treaty))|(?:cease-?fire|truce) (?:takes effect|holds|is in effect)|war (with \w+ )?(is |has )?(over|ended)|hostilities (have )?ended/i;
const CEASEFIRE_BROKEN =
  /cease-?fire.{0,24}(broke|broken|collapse|violat)|broke(?:n)? (?:down )?(?:the )?(?:cease-?fire|truce)/i;

const NOT_AN_INVASION =
  /\bnot\b.{0,48}invasion|no (plans|intent|commitment).{0,24}invad|uncommitted to .{0,24}invasion/i;

const ALL_OUT = [
  /thermonuclear|(?:third|3rd) world war|\bww(?:iii|3)\b|all-?out war/i,
  /(?:^|[^a-z])world war(?! (?:i|ii|one|two|1|2)\b)/i,
  /nuclear (detonat|strike|first strike|weapon used|weapons? (used|launched))/i,
  /u\.?s\. homeland (attack|struck|hit)|invasion of (the united states|hawaii)/i,
];

const GREAT_POWER = [
  /war with (china|russia)|u\.?s\.?-china (war|clash|conflict)/i,
  /article 5 (invoked|triggered)|nato (at war|article 5)/i,
  /chinese invasion of taiwan|invasion of taiwan (is |has )?(underway|begun|started)/i,
  /taiwan strait war|prc invasion of taiwan/i,
  /russian (attack on nato|invasion of (nato|poland|the baltics|lithuania|latvia|estonia))/i,
];

const REGIONAL = [
  /iran[-–.\s]*u\.?s\.?[-–.\s]*conflict|u\.?s\.?[-–.\s]*iran[-–.\s]*conflict/i,
  /iran conflict|iran war|war (with|on|against) iran|conflict with iran/i,
  /(?:naval )?blockade of iran|iranian blockade|blockade of all iranian/i,
  /blockade in (the )?strait of hormuz|strait of hormuz (closed|mined|blocked)|hormuz blockade/i,
  /ships trapped in (the )?(persian gulf|strait of hormuz|gulf)/i,
  /bombing campaign against/i,
  /carriers? (in|into) (combat|the (war|fight))/i,
];

const KINETIC = [
  /air ?strikes?(?! group)/i,
  /missile (attack|strike|barrage)|rocket attack|drone(?:s)? attack/i,
  /ballistic missile (attack|strike|launch)/i,
  /shot down|shoots down|shoot down/i,
  /killed in (action|combat|an attack|tuesday strike)|combat casualt/i,
  /exchange of fire|open(?:ed)? fire|firefight/i,
  /disables?,? (?:and )?seizes?|disables? (?:an? |the )?(?:oil )?tanker|disables? (?:an? |the )?ship/i,
  /drones attack|lethal .{0,20}drones? attack|torpedo(?:es|ed)?/i,
  /ships damaged|resume attacks|iranian attacks/i,
];

const WATCH = [
  /confrontation|standoff|harass|scrambl(?:e|ed)|close encounter|incursion/i,
  /provocat|test launch|missile test|tensions? rise/i,
  /\bthreat(?:en(?:ed|s|ing)?)?\b|warning shot|contested/i,
  /\bclash(?:es)?\b|violent clash/i,
];

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

/**
 * One class per story: the worst *current* event it describes.
 * Historical and platform-jargon hits are ignored, not summed.
 */
export function classifyStory(title: string, summary: string): ClassifiedStory {
  const text = `${title} ${summary}`;

  if (HISTORICAL_IGNORE.some((p) => p.test(text))) {
    return { cls: "ignore", severity: 0, why: "not a current war story" };
  }
  if (PLATFORM_IGNORE.some((p) => p.test(text)) && !LIVE_COMBAT.test(text)) {
    return { cls: "ignore", severity: 0, why: "not a current war story" };
  }

  if (ROUTINE.test(text) && !LIVE_COMBAT.test(text)) {
    return { cls: "ignore", severity: 0, why: "routine operations" };
  }

  const crs = CRS_OR_BUDGET.test(text);

  if (matchesAny(text, ALL_OUT) && !crs) {
    return {
      cls: "all-out",
      severity: CLASS_SEVERITY["all-out"],
      why: CLASS_WHY["all-out"],
    };
  }

  if (matchesAny(text, GREAT_POWER) && !NOT_AN_INVASION.test(text)) {
    if (crs) {
      return {
        cls: "watch",
        severity: CLASS_SEVERITY.watch,
        why: "assessment, not an invasion underway",
      };
    }
    return {
      cls: "great-power",
      severity: CLASS_SEVERITY["great-power"],
      why: CLASS_WHY["great-power"],
    };
  }

  if (matchesAny(text, REGIONAL)) {
    return {
      cls: "regional",
      severity: crs ? 55 : CLASS_SEVERITY.regional,
      why: CLASS_WHY.regional,
    };
  }

  if (matchesAny(text, KINETIC) && !crs) {
    return {
      cls: "kinetic",
      severity: CLASS_SEVERITY.kinetic,
      why: CLASS_WHY.kinetic,
    };
  }

  if (matchesAny(text, WATCH) && !crs) {
    return {
      cls: "watch",
      severity: CLASS_SEVERITY.watch,
      why: CLASS_WHY.watch,
    };
  }

  return { cls: "ignore", severity: 0, why: "no conflict signal" };
}

/** @deprecated use classifyStory — kept so older call sites keep working. */
export function storySeverity(title: string, summary: string): number {
  return classifyStory(title, summary).severity;
}

function recencyWeight(ageMs: number, cls: StoryClass): number {
  const days = ageMs / (24 * 3600 * 1000);
  if (days < 0 || days > 14) return 0;
  // Unfinished wars stay in-band for the whole two-week window.
  if (cls === "regional" || cls === "great-power" || cls === "all-out") return 1;
  if (days <= 4) return 1;
  if (days <= 8) return 0.88;
  return 0.72;
}

function levelFor(score: number): {
  level: IntensityLevel;
  label: string;
  color: string;
} {
  if (score < 22) return { level: "calm", label: "Calm", color: "#16a34a" };
  if (score < 38) return { level: "watchful", label: "Watchful", color: "#ca8a04" };
  if (score < 52) return { level: "elevated", label: "Elevated", color: "#ea580c" };
  if (score < 69) return { level: "high", label: "High", color: "#dc2626" };
  if (score < 85) return { level: "war", label: "War", color: "#b91c1c" };
  return { level: "all-out", label: "All-out war", color: "#7f1d1d" };
}

function headlineFor(
  level: IntensityLevel,
  top: Driver | undefined,
  floorActive: boolean
): string {
  if (level === "all-out") {
    return "Top of the scale — headlines describe nuclear use or a world war.";
  }
  if (level === "war") {
    return "Great-power combat is underway. Serious, but not all-out / nuclear war.";
  }
  if (level === "high") {
    return floorActive
      ? "A regional war is still on — intense, but nowhere near all-out war."
      : "Active regional fighting or a blockade — well short of all-out war.";
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

type Ranked = {
  item: NewsItem;
  classified: ClassifiedStory;
  weighted: number;
  ageMs: number;
};

function parseTime(iso: string): number {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Ongoing-war floor: if the most recent regional/great-power/all-out story
 * in the lookback is not a war-ended story, keep the needle in that band
 * even when this week's headlines are shipbuilding memos.
 */
function persistenceFloor(ranked: Ranked[]): {
  floor: number;
  driver: Ranked | undefined;
} {
  const lookback = ranked.filter(
    (s) =>
      s.classified.severity > 0 &&
      s.ageMs >= 0 &&
      s.ageMs <= PERSIST_MS &&
      (s.classified.cls === "regional" ||
        s.classified.cls === "great-power" ||
        s.classified.cls === "all-out")
  );
  if (lookback.length === 0) return { floor: 0, driver: undefined };

  const latest = lookback.reduce((a, b) =>
    parseTime(a.item.date) >= parseTime(b.item.date) ? a : b
  );
  const text = `${latest.item.title} ${latest.item.summary}`;
  if (WAR_ENDED.test(text) && !CEASEFIRE_BROKEN.test(text)) {
    return { floor: 0, driver: undefined };
  }

  if (latest.classified.cls === "all-out") {
    return { floor: 88, driver: latest };
  }
  if (latest.classified.cls === "great-power") {
    return { floor: GREAT_POWER_FLOOR, driver: latest };
  }
  return { floor: REGIONAL_FLOOR, driver: latest };
}

/**
 * Score from event class (not keyword sums), recency-weighted inside two
 * weeks, with a persistence floor so an unfinished regional war cannot
 * read as "calm" or jump to "all-out" because of WWII / SSN jargon.
 */
export function computeIntensity(
  news: NewsItem[],
  asOf: number | Date = Date.now()
): Intensity {
  const asOfMs = typeof asOf === "number" ? asOf : asOf.getTime();

  const ranked: Ranked[] = news
    .map((item) => {
      const classified = classifyStory(item.title, item.summary);
      const ageMs = asOfMs - parseTime(item.date);
      const inWindow = ageMs >= 0 && ageMs <= WINDOW_MS;
      const weighted =
        classified.severity > 0 && inWindow
          ? classified.severity * recencyWeight(ageMs, classified.cls)
          : 0;
      return { item, classified, weighted, ageMs };
    })
    .filter((s) => s.ageMs >= 0);

  const inWindow = ranked
    .filter((s) => s.weighted > 0)
    .sort((a, b) => b.weighted - a.weighted);

  let windowScore = CALM_BASELINE;
  let cap: number = CLASS_CAP.ignore;
  if (inWindow.length > 0) {
    const peak = inWindow[0].weighted;
    let extra = 0;
    for (let i = 1; i < inWindow.length; i++) {
      extra += inWindow[i].weighted / (12 * i);
    }
    extra = Math.min(6, extra);
    const shipBump = inWindow.some(
      (s) => s.item.mentionsShip && s.classified.severity >= 46
    )
      ? 3
      : 0;
    windowScore = peak + extra + shipBump;
    const topClass = inWindow.reduce(
      (best, s) =>
        s.classified.severity > best.classified.severity ? s : best,
      inWindow[0]
    ).classified.cls;
    cap = CLASS_CAP[topClass];
    windowScore = Math.min(windowScore, cap);
  }

  const persist = persistenceFloor(ranked);
  let score = Math.max(windowScore, persist.floor);
  score = Math.max(2, Math.min(100, Math.round(score)));

  const { level, label, color } = levelFor(score);

  const drivers: Driver[] = [];
  const seen = new Set<string>();
  const push = (s: Ranked, weight: number) => {
    if (seen.has(s.item.link)) return;
    seen.add(s.item.link);
    drivers.push({
      title: s.item.title,
      link: s.item.link,
      weight: Math.round(weight),
      date: s.item.date,
      why: s.classified.why,
    });
  };
  for (const s of inWindow.slice(0, 5)) push(s, s.weighted);
  if (
    persist.driver &&
    persist.floor >= score - 2 &&
    persist.driver.weighted === 0
  ) {
    push(persist.driver, persist.floor);
  }

  return {
    score,
    level,
    label,
    color,
    headline: headlineFor(level, drivers[0], persist.floor >= REGIONAL_FLOOR),
    drivers: drivers.slice(0, 5),
  };
}

/** Weekly readings for the last ~6 months, oldest first. */
export function computeIntensityHistory(
  news: NewsItem[],
  now: number = Date.now()
): IntensitySnapshot[] {
  const snapshots: IntensitySnapshot[] = [];
  for (let i = HISTORY_WEEKS - 1; i >= 0; i--) {
    const end = now - i * 7 * 24 * 3600 * 1000;
    snapshots.push({
      asOf: new Date(end).toISOString(),
      ...computeIntensity(news, end),
    });
  }
  return snapshots;
}
