"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { Map } from "maplibre-gl";
import { Trail, PositionSnapshot } from "@/lib/types";
import { bearingDegrees, haversineMeters, nearestSegment, remainingDistanceMeters } from "@/lib/geo";

const FINISH_METERS = 25;

export default function Navigation({ trail, mode, onClose }: { trail: Trail; mode: "gps" | "preview"; onClose: () => void }) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const alertedRef = useRef(false);
  const offRouteSince = useRef<number | null>(null);
  const [position, setPosition] = useState<PositionSnapshot | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [error, setError] = useState("");
  const [finished, setFinished] = useState(false);
  const [follow, setFollow] = useState(true);
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);

  useEffect(() => {
    if (mode !== "preview") return;
    const point = trail.coordinates[previewIndex];
    const next = trail.coordinates[Math.min(previewIndex + 1, trail.coordinates.length - 1)];
    setPosition({ lng: point[0], lat: point[1], accuracy: 5, altitude: null, heading: bearingDegrees(point, next), speed: 1.2, timestamp: Date.now() });
  }, [mode, previewIndex, trail.coordinates]);

  const routeGeoJson = useMemo(() => ({
    type: "Feature" as const,
    geometry: { type: "LineString" as const, coordinates: trail.coordinates },
    properties: {},
  }), [trail.coordinates]);

  const metrics = useMemo(() => {
    if (!position) return { offRoute: false, deviation: 0, remaining: trail.distanceKm * 1000, bearing: 0, nextMeters: 0, nearestIndex: 0 };
    const current: [number, number] = [position.lng, position.lat];
    const nearest = nearestSegment(current, trail.coordinates);
    const lookAhead = Math.min(nearest.index + Math.max(1, Math.floor(trail.coordinates.length / 200)), trail.coordinates.length - 1);
    const next = trail.coordinates[lookAhead];
    const threshold = Math.max(25, Math.min(50, position.accuracy * 1.5));
    return {
      offRoute: nearest.distance > threshold && position.accuracy <= 40,
      deviation: nearest.distance,
      remaining: remainingDistanceMeters(current, trail.coordinates, nearest.index),
      bearing: bearingDegrees(current, next),
      nextMeters: haversineMeters(current, next),
      nearestIndex: nearest.index,
    };
  }, [position, trail]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainer.current,
      center: trail.coordinates[0], zoom: 14, attributionControl: false,
      style: { version: 8, sources: { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap-bidragsytere" } }, layers: [{ id: "osm", type: "raster", source: "osm" }] },
    });
    map.addControl(new maplibregl.AttributionControl({ compact: true }));
    map.on("load", () => {
      map.addSource("route", { type: "geojson", data: routeGeoJson });
      map.addLayer({ id: "route-outline", type: "line", source: "route", paint: { "line-color": "#fff", "line-width": 10, "line-opacity": .9 } });
      map.addLayer({ id: "route-line", type: "line", source: "route", paint: { "line-color": "#145c3b", "line-width": 6 } });
      const bounds = trail.coordinates.reduce((b, c) => b.extend(c), new maplibregl.LngLatBounds(trail.coordinates[0], trail.coordinates[0]));
      map.fitBounds(bounds, { padding: 45, duration: 0 });
    });
    map.on("dragstart", () => setFollow(false));
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [routeGeoJson, trail.coordinates]);

  useEffect(() => {
    if (mode !== "gps") return;
    if (!navigator.geolocation) { setError("Denne nettleseren støtter ikke GPS."); return; }
    const watch = navigator.geolocation.watchPosition(
      (p) => { setError(""); setPosition({ lng: p.coords.longitude, lat: p.coords.latitude, accuracy: p.coords.accuracy, altitude: p.coords.altitude, heading: p.coords.heading, speed: p.coords.speed, timestamp: p.timestamp }); },
      (e) => setError(e.code === 1 ? "Tillat posisjon for å starte navigasjonen." : "GPS-posisjonen kunne ikke hentes. Gå utendørs og prøv igjen."),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [mode]);

  useEffect(() => {
    function orientation(event: DeviceOrientationEvent) {
      const iosHeading = (event as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;
      const heading = typeof iosHeading === "number" ? iosHeading : event.alpha != null ? 360 - event.alpha : null;
      if (heading != null) setDeviceHeading(heading);
    }
    window.addEventListener("deviceorientation", orientation, true);
    return () => window.removeEventListener("deviceorientation", orientation, true);
  }, []);

  useEffect(() => {
    if (!position || !mapRef.current) return;
    const lngLat: [number, number] = [position.lng, position.lat];
    if (!markerRef.current) {
      const el = document.createElement("div"); el.className = "user-marker";
      markerRef.current = new maplibregl.Marker({ element: el }).setLngLat(lngLat).addTo(mapRef.current);
    } else markerRef.current.setLngLat(lngLat);
    if (follow) mapRef.current.easeTo({ center: lngLat, zoom: Math.max(mapRef.current.getZoom(), 16), duration: 500 });
  }, [follow, position]);

  useEffect(() => {
    if (!position) return;
    if (metrics.offRoute) {
      if (!offRouteSince.current) offRouteSince.current = Date.now();
      if (Date.now() - offRouteSince.current > 8000 && !alertedRef.current) { alertedRef.current = true; navigator.vibrate?.([250, 120, 250]); }
    } else { offRouteSince.current = null; alertedRef.current = false; }
    if (metrics.remaining <= FINISH_METERS && !finished) { setFinished(true); navigator.vibrate?.([100, 80, 100, 80, 300]); }
  }, [finished, metrics, position]);

  const heading = deviceHeading ?? position?.heading ?? 0;
  const arrowRotation = metrics.bearing - heading;
  const gpsQuality = !position ? "Søker" : position.accuracy <= 10 ? "Svært god" : position.accuracy <= 25 ? "God" : position.accuracy <= 40 ? "Svak" : "For svak";
  const distanceText = metrics.remaining < 1000 ? `${Math.round(metrics.remaining)} m` : `${(metrics.remaining / 1000).toFixed(1)} km`;

  return (
    <div className="nav-screen">
      <div ref={mapContainer} className="map" />
      <div className="nav-top">
        <button className="nav-chip" onClick={onClose}>← Ruter</button>
        <div className={`nav-chip gps-${gpsQuality.replace(" ", "-").toLowerCase()}`}>● GPS {gpsQuality}{position ? ` · ±${Math.round(position.accuracy)} m` : ""}</div>
      </div>

      {!follow && <button className="recenter" onClick={() => setFollow(true)}>◎ Følg meg</button>}
      {error && <div className="nav-alert danger"><strong>Posisjon mangler</strong><span>{error}</span></div>}
      {metrics.offRoute && !error && <div className="nav-alert warning"><strong>Du er utenfor ruta</strong><span>Gå tilbake omtrent {Math.round(metrics.deviation)} meter.</span></div>}

      <section className="guidance-panel">
        <div className="direction-wrap"><div className="direction-arrow" style={{ transform: `rotate(${arrowRotation}deg)` }}>↑</div></div>
        <div className="guidance-copy">
          <span className="guidance-label">FORTSETT MOT RUTA</span>
          <strong>{distanceText} igjen</strong>
          <span>{Math.max(0, Math.round(metrics.nextMeters))} m mot neste retningspunkt</span>
        </div>
      </section>

      <div className="metric-strip">
        <div><span>Høyde</span><strong>{position?.altitude != null ? `${Math.round(position.altitude)} m` : "—"}</strong></div>
        <div><span>Fart</span><strong>{position?.speed != null ? `${(position.speed * 3.6).toFixed(1)}` : "—"}<small> km/t</small></strong></div>
        <div><span>Fra spor</span><strong>{position ? `${Math.round(metrics.deviation)} m` : "—"}</strong></div>
      </div>

      {mode === "preview" && (
        <div className="preview-controls">
          <div><strong>Nettlesertest</strong><span>{Math.round((previewIndex / Math.max(1, trail.coordinates.length - 1)) * 100)} % av ruta</span></div>
          <input aria-label="Simulert posisjon på ruta" type="range" min="0" max={trail.coordinates.length - 1} value={previewIndex} onChange={(e) => setPreviewIndex(Number(e.target.value))} />
        </div>
      )}

      {finished && <div className="finish"><div className="finish-card"><div className="emoji">✓</div><h2>Du er framme</h2><p>Den importerte ruta er fullført.</p><button className="button large" onClick={onClose}>Til mine ruter</button></div></div>}
    </div>
  );
}
