import { fetchFeed, type FeedItem } from "./rss";
import { summarize } from "./text";

export type NewsItem = {
  title: string;
  link: string;
  date: string; // ISO
  summary: string;
  source: string;
  mentionsShip: boolean;
};

// USNI is the primary source; the others are capped so they add variety
// without drowning out the fleet-tracker coverage.
const FEEDS: { url: string; source: string; cap: number }[] = [
  { url: "https://news.usni.org/feed", source: "USNI News", cap: 8 },
  {
    url: "https://www.navytimes.com/arc/outboundfeeds/rss/category/news/your-navy/?outputType=xml",
    source: "Navy Times",
    cap: 3,
  },
  {
    url: "https://www.defensenews.com/arc/outboundfeeds/rss/category/naval/?outputType=xml",
    source: "Defense News",
    cap: 3,
  },
];

// Official imagery and stories published by the ship's own public affairs team.
const SHIP_UNIT_FEED = "https://www.dvidshub.net/rss/unit/2050";

const SHIP_PATTERN =
  /George Washington|CVN-?\s?73|Carrier Air Wing 5|CVW-?5/i;

export async function getNews(limit = 14): Promise<NewsItem[]> {
  const results = await Promise.all(
    FEEDS.map((f) => fetchFeed(f.url, f.source, 1800))
  );

  const seen = new Set<string>();
  const items: NewsItem[] = [];

  results.forEach((feedItems, i) => {
    const { cap, source } = FEEDS[i];
    let taken = 0;
    for (const item of feedItems as FeedItem[]) {
      if (taken >= cap) break;
      const key = item.title.toLowerCase().replace(/\W+/g, " ").trim();
      if (seen.has(key)) continue;
      seen.add(key);
      taken++;
      items.push({
        title: item.title,
        link: item.link,
        date: item.pubDate,
        summary: summarize(item.description),
        source,
        mentionsShip: SHIP_PATTERN.test(`${item.title} ${item.description}`),
      });
    }
  });

  return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

export type Dispatch = {
  title: string;
  link: string;
  date: string;
};

/** Latest posts from the ship's official DVIDS unit feed. */
export async function getShipDispatches(limit = 4): Promise<Dispatch[]> {
  const items = await fetchFeed(SHIP_UNIT_FEED, "DVIDS", 1800);
  const seen = new Set<string>();
  const out: Dispatch[] = [];
  for (const i of items.sort((a, b) => b.pubDate.localeCompare(a.pubDate))) {
    // Photo sets arrive as "Title [Image 1 of 5]", "[Image 2 of 5]", ...;
    // keep one entry per set.
    const title = i.title.replace(/\s*\[Image \d+ of \d+\]\s*$/i, "").trim();
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ title, link: i.link, date: i.pubDate });
    if (out.length >= limit) break;
  }
  return out;
}
