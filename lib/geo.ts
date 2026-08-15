import type { HistoryEntry } from "./fleet";

export type Point = { lat: number; lng: number };

/** Approximate centers of the sea regions the USNI Fleet Tracker uses. */
const REGIONS: Record<string, Point> = {
  "philippine sea": { lat: 20.5, lng: 132 },
  "south china sea": { lat: 12.5, lng: 114.5 },
  "east china sea": { lat: 27.5, lng: 125.5 },
  "sea of japan": { lat: 39, lng: 134 },
  "yellow sea": { lat: 36, lng: 123.5 },
  "western pacific": { lat: 18, lng: 137 },
  "pacific ocean": { lat: 22, lng: 155 },
  "eastern pacific": { lat: 18, lng: -125 },
  "coral sea": { lat: -16, lng: 152 },
  "tasman sea": { lat: -38, lng: 160 },
  "timor sea": { lat: -11, lng: 127 },
  "java sea": { lat: -5, lng: 111 },
  "celebes sea": { lat: 3.5, lng: 122 },
  "sulu sea": { lat: 8.5, lng: 120 },
  "andaman sea": { lat: 10, lng: 96 },
  "bay of bengal": { lat: 13, lng: 88 },
  "indian ocean": { lat: -5, lng: 80 },
  "arabian sea": { lat: 15, lng: 63 },
  "gulf of oman": { lat: 24.5, lng: 58.5 },
  "persian gulf": { lat: 26.5, lng: 52 },
  "arabian gulf": { lat: 26.5, lng: 52 },
  "red sea": { lat: 19, lng: 39 },
  "gulf of aden": { lat: 12.5, lng: 47 },
  "gulf of thailand": { lat: 9.5, lng: 101.5 },
  "strait of malacca": { lat: 4.66, lng: 99.55 },
  "malacca strait": { lat: 4.66, lng: 99.55 },
  "singapore strait": { lat: 1.22, lng: 103.85 },
  "taiwan strait": { lat: 24.3, lng: 119.5 },
  "luzon strait": { lat: 20.5, lng: 121 },
  "solomon sea": { lat: -8, lng: 153 },
  "mediterranean sea": { lat: 35, lng: 18 },
  "atlantic ocean": { lat: 30, lng: -55 },
  "caribbean sea": { lat: 15, lng: -73 },
  "gulf of alaska": { lat: 57, lng: -145 },
  japan: { lat: 35.293, lng: 139.662 }, // tracker's "In Japan" = pier at Yokosuka
  guam: { lat: 13.44, lng: 144.65 },
  australia: { lat: -33.85, lng: 151.2 },
  "san diego": { lat: 32.684, lng: -117.13 },
  norfolk: { lat: 36.945, lng: -76.31 },
  "pearl harbor": { lat: 21.353, lng: -157.96 },
};

/** Ports the carrier realistically calls at; matched against the blurb text. */
const PORTS: { name: string; pattern: RegExp; point: Point }[] = [
  { name: "Yokosuka, Japan", pattern: /yokosuka/i, point: { lat: 35.293, lng: 139.662 } },
  { name: "Apra Harbor, Guam", pattern: /guam|apra/i, point: { lat: 13.44, lng: 144.65 } },
  { name: "Sasebo, Japan", pattern: /sasebo/i, point: { lat: 33.16, lng: 129.72 } },
  { name: "Busan, South Korea", pattern: /busan|pusan/i, point: { lat: 35.1, lng: 129.04 } },
  { name: "Manila, Philippines", pattern: /manila/i, point: { lat: 14.58, lng: 120.95 } },
  { name: "Subic Bay, Philippines", pattern: /subic/i, point: { lat: 14.79, lng: 120.28 } },
  { name: "Singapore", pattern: /singapore|changi/i, point: { lat: 1.32, lng: 103.97 } },
  { name: "Laem Chabang, Thailand", pattern: /laem chabang|pattaya/i, point: { lat: 13.08, lng: 100.89 } },
  { name: "Sydney, Australia", pattern: /sydney/i, point: { lat: -33.85, lng: 151.22 } },
  { name: "Brisbane, Australia", pattern: /brisbane/i, point: { lat: -27.38, lng: 153.16 } },
  { name: "Da Nang, Vietnam", pattern: /da ?nang/i, point: { lat: 16.09, lng: 108.22 } },
  { name: "Pearl Harbor, Hawaii", pattern: /pearl harbor/i, point: { lat: 21.353, lng: -157.96 } },
];

const IN_PORT_RE =
  /\bin port\b|\bis in yokosuka\b|\breturned\b[^.]*\byokosuka\b|\bmoored\b|\bpierside\b/i;

/**
 * Detect a passing mention of a recent port call in an at-sea blurb,
 * e.g. "operating in the Philippine Sea after visiting Guam last week".
 */
export function findPortCallMention(text: string): string | null {
  if (!/visit(ed|ing)?|port call|pulled into|arrived (in|at)|depart(s|ed|ing)|underway from|left port/i.test(text)) return null;
  const port = PORTS.find((p) => p.pattern.test(text));
  return port ? port.name : null;
}

