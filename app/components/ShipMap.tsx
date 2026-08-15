"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Stop } from "@/lib/geo";

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function stopIcon(index: number, stop: Stop): L.DivIcon {
  if (stop.isCurrent) {
    return L.divIcon({
      className: "",
      html: `<div class="ship-marker"><span class="pulse"></span><span class="dot-current">⚓</span></div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -16],
    });
  }
  return L.divIcon({
    className: "",
    html: `<div class="dot-past ${stop.inPort ? "dot-port" : ""}">${index + 1}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

function FitBounds({ stops }: { stops: Stop[] }) {
  const map = useMap();
  useEffect(() => {
    if (stops.length === 0) return;
    const bounds = L.latLngBounds(stops.map((s) => [s.point.lat, s.point.lng]));
    map.fitBounds(bounds.pad(0.35), { maxZoom: 7 });
  }, [map, stops]);
  return null;
}

export default function ShipMap({ stops }: { stops: Stop[] }) {
  const path = useMemo(
    () => stops.map((s) => [s.point.lat, s.point.lng] as [number, number]),
    [stops]
  );

  return (
    <MapContainer
      center={[25, 138]}
      zoom={4}
      minZoom={2}
      maxZoom={13}
      scrollWheelZoom
      worldCopyJump
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}"
        attribution="Esri, GEBCO, NOAA, Garmin"
        maxZoom={13}
      />
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}"
        maxZoom={13}
      />
      <FitBounds stops={stops} />

      {path.length > 1 && (
        <Polyline
          positions={path}
          pathOptions={{
            color: "#0b4f9e",
            weight: 3,
            opacity: 0.75,
            dashArray: "6 8",
          }}
        />
      )}

      {stops.map((stop, i) => (
        <Marker
          key={`${stop.startDate}-${stop.placeName}`}
          position={[stop.point.lat, stop.point.lng]}
          icon={stopIcon(i, stop)}
          zIndexOffset={stop.isCurrent ? 1000 : i}
        >
          <Popup maxWidth={300}>
            <div className="pop">
              <p className="pop-place">
                {stop.inPort ? "In port — " : ""}
                {stop.placeName}
                {stop.isCurrent && <span className="pop-now">NOW</span>}
              </p>
              <p className="pop-dates">
                {stop.weeks > 1
                  ? `${shortDate(stop.startDate)} – ${shortDate(stop.endDate)} · ${stop.weeks} weeks`
                  : shortDate(stop.startDate)}
              </p>
              <p className="pop-blurb">
                {stop.blurb.length > 240
                  ? stop.blurb.slice(0, 240).replace(/\s+\S*$/, "") + "…"
                  : stop.blurb}
              </p>
              <a href={stop.url} target="_blank" rel="noreferrer">
                Full USNI report →
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
