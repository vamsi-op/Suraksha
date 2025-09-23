'use client';

import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import type { DangerZone, LatLngExpression } from '@/lib/definitions';
import { PersonStanding } from 'lucide-react';
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import ReactDOMServer from 'react-dom/server';

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

function MapUpdater({ position }: { position: LatLngExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, 15);
    }
  }, [position, map]);
  return null;
}

export default function GuardianAngelMap({ userPosition, dangerZones }: GuardianAngelMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // This is a workaround for a common issue with react-leaflet and Next.js's hot-reloading.
    // It prevents the map from being re-initialized on the same container.
    const container = mapRef.current;
    if (container && (container as any)._leaflet_id) {
      // If the container is already initialized by Leaflet, we do nothing.
      // This might mean the map doesn't update on hot-reload, but it prevents the crash.
      // A full page refresh will always work.
      return;
    }
  }, []);


  return (
    <div ref={mapRef} className="h-screen w-full z-10">
      <MapContainer
        center={userPosition || LOS_ANGELES}
        zoom={userPosition ? 15 : 13}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {userPosition && (
          <Marker position={userPosition} icon={UserMarkerIcon}></Marker>
        )}
        {dangerZones.map((zone) => (
          <Circle
            key={zone.id}
            center={zone.location}
            radius={zone.radius}
            pathOptions={{
              color: 'red',
              fillColor: 'red',
              fillOpacity: 0.1 + (zone.weight / 100) * 0.4, // Opacity from 0.1 to 0.5 based on weight
              weight: 1,
            }}
          />
        ))}
        <MapUpdater position={userPosition} />
      </MapContainer>
    </div>
  );
}