function normalizeRegion(region: string): string {
  return region
    .replace(/\u00a0/g, " ")
    .replace(/^in the\s+/i, "")
    .replace(/^near\s+/i, "")
    .replace(/^at\s+/i, "")
    .replace(/^in\s+/i, "")
    .replace(/[.,]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const REGION_ALIASES: [RegExp, string][] = [
  [/malacca strait|strait of malacca/i, "strait of malacca"],
  [/singapore strait/i, "singapore strait"],
  [/taiwan strait/i, "taiwan strait"],
];

const WATER_BODY = /\b(sea|strait|ocean|gulf|bay)\b/i;

function lookupRegion(key: string): Point | null {
  if (REGIONS[key]) return REGIONS[key];
  for (const [re, alias] of REGION_ALIASES) {
    if (re.test(key) && REGIONS[alias]) return REGIONS[alias];
  }
  return null;
}

/** Title-case a region key without capitalizing of/the/and. */
export function prettyRegion(keyOrHeading: string): string {
  const key = normalizeRegion(keyOrHeading);
  if (!key) return keyOrHeading;
  return key
    .replace(/\b\w+/g, (w) =>
      /^(of|the|and)$/i.test(w) ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1)
    )
    .replace(/^./, (c) => c.toUpperCase());
}

/**
 * Find a known sea/strait in free text. Prefers "is/was in the X" (current
 * position) over transit/destination phrasing, so "in the Strait of Malacca
 * ... to enter the Andaman Sea" stays Malacca — matching USNI's own pin.
 */
export function inferRegionFromText(text: string): string | null {
  const wasIn =
    /(?:is|was|were)\s+(?:currently\s+)?in\s+(?:the\s+)?([^.,;]+)/gi;
  let found: string | null = null;
  let match: RegExpExecArray | null;
  while ((match = wasIn.exec(text)) !== null) {
    const hit = matchRegionName(match[1]);
    if (hit) found = hit;
  }
  if (found) return found;

  const moved =
    /(?:operating in|transited(?:\s+\w+)?\s+(?:to|into)|enter(?:ed)?(?:\s+the)?)\s+(?:the\s+)?([^.,;]+)/gi;
  while ((match = moved.exec(text)) !== null) {
    const hit = matchRegionName(match[1]);
    if (hit) found = hit;
  }
  if (found) return found;

  return matchRegionName(text);
}

function matchRegionName(haystack: string): string | null {
  const lower = haystack.toLowerCase();
  for (const [re, alias] of REGION_ALIASES) {
    if (re.test(haystack)) return alias;
  }
  let best: string | null = null;
  for (const key of Object.keys(REGIONS)) {
    if (!WATER_BODY.test(key)) continue;
    if (lower.includes(key) && (!best || key.length > best.length)) best = key;
  }
  return best;
}

export type Located = {
  point: Point | null;
  placeName: string; // human label, e.g. "Philippine Sea" or "Yokosuka, Japan"
  inPort: boolean;
};

/** Turn a tracker region heading + blurb into an approximate map position. */
export function locate(
  region: string,
  blurb: string,
  exact?: Point | null
): Located {
  const key = normalizeRegion(region);
  const inPort = IN_PORT_RE.test(blurb) || key === "japan";

  if (inPort) {
    const port = PORTS.find((p) => p.pattern.test(blurb) || p.pattern.test(region));
    if (port) return { point: port.point, placeName: port.name, inPort: true };
  }

  if (exact) {
    return {
      point: exact,
      placeName: prettyRegion(key || region),
      inPort,
    };
  }

  const inferred = lookupRegion(key) ? key : inferRegionFromText(blurb);
  const resolvedKey = (lookupRegion(key) ? key : inferred) ?? key;
  const point = lookupRegion(resolvedKey) ?? lookupRegion(key);
  const placeName = prettyRegion(resolvedKey || region);
  return { point, placeName, inPort };
}

/**
 * A "stop" is a run of consecutive weekly tracker reports that place the ship
 * in the same spot. Collapsing them keeps the map readable when the carrier
 * sits in port (or in the same sea) for months.
 */
export type Stop = {
  point: Point;
  placeName: string;
  inPort: boolean;
  startDate: string; // ISO, oldest report in the run
  endDate: string; // ISO, newest report in the run
  weeks: number;
  blurb: string; // most recent blurb for the run
  url: string; // most recent USNI article
  isCurrent: boolean;
  // A port call mentioned in passing during this run
  // ("...after visiting Guam last week"), if any.
  portCallName: string | null;
  portCallDate: string | null;
};

/** history must be newest-first (as produced by getShipStatus). */
export function buildStops(history: HistoryEntry[]): Stop[] {
  const chronological = [...history].reverse();
  const stops: Stop[] = [];

  for (const entry of chronological) {
    const blurb = entry.summary.join(" ");
    const loc = locate(entry.region, blurb, entry.point);
    if (!loc.point) continue;

    const mention = loc.inPort ? null : findPortCallMention(blurb);

    const prev = stops[stops.length - 1];
    if (
      prev &&
      prev.placeName === loc.placeName &&
      prev.inPort === loc.inPort
    ) {
      prev.endDate = entry.date;
      prev.weeks += 1;
      prev.blurb = blurb;
      prev.url = entry.url;
      if (mention) {
        prev.portCallName = mention;
        prev.portCallDate = entry.date;
      }
    } else {
      stops.push({
        point: loc.point,
        placeName: loc.placeName,
        inPort: loc.inPort,
        startDate: entry.date,
        endDate: entry.date,
        weeks: 1,
        blurb,
        url: entry.url,
        isCurrent: false,
        portCallName: mention,
        portCallDate: mention ? entry.date : null,
      });
    }
  }

  if (stops.length > 0) stops[stops.length - 1].isCurrent = true;
  return stops;
}
