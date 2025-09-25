'use client';

import React, { useEffect, useRef, memo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

import ReactDOMServer from 'react-dom/server';
import { PersonStanding, MessageSquareWarning, LocateFixed } from 'lucide-react';
import type { DangerZone, LatLngExpression, ActivityReport } from '@/lib/definitions';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { Button } from './ui/button';

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
  activityReports: ActivityReport[];
  onRouteFound: (coordinates: LatLngExpression[]) => void;
  onRecenter: () => void;
  recenterCounter: number;
}

const VISAKHAPATNAM: LatLngExpression = [17.6868, 83.2185];

const GuardianAngelMap = memo(function GuardianAngelMap({
  userPosition,
  destination,
  dangerZones,
  activityReports,
  onRouteFound,
  onRecenter,
  recenterCounter,
}: GuardianAngelMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const dangerZoneLayerRef = useRef<L.LayerGroup | null>(null);
  const activityReportsLayerRef = useRef<L.LayerGroup | null>(null);
  const routingControlRef = useRef<L.Routing.Control | null>(null);
  const { toast } = useToast();
  
  const hasCenteredMap = useRef(false);

  const getIcon = (IconComponent: React.ElementType, colorClass: string, bgClass: string) => {
    if (typeof window === 'undefined') return null;
    return L.divIcon({
      html: ReactDOMServer.renderToString(
        <div className={`rounded-full p-2 shadow-lg ${bgClass}`}>
          <IconComponent className={`h-6 w-6 ${colorClass}`} />
        </div>
      ),
      className: '',
      iconSize: [40, 40],
      iconAnchor: [20, 40],
    });
  };

  // Init map
  useEffect(() => {
    if (typeof window === 'undefined' || mapRef.current || !mapContainerRef.current) return;

    const initialCenter = userPosition || VISAKHAPATNAM;
    mapRef.current = L.map(mapContainerRef.current).setView(initialCenter, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(mapRef.current);

    dangerZoneLayerRef.current = L.layerGroup().addTo(mapRef.current);
    activityReportsLayerRef.current = L.layerGroup().addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [userPosition]);

  // User marker and initial centering
  useEffect(() => {
    if (!mapRef.current || !userPosition) return;
    const userIcon = getIcon(PersonStanding, 'text-primary-foreground', 'bg-primary');
    if (!userIcon) return;

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker(userPosition, { icon: userIcon }).addTo(mapRef.current);
    } else {
      userMarkerRef.current.setLatLng(userPosition);
    }

    if (!hasCenteredMap.current) {
        mapRef.current.flyTo(userPosition, 15);
        hasCenteredMap.current = true;
    }
  }, [userPosition]);
  
  // Recenter logic
  useEffect(() => {
    if (recenterCounter > 0 && mapRef.current && userPosition) {
        mapRef.current.flyTo(userPosition, 15);
    }
  }, [recenterCounter, userPosition]);


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

  // Activity reports
  useEffect(() => {
    const layerGroup = activityReportsLayerRef.current;
    if (!mapRef.current || !layerGroup) return;

    layerGroup.clearLayers();
    const reportIcon = getIcon(MessageSquareWarning, 'text-amber-900', 'bg-amber-400');
    if (!reportIcon) return;

    activityReports.forEach((report) => {
      const marker = L.marker(report.location, { icon: reportIcon }).addTo(layerGroup);
      const reportTime = report.timestamp ? formatDistanceToNow(report.timestamp.toDate(), { addSuffix: true }) : 'just now';
      marker.bindPopup(`
        <div style="font-family: sans-serif; max-width: 200px;">
          <p style="margin: 0; font-weight: bold; font-size: 1.1em; color: #333;">Suspicious Activity</p>
          <p style="margin: 4px 0; font-size: 0.9em; color: #555;">${report.comment}</p>
          <p style="margin: 0; font-size: 0.8em; color: #777; text-align: right;">- reported ${reportTime}</p>
        </div>
      `);
    });
  }, [activityReports]);

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
        routeWhileDragging: false,
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
    <>
      <div
        ref={mapContainerRef}
        className="h-screen w-full z-10"
        style={{ minHeight: '400px' }}
      />
      <Button
        size="icon"
        onClick={onRecenter}
        className="absolute bottom-8 left-4 z-[1002] shadow-lg rounded-full"
        aria-label="Center map on my location"
      >
        <LocateFixed className="h-5 w-5" />
      </Button>
    </>
  );
});

export default GuardianAngelMap;
