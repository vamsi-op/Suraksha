'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import ReactDOMServer from 'react-dom/server';
import { PersonStanding } from 'lucide-react';
import type { DangerZone, LatLngExpression } from '@/lib/definitions';

interface GuardianAngelMapProps {
  userPosition: LatLngExpression | null;
  dangerZones: DangerZone[];
}

const LOS_ANGELES: LatLngExpression = [34.0549, -118.2426];

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

export default function GuardianAngelMap({ userPosition, dangerZones }: GuardianAngelMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const dangerZoneLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    mapRef.current = L.map(mapContainerRef.current).setView(LOS_ANGELES, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(mapRef.current);

    dangerZoneLayerRef.current = L.layerGroup().addTo(mapRef.current);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    if (userPosition) {
      if (!userMarkerRef.current) {
        userMarkerRef.current = L.marker(userPosition, { icon: UserMarkerIcon }).addTo(mapRef.current);
      } else {
        userMarkerRef.current.setLatLng(userPosition);
      }
      mapRef.current.flyTo(userPosition, 15);
    }
  }, [userPosition]);
  
  useEffect(() => {
    const layerGroup = dangerZoneLayerRef.current;
    if (!mapRef.current || !layerGroup) return;

    layerGroup.clearLayers();

    dangerZones.forEach((zone) => {
      L.circle(zone.location, {
        radius: zone.radius,
        color: 'red',
        fillColor: 'red',
        fillOpacity: 0.1 + (zone.weight / 100) * 0.4,
        weight: 1,
      }).addTo(layerGroup);
    });
  }, [dangerZones]);

  return <div ref={mapContainerRef} className="h-screen w-full z-10" />;
}
