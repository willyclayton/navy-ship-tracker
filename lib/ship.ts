import type { Stop } from "./geo";

/** Static reference facts about USS George Washington (CVN-73). */
export const SHIP = {
  name: "USS George Washington",
  hull: "CVN-73",
  class: "Nimitz-class nuclear-powered aircraft carrier",
  homeport: "Yokosuka, Japan (forward-deployed since Nov 2024)",
  commissioned: "July 4, 1992",
  length: "1,092 ft (333 m)",
  beam: "252 ft flight deck (77 m)",
  displacement: "~104,000 tons full load",
  speed: "30+ knots (nuclear, unlimited range)",
  propulsion: "2 A4W nuclear reactors, 4 shafts",
  crew: {
    shipsCompany: 3000,
    airWing: 2500,
    total: "~5,500 aboard when deployed",
  },
  aircraft: "~70 aircraft (fighters, jammers, radar planes, helicopters)",
};

export type Squadron = {
  id: string;
  nickname: string;
  aircraft: string;
  role: string;
};

/** Carrier Air Wing 5 — the squadrons that fly off the ship. */
export const AIR_WING: { name: string; base: string; squadrons: Squadron[] } = {
  name: "Carrier Air Wing 5 (CVW-5)",
  base: "MCAS Iwakuni, Japan — the Navy's only forward-deployed air wing",
  squadrons: [
    { id: "VFA-147", nickname: "Argonauts", aircraft: "F-35C Lightning II", role: "Stealth strike fighter" },
    { id: "VFA-102", nickname: "Diamondbacks", aircraft: "F/A-18F Super Hornet", role: "Strike fighter (two-seat)" },
    { id: "VFA-27", nickname: "Royal Maces", aircraft: "F/A-18E Super Hornet", role: "Strike fighter" },
    { id: "VFA-195", nickname: "Dambusters", aircraft: "F/A-18E Super Hornet", role: "Strike fighter" },
    { id: "VAQ-141", nickname: "Shadowhawks", aircraft: "EA-18G Growler", role: "Electronic attack / jamming" },
    { id: "VAW-125", nickname: "Tigertails", aircraft: "E-2D Advanced Hawkeye", role: "Airborne radar & control" },
    { id: "HSC-12", nickname: "Golden Falcons", aircraft: "MH-60S Sea Hawk", role: "Rescue & logistics helicopters" },
    { id: "HSM-77", nickname: "Saberhawks", aircraft: "MH-60R Sea Hawk", role: "Sub-hunting helicopters" },
    { id: "VRM-30 Det. 5", nickname: "Titans", aircraft: "CMV-22B Osprey", role: "Carrier delivery / cargo" },
  ],
};

/** Ships that typically sail with the carrier (recent patrols). */
export const ESCORTS = [
  { name: "USS Robert Smalls", hull: "CG-62", type: "Guided-missile cruiser" },
  { name: "USS Benfold", hull: "DDG-65", type: "Guided-missile destroyer" },
  { name: "USS Shoup", hull: "DDG-86", type: "Guided-missile destroyer" },
];

export type DeploymentInfo = {
  atSea: boolean;
  statusLabel: string; // "At sea" | "In port"
  currentSince: string | null; // ISO date the current stop began
  lastPortName: string | null;
  lastPortDate: string | null; // ISO date the ship was last seen in port
  weeksSincePort: number | null; // if at sea
  weeksTracked: number;
};

/** Derive plain-language deployment status from the weekly stops. */
export function deriveDeployment(stops: Stop[]): DeploymentInfo {
  const current = stops[stops.length - 1] ?? null;
  const atSea = current ? !current.inPort : false;

  let lastPortName: string | null = null;
  let lastPortDate: string | null = null;
  for (let i = stops.length - 1; i >= 0; i--) {
    if (stops[i].inPort) {
      lastPortName = stops[i].placeName;
      lastPortDate = stops[i].endDate;
      break;
    }
    // At-sea reports sometimes note a port call in passing
    // ("...after visiting Guam last week"); count those as a docking too.
    if (stops[i].portCallName) {
      lastPortName = stops[i].portCallName;
      lastPortDate = stops[i].portCallDate;
      break;
    }
  }

  const weeksTracked = stops.reduce((sum, s) => sum + s.weeks, 0);
  let weeksSincePort: number | null = null;
  if (atSea && lastPortDate) {
    weeksSincePort = Math.max(
      1,
      Math.round((Date.now() - new Date(lastPortDate).getTime()) / (7 * 24 * 3600 * 1000))
    );
  }

  return {
    atSea,
    statusLabel: atSea ? "At sea" : "In port",
    currentSince: current?.startDate ?? null,
    lastPortName,
    lastPortDate,
    weeksSincePort,
    weeksTracked,
  };
}
