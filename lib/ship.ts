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

export type Officer = {
  name: string;
  role: string;
};

export type Squadron = {
  id: string;
  nickname: string;
  aircraft: string;
  role: string;
  /** Typical number embarked on a CVW-5 patrol — not a daily tally. */
  aircraftCount: number;
  aircrew: string; // plain-language who flies them
  leaders: Officer[];
};

/**
 * Carrier Air Wing 5 — the squadrons that fly off the ship.
 * Aircraft counts are typical embarked numbers for this wing (open sources).
 * Named people are only publicly listed leaders (CAG / CO / XO / CMC).
 * The Navy does not publish a roster of the rest of the aircrew.
 */
export const AIR_WING: {
  name: string;
  base: string;
  leaders: Officer[];
  squadrons: Squadron[];
} = {
  name: "Carrier Air Wing 5 (CVW-5)",
  base: "MCAS Iwakuni, Japan — the Navy's only forward-deployed air wing",
  leaders: [
    { name: "Capt. Brian Kesselring", role: "Commander (CAG)" },
    { name: "Capt. Daniel O’Hara", role: "Deputy commander (DCAG)" },
    { name: "CMDCM Ry VanSickle", role: "Command master chief" },
  ],
  squadrons: [
    {
      id: "VFA-147",
      nickname: "Argonauts",
      aircraft: "F-35C Lightning II",
      role: "Stealth strike fighter",
      aircraftCount: 14,
      aircrew: "About 20 fighter pilots. Each jet is single-seat.",
      leaders: [
        { name: "Cmdr. Michael J. Austin", role: "Commanding officer" },
        { name: "Cmdr. Andre Webb", role: "Executive officer" },
        { name: "CMDCM Danderrick Ocampo", role: "Command master chief" },
      ],
    },
    {
      id: "VFA-102",
      nickname: "Diamondbacks",
      aircraft: "F/A-18F Super Hornet",
      role: "Strike fighter (two-seat)",
      aircraftCount: 12,
      aircrew:
        "About 12 pilots and 12 weapon systems officers — two people in each jet.",
      leaders: [
        { name: "Cmdr. Brett Havelka", role: "Commanding officer" },
      ],
    },
    {
      id: "VFA-27",
      nickname: "Royal Maces",
      aircraft: "F/A-18E Super Hornet",
      role: "Strike fighter",
      aircraftCount: 12,
      aircrew: "About 18 fighter pilots. Each jet is single-seat.",
      leaders: [
        { name: "Cmdr. Matthew Warshaw", role: "Commanding officer" },
        { name: "Cmdr. Justin Wiley", role: "Executive officer" },
        { name: "CMDCM Christian N. Vardeleon", role: "Command master chief" },
      ],
    },
    {
      id: "VFA-195",
      nickname: "Dambusters",
      aircraft: "F/A-18E Super Hornet",
      role: "Strike fighter",
      aircraftCount: 12,
      aircrew: "About 18 fighter pilots. Each jet is single-seat.",
      leaders: [],
    },
    {
      id: "VAQ-141",
      nickname: "Shadowhawks",
      aircraft: "EA-18G Growler",
      role: "Electronic attack / jamming",
      aircraftCount: 8,
      aircrew:
        "About 8 pilots and 8 electronic-warfare officers — two people in each jet.",
      leaders: [],
    },
    {
      id: "VAW-125",
      nickname: "Tigertails",
      aircraft: "E-2D Advanced Hawkeye",
      role: "Airborne radar & control",
      aircraftCount: 5,
      aircrew:
        "About 5 crews of 5 (2 pilots + 3 naval flight officers) per Hawkeye.",
      leaders: [],
    },
    {
      id: "HSC-12",
      nickname: "Golden Falcons",
      aircraft: "MH-60S Sea Hawk",
      role: "Rescue & logistics helicopters",
      aircraftCount: 8,
      aircrew: "About 16 helicopter pilots plus aircrewmen.",
      leaders: [],
    },
    {
      id: "HSM-77",
      nickname: "Saberhawks",
      aircraft: "MH-60R Sea Hawk",
      role: "Sub-hunting helicopters",
      aircraftCount: 11,
      aircrew: "About 22 helicopter pilots plus sonar operators.",
      leaders: [],
    },
    {
      id: "VRM-30 Det. 5",
      nickname: "Titans",
      aircraft: "CMV-22B Osprey",
      role: "Carrier delivery / cargo",
      aircraftCount: 3,
      aircrew: "About 6 pilots plus crew chiefs on this detachment.",
      leaders: [],
    },
  ],
};

