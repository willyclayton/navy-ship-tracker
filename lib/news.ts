import { fetchFeed, fetchJson, type FeedItem } from "./rss";
import { summarize, stripTags } from "./text";

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

type WpPost = {
  date_gmt?: string;
  link?: string;
  title?: { rendered?: string };
  excerpt?: { rendered?: string };
};

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
    FEEDS.map((f) => fetchFeed(f.url, f.source, 1800))
  );
  const items: NewsItem[] = [];
  for (const item of results.flat() as FeedItem[]) {
    items.push(
      toItem(item.title, item.link, item.pubDate, item.description, item.source)
    );
  }
  return mergeNews(items).slice(0, limit);
}

/**
 * ~6 months of USNI headlines for the intensity timeline.
 * 12 pages × 50 posts covers Jan–Aug 2026 at current USNI volume.
 */
export async function getNewsArchive(): Promise<NewsItem[]> {
  const pages = await Promise.all(
    Array.from({ length: 12 }, (_, i) =>
      fetchJson<WpPost[]>(
        `https://news.usni.org/wp-json/wp/v2/posts?per_page=50&page=${i + 1}&_fields=date_gmt,link,title,excerpt`,
        3600
      )
    )
  );
  const items: NewsItem[] = [];
  for (const page of pages) {
    if (!page) continue;
    for (const post of page) {
      const gmt = post.date_gmt ?? "";
      const iso = gmt.endsWith("Z") ? gmt : gmt ? `${gmt}Z` : "";
      const date = iso ? new Date(iso) : new Date(NaN);
      if (isNaN(date.getTime())) continue;
      items.push(
        toItem(
          stripTags(post.title?.rendered ?? ""),
          post.link ?? "",
          date.toISOString(),
          stripTags(post.excerpt?.rendered ?? ""),
          "USNI News"
        )
      );
    }
  }
  return mergeNews(items);
}
