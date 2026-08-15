import { findRegionsInText } from "./coords";
import { fetchPage } from "./rss";
import { decodeEntities, stripTags, summarize } from "./text";

// The category feed holds a deep archive of tracker posts; the main feed is
// often fresher at CDN edges. Merge both so we always have the newest tracker.
const FEEDS = [
  "https://news.usni.org/category/fleet-tracker/feed",
  "https://news.usni.org/feed",
];
const SHIP_PATTERN = /George Washington|CVN-?\s?73/i;

export type ShipPhoto = { src: string; caption: string };

export type ShipStatus = {
  region: string;
  summary: string[];
  photo: ShipPhoto | null;
  asOf: string; // ISO date of the source report
  articleTitle: string;
  articleUrl: string;
  source: string; // e.g. "USNI Fleet Tracker" or "USNI News report"
  history: HistoryEntry[];
};

export type HistoryEntry = {
  date: string; // ISO
  region: string;
  url: string;
  title: string;
  blurb: string;
};

type RawItem = {
  title: string;
  link: string;
  pubDate: string;
  content: string; // raw HTML from content:encoded
};

function extractRaw(tag: string, xml: string): string {
  const cdata = new RegExp(
    `<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`,
    "i"
  ).exec(xml);
  if (cdata) return cdata[1].trim();
  const plain = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i").exec(xml);
  return plain ? decodeEntities(plain[1].trim()) : "";
}

function parseItems(xml: string): RawItem[] {
  const chunks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
  return chunks
    .map((chunk) => ({
      title: stripTags(extractRaw("title", chunk)),
      link: extractRaw("link", chunk),
      pubDate: new Date(extractRaw("pubDate", chunk)).toISOString(),
      content: extractRaw("content:encoded", chunk),
    }))
    .filter((i) => i.title && i.content)
    .sort((a, b) => b.pubDate.localeCompare(a.pubDate));
}

type Section = { region: string; html: string };

/** Split an article body into sections keyed by their <h2> region headings. */
function splitSections(content: string): Section[] {
  const sections: Section[] = [];
  const headingRe = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  let match: RegExpExecArray | null;
  let prev: { region: string; start: number } | null = null;
  while ((match = headingRe.exec(content)) !== null) {
    if (prev) {
      sections.push({
        region: prev.region,
        html: content.slice(prev.start, match.index),
      });
    }
    prev = { region: stripTags(match[1]), start: headingRe.lastIndex };
  }
  if (prev) {
    sections.push({ region: prev.region, html: content.slice(prev.start) });
  }
  return sections;
}

function findShipSection(content: string): Section | null {
  for (const section of splitSections(content)) {
    const paragraphs = section.html.match(/<p[\s>][\s\S]*?<\/p>/gi) ?? [];
    if (paragraphs.some((p) => SHIP_PATTERN.test(stripTags(p)))) {
      return section;
    }
  }
  return null;
}

function shipParagraphs(sectionHtml: string): string[] {
  // Sections can cover several ships; keep only paragraphs about ours.
  return (sectionHtml.match(/<p[\s>][\s\S]*?<\/p>/gi) ?? [])
    .map((p) => stripTags(p))
    .filter((p) => SHIP_PATTERN.test(p));
}

function shipPhoto(sectionHtml: string): ShipPhoto | null {
  const figures = sectionHtml.match(/<figure[\s\S]*?<\/figure>/gi) ?? [];
  for (const fig of figures) {
    const caption = stripTags(
      /<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i.exec(fig)?.[1] ?? ""
    );
    if (!SHIP_PATTERN.test(caption)) continue;
    const src = /src="([^"]+)"/i.exec(fig)?.[1];
    if (src) return { src, caption };
  }
  return null;
}

// Verbs that indicate a sentence is describing where the ship is or moved to.
const POSITION_VERBS =
  /\b(is|was|were|are)\s+(currently\s+)?(in|operating|underway|steaming|sailing)\b|\btransit(ed|ing)\b|\benter(ed|ing)?\s+the\b|\barriv(ed|ing)\s+(in|at|off)\b/i;

type PositionReport = {
  date: string;
  region: string;
  url: string;
  title: string;
  blurb: string;
};

/**
 * The weekly tracker is a Monday snapshot; USNI's day-to-day reporting is
 * often fresher. Scan non-tracker articles for sentences that place the
 * carrier somewhere and return the newest such report. Matching is done
 * per sentence so escort-ship stories don't get attributed to the carrier,
 * and the LAST region in the sentence wins ("transited the Malacca Strait
 * to enter the Andaman Sea" → Andaman Sea).
 */
function findLatestReport(items: RawItem[]): PositionReport | null {
  for (const item of items) {
    const paragraphs = (item.content.match(/<p[\s>][\s\S]*?<\/p>/gi) ?? []).map(
      (p) => stripTags(p)
    );
    for (const paragraph of paragraphs) {
      if (!SHIP_PATTERN.test(paragraph)) continue;
      const sentences = paragraph.split(/(?<=[.!?])\s+(?=[A-Z“"])/);
      for (const sentence of sentences) {
        if (!SHIP_PATTERN.test(sentence) || !POSITION_VERBS.test(sentence))
          continue;
        const regions = findRegionsInText(sentence);
        if (regions.length === 0) continue;
        const { display } = regions[regions.length - 1].region;
        return {
          date: item.pubDate,
          region: `In ${display}`,
          url: item.link,
          title: item.title,
          blurb: summarize(sentence, 240),
        };
      }
    }
  }
  return null;
}

export async function getShipStatus(): Promise<ShipStatus | null> {
  const feeds = await Promise.all(FEEDS.map((url) => fetchPage(url, 1800)));

  const byLink = new Map<string, RawItem>();
  for (const xml of feeds) {
    if (!xml) continue;
    for (const item of parseItems(xml)) {
      if (!byLink.has(item.link)) byLink.set(item.link, item);
    }
  }

  const trackers = [...byLink.values()]
    .filter((i) => /Fleet and Marine Tracker/i.test(i.title))
    .sort((a, b) => b.pubDate.localeCompare(a.pubDate));
  if (trackers.length === 0) return null;

  const history: HistoryEntry[] = [];
  let current: Omit<ShipStatus, "history"> | null = null;

  for (const item of trackers) {
    const section = findShipSection(item.content);
    if (!section) continue;
    history.push({
      date: item.pubDate,
      region: section.region,
      url: item.link,
      title: item.title,
      blurb: summarize(shipParagraphs(section.html)[0] ?? "", 200),
    });
    if (!current) {
      current = {
        region: section.region,
        summary: shipParagraphs(section.html),
        photo: shipPhoto(section.html),
        asOf: item.pubDate,
        articleTitle: item.title,
        articleUrl: item.link,
        source: "USNI Fleet Tracker",
      };
    }
  }

  if (!current) return null;

  // Prefer a fresher position from day-to-day reporting when one exists.
  const report = findLatestReport(
    [...byLink.values()]
      .filter((i) => !/Fleet and Marine Tracker/i.test(i.title))
      .sort((a, b) => b.pubDate.localeCompare(a.pubDate))
  );
  if (report && report.date > current.asOf) {
    history.unshift({
      date: report.date,
      region: report.region,
      url: report.url,
      title: report.title,
      blurb: report.blurb,
    });
    current = {
      ...current,
      region: report.region,
      summary: [report.blurb],
      asOf: report.date,
      articleTitle: report.title,
      articleUrl: report.url,
      source: "USNI News report",
    };
  }

  return { ...current, history: history.slice(0, 16) };
}
