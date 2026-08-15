# USS George Washington Tracker

A visual, civilian-friendly tracker for **USS George Washington (CVN-73)**: open the page and see where the carrier is right now on an interactive map, where she's been over recent weeks, how tense things are in the region, and who's on board.

## What's on the page

- **Interactive map** — the carrier's track over the last 4/8/12 weeks (or everything on record) on a detailed ocean basemap. Consecutive weeks in the same place collapse into one numbered marker; click any marker for that stretch's dates, a short blurb, and a link to the full report. The current position pulses red; green markers are in-port stays.
- **Conflict-intensity dial** — a green-to-red gauge scored from recent Navy headlines. Expand "what's moving the needle" to see which stories pushed it up (▲) or down (▼).
- **This week** — the current region in large type, with the full weekly report tucked behind an expander.
- **Deployment** — at sea or in port, how long she's been underway, when and where she last docked, and how many weeks of history are tracked.
- **The ship** — the latest Navy photo, a labeled side-profile diagram, and headline stats (~5,500 people aboard, ~70 aircraft, 1,092 ft, 30+ knots), with full specs on demand.
- **Who's on board** — all nine Carrier Air Wing 5 squadrons with their aircraft and plain-language roles, plus the cruiser and destroyers sailing with the carrier.
- **Navy news** — headlines first; tap one to expand a two-sentence summary.

## Where the data comes from

- Positions come from the weekly [USNI News Fleet and Marine Tracker](https://news.usni.org/category/fleet-tracker) (an independent public source — not official Navy data). `lib/fleet.ts` parses the RSS feeds, finds the section covering George Washington in each weekly post, and `lib/geo.ts` converts region headings like "In the Philippine Sea" into approximate map coordinates, detecting in-port weeks and passing port-call mentions.
- The intensity dial (`lib/intensity.ts`) keyword-scores recent USNI headlines; stories mentioning the ship count double.
- Ship, air wing, and escort facts live in `lib/ship.ts`.
- Everything is server-rendered and cached with a 30-minute revalidation. The map (Leaflet) is the only client-side JavaScript; all expanders are native `<details>` elements.

No API keys and no database.

## Local development

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Deploying on Vercel

Import the repository at [vercel.com/new](https://vercel.com/new) — Next.js is detected automatically. Every merge to `main` deploys, and the 30-minute revalidation keeps positions and news fresh between deploys.

## Notes

- The Fleet Tracker is published weekly (usually Mondays), so positions move in weekly steps and are approximate.
- Map tiles: Esri World Ocean basemap (Esri, GEBCO, NOAA, Garmin). Photos: U.S. Navy via USNI News.
