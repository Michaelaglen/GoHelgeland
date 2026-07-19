export type Coordinate = [number, number];
export type Trail = { slug:string; name:string; description:string; distanceKm:number; durationMinutes:number; elevationGainM:number; difficulty:"Enkel"|"Middels"|"Krevende"; coordinates:Coordinate[] };
export type PositionSnapshot = { lng:number; lat:number; accuracy:number; altitude:number|null; heading:number|null; speed:number|null; timestamp:number };
