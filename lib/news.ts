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

const FEEDS: { url: string; source: string }[] = [
  { url: "https://news.usni.org/feed", source: "USNI News" },
];

const SHIP_PATTERN = /George Washington|CVN-?73|Carrier Air Wing 5|CVW-?5/i;

export async function getNews(limit = 12): Promise<NewsItem[]> {
  const results = await Promise.all(
    FEEDS.map((f) => fetchFeed(f.url, f.source, 1800))
  );
  const seen = new Set<string>();
  const items: NewsItem[] = [];

  for (const item of results.flat() as FeedItem[]) {
    const key = item.title.toLowerCase().replace(/\W+/g, " ").trim();
    if (seen.has(key)) continue;
    seen.add(key);
    const text = `${item.title} ${item.description}`;
    items.push({
      title: item.title,
      link: item.link,
      date: item.pubDate,
      summary: summarize(item.description),
      source: item.source,
      mentionsShip: SHIP_PATTERN.test(text),
    });
  }

  return items
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}
