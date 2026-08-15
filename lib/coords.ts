// Approximate centroids for regions used by the USNI Fleet Tracker.
// Positions in the tracker are approximate to begin with, so these are
// representative points, not precise fixes.
const REGIONS: [string, [number, number]][] = [
  ["yokosuka", [35.29, 139.67]],
  ["sasebo", [33.16, 129.72]],
  ["tokyo bay", [35.3, 139.75]],
  ["japan", [34.8, 139.5]],
  ["sea of japan", [39.0, 134.0]],
  ["east china sea", [28.0, 125.5]],
  ["philippine sea", [19.5, 131.5]],
  ["south china sea", [12.5, 114.0]],
  ["luzon strait", [20.5, 121.0]],
  ["taiwan strait", [24.5, 119.5]],
  ["sulu sea", [8.5, 120.0]],
  ["celebes sea", [3.5, 122.0]],
  ["java sea", [-5.0, 111.0]],
  ["singapore", [1.2, 103.8]],
  ["strait of malacca", [3.2, 100.3]],
  ["malacca", [3.2, 100.3]],
  ["andaman sea", [10.0, 96.0]],
  ["bay of bengal", [12.0, 88.0]],
  ["indian ocean", [-2.0, 80.0]],
  ["arabian sea", [15.0, 65.0]],
  ["gulf of oman", [24.5, 58.5]],
  ["persian gulf", [26.5, 52.0]],
  ["arabian gulf", [26.5, 52.0]],
  ["red sea", [19.0, 39.0]],
  ["gulf of aden", [12.5, 47.5]],
  ["gulf of thailand", [9.5, 101.5]],
  ["coral sea", [-15.0, 152.0]],
  ["timor sea", [-11.0, 127.0]],
  ["tasman sea", [-38.0, 161.0]],
  ["guam", [13.45, 144.75]],
  ["apra harbor", [13.44, 144.65]],
  ["western pacific", [18.0, 136.0]],
  ["central pacific", [15.0, 175.0]],
  ["pearl harbor", [21.35, -157.97]],
  ["da nang", [16.1, 108.3]],
  ["manila", [14.55, 120.9]],
  ["pacific ocean", [20.0, 150.0]],
];

/** Map a tracker region heading like "In the South China Sea" to coordinates. */
export function regionToCoords(region: string): [number, number] | null {
  const key = region
    .toLowerCase()
    .replace(/^in (the )?/, "")
    .replace(/[.,]/g, "")
    .trim();
  for (const [name, coords] of REGIONS) {
    if (key.includes(name)) return coords;
  }
  return null;
}
