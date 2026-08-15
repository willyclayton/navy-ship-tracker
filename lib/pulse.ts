import { fetchPage } from "./rss";

export type PulsePin = {
  point: { lat: number; lng: number };
  location: string;
  direction: string;
};

/**
 * Western Pacific Pulse posts embed a Leaflet map on GitHub Pages with
 * per-vessel lat/lon. Those pins are much more precise than sea-region
 * centroids from the article headings.
 */
export function pulseMapUrl(html: string): string | null {
  const iframe = /src="(https:\/\/slgusni\.github\.io\/maps\/[^"]+)"/i.exec(
    html
  );
  return iframe ? iframe[1] : null;
}

function parseNumber(obj: string, key: string): number | null {
  const m = new RegExp(`${key}:\\s*(-?\\d+(?:\\.\\d+)?)`).exec(obj);
  return m ? Number(m[1]) : null;
}

function parseString(obj: string, key: string): string | null {
  const m = new RegExp(`${key}:\\s*"([^"]*)"`).exec(obj);
  return m ? m[1] : null;
}

/** Pull the GW / CVN-73 marker out of a Pulse map HTML page. */
export function parsePulseMap(html: string): PulsePin | null {
  const arr = /const incidents\s*=\s*\[([\s\S]*?)\];/.exec(html);
  if (!arr) return null;

  const objects = arr[1].match(/\{[^{}]+\}/g) ?? [];
  for (const obj of objects) {
    const vessel =
      parseString(obj, "vesselShort") ?? parseString(obj, "vessel") ?? "";
    if (!/George Washington|CVN-?73/i.test(vessel)) continue;

    const lat = parseNumber(obj, "lat");
    const lon = parseNumber(obj, "lon");
    const location = parseString(obj, "location");
    if (lat == null || lon == null || !location) continue;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    return {
      point: { lat, lng: lon },
      location,
      direction: parseString(obj, "direction") ?? "",
    };
  }
  return null;
}

export async function fetchPulsePin(
  articleHtml: string,
  revalidateSeconds = 1800
): Promise<PulsePin | null> {
  const url = pulseMapUrl(articleHtml);
  if (!url) return null;
  const html = await fetchPage(url, revalidateSeconds);
  return html ? parsePulseMap(html) : null;
}
