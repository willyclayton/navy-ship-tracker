import type { Officer, Squadron } from "@/lib/ship";
import { AIR_WING } from "@/lib/ship";

function Leaders({ people }: { people: Officer[] }) {
  if (people.length === 0) {
    return (
      <p className="sq-note">
        Individual aircrew names are not published. Squadron leadership is not
        listed on the public Navy page right now.
      </p>
    );
  }
  return (
    <ul className="sq-leaders">
      {people.map((p) => (
        <li key={`${p.role}-${p.name}`}>
          <strong>{p.name}</strong>
          <span>{p.role}</span>
        </li>
      ))}
    </ul>
  );
}

function SquadronCard({ sq }: { sq: Squadron }) {
  return (
    <details className="squadron">
      <summary>
        <span className="sq-head">
          <strong>
            {sq.id} “{sq.nickname}”
          </strong>
          <span>
            {sq.aircraftCount}× {sq.aircraft}
          </span>
        </span>
      </summary>
      <p className="sq-role">{sq.role}</p>
      <p className="sq-aircrew">{sq.aircrew}</p>
      <Leaders people={sq.leaders} />
    </details>
  );
}

export default function Squadrons() {
  const jets = AIR_WING.squadrons.reduce((n, s) => n + s.aircraftCount, 0);

  return (
    <section className="card">
      <h2 className="card-title">Who&apos;s on board — {AIR_WING.name}</h2>
      <p className="blurb">
        {AIR_WING.base}. About {jets} aircraft on a typical patrol. Tap a
        squadron for the jet count and publicly named leaders — the Navy does
        not publish a roster of every pilot on this cruise.
      </p>
      <div className="wing-leaders">
        {AIR_WING.leaders.map((p) => (
          <div className="wing-leader" key={p.name}>
            <strong>{p.name}</strong>
            <span>{p.role}</span>
          </div>
        ))}
      </div>
      <div className="squadrons">
        {AIR_WING.squadrons.map((sq) => (
          <SquadronCard key={sq.id} sq={sq} />
        ))}
      </div>
    </section>
  );
}
