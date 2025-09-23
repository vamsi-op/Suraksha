'use client';

import { Map, useMap, AdvancedMarker } from '@vis.gl/react-google-maps';
import { useEffect, useRef } from 'react';
import type { DangerZone } from '@/lib/definitions';
import { PersonStanding } from 'lucide-react';

interface GuardianAngelMapProps {
  userPosition: google.maps.LatLngLiteral | null;
  dangerZones: DangerZone[];
  routes: google.maps.DirectionsRoute[];
  saferRouteIndex: number;
}

const LOS_ANGELES = { lat: 34.0549, lng: -118.2426 };

export default function GuardianAngelMap({ userPosition, dangerZones, routes, saferRouteIndex }: GuardianAngelMapProps) {
  const map = useMap();
  const heatmapRef = useRef<google.maps.visualization.HeatmapLayer | null>(null);
  const routeRenderersRef = useRef<google.maps.DirectionsRenderer[]>([]);

  useEffect(() => {
    if (!map) return;

    if (!heatmapRef.current) {
      heatmapRef.current = new google.maps.visualization.HeatmapLayer({
        data: dangerZones.map(zone => ({
          location: new google.maps.LatLng(zone.location.lat, zone.location.lng),
          weight: zone.weight,
        })),
        map: map,
        radius: 50,
        gradient: [
            "rgba(0, 255, 0, 0)",
            "rgba(0, 255, 0, 1)",
            "rgba(255, 255, 0, 1)",
            "rgba(255, 0, 0, 1)",
          ],
      });
    }

  }, [map, dangerZones]);

  useEffect(() => {
    if (!map) return;

    // Clear previous routes
    routeRenderersRef.current.forEach(renderer => renderer.setMap(null));
    routeRenderersRef.current = [];

    if (routes.length > 0) {
      routes.forEach((route, index) => {
        const isSafeRoute = index === saferRouteIndex;
        const renderer = new google.maps.DirectionsRenderer({
          map: map,
          directions: {
            routes: [route],
            request: {} as google.maps.DirectionsRequest, // A bit of a hack as we don't have the original request
            geocoded_waypoints: [],
          },
          routeIndex: 0,
          suppressMarkers: true,
          polylineOptions: {
            strokeColor: isSafeRoute ? '#3282B8' : '#8764B8',
            strokeOpacity: isSafeRoute ? 1.0 : 0.7,
            strokeWeight: isSafeRoute ? 8 : 6,
            zIndex: isSafeRoute ? 10 : 5,
          },
        });
        routeRenderersRef.current.push(renderer);
      });
    }
  }, [map, routes, saferRouteIndex]);


  useEffect(() => {
    if (map && userPosition) {
      map.panTo(userPosition);
    }
  }, [userPosition, map]);


  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <Map
        defaultCenter={LOS_ANGELES}
        defaultZoom={12}
        mapId="GUARDIAN_ANGEL_MAP"
        disableDefaultUI={true}
        gestureHandling={'greedy'}
        styles={[
            {
              "featureType": "poi",
              "stylers": [{ "visibility": "off" }]
            },
            {
              "featureType": "transit",
              "stylers": [{ "visibility": "off" }]
            },
            {
                "featureType": "road",
                "elementType": "labels.icon",
                "stylers": [{ "visibility": "off" }]
            }
        ]}
      >
        {userPosition && (
          <AdvancedMarker position={userPosition}>
             <div className="bg-primary rounded-full p-2 shadow-lg">
                <PersonStanding className="h-6 w-6 text-primary-foreground" />
             </div>
          </AdvancedMarker>
        )}
      </Map>
    </div>
  );
}
