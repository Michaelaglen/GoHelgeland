import { haversineMeters } from "./geo";
import type { Coordinate, Trail } from "./types";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function parseGpx(xml: string, fallbackName: string): Trail {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("Filen ser ikke ut som en gyldig GPX-fil.");

  const points = Array.from(doc.querySelectorAll("trkpt, rtept"));
  if (points.length < 2) throw new Error("Fant færre enn to rutepunkter i GPX-filen.");

  const coordinates: Coordinate[] = [];
  const elevations: number[] = [];

  for (const point of points) {
    const lat = Number(point.getAttribute("lat"));
    const lng = Number(point.getAttribute("lon"));
    if (Number.isFinite(lat) && Number.isFinite(lng)) coordinates.push([lng, lat]);

    const elevationText = point.querySelector("ele")?.textContent;
    if (elevationText != null) {
      const elevation = Number(elevationText);
      if (Number.isFinite(elevation)) elevations.push(elevation);
    }
  }

  if (coordinates.length < 2) throw new Error("GPX-filen inneholder ikke nok gyldige koordinater.");

  let distance = 0;
  for (let i = 1; i < coordinates.length; i += 1) distance += haversineMeters(coordinates[i - 1], coordinates[i]);

  let ascent = 0;
  for (let i = 1; i < elevations.length; i += 1) {
    const gain = elevations[i] - elevations[i - 1];
    if (gain > 0) ascent += gain;
  }

  const embeddedName = doc.querySelector("trk > name, rte > name, metadata > name")?.textContent?.trim();
  const name = embeddedName || fallbackName.replace(/\.gpx$/i, "").trim() || "Importert tur";
  const distanceKm = Math.max(0.1, Math.round(distance / 100) / 10);

  return {
    slug: `${slugify(name) || "tur"}-${Date.now().toString().slice(-6)}`,
    name,
    description: "Importert lokalt fra GPX. Kontroller alltid ruta før bruk i felt.",
    distanceKm,
    durationMinutes: Math.max(10, Math.round(((distanceKm / 3.5) * 60) / 5) * 5),
    elevationGainM: Math.round(ascent),
    difficulty: distanceKm > 10 || ascent > 700 ? "Krevende" : distanceKm > 5 || ascent > 300 ? "Middels" : "Enkel",
    coordinates,
  };
}
