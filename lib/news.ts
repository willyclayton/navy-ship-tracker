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

function toItem(
  title: string,
  link: string,
  date: string,
  summary: string,
  source: string
): NewsItem {
  const text = `${title} ${summary}`;
  return {
    title,
    link,
    date,
    summary: summarize(summary),
    source,
    mentionsShip: SHIP_PATTERN.test(text),
  };
}

function mergeNews(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  const out: NewsItem[] = [];
  for (const item of items) {
    if (!item.title || !item.link || !item.date) continue;
    const key = item.title.toLowerCase().replace(/\W+/g, " ").trim();
    if (seen.has(key) || seen.has(item.link)) continue;
    seen.add(key);
    seen.add(item.link);
    out.push(item);
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getNews(limit = 12): Promise<NewsItem[]> {
  const results = await Promise.all(
    FEEDS.map((f) => fetchFeed(f.url, f.source))
  );
  const items: NewsItem[] = [];
  for (const item of results.flat() as FeedItem[]) {
    items.push(
      toItem(item.title, item.link, item.pubDate, item.description, item.source)
    );
  }
  return mergeNews(items).slice(0, limit);
}
