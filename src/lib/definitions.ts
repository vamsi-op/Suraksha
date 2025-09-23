export type DangerZone = {
  id: string;
  location: google.maps.LatLngLiteral;
  weight: number;
  radius: number; // in meters
};
