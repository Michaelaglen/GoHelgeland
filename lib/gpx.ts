import { Coordinate, Trail } from "./types";
import { haversineMeters } from "./geo";

function slugify(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function parseGpx(xml: string, fallbackName: string): Trail {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("Filen ser ikke ut som en gyldig GPX-fil.");
  const points = [...doc.querySelectorAll("trkpt, rtept")];
  if (points.length < 2) throw new Error("Fant færre enn to rutepunkter i GPX-filen.");

  const coordinates: Coordinate[] = points.map((point) => {
    const lat = Number(point.getAttribute("lat"));
    const lng = Number(point.getAttribute("lon"));
    return [lng, lat];
  }).filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat));

  const elevations = points.map((p) => Number(p.querySelector("ele")?.textContent)).filter(Number.isFinite);
  let distance = 0;
  for (let i = 1; i < coordinates.length; i++) distance += haversineMeters(coordinates[i - 1], coordinates[i]);
  let ascent = 0;
  for (let i = 1; i < elevations.length; i++) if (elevations[i] > elevations[i - 1]) ascent += elevations[i] - elevations[i - 1];

  const embeddedName = doc.querySelector("trk > name, rte > name, metadata > name")?.textContent?.trim();
  const name = embeddedName || fallbackName.replace(/\.gpx$/i, "") || "Importert tur";
  const distanceKm = Math.max(0.1, Math.round(distance / 100) / 10);

  return {
    slug: `${slugify(name) || "tur"}-${Date.now().toString().slice(-6)}`,
    name,
    description: "Importert lokalt fra GPX. Kontroller alltid ruta før bruk i felt.",
    distanceKm,
    durationMinutes: Math.max(10, Math.round((distanceKm / 3.5) * 60 / 5) * 5),
    elevationGainM: Math.round(ascent),
    difficulty: distanceKm > 10 || ascent > 700 ? "Krevende" : distanceKm > 5 || ascent > 300 ? "Middels" : "Enkel",
    coordinates,
  };
}
