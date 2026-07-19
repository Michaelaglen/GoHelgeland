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

  if (doc.querySelector("parsererror")) {
    throw new Error("Filen ser ikke ut som en gyldig GPX-fil.");
  }

  const points = Array.from(doc.querySelectorAll("trkpt, rtept"));

  if (points.length < 2) {
    throw new Error(
      "Fant færre enn to rutepunkter i GPX-filen."
    );
  }

  const coordinates: Coordinate[] = [];

  for (const point of points) {
    const lat = Number(point.getAttribute("lat"));
    const lng = Number(point.getAttribute("lon"));

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      coordinates.push([lng, lat]);
    }
  }

  if (coordinates.length < 2) {
    throw new Error(
      "GPX-filen inneholder ikke nok gyldige koordinater."
    );
  }

  const elevations: number[] = [];

  for (const point of points) {
    const elevationText = point.querySelector("ele")?.textContent;

    if (elevationText === null || elevationText === undefined) {
      continue;
    }

    const elevation = Number(elevationText);

    if (Number.isFinite(elevation)) {
      elevations.push(elevation);
    }
  }

  let distanceMeters = 0;

  for (let index = 1; index < coordinates.length; index += 1) {
    distanceMeters += haversineMeters(
      coordinates[index - 1],
      coordinates[index]
    );
  }

  let ascentMeters = 0;

  for (let index = 1; index < elevations.length; index += 1) {
    const difference = elevations[index] - elevations[index - 1];

    if (difference > 0) {
      ascentMeters += difference;
    }
  }

  const embeddedName = doc
    .querySelector("trk > name, rte > name, metadata > name")
    ?.textContent?.trim();

  const fallbackNameWithoutExtension = fallbackName
    .replace(/\.gpx$/i, "")
    .trim();

  const name =
    embeddedName ||
    fallbackNameWithoutExtension ||
    "Importert tur";

  const distanceKm = Math.max(
    0.1,
    Math.round(distanceMeters / 100) / 10
  );

  const durationMinutes = Math.max(
    10,
    Math.round(((distanceKm / 3.5) * 60) / 5) * 5
  );

  let difficulty: Trail["difficulty"] = "Enkel";

  if (distanceKm > 10 || ascentMeters > 700) {
    difficulty = "Krevende";
  } else if (distanceKm > 5 || ascentMeters > 300) {
    difficulty = "Middels";
  }

  return {
    slug: `${slugify(name) || "tur"}-${Date.now()
      .toString()
      .slice(-6)}`,
    name,
    description:
      "Importert lokalt fra GPX. Kontroller alltid ruta før bruk i felt.",
    distanceKm,
    durationMinutes,
    elevationGainM: Math.round(ascentMeters),
    difficulty,
    coordinates,
  };
}