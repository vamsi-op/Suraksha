'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

import ReactDOMServer from 'react-dom/server';
import { PersonStanding } from 'lucide-react';
import type { DangerZone, LatLngExpression } from '@/lib/definitions';
import { useToast } from '@/hooks/use-toast';

// Fix Leaflet icons in Next.js
if (typeof window !== 'undefined' && L.Icon.Default.prototype) {
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;

  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

interface GuardianAngelMapProps {
  userPosition: LatLngExpression | null;
  destination: LatLngExpression | null;
  dangerZones: DangerZone[];
  onRouteFound: (coordinates: LatLngExpression[]) => void;
}

const VISAKHAPATNAM: LatLngExpression = [17.6868, 83.2185];

export default function GuardianAngelMap({
  userPosition,
  destination,
  dangerZones,
  onRouteFound,
}: GuardianAngelMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const dangerZoneLayerRef = useRef<L.LayerGroup | null>(null);
  const routingControlRef = useRef<L.Routing.Control | null>(null);
  const { toast } = useToast();

  // User marker icon
  const getUserMarkerIcon = () => {
    if (typeof window === 'undefined') return null;

    return L.divIcon({
      html: ReactDOMServer.renderToString(
        <div className="bg-primary rounded-full p-2 shadow-lg">
          <PersonStanding className="h-6 w-6 text-primary-foreground" />
        </div>
      ),
      className: '',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  };

  // Init map
  useEffect(() => {
    if (typeof window === 'undefined' || mapRef.current || !mapContainerRef.current) return;

    mapRef.current = L.map(mapContainerRef.current).setView(VISAKHAPATNAM, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(mapRef.current);

    dangerZoneLayerRef.current = L.layerGroup().addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // User marker
  useEffect(() => {
    if (!mapRef.current || !userPosition) return;

    const userIcon = getUserMarkerIcon();
    if (!userIcon) return;

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker(userPosition, { icon: userIcon }).addTo(mapRef.current);
    } else {
      userMarkerRef.current.setLatLng(userPosition);
    }

    if (!destination) {
      mapRef.current.flyTo(userPosition, 15);
    }
  }, [userPosition, destination]);

  // Danger zones
  useEffect(() => {
    const layerGroup = dangerZoneLayerRef.current;
    if (!mapRef.current || !layerGroup) return;

    layerGroup.clearLayers();

    dangerZones.forEach((zone) => {
      const color = zone.level === 'high' ? 'red' : 'orange';

      L.circle(zone.location, {
        radius: zone.radius,
        color,
        fillColor: color,
        fillOpacity: 0.1 + (zone.weight / 100) * 0.3,
        weight: 1,
      }).addTo(layerGroup);
    });
  }, [dangerZones]);

  // Routing
  useEffect(() => {
    if (!mapRef.current || !userPosition) return;

    if (routingControlRef.current) {
      mapRef.current.removeControl(routingControlRef.current);
      routingControlRef.current = null;
    }

    if (destination) {
      const [userLat, userLng] = userPosition as [number, number];
      const [destLat, destLng] = destination as [number, number];

      const routingControl = L.Routing.control({
        waypoints: [
          L.latLng(userLat, userLng),
          L.latLng(destLat, destLng),
        ],
        routeWhileDragging: true,
        show: false,
        addWaypoints: false,
        lineOptions: {
          styles: [{ color: 'hsl(var(--accent))', opacity: 0.8, weight: 6 }],
        },
        createMarker: () => null,
      })
      .on('routesfound', function(e) {
          const routes = e.routes;
          if (routes && routes.length > 0) {
              const coordinates = routes[0].coordinates.map(c => [c.lat, c.lng] as LatLngExpression);
              onRouteFound(coordinates);
          }
      })
      .on('routingerror', (e) => {
        console.warn('Routing error caught:', e);
        toast({
            variant: 'destructive',
            title: 'Routing Error',
            description: 'Could not find a route. The destination may be unreachable.',
        });
      })
      .addTo(mapRef.current);
      
      routingControlRef.current = routingControl;
    }
  }, [userPosition, destination, toast, onRouteFound]);

  return (
    <div
      ref={mapContainerRef}
      className="h-screen w-full z-10"
      style={{ minHeight: '400px' }}
    />
  );
}
