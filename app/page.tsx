import { getShipStatus } from "@/lib/fleet";
import { getNews, getShipDispatches } from "@/lib/news";

export const revalidate = 1800; // refresh data every 30 minutes

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default async function Home() {
  const [status, news, dispatches] = await Promise.all([
    getShipStatus(),
    getNews(),
    getShipDispatches(),
  ]);

  return (
    <main className="wrap">
      <header className="masthead">
        <p className="kicker">CVN-73 · Forward-deployed, Yokosuka, Japan</p>
        <h1>USS George Washington</h1>
      </header>

      {status ? (
        <section className="status">
          <p className="asof">
            As of {formatDate(status.asOf)} —{" "}
            <a href={status.articleUrl}>USNI News Fleet Tracker</a>
          </p>
          <h2 className="region">{status.region.replace(/^In the /i, "In the ")}</h2>
          {status.summary.map((p, i) => (
            <p className="summary" key={i}>
              {p}
            </p>
          ))}
          {status.photo && (
            <figure className="photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={status.photo.src} alt={status.photo.caption} />
              <figcaption>{status.photo.caption}</figcaption>
            </figure>
          )}
        </section>
      ) : (
        <section className="status">
          <p className="summary">
            Couldn&apos;t reach the fleet tracker right now. Check{" "}
            <a href="https://news.usni.org/category/fleet-tracker">
              USNI News directly
            </a>
            .
          </p>
        </section>
      )}

      {status && status.history.length > 1 && (
        <section className="history">
          <h3>Recent positions</h3>
          <ul>
            {status.history.map((h) => (
              <li key={h.url}>
                <span className="hdate">{shortDate(h.date)}</span>
                <a href={h.url}>{h.region}</a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {dispatches.length > 0 && (
        <section className="dispatches">
          <h3>From the ship</h3>
          <ul>
            {dispatches.map((d) => (
              <li key={d.link}>
                <span className="hdate">{shortDate(d.date)}</span>
                <a href={d.link}>{d.title}</a>
              </li>
            ))}
          </ul>
          <p className="note">
            Official photos and stories from George Washington&apos;s public
            affairs team, via DVIDS.
          </p>
        </section>
      )}

      <section className="news">
        <h3>Navy news</h3>
        {news.length === 0 && <p className="summary">No news available.</p>}
        <ul>
          {news.map((n) => (
            <li key={n.link} className={n.mentionsShip ? "ship" : ""}>
              <a href={n.link}>{n.title}</a>
              <p>{n.summary}</p>
              <span className="meta">
                {n.source} · {shortDate(n.date)}
                {n.mentionsShip && " · mentions GW"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="about">
        <h3>About the ship</h3>
        <p>
          USS George Washington (CVN-73) is a Nimitz-class nuclear-powered
          aircraft carrier and the Navy&apos;s only forward-deployed carrier,
          homeported at Yokosuka, Japan. She is the flagship of the George
          Washington Carrier Strike Group in the U.S. 7th Fleet, sailing with
          Carrier Air Wing 5, the cruiser USS Robert Smalls, and the destroyers
          USS Benfold and USS Shoup.
        </p>
      </section>

      <footer>
        <p>
          Positions and news from{" "}
          <a href="https://news.usni.org">USNI News</a>. The fleet tracker is
          published weekly; positions are approximate and based on public data.
        </p>
      </footer>
    </main>
  );
}
