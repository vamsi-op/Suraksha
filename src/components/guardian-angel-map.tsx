'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// Removed leaflet-routing-machine imports to avoid stack errors
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
  const routeLineRef = useRef<L.Polyline | null>(null);
  const unsafeSegmentsLayerRef = useRef<L.LayerGroup | null>(null);
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
      unsafeSegmentsLayerRef.current = L.layerGroup().addTo(mapRef.current);
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

      if (!destination) {
        mapRef.current.flyTo(userPosition, 15);
      }
    } catch (error) {
      console.error('Error updating user marker:', error);
    }
  }, [userPosition, destination]);

  // Update destination marker
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing destination marker
    if (destinationMarkerRef.current) {
      mapRef.current.removeLayer(destinationMarkerRef.current);
      destinationMarkerRef.current = null;
    }

    if (destination) {
      try {
        destinationMarkerRef.current = L.marker(destination).addTo(mapRef.current);
      } catch (error) {
        console.error('Error adding destination marker:', error);
      }
    }
  }, [destination]);
  
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

  // Custom routing with direct API calls to avoid leaflet-routing-machine issues
  useEffect(() => {
    if (!mapRef.current || !userPosition) return;
    
    // Remove existing route line if it exists
    if (routeLineRef.current) {
      try {
        mapRef.current.removeLayer(routeLineRef.current);
        routeLineRef.current = null;
      } catch (error) {
        console.error('Error removing route line:', error);
      }
    }
    
    // Clear unsafe segments layer and any existing route lines
    unsafeSegmentsLayerRef.current?.clearLayers();

    if (destination) {
      // Extract coordinates with better type checking
      let startLat: number, startLng: number, endLat: number, endLng: number;
      
      if (Array.isArray(userPosition)) {
        startLat = userPosition[0];
        startLng = userPosition[1];
      } else if (userPosition && typeof userPosition === 'object') {
        startLat = (userPosition as any).lat;
        startLng = (userPosition as any).lng;
      } else {
        console.error('Invalid userPosition format:', userPosition);
        return;
      }

      if (Array.isArray(destination)) {
        endLat = destination[0];
        endLng = destination[1];
      } else if (destination && typeof destination === 'object') {
        endLat = (destination as any).lat;
        endLng = (destination as any).lng;
      } else {
        console.error('Invalid destination format:', destination);
        return;
      }

      if (isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) {
        toast({
          variant: 'destructive',
          title: 'Invalid Coordinates',
          description: 'Please ensure both start and destination points are valid.',
        });
        return;
      }

      // Function to create direct line fallback
      const createDirectLine = (isDashed = false) => {
        const directRoute = [
          [startLat, startLng] as LatLngExpression,
          [endLat, endLng] as LatLngExpression
        ];

        const lineOptions = {
          color: 'hsl(var(--accent))',
          opacity: 0.8,
          weight: 6,
          ...(isDashed && { dashArray: '10, 10' })
        };

        const directLine = L.polyline(directRoute, lineOptions).addTo(mapRef.current!);
        
        // Store reference for cleanup
        routeLineRef.current = directLine;

        onRouteCalculated(directRoute);

        // Fit map to show the route
        const bounds = L.latLngBounds(directRoute);
        mapRef.current?.fitBounds(bounds, { padding: [50, 50] });

        return directRoute;
      };

      // Try to get route using direct API call (with better error handling)
      const getRouteFromAPI = async () => {
        const service = {
          name: 'OSRM Demo',
          url: `https://router.project-osrm.org/route/v1/foot/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`,
          parseResponse: (data: any) => {
            if (data.routes?.[0]?.geometry?.coordinates) {
              return data.routes[0].geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]] as LatLngExpression);
            }
            return null;
          }
        };

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          
          const response = await fetch(service.url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Suraksha Safety App'
            },
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            // Don't use console.error to avoid Next.js overlay
            console.warn(`${service.name} HTTP Error:`, response.status, await response.text());
            return false;
          }

          const data = await response.json();
          const routeCoordinates = service.parseResponse(data);

          if (routeCoordinates && routeCoordinates.length > 0) {
            // Draw the route
            const routeLine = L.polyline(routeCoordinates, {
              color: 'hsl(var(--accent))',
              opacity: 0.8,
              weight: 6
            }).addTo(mapRef.current!);

            routeLineRef.current = routeLine;

            onRouteCalculated(routeCoordinates);

            // Fit map to show the route
            const bounds = L.latLngBounds(routeCoordinates);
            mapRef.current?.fitBounds(bounds, { padding: [50, 50] });

            toast({
              variant: 'default',
              title: 'Route Found',
              description: `Safe walking route calculated via ${service.name}.`,
            });

            return true; // Success
          } else {
            console.warn(`${service.name} returned no valid route coordinates`);
            return false;
          }
        } catch (error) {
          console.warn(`${service.name} routing failed:`, error);
          if (error.name === 'AbortError') {
            console.log(`${service.name} request timed out`);
          }
          return false;
        }
      };

      // Try to get route, fallback to direct line
      getRouteFromAPI().then((success) => {
        if (!success) {
          createDirectLine(true); // Dashed line to indicate fallback
          
          toast({
            variant: 'default',
            title: 'Direct Path',
            description: 'Showing direct route. Routing services unavailable - this is normal and the app will still help you navigate safely.',
          });
        }
      });
    }
  }, [userPosition, destination]);

  // Draw unsafe route segments
  useEffect(() => {
    const layerGroup = unsafeSegmentsLayerRef.current;
    if (!mapRef.current || !layerGroup) return;

    layerGroup.clearLayers();

    if (unsafeRouteSegments.length > 0) {
      try {
        unsafeRouteSegments.forEach(segment => {
          if (segment && segment.length > 1) {
            L.polyline(segment, { 
              color: 'red', 
              weight: 8, 
              opacity: 0.8,
              dashArray: '10, 10' // Make unsafe segments dashed for better visibility
            }).addTo(layerGroup);
          }
        });
      } catch (error) {
        console.error('Error drawing unsafe segments:', error);
      }
    }
  }, [unsafeRouteSegments]);

  return (
    <div 
      ref={mapContainerRef} 
      className="h-screen w-full z-10" 
      style={{ minHeight: '400px' }} // Ensure minimum height
    />
  );
}
