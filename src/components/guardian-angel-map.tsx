'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import ReactDOMServer from 'react-dom/server';
import { PersonStanding } from 'lucide-react';
import type { DangerZone, LatLngExpression } from '@/lib/definitions';
import { useToast } from '@/hooks/use-toast';
import { MAPBOX_ACCESS_TOKEN } from '@/lib/env';

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

  // Custom routing with direct API calls
  useEffect(() => {
    if (!mapRef.current || !userPosition || !destination) {
      // Clear route if destination is removed
      if (routeLineRef.current) {
        try {
          mapRef.current?.removeLayer(routeLineRef.current);
          routeLineRef.current = null;
        } catch (error) {
          console.error('Error removing route line:', error);
        }
      }
      unsafeSegmentsLayerRef.current?.clearLayers();
      return;
    }
    
    // Coordinates extraction
    const startLat = userPosition[0];
    const startLng = userPosition[1];
    const endLat = destination[0];
    const endLng = destination[1];

    if (isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) {
      toast({
        variant: 'destructive',
        title: 'Invalid Coordinates',
        description: 'Please ensure both start and destination points are valid.',
      });
      return;
    }
    
    // Function to draw a direct line as a fallback
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
        
        // Cleanup previous route before drawing a new one
        if (routeLineRef.current) {
            mapRef.current?.removeLayer(routeLineRef.current);
        }

        const directLine = L.polyline(directRoute, lineOptions).addTo(mapRef.current!);
        routeLineRef.current = directLine;

        onRouteCalculated(directRoute);

        const bounds = L.latLngBounds(directRoute);
        mapRef.current?.fitBounds(bounds, { padding: [50, 50] });

        return directRoute;
    };

    // Routing API call
    const getRouteFromAPI = async () => {
        if (!MAPBOX_ACCESS_TOKEN) {
            console.warn('Mapbox access token is not configured. Falling back to direct line.');
            return false;
        }

        const service = {
            name: 'Mapbox',
            url: `https://api.mapbox.com/directions/v5/mapbox/walking/${startLng},${startLat};${endLng},${endLat}?geometries=geojson&access_token=${MAPBOX_ACCESS_TOKEN}`,
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
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                // Use console.warn to avoid Next.js error overlay for non-critical errors
                const errorText = await response.text();
                console.warn(`${service.name} HTTP Error:`, response.status, errorText);
                return false;
            }

            const data = await response.json();
            const routeCoordinates = service.parseResponse(data);

            if (routeCoordinates && routeCoordinates.length > 0) {
                 // Cleanup previous route
                if (routeLineRef.current) {
                    mapRef.current?.removeLayer(routeLineRef.current);
                }

                const routeLine = L.polyline(routeCoordinates, {
                    color: 'hsl(var(--accent))',
                    opacity: 0.8,
                    weight: 6
                }).addTo(mapRef.current!);
                routeLineRef.current = routeLine;

                onRouteCalculated(routeCoordinates);

                const bounds = L.latLngBounds(routeCoordinates);
                mapRef.current?.fitBounds(bounds, { padding: [50, 50] });

                toast({
                    variant: 'default',
                    title: 'Route Found',
                    description: `Safe walking route calculated via ${service.name}.`,
                });
                return true;
            } else {
                console.warn(`${service.name} returned no valid route coordinates`);
                return false;
            }
        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.warn(`${service.name} request timed out.`);
            } else {
                console.warn(`${service.name} routing failed:`, error);
            }
            return false;
        }
    };

    getRouteFromAPI().then((success) => {
        if (!success) {
            createDirectLine(true);
            toast({
                variant: 'default',
                title: 'Routing Service Unavailable',
                description: 'Showing a direct path to your destination.',
            });
        }
    });

  }, [userPosition, destination, onRouteCalculated, toast]);


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
              dashArray: '10, 10'
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
      style={{ minHeight: '400px' }}
    />
  );
}
