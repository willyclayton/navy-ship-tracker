"use client";

import type { ShipPhoto } from "@/lib/photos";

export default function PhotoStrip({ photos }: { photos: ShipPhoto[] }) {
  if (photos.length === 0) return null;

  return (
    <div className="photo-strip-wrap">
      <p className="photo-strip-label">
        {photos.length} Navy photos of CVN-73 · scroll sideways
      </p>
      <div className="photo-strip" tabIndex={0} aria-label="USS George Washington photo gallery">
        {photos.map((p) => (
          <figure className="photo-strip-item" key={p.src}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.src} alt={p.caption} loading="lazy" />
            <figcaption>
              {p.pageUrl ? (
                <a href={p.pageUrl} target="_blank" rel="noreferrer">
                  {p.caption}
                </a>
              ) : (
                p.caption
              )}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
