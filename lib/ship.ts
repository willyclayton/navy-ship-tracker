// Facts about USS George Washington and its current patrol.
// Deployment data is from USNI News and Stars and Stripes reporting.

export const DEPLOYMENT = {
  // Departed Yokosuka for the first patrol of 2026 (Stars and Stripes, USNI).
  start: "2026-05-23",
  startLabel: "May 23, 2026",
  lastPortCall: { place: "Da Nang, Vietnam", dateLabel: "Aug. 5, 2026" },
  note: "Patrols from Yokosuka typically run about six months, with a brief mid-patrol return home for rest and resupply.",
};

export function daysDeployed(now = new Date()): number {
  const start = new Date(`${DEPLOYMENT.start}T05:00:00Z`);
  return Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86400000));
}

export const SHIP_STATS: { label: string; value: string }[] = [
  { label: "Class", value: "Nimitz-class carrier" },
  { label: "Commissioned", value: "1992" },
  { label: "Length", value: "1,092 ft" },
  { label: "Propulsion", value: "2 nuclear reactors" },
  { label: "Crew aboard", value: "≈5,000 with air wing" },
  { label: "Aircraft", value: "60+ fixed-wing and helos" },
  { label: "Homeport", value: "Yokosuka, Japan" },
  { label: "Fleet", value: "U.S. 7th Fleet" },
];

export type Squadron = {
  code: string;
  name: string;
  aircraft: string;
  role: string;
};

// Carrier Air Wing 5, based at MCAS Iwakuni when not embarked.
export const AIR_WING: Squadron[] = [
  { code: "VFA-147", name: "Argonauts", aircraft: "F-35C Lightning II", role: "Stealth strike fighter" },
  { code: "VFA-27", name: "Royal Maces", aircraft: "F/A-18E Super Hornet", role: "Strike fighter" },
  { code: "VFA-102", name: "Diamondbacks", aircraft: "F/A-18F Super Hornet", role: "Strike fighter" },
  { code: "VFA-195", name: "Dambusters", aircraft: "F/A-18E Super Hornet", role: "Strike fighter" },
  { code: "VAQ-141", name: "Shadowhawks", aircraft: "EA-18G Growler", role: "Electronic attack" },
  { code: "VAW-125", name: "Tiger Tails", aircraft: "E-2D Hawkeye", role: "Airborne early warning" },
  { code: "HSC-12", name: "Golden Falcons", aircraft: "MH-60S Seahawk", role: "Sea combat helicopters" },
  { code: "HSM-77", name: "Saberhawks", aircraft: "MH-60R Seahawk", role: "Maritime strike helicopters" },
  { code: "VRM-30 Det. 5", name: "Titans", aircraft: "CMV-22B Osprey", role: "Carrier onboard delivery" },
];

export const ESCORTS: string[] = [
  "USS Robert Smalls (CG-62), cruiser",
  "USS Benfold (DDG-65), destroyer",
  "USS Shoup (DDG-86), destroyer",
];
