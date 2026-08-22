import { fetchJson, fetchPage } from "./rss";
import { decodeEntities, stripTags } from "./text";
import { inferRegionFromText, prettyRegion } from "./geo";
import { fetchPulsePin, type PulsePin } from "./pulse";

// The category RSS is often stale at CDN edges; the main feed is fresher
// but shallow. WordPress REST fills the gaps. Merge all three.
const FEEDS = [
  "https://news.usni.org/category/fleet-tracker/feed",
  "https://news.usni.org/feed",
];

const WP_ENDPOINTS = [
  // Fleet Tracker category — full recent archive, including weeks the RSS dropped
  "https://news.usni.org/wp-json/wp/v2/posts?categories=4137&per_page=40&_fields=id,date_gmt,link,title,content",
  // Western Pacific Pulse tag
  "https://news.usni.org/wp-json/wp/v2/posts?tags=8074&per_page=20&_fields=id,date_gmt,link,title,content",
  // Mid-week ship-specific stories (e.g. the Malacca transit report)
  "https://news.usni.org/wp-json/wp/v2/posts?search=George%20Washington&per_page=8&_fields=id,date_gmt,link,title,content",
];

const SHIP_PATTERN = /George Washington/i;
const CARRIER_PATTERN =
  /aircraft carrier\s+USS\s*George Washington|USS\s*George Washington\s*\(CVN-?73\)|CVN-?73/i;
const CSG_ASIDE =
  /part of (?:the )?(?:George Washington|GW)(?: Carrier Strike Group| CSG)/i;

export type ShipPhoto = { src: string; caption: string };

export type ShipStatus = {
  region: string;
  summary: string[];
  photo: ShipPhoto | null;
  asOf: string; // ISO date of the tracker post
  articleTitle: string;
  articleUrl: string;
  sourceLabel: string;
  history: HistoryEntry[];
};

export type HistoryEntry = {
  date: string; // ISO
  region: string;
  url: string;
  title: string;
  summary: string[]; // paragraphs about the ship from that week's tracker
  point?: { lat: number; lng: number } | null;
};

type RawItem = {
  title: string;
  link: string;
  pubDate: string;
  content: string; // raw HTML from content:encoded
};

type WpPost = {
  date_gmt?: string;
  link?: string;
  title?: { rendered?: string };
  content?: { rendered?: string };
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

function wpToRaw(post: WpPost): RawItem | null {
  const title = stripTags(post.title?.rendered ?? "");
  const link = post.link ?? "";
  const content = post.content?.rendered ?? "";
  const gmt = post.date_gmt ?? "";
  if (!title || !link || !content || !gmt) return null;
  const iso = gmt.endsWith("Z") ? gmt : `${gmt}Z`;
  const date = new Date(iso);
  if (isNaN(date.getTime())) return null;
  return { title, link, pubDate: date.toISOString(), content };
}

function isStructuredReport(title: string): boolean {
  return (
    /Fleet and Marine Tracker/i.test(title) ||
    /Western Pacific Pulse/i.test(title)
  );
}

function isPulse(title: string): boolean {
  return /Western Pacific Pulse/i.test(title);
}

function sourceLabel(title: string): string {
  if (/Western Pacific Pulse/i.test(title)) return "USNI Western Pacific Pulse";
  if (/Fleet and Marine Tracker/i.test(title)) return "USNI Fleet Tracker";
  return "USNI News";
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

function paragraphTexts(html: string): string[] {
  // Ignore captions — they often reuse an older photo ("...in the South China
  // Sea on July 23") that does not reflect this week's location.
  const withoutFigures = html.replace(/<figure[\s\S]*?<\/figure>/gi, "");
  return (withoutFigures.match(/<p[\s>][\s\S]*?<\/p>/gi) ?? []).map((p) =>
    stripTags(p)
  );
}

/**
 * Score how confidently a section is about the carrier herself, not an escort
 * "part of the George Washington CSG" in a different sea.
 */
function sectionScore(html: string): number {
  let best = 0;
  for (const text of paragraphTexts(html)) {
    if (!SHIP_PATTERN.test(text)) continue;
    if (CSG_ASIDE.test(text) && !CARRIER_PATTERN.test(text)) continue;
    if (CARRIER_PATTERN.test(text)) best = Math.max(best, 3);
    else if (/George Washington Carrier Strike Group|George Washington CSG/i.test(text))
      best = Math.max(best, 2);
    else best = Math.max(best, 1);
  }
  return best;
}

function findShipSection(content: string): Section | null {
  let best: { section: Section; score: number } | null = null;
  for (const section of splitSections(content)) {
    const score = sectionScore(section.html);
    if (score < 2) continue;
    if (!best || score > best.score) best = { section, score };
  }
  return best?.section ?? null;
}

function shipParagraphs(sectionHtml: string): string[] {
  return paragraphTexts(sectionHtml).filter((p) => {
    if (!SHIP_PATTERN.test(p)) return false;
    if (CSG_ASIDE.test(p) && !CARRIER_PATTERN.test(p)) return false;
    return true;
  });
}

function shipPhoto(sectionHtml: string): ShipPhoto | null {
  const figures = sectionHtml.match(/<figure[\s\S]*?<\/figure>/gi) ?? [];
  for (const fig of figures) {
    const caption = stripTags(
      /<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i.exec(fig)?.[1] ?? ""
    );
    if (!SHIP_PATTERN.test(caption) && !CARRIER_PATTERN.test(caption)) continue;
    const src = /src="([^"]+)"/i.exec(fig)?.[1];
    if (src) return { src, caption };
  }
  return null;
}

