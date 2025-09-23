import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { LatLngExpression } from "./definitions";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Haversine formula to calculate distance between two lat/lng points
export function getDistance(point1: LatLngExpression, point2: LatLngExpression): number {
  const R = 6371e3; // Earth radius in meters
  const lat1 = point1[0] * Math.PI / 180;
  const lat2 = point2[0] * Math.PI / 180;
  const deltaLat = (point2[0] - point1[0]) * Math.PI / 180;
  const deltaLng = (point2[1] - point1[1]) * Math.PI / 180;

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
}


// Check if a line segment intersects with a circle
export function isLineSegmentIntersectingCircle(
  segment: [LatLngExpression, LatLngExpression],
  circleCenter: LatLngExpression,
  circleRadius: number
): boolean {
  // Convert lat/lon to a simple Cartesian-like coordinate system for local calculations.
  // This is an approximation but good enough for small distances.
  const metersPerDegree = 111320; // Approximate meters per degree of latitude

  const p1 = {
    x: segment[0][1] * metersPerDegree * Math.cos(segment[0][0] * Math.PI / 180),
    y: segment[0][0] * metersPerDegree,
  };
  const p2 = {
    x: segment[1][1] * metersPerDegree * Math.cos(segment[1][0] * Math.PI / 180),
    y: segment[1][0] * metersPerDegree,
  };
  const center = {
    x: circleCenter[1] * metersPerDegree * Math.cos(circleCenter[0] * Math.PI / 180),
    y: circleCenter[0] * metersPerDegree,
  };

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  
  if (dx === 0 && dy === 0) { // segment is a point
    const dist = Math.sqrt((p1.x - center.x)**2 + (p1.y - center.y)**2);
    return dist <= circleRadius;
  }

  const t = ((center.x - p1.x) * dx + (center.y - p1.y) * dy) / (dx * dx + dy * dy);

  let closestPoint;
  if (t < 0) {
    closestPoint = p1;
  } else if (t > 1) {
    closestPoint = p2;
  } else {
    closestPoint = { x: p1.x + t * dx, y: p1.y + t * dy };
  }

  const distSq = (closestPoint.x - center.x)**2 + (closestPoint.y - center.y)**2;

  return distSq <= circleRadius * circleRadius;
}
