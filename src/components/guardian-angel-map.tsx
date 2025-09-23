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

// Leaflet's CSS requires this workaround in Next.js
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
  unsafeRouteSegments: LatLngExpression[][];
  onRouteCalculated: (routeLine: LatLngExpression[]) => void;
}

const VISAKHAPATNAM: LatLngExpression = [17.6868, 83.2185];

export default function GuardianAngelMap({ 
  userPosition, 
  destination, 
  dangerZones, 
  unsafeRouteSegments, 
  onRouteCalculated 
}: GuardianAngelMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const destinationMarkerRef = useRef<L.Marker | null>(null);
  const dangerZoneLayerRef = useRef<L.LayerGroup | null>(null);
  const routingControlRef = useRef<L.Routing.Control | null>(null);
  const unsafeSegmentsLayerRef = useRef<L.LayerGroup | null>(null);
  const { toast } = useToast();

  const getUserMarkerIcon = () => {
    if (typeof window === 'undefined') return new L.Icon.Default();
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

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    mapRef.current = L.map(mapContainerRef.current).setView(VISAKHAPATNAM, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(mapRef.current);

    dangerZoneLayerRef.current = L.layerGroup().addTo(mapRef.current);
    unsafeSegmentsLayerRef.current = L.layerGroup().addTo(mapRef.current);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !userPosition) return;

    const userIcon = getUserMarkerIcon();
    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker(userPosition, { icon: userIcon }).addTo(mapRef.current);
    } else {
      userMarkerRef.current.setLatLng(userPosition);
    }

    if (!destination) {
      mapRef.current.flyTo(userPosition, 15);
    }
  }, [userPosition, destination]);

  useEffect(() => {
    if (!mapRef.current) return;

    if (destinationMarkerRef.current) {
      mapRef.current.removeLayer(destinationMarkerRef.current);
      destinationMarkerRef.current = null;
    }

    if (destination) {
      destinationMarkerRef.current = L.marker(destination).addTo(mapRef.current);
    }
  }, [destination]);
  
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

  useEffect(() => {
    if (!mapRef.current || !userPosition) return;

    // Remove the previous routing control if it exists to avoid duplicates.
    if (routingControlRef.current) {
      mapRef.current.removeControl(routingControlRef.current);
      routingControlRef.current = null;
    }
    
    unsafeSegmentsLayerRef.current?.clearLayers();

    if (destination) {
      const routingControl = L.Routing.control({
        waypoints: [
          L.latLng(userPosition[0], userPosition[1]),
          L.latLng(destination[0], destination[1])
        ],
        routeWhileDragging: false,
        show: false,
        addWaypoints: false,
        lineOptions: {
          styles: [{ color: 'hsl(var(--accent))', opacity: 0.8, weight: 6 }]
        },
        createMarker: () => null,
      });

      routingControl.on('routesfound', (e: any) => {
        const routes = e.routes;
        if (routes && routes.length > 0) {
          const routeLine = routes[0].coordinates.map((c: any) => [c.lat, c.lng] as LatLngExpression);
          onRouteCalculated(routeLine);
          
          const bounds = L.latLngBounds(userPosition, destination);
          mapRef.current?.fitBounds(bounds, { padding: [50, 50] });
        }
      });
      
      // The definitive fix for the routing error.
      // We listen for the 'routingerror' event and handle it gracefully
      // by showing a toast, preventing the default console error.
      routingControl.on('routingerror', () => {
        toast({
          variant: 'destructive',
          title: 'Routing Error',
          description: 'Could not find a route. The service may be unavailable or the destination is unreachable.',
        });
      });

      routingControl.addTo(mapRef.current);
      routingControlRef.current = routingControl;
    }
  }, [userPosition, destination, onRouteCalculated, toast]);

  useEffect(() => {
    const layerGroup = unsafeSegmentsLayerRef.current;
    if (!mapRef.current || !layerGroup) return;

    layerGroup.clearLayers();

    if (unsafeRouteSegments.length > 0) {
      unsafeRouteSegments.forEach(segment => {
        if (segment && segment.length > 1) {
          L.polyline(segment, { 
            color: 'hsl(var(--destructive))', 
            weight: 8, 
            opacity: 0.8,
            dashArray: '10, 10'
          }).addTo(layerGroup);
        }
      });
    }
  }, [unsafeRouteSegments]);

  return (
    <div 
      ref={mapContainerRef} 
      className="h-screen w-full z-10" 
    />
  );
}
