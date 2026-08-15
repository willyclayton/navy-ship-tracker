import { getShipStatus } from "@/lib/fleet";
import { getNews } from "@/lib/news";
import { buildStops } from "@/lib/geo";
import { computeIntensity } from "@/lib/intensity";
import { SHIP, AIR_WING, ESCORTS, deriveDeployment } from "@/lib/ship";
import { summarize } from "@/lib/text";
import MapPanel from "./components/MapPanel";
import Gauge from "./components/Gauge";
import CarrierDiagram from "./components/CarrierDiagram";

export const revalidate = 1800; // refresh data every 30 minutes

function fmtDate(iso: string): string {
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
  const [status, news] = await Promise.all([getShipStatus(), getNews(14)]);
  const stops = status ? buildStops(status.history) : [];
  const current = stops[stops.length - 1] ?? null;
  const deployment = deriveDeployment(stops);
  const intensity = computeIntensity(news);

  return (
    <main className="wrap">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="topbar">
        <div>
          <p className="kicker">CVN-73 · U.S. 7th Fleet · Forward-deployed to Japan</p>
          <h1>USS George Washington</h1>
        </div>
        {current && (
          <div className={`status-chip ${deployment.atSea ? "sea" : "port"}`}>
            <span className="chip-dot" />
            <div>
              <strong>
                {deployment.atSea ? "At sea" : "In port"} · {current.placeName}
              </strong>
              <small>
                as of {fmtDate(status!.asOf)}
                {status!.sourceLabel ? ` · ${status!.sourceLabel}` : ""}
              </small>
            </div>
          </div>
        )}
      </header>

      {/* ── Map ────────────────────────────────────────────── */}
      {stops.length > 0 ? (
        <MapPanel stops={stops} />
      ) : (
        <div className="card">
          <p>
            Couldn&apos;t reach the fleet tracker right now. Try{" "}
            <a href="https://news.usni.org/category/fleet-tracker">USNI News</a>{" "}
            directly.
          </p>
        </div>
      )}

      {/* ── This week + intensity ──────────────────────────── */}
      <div className="two-col">
        {status && (
          <section className="card">
            <h2 className="card-title">This week</h2>
            <p className="big-place">{current?.placeName ?? status.region}</p>
            <p className="blurb">{summarize(status.summary.join(" "), 200)}</p>
            <details>
              <summary>Full report</summary>
              {status.summary.map((p, i) => (
                <p className="detail-text" key={i}>{p}</p>
              ))}
              <p className="detail-text">
                <a href={status.articleUrl}>
                  {status.articleTitle} →
                </a>
              </p>
            </details>
          </section>
        )}

        <section className="card">
          <h2 className="card-title">Conflict intensity</h2>
          <Gauge intensity={intensity} />
          <p className="blurb">{intensity.headline}</p>
          {intensity.drivers.length > 0 && (
            <details>
              <summary>What&apos;s moving the needle</summary>
              <ul className="drivers">
                {intensity.drivers.map((d) => (
                  <li key={d.link}>
                    <span className={d.weight > 0 ? "up" : "down"}>
                      {d.weight > 0 ? "▲" : "▼"}
                    </span>
                    <a href={d.link}>{d.title}</a>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      </div>

      {/* ── Deployment status ──────────────────────────────── */}
      {stops.length > 0 && (
        <section className="card">
          <h2 className="card-title">Deployment</h2>
          <div className="stat-row">
            <div className="stat">
              <span className="stat-value">{deployment.statusLabel}</span>
              <span className="stat-label">
                {deployment.currentSince
                  ? `since ${shortDate(deployment.currentSince)}`
                  : "current status"}
              </span>
            </div>
            {deployment.atSea && deployment.weeksSincePort != null && (
              <div className="stat">
                <span className="stat-value">{deployment.weeksSincePort} wk</span>
                <span className="stat-label">underway since last port</span>
              </div>
            )}
            {deployment.lastPortName && (
              <div className="stat">
                <span className="stat-value">
                  {deployment.lastPortDate ? shortDate(deployment.lastPortDate) : "—"}
                </span>
                <span className="stat-label">
                  last docked · {deployment.lastPortName}
                </span>
              </div>
            )}
            <div className="stat">
              <span className="stat-value">{deployment.weeksTracked}</span>
              <span className="stat-label">weeks of track history</span>
            </div>
          </div>
        </section>
      )}

      {/* ── The ship ───────────────────────────────────────── */}
      <section className="card">
        <h2 className="card-title">The ship</h2>
        {status?.photo && (
          <figure className="photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={status.photo.src} alt={status.photo.caption} />
            <figcaption>{status.photo.caption}</figcaption>
          </figure>
        )}
        <CarrierDiagram />
        <div className="stat-row facts">
          <div className="stat"><span className="stat-value">~5,500</span><span className="stat-label">people aboard when deployed</span></div>
          <div className="stat"><span className="stat-value">~70</span><span className="stat-label">aircraft</span></div>
          <div className="stat"><span className="stat-value">1,092 ft</span><span className="stat-label">length</span></div>
          <div className="stat"><span className="stat-value">30+ kt</span><span className="stat-label">top speed, nuclear-powered</span></div>
        </div>
        <details>
          <summary>All specs</summary>
          <dl className="specs">
            <div><dt>Class</dt><dd>{SHIP.class}</dd></div>
            <div><dt>Commissioned</dt><dd>{SHIP.commissioned}</dd></div>
            <div><dt>Homeport</dt><dd>{SHIP.homeport}</dd></div>
            <div><dt>Displacement</dt><dd>{SHIP.displacement}</dd></div>
            <div><dt>Flight deck width</dt><dd>{SHIP.beam}</dd></div>
            <div><dt>Propulsion</dt><dd>{SHIP.propulsion}</dd></div>
            <div><dt>Ship&apos;s crew</dt><dd>~{SHIP.crew.shipsCompany.toLocaleString()} sailors</dd></div>
            <div><dt>Air wing personnel</dt><dd>~{SHIP.crew.airWing.toLocaleString()} more</dd></div>
          </dl>
        </details>
      </section>

      {/* ── Who flies off it ───────────────────────────────── */}
      <section className="card">
        <h2 className="card-title">Who&apos;s on board — {AIR_WING.name}</h2>
        <p className="blurb">{AIR_WING.base}.</p>
        <div className="squadrons">
          {AIR_WING.squadrons.map((sq) => (
            <div className="squadron" key={sq.id}>
              <strong>{sq.id} “{sq.nickname}”</strong>
              <span>{sq.aircraft}</span>
              <small>{sq.role}</small>
            </div>
          ))}
        </div>
        <details>
          <summary>Ships sailing with the carrier</summary>
          <ul className="escorts">
            {ESCORTS.map((e) => (
              <li key={e.hull}>
                <strong>{e.name} ({e.hull})</strong> — {e.type}
              </li>
            ))}
          </ul>
        </details>
      </section>

      {/* ── News ───────────────────────────────────────────── */}
      <section className="card">
        <h2 className="card-title">Navy news — tap a headline to expand</h2>
        {news.length === 0 && <p className="blurb">No news available right now.</p>}
        <div className="news">
          {news.map((n) => (
            <details key={n.link} className={n.mentionsShip ? "ship-news" : ""}>
              <summary>
                <span className="news-head">
                  {n.mentionsShip && <span className="gw-tag">GW</span>}
                  {n.title}
                </span>
                <span className="news-date">{shortDate(n.date)}</span>
              </summary>
              <p className="detail-text">{n.summary}</p>
              <p className="detail-text">
                <a href={n.link}>{n.source} →</a>
              </p>
            </details>
          ))}
        </div>
      </section>

      <footer>
        <p>
          Positions from{" "}
          <a href="https://news.usni.org/category/fleet-tracker">
            USNI News Fleet Tracker
          </a>{" "}
          and{" "}
          <a href="https://news.usni.org/tag/western-pacific-pulse">
            Western Pacific Pulse
          </a>{" "}
          (independent public sources — not official Navy data). Current
          position uses the newest report; Pulse map pins are used when
          available. Positions are approximate. Photos: U.S. Navy.
        </p>
      </footer>
    </main>
  );
}
