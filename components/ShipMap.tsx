"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export type MapStop = {
  lat: number;
  lng: number;
  region: string;
  fromLabel: string;
  toLabel: string;
  blurb: string;
  url: string;
  current: boolean;
};

export default function ShipMap({ stops }: { stops: MapStop[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: false, // don't hijack page scroll; zoom via buttons/pinch
        worldCopyJump: true,
      });
      mapRef.current = map;

      const ocean = L.layerGroup([
        L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}",
          { attribution: "Esri, GEBCO, NOAA", maxZoom: 10 }
        ),
        L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}",
          { maxZoom: 10 }
        ),
      ]);

      const satellite = L.layerGroup([
        L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          { attribution: "Esri, Maxar, Earthstar Geographics", maxZoom: 17 }
        ),
        L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
          { maxZoom: 17 }
        ),
      ]);

      ocean.addTo(map);
      L.control
        .layers({ "Ocean chart": ocean, Satellite: satellite }, undefined, {
          position: "topright",
        })
        .addTo(map);

      // Trajectory, oldest to newest.
      const path = [...stops].reverse().map((s) => [s.lat, s.lng] as [number, number]);
      if (path.length > 1) {
        L.polyline(path, {
          color: "#ffffff",
          weight: 5,
          opacity: 0.5,
        }).addTo(map);
        L.polyline(path, {
          color: "#1e3a8a",
          weight: 2,
          dashArray: "6 6",
          opacity: 0.9,
        }).addTo(map);
      }

      stops.forEach((s) => {
        const dates =
          s.fromLabel === s.toLabel ? s.toLabel : `${s.fromLabel} – ${s.toLabel}`;
        const marker = s.current
          ? L.circleMarker([s.lat, s.lng], {
              radius: 10,
              color: "#ffffff",
              weight: 3,
              fillColor: "#b91c1c",
              fillOpacity: 1,
            })
          : L.circleMarker([s.lat, s.lng], {
              radius: 6,
              color: "#ffffff",
              weight: 2,
              fillColor: "#1e3a8a",
              fillOpacity: 0.85,
            });

        marker
          .bindPopup(
            `<div class="map-popup">
              <p class="map-popup-region">${s.region}${s.current ? " · now" : ""}</p>
              <p class="map-popup-dates">${dates}</p>
              ${s.blurb ? `<p class="map-popup-blurb">${s.blurb}</p>` : ""}
              <a href="${s.url}" target="_blank" rel="noreferrer">USNI Fleet Tracker →</a>
            </div>`,
            { maxWidth: 280 }
          )
          .addTo(map);

        if (s.current) {
          marker
            .bindTooltip("Current position", {
              permanent: true,
              direction: "top",
              offset: [0, -10],
              className: "map-current-label",
            })
            .openTooltip();
        }
      });

      if (path.length > 0) {
        // Generous padding so the current-position marker and its label
        // never sit clipped at the map edge.
        map.fitBounds(L.latLngBounds(path.map((p) => L.latLng(p[0], p[1]))), {
          padding: [80, 80],
          maxZoom: 6,
        });
      } else {
        map.setView([20, 130], 4);
      }
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [stops]);

  return <div ref={containerRef} className="ship-map" aria-label="Map of ship positions" />;
}
