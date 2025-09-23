'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import ReactDOMServer from 'react-dom/server';
import { PersonStanding } from 'lucide-react';
import type { DangerZone, LatLngExpression } from '@/lib/definitions';

// Leaflet's CSS requires this workaround in Next.js
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface GuardianAngelMapProps {
  userPosition: LatLngExpression | null;
  dangerZones: DangerZone[];
  destination: LatLngExpression | null;
}

const VISAKHAPATNAM: LatLngExpression = [17.6868, 83.2185];

const UserMarkerIcon = L.divIcon({
  html: ReactDOMServer.renderToString(
    <div className="bg-primary rounded-full p-2 shadow-lg">
      <PersonStanding className="h-6 w-6 text-primary-foreground" />
    </div>
  ),
  className: '', // important to clear default styling
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const createRoutingControl = (waypoints: L.LatLng[], color: string) => {
    return L.Routing.control({
        waypoints,
        routeWhileDragging: true,
        show: false, // Hide the default instructions panel
        addWaypoints: false, // Prevent adding waypoints by clicking
        lineOptions: {
            styles: [{ color, weight: 6, opacity: 0.8 }],
            extendToWaypoints: true,
            missingRouteTolerance: 100,
        },
        createMarker: () => null, // Hide start/end markers
    });
};

export default function GuardianAngelMap({ userPosition, dangerZones, destination }: GuardianAngelMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const dangerZoneLayerRef = useRef<L.LayerGroup | null>(null);
  const routingControlRef = useRef<L.Routing.Control | null>(null);
  const safeRoutingControlRef = useRef<L.Routing.Control | null>(null);

  // Initialize map
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    mapRef.current = L.map(mapContainerRef.current).setView(VISAKHAPATNAM, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(mapRef.current);

    dangerZoneLayerRef.current = L.layerGroup().addTo(mapRef.current);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Update user marker and view
  useEffect(() => {
    if (!mapRef.current) return;

    if (userPosition) {
      if (!userMarkerRef.current) {
        userMarkerRef.current = L.marker(userPosition, { icon: UserMarkerIcon }).addTo(mapRef.current);
      } else {
        userMarkerRef.current.setLatLng(userPosition);
      }
      // Only fly to position if there is no destination set
      if(!destination) {
        mapRef.current.flyTo(userPosition, 15);
      }
    }
  }, [userPosition, destination]);
  
  // Update danger zones
  useEffect(() => {
    const layerGroup = dangerZoneLayerRef.current;
    if (!mapRef.current || !layerGroup) return;

    layerGroup.clearLayers();

    dangerZones.forEach((zone) => {
      const color = zone.level === 'high' ? 'red' : 'orange';
      
      L.circle(zone.location, {
        radius: zone.radius,
        color: color,
        fillColor: color,
        fillOpacity: 0.1 + (zone.weight / 100) * 0.3,
        weight: 1,
      }).addTo(layerGroup);
    });
  }, [dangerZones]);

  // Handle routing
  useEffect(() => {
    if (!mapRef.current || !userPosition || !destination) {
        // Clear existing routes if no destination
        if (routingControlRef.current) {
            mapRef.current?.removeControl(routingControlRef.current);
            routingControlRef.current = null;
        }
        if (safeRoutingControlRef.current) {
            mapRef.current?.removeControl(safeRoutingControlRef.current);
            safeRoutingControlRef.current = null;
        }
        return;
    }
    
    if (routingControlRef.current) {
        mapRef.current.removeControl(routingControlRef.current);
    }
    if (safeRoutingControlRef.current) {
        mapRef.current.removeControl(safeRoutingControlRef.current);
    }

    const waypoints = [L.latLng(userPosition), L.latLng(destination)];
    const mainRoute = createRoutingControl(waypoints, '#8764B8'); // Accent color
    mainRoute.addTo(mapRef.current);
    routingControlRef.current = mainRoute;

    mainRoute.on('routesfound', function(e) {
      const routes = e.routes;
      const summary = routes[0].summary;
      mapRef.current?.fitBounds(L.latLngBounds(userPosition, destination), { padding: [50, 50] });

      const routeCoordinates = routes[0].coordinates;
      let intersectsDangerZone = false;
      
      for(const coord of routeCoordinates) {
        for(const zone of dangerZones) {
          const distance = L.latLng(zone.location).distanceTo(coord);
          if(distance < zone.radius) {
            intersectsDangerZone = true;
            break;
          }
        }
        if(intersectsDangerZone) break;
      }
      
      if(intersectsDangerZone) {
        console.log("Route intersects with a danger zone. Calculating a safer route is not yet implemented.");
        // This is where you would calculate an alternative "safe" route.
        // For this MVP, we will just highlight the dangerous route.
        // In a full implementation, you'd use a different routing query avoiding the zones.
        if (routingControlRef.current) {
          routingControlRef.current.getPlan().setWaypoints(waypoints);
          (routingControlRef.current.getRouter() as any)._line.setStyle({ color: 'red' });
        }
        
        // As a placeholder for a "safe" route, let's draw another line.
        // This is a complex problem, so we'll simulate.
        // For now, we just indicate the main route is unsafe.
      }
    });

  }, [userPosition, destination, dangerZones]);

  return <div ref={mapContainerRef} className="h-screen w-full z-10" />;
}
