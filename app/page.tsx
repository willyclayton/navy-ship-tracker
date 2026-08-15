import Gauge from "@/components/Gauge";
import ShipMap, { type MapStop } from "@/components/ShipMap";
import { getShipStatus, type HistoryEntry } from "@/lib/fleet";
import { getNews, getShipDispatches } from "@/lib/news";
import { regionToCoords } from "@/lib/coords";
import { assessTension } from "@/lib/tension";
import { AIR_WING, DEPLOYMENT, ESCORTS, SHIP_STATS, daysDeployed } from "@/lib/ship";

export const revalidate = 1800; // refresh data every 30 minutes

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function firstSentence(text: string): string {
  const m = text.match(/^.*?[.!?](?=\s|$)/);
  return m ? m[0] : text;
}

/** Group consecutive weeks in the same region into single map stops. */
function buildStops(history: HistoryEntry[]): MapStop[] {
  const stops: MapStop[] = [];
  for (const entry of history) {
    const coords = regionToCoords(entry.region);
    if (!coords) continue;
    const last = stops[stops.length - 1];
    if (last && last.region === entry.region) {
      last.fromLabel = shortDate(entry.date); // extend range back in time
      continue;
    }
    stops.push({
      lat: coords[0],
      lng: coords[1],
      region: entry.region,
      fromLabel: shortDate(entry.date),
      toLabel: shortDate(entry.date),
      blurb: entry.blurb,
      url: entry.url,
      current: stops.length === 0,
    });
  }
  return stops;
}

export default async function Home() {
  const [status, allNews, dispatches] = await Promise.all([
    getShipStatus(),
    getNews(30), // wide window so the tension reading sees more than the page shows
    getShipDispatches(3),
  ]);
  const news = allNews.slice(0, 14);

  const stops = status ? buildStops(status.history) : [];
  const tension = assessTension(allNews);

  return (
    <main className="wrap">
      <header className="masthead">
        <p className="kicker">CVN-73 · U.S. 7th Fleet</p>
        <h1>USS George Washington</h1>
      </header>

      {status ? (
        <>
          <section className="position">
            <h2 className="region">{status.region}</h2>
            <p className="asof">
              As of {shortDate(status.asOf)} ·{" "}
              <a href={status.articleUrl}>{status.source}</a>
            </p>
            {status.summary[0] && (
              <p className="position-blurb">{firstSentence(status.summary[0])}</p>
            )}
          </section>

          <ShipMap stops={stops} />
          <p className="map-hint">
            The patrol so far — tap a dot for that week&apos;s details.
          </p>

          <section className="tension">
            <Gauge score={tension.score} />
            <div className="tension-text">
              <p className="tension-level">{tension.level}</p>
              <p className="tension-headline">{tension.headline}</p>
              {tension.drivers.length > 0 && (
                <details>
                  <summary>What&apos;s behind this reading</summary>
                  <ul>
                    {tension.drivers.map((d) => (
                      <li key={d.link}>
                        <a href={d.link}>{d.title}</a>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </section>
        </>
      ) : (
        <section className="position">
          <p>
            Couldn&apos;t reach the fleet tracker right now — check{" "}
            <a href="https://news.usni.org/category/fleet-tracker">USNI News</a>.
          </p>
        </section>
      )}

      <section className="news">
        <h3>News</h3>
        <ul>
          {news.map((n) => (
            <li key={n.link} className={n.mentionsShip ? "ship" : ""}>
              <details>
                <summary>
                  <span className="headline">{n.title}</span>
                  <span className="meta">
                    {n.source} · {shortDate(n.date)}
                    {n.mentionsShip && <span className="tag">GW</span>}
                  </span>
                </summary>
                <p>{n.summary}</p>
                <a href={n.link}>Read the full story →</a>
              </details>
            </li>
          ))}
        </ul>
      </section>

      <section className="shipinfo">
        <h3>The ship</h3>

        <div className="deployment">
          <div className="stat-big">
            <span className="num">{daysDeployed()}</span>
            <span className="lbl">days on patrol</span>
          </div>
          <div className="deployment-facts">
            <p>
              Underway from Yokosuka since {DEPLOYMENT.startLabel}. Last port
              call: {DEPLOYMENT.lastPortCall.place},{" "}
              {DEPLOYMENT.lastPortCall.dateLabel}.
            </p>
            <p className="fine">{DEPLOYMENT.note}</p>
          </div>
        </div>

        {status?.photo && (
          <figure className="photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={status.photo.src} alt={status.photo.caption} />
            <figcaption>{status.photo.caption}</figcaption>
          </figure>
        )}

        <dl className="stats">
          {SHIP_STATS.map((s) => (
            <div key={s.label}>
              <dt>{s.label}</dt>
              <dd>{s.value}</dd>
            </div>
          ))}
        </dl>

        <details className="expand">
          <summary>Who flies off the deck — Carrier Air Wing 5</summary>
          <table className="airwing">
            <tbody>
              {AIR_WING.map((sq) => (
                <tr key={sq.code}>
                  <td className="code">{sq.code}</td>
                  <td>
                    <span className="sqname">{sq.name}</span>
                    <span className="sqrole">{sq.role}</span>
                  </td>
                  <td className="aircraft">{sq.aircraft}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>

        <details className="expand">
          <summary>Sailing with the strike group</summary>
          <ul className="escorts">
            {ESCORTS.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </details>

        {dispatches.length > 0 && (
          <details className="expand">
            <summary>Latest from the ship&apos;s photographers</summary>
            <ul className="dispatch-list">
              {dispatches.map((d) => (
                <li key={d.link}>
                  <span className="hdate">{shortDate(d.date)}</span>
                  <a href={d.link}>{d.title}</a>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <footer>
        <p>
          Positions from the weekly{" "}
          <a href="https://news.usni.org/category/fleet-tracker">
            USNI News Fleet Tracker
          </a>{" "}
          — approximate, based on public data. News from USNI News, Navy Times
          and Defense News.
        </p>
      </footer>
    </main>
  );
}
