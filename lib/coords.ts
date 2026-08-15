// Regions the ship can plausibly be reported in. `key` is matched against
// lowercased text; `display` is how we render it after "In ...".
// Positions in the source reporting are approximate to begin with, so these
// are representative points, not precise fixes.
export type Region = {
  key: string;
  display: string;
  coords: [number, number];
};

const REGIONS: Region[] = [
  { key: "yokosuka", display: "Yokosuka, Japan", coords: [35.29, 139.67] },
  { key: "sasebo", display: "Sasebo, Japan", coords: [33.16, 129.72] },
  { key: "tokyo bay", display: "Tokyo Bay", coords: [35.3, 139.75] },
  { key: "sea of japan", display: "the Sea of Japan", coords: [39.0, 134.0] },
  { key: "east china sea", display: "the East China Sea", coords: [28.0, 125.5] },
  { key: "philippine sea", display: "the Philippine Sea", coords: [19.5, 131.5] },
  { key: "south china sea", display: "the South China Sea", coords: [12.5, 114.0] },
  { key: "luzon strait", display: "the Luzon Strait", coords: [20.5, 121.0] },
  { key: "taiwan strait", display: "the Taiwan Strait", coords: [24.5, 119.5] },
  { key: "sulu sea", display: "the Sulu Sea", coords: [8.5, 120.0] },
  { key: "celebes sea", display: "the Celebes Sea", coords: [3.5, 122.0] },
  { key: "java sea", display: "the Java Sea", coords: [-5.0, 111.0] },
  { key: "singapore strait", display: "the Singapore Strait", coords: [1.15, 103.9] },
  { key: "singapore", display: "Singapore", coords: [1.25, 103.85] },
  { key: "malacca", display: "the Strait of Malacca", coords: [3.2, 100.3] },
  { key: "andaman sea", display: "the Andaman Sea", coords: [8.5, 95.5] },
  { key: "bay of bengal", display: "the Bay of Bengal", coords: [12.0, 88.0] },
  { key: "indian ocean", display: "the Indian Ocean", coords: [-2.0, 80.0] },
  { key: "laccadive sea", display: "the Laccadive Sea", coords: [7.0, 75.0] },
  { key: "arabian sea", display: "the Arabian Sea", coords: [15.0, 65.0] },
  { key: "gulf of oman", display: "the Gulf of Oman", coords: [24.5, 58.5] },
  { key: "strait of hormuz", display: "the Strait of Hormuz", coords: [26.5, 56.5] },
  { key: "persian gulf", display: "the Persian Gulf", coords: [26.5, 52.0] },
  { key: "arabian gulf", display: "the Persian Gulf", coords: [26.5, 52.0] },
  { key: "red sea", display: "the Red Sea", coords: [19.0, 39.0] },
  { key: "gulf of aden", display: "the Gulf of Aden", coords: [12.5, 47.5] },
  { key: "gulf of thailand", display: "the Gulf of Thailand", coords: [9.5, 101.5] },
  { key: "coral sea", display: "the Coral Sea", coords: [-15.0, 152.0] },
  { key: "timor sea", display: "the Timor Sea", coords: [-11.0, 127.0] },
  { key: "guam", display: "Guam", coords: [13.45, 144.75] },
  { key: "apra harbor", display: "Guam", coords: [13.44, 144.65] },
  { key: "western pacific", display: "the Western Pacific", coords: [18.0, 136.0] },
  { key: "central pacific", display: "the Central Pacific", coords: [15.0, 175.0] },
  { key: "pearl harbor", display: "Pearl Harbor", coords: [21.35, -157.97] },
  { key: "da nang", display: "Da Nang, Vietnam", coords: [16.1, 108.3] },
  { key: "manila", display: "Manila, Philippines", coords: [14.55, 120.9] },
  { key: "diego garcia", display: "Diego Garcia", coords: [-7.3, 72.4] },
  // "japan" must come after the more specific Japanese entries above.
  { key: "japan", display: "Japan", coords: [34.8, 139.5] },
];

/** Map a tracker region heading like "In the South China Sea" to coordinates. */
export function regionToCoords(region: string): [number, number] | null {
  const key = region
    .toLowerCase()
    .replace(/^in (the )?/, "")
    .replace(/[.,]/g, "")
    .trim();
  for (const r of REGIONS) {
    if (key.includes(r.key)) return r.coords;
  }
  return null;
}

/** Find every known region mentioned in a chunk of prose, in text order. */
export function findRegionsInText(
  text: string
): { region: Region; index: number }[] {
  const lower = text.toLowerCase();
  const found: { region: Region; index: number }[] = [];
  const seen = new Set<string>();
  for (const region of REGIONS) {
    const index = lower.indexOf(region.key);
    if (index === -1 || seen.has(region.display)) continue;
    seen.add(region.display);
    found.push({ region, index });
  }
  return found.sort((a, b) => a.index - b.index);
}