/** Publicly named ship leadership (U.S. Navy / USNI, Aug 2026). */
export const SHIP_LEADERS: Officer[] = [
  { name: "Capt. Nicholas DeLeo", role: "Commanding officer" },
  { name: "Rear Adm. Jeffrey Heames", role: "CSG-5 / Task Force 70 commander" },
];

/** Ships that typically sail with the carrier (recent patrols). */
export const ESCORTS = [
  { name: "USS Robert Smalls", hull: "CG-62", type: "Guided-missile cruiser" },
  { name: "USS Benfold", hull: "DDG-65", type: "Guided-missile destroyer" },
  { name: "USS Shoup", hull: "DDG-86", type: "Guided-missile destroyer" },
];

export type DeploymentInfo = {
  atSea: boolean;
  statusLabel: string; // "At sea" | "In port"
  /** Start of this patrol (left homeport), not the current map pin. */
  patrolSince: string | null;
  /** When the current map location began (e.g. Malacca this week). */
  locationSince: string | null;
  lastPortName: string | null;
  lastPortDate: string | null;
  lastHomeportName: string | null;
  weeksOnPatrol: number | null;
  weeksSincePort: number | null; // since any port call, including Da Nang
  weeksTracked: number;
};

const HOMEPORT_RE = /yokosuka/i;

function weeksBetween(iso: string): number {
  return Math.max(
    1,
    Math.round((Date.now() - new Date(iso).getTime()) / (7 * 24 * 3600 * 1000))
  );
}

/** Derive plain-language deployment status from the weekly stops. */
export function deriveDeployment(stops: Stop[]): DeploymentInfo {
  const current = stops[stops.length - 1] ?? null;
  const atSea = current ? !current.inPort : false;

  let lastHomeportName: string | null = null;
  let lastHomeportIndex = -1;
  for (let i = stops.length - 1; i >= 0; i--) {
    if (stops[i].inPort && HOMEPORT_RE.test(stops[i].placeName)) {
      lastHomeportName = stops[i].placeName;
      lastHomeportIndex = i;
      break;
    }
  }

  // First at-sea report after the last Yokosuka stay = this patrol.
  let patrolSince: string | null = null;
  if (lastHomeportIndex >= 0) {
    for (let i = lastHomeportIndex + 1; i < stops.length; i++) {
      if (!stops[i].inPort) {
        patrolSince = stops[i].startDate;
        break;
      }
    }
  } else if (atSea) {
    for (let i = 0; i < stops.length; i++) {
      if (!stops[i].inPort) {
        patrolSince = stops[i].startDate;
        break;
      }
    }
  }

  let lastPortName: string | null = null;
  let lastPortDate: string | null = null;
  for (let i = stops.length - 1; i >= 0; i--) {
    if (stops[i].inPort) {
      lastPortName = stops[i].placeName;
      lastPortDate = stops[i].endDate;
      break;
    }
    if (stops[i].portCallName) {
      lastPortName = stops[i].portCallName;
      lastPortDate = stops[i].portCallDate;
      break;
    }
  }

  const weeksTracked = stops.reduce((sum, s) => sum + s.weeks, 0);

  return {
    atSea,
    statusLabel: atSea ? "At sea" : "In port",
    patrolSince: atSea ? patrolSince : current?.startDate ?? null,
    locationSince: current?.startDate ?? null,
    lastPortName,
    lastPortDate,
    lastHomeportName,
    weeksOnPatrol: atSea && patrolSince ? weeksBetween(patrolSince) : null,
    weeksSincePort: atSea && lastPortDate ? weeksBetween(lastPortDate) : null,
    weeksTracked,
  };
}