function carrierNewsLocation(item: RawItem): { region: string; summary: string[] } | null {
  const paras = paragraphTexts(item.content).filter(
    (p) => CARRIER_PATTERN.test(p) || /aircraft carrier USS\s*George Washington/i.test(p)
  );
  if (paras.length === 0) {
    // Title-led stories sometimes only say "George Washington CSG" in the lede.
    if (!/George Washington/i.test(item.title)) return null;
    const lede = paragraphTexts(item.content).slice(0, 3);
    if (!lede.some((p) => /George Washington/i.test(p))) return null;
    const region = inferRegionFromText(lede.join(" "));
    if (!region) return null;
    return { region: prettyRegion(region), summary: lede.filter((p) => SHIP_PATTERN.test(p)) };
  }
  const region = inferRegionFromText(paras.join(" "));
  if (!region) return null;
  return { region: prettyRegion(region), summary: paras };
}

function mondayKey(iso: string): string {
  const d = new Date(iso);
  const day = d.getUTCDay(); // 0 Sun .. 1 Mon
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

function sameRegion(a: string, b: string): boolean {
  return prettyRegion(a).toLowerCase() === prettyRegion(b).toLowerCase();
}

/**
 * Keep one report per (calendar week, region). When Pulse and the Fleet
 * Tracker describe the same place in the same week, keep the newer pin.
 * A mid-week move (South China Sea → Malacca) stays as two stops.
 */
function mergeHistory(entries: HistoryEntry[]): HistoryEntry[] {
  const chronological = [...entries].sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  const merged: HistoryEntry[] = [];
  for (const entry of chronological) {
    const prev = merged[merged.length - 1];
    if (
      prev &&
      mondayKey(prev.date) === mondayKey(entry.date) &&
      sameRegion(prev.region, entry.region)
    ) {
      merged[merged.length - 1] = {
        ...entry,
        point: entry.point ?? prev.point,
      };
    } else {
      merged.push(entry);
    }
  }
  return merged.reverse();
}

async function loadRawItems(): Promise<RawItem[]> {
  const [feedXmls, wpPages] = await Promise.all([
    Promise.all(FEEDS.map((url) => fetchPage(url))),
    Promise.all(WP_ENDPOINTS.map((url) => fetchJson<WpPost[]>(url))),
  ]);

  const byLink = new Map<string, RawItem>();
  for (const xml of feedXmls) {
    if (!xml) continue;
    for (const item of parseItems(xml)) {
      if (!byLink.has(item.link)) byLink.set(item.link, item);
    }
  }
  for (const page of wpPages) {
    if (!page) continue;
    for (const post of page) {
      const item = wpToRaw(post);
      if (item && !byLink.has(item.link)) byLink.set(item.link, item);
    }
  }
  return [...byLink.values()];
}

export async function getShipStatus(): Promise<ShipStatus | null> {
  const items = await loadRawItems();

  const structured = items
    .filter((i) => isStructuredReport(i.title))
    .sort((a, b) => b.pubDate.localeCompare(a.pubDate));

  const history: HistoryEntry[] = [];

  const pulsePins = await Promise.all(
    structured.map(async (item, i) =>
      isPulse(item.title) && i < 4 ? fetchPulsePin(item.content) : null
    )
  );

  for (let i = 0; i < structured.length; i++) {
    const item = structured[i];
    const pin: PulsePin | null = pulsePins[i];
    const section = findShipSection(item.content);

    const region = pin?.location ?? section?.region;
    if (!region) continue;

    const summary = [
      ...(pin?.direction ? [pin.direction] : []),
      ...(section ? shipParagraphs(section.html) : []),
    ].filter((p, idx, arr) => arr.indexOf(p) === idx);

    if (summary.length === 0 && !pin) continue;

    history.push({
      date: item.pubDate,
      region,
      url: item.link,
      title: item.title,
      summary,
      point: pin?.point ?? null,
    });
  }

  // Mid-week articles published after the newest structured report can beat
  // a stale Monday tracker (the Malacca transit landed on a Thursday). Skip
  // stories that only restate the location we already have from Pulse.
  const newestStructured = history[0];
  const newsCutoff = Date.now() - 14 * 24 * 3600 * 1000;
  const newsItems = items
    .filter((i) => !isStructuredReport(i.title))
    .filter((i) => new Date(i.pubDate).getTime() >= newsCutoff)
    .sort((a, b) => b.pubDate.localeCompare(a.pubDate));

  for (const item of newsItems) {
    if (newestStructured && item.pubDate <= newestStructured.date) continue;
    const loc = carrierNewsLocation(item);
    if (!loc || loc.summary.length === 0) continue;
    if (newestStructured && sameRegion(loc.region, newestStructured.region)) {
      continue;
    }
    history.unshift({
      date: item.pubDate,
      region: loc.region,
      url: item.link,
      title: item.title,
      summary: loc.summary,
    });
    break;
  }

  const merged = mergeHistory(history);
  const top = merged[0];
  if (!top) return null;

  const topItem = items.find((i) => i.link === top.url);
  const topSection = topItem ? findShipSection(topItem.content) : null;

  return {
    region: top.region,
    summary: top.summary,
    photo: topSection
      ? shipPhoto(topSection.html)
      : topItem
        ? shipPhoto(topItem.content)
        : null,
    asOf: top.date,
    articleTitle: top.title,
    articleUrl: top.url,
    sourceLabel: sourceLabel(top.title),
    history: merged,
  };
}
