export type LatLngExpression = [number, number];

export type DangerZone = {
  id: string;
  location: LatLngExpression;
  weight: number;
  radius: number; // in meters
  level: 'high' | 'moderate';
};

export interface EmergencyContact {
    id: string;
    name: string;
    phone: string;
}
