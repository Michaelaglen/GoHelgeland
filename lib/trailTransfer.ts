import type { Trail } from "./types";

const FORMAT = "gohelgeland-route-pack";
const VERSION = 1;

export type RoutePack = {
  format: typeof FORMAT;
  version: typeof VERSION;
  exportedAt: string;
  trails: Trail[];
};

export function createRoutePack(trails: Trail[]): string {
  const pack: RoutePack = {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    trails,
  };
  return JSON.stringify(pack, null, 2);
}

function isCoordinate(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length === 2 && value.every(Number.isFinite);
}

function isTrail(value: unknown): value is Trail {
  if (!value || typeof value !== "object") return false;
  const trail = value as Partial<Trail>;
  return (
    typeof trail.slug === "string" &&
    typeof trail.name === "string" &&
    typeof trail.description === "string" &&
    typeof trail.distanceKm === "number" &&
    typeof trail.durationMinutes === "number" &&
    typeof trail.elevationGainM === "number" &&
    (trail.difficulty === "Enkel" || trail.difficulty === "Middels" || trail.difficulty === "Krevende") &&
    Array.isArray(trail.coordinates) &&
    trail.coordinates.length >= 2 &&
    trail.coordinates.every(isCoordinate)
  );
}

export function parseRoutePack(text: string): Trail[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Rutepakken kunne ikke leses.");
  }

  const pack = parsed as Partial<RoutePack>;
  if (pack.format !== FORMAT || pack.version !== VERSION || !Array.isArray(pack.trails)) {
    throw new Error("Filen er ikke en gyldig GoHelgeland-rutepakke.");
  }
  if (!pack.trails.every(isTrail)) {
    throw new Error("Rutepakken inneholder ugyldige rutedata.");
  }
  return pack.trails;
}
