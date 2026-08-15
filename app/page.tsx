import { getShipStatus } from "@/lib/fleet";
import { getNews, getNewsArchive } from "@/lib/news";
import { buildStops } from "@/lib/geo";
import { computeIntensityHistory } from "@/lib/intensity";
import { SHIP, SHIP_LEADERS, ESCORTS, deriveDeployment } from "@/lib/ship";
import { getShipPhotos } from "@/lib/photos";
import { summarize } from "@/lib/text";
import MapPanel from "./components/MapPanel";
import IntensityPanel from "./components/IntensityPanel";
import CarrierDiagram from "./components/CarrierDiagram";
import PhotoStrip from "./components/PhotoStrip";
import Squadrons from "./components/Squadrons";

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
  const [status, news, archive, photos] = await Promise.all([
    getShipStatus(),
    getNews(14),
    getNewsArchive(),
    getShipPhotos(),
  ]);
  const stops = status ? buildStops(status.history) : [];
  const current = stops[stops.length - 1] ?? null;
  const deployment = deriveDeployment(stops);
  const intensityHistory = computeIntensityHistory(archive);

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

        <IntensityPanel history={intensityHistory} />
      </div>

      {/* ── Deployment status ──────────────────────────────── */}
      {stops.length > 0 && (
        <section className="card">
          <h2 className="card-title">Deployment</h2>
          <div className="stat-row">
            <div className="stat">
              <span className="stat-value">{deployment.statusLabel}</span>
              <span className="stat-label">
                {deployment.patrolSince
                  ? `on patrol since ${shortDate(deployment.patrolSince)}${
                      deployment.lastHomeportName
                        ? ` · left ${deployment.lastHomeportName}`
                        : ""
                    }`
                  : "current status"}
              </span>
            </div>
            {deployment.atSea && deployment.weeksOnPatrol != null && (
              <div className="stat">
                <span className="stat-value">{deployment.weeksOnPatrol} wk</span>
                <span className="stat-label">on this patrol from Japan</span>
              </div>
            )}
            {deployment.lastPortName && (
              <div className="stat">
                <span className="stat-value">
                  {deployment.lastPortDate ? shortDate(deployment.lastPortDate) : "—"}
                </span>
                <span className="stat-label">
                  last port call · {deployment.lastPortName}
                </span>
              </div>
            )}
            {deployment.atSea && deployment.locationSince && (
              <div className="stat">
                <span className="stat-value">{shortDate(deployment.locationSince)}</span>
                <span className="stat-label">
                  this location · {current?.placeName}
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
        <PhotoStrip photos={photos} />
        {photos.length === 0 && status?.photo && (
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
        <ul className="sq-leaders ship-leaders">
          {SHIP_LEADERS.map((p) => (
            <li key={p.name}>
              <strong>{p.name}</strong>
              <span>{p.role}</span>
            </li>
          ))}
        </ul>
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

      <Squadrons />
      <section className="card">
        <h2 className="card-title">Ships sailing with the carrier</h2>
        <ul className="escorts">
          {ESCORTS.map((e) => (
            <li key={e.hull}>
              <strong>{e.name} ({e.hull})</strong> — {e.type}
            </li>
          ))}
        </ul>
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
          (independent public sources — not official Navy data). Aircraft
          counts are typical embarked numbers; named aircrew are publicly
          listed leaders only. Photos: U.S. Navy via USNI News, DVIDS, and
          Wikimedia Commons.
        </p>
      </footer>
    </main>
  );
}
