import { fetchJson, fetchPage } from "./rss";
import { stripTags } from "./text";

export type ShipPhoto = {
  src: string;
  caption: string;
  date: string; // ISO, may be empty
  pageUrl: string;
};

type WpMedia = {
  date?: string;
  source_url?: string;
  alt_text?: string;
  title?: { rendered?: string };
  caption?: { rendered?: string };
  media_details?: {
    sizes?: Record<string, { source_url?: string; width?: number }>;
  };
};

const SHIP_RE =
  /aircraft carrier|Nimitz-class|CVN-?73|USS George Washington/i;
const NOT_SHIP_RE =
  /\binfographic\b|\bgraphic design\b|\blogo\b|destroyer USS|cruiser USS|soccer|volleyball|basketball/i;

function pickSize(media: WpMedia): string | null {
  const sizes = media.media_details?.sizes ?? {};
  const preferred =
    sizes["1120x630"]?.source_url ||
    sizes.large?.source_url ||
    sizes.medium_large?.source_url ||
    media.source_url;
  return preferred ?? null;
}

function captionOf(media: WpMedia): string {
  const cap = stripTags(media.caption?.rendered ?? "");
  const title = stripTags(media.title?.rendered ?? "");
  const alt = media.alt_text ?? "";
  return cap || alt || title;
}

function looksLikeCarrier(text: string): boolean {
  if (!SHIP_RE.test(text)) return false;
  if (NOT_SHIP_RE.test(text) && !/aircraft carrier|Nimitz-class|CVN-?73/i.test(text)) {
    return false;
  }
  return true;
}

async function usniPhotos(): Promise<ShipPhoto[]> {
  const pages = await Promise.all(
    [1, 2, 3, 4].map((page) =>
      fetchJson<WpMedia[]>(
        `https://news.usni.org/wp-json/wp/v2/media?search=George%20Washington%20CVN-73&per_page=20&page=${page}&_fields=source_url,alt_text,caption,date,title,media_details`,
      )
    )
  );
  const out: ShipPhoto[] = [];
  const seen = new Set<string>();
  for (const page of pages) {
    if (!page) continue;
    for (const m of page) {
      const src = pickSize(m);
      const caption = captionOf(m);
      if (!src || seen.has(src)) continue;
      if (!looksLikeCarrier(`${caption} ${m.alt_text ?? ""}`)) continue;
      seen.add(src);
      out.push({
        src,
        caption: caption || "USS George Washington (CVN-73). U.S. Navy photo.",
        date: m.date ?? "",
        pageUrl: src,
      });
    }
  }
  return out;
}

async function dvidsPhotos(): Promise<ShipPhoto[]> {
  const pages = await Promise.all(
    [1, 2, 3].map((page) =>
      fetchPage(
        `https://www.dvidshub.net/search/?filter[unit]=USSGW&filter[type]=image&page=${page}`,
      )
    )
  );
  const out: ShipPhoto[] = [];
  const seen = new Set<string>();
  for (const html of pages) {
    if (!html) continue;
    const re =
      /id="images_(\d+)"[\s\S]{0,280}title="([^"]+)"[\s\S]{0,500}thumbs\/photos\/(\d+)\/\1\//gi;
    let match: RegExpExecArray | null;
    while ((match = re.exec(html)) !== null) {
      const id = match[1];
      const title = match[2];
      const yymm = match[3];
      if (seen.has(id)) continue;
      if (NOT_SHIP_RE.test(title)) continue;
      seen.add(id);
      out.push({
        src: `https://d1ldvf68ux039x.cloudfront.net/thumbs/photos/${yymm}/${id}/1000w_q95.jpg`,
        caption: `${title}. U.S. Navy photo via DVIDS.`,
        date: "",
        pageUrl: `https://www.dvidshub.net/image/${id}`,
      });
    }
  }
  return out;
}

type CommonsPage = {
  title?: string;
  imageinfo?: {
    thumburl?: string;
    url?: string;
    extmetadata?: { ImageDescription?: { value?: string } };
  }[];
};

async function commonsPhotos(): Promise<ShipPhoto[]> {
  const data = await fetchJson<{ query?: { pages?: Record<string, CommonsPage> } }>(
    "https://commons.wikimedia.org/w/api.php?action=query&generator=categorymembers&gcmtitle=Category:USS_George_Washington_(CVN-73)&gcmtype=file&gcmlimit=20&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1200&format=json",
    86400
  );
  const pages = Object.values(data?.query?.pages ?? {});
  const out: ShipPhoto[] = [];
  for (const p of pages) {
    const info = p.imageinfo?.[0];
    const src = info?.thumburl || info?.url;
    if (!src) continue;
    const raw = info?.extmetadata?.ImageDescription?.value ?? p.title ?? "";
    const caption = stripTags(raw).slice(0, 220) || "USS George Washington (CVN-73)";
    out.push({
      src,
      caption,
      date: "",
      pageUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(p.title ?? "")}`,
    });
  }
  return out;
}

/** Recent official photos of the carrier, newest first. */
export async function getShipPhotos(): Promise<ShipPhoto[]> {
  const [usni, dvids, commons] = await Promise.all([
    usniPhotos().catch(() => [] as ShipPhoto[]),
    dvidsPhotos().catch(() => [] as ShipPhoto[]),
    commonsPhotos().catch(() => [] as ShipPhoto[]),
  ]);
  const seen = new Set<string>();
  const merged: ShipPhoto[] = [];
  for (const p of [...usni, ...dvids, ...commons]) {
    const key = p.src.replace(/-\d+x\d+\./, ".").replace(/\/\d+w_q95/, "/1000w_q95");
    if (seen.has(key) || seen.has(p.src)) continue;
    seen.add(key);
    seen.add(p.src);
    merged.push(p);
  }
  return merged.slice(0, 40);
}
