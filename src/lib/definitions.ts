export type LatLngExpression = [number, number];

export type DangerZone = {
  id: string;
  location: LatLngExpression;
  weight: number;
  radius: number; // in meters
};
