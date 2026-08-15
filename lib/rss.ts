import { decodeEntities, stripTags } from "./text";

export type FeedItem = {
  title: string;
  link: string;
  pubDate: string; // ISO string
  description: string; // plain text
  source: string;
};

function extract(tag: string, xml: string): string {
  const cdata = new RegExp(
    `<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`,
    "i"
  ).exec(xml);
  if (cdata) return cdata[1].trim();
  const plain = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i").exec(xml);
  return plain ? decodeEntities(plain[1].trim()) : "";
}

const FETCH_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (compatible; ship-tracker/1.0; personal fleet-news reader)",
  accept: "application/rss+xml, application/xml, text/xml, text/html, */*",
};

export async function fetchFeed(
  url: string,
  source: string,
  revalidateSeconds = 1800
): Promise<FeedItem[]> {
  try {
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      next: { revalidate: revalidateSeconds },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
    return items
      .map((item) => {
        const title = stripTags(extract("title", item));
        const link = extract("link", item);
        const pubDateRaw = extract("pubDate", item);
        const date = new Date(pubDateRaw);
        const description = stripTags(
          extract("description", item) || extract("content:encoded", item)
        );
        return {
          title,
          link,
          pubDate: isNaN(date.getTime()) ? "" : date.toISOString(),
          description,
          source,
        };
      })
      .filter((i) => i.title && i.link);
  } catch {
    return [];
  }
}

export async function fetchPage(
  url: string,
  revalidateSeconds = 1800
): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      next: { revalidate: revalidateSeconds },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}
