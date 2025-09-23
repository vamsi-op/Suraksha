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
}

const VISAKHAPATNAM: LatLngExpression = [17.6868, 83.2185];

export default function GuardianAngelMap({ 
  userPosition, 
  destination, 
  dangerZones, 
}: GuardianAngelMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const dangerZoneLayerRef = useRef<L.LayerGroup | null>(null);
  const routingControlRef = useRef<L.Routing.Control | null>(null);
  const { toast } = useToast();

  // Create user marker icon only on client side
  const getUserMarkerIcon = () => {
    if (typeof window === 'undefined') return null;
    
    return L.divIcon({
      html: ReactDOMServer.renderToString(
        <div className="bg-primary rounded-full p-2 shadow-lg">
          <PersonStanding className="h-6 w-6 text-primary-foreground" />
        </div>
      ),
      className: '', // important to clear default styling
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  };

  // Initialize map
  useEffect(() => {
    if (typeof window === 'undefined' || mapRef.current || !mapContainerRef.current) return;

    try {
      mapRef.current = L.map(mapContainerRef.current).setView(VISAKHAPATNAM, 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);

      dangerZoneLayerRef.current = L.layerGroup().addTo(mapRef.current);
    } catch (error) {
      console.error('Error initializing map:', error);
      toast({
        variant: 'destructive',
        title: 'Map Error',
        description: 'Failed to initialize the map. Please refresh the page.',
      });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [toast]);

  // Update user marker and view
  useEffect(() => {
    if (!mapRef.current || !userPosition) return;

    try {
      const userIcon = getUserMarkerIcon();
      if (!userIcon) return;

      if (!userMarkerRef.current) {
        userMarkerRef.current = L.marker(userPosition, { icon: userIcon }).addTo(mapRef.current);
      } else {
        userMarkerRef.current.setLatLng(userPosition);
      }

      // Only fly to user position if there is no destination set
      if (!destination) {
        mapRef.current.flyTo(userPosition, 15);
      }
    } catch (error) {
      console.error('Error updating user marker:', error);
    }
  }, [userPosition]); // Rerun only when user position changes

  
  // Update danger zones
  useEffect(() => {
    const layerGroup = dangerZoneLayerRef.current;
    if (!mapRef.current || !layerGroup) return;

    layerGroup.clearLayers();

    try {
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
    } catch (error) {
      console.error('Error updating danger zones:', error);
    }
  }, [dangerZones]);

  // Handle routing
  useEffect(() => {
    if (!mapRef.current || !userPosition) return;

    // Remove existing routing control if it exists
    if (routingControlRef.current) {
        mapRef.current.removeControl(routingControlRef.current);
        routingControlRef.current = null;
    }

    if (destination) {
        try {
          const routingControl = L.Routing.control({
              waypoints: [
                  L.latLng(userPosition[0], userPosition[1]),
                  L.latLng(destination[0], destination[1])
              ],
              routeWhileDragging: true,
              show: false, // Hides the itinerary panel
              addWaypoints: false,
              lineOptions: {
                  styles: [{ color: 'hsl(var(--accent))', opacity: 0.8, weight: 6 }]
              },
              createMarker: () => null // We use our own markers
          }).addTo(mapRef.current);

          // Handle routing errors
          routingControl.on('routingerror', (e) => {
            // Use console.warn to avoid Next.js error overlay for non-critical network issues
            if (e && e.error) {
              console.warn('Routing Error:', e.error);
            } else {
              console.warn('An unknown routing error occurred.');
            }
            toast({
              variant: 'destructive',
              title: 'Routing Error',
              description: 'Could not find a route. The destination may be unreachable.',
            });
          });

          routingControlRef.current = routingControl;

        } catch (error) {
          console.error("Error creating routing control:", error);
          toast({ variant: 'destructive', title: "Routing Error", description: "Failed to create route planner." });
        }
    }
  }, [userPosition, destination, toast]);


  return (
    <div 
      ref={mapContainerRef} 
      className="h-screen w-full z-10" 
      style={{ minHeight: '400px' }} // Ensure minimum height
    />
  );
}
