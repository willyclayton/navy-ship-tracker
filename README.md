# USS George Washington Tracker

A small personal site that answers one question every day: **where is USS George Washington (CVN-73) right now?**

It reads the weekly [USNI News Fleet and Marine Tracker](https://news.usni.org/category/fleet-tracker) to show the carrier's current position, its recent movements over the past ~10 weeks, and a plain-language Navy news reading list.

## How it works

- **Position** — the app pulls the USNI News RSS feeds (which include full article text), finds the latest Fleet Tracker post, and extracts the section covering George Washington: the region heading (e.g. "In the South China Sea"), the paragraph describing the strike group, and the official Navy photo.
- **History** — the same parsing runs across all tracker posts in the feed archive, producing a week-by-week list of positions.
- **News** — the USNI News main feed, with summaries trimmed to a sentence or two for quick reading. Items that mention George Washington are flagged.
- Everything is server-rendered and cached; pages revalidate every 30 minutes, so the site is fast and never hammers USNI's servers.

No API keys, no database, no client-side JavaScript required.

## Local development

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Deploying on Vercel (auto-rebuild on merge)

1. Go to [vercel.com/new](https://vercel.com/new) and sign in with GitHub.
2. Import the `navy-ship-tracker` repository. Vercel detects Next.js automatically — no configuration needed. Click **Deploy**.
3. That's it. From now on, **every merge to `main` triggers a production rebuild and deploy automatically**. Pull requests get their own preview URLs.

Because the page uses incremental static regeneration (30-minute revalidation), the deployed site also refreshes its data on its own between deploys — you don't need to merge anything for the position or news to update.

## Notes

- The Fleet Tracker is published weekly (usually Mondays), so the "as of" date moves in weekly steps. Positions are approximate and based on public data.
- All data and photos are credited to [USNI News](https://news.usni.org) and the U.S. Navy.
